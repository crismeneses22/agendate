<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';
boot_api();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(array('ok' => false, 'message' => 'Método no permitido.'), 405);
$user = require_session_user();
$pdo  = get_pdo();

$body     = get_json_body();
$id       = (int)(isset($body['id']) ? $body['id'] : 0);
$status   = clean_string(isset($body['status']) ? $body['status'] : '', 40);
$reasonRaw = clean_string(isset($body['reason']) ? $body['reason'] : '', 1000);
$reason   = $reasonRaw !== '' ? $reasonRaw : null;

$allowed = array('pending','confirmed','cancelled_by_client','cancelled_by_provider','completed','no_show');
if (!$id || !in_array($status, $allowed)) json_response(array('ok' => false, 'message' => 'Parámetros inválidos.'), 400);

$appt = $pdo->prepare('SELECT * FROM appointments WHERE id = ?');
$appt->execute(array($id));
$a = $appt->fetch();
if (!$a) json_response(array('ok' => false, 'message' => 'Cita no encontrada.'), 404);

if ($user['role'] === 'proveedor' && (int)$a['provider_id'] !== $user['id']) {
    json_response(array('ok' => false, 'message' => 'Acceso denegado.'), 403);
}
if ($user['role'] === 'cliente' && (int)$a['client_id'] !== $user['id']) {
    json_response(array('ok' => false, 'message' => 'Acceso denegado.'), 403);
}
if ($user['role'] === 'cliente' && $status !== 'cancelled_by_client') {
    json_response(array('ok' => false, 'message' => 'Los clientes solo pueden cancelar sus propias citas.'), 403);
}
if ($user['role'] === 'proveedor' && $status === 'cancelled_by_client') {
    json_response(array('ok' => false, 'message' => 'El proveedor no puede marcar una cita como cancelada por el cliente.'), 403);
}

$pdo->prepare('UPDATE appointments SET status=?, cancellation_reason=? WHERE id=?')
    ->execute(array($status, $reason, $id));

$updated = fetch_appointment_email_context($pdo, $id);
send_appointment_status_email($updated, $status);

json_response(array('ok' => true, 'message' => 'Estado actualizado.'));
