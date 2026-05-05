<?php
require_once __DIR__ . '/bootstrap.php';

function mail_env($key, $default = '') {
    return isset($_ENV[$key]) ? trim($_ENV[$key]) : $default;
}

function encode_mail_header($value) {
    return '=?UTF-8?B?' . base64_encode($value) . '?=';
}

function smtp_read($socket) {
    $response = '';
    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (strlen($line) >= 4 && $line[3] === ' ') break;
    }
    return $response;
}

function smtp_expect($socket, $codes) {
    $response = smtp_read($socket);
    $code = (int)substr($response, 0, 3);
    if (!in_array($code, $codes, true)) {
        throw new Exception('SMTP error ' . $code);
    }
    return $response;
}

function smtp_command($socket, $command, $codes) {
    fwrite($socket, $command . "\r\n");
    return smtp_expect($socket, $codes);
}

function smtp_dot_escape($message) {
    return preg_replace('/^\./m', '..', $message);
}

function smtp_send_mail($to, $subject, $htmlBody, $textBody, $fromEmail, $fromName) {
    $host = mail_env('AGENDATE_SMTP_HOST');
    $port = (int)mail_env('AGENDATE_SMTP_PORT', '587');
    $user = mail_env('AGENDATE_SMTP_USER');
    $pass = mail_env('AGENDATE_SMTP_PASS');

    if (!$host || !$port || !$user || !$pass || !$fromEmail) {
        return false;
    }

    $transportHost = ($port === 465 ? 'ssl://' : '') . $host;
    $socket = @stream_socket_client($transportHost . ':' . $port, $errno, $errstr, 20, STREAM_CLIENT_CONNECT);
    if (!$socket) {
        throw new Exception('No se pudo conectar al SMTP.');
    }
    stream_set_timeout($socket, 20);

    $localhost = isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'localhost';

    smtp_expect($socket, array(220));
    smtp_command($socket, 'EHLO ' . $localhost, array(250));

    if ($port !== 465) {
        smtp_command($socket, 'STARTTLS', array(220));
        if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new Exception('No se pudo iniciar TLS SMTP.');
        }
        smtp_command($socket, 'EHLO ' . $localhost, array(250));
    }

    smtp_command($socket, 'AUTH LOGIN', array(334));
    smtp_command($socket, base64_encode($user), array(334));
    smtp_command($socket, base64_encode($pass), array(235));

    $boundary = 'ag_' . random_hex(16);
    $fromHeader = $fromName ? encode_mail_header($fromName) . ' <' . $fromEmail . '>' : $fromEmail;
    $encodedSubject = encode_mail_header($subject);
    $messageIdHost = parse_url(APP_URL, PHP_URL_HOST);
    if (!$messageIdHost) $messageIdHost = 'agendate.local';

    $headers = array(
        'Date: ' . date('r'),
        'From: ' . $fromHeader,
        'Reply-To: ' . $fromEmail,
        'To: ' . $to,
        'Subject: ' . $encodedSubject,
        'Message-ID: <' . random_hex(16) . '@' . $messageIdHost . '>',
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        'X-Mailer: agendate/1.0',
    );

    $body = implode("\r\n", $headers) . "\r\n\r\n"
          . "--{$boundary}\r\n"
          . "Content-Type: text/plain; charset=utf-8\r\n"
          . "Content-Transfer-Encoding: base64\r\n\r\n"
          . chunk_split(base64_encode($textBody))
          . "--{$boundary}\r\n"
          . "Content-Type: text/html; charset=utf-8\r\n"
          . "Content-Transfer-Encoding: base64\r\n\r\n"
          . chunk_split(base64_encode($htmlBody))
          . "--{$boundary}--\r\n";

    smtp_command($socket, 'MAIL FROM:<' . $fromEmail . '>', array(250));
    smtp_command($socket, 'RCPT TO:<' . $to . '>', array(250, 251));
    smtp_command($socket, 'DATA', array(354));
    fwrite($socket, smtp_dot_escape($body) . "\r\n.\r\n");
    smtp_expect($socket, array(250));
    smtp_command($socket, 'QUIT', array(221));
    fclose($socket);

    return true;
}

