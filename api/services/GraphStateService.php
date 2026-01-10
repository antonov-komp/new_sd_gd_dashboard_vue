<?php
/**
 * Backend сервис для работы с графиком состояния
 *
 * TASK-082: Реализация backend кеширования для Graph State
 *
 * Реализует логику получения данных слепков состояния системы
 * с backend кешированием через GraphStateCache.
 *
 * Расположение: api/services/GraphStateService.php
 */

require_once __DIR__ . '/../cache/GraphStateCache.php';
require_once __DIR__ . '/DashboardSector1CService.php';

/**
 * Сервис для работы с графиком состояния
 */
class GraphStateService
{
    /**
     * Получение данных слепков с кешированием
     *
     * @param array $params Параметры запроса
     * @return array Данные слепков
     */
    public static function getSnapshotDataCached(array $params = []): array
    {
        $type = $params['type'] ?? 'current';
        $forceRefresh = $params['forceRefresh'] ?? false;
        $ttl = $params['ttl'] ?? 3600; // 1 час по умолчанию

        // Проверяем кеш
        if (!$forceRefresh) {
            $cachedData = GraphStateCache::getSnapshotData($type);
            if ($cachedData !== null) {
                error_log("[GraphStateService] Cache hit for snapshot data (type: {$type})");
                return $cachedData;
            }
        }

        // Загружаем данные слепков
        $snapshotData = self::loadSnapshotData($type, $forceRefresh);

        // Сохраняем в кеш
        GraphStateCache::setSnapshotData($snapshotData, $type, $ttl);
        error_log("[GraphStateService] Cache miss, snapshot data loaded and cached (type: {$type})");

        return $snapshotData;
    }

    /**
     * Загрузка данных слепков
     *
     * Использует DashboardSector1CService для получения данных сектора
     * и нормализует их в формат слепка
     *
     * @param string $type Тип слепка
     * @param bool $forceRefresh Принудительно обновить данные сектора
     * @return array Данные слепка
     */
    private static function loadSnapshotData(string $type, bool $forceRefresh = false): array
    {
        error_log("[GraphStateService] Loading snapshot data (type: {$type}, forceRefresh: " . ($forceRefresh ? 'true' : 'false') . ")");

        // Получаем данные сектора из DashboardSector1CService
        // При ручном создании кэша всегда обновляем данные сектора
        $sectorData = DashboardSector1CService::getSectorDataCached([
            'forceRefresh' => $forceRefresh, // Всегда обновляем данные сектора при forceRefresh
            'ttl' => 600
        ]);

        // Нормализуем данные в формат слепка
        $normalizedData = self::normalizeSectorDataToSnapshot($sectorData, $type);

        return $normalizedData;
    }

    /**
     * Нормализация данных сектора в формат слепка
     *
     * Преобразует данные сектора в формат, пригодный для создания слепков состояния
     *
     * @param array $sectorData Данные сектора
     * @param string $type Тип слепка
     * @return array Нормализованные данные слепка
     */
    private static function normalizeSectorDataToSnapshot(array $sectorData, string $type): array
    {
        $snapshot = [
            'meta' => [
                'type' => $type,
                'created_at' => date('c'),
                'version' => '1.0',
                'source' => 'sector_1c_data'
            ],
            'data' => [
                'stages' => [],
                'employees' => $sectorData['employees'] ?? [],
                'zeroPointTickets' => $sectorData['zeroPointTickets'] ?? [],
                'summary' => self::calculateSnapshotSummary($sectorData)
            ]
        ];

        // Нормализуем этапы
        $stages = $sectorData['stages'] ?? [];
        foreach ($stages as $stage) {
            $normalizedStage = [
                'id' => $stage['id'] ?? '',
                'name' => $stage['name'] ?? '',
                'bitrixId' => $stage['bitrixId'] ?? '',
                'employeeCount' => 0,
                'ticketCount' => 0,
                'employees' => []
            ];

            $employees = $stage['employees'] ?? [];
            foreach ($employees as $employeeData) {
                $employee = $employeeData['employee'] ?? [];
                $tickets = $employeeData['tickets'] ?? [];

                $normalizedEmployee = [
                    'id' => $employee['id'] ?? 0,
                    'name' => $employee['name'] ?? '',
                    'department' => $employee['department'] ?? null,
                    'ticketCount' => count($tickets),
                    'tickets' => array_map(function($ticket) {
                        return [
                            'id' => $ticket['id'] ?? 0,
                            'title' => $ticket['title'] ?? '',
                            'createdTime' => $ticket['createdTime'] ?? null,
                            'movedTime' => $ticket['movedTime'] ?? null
                        ];
                    }, $tickets)
                ];

                $normalizedStage['employees'][] = $normalizedEmployee;
                $normalizedStage['employeeCount']++;
                $normalizedStage['ticketCount'] += count($tickets);
            }

            $snapshot['data']['stages'][] = $normalizedStage;
        }

        return $snapshot;
    }

