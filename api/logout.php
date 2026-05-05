<?php
require_once __DIR__ . '/bootstrap.php';

register_api_error_handlers();
security_headers();

$origin = request_origin();
$allowed = allowed_origins();
$corsOrigin = in_array($origin, $allowed, true) ? $origin : APP_URL;
header('Vary: Origin');
header('Access-Control-Allow-Origin: ' . $corsOrigin);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
header('Access-Control-Expose-Headers: X-CSRF-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(405);
    echo json_encode(array('ok' => false, 'message' => 'Método no permitido.'), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$secure = strpos(APP_URL, 'https') === 0;
ini_set('session.use_only_cookies', '1');
ini_set('session.use_strict_mode', '1');
ini_set('session.cookie_httponly', '1');
if ($secure) ini_set('session.cookie_secure', '1');
session_name('AGENDATESESSID');
session_set_cookie_params(0, '/; SameSite=Lax', '', $secure, true);
session_start();
destroy_current_session();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
echo json_encode(array('ok' => true), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
