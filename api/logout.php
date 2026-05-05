<?php

function logout_env($key, $default = '') {
    static $loaded = false;
    if (!$loaded) {
        $envFile = dirname(__DIR__) . '/.env';
        if (file_exists($envFile)) {
            foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                $trimmed = trim($line);
                if ($trimmed === '' || strpos($trimmed, '#') === 0 || strpos($trimmed, '=') === false) continue;
                list($k, $v) = explode('=', $trimmed, 2);
                $_ENV[trim($k)] = trim($v);
            }
        }
        $loaded = true;
    }
    return isset($_ENV[$key]) ? trim($_ENV[$key]) : $default;
}

function logout_json($payload, $status = 200) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$appUrl = rtrim(logout_env('AGENDATE_APP_URL', 'http://localhost/agendate'), '/');
$origin = isset($_SERVER['HTTP_ORIGIN']) ? rtrim($_SERVER['HTTP_ORIGIN'], '/') : '';
$allowed = array($appUrl);
if (logout_env('AGENDATE_ALLOWED_ORIGINS') !== '') {
    foreach (explode(',', logout_env('AGENDATE_ALLOWED_ORIGINS')) as $item) {
        $item = rtrim(trim($item), '/');
        if ($item !== '') $allowed[] = $item;
    }
}
$corsOrigin = ($origin !== '' && in_array($origin, $allowed, true)) ? $origin : $appUrl;

header('Vary: Origin');
header('Access-Control-Allow-Origin: ' . $corsOrigin);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
header('Access-Control-Expose-Headers: X-CSRF-Token');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    logout_json(array('ok' => false, 'message' => 'Método no permitido.'), 405);
}

$secure = strpos($appUrl, 'https://') === 0;
ini_set('session.use_only_cookies', '1');
ini_set('session.use_strict_mode', '1');
ini_set('session.cookie_httponly', '1');
if ($secure) ini_set('session.cookie_secure', '1');

session_name('AGENDATESESSID');
session_set_cookie_params(0, '/; SameSite=Lax', '', $secure, true);
@session_start();
$_SESSION = array();

if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
}

@session_destroy();
logout_json(array('ok' => true));
