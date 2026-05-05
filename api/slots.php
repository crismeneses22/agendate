<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

$serviceId = (int)(isset($_GET['service_id']) ? $_GET['service_id'] : 0);
$date      = clean_string(isset($_GET['date']) ? $_GET['date'] : '', 10);

if (!$serviceId || !$date) json_response(array('ok' => false, 'message' => 'service_id y date requeridos.'), 400);
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) json_response(array('ok' => false, 'message' => 'Formato de fecha inválido.'), 400);
$ts = strtotime($date);
if (!$ts) json_response(array('ok' => false, 'message' => 'Fecha inválida.'), 400);
if ($ts < strtotime(date('Y-m-d')) || $ts > strtotime('+180 days')) json_response(array('ok' => false, 'message' => 'Fecha fuera de rango.'), 400);

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

$weekday = (int)date('w', $ts);

$rule = $pdo->prepare('SELECT * FROM availability_rules WHERE provider_id = ? AND weekday = ? AND is_active = 1');
$rule->execute(array($providerId, $weekday));
$avail = $rule->fetch();

if (!$avail) json_response(array('ok' => true, 'slots' => array()));

$exc = $pdo->prepare('SELECT * FROM availability_exceptions WHERE provider_id = ? AND exception_date = ?');
$exc->execute(array($providerId, $date));
$exception = $exc->fetch();
if ($exception && $exception['is_blocked']) json_response(array('ok' => true, 'slots' => array()));

$startTime = $exception ? (isset($exception['start_time']) ? $exception['start_time'] : $avail['start_time']) : $avail['start_time'];
$endTime   = $exception ? (isset($exception['end_time'])   ? $exception['end_time']   : $avail['end_time'])   : $avail['end_time'];

$existing = $pdo->prepare(
    'SELECT starts_at, ends_at FROM appointments
     WHERE provider_id = ? AND DATE(starts_at) = ? AND status NOT IN (\'cancelled_by_client\',\'cancelled_by_provider\')'
);
$existing->execute(array($providerId, $date));
$booked = $existing->fetchAll();

$slotStart = strtotime("{$date} {$startTime}");
$slotEnd   = strtotime("{$date} {$endTime}");
$slotSize  = $durationMin * 60;
$now       = time();

$slots = array();
for ($t = $slotStart; $t + $slotSize <= $slotEnd; $t += 1800) {
    $tEnd      = $t + $slotSize;
    $available = $t > $now;

    if ($available) {
        foreach ($booked as $b) {
            $bs = strtotime($b['starts_at']);
            $be = strtotime($b['ends_at']);
            if ($t < $be && $tEnd > $bs) { $available = false; break; }
        }
    }

    $slots[] = array(
        'start'     => date('Y-m-d\TH:i:s', $t),
        'end'       => date('Y-m-d\TH:i:s', $tEnd),
        'available' => $available,
    );
}

json_response(array('ok' => true, 'slots' => $slots));
