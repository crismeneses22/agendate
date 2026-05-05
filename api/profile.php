<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(array('ok' => false, 'message' => 'Método no permitido.'), 405);
$user = require_session_user();
$pdo  = get_pdo();

$body     = get_json_body();
$name     = clean_string(isset($body['name']) ? $body['name'] : '', 255);
$phoneRaw = clean_string(isset($body['phone']) ? $body['phone'] : '', 40);
$phone    = $phoneRaw !== '' ? $phoneRaw : null;
$curPass  = isset($body['current_password']) ? $body['current_password'] : '';
$newPass  = isset($body['new_password'])     ? $body['new_password']     : '';

$row = $pdo->prepare('SELECT * FROM users WHERE id = ?');
$row->execute(array($user['id']));
$u = $row->fetch();

$fields = array();
$params = array();

if ($name) { $fields[] = 'name = ?'; $params[] = $name; }
if ($phone !== null) { $fields[] = 'phone = ?'; $params[] = $phone; }

if ($newPass) {
    rate_limit('password-change:' . $user['id'], 8, 3600);
    if (strlen($newPass) < 8) json_response(array('ok' => false, 'message' => 'Nueva contraseña muy corta.'), 400);
    if (strlen($newPass) > 512) json_response(array('ok' => false, 'message' => 'Nueva contraseña demasiado larga.'), 400);
    if (!password_verify($curPass, $u['password_hash'])) json_response(array('ok' => false, 'message' => 'Contraseña actual incorrecta.'), 400);
    $fields[] = 'password_hash = ?';
    $params[] = password_hash($newPass, PASSWORD_DEFAULT);
}

if ($fields) {
    $params[] = $user['id'];
    $pdo->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
}

$row->execute(array($user['id']));
$updated = $row->fetch();
set_session_user($updated);
json_response(array('ok' => true, 'user' => serialize_user($updated)));
