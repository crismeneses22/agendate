<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_response(array('ok' => false, 'message' => 'Método no permitido.'), 405);

$token = clean_string(isset($_GET['token']) ? $_GET['token'] : '', 64);
if (!$token || !preg_match('/^[a-f0-9]{64}$/', $token)) {
    json_response(array('ok' => false, 'message' => 'Token inválido.'), 400);
}
rate_limit('verify-email-ip:' . client_ip(), 30, 3600);

$pdo  = get_pdo();
$stmt = $pdo->prepare('SELECT * FROM users WHERE email_token = ? AND status = ?');
$stmt->execute(array($token, 'unconfirmed'));
$u = $stmt->fetch();

if (!$u) {
    json_response(array('ok' => false, 'message' => 'El enlace no es válido o ya fue usado.'), 400);
}

if (strtotime($u['email_token_expires_at']) < time()) {
    json_response(array('ok' => false, 'message' => 'El enlace expiró. Regístrate de nuevo para recibir un correo de verificación.'), 400);
}

$upd = $pdo->prepare('UPDATE users SET status = ?, email_token = NULL, email_token_expires_at = NULL WHERE id = ?');
$upd->execute(array('pending', (int)$u['id']));

json_response(array(
    'ok'      => true,
    'message' => 'Correo confirmado. Tu cuenta está en revisión y te avisaremos cuando sea aprobada.',
));
