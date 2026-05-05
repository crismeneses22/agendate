<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

$user = require_role('proveedor');
$pdo  = get_pdo();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute(array($user['id']));
    $row = $stmt->fetch();
    if (!$row) json_response(array('ok' => false, 'message' => 'Proveedor no encontrado.'), 404);
    json_response(array('ok' => true, 'branding' => serialize_provider_branding($row)));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(array('ok' => false, 'message' => 'Método no permitido.'), 405);
}

$body = get_json_body();

$title = clean_string(isset($body['booking_title']) ? $body['booking_title'] : '', 255);
$descriptionRaw = clean_string(isset($body['booking_description']) ? $body['booking_description'] : '', 1200);
$description = $descriptionRaw !== '' ? $descriptionRaw : null;
$theme = clean_string(isset($body['booking_theme_color']) ? $body['booking_theme_color'] : '#60a5fa', 20);
$background = clean_string(isset($body['booking_background']) ? $body['booking_background'] : 'aurora', 40);
$coverUrl = clean_public_image_url(isset($body['booking_cover_url']) ? $body['booking_cover_url'] : '');
$slug = clean_slug(isset($body['public_slug']) ? $body['public_slug'] : '');

$backgrounds = array('aurora', 'graphite', 'sunrise', 'emerald', 'violet');
if (!$title) $title = $user['name'];
if (!preg_match('/^#[0-9a-fA-F]{6}$/', $theme)) $theme = '#60a5fa';
if (!in_array($background, $backgrounds, true)) $background = 'aurora';
if ($slug && (strlen($slug) < 3 || strlen($slug) > 40)) {
    json_response(array('ok' => false, 'message' => 'La URL debe tener entre 3 y 40 caracteres.'), 400);
}

$currentStmt = $pdo->prepare('SELECT public_slug, public_slug_changes FROM users WHERE id = ?');
$currentStmt->execute(array($user['id']));
$current = $currentStmt->fetch();
$currentSlug = $current && isset($current['public_slug']) ? $current['public_slug'] : null;
$currentChanges = $current && isset($current['public_slug_changes']) ? (int)$current['public_slug_changes'] : 0;
$currentSlugNorm = $currentSlug ? $currentSlug : '';
$slugNorm = $slug ? $slug : '';

if ($currentSlugNorm === '' && $currentChanges > 0) {
    $pdo->prepare('UPDATE users SET public_slug_changes = 0 WHERE id = ?')->execute(array($user['id']));
    $currentChanges = 0;
}

$slugChanged = $slugNorm !== $currentSlugNorm;
$countSlugChange = $slugChanged && $slugNorm !== '';

if ($countSlugChange && $currentChanges >= 2) {
    json_response(array(
        'ok' => false,
        'message' => 'Ya usaste tus 2 cambios gratuitos de URL. El siguiente cambio debe cobrarse desde administración.',
        'code' => 'slug_change_paid_required',
    ), 402);
}

if ($slug) {
    $reserved = array('api', 'admin', 'cliente', 'proveedor', 'login', 'registro', 'verificar', 'b', 'assets', 'uploads');
    if (in_array($slug, $reserved, true)) {
        json_response(array('ok' => false, 'message' => 'Esta URL no está disponible.'), 409);
    }

    $check = $pdo->prepare('SELECT id FROM users WHERE public_slug = ? AND id != ?');
    $check->execute(array($slug, $user['id']));
    if ($check->fetch()) {
        json_response(array('ok' => false, 'message' => 'Esta URL ya está en uso.'), 409);
    }
} else {
    $slug = null;
}

$stmt = $pdo->prepare(
    'UPDATE users
     SET public_slug = ?, public_slug_changes = public_slug_changes + ?, booking_title = ?, booking_description = ?, booking_theme_color = ?, booking_background = ?, booking_cover_url = ?
     WHERE id = ?'
);
$stmt->execute(array($slug, $countSlugChange ? 1 : 0, $title, $description, $theme, $background, $coverUrl, $user['id']));

$row = $pdo->prepare('SELECT * FROM users WHERE id = ?');
$row->execute(array($user['id']));

json_response(array('ok' => true, 'branding' => serialize_provider_branding($row->fetch())));
