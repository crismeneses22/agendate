<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';
boot_api();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(array('ok' => false, 'message' => 'Método no permitido.'), 405);
rate_limit('register-ip:' . client_ip(), 8, 3600);

$body    = get_json_body();
$email   = strtolower(clean_string(isset($body['email']) ? $body['email'] : '', 191));
$pass    = isset($body['password']) ? $body['password'] : '';
$name    = clean_string(isset($body['name']) ? $body['name'] : '', 255);
$role    = isset($body['role'])  ? $body['role']  : 'cliente';
$phoneRaw = clean_string(isset($body['phone']) ? $body['phone'] : '', 40);
$phone   = $phoneRaw !== '' ? $phoneRaw : null;

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_response(array('ok' => false, 'message' => 'Correo inválido.'), 400);
if (strlen($pass) < 8)  json_response(array('ok' => false, 'message' => 'La contraseña debe tener al menos 8 caracteres.'), 400);
if (strlen($pass) > 512) json_response(array('ok' => false, 'message' => 'La contraseña es demasiado larga.'), 400);
if (!$name)             json_response(array('ok' => false, 'message' => 'El nombre es requerido.'), 400);
if (!in_array($role, array('proveedor', 'cliente'))) json_response(array('ok' => false, 'message' => 'Rol inválido.'), 400);

$pdo = get_pdo();
$check = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$check->execute(array($email));
if ($check->fetch()) json_response(array('ok' => false, 'message' => 'Este correo ya está registrado.'), 409);

$skipEmailVerification = !is_production() && env_bool('AGENDATE_DEV_SKIP_EMAIL_VERIFICATION', true);
$hash    = password_hash($pass, PASSWORD_DEFAULT);
$token   = $skipEmailVerification ? null : random_hex(32); // 64-char hex token
$expires = $skipEmailVerification ? null : date('Y-m-d H:i:s', strtotime('+24 hours'));
$status  = $skipEmailVerification ? 'approved' : 'unconfirmed';

$ins = $pdo->prepare(
    'INSERT INTO users (email, password_hash, name, role, phone, status, email_token, email_token_expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
$ins->execute(array($email, $hash, $name, $role, $phone, $status, $token, $expires));

if (!$skipEmailVerification) {
    send_verification_email($email, $name, $token);
}

json_response(array(
    'ok'      => true,
    'message' => $skipEmailVerification
        ? 'Registro exitoso. En desarrollo la cuenta quedó activa sin confirmación de correo.'
        : 'Registro exitoso. Revisa tu correo y confirma tu dirección para continuar.',
), 201);
