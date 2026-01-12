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

// Определяем базовый путь проекта
$projectRoot = dirname(__DIR__, 2); // Поднимаемся на 2 уровня выше от api/admin/

require_once $projectRoot . '/api/cache/GraphAdmissionClosureCache.php';
require_once $projectRoot . '/api/cache/TimeTrackingCache.php';
require_once $projectRoot . '/api/cache/UsersManagementCache.php';
require_once $projectRoot . '/api/cache/UserActivityCache.php';
require_once $projectRoot . '/api/cache/WebhookLogsCache.php';

// TASK-082: Новые кеш-менеджеры для backend кеширования
require_once $projectRoot . '/api/cache/DashboardSector1CCache.php';
require_once $projectRoot . '/api/cache/GraphStateCache.php';

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
    $graphMonthsCacheInfo = getCacheInfo($graphMonthsDir, 300);
    $graphMonthsModule = [
        'id' => 'graph-admission-closure-months',
        'name' => 'График приёма/закрытий 1С (3 месяца)',
        'cache_dir' => 'api/cache/graph-admission-closure/months',
        'status' => $graphMonthsCacheInfo['status'],
        'file_count' => $graphMonthsCacheInfo['file_count'],
        'total_size' => $graphMonthsCacheInfo['total_size'],
        'ttl' => 300,
        'created_at' => $graphMonthsCacheInfo['created_at'],
        'expires_at' => $graphMonthsCacheInfo['expires_at'],
        'status_text' => $graphMonthsCacheInfo['status_text']
    ];
    $modules[] = $graphMonthsModule;
    
    // Модуль 2: График приёма/закрытий 1С (weeks)
    $graphWeeksDir = __DIR__ . '/../cache/graph-admission-closure/weeks';
    $graphWeeksCacheInfo = getCacheInfo($graphWeeksDir, 120);
    $graphWeeksModule = [
        'id' => 'graph-admission-closure-weeks',
        'name' => 'График приёма/закрытий 1С (4 недели)',
        'cache_dir' => 'api/cache/graph-admission-closure/weeks',
        'status' => $graphWeeksCacheInfo['status'],
        'file_count' => $graphWeeksCacheInfo['file_count'],
        'total_size' => $graphWeeksCacheInfo['total_size'],
        'ttl' => 120,
        'created_at' => $graphWeeksCacheInfo['created_at'],
        'expires_at' => $graphWeeksCacheInfo['expires_at'],
        'status_text' => $graphWeeksCacheInfo['status_text']
    ];
    $modules[] = $graphWeeksModule;
    
    // Модуль 3: Трудозатраты на Тикеты сектора 1С (с режимами)
    // TASK-075: Обновлено для поддержки режимов
    $timeTrackingBaseDir = __DIR__ . '/../cache/time-tracking-sector-1c';
    $timeTrackingModes = [
        [
            'id' => 'time-tracking-default',
            'name' => 'Трудозатраты (режим по умолчанию)',
            'cache_dir' => $timeTrackingBaseDir . '/default',
            'ttl' => 300
        ],
        [
            'id' => 'time-tracking-detailed',
            'name' => 'Трудозатраты (детальный режим)',
            'cache_dir' => $timeTrackingBaseDir . '/detailed',
            'ttl' => 120
        ],
        [
            'id' => 'time-tracking-summary',
            'name' => 'Трудозатраты (сводный режим)',
            'cache_dir' => $timeTrackingBaseDir . '/summary',
            'ttl' => 600
        ]
    ];
    
    foreach ($timeTrackingModes as $mode) {
        $cacheInfo = getCacheInfo($mode['cache_dir'], $mode['ttl']);
        $modules[] = [
            'id' => $mode['id'],
            'name' => $mode['name'],
            'cache_dir' => 'api/cache/time-tracking-sector-1c/' . basename($mode['cache_dir']),
            'status' => $cacheInfo['status'],
            'file_count' => $cacheInfo['file_count'],
            'total_size' => $cacheInfo['total_size'],
            'ttl' => $mode['ttl'],
            'created_at' => $cacheInfo['created_at'],
            'expires_at' => $cacheInfo['expires_at'],
            'status_text' => $cacheInfo['status_text']
        ];
    }
    
    // Модуль 4: Управление пользователями (с режимами)
    // TASK-075: Добавлен новый модуль с поддержкой режимов
    $usersManagementBaseDir = __DIR__ . '/../cache/users-management';
    $usersManagementModes = [
        [
            'id' => 'users-management-departments',
            'name' => 'Управление пользователями (отделы)',
            'cache_dir' => $usersManagementBaseDir . '/departments',
            'ttl' => 3600
        ],
        [
            'id' => 'users-management-users',
            'name' => 'Управление пользователями (пользователи)',
            'cache_dir' => $usersManagementBaseDir . '/users',
            'ttl' => 1800
        ],
        [
            'id' => 'users-management-config',
            'name' => 'Управление пользователями (конфигурация)',
            'cache_dir' => $usersManagementBaseDir . '/config',
            'ttl' => 300
        ]
    ];
    
    foreach ($usersManagementModes as $mode) {
        $cacheInfo = getCacheInfo($mode['cache_dir'], $mode['ttl']);
        $modules[] = [
            'id' => $mode['id'],
            'name' => $mode['name'],
            'cache_dir' => 'api/cache/users-management/' . basename($mode['cache_dir']),
            'status' => $cacheInfo['status'],
            'file_count' => $cacheInfo['file_count'],
            'total_size' => $cacheInfo['total_size'],
            'ttl' => $mode['ttl'],
            'created_at' => $cacheInfo['created_at'],
            'expires_at' => $cacheInfo['expires_at'],
            'status_text' => $cacheInfo['status_text']
        ];
    }
    
    // Модуль 5: Отслеживание активности (с режимами)
    // TASK-075: Добавлен новый модуль с поддержкой режимов
    $userActivityBaseDir = __DIR__ . '/../cache/user-activity';
    $userActivityModes = [
        [
            'id' => 'user-activity-stats',
            'name' => 'Отслеживание активности (статистика)',
            'cache_dir' => $userActivityBaseDir . '/stats',
            'ttl' => 300
        ],
        [
            'id' => 'user-activity-list',
            'name' => 'Отслеживание активности (список)',
            'cache_dir' => $userActivityBaseDir . '/list',
            'ttl' => 120
        ],
        [
            'id' => 'user-activity-filters',
            'name' => 'Отслеживание активности (фильтры)',
            'cache_dir' => $userActivityBaseDir . '/filters',
            'ttl' => 60
        ]
    ];
    
    foreach ($userActivityModes as $mode) {
        $cacheInfo = getCacheInfo($mode['cache_dir'], $mode['ttl']);
        $modules[] = [
            'id' => $mode['id'],
            'name' => $mode['name'],
            'cache_dir' => 'api/cache/user-activity/' . basename($mode['cache_dir']),
            'status' => $cacheInfo['status'],
            'file_count' => $cacheInfo['file_count'],
            'total_size' => $cacheInfo['total_size'],
            'ttl' => $mode['ttl'],
            'created_at' => $cacheInfo['created_at'],
            'expires_at' => $cacheInfo['expires_at'],
            'status_text' => $cacheInfo['status_text']
        ];
    }
    
    // Модуль 6: Логи вебхуков (с режимами)
    // TASK-075: Добавлен новый модуль с поддержкой режимов
    $webhookLogsBaseDir = __DIR__ . '/../cache/webhook-logs';
    $webhookLogsModes = [
        [
            'id' => 'webhook-logs-api',
            'name' => 'Логи вебхуков (API запросы)',
            'cache_dir' => $webhookLogsBaseDir . '/api',
            'ttl' => 300
        ],
        [
            'id' => 'webhook-logs-realtime',
            'name' => 'Логи вебхуков (realtime данные)',
            'cache_dir' => $webhookLogsBaseDir . '/realtime',
            'ttl' => 60
        ],
        [
            'id' => 'webhook-logs-stats',
            'name' => 'Логи вебхуков (статистика)',
            'cache_dir' => $webhookLogsBaseDir . '/stats',
            'ttl' => 600
        ]
    ];
    
    foreach ($webhookLogsModes as $mode) {
        $cacheInfo = getCacheInfo($mode['cache_dir'], $mode['ttl']);
        $modules[] = [
            'id' => $mode['id'],
            'name' => $mode['name'],
            'cache_dir' => 'api/cache/webhook-logs/' . basename($mode['cache_dir']),
            'status' => $cacheInfo['status'],
            'file_count' => $cacheInfo['file_count'],
            'total_size' => $cacheInfo['total_size'],
            'ttl' => $mode['ttl'],
            'created_at' => $cacheInfo['created_at'],
            'expires_at' => $cacheInfo['expires_at'],
            'status_text' => $cacheInfo['status_text']
        ];
    }

    // TASK-082: Модуль Dashboard Sector 1C
    $dashboardSectorDir = __DIR__ . '/../cache/dashboard-sector-1c';
    $dashboardSectorCacheInfo = getCacheInfo($dashboardSectorDir, 600);
    $dashboardSectorModule = [
        'id' => 'dashboard-sector-1c',
        'name' => 'Дашборд сектора 1С',
        'cache_dir' => 'api/cache/dashboard-sector-1c',
        'status' => $dashboardSectorCacheInfo['status'],
        'file_count' => $dashboardSectorCacheInfo['file_count'],
        'total_size' => $dashboardSectorCacheInfo['total_size'],
        'ttl' => 600,
        'created_at' => $dashboardSectorCacheInfo['created_at'],
        'expires_at' => $dashboardSectorCacheInfo['expires_at'],
        'status_text' => $dashboardSectorCacheInfo['status_text']
    ];
    $modules[] = $dashboardSectorModule;

    // TASK-082: Модуль Graph State
    $graphStateDir = __DIR__ . '/../cache/graph-state';
    $graphStateCacheInfo = getCacheInfo($graphStateDir, 3600);
    $graphStateModule = [
        'id' => 'graph-state',
        'name' => 'График состояния',
        'cache_dir' => 'api/cache/graph-state',
        'status' => $graphStateCacheInfo['status'],
        'file_count' => $graphStateCacheInfo['file_count'],
        'total_size' => $graphStateCacheInfo['total_size'],
        'ttl' => 3600,
        'created_at' => $graphStateCacheInfo['created_at'],
        'expires_at' => $graphStateCacheInfo['expires_at'],
        'status_text' => $graphStateCacheInfo['status_text']
    ];
    $modules[] = $graphStateModule;
    
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

