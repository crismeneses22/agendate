<?php
require_once __DIR__ . '/bootstrap.php';
boot_api();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(array('ok' => false, 'message' => 'Método no permitido.'), 405);
destroy_current_session();
json_response(array('ok' => true));