function log_mail_event($to, $subject, $textBody, $status) {
    $logDir = AGENDATE_ROOT . '/storage';
    if (!is_dir($logDir)) @mkdir($logDir, 0755, true);
    $logFile = $logDir . '/emails.log';

    $separator = str_repeat('-', 72);
    $entry = "\n{$separator}\n"
        . '[' . date('Y-m-d H:i:s') . "]\n"
        . "Status:  {$status}\n"
        . "To:      {$to}\n"
        . "Subject: {$subject}\n"
        . "Body:\n{$textBody}\n"
        . "{$separator}\n";

    @file_put_contents($logFile, $entry, FILE_APPEND | LOCK_EX);
}

/**
 * Send an email and always log it to storage/emails.log for local dev/audit.
 * Uses SMTP when AGENDATE_SMTP_* is configured; otherwise log-only.
 */
function send_mail($to, $subject, $htmlBody, $textBody = '') {
    if ($textBody === '') {
        $textBody = strip_tags(preg_replace('/<br\s*\/?>/i', "\n", $htmlBody));
    }

    $to = trim($to);
    $fromEnv = mail_env('AGENDATE_MAIL_FROM');
    $fromName = mail_env('AGENDATE_MAIL_FROM_NAME', 'agendate');

    if (!filter_var($to, FILTER_VALIDATE_EMAIL) || !filter_var($fromEnv, FILTER_VALIDATE_EMAIL)) {
        log_mail_event($to, $subject, $textBody, 'not-sent-invalid-address');
        return false;
    }

    try {
        if (smtp_send_mail($to, $subject, $htmlBody, $textBody, $fromEnv, $fromName)) {
            log_mail_event($to, $subject, $textBody, 'sent-smtp');
            return true;
        }
        log_mail_event($to, $subject, $textBody, 'log-only-missing-smtp');
    } catch (Exception $e) {
        log_mail_event($to, $subject, $textBody, 'smtp-failed');
        return false;
    }

    return false;
}

function send_verification_email($toEmail, $toName, $token) {
    $verifyUrl = APP_URL . '/verificar?token=' . urlencode($token);
    $appName   = 'agendate';

    $html = '<!DOCTYPE html><html><body style="margin:0;padding:32px;background:#060608;font-family:sans-serif;color:#fff;">'
          . '<h2 style="color:#60a5fa;margin-bottom:8px;">' . htmlspecialchars($appName) . '</h2>'
          . '<p style="color:#aaa;">Hola ' . htmlspecialchars($toName) . ',</p>'
          . '<p style="color:#aaa;">Para activar tu cuenta, confirma tu correo electrónico haciendo clic en el siguiente enlace:</p>'
          . '<p><a href="' . htmlspecialchars($verifyUrl) . '" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#60a5fa,#818cf8);color:#000;border-radius:10px;text-decoration:none;font-weight:600;">Confirmar correo</a></p>'
          . '<p style="color:#555;font-size:12px;">Este enlace expira en 24 horas.<br>Si no creaste esta cuenta, ignora este mensaje.</p>'
          . '<p style="color:#555;font-size:12px;">O copia este enlace en tu navegador:<br><code style="color:#818cf8;">' . htmlspecialchars($verifyUrl) . '</code></p>'
          . '</body></html>';

    $text = "Hola {$toName},\n\n"
          . "Confirma tu correo electrónico en agendate:\n\n"
          . "{$verifyUrl}\n\n"
          . "Este enlace expira en 24 horas.\n"
          . "Si no creaste esta cuenta, ignora este mensaje.\n";

    send_mail($toEmail, 'Confirma tu correo · agendate', $html, $text);
}

