<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

$user = require_role('proveedor');
$pdo  = get_pdo();
$stmt = $pdo->prepare('SELECT * FROM availability_rules WHERE provider_id = ? ORDER BY weekday');
$stmt->execute(array($user['id']));
$rows = $stmt->fetchAll();

$rules = array_map(function($r) {
    return array(
        'id'         => (int)$r['id'],
        'weekday'    => (int)$r['weekday'],
        'start_time' => $r['start_time'],
        'end_time'   => $r['end_time'],
        'is_active'  => (bool)$r['is_active'],
    );
}, $rows);

json_response(array('ok' => true, 'rules' => $rules));
