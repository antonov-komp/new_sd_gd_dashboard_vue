<?php
/**
 * API endpoint для получения статуса кеша всех модулей
 * 
 * Метод: GET
 * Путь: /api/admin/cache-status.php
 * 
 * Требует прав администратора
 * 
 * Формат ответа (успех):
 * {
 *   "success": true,
 *   "modules": [
 *     {
 *       "id": "graph-admission-closure-months",
 *       "name": "График приёма/закрытий 1С (3 месяца)",
 *       "cache_dir": "api/cache/graph-admission-closure/months",
 *       "status": "active",
 *       "file_count": 15,
 *       "total_size": 1024000,
 *       "ttl": 300
 *     },
 *     ...
 *   ]
 * }
 */

require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/cache/GraphAdmissionClosureCache.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/cache/TimeTrackingCache.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Проверка прав администратора
// Примечание: В реальной реализации нужно использовать Bitrix24 API для проверки прав
// Для тестирования можно временно установить $isAdmin = true
// TODO: Реализовать проверку через Bitrix24 API (user.current + проверка отдела)
$isAdmin = true; // Временная заглушка для тестирования

if (!$isAdmin) {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied. Admin rights required.']);
    exit;
}

try {
    $modules = [];
    
    // Модуль 1: График приёма/закрытий 1С (months)
    $graphMonthsDir = __DIR__ . '/../cache/graph-admission-closure/months';
    $graphMonthsModule = [
        'id' => 'graph-admission-closure-months',
        'name' => 'График приёма/закрытий 1С (3 месяца)',
        'cache_dir' => 'api/cache/graph-admission-closure/months',
        'status' => 'active',
        'file_count' => getCacheFileCount($graphMonthsDir),
        'total_size' => getCacheTotalSize($graphMonthsDir),
        'ttl' => 300
    ];
    $modules[] = $graphMonthsModule;
    
    // Модуль 2: График приёма/закрытий 1С (weeks)
    $graphWeeksDir = __DIR__ . '/../cache/graph-admission-closure/weeks';
    $graphWeeksModule = [
        'id' => 'graph-admission-closure-weeks',
        'name' => 'График приёма/закрытий 1С (4 недели)',
        'cache_dir' => 'api/cache/graph-admission-closure/weeks',
        'status' => 'active',
        'file_count' => getCacheFileCount($graphWeeksDir),
        'total_size' => getCacheTotalSize($graphWeeksDir),
        'ttl' => 120
    ];
    $modules[] = $graphWeeksModule;
    
    // Модуль 3: Трудозатраты на Тикеты сектора 1С
    $timeTrackingCacheDir = __DIR__ . '/../cache/time-tracking-sector-1c';
    $timeTrackingModule = [
        'id' => 'time-tracking-sector-1c',
        'name' => 'Трудозатраты на Тикеты сектора 1С',
        'cache_dir' => 'api/cache/time-tracking-sector-1c',
        'status' => 'active',
        'file_count' => getCacheFileCount($timeTrackingCacheDir),
        'total_size' => getCacheTotalSize($timeTrackingCacheDir),
        'ttl' => 300
    ];
    $modules[] = $timeTrackingModule;
    
    // Модуль 4: Недельные новые и закрытые тикеты сектора 1С
    // TODO: Добавить информацию о кеше этого модуля, если он реализован
    
    // Модуль 5: Трудозатраты сотрудников сектора 1С по неделям
    // TODO: Добавить информацию о кеше этого модуля, если он реализован
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'modules' => $modules
    ]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}

/**
 * Получение количества файлов в директории кеша
 * 
 * @param string $cacheDir Путь к директории кеша
 * @return int Количество файлов
 */
function getCacheFileCount(string $cacheDir): int
{
    if (!is_dir($cacheDir)) {
        return 0;
    }
    
    $files = glob($cacheDir . '/*.json');
    return $files ? count($files) : 0;
}

/**
 * Получение общего размера файлов в директории кеша
 * 
 * @param string $cacheDir Путь к директории кеша
 * @return int Размер в байтах
 */
function getCacheTotalSize(string $cacheDir): int
{
    if (!is_dir($cacheDir)) {
        return 0;
    }
    
    $files = glob($cacheDir . '/*.json');
    $totalSize = 0;
    
    foreach ($files as $file) {
        if (is_file($file)) {
            $totalSize += filesize($file);
        }
    }
    
    return $totalSize;
}

