<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_response(array('ok' => false, 'message' => 'Método no permitido.'), 405);

require_role('admin');

$pdo  = get_pdo();
$stmt = $pdo->prepare(
    "SELECT id, email, name, role, phone, status, created_at
     FROM users
     WHERE role != 'admin'
     ORDER BY
       CASE status WHEN 'pending' THEN 0 WHEN 'unconfirmed' THEN 1 WHEN 'rejected' THEN 2 ELSE 3 END,
       created_at DESC"
);
$stmt->execute();
$rows = $stmt->fetchAll();

$users = array_map(function($u) {
    return array(
        'id'         => (int)$u['id'],
        'email'      => $u['email'],
        'name'       => $u['name'],
        'role'       => $u['role'],
        'phone'      => $u['phone'],
        'status'     => $u['status'],
        'created_at' => $u['created_at'],
    );
}, $rows);

json_response(array('ok' => true, 'users' => $users));