    /**
     * Расчёт сводных данных для слепка
     *
     * @param array $sectorData Данные сектора
     * @return array Сводные данные
     */
    private static function calculateSnapshotSummary(array $sectorData): array
    {
        $stages = $sectorData['stages'] ?? [];
        $employees = $sectorData['employees'] ?? [];
        $zeroPointTickets = $sectorData['zeroPointTickets'] ?? [];

        $totalTickets = 0;
        $totalEmployees = count($employees);
        $activeStages = 0;

        foreach ($stages as $stage) {
            $stageEmployees = $stage['employees'] ?? [];
            foreach ($stageEmployees as $employeeData) {
                $tickets = $employeeData['tickets'] ?? [];
                $totalTickets += count($tickets);
            }

            if (!empty($stageEmployees)) {
                $activeStages++;
            }
        }

        return [
            'totalTickets' => $totalTickets,
            'totalEmployees' => $totalEmployees,
            'activeStages' => $activeStages,
            'zeroPointTickets' => count($zeroPointTickets),
            'averageTicketsPerEmployee' => $totalEmployees > 0 ? round($totalTickets / $totalEmployees, 2) : 0,
            'timestamp' => time()
        ];
    }

    /**
     * Создание нового слепка состояния
     *
     * Принудительно обновляет данные и сохраняет новый слепок
     *
     * @param string $type Тип слепка
     * @param int $ttl TTL для кеша
     * @return array Созданный слепок
     */
    public static function createNewSnapshot(string $type = 'current', int $ttl = 3600): array
    {
        // Принудительно обновляем данные сектора
        $sectorData = DashboardSector1CService::getSectorDataCached([
            'forceRefresh' => true,
            'ttl' => 600
        ]);

        // Создаём новый слепок
        $snapshotData = self::normalizeSectorDataToSnapshot($sectorData, $type);

        // Сохраняем в кеш
        GraphStateCache::setSnapshotData($snapshotData, $type, $ttl);

        error_log("[GraphStateService] New snapshot created (type: {$type})");

        return $snapshotData;
    }

    /**
     * Получение всех доступных типов слепков
     *
     * @return array Список доступных типов
     */
    public static function getAvailableSnapshotTypes(): array
    {
        return GraphStateCache::getAvailableTypes();
    }

    /**
     * Инвалидация кеша по типу
     *
     * @param string $type Тип для инвалидации
     * @return bool true при успешной инвалидации
     */
    public static function invalidateCacheByType(string $type): bool
    {
        return GraphStateCache::invalidateByType($type);
    }

    /**
     * Получение статистики кеша
     *
     * @return array Статистика кеша
     */
    public static function getCacheStats(): array
    {
        return GraphStateCache::getCacheStats();
    }

    /**
     * Очистка кеша графика состояния
     *
     * @return bool true при успешной очистке
     */
    public static function clearGraphStateCache(): bool
    {
        return GraphStateCache::clearGraphStateCache();
    }

    /**
     * Проверка доступности данных
     *
     * @return bool true если данные доступны
     */
    public static function isDataAvailable(): bool
    {
        try {
            $data = self::getSnapshotDataCached(['type' => 'current']);
            return !empty($data);
        } catch (\Exception $e) {
            error_log("[GraphStateService] Data availability check failed: " . $e->getMessage());
            return false;
        }
    }
}