function send_account_review_email($toEmail, $toName, $status) {
    $approved = $status === 'approved';
    $subject = $approved ? 'Tu cuenta fue aprobada · agendate' : 'Actualización de tu cuenta · agendate';
    $title = $approved ? 'Cuenta aprobada' : 'Solicitud no aprobada';
    $bodyText = $approved
        ? 'Tu cuenta ya fue aprobada. Puedes iniciar sesión y usar agendate.'
        : 'Tu solicitud de cuenta no fue aprobada. Si crees que es un error, contáctanos.';
    $loginUrl = APP_URL . '/login';

    $html = '<!DOCTYPE html><html><body style="margin:0;padding:32px;background:#060608;font-family:sans-serif;color:#fff;">'
          . '<h2 style="color:#60a5fa;margin-bottom:8px;">agendate</h2>'
          . '<p style="color:#aaa;">Hola ' . htmlspecialchars($toName) . ',</p>'
          . '<h3 style="color:#fff;">' . htmlspecialchars($title) . '</h3>'
          . '<p style="color:#aaa;">' . htmlspecialchars($bodyText) . '</p>';

    if ($approved) {
        $html .= '<p><a href="' . htmlspecialchars($loginUrl) . '" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#60a5fa,#818cf8);color:#000;border-radius:10px;text-decoration:none;font-weight:600;">Iniciar sesión</a></p>';
    }

    $html .= '</body></html>';

    $text = "Hola {$toName},\n\n{$bodyText}\n";
    if ($approved) $text .= "\nInicia sesión: {$loginUrl}\n";

    send_mail($toEmail, $subject, $html, $text);
}

