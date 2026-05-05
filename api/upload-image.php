<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(array('ok' => false, 'message' => 'Método no permitido.'), 405);
}

$user = require_role('proveedor');
$pdo  = get_pdo();

rate_limit('upload-image:' . $user['id'], 40, 3600);

$kind = clean_string(isset($_POST['kind']) ? $_POST['kind'] : 'service', 20);
if (!in_array($kind, array('service', 'cover'), true)) {
    json_response(array('ok' => false, 'message' => 'Tipo de imagen inválido.'), 400);
}

if (empty($_FILES['image']) || !is_uploaded_file($_FILES['image']['tmp_name'])) {
    json_response(array('ok' => false, 'message' => 'Imagen requerida.'), 400);
}

$file = $_FILES['image'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    json_response(array('ok' => false, 'message' => 'No se pudo subir la imagen.'), 400);
}
if ($file['size'] > 3 * 1024 * 1024) {
    json_response(array('ok' => false, 'message' => 'La imagen no puede superar 3 MB.'), 413);
}

$info = @getimagesize($file['tmp_name']);
if (!$info || empty($info['mime'])) {
    json_response(array('ok' => false, 'message' => 'Archivo de imagen inválido.'), 400);
}

$extByMime = array(
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
    'image/gif'  => 'gif',
);
if (!isset($extByMime[$info['mime']])) {
    json_response(array('ok' => false, 'message' => 'Formato no permitido. Usa JPG, PNG, WEBP o GIF.'), 400);
}

$uploadRoot = AGENDATE_ROOT . '/uploads';
if (!is_dir($uploadRoot) && !@mkdir($uploadRoot, 0775, true)) {
    json_response(array('ok' => false, 'message' => 'No se pudo preparar la carpeta de imágenes.'), 500);
}
@chmod($uploadRoot, 0775);

$baseDir = $uploadRoot . '/' . $user['id'];
if (!is_dir($baseDir) && !@mkdir($baseDir, 0775, true)) {
    json_response(array(
        'ok' => false,
        'message' => 'No se pudo crear la carpeta del proveedor. Revisa permisos de uploads.',
    ), 500);
}
@chmod($baseDir, 0775);

if (!is_dir($baseDir) || !is_writable($baseDir)) {
    json_response(array(
        'ok' => false,
        'message' => 'La carpeta de imágenes no tiene permisos de escritura para Apache.',
    ), 500);
}

$denyPhp = "Options -Indexes\nRequire all denied\n<FilesMatch \"\\.(jpe?g|png|webp|gif)$\">\n  Require all granted\n</FilesMatch>\n<FilesMatch \"\\.(php|phtml|phar|cgi|pl|shtml|html?|svg|xml|js|css)$\">\n  Require all denied\n  Deny from all\n</FilesMatch>\n";
if (!file_exists($uploadRoot . '/.htaccess')) {
    @file_put_contents($uploadRoot . '/.htaccess', $denyPhp, LOCK_EX);
}

$filename = $kind . '-' . date('YmdHis') . '-' . random_hex(6) . '.' . $extByMime[$info['mime']];
$dest = $baseDir . '/' . $filename;
if (!@move_uploaded_file($file['tmp_name'], $dest)) {
    json_response(array('ok' => false, 'message' => 'No se pudo guardar la imagen.'), 500);
}
@chmod($dest, 0644);

$url = '/uploads/' . $user['id'] . '/' . $filename;

if ($kind === 'cover') {
    $stmt = $pdo->prepare('UPDATE users SET booking_cover_url = ? WHERE id = ?');
    $stmt->execute(array($url, $user['id']));
}

json_response(array('ok' => true, 'url' => $url));
