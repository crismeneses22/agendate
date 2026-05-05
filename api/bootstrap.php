<?php

define('AGENDATE_ROOT', dirname(__DIR__));

// Load .env
$envFile = AGENDATE_ROOT . '/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (strpos(trim($line), '#') === 0 || strpos($line, '=') === false) continue;
        list($k, $v) = explode('=', $line, 2);
        $_ENV[trim($k)] = trim($v);
        putenv(trim($k) . '=' . trim($v));
    }
}

define('APP_URL', rtrim(isset($_ENV['AGENDATE_APP_URL']) ? $_ENV['AGENDATE_APP_URL'] : 'http://localhost/agendate', '/'));
define('STORAGE_ROOT', AGENDATE_ROOT . '/storage');

if (function_exists('is_production') && is_production()) {
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    ini_set('log_errors', '1');
}

function env_bool($key, $default = false) {
    if (!isset($_ENV[$key])) return $default;
    $value = strtolower(trim($_ENV[$key]));
    return in_array($value, array('1', 'true', 'yes', 'on'), true);
}

function env_int($key, $default = 0) {
    if (!isset($_ENV[$key])) return $default;
    $value = (int)trim($_ENV[$key]);
    return $value > 0 ? $value : $default;
}

function is_production() {
    $env = strtolower(isset($_ENV['AGENDATE_ENV']) ? $_ENV['AGENDATE_ENV'] : 'local');
    return in_array($env, array('production', 'prod'), true);
}

function session_idle_timeout_seconds() {
    return env_int('AGENDATE_SESSION_IDLE_MINUTES', 30) * 60;
}

function destroy_current_session() {
    session_unset();
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
}

function is_logout_request() {
    $script = isset($_SERVER['SCRIPT_NAME']) ? basename($_SERVER['SCRIPT_NAME']) : '';
    $uriPath = isset($_SERVER['REQUEST_URI']) ? parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) : '';
    return $script === 'logout.php' || basename((string)$uriPath) === 'logout.php';
}

function register_api_error_handlers() {
    static $registered = false;
    if ($registered) return;
    $registered = true;

    set_exception_handler(function ($e) {
        error_log($e->getMessage());
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        }
        $message = is_production()
            ? 'Error interno del servidor.'
            : $e->getMessage();
        echo json_encode(array('ok' => false, 'message' => $message), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    });
}

function random_hex($bytes) {
    if (function_exists('random_bytes')) return bin2hex(random_bytes($bytes));
    return bin2hex(openssl_random_pseudo_bytes($bytes));
}

function ensure_storage_paths() {
    foreach (array(STORAGE_ROOT, STORAGE_ROOT . '/rate-limit') as $dir) {
        if (!is_dir($dir)) @mkdir($dir, 0755, true);
    }

    $deny = "Require all denied\nDeny from all\n";
    if (!file_exists(STORAGE_ROOT . '/.htaccess')) {
        @file_put_contents(STORAGE_ROOT . '/.htaccess', $deny, LOCK_EX);
    }
}

function json_response($payload, $status = 200) {
    $token = isset($_SESSION['csrf_token']) ? $_SESSION['csrf_token'] : '';
    header('Content-Type: application/json; charset=utf-8');
    header('X-CSRF-Token: ' . $token);
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    exit;
}

function security_headers() {
    $connectSrc = "'self'";
    if (!empty($_ENV['AGENDATE_ALLOWED_CONNECT_SRC'])) {
        $extra = trim($_ENV['AGENDATE_ALLOWED_CONNECT_SRC']);
        if ($extra !== '') $connectSrc .= ' ' . $extra;
    }

    header('X-Frame-Options: DENY');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()');
    header("Content-Security-Policy: default-src 'none'; connect-src {$connectSrc}; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    if (strpos(APP_URL, 'https://') === 0) {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
    }
}

function request_origin() {
    if (!empty($_SERVER['HTTP_ORIGIN'])) return rtrim($_SERVER['HTTP_ORIGIN'], '/');
    return '';
}

