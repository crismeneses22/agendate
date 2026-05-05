<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

$user = require_session_user();
$pdo  = get_pdo();

$stmt = $pdo->prepare(
    'SELECT a.*, s.name AS service_name,
            p.name AS provider_name, c.name AS client_name, c.email AS client_email, c.phone AS client_phone
     FROM appointments a
     JOIN services s ON s.id = a.service_id
     JOIN users p ON p.id = a.provider_id
     JOIN users c ON c.id = a.client_id
     WHERE a.client_id = ?
     ORDER BY a.starts_at DESC'
);
$stmt->execute([$user['id']]);
$rows = $stmt->fetchAll();

json_response(['ok' => true, 'appointments' => array_map('serialize_appointment', $rows)]);
