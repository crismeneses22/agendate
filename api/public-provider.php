<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

$idOrSlug = clean_string(isset($_GET['id']) ? $_GET['id'] : '', 60);
if (!$idOrSlug) json_response(array('ok' => false, 'message' => 'id requerido.'), 400);

$pdo  = get_pdo();
if (preg_match('/^\d+$/', $idOrSlug)) {
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? AND role = ? AND status = ?');
    $stmt->execute(array((int)$idOrSlug, 'proveedor', 'approved'));
} else {
    $slug = clean_slug($idOrSlug);
    $stmt = $pdo->prepare('SELECT * FROM users WHERE public_slug = ? AND role = ? AND status = ?');
    $stmt->execute(array($slug, 'proveedor', 'approved'));
}
$row = $stmt->fetch();

if (!$row) json_response(array('ok' => false, 'message' => 'Proveedor no encontrado.'), 404);

json_response(array('ok' => true, 'provider' => serialize_provider_branding($row)));