function allowed_origins() {
    $origins = array(APP_URL);
    if (!is_production()) {
        foreach (array(8080, 8081, 8082, 8083, 8084, 8085) as $port) {
            $origins[] = 'http://localhost:' . $port;
            $origins[] = 'http://127.0.0.1:' . $port;
        }
    }
    if (!empty($_ENV['AGENDATE_ALLOWED_ORIGINS'])) {
        foreach (explode(',', $_ENV['AGENDATE_ALLOWED_ORIGINS']) as $origin) {
            $origin = rtrim(trim($origin), '/');
            if ($origin !== '') $origins[] = $origin;
        }
    }
    return array_values(array_unique($origins));
}

function enforce_origin_for_state_change() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') return;

    $origin = request_origin();
    $allowed = allowed_origins();
    if ($origin !== '' && !in_array($origin, $allowed, true)) {
        json_response(array('ok' => false, 'message' => 'Origen no permitido.'), 403);
    }

    if ($origin === '' && !empty($_SERVER['HTTP_REFERER'])) {
        $parts = parse_url($_SERVER['HTTP_REFERER']);
        $refererOrigin = '';
        if ($parts && !empty($parts['scheme']) && !empty($parts['host'])) {
            $refererOrigin = $parts['scheme'] . '://' . $parts['host'];
            if (!empty($parts['port'])) $refererOrigin .= ':' . $parts['port'];
        }
        if ($refererOrigin !== '' && !in_array($refererOrigin, $allowed, true)) {
            json_response(array('ok' => false, 'message' => 'Origen no permitido.'), 403);
        }
    }
}

function boot_api() {
    register_api_error_handlers();
    ensure_storage_paths();
    security_headers();

    $origin = request_origin();
    $allowed = allowed_origins();
    $corsOrigin = in_array($origin, $allowed, true) ? $origin : APP_URL;
    header('Vary: Origin');
    header('Access-Control-Allow-Origin: ' . $corsOrigin);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
    header('Access-Control-Expose-Headers: X-CSRF-Token');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        if ($origin !== '' && !in_array($origin, $allowed, true)) {
            http_response_code(403);
            exit;
        }
        http_response_code(204);
        exit;
    }

    $secure = strpos(APP_URL, 'https') === 0;
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.gc_maxlifetime', (string)session_idle_timeout_seconds());
    if ($secure) ini_set('session.cookie_secure', '1');
    session_name('AGENDATESESSID');
    session_set_cookie_params(0, '/; SameSite=Lax', '', $secure, true);
    session_start();

    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = random_hex(32);
    }

    enforce_origin_for_state_change();

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !is_logout_request()) {
        $clientToken = isset($_SERVER['HTTP_X_CSRF_TOKEN']) ? $_SERVER['HTTP_X_CSRF_TOKEN'] : '';
        if (!hash_equals($_SESSION['csrf_token'], $clientToken)) {
            json_response(array('ok' => false, 'message' => 'CSRF token inválido.'), 403);
        }
    }
}

function require_session_user() {
    if (empty($_SESSION['user_id'])) {
        json_response(array('ok' => false, 'message' => 'No autenticado.'), 401);
    }

    $timeoutSeconds = session_idle_timeout_seconds();
    $lastActivity = isset($_SESSION['last_activity_at']) ? (int)$_SESSION['last_activity_at'] : 0;
    if ($lastActivity > 0 && time() - $lastActivity > $timeoutSeconds) {
        destroy_current_session();
        json_response(array(
            'ok' => false,
            'message' => 'Tu sesión expiró por inactividad. Inicia sesión nuevamente.',
            'code' => 'session_idle_timeout',
        ), 401);
    }

    if (function_exists('get_pdo')) {
        try {
            $pdo = get_pdo();
            $stmt = $pdo->prepare('SELECT id, email, name, role, status FROM users WHERE id = ? LIMIT 1');
            $stmt->execute(array((int)$_SESSION['user_id']));
            $current = $stmt->fetch();
            if (!$current || (isset($current['status']) ? $current['status'] : 'approved') !== 'approved') {
                destroy_current_session();
                json_response(array('ok' => false, 'message' => 'Cuenta no aprobada.'), 403);
            }
            $_SESSION['user_role'] = $current['role'];
            $_SESSION['user_email'] = $current['email'];
            $_SESSION['user_name'] = $current['name'];
            $_SESSION['user_status'] = isset($current['status']) ? $current['status'] : 'approved';
        } catch (Exception $e) {
            json_response(array('ok' => false, 'message' => 'No se pudo validar la sesión.'), 500);
        }
    }
    $user = array(
        'id'    => (int)$_SESSION['user_id'],
        'role'  => $_SESSION['user_role'],
        'email' => $_SESSION['user_email'],
        'name'  => $_SESSION['user_name'],
        'status' => isset($_SESSION['user_status']) ? $_SESSION['user_status'] : 'approved',
    );

    if ($user['status'] !== 'approved') {
        destroy_current_session();
        json_response(array('ok' => false, 'message' => 'Cuenta no aprobada.'), 403);
    }

    $_SESSION['last_activity_at'] = time();

    return $user;
}

