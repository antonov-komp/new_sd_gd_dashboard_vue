<?php
/**
 * API endpoint для получения статуса создания кеша
 * 
 * TASK-076: Ручное создание кешей с уведомлениями
 * 
 * Метод: GET
 * Путь: /api/admin/cache-create-status.php?task_id={task_id}
 * 
 * Формат ответа:
 * {
 *   "success": true,
 *   "status": "in_progress", // in_progress, completed, failed
 *   "progress": 50, // процент выполнения (0-100)
 *   "message": "Загрузка данных из Bitrix24...",
 *   "cache_key": "months_abc123...",
 *   "module_id": "graph-admission-closure-months"
 * }
 * 
 * Документация Bitrix24 REST API:
 * - https://context7.com/bitrix24/rest/
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Обработка OPTIONS запроса (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Проверка метода запроса
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use GET.']);
    exit;
}

// Проверка прав администратора
$isAdmin = true; // TODO: Реализовать проверку через Bitrix24 API
if (!$isAdmin) {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied. Admin rights required.']);
    exit;
}

// Получение task_id из параметров
$taskId = $_GET['task_id'] ?? null;

if (!$taskId) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required parameter: task_id']);
    exit;
}

// Директория для хранения статусов задач
$statusDir = __DIR__ . '/../cache/task-status';
if (!is_dir($statusDir)) {
    @mkdir($statusDir, 0755, true);
}

// Путь к файлу статуса
$statusFile = $statusDir . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $taskId) . '.json';

try {
    // Проверка существования файла статуса
    if (!file_exists($statusFile)) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Task not found',
            'task_id' => $taskId
        ]);
        exit;
    }
    
    // Чтение статуса из файла
    $content = @file_get_contents($statusFile);
    if ($content === false) {
        throw new \Exception('Failed to read status file');
    }
    
    $status = @json_decode($content, true);
    if ($status === null || !is_array($status)) {
        throw new \Exception('Invalid status file format');
    }
    
    // Проверка истечения срока действия статуса (24 часа)
    if (isset($status['created_at'])) {
        $createdAt = (int)$status['created_at'];
        $expiresAt = $createdAt + (24 * 60 * 60); // 24 часа
        
        if (time() > $expiresAt) {
            // Статус истёк, удаляем файл
            @unlink($statusFile);
            
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Task status expired',
                'task_id' => $taskId
            ]);
            exit;
        }
    }
    
    // Возврат статуса
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'status' => $status['status'] ?? 'unknown',
        'progress' => (int)($status['progress'] ?? 0),
        'message' => $status['message'] ?? '',
        'cache_key' => $status['cache_key'] ?? null,
        'module_id' => $status['module_id'] ?? null,
        'error' => $status['error'] ?? null,
        'created_at' => $status['created_at'] ?? null,
        'updated_at' => $status['updated_at'] ?? time()
    ]);
    
} catch (\Exception $e) {
    http_response_code(500);
    error_log("[CacheCreateStatus] Error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}

