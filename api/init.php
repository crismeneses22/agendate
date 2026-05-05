<?php
// Bootstrap admin user — call once from localhost or VPS only
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';

$remote = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
if (!in_array($remote, array('127.0.0.1', '::1'))) {
    http_response_code(403);
    exit('Forbidden');
}

if (is_production()) {
    $expectedToken = isset($_ENV['AGENDATE_INIT_TOKEN']) ? trim($_ENV['AGENDATE_INIT_TOKEN']) : '';
    $providedToken = isset($_SERVER['HTTP_X_INIT_TOKEN']) ? trim($_SERVER['HTTP_X_INIT_TOKEN']) : '';
    if ($expectedToken === '' || !hash_equals($expectedToken, $providedToken)) {
        http_response_code(403);
        exit('Forbidden');
    }
}

boot_api();
if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_response(array('ok' => false, 'message' => 'Método no permitido.'), 405);
if (is_production() && !env_bool('AGENDATE_ALLOW_INIT', false)) {
    json_response(array('ok' => false, 'message' => 'Init deshabilitado en producción.'), 403);
}
$pdo = get_pdo();

$email = isset($_ENV['AGENDATE_ADMIN_EMAIL'])    ? $_ENV['AGENDATE_ADMIN_EMAIL']    : 'admin@agendate.app';
$pass  = isset($_ENV['AGENDATE_ADMIN_PASSWORD']) ? $_ENV['AGENDATE_ADMIN_PASSWORD'] : 'Admin2025*';
if (is_production() && $pass === 'Admin2025*') {
    json_response(array('ok' => false, 'message' => 'Cambia AGENDATE_ADMIN_PASSWORD antes de crear el admin.'), 500);
}

$check = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$check->execute(array($email));
if ($check->fetch()) {
    json_response(array('ok' => true, 'message' => 'Admin ya existe.'));
}

$hash = password_hash($pass, PASSWORD_DEFAULT);
$pdo->prepare('INSERT INTO users (email,password_hash,name,role) VALUES (?,?,?,?)')
    ->execute(array($email, $hash, 'Administrador', 'admin'));

json_response(array('ok' => true, 'message' => 'Admin creado.', 'email' => $email));
