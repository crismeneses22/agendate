<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

$user = require_role('proveedor');
$pdo  = get_pdo();
$stmt = $pdo->prepare('SELECT * FROM services WHERE provider_id = ? ORDER BY name');
$stmt->execute(array($user['id']));
$rows = $stmt->fetchAll();

$userName = $user['name'];
$services = array_map(function($s) use ($userName) {
    return serialize_service($s, $userName);
}, $rows);

json_response(array('ok' => true, 'services' => $services));
