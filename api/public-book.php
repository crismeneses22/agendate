<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';
boot_api();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(array('ok' => false, 'message' => 'Método no permitido.'), 405);

$body      = get_json_body();

$mode      = clean_string(isset($body['mode']) ? $body['mode'] : 'guest', 20); // guest | login | register
$serviceId = (int)(isset($body['service_id']) ? $body['service_id'] : 0);
$startsAt  = clean_string(isset($body['starts_at']) ? $body['starts_at'] : '', 32);
$notesRaw  = clean_string(isset($body['notes']) ? $body['notes'] : '', 2000);
$notes     = $notesRaw !== '' ? $notesRaw : null;

if (!$serviceId || !$startsAt) json_response(array('ok' => false, 'message' => 'service_id y starts_at requeridos.'), 400);
if (!in_array($mode, array('guest', 'login', 'register'))) json_response(array('ok' => false, 'message' => 'Modo inválido.'), 400);
rate_limit('public-book-ip:' . client_ip(), 20, 3600);

$pdo = get_pdo();

// Validate service
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

$clientId   = null;
$guestName  = null;
$guestEmail = null;
$guestPhone = null;

if ($mode === 'login') {
    $email    = strtolower(clean_string(isset($body['email']) ? $body['email'] : '', 191));
    $password = isset($body['password']) ? $body['password'] : '';
    if (!$email || !$password) json_response(array('ok' => false, 'message' => 'Correo y contraseña requeridos.'), 400);
    rate_limit('public-login-email:' . $email, 10, 900);

    $u = $pdo->prepare('SELECT * FROM users WHERE email = ?');
    $u->execute(array($email));
    $user = $u->fetch();
    if (!$user || !password_verify($password, $user['password_hash'])) {
        json_response(array('ok' => false, 'message' => 'Credenciales incorrectas.'), 401);
    }

    $status = isset($user['status']) ? $user['status'] : 'approved';
    if ($status === 'unconfirmed') {
        json_response(array('ok' => false, 'message' => 'Debes confirmar tu correo electrónico antes de iniciar sesión.'), 403);
    }
    if ($status === 'pending') {
        json_response(array('ok' => false, 'message' => 'Tu cuenta está pendiente de aprobación.'), 403);
    }
    if ($status === 'rejected') {
        json_response(array('ok' => false, 'message' => 'Tu solicitud de cuenta fue rechazada.'), 403);
    }

    set_session_user($user);
    $clientId = (int)$user['id'];

} elseif ($mode === 'register') {
    $name     = clean_string(isset($body['name']) ? $body['name'] : '', 255);
    $email    = strtolower(clean_string(isset($body['email']) ? $body['email'] : '', 191));
    $pass     = isset($body['password']) ? $body['password'] : '';
    $phoneRaw = clean_string(isset($body['phone']) ? $body['phone'] : '', 40);
    $phone    = $phoneRaw !== '' ? $phoneRaw : null;

    if (!$name)  json_response(array('ok' => false, 'message' => 'El nombre es requerido.'), 400);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_response(array('ok' => false, 'message' => 'Correo inválido.'), 400);
    if (strlen($pass) < 8) json_response(array('ok' => false, 'message' => 'La contraseña debe tener al menos 8 caracteres.'), 400);
    if (strlen($pass) > 512) json_response(array('ok' => false, 'message' => 'La contraseña es demasiado larga.'), 400);
    rate_limit('public-register-ip:' . client_ip(), 8, 3600);

    $check = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $check->execute(array($email));
    if ($check->fetch()) json_response(array('ok' => false, 'message' => 'Este correo ya tiene una cuenta. Inicia sesión.'), 409);

    $skipEmailVerification = !is_production() && env_bool('AGENDATE_DEV_SKIP_EMAIL_VERIFICATION', true);
    $hash    = password_hash($pass, PASSWORD_DEFAULT);
    $token   = $skipEmailVerification ? null : random_hex(32);
    $expires = $skipEmailVerification ? null : date('Y-m-d H:i:s', strtotime('+24 hours'));
    $status  = $skipEmailVerification ? 'approved' : 'unconfirmed';
    $ins  = $pdo->prepare(
        'INSERT INTO users (email, password_hash, name, role, phone, status, email_token, email_token_expires_at)
         VALUES (?, ?, ?, \'cliente\', ?, ?, ?, ?)'
    );
    $ins->execute(array($email, $hash, $name, $phone, $status, $token, $expires));

    if (!$skipEmailVerification) {
        send_verification_email($email, $name, $token);
    }

    $guestName  = $name;
    $guestEmail = $email;
    $guestPhone = $phone;

} else {
    // guest
    $guestName  = clean_string(isset($body['name']) ? $body['name'] : '', 255);
    $guestEmail = strtolower(clean_string(isset($body['email']) ? $body['email'] : '', 191));
    $phoneRaw   = clean_string(isset($body['phone']) ? $body['phone'] : '', 40);
    $guestPhone = $phoneRaw !== '' ? $phoneRaw : null;

    if (!$guestName)  json_response(array('ok' => false, 'message' => 'El nombre es requerido.'), 400);
    if (!filter_var($guestEmail, FILTER_VALIDATE_EMAIL)) json_response(array('ok' => false, 'message' => 'Correo inválido.'), 400);
}

$lockKey  = 'agendate:appt:' . $providerId . ':' . date('Y-m-d', $startTs);
$lockStmt = $pdo->prepare('SELECT GET_LOCK(?, 5)');
$lockStmt->execute(array($lockKey));
if ((int)$lockStmt->fetchColumn() !== 1) {
    json_response(array('ok' => false, 'message' => 'No se pudo confirmar disponibilidad. Intenta nuevamente.'), 409);
}

// Check conflict
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

// Insert appointment
$ins = $pdo->prepare(
    'INSERT INTO appointments (service_id, provider_id, client_id, guest_name, guest_email, guest_phone, starts_at, ends_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$ins->execute(array($serviceId, $providerId, $clientId, $guestName, $guestEmail, $guestPhone, $startFmt, $endFmt, $notes));
$apptId = (int)$pdo->lastInsertId();
$pdo->prepare('SELECT RELEASE_LOCK(?)')->execute(array($lockKey));

$appt = fetch_appointment_email_context($pdo, $apptId);
send_appointment_request_emails($appt);

$resp = array('ok' => true, 'message' => 'Cita agendada.', 'appointment' => serialize_appointment($appt));
if ($mode === 'register' && isset($user)) {
    $resp['user'] = serialize_user($user);
}
json_response($resp, 201);
