<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
boot_api();

$user = require_session_user();
$pdo  = get_pdo();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare(
        'SELECT tutorial_key, status, completed_at, skipped_at, updated_at
         FROM user_tutorial_progress
         WHERE user_id = ?
         ORDER BY updated_at DESC'
    );
    $stmt->execute(array($user['id']));
    json_response(array('ok' => true, 'progress' => $stmt->fetchAll()));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(array('ok' => false, 'message' => 'Método no permitido.'), 405);
}

$body = get_json_body();
$tutorialKey = clean_string(isset($body['tutorial_key']) ? $body['tutorial_key'] : '', 80);
$status = clean_string(isset($body['status']) ? $body['status'] : '', 20);

if (!preg_match('/^[a-z0-9_.:-]{3,80}$/', $tutorialKey)) {
    json_response(array('ok' => false, 'message' => 'Tutorial inválido.'), 400);
}
if (!in_array($status, array('completed', 'skipped'), true)) {
    json_response(array('ok' => false, 'message' => 'Estado inválido.'), 400);
}

$completedAt = $status === 'completed' ? date('Y-m-d H:i:s') : null;
$skippedAt = $status === 'skipped' ? date('Y-m-d H:i:s') : null;

$stmt = $pdo->prepare(
    'INSERT INTO user_tutorial_progress (user_id, tutorial_key, status, completed_at, skipped_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        completed_at = VALUES(completed_at),
        skipped_at = VALUES(skipped_at),
        updated_at = CURRENT_TIMESTAMP'
);
$stmt->execute(array($user['id'], $tutorialKey, $status, $completedAt, $skippedAt));

json_response(array(
    'ok' => true,
    'progress' => array(
        'tutorial_key' => $tutorialKey,
        'status' => $status,
        'completed_at' => $completedAt,
        'skipped_at' => $skippedAt,
    ),
));
