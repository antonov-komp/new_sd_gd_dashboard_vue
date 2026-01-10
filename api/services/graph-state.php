<?php
/**
 * API endpoint для сервиса Graph State
 *
 * TASK-082: Создан для доступа к backend кешированию из frontend
 *
 * Предоставляет доступ к GraphStateService через HTTP API
 *
 * Расположение: api/services/graph-state.php
 */

require_once __DIR__ . '/../services/GraphStateService.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Обработка OPTIONS запроса (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Проверка метода запроса
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit;
}

try {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);

    // Валидация JSON
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Invalid JSON',
            'json_error' => json_last_error_msg()
        ]);
        exit;
    }

    if (!$input || !isset($input['action'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required parameter: action']);
        exit;
    }

    $action = $input['action'];
    $params = $input['params'] ?? [];

    switch ($action) {
        case 'getSnapshotDataCached':
            // Получение данных слепков с кешированием
            $data = \GraphStateService::getSnapshotDataCached($params);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $data,
                'timestamp' => time()
            ]);
            break;

        case 'createNewSnapshot':
            // Создание нового слепка
            $type = $params['type'] ?? 'current';
            $ttl = $params['ttl'] ?? 3600;
            $data = \GraphStateService::createNewSnapshot($type, $ttl);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $data,
                'type' => $type,
                'timestamp' => time()
            ]);
            break;

        case 'clearGraphStateCache':
            // Очистка кеша графика состояния
            $result = \GraphStateService::clearGraphStateCache();

            http_response_code(200);
            echo json_encode([
                'success' => $result,
                'message' => $result ? 'Cache cleared successfully' : 'Failed to clear cache',
                'timestamp' => time()
            ]);
            break;

        case 'getCacheStats':
            // Получение статистики кеша
            $stats = \GraphStateService::getCacheStats();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'stats' => $stats,
                'timestamp' => time()
            ]);
            break;

        case 'getAvailableSnapshotTypes':
            // Получение доступных типов слепков
            $types = \GraphStateService::getAvailableSnapshotTypes();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'types' => $types,
                'timestamp' => time()
            ]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error' => 'Unknown action: ' . $action]);
            break;
    }

} catch (\Exception $e) {
    error_log("[GraphState API] Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}