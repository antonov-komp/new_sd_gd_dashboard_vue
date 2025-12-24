<?php
/**
 * API endpoint для очистки кеша модулей
 * 
 * Метод: POST
 * Путь: /api/admin/cache-clear.php
 * 
 * Параметры запроса:
 * {
 *   "module_id": "graph-admission-closure-months" | "all",
 *   "confirm": true
 * }
 * 
 * Требует прав администратора
 * 
 * Формат ответа (успех):
 * {
 *   "success": true,
 *   "message": "Cache cleared successfully",
 *   "cleared_modules": ["graph-admission-closure-months"]
 * }
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

// Проверка метода запроса
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit;
}

// TODO: Проверка прав администратора
// if (!isAdmin()) {
//     http_response_code(403);
//     echo json_encode(['error' => 'Access denied']);
//     exit;
// }

// Получение данных из запроса
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

// Проверка наличия данных
if (!$input || !is_array($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request body. Expected JSON object.']);
    exit;
}

// Валидация обязательных полей
if (!isset($input['module_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required field: module_id']);
    exit;
}

// Проверка подтверждения
if (!isset($input['confirm']) || $input['confirm'] !== true) {
    http_response_code(400);
    echo json_encode(['error' => 'Confirmation required. Set confirm: true']);
    exit;
}

try {
    $moduleId = $input['module_id'];
    $clearedModules = [];
    
    if ($moduleId === 'all') {
        // Очистка всего кеша
        
        // График приёма/закрытий 1С (months и weeks)
        GraphAdmissionClosureCache::clear();
        $clearedModules[] = 'graph-admission-closure-months';
        $clearedModules[] = 'graph-admission-closure-weeks';
        
        // Трудозатраты на Тикеты сектора 1С (все режимы)
        // TASK-075: Обновлено для очистки всех режимов
        TimeTrackingCache::clear();
        $clearedModules[] = 'time-tracking-default';
        $clearedModules[] = 'time-tracking-detailed';
        $clearedModules[] = 'time-tracking-summary';
        
        // Управление пользователями (все режимы)
        // TASK-075: Добавлена очистка нового модуля
        UsersManagementCache::clear();
        $clearedModules[] = 'users-management-departments';
        $clearedModules[] = 'users-management-users';
        $clearedModules[] = 'users-management-config';
        
        // Отслеживание активности (все режимы)
        // TASK-075: Добавлена очистка нового модуля
        UserActivityCache::clear();
        $clearedModules[] = 'user-activity-stats';
        $clearedModules[] = 'user-activity-list';
        $clearedModules[] = 'user-activity-filters';
        
        // Логи вебхуков (все режимы)
        // TASK-075: Добавлена очистка нового модуля
        WebhookLogsCache::clear();
        $clearedModules[] = 'webhook-logs-api';
        $clearedModules[] = 'webhook-logs-realtime';
        $clearedModules[] = 'webhook-logs-stats';
        
    } else {
        // Очистка конкретного модуля или режима
        // TASK-075: Обновлено для поддержки режимов
        switch ($moduleId) {
            case 'graph-admission-closure-months':
                // Очистка только months
                $cacheDir = __DIR__ . '/../cache/graph-admission-closure/months';
                clearCacheDirectory($cacheDir);
                $clearedModules[] = $moduleId;
                break;
                
            case 'graph-admission-closure-weeks':
                // Очистка только weeks
                $cacheDir = __DIR__ . '/../cache/graph-admission-closure/weeks';
                clearCacheDirectory($cacheDir);
                $clearedModules[] = $moduleId;
                break;
            
            // TASK-075: Очистка режимов TimeTrackingCache
            case 'time-tracking-default':
                TimeTrackingCache::clearByMode('default');
                $clearedModules[] = $moduleId;
                break;
            
            case 'time-tracking-detailed':
                TimeTrackingCache::clearByMode('detailed');
                $clearedModules[] = $moduleId;
                break;
            
            case 'time-tracking-summary':
                TimeTrackingCache::clearByMode('summary');
                $clearedModules[] = $moduleId;
                break;
            
            case 'time-tracking-sector-1c':
                // Очистка всего модуля (всех режимов)
                TimeTrackingCache::clear();
                $clearedModules[] = 'time-tracking-default';
                $clearedModules[] = 'time-tracking-detailed';
                $clearedModules[] = 'time-tracking-summary';
                break;
            
            // TASK-075: Очистка режимов UsersManagementCache
            case 'users-management-departments':
                UsersManagementCache::clearByMode('departments');
                $clearedModules[] = $moduleId;
                break;
            
            case 'users-management-users':
                UsersManagementCache::clearByMode('users');
                $clearedModules[] = $moduleId;
                break;
            
            case 'users-management-config':
                UsersManagementCache::clearByMode('config');
                $clearedModules[] = $moduleId;
                break;
            
            case 'users-management':
                // Очистка всего модуля (всех режимов)
                UsersManagementCache::clear();
                $clearedModules[] = 'users-management-departments';
                $clearedModules[] = 'users-management-users';
                $clearedModules[] = 'users-management-config';
                break;
            
            // TASK-075: Очистка режимов UserActivityCache
            case 'user-activity-stats':
                UserActivityCache::clearByMode('stats');
                $clearedModules[] = $moduleId;
                break;
            
            case 'user-activity-list':
                UserActivityCache::clearByMode('list');
                $clearedModules[] = $moduleId;
                break;
            
            case 'user-activity-filters':
                UserActivityCache::clearByMode('filters');
                $clearedModules[] = $moduleId;
                break;
            
            case 'user-activity':
                // Очистка всего модуля (всех режимов)
                UserActivityCache::clear();
                $clearedModules[] = 'user-activity-stats';
                $clearedModules[] = 'user-activity-list';
                $clearedModules[] = 'user-activity-filters';
                break;
            
            // TASK-075: Очистка режимов WebhookLogsCache
            case 'webhook-logs-api':
                WebhookLogsCache::clearByMode('api');
                $clearedModules[] = $moduleId;
                break;
            
            case 'webhook-logs-realtime':
                WebhookLogsCache::clearByMode('realtime');
                $clearedModules[] = $moduleId;
                break;
            
            case 'webhook-logs-stats':
                WebhookLogsCache::clearByMode('stats');
                $clearedModules[] = $moduleId;
                break;
            
            case 'webhook-logs':
                // Очистка всего модуля (всех режимов)
                WebhookLogsCache::clear();
                $clearedModules[] = 'webhook-logs-api';
                $clearedModules[] = 'webhook-logs-realtime';
                $clearedModules[] = 'webhook-logs-stats';
                break;
                
            default:
                http_response_code(400);
                echo json_encode([
                    'error' => 'Unknown module_id',
                    'module_id' => $moduleId
                ]);
                exit;
        }
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Cache cleared successfully',
        'cleared_modules' => $clearedModules
    ]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}

/**
 * Очистка директории кеша
 * 
 * @param string $cacheDir Путь к директории кеша
 * @return bool true если успешно
 */
function clearCacheDirectory(string $cacheDir): bool
{
    if (!is_dir($cacheDir)) {
        return true; // Директория не существует
    }
    
    $files = glob($cacheDir . '/*.json');
    $success = true;
    
    foreach ($files as $file) {
        if (!@unlink($file)) {
            error_log("[Cache] Failed to delete cache file: {$file}");
            $success = false;
        }
    }
    
    return $success;
}