/**
 * Получение информации о кеше (дата создания, статус, срок действия)
 * 
 * @param string $cacheDir Путь к директории кеша
 * @param int $ttl TTL в секундах
 * @return array Информация о кеше
 */
function getCacheInfo(string $cacheDir, int $ttl): array
{
    $info = [
        'file_count' => 0,
        'total_size' => 0,
        'status' => 'empty',
        'status_text' => 'Пуст',
        'created_at' => null,
        'expires_at' => null
    ];
    
    if (!is_dir($cacheDir)) {
        return $info;
    }
    
    $files = glob($cacheDir . '/*.json');
    if (!$files || count($files) === 0) {
        return $info;
    }
    
    $info['file_count'] = count($files);
    
    $newestCreatedAt = null;
    $newestExpiresAt = null;
    $now = time();
    
    foreach ($files as $file) {
        if (!is_file($file)) {
            continue;
        }
        
        $info['total_size'] += filesize($file);
        
        // Чтение метаданных из файла
        $content = @file_get_contents($file);
        if ($content === false) {
            continue;
        }
        
        $data = @json_decode($content, true);
        if ($data === null || !is_array($data) || !isset($data['metadata'])) {
            continue;
        }
        
        $metadata = $data['metadata'];
        $createdAt = $metadata['created_at'] ?? null;
        $expiresAt = $metadata['expires_at'] ?? null;
        
        // Находим самый новый файл
        if ($createdAt !== null) {
            if ($newestCreatedAt === null || $createdAt > $newestCreatedAt) {
                $newestCreatedAt = $createdAt;
                $newestExpiresAt = $expiresAt;
            }
        }
    }
    
    if ($newestCreatedAt !== null) {
        $info['created_at'] = $newestCreatedAt;
        $info['expires_at'] = $newestExpiresAt;
        
        // Определяем статус
        if ($newestExpiresAt !== null && $now > $newestExpiresAt) {
            $info['status'] = 'expired';
            $info['status_text'] = 'Просрочен';
        } else {
            $info['status'] = 'active';
            $info['status_text'] = 'Активен';
        }
    } else {
        $info['status'] = 'empty';
        $info['status_text'] = 'Пуст';
    }
    
    return $info;
}

