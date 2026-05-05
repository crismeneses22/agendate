<?php
require_once __DIR__ . '/bootstrap.php';

function get_pdo() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $socket = isset($_ENV['AGENDATE_DB_SOCKET']) ? $_ENV['AGENDATE_DB_SOCKET'] : '/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock';
    $host   = isset($_ENV['AGENDATE_DB_HOST'])   ? $_ENV['AGENDATE_DB_HOST']   : '127.0.0.1';
    $port   = isset($_ENV['AGENDATE_DB_PORT'])   ? $_ENV['AGENDATE_DB_PORT']   : '3306';
    $user   = isset($_ENV['AGENDATE_DB_USER'])   ? $_ENV['AGENDATE_DB_USER']   : 'root';
    $pass   = isset($_ENV['AGENDATE_DB_PASS'])   ? $_ENV['AGENDATE_DB_PASS']   : '';
    $dbName = isset($_ENV['AGENDATE_DB_NAME'])   ? $_ENV['AGENDATE_DB_NAME']   : 'agendate';

    if (!preg_match('/^[a-zA-Z0-9_]+$/', $dbName)) {
        throw new Exception('Nombre de base de datos inválido.');
    }

    if (is_production()) {
        if ($user === '' || strtolower($user) === 'root' || $pass === '') {
            throw new Exception('Configura un usuario de base de datos dedicado con contraseña para producción.');
        }
    }

    if (file_exists($socket)) {
        $dsn = is_production()
            ? "mysql:unix_socket={$socket};dbname={$dbName};charset=utf8mb4"
            : "mysql:unix_socket={$socket};charset=utf8mb4";
    } else {
        $dsn = is_production()
            ? "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4"
            : "mysql:host={$host};port={$port};charset=utf8mb4";
    }

    $tmp = new PDO($dsn, $user, $pass, array(
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ));
    if (!is_production()) {
        $tmp->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $tmp->exec("USE `{$dbName}`");
    }

    $schema = file_get_contents(AGENDATE_ROOT . '/database/schema.sql');
    $schema = preg_replace('/^(CREATE DATABASE|USE)\b[^\n]*\n/im', '', $schema);
    foreach (array_filter(array_map('trim', explode(';', $schema))) as $stmt) {
        $tmp->exec($stmt);
    }

    ensure_runtime_schema($tmp);
    $pdo = $tmp;
    return $pdo;
}

