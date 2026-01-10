<?php
/**
 * Debug скрипт для TASK-084: Проверка категоризации кеша
 */

// Подключаем необходимые файлы
require_once 'api/cache/GraphAdmissionClosureCache.php';
require_once 'api/cache/TimeTrackingCache.php';
require_once 'api/cache/UsersManagementCache.php';
require_once 'api/cache/UserActivityCache.php';
require_once 'api/cache/WebhookLogsCache.php';
require_once 'api/cache/DashboardSector1CCache.php';
require_once 'api/cache/GraphStateCache.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // Получаем данные из API cache-status.php
    $apiUrl = 'http://' . $_SERVER['HTTP_HOST'] . '/rest_api_aps/sd_it_gen_plan/api/admin/cache-status.php';
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => 'Content-Type: application/json'
        ]
    ]);

    $response = file_get_contents($apiUrl, false, $context);
    $data = json_decode($response, true);

    if (!$data || !isset($data['modules'])) {
        throw new Exception('Не удалось получить данные из API');
    }

    $modules = $data['modules'];

    // Определяем основные модули (как в JavaScript)
    $primaryModuleIds = [
        'dashboard-sector-1c',
        'graph-state',
        'graph-admission-closure-weeks',
        'graph-admission-closure-months',
        'time-tracking-default',
        'time-tracking-detailed',
        'time-tracking-summary'
    ];

    $primaryModules = [];
    $secondaryModules = [];

    // Категоризация модулей
    foreach ($modules as $module) {
        if (in_array($module['id'], $primaryModuleIds)) {
            $primaryModules[] = $module;
        } else {
            $secondaryModules[] = $module;
        }
    }

    // Группировка побочных модулей
    $groupedSecondary = [];
    foreach ($secondaryModules as $module) {
        $type = getModuleType($module['id']);
        if (!isset($groupedSecondary[$type])) {
            $groupedSecondary[$type] = [];
        }
        $groupedSecondary[$type][] = $module;
    }

    // Формируем результат как в JavaScript
    $result = [
        'primaryModules' => $primaryModules,
        'secondaryModules' => $secondaryModules,
        'metadata' => [
            'totalModules' => count($modules),
            'primaryCount' => count($primaryModules),
            'secondaryCount' => count($secondaryModules),
            'groupedSecondary' => $groupedSecondary
        ]
    ];

    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

// Вспомогательные функции
function getModuleType($moduleId) {
    if (strpos($moduleId, 'users-management') === 0) return 'users';
    if (strpos($moduleId, 'user-activity') === 0) return 'activity';
    if (strpos($moduleId, 'webhook-logs') === 0) return 'webhooks';
    return 'other';
}
?>