function require_role($role) {
    $user = require_session_user();
    if ($user['role'] !== $role) {
        json_response(array('ok' => false, 'message' => 'Acceso denegado.'), 403);
    }
    return $user;
}

function set_session_user(array $user) {
    session_regenerate_id(true);
    $_SESSION['user_id']    = $user['id'];
    $_SESSION['user_role']  = $user['role'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_name']  = $user['name'];
    $_SESSION['user_status'] = isset($user['status']) ? $user['status'] : 'approved';
    $_SESSION['csrf_token'] = random_hex(32);
    $_SESSION['login_at'] = time();
    $_SESSION['last_activity_at'] = time();
}

function get_json_body($maxBytes = 32768) {
    $length = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
    if ($length > $maxBytes) {
        json_response(array('ok' => false, 'message' => 'Solicitud demasiado grande.'), 413);
    }

    $contentType = isset($_SERVER['CONTENT_TYPE']) ? strtolower($_SERVER['CONTENT_TYPE']) : '';
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && strpos($contentType, 'application/json') === false) {
        json_response(array('ok' => false, 'message' => 'Content-Type inválido.'), 415);
    }

    $raw = file_get_contents('php://input');
    if (strlen($raw) > $maxBytes) {
        json_response(array('ok' => false, 'message' => 'Solicitud demasiado grande.'), 413);
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        json_response(array('ok' => false, 'message' => 'JSON inválido.'), 400);
    }
    return $decoded;
}

function clean_string($value, $maxLen = 255) {
    $value = trim((string)$value);
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value);
    if (function_exists('mb_substr')) return mb_substr($value, 0, $maxLen, 'UTF-8');
    return substr($value, 0, $maxLen);
}

function clean_slug($value) {
    $value = strtolower(clean_string($value, 60));
    $value = preg_replace('/[^a-z0-9]+/', '-', $value);
    $value = trim($value, '-');
    return substr($value, 0, 40);
}

function clean_public_image_url($value) {
    $value = clean_string($value, 500);
    if ($value === '') return null;
    if (preg_match('#^/uploads/[a-zA-Z0-9/_.,-]+\.(jpg|jpeg|png|webp|gif)$#', $value)) return $value;
    return null;
}

function parse_local_datetime($value) {
    $value = clean_string($value, 32);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/', $value)) {
        return false;
    }
    return strtotime(str_replace('T', ' ', $value));
}

function client_ip() {
    return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
}

function rate_limit($key, $limit, $windowSeconds) {
    ensure_storage_paths();
    $bucket = floor(time() / $windowSeconds);
    $safeKey = preg_replace('/[^a-zA-Z0-9_.:-]/', '_', $key);
    $file = STORAGE_ROOT . '/rate-limit/' . sha1($safeKey . '|' . $bucket) . '.json';
    $count = 0;
    if (file_exists($file)) {
        $data = json_decode((string)file_get_contents($file), true);
        if (is_array($data) && isset($data['count'])) $count = (int)$data['count'];
    }
    $count++;
    @file_put_contents($file, json_encode(array('count' => $count, 'bucket' => $bucket)), LOCK_EX);
    if ($count > $limit) {
        header('Retry-After: ' . $windowSeconds);
        json_response(array('ok' => false, 'message' => 'Demasiados intentos. Intenta nuevamente en unos minutos.'), 429);
    }
}
