<?php
/**
 * API endpoint для работы с Bitrix24 REST API из Vue.js
 * 
 * Принимает запросы от Vue.js приложения и перенаправляет их в Bitrix24 через CRest
 */

require_once(__DIR__ . '/../crest.php');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

// Обработка preflight запросов
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Проверка метода запроса
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Получение данных запроса
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['method'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request. Method is required.']);
    exit;
}

$method = $data['method'];
$params = $data['params'] ?? [];

try {
    // Вызов метода Bitrix24 REST API через CRest
    $result = CRest::call($method, $params);
    
    // Проверка на ошибку
    if (isset($result['error'])) {
        http_response_code(200); // Bitrix24 возвращает ошибки с кодом 200
        echo json_encode($result);
        exit;
    }
    
    // Успешный ответ
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'error_description' => $e->getMessage()
    ]);
}

