<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

$providerId = (int)(isset($_GET['provider_id']) ? $_GET['provider_id'] : 0);
if (!$providerId) json_response(array('ok' => false, 'message' => 'provider_id requerido.'), 400);
if ($providerId < 1) json_response(array('ok' => false, 'message' => 'provider_id inválido.'), 400);

$pdo  = get_pdo();
$stmt = $pdo->prepare(
    'SELECT s.*
     FROM services s
     JOIN users p ON p.id = s.provider_id
     WHERE s.provider_id = ? AND s.is_active = 1 AND p.role = \'proveedor\' AND p.status = \'approved\'
     ORDER BY s.name'
);
$stmt->execute(array($providerId));
$rows = $stmt->fetchAll();

$services = array_map(function($s) {
    return serialize_service($s, '');
}, $rows);

if ($services) {
    $p = $pdo->prepare('SELECT name FROM users WHERE id = ? AND status = ?');
    $p->execute(array($providerId, 'approved'));
    $pName = $p->fetchColumn() ?: '';
    foreach ($services as &$s) $s['provider_name'] = $pName;
}

json_response(array('ok' => true, 'services' => $services));