function fetch_appointment_email_context($pdo, $appointmentId) {
    $stmt = $pdo->prepare(
        'SELECT a.*, s.name AS service_name,
                COALESCE(NULLIF(p.booking_title, \'\'), p.name) AS provider_name,
                p.email AS provider_email, p.phone AS provider_phone,
                c.name AS client_name, c.email AS client_email, c.phone AS client_phone
         FROM appointments a
         JOIN services s ON s.id = a.service_id
         JOIN users p ON p.id = a.provider_id
         LEFT JOIN users c ON c.id = a.client_id
         WHERE a.id = ?'
    );
    $stmt->execute(array((int)$appointmentId));
    return $stmt->fetch();
}

function appointment_client_name($appointment) {
    if (!empty($appointment['client_name'])) return $appointment['client_name'];
    if (!empty($appointment['guest_name'])) return $appointment['guest_name'];
    return 'cliente';
}

function appointment_client_email($appointment) {
    if (!empty($appointment['client_email'])) return $appointment['client_email'];
    if (!empty($appointment['guest_email'])) return $appointment['guest_email'];
    return '';
}

function appointment_time_text($appointment) {
    $startTs = strtotime($appointment['starts_at']);
    $endTs = strtotime($appointment['ends_at']);
    if (!$startTs || !$endTs) return trim($appointment['starts_at'] . ' - ' . $appointment['ends_at']);
    return date('d/m/Y', $startTs) . ' de ' . date('H:i', $startTs) . ' a ' . date('H:i', $endTs);
}

function appointment_email_shell($title, $intro, $details) {
    $items = '';
    foreach ($details as $label => $value) {
        if ($value === null || $value === '') continue;
        $items .= '<tr>'
            . '<td style="padding:8px 12px;color:#888;border-bottom:1px solid #1f2937;">' . htmlspecialchars($label) . '</td>'
            . '<td style="padding:8px 12px;color:#fff;border-bottom:1px solid #1f2937;">' . nl2br(htmlspecialchars($value)) . '</td>'
            . '</tr>';
    }

    return '<!DOCTYPE html><html><body style="margin:0;padding:32px;background:#060608;font-family:sans-serif;color:#fff;">'
        . '<h2 style="color:#60a5fa;margin-bottom:8px;">agendate</h2>'
        . '<h3 style="color:#fff;margin:0 0 12px;">' . htmlspecialchars($title) . '</h3>'
        . '<p style="color:#aaa;line-height:1.55;">' . htmlspecialchars($intro) . '</p>'
        . '<table cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;border-collapse:collapse;background:#111216;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">'
        . $items
        . '</table>'
        . '<p style="color:#555;font-size:12px;margin-top:20px;">Este mensaje fue generado automáticamente por agendate.</p>'
        . '</body></html>';
}

function appointment_text_body($title, $intro, $details) {
    $text = $title . "\n\n" . $intro . "\n\n";
    foreach ($details as $label => $value) {
        if ($value === null || $value === '') continue;
        $text .= $label . ': ' . $value . "\n";
    }
    return $text;
}

function send_appointment_request_emails($appointment) {
    if (!$appointment) return;

    $clientName = appointment_client_name($appointment);
    $clientEmail = appointment_client_email($appointment);
    $providerEmail = isset($appointment['provider_email']) ? $appointment['provider_email'] : '';
    $timeText = appointment_time_text($appointment);

    $clientDetails = array(
        'Servicio' => $appointment['service_name'],
        'Proveedor' => $appointment['provider_name'],
        'Horario solicitado' => $timeText,
        'Estado' => 'Pendiente de confirmación',
        'Notas' => isset($appointment['notes']) ? $appointment['notes'] : null,
    );
    $clientTitle = 'Solicitud de cita recibida';
    $clientIntro = 'Hola ' . $clientName . ', recibimos tu solicitud. Te avisaremos cuando el proveedor la confirme o cancele.';
    send_mail(
        $clientEmail,
        'Solicitud de cita recibida · agendate',
        appointment_email_shell($clientTitle, $clientIntro, $clientDetails),
        appointment_text_body($clientTitle, $clientIntro, $clientDetails)
    );

    $providerDetails = array(
        'Servicio' => $appointment['service_name'],
        'Cliente' => $clientName,
        'Email del cliente' => $clientEmail,
        'Teléfono del cliente' => !empty($appointment['client_phone']) ? $appointment['client_phone'] : (isset($appointment['guest_phone']) ? $appointment['guest_phone'] : null),
        'Horario solicitado' => $timeText,
        'Notas' => isset($appointment['notes']) ? $appointment['notes'] : null,
    );
    $providerTitle = 'Nueva solicitud de cita';
    $providerIntro = 'Tienes una nueva solicitud pendiente. Entra al panel para confirmarla o cancelarla.';
    send_mail(
        $providerEmail,
        'Nueva solicitud de cita · agendate',
        appointment_email_shell($providerTitle, $providerIntro, $providerDetails),
        appointment_text_body($providerTitle, $providerIntro, $providerDetails)
    );
}

function send_appointment_confirmation_email($appointment) {
    if (!$appointment) return;

    $clientName = appointment_client_name($appointment);
    $clientEmail = appointment_client_email($appointment);
    $details = array(
        'Servicio' => $appointment['service_name'],
        'Proveedor' => $appointment['provider_name'],
        'Horario confirmado' => appointment_time_text($appointment),
        'Notas' => isset($appointment['notes']) ? $appointment['notes'] : null,
    );
    $title = 'Cita confirmada';
    $intro = 'Hola ' . $clientName . ', tu cita fue confirmada por el proveedor.';
    send_mail(
        $clientEmail,
        'Cita confirmada · agendate',
        appointment_email_shell($title, $intro, $details),
        appointment_text_body($title, $intro, $details)
    );
}

function send_appointment_cancellation_emails($appointment) {
    if (!$appointment) return;

    $clientName = appointment_client_name($appointment);
    $clientEmail = appointment_client_email($appointment);
    $providerEmail = isset($appointment['provider_email']) ? $appointment['provider_email'] : '';
    $cancelledByProvider = isset($appointment['status']) && $appointment['status'] === 'cancelled_by_provider';
    $cancelledBy = $cancelledByProvider ? 'proveedor' : 'cliente';
    $reason = isset($appointment['cancellation_reason']) ? $appointment['cancellation_reason'] : null;

    $baseDetails = array(
        'Servicio' => $appointment['service_name'],
        'Proveedor' => $appointment['provider_name'],
        'Cliente' => $clientName,
        'Horario' => appointment_time_text($appointment),
        'Cancelado por' => $cancelledBy,
        'Motivo' => $reason,
    );

    $clientTitle = 'Cita cancelada';
    $clientIntro = 'Hola ' . $clientName . ', esta cita fue cancelada.';
    send_mail(
        $clientEmail,
        'Cita cancelada · agendate',
        appointment_email_shell($clientTitle, $clientIntro, $baseDetails),
        appointment_text_body($clientTitle, $clientIntro, $baseDetails)
    );

    $providerTitle = 'Cita cancelada';
    $providerIntro = 'Una cita de tu agenda fue cancelada.';
    send_mail(
        $providerEmail,
        'Cita cancelada · agendate',
        appointment_email_shell($providerTitle, $providerIntro, $baseDetails),
        appointment_text_body($providerTitle, $providerIntro, $baseDetails)
    );
}

function send_appointment_status_email($appointment, $status) {
    if ($status === 'confirmed') {
        send_appointment_confirmation_email($appointment);
        return;
    }

    if ($status === 'cancelled_by_client' || $status === 'cancelled_by_provider') {
        send_appointment_cancellation_emails($appointment);
    }
}