function ensure_runtime_schema(PDO $pdo) {
    // Guest booking support: make client_id nullable and add guest fields
    try { $pdo->exec("ALTER TABLE appointments MODIFY client_id INT UNSIGNED NULL"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE appointments ADD COLUMN guest_name VARCHAR(255) NULL AFTER client_id"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE appointments ADD COLUMN guest_email VARCHAR(191) NULL AFTER guest_name"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE appointments ADD COLUMN guest_phone VARCHAR(40) NULL AFTER guest_email"); } catch (Exception $e) {}

    // Account verification & approval flow
    // DEFAULT 'approved' so existing users keep access; new registrations set 'unconfirmed' explicitly
    try { $pdo->exec("ALTER TABLE users ADD COLUMN status ENUM('unconfirmed','pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER role"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE users ADD COLUMN email_token VARCHAR(64) NULL AFTER status"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE users ADD COLUMN email_token_expires_at DATETIME NULL AFTER email_token"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE users ADD COLUMN public_slug VARCHAR(60) NULL AFTER avatar_url"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE users ADD COLUMN booking_title VARCHAR(255) NULL AFTER public_slug"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE users ADD COLUMN booking_description TEXT NULL AFTER booking_title"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE users ADD COLUMN booking_theme_color VARCHAR(20) NOT NULL DEFAULT '#60a5fa' AFTER booking_description"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE users ADD COLUMN booking_background VARCHAR(40) NOT NULL DEFAULT 'aurora' AFTER booking_theme_color"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE users ADD COLUMN booking_cover_url VARCHAR(500) NULL AFTER booking_background"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE users ADD COLUMN public_slug_changes TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER public_slug"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE services ADD COLUMN image_url VARCHAR(500) NULL AFTER color"); } catch (Exception $e) {}
    try { $pdo->exec("CREATE INDEX idx_users_status_role ON users (status, role)"); } catch (Exception $e) {}
    try { $pdo->exec("CREATE INDEX idx_users_email_token ON users (email_token)"); } catch (Exception $e) {}
    try { $pdo->exec("CREATE UNIQUE INDEX uq_users_public_slug ON users (public_slug)"); } catch (Exception $e) {}
    try { $pdo->exec("CREATE INDEX idx_appointments_provider_range ON appointments (provider_id, starts_at, ends_at, status)"); } catch (Exception $e) {}
}

function serialize_user(array $u) {
    return array(
        'id'         => (int)$u['id'],
        'email'      => $u['email'],
        'name'       => $u['name'],
        'role'       => $u['role'],
        'status'     => isset($u['status']) ? $u['status'] : 'approved',
        'phone'      => isset($u['phone']) ? $u['phone'] : null,
        'avatar_url' => isset($u['avatar_url']) ? $u['avatar_url'] : null,
        'public_slug' => isset($u['public_slug']) ? $u['public_slug'] : null,
        'created_at' => $u['created_at'],
    );
}

function serialize_service(array $s, $providerName = '') {
    return array(
        'id'               => (int)$s['id'],
        'provider_id'      => (int)$s['provider_id'],
        'provider_name'    => $providerName,
        'name'             => $s['name'],
        'description'      => $s['description'],
        'duration_minutes' => (int)$s['duration_minutes'],
        'price'            => $s['price'] !== null ? (float)$s['price'] : null,
        'color'            => $s['color'],
        'image_url'        => isset($s['image_url']) ? $s['image_url'] : null,
        'is_active'        => (bool)$s['is_active'],
    );
}

function serialize_provider_branding(array $u) {
    return array(
        'id'                  => (int)$u['id'],
        'name'                => $u['name'],
        'avatar_url'          => isset($u['avatar_url']) ? $u['avatar_url'] : null,
        'public_slug'         => isset($u['public_slug']) ? $u['public_slug'] : null,
        'public_slug_changes' => isset($u['public_slug_changes']) ? (int)$u['public_slug_changes'] : 0,
        'free_slug_changes_remaining' => isset($u['public_slug_changes']) ? max(0, 2 - (int)$u['public_slug_changes']) : 2,
        'booking_title'       => isset($u['booking_title']) && $u['booking_title'] ? $u['booking_title'] : $u['name'],
        'booking_description' => isset($u['booking_description']) ? $u['booking_description'] : null,
        'booking_theme_color' => isset($u['booking_theme_color']) ? $u['booking_theme_color'] : '#60a5fa',
        'booking_background'  => isset($u['booking_background']) ? $u['booking_background'] : 'aurora',
        'booking_cover_url'   => isset($u['booking_cover_url']) ? $u['booking_cover_url'] : null,
    );
}

function serialize_appointment(array $a) {
    $clientId = (isset($a['client_id']) && $a['client_id'] !== null) ? (int)$a['client_id'] : null;
    // For guest bookings the JOIN columns are NULL; fall back to guest_ columns
    $clientName  = $a['client_name']  ? $a['client_name']  : (isset($a['guest_name'])  ? $a['guest_name']  : null);
    $clientEmail = $a['client_email'] ? $a['client_email'] : (isset($a['guest_email']) ? $a['guest_email'] : null);
    $clientPhone = $a['client_phone'] ? $a['client_phone'] : (isset($a['guest_phone']) ? $a['guest_phone'] : null);

    return array(
        'id'                  => (int)$a['id'],
        'service_id'          => (int)$a['service_id'],
        'service_name'        => $a['service_name'],
        'provider_id'         => (int)$a['provider_id'],
        'provider_name'       => $a['provider_name'],
        'client_id'           => $clientId,
        'client_name'         => $clientName,
        'client_email'        => $clientEmail,
        'client_phone'        => $clientPhone,
        'is_guest'            => $clientId === null,
        'starts_at'           => $a['starts_at'],
        'ends_at'             => $a['ends_at'],
        'status'              => $a['status'],
        'notes'               => isset($a['notes']) ? $a['notes'] : null,
        'cancellation_reason' => isset($a['cancellation_reason']) ? $a['cancellation_reason'] : null,
        'created_at'          => $a['created_at'],
    );
}
