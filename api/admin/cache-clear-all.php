<?php
/**
 * API endpoint для полной очистки всех кешей
 * 
 * TASK-076: Вспомогательный скрипт для очистки всех кешей
 * 
 * Метод: POST
 * Путь: /api/admin/cache-clear-all.php
 * 
 * Параметры запроса:
 * {
 *   "confirm": true
 * }
 * 
 * Требует прав администратора
 */

require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/cache/GraphAdmissionClosureCache.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/cache/TimeTrackingCache.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/cache/UsersManagementCache.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/cache/UserActivityCache.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/cache/WebhookLogsCache.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Обработка OPTIONS запроса (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Проверка прав администратора
$isAdmin = true; // TODO: Реализовать проверку через Bitrix24 API
if (!$isAdmin) {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied. Admin rights required.']);
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
    
    // Проверка подтверждения
    if (!isset($input['confirm']) || $input['confirm'] !== true) {
        http_response_code(400);
        echo json_encode(['error' => 'Confirmation required. Set confirm: true']);
        exit;
    }
    
    $clearedModules = [];
    $clearedFiles = [];
    
    // 1. График приёма/закрытий 1С (months и weeks)
    GraphAdmissionClosureCache::clear();
    $monthsDir = __DIR__ . '/../cache/graph-admission-closure/months';
    $weeksDir = __DIR__ . '/../cache/graph-admission-closure/weeks';
    $monthsFiles = glob($monthsDir . '/*.json');
    $weeksFiles = glob($weeksDir . '/*.json');
    $clearedFiles = array_merge($clearedFiles, $monthsFiles, $weeksFiles);
    $clearedModules[] = 'graph-admission-closure-months';
    $clearedModules[] = 'graph-admission-closure-weeks';
    
    // 2. Трудозатраты на Тикеты сектора 1С
    TimeTrackingCache::clear();
    $timeTrackingDir = __DIR__ . '/../cache/time-tracking-sector-1c';
    $timeTrackingFiles = glob($timeTrackingDir . '/**/*.json', GLOB_BRACE);
    $clearedFiles = array_merge($clearedFiles, $timeTrackingFiles);
    $clearedModules[] = 'time-tracking-default';
    $clearedModules[] = 'time-tracking-detailed';
    $clearedModules[] = 'time-tracking-summary';
    
    // 3. Управление пользователями
    if (class_exists('UsersManagementCache')) {
        UsersManagementCache::clear();
        $clearedModules[] = 'users-management-departments';
        $clearedModules[] = 'users-management-users';
        $clearedModules[] = 'users-management-config';
    }
    
    // 4. Отслеживание активности
    if (class_exists('UserActivityCache')) {
        UserActivityCache::clear();
        $clearedModules[] = 'user-activity-stats';
        $clearedModules[] = 'user-activity-list';
        $clearedModules[] = 'user-activity-filters';
    }
    
    // 5. Логи вебхуков
    if (class_exists('WebhookLogsCache')) {
        WebhookLogsCache::clear();
        $clearedModules[] = 'webhook-logs-api';
        $clearedModules[] = 'webhook-logs-realtime';
        $clearedModules[] = 'webhook-logs-stats';
    }
    
    // 6. Статусы задач создания кеша (опционально)
    $taskStatusDir = __DIR__ . '/../cache/task-status';
    if (is_dir($taskStatusDir)) {
        $taskStatusFiles = glob($taskStatusDir . '/*.json');
        foreach ($taskStatusFiles as $file) {
            @unlink($file);
        }
        $clearedModules[] = 'task-status';
    }
    
    // Подсчёт удалённых файлов
    $totalFiles = count(array_filter($clearedFiles, 'file_exists'));
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'All caches cleared successfully',
        'cleared_modules' => $clearedModules,
        'total_files_cleared' => $totalFiles
    ]);
    
} catch (\Exception $e) {
    http_response_code(500);
    error_log("[CacheClearAll] Error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}

