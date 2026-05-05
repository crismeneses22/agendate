<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

$user = require_session_user();
$pdo  = get_pdo();

$statusFilter = isset($_GET['status']) ? $_GET['status'] : '';
$dateFilter   = isset($_GET['date'])   ? $_GET['date']   : '';

$isAdmin    = $user['role'] === 'admin';
$isProvider = $user['role'] === 'proveedor';

if (!$isAdmin && !$isProvider) json_response(array('ok' => false, 'message' => 'Acceso denegado.'), 403);

$where  = array();
$params = array();

if ($isProvider) {
    $where[]  = 'a.provider_id = ?';
    $params[] = $user['id'];
}

if ($statusFilter) {
    $statuses = array_filter(explode(',', $statusFilter));
    if ($statuses) {
        $placeholders = implode(',', array_fill(0, count($statuses), '?'));
        $where[]  = "a.status IN ({$placeholders})";
        $params   = array_merge($params, array_values($statuses));
    }
}

if ($dateFilter && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFilter)) {
    $where[]  = 'DATE(a.starts_at) = ?';
    $params[] = $dateFilter;
}

$whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$stmt = $pdo->prepare(
    "SELECT a.*, s.name AS service_name,
            p.name AS provider_name,
            c.name AS client_name, c.email AS client_email, c.phone AS client_phone
     FROM appointments a
     JOIN services s ON s.id = a.service_id
     JOIN users p ON p.id = a.provider_id
     LEFT JOIN users c ON c.id = a.client_id
     {$whereClause}
     ORDER BY a.starts_at DESC"
);
$stmt->execute($params);
$rows = $stmt->fetchAll();

json_response(array('ok' => true, 'appointments' => array_map('serialize_appointment', $rows)));
