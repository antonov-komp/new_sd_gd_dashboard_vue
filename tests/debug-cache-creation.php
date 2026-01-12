<?php
/**
 * Отладочный скрипт для проверки создания кэша TASK-082
 */

require_once '../api/cache/DashboardSector1CCache.php'; // Исправлен путь
require_once '../api/cache/GraphStateCache.php'; // Исправлен путь
require_once '../api/services/DashboardSector1CService.php'; // Исправлен путь
require_once '../api/services/GraphStateService.php'; // Исправлен путь

echo "=== Отладка создания кэша TASK-082 ===\n\n";

// Тест 1: Проверка работы DashboardSector1CService напрямую
echo "1. Тестирование DashboardSector1CService::getSectorDataCached()\n";

try {
    $params = [
        'forceRefresh' => true,
        'ttl' => 60 // 1 минута для теста
    ];

    echo "   Вызов getSectorDataCached с forceRefresh=true...\n";
    $startTime = microtime(true);

    $result = DashboardSector1CService::getSectorDataCached($params);

    $endTime = microtime(true);
    $duration = round(($endTime - $startTime) * 1000, 2);

    echo "   Время выполнения: {$duration}ms\n";

    if ($result && is_array($result) && isset($result['stages'])) {
        echo "   ✓ Сервис вернул корректные данные\n";
        echo "   - Stages: " . count($result['stages']) . "\n";
        echo "   - Employees: " . count($result['employees']) . "\n";
        echo "   - ZeroPointTickets: " . count($result['zeroPointTickets']) . "\n";

        // Проверяем кэш
        $cachedData = DashboardSector1CCache::getSectorData();
        if ($cachedData !== null) {
            echo "   ✓ Данные сохранены в кэш\n";
        } else {
            echo "   ✗ Данные не сохранены в кэш\n";
        }
    } else {
        echo "   ✗ Сервис вернул некорректные данные\n";
        var_dump($result);
    }
} catch (Exception $e) {
    echo "   ✗ Исключение: " . $e->getMessage() . "\n";
    echo "   Stack trace:\n" . $e->getTraceAsString() . "\n";
}

echo "\n";

// Тест 2: Проверка работы GraphStateService
echo "2. Тестирование GraphStateService::getSnapshotDataCached()\n";

try {
    $params = [
        'forceRefresh' => true,
        'type' => 'current',
        'ttl' => 60 // 1 минута для теста
    ];

    echo "   Вызов getSnapshotDataCached с forceRefresh=true...\n";
    $startTime = microtime(true);

    $result = GraphStateService::getSnapshotDataCached($params);

    $endTime = microtime(true);
    $duration = round(($endTime - $startTime) * 1000, 2);

    echo "   Время выполнения: {$duration}ms\n";

    if ($result && is_array($result) && isset($result['meta'])) {
        echo "   ✓ Сервис вернул корректные данные\n";
        echo "   - Type: " . ($result['meta']['type'] ?? 'unknown') . "\n";
        echo "   - Stages: " . count($result['data']['stages'] ?? []) . "\n";
        echo "   - Summary: " . json_encode($result['data']['summary'] ?? []) . "\n";

        // Проверяем кэш
        $cachedData = GraphStateCache::getSnapshotData('current');
        if ($cachedData !== null) {
            echo "   ✓ Данные сохранены в кэш\n";
        } else {
            echo "   ✗ Данные не сохранены в кэш\n";
        }
    } else {
        echo "   ✗ Сервис вернул некорректные данные\n";
        var_dump($result);
    }
} catch (Exception $e) {
    echo "   ✗ Исключение: " . $e->getMessage() . "\n";
    echo "   Stack trace:\n" . $e->getTraceAsString() . "\n";
}

echo "\n";

// Тест 3: Имитация вызова cache-create.php
echo "3. Имитация вызова cache-create.php\n";

echo "   Тестирование dashboard-sector-1c...\n";
$testResult = testCacheCreation('dashboard-sector-1c', null, ['ttl' => 60]);
echo "   Результат: " . ($testResult['success'] ? '✓ Успешно' : '✗ Ошибка') . "\n";
if (!$testResult['success']) {
    echo "   Ошибка: " . ($testResult['error'] ?? 'Неизвестная ошибка') . "\n";
}

echo "\n   Тестирование graph-state...\n";
$testResult = testCacheCreation('graph-state', null, ['ttl' => 60, 'type' => 'current']);
echo "   Результат: " . ($testResult['success'] ? '✓ Успешно' : '✗ Ошибка') . "\n";
if (!$testResult['success']) {
    echo "   Ошибка: " . ($testResult['error'] ?? 'Неизвестная ошибка') . "\n";
}

echo "\n=== Отладка завершена ===\n";

/**
 * Имитация функции createCacheForModule
 */
function testCacheCreation(string $moduleId, ?string $mode, array $params): array
{
    require_once '../api/admin/cache-create.php'; // Исправлен путь

    try {
        // Используем ту же логику, что и в cache-create.php
        if (strpos($moduleId, 'dashboard-sector-1c') === 0) {
            return createDashboardSectorCache($moduleId, $mode, $params, null, null);
        }

        if (strpos($moduleId, 'graph-state') === 0) {
            return createGraphStateCache($moduleId, $mode, $params, null, null);
        }

        return [
            'success' => false,
            'error' => 'Unknown module: ' . $moduleId
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Exception: ' . $e->getMessage()
        ];
    }
}