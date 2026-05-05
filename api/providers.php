<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

$pdo  = get_pdo();
$stmt = $pdo->query('SELECT id, name, avatar_url FROM users WHERE role = \'proveedor\' AND status = \'approved\' ORDER BY name');
$rows = $stmt->fetchAll();
$providers = array_map(function($r) {
    return array(
        'id'         => (int)$r['id'],
        'name'       => $r['name'],
        'avatar_url' => $r['avatar_url'],
    );
}, $rows);

json_response(array('ok' => true, 'providers' => $providers));
