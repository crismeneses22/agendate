<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Access-Control-Allow-Origin: http://187.127.1.112:8081');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array('ok' => false, 'message' => 'Método no permitido.'));
    exit;
}

session_name('AGENDATESESSID');
@session_start();

$_SESSION = array();

if (ini_get('session.use_cookies')) {
    setcookie('AGENDATESESSID', '', time() - 42000, '/', '', false, true);
}

@session_destroy();

http_response_code(200);
echo json_encode(array('ok' => true));
