<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

$user = require_session_user();
$pdo  = get_pdo();
$row  = $pdo->prepare('SELECT * FROM users WHERE id = ?');
$row->execute([$user['id']]);
$u = $row->fetch();
if (!$u) json_response(['ok' => false, 'message' => 'Usuario no encontrado.'], 404);
json_response(['ok' => true, 'user' => serialize_user($u)]);
