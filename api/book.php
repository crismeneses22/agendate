<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';
boot_api();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(array('ok' => false, 'message' => 'Método no permitido.'), 405);
$user = require_session_user();
if ($user['role'] !== 'cliente') json_response(array('ok' => false, 'message' => 'Solo clientes pueden agendar citas.'), 403);

$body      = get_json_body();
$serviceId = (int)(isset($body['service_id']) ? $body['service_id'] : 0);
$startsAt  = clean_string(isset($body['starts_at']) ? $body['starts_at'] : '', 32);
$notesRaw  = clean_string(isset($body['notes']) ? $body['notes'] : '', 2000);
$notes     = $notesRaw !== '' ? $notesRaw : null;

if (!$serviceId || !$startsAt) json_response(array('ok' => false, 'message' => 'service_id y starts_at requeridos.'), 400);
rate_limit('book-user:' . $user['id'], 20, 3600);

$pdo = get_pdo();

$svc = $pdo->prepare(
    'SELECT s.*
     FROM services s
     JOIN users p ON p.id = s.provider_id
     WHERE s.id = ? AND s.is_active = 1 AND p.role = \'proveedor\' AND p.status = \'approved\''
);
$svc->execute(array($serviceId));
$service = $svc->fetch();
if (!$service) json_response(array('ok' => false, 'message' => 'Servicio no encontrado.'), 404);

$providerId  = (int)$service['provider_id'];
$durationMin = (int)$service['duration_minutes'];

$startTs = parse_local_datetime($startsAt);
if (!$startTs || $startTs <= time()) json_response(array('ok' => false, 'message' => 'Hora de inicio inválida o en el pasado.'), 400);
if ($startTs > strtotime('+180 days')) json_response(array('ok' => false, 'message' => 'Hora fuera de rango.'), 400);

$startFmt = date('Y-m-d H:i:s', $startTs);
$endFmt   = date('Y-m-d H:i:s', $startTs + $durationMin * 60);
$lockKey  = 'agendate:appt:' . $providerId . ':' . date('Y-m-d', $startTs);
$lockStmt = $pdo->prepare('SELECT GET_LOCK(?, 5)');
$lockStmt->execute(array($lockKey));
if ((int)$lockStmt->fetchColumn() !== 1) {
    json_response(array('ok' => false, 'message' => 'No se pudo confirmar disponibilidad. Intenta nuevamente.'), 409);
}

$conflict = $pdo->prepare(
    'SELECT id FROM appointments
     WHERE provider_id = ? AND status NOT IN (\'cancelled_by_client\',\'cancelled_by_provider\')
     AND starts_at < ? AND ends_at > ?'
);
$conflict->execute(array($providerId, $endFmt, $startFmt));
if ($conflict->fetch()) {
    $pdo->prepare('SELECT RELEASE_LOCK(?)')->execute(array($lockKey));
    json_response(array('ok' => false, 'message' => 'Este horario ya no está disponible.'), 409);
}

$ins = $pdo->prepare(
    'INSERT INTO appointments (service_id,provider_id,client_id,starts_at,ends_at,notes) VALUES (?,?,?,?,?,?)'
);
$ins->execute(array($serviceId, $providerId, $user['id'], $startFmt, $endFmt, $notes));
$apptId = (int)$pdo->lastInsertId();
$pdo->prepare('SELECT RELEASE_LOCK(?)')->execute(array($lockKey));

$appt = fetch_appointment_email_context($pdo, $apptId);
send_appointment_request_emails($appt);

json_response(array('ok' => true, 'message' => 'Cita agendada.', 'appointment' => serialize_appointment($appt)), 201);
