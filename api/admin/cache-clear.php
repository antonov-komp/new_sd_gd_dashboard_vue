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
        
        // Трудозатраты на Тикеты сектора 1С
        TimeTrackingCache::clear();
        $clearedModules[] = 'time-tracking-sector-1c';
        
        // TODO: Очистка других модулей
        
    } else {
        // Очистка конкретного модуля
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
                
            case 'time-tracking-sector-1c':
                TimeTrackingCache::clear();
                $clearedModules[] = $moduleId;
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

