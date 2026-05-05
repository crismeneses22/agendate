<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';
boot_api();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(array('ok' => false, 'message' => 'Método no permitido.'), 405);

require_role('admin');

$body    = get_json_body();
$userId  = isset($body['user_id']) ? (int)$body['user_id'] : 0;
$action  = clean_string(isset($body['action']) ? $body['action'] : '', 20);

if (!$userId) json_response(array('ok' => false, 'message' => 'user_id requerido.'), 400);
if (!in_array($action, array('approve', 'reject'))) json_response(array('ok' => false, 'message' => 'Acción inválida.'), 400);

$pdo  = get_pdo();
$check = $pdo->prepare("SELECT id, email, name, role, status FROM users WHERE id = ?");
$check->execute(array($userId));
$target = $check->fetch();

if (!$target) json_response(array('ok' => false, 'message' => 'Usuario no encontrado.'), 404);
if ($target['role'] === 'admin') json_response(array('ok' => false, 'message' => 'No se puede modificar un administrador.'), 403);
if ($action === 'approve' && $target['status'] !== 'pending') {
    json_response(array('ok' => false, 'message' => 'Solo se pueden aprobar cuentas con correo confirmado.'), 400);
}
if ($action === 'reject' && !in_array($target['status'], array('pending', 'unconfirmed'))) {
    json_response(array('ok' => false, 'message' => 'Esta cuenta no está en revisión.'), 400);
}

$newStatus = ($action === 'approve') ? 'approved' : 'rejected';
$upd = $pdo->prepare('UPDATE users SET status = ?, email_token = NULL, email_token_expires_at = NULL WHERE id = ?');
$upd->execute(array($newStatus, $userId));

send_account_review_email($target['email'], $target['name'], $newStatus);

json_response(array('ok' => true, 'status' => $newStatus));
