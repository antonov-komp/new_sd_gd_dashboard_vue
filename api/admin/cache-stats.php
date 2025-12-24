<?php
/**
 * API endpoint для получения детальной статистики кеша
 * 
 * Метод: GET
 * Путь: /api/admin/cache-stats.php
 * 
 * Требует прав администратора
 * 
 * Формат ответа (успех):
 * {
 *   "success": true,
 *   "stats": {
 *     "total_modules": 4,
 *     "total_files": 25,
 *     "total_size": 2048000,
 *     "total_size_formatted": "2.00 MB",
 *     "oldest_cache": "2025-12-24T08:00:00+03:00",
 *     "newest_cache": "2025-12-24T10:05:00+03:00",
 *     "modules": [
 *       {
 *         "id": "graph-admission-closure-months",
 *         "file_count": 10,
 *         "size": 1024000,
 *         "size_formatted": "1.00 MB",
 *         "avg_file_size": 102400
 *       },
 *       ...
 *     ]
 *   }
 * }
 */

require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/cache/GraphAdmissionClosureCache.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/cache/TimeTrackingCache.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// TODO: Проверка прав администратора
// if (!isAdmin()) {
//     http_response_code(403);
//     echo json_encode(['error' => 'Access denied']);
//     exit;
// }

try {
    $modules = [];
    $totalFiles = 0;
    $totalSize = 0;
    $oldestCache = null;
    $newestCache = null;
    
    // Модуль 1: График приёма/закрытий 1С (months)
    $graphMonthsDir = __DIR__ . '/../cache/graph-admission-closure/months';
    $graphMonthsStats = getCacheDirectoryStats($graphMonthsDir);
    if ($graphMonthsStats['file_count'] > 0) {
        $modules[] = [
            'id' => 'graph-admission-closure-months',
            'name' => 'График приёма/закрытий 1С (3 месяца)',
            'file_count' => $graphMonthsStats['file_count'],
            'size' => $graphMonthsStats['total_size'],
            'size_formatted' => formatBytes($graphMonthsStats['total_size']),
            'avg_file_size' => $graphMonthsStats['file_count'] > 0 
                ? round($graphMonthsStats['total_size'] / $graphMonthsStats['file_count']) 
                : 0
        ];
        $totalFiles += $graphMonthsStats['file_count'];
        $totalSize += $graphMonthsStats['total_size'];
        updateOldestNewest($graphMonthsStats, $oldestCache, $newestCache);
    }
    
    // Модуль 2: График приёма/закрытий 1С (weeks)
    $graphWeeksDir = __DIR__ . '/../cache/graph-admission-closure/weeks';
    $graphWeeksStats = getCacheDirectoryStats($graphWeeksDir);
    if ($graphWeeksStats['file_count'] > 0) {
        $modules[] = [
            'id' => 'graph-admission-closure-weeks',
            'name' => 'График приёма/закрытий 1С (4 недели)',
            'file_count' => $graphWeeksStats['file_count'],
            'size' => $graphWeeksStats['total_size'],
            'size_formatted' => formatBytes($graphWeeksStats['total_size']),
            'avg_file_size' => $graphWeeksStats['file_count'] > 0 
                ? round($graphWeeksStats['total_size'] / $graphWeeksStats['file_count']) 
                : 0
        ];
        $totalFiles += $graphWeeksStats['file_count'];
        $totalSize += $graphWeeksStats['total_size'];
        updateOldestNewest($graphWeeksStats, $oldestCache, $newestCache);
    }
    
    // Модуль 3: Трудозатраты на Тикеты сектора 1С
    $timeTrackingDir = __DIR__ . '/../cache/time-tracking-sector-1c';
    $timeTrackingStats = getCacheDirectoryStats($timeTrackingDir);
    if ($timeTrackingStats['file_count'] > 0) {
        $modules[] = [
            'id' => 'time-tracking-sector-1c',
            'name' => 'Трудозатраты на Тикеты сектора 1С',
            'file_count' => $timeTrackingStats['file_count'],
            'size' => $timeTrackingStats['total_size'],
            'size_formatted' => formatBytes($timeTrackingStats['total_size']),
            'avg_file_size' => $timeTrackingStats['file_count'] > 0 
                ? round($timeTrackingStats['total_size'] / $timeTrackingStats['file_count']) 
                : 0
        ];
        $totalFiles += $timeTrackingStats['file_count'];
        $totalSize += $timeTrackingStats['total_size'];
        updateOldestNewest($timeTrackingStats, $oldestCache, $newestCache);
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'stats' => [
            'total_modules' => count($modules),
            'total_files' => $totalFiles,
            'total_size' => $totalSize,
            'total_size_formatted' => formatBytes($totalSize),
            'oldest_cache' => $oldestCache ? date('c', $oldestCache) : null,
            'newest_cache' => $newestCache ? date('c', $newestCache) : null,
            'modules' => $modules
        ]
    ]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}

/**
 * Получение статистики директории кеша
 * 
 * @param string $cacheDir Путь к директории кеша
 * @return array Статистика директории
 */
function getCacheDirectoryStats(string $cacheDir): array
{
    $stats = [
        'file_count' => 0,
        'total_size' => 0,
        'oldest_timestamp' => null,
        'newest_timestamp' => null
    ];
    
    if (!is_dir($cacheDir)) {
        return $stats;
    }
    
    $files = glob($cacheDir . '/*.json');
    if (!$files) {
        return $stats;
    }
    
    $stats['file_count'] = count($files);
    
    foreach ($files as $file) {
        if (!is_file($file)) {
            continue;
        }
        
        $size = filesize($file);
        $stats['total_size'] += $size;
        
        // Чтение метаданных для определения времени создания
        $content = @file_get_contents($file);
        if ($content !== false) {
            $data = @json_decode($content, true);
            if ($data && isset($data['metadata']['created_at'])) {
                $createdAt = $data['metadata']['created_at'];
                
                if ($stats['oldest_timestamp'] === null || $createdAt < $stats['oldest_timestamp']) {
                    $stats['oldest_timestamp'] = $createdAt;
                }
                
                if ($stats['newest_timestamp'] === null || $createdAt > $stats['newest_timestamp']) {
                    $stats['newest_timestamp'] = $createdAt;
                }
            }
        }
    }
    
    return $stats;
}

/**
 * Обновление oldest/newest кеша
 * 
 * @param array $stats Статистика директории
 * @param int|null $oldestCache Ссылка на oldest timestamp
 * @param int|null $newestCache Ссылка на newest timestamp
 */
function updateOldestNewest(array $stats, ?int &$oldestCache, ?int &$newestCache): void
{
    if ($stats['oldest_timestamp'] !== null) {
        if ($oldestCache === null || $stats['oldest_timestamp'] < $oldestCache) {
            $oldestCache = $stats['oldest_timestamp'];
        }
    }
    
    if ($stats['newest_timestamp'] !== null) {
        if ($newestCache === null || $stats['newest_timestamp'] > $newestCache) {
            $newestCache = $stats['newest_timestamp'];
        }
    }
}

/**
 * Форматирование размера в читаемый формат
 * 
 * @param int $bytes Размер в байтах
 * @return string Отформатированный размер
 */
function formatBytes(int $bytes): string
{
    if ($bytes === 0) {
        return '0 B';
    }
    
    $k = 1024;
    $sizes = ['B', 'KB', 'MB', 'GB'];
    $i = floor(log($bytes) / log($k));
    
    return round($bytes / pow($k, $i) * 100) / 100 . ' ' . $sizes[$i];
}

