<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(array('ok' => false, 'message' => 'Método no permitido.'), 405);

$body     = get_json_body();
$email    = strtolower(clean_string(isset($body['email']) ? $body['email'] : '', 191));
$password = isset($body['password']) ? $body['password'] : '';

if (!$email || !$password) json_response(array('ok' => false, 'message' => 'Correo y contraseña requeridos.'), 400);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_response(array('ok' => false, 'message' => 'Credenciales incorrectas.'), 401);
rate_limit('login-ip:' . client_ip(), 30, 900);
rate_limit('login-email:' . $email, 10, 900);

$pdo  = get_pdo();
$stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
$stmt->execute(array($email));
$u = $stmt->fetch();

if (!$u || !password_verify($password, $u['password_hash'])) {
    json_response(array('ok' => false, 'message' => 'Credenciales incorrectas.'), 401);
}

$status = isset($u['status']) ? $u['status'] : 'approved';

switch ($status) {
    case 'unconfirmed':
        json_response(array(
            'ok'      => false,
            'status'  => 'unconfirmed',
            'message' => 'Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.',
        ), 403);
        break;
    case 'pending':
        json_response(array(
            'ok'      => false,
            'status'  => 'pending',
            'message' => 'Tu cuenta está pendiente de aprobación por el equipo de agendate. Te notificaremos cuando esté activa.',
        ), 403);
        break;
    case 'rejected':
        json_response(array(
            'ok'      => false,
            'status'  => 'rejected',
            'message' => 'Tu solicitud de cuenta fue rechazada. Si crees que es un error, contáctanos.',
        ), 403);
        break;
}

// status === 'approved'
set_session_user($u);
json_response(array('ok' => true, 'user' => serialize_user($u)));
