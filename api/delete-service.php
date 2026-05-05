<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(array('ok' => false, 'message' => 'Método no permitido.'), 405);
$user = require_role('proveedor');
$pdo  = get_pdo();

$body    = get_json_body();
$id      = (int)(isset($body['id']) ? $body['id'] : 0);
if (!$id) json_response(array('ok' => false, 'message' => 'id requerido.'), 400);

$own = $pdo->prepare('SELECT id FROM services WHERE id = ? AND provider_id = ?');
$own->execute(array($id, $user['id']));
if (!$own->fetch()) json_response(array('ok' => false, 'message' => 'Servicio no encontrado.'), 404);

$pdo->prepare('DELETE FROM services WHERE id = ?')->execute(array($id));
json_response(array('ok' => true, 'message' => 'Servicio eliminado.'));
