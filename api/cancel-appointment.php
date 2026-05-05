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
$reasonRaw = clean_string(isset($body['reason']) ? $body['reason'] : '', 1000);
$reason   = $reasonRaw !== '' ? $reasonRaw : null;

if (!$id) json_response(array('ok' => false, 'message' => 'id requerido.'), 400);

$appt = $pdo->prepare('SELECT * FROM appointments WHERE id = ?');
$appt->execute(array($id));
$a = $appt->fetch();
if (!$a) json_response(array('ok' => false, 'message' => 'Cita no encontrada.'), 404);

if ((int)$a['client_id'] !== $user['id'] && (int)$a['provider_id'] !== $user['id'] && $user['role'] !== 'admin') {
    json_response(array('ok' => false, 'message' => 'Acceso denegado.'), 403);
}

if (in_array($a['status'], array('cancelled_by_client', 'cancelled_by_provider', 'completed', 'no_show'))) {
    json_response(array('ok' => false, 'message' => 'Esta cita ya no puede cancelarse.'), 400);
}

$newStatus = $user['role'] === 'cliente' ? 'cancelled_by_client' : 'cancelled_by_provider';
$pdo->prepare('UPDATE appointments SET status=?, cancellation_reason=? WHERE id=?')
    ->execute(array($newStatus, $reason, $id));

$updated = fetch_appointment_email_context($pdo, $id);
send_appointment_cancellation_emails($updated);

json_response(array('ok' => true, 'message' => 'Cita cancelada.'));
