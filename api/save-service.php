<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(array('ok' => false, 'message' => 'Método no permitido.'), 405);
$user = require_role('proveedor');
$pdo  = get_pdo();

$body     = get_json_body();
$id       = (int)(isset($body['id']) ? $body['id'] : 0);
$name     = clean_string(isset($body['name']) ? $body['name'] : '', 255);
$descRaw  = clean_string(isset($body['description']) ? $body['description'] : '', 2000);
$desc     = $descRaw !== '' ? $descRaw : null;
$duration = (int)(isset($body['duration_minutes']) ? $body['duration_minutes'] : 0);
$price    = isset($body['price']) && $body['price'] !== '' ? (float)$body['price'] : null;
$color    = clean_string(isset($body['color']) ? $body['color'] : '#3b82f6', 20);
$imageUrl = clean_public_image_url(isset($body['image_url']) ? $body['image_url'] : '');
$active   = isset($body['is_active']) ? (int)(bool)$body['is_active'] : 1;

if (!$name) json_response(array('ok' => false, 'message' => 'El nombre es requerido.'), 400);
if ($duration < 5 || $duration > 720) json_response(array('ok' => false, 'message' => 'Duración inválida.'), 400);
if ($price !== null && ($price < 0 || $price > 999999999)) json_response(array('ok' => false, 'message' => 'Precio inválido.'), 400);
if (!preg_match('/^#[0-9a-fA-F]{6}$/', $color)) $color = '#3b82f6';

if ($id) {
    $own = $pdo->prepare('SELECT id FROM services WHERE id = ? AND provider_id = ?');
    $own->execute(array($id, $user['id']));
    if (!$own->fetch()) json_response(array('ok' => false, 'message' => 'Servicio no encontrado.'), 404);

    $pdo->prepare('UPDATE services SET name=?, description=?, duration_minutes=?, price=?, color=?, image_url=?, is_active=? WHERE id=?')
        ->execute(array($name, $desc, $duration, $price, $color, $imageUrl, $active, $id));
} else {
    $pdo->prepare('INSERT INTO services (provider_id,name,description,duration_minutes,price,color,image_url,is_active) VALUES (?,?,?,?,?,?,?,?)')
        ->execute(array($user['id'], $name, $desc, $duration, $price, $color, $imageUrl, $active));
    $id = (int)$pdo->lastInsertId();
}

$row = $pdo->prepare('SELECT * FROM services WHERE id = ?');
$row->execute(array($id));
$s = $row->fetch();

json_response(array('ok' => true, 'message' => 'Servicio guardado.', 'service' => serialize_service($s, $user['name'])));
