<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(array('ok' => false, 'message' => 'Método no permitido.'), 405);
$user = require_role('proveedor');
$pdo  = get_pdo();

$body      = get_json_body();
$id        = (int)(isset($body['id'])         ? $body['id']         : 0);
$weekday   = (int)(isset($body['weekday'])    ? $body['weekday']    : -1);
$startTime = clean_string(isset($body['start_time']) ? $body['start_time'] : '', 5);
$endTime   = clean_string(isset($body['end_time']) ? $body['end_time'] : '', 5);
$isActive  = (int)(bool)(isset($body['is_active']) ? $body['is_active'] : true);

if ($weekday < 0 || $weekday > 6) json_response(array('ok' => false, 'message' => 'weekday inválido (0-6).'), 400);
if (!preg_match('/^\d{2}:\d{2}$/', $startTime) || !preg_match('/^\d{2}:\d{2}$/', $endTime)) {
    json_response(array('ok' => false, 'message' => 'Formato de hora inválido (HH:MM).'), 400);
}
$startParts = explode(':', $startTime);
$endParts = explode(':', $endTime);
if ((int)$startParts[0] > 23 || (int)$startParts[1] > 59 || (int)$endParts[0] > 23 || (int)$endParts[1] > 59 || $startTime >= $endTime) {
    json_response(array('ok' => false, 'message' => 'Rango de hora inválido.'), 400);
}

if ($id) {
    $own = $pdo->prepare('SELECT id FROM availability_rules WHERE id = ? AND provider_id = ?');
    $own->execute(array($id, $user['id']));
    if (!$own->fetch()) json_response(array('ok' => false, 'message' => 'Regla no encontrada.'), 404);

    $pdo->prepare('UPDATE availability_rules SET weekday=?,start_time=?,end_time=?,is_active=? WHERE id=?')
        ->execute(array($weekday, $startTime, $endTime, $isActive, $id));
} else {
    $pdo->prepare('INSERT INTO availability_rules (provider_id,weekday,start_time,end_time,is_active) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE start_time=VALUES(start_time),end_time=VALUES(end_time),is_active=VALUES(is_active)')
        ->execute(array($user['id'], $weekday, $startTime, $endTime, $isActive));
    if (!$id) $id = (int)$pdo->lastInsertId();
    if (!$id) {
        $find = $pdo->prepare('SELECT id FROM availability_rules WHERE provider_id=? AND weekday=?');
        $find->execute(array($user['id'], $weekday));
        $id = (int)$find->fetchColumn();
    }
}

$row = $pdo->prepare('SELECT * FROM availability_rules WHERE id = ?');
$row->execute(array($id));
$r = $row->fetch();

json_response(array('ok' => true, 'rule' => array(
    'id'         => (int)$r['id'],
    'weekday'    => (int)$r['weekday'],
    'start_time' => $r['start_time'],
    'end_time'   => $r['end_time'],
    'is_active'  => (bool)$r['is_active'],
)));
