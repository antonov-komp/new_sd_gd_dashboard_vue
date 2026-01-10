<?php
/**
 * Backend сервис для работы с дашбордом сектора 1С
 *
 * TASK-082: Реализация backend кеширования для Dashboard Sector 1C
 *
 * Реализует логику получения данных сектора 1С аналогично frontend версии,
 * но с backend кешированием через DashboardSector1CCache.
 *
 * Расположение: api/services/DashboardSector1CService.php
 */

require_once __DIR__ . '/../cache/DashboardSector1CCache.php';
require_once '/var/www/app/public/rest_api_aps/sd_it_gen_plan/crest.php';

/**
 * Сервис для работы с дашбордом сектора 1С
 */
class DashboardSector1CService
{
    /**
     * Константы для работы с Bitrix24
     */
    private const ENTITY_TYPE_ID = 140;
    private const SECTOR_TAG = '1C';
    private const ALT_SECTOR_TAGS = ['1С']; // Кириллица "С"

    /**
     * Стадии смарт-процесса
     */
    private const STAGES = [
        'formed' => 'DT140_12:UC_0VHWE2',
        'review' => 'DT140_12:PREPARATION',
        'execution' => 'DT140_12:CLIENT'
    ];

    /**
     * Получение данных сектора 1С с кешированием
     *
     * Основная логика аналогична frontend версии:
     * 1. Проверка кеша
     * 2. Загрузка данных из Bitrix24 при отсутствии кеша
     * 3. Сохранение в кеш
     *
     * @param array $params Параметры запроса
     * @return array Данные сектора (stages, employees, zeroPointTickets)
     */
    public static function getSectorDataCached(array $params = []): array
    {
        $forceRefresh = $params['forceRefresh'] ?? false;
        $ttl = $params['ttl'] ?? 600; // 10 минут по умолчанию
        $cacheWasCreated = false;

        // Проверяем кеш
        if (!$forceRefresh) {
            $cachedData = DashboardSector1CCache::getSectorData();
            if ($cachedData !== null) {
                error_log("[DashboardSector1CService] Cache hit for sector data");
                return [
                    'data' => $cachedData,
                    'cache_hit' => true,
                    'cache_created' => false
                ];
            }
        }

        // Загружаем данные из Bitrix24
        $sectorData = self::loadSectorDataFromBitrix();

        // Сохраняем в кеш
        DashboardSector1CCache::setSectorData($sectorData, $ttl);
        error_log("[DashboardSector1CService] Cache miss, data loaded and cached");
        $cacheWasCreated = true;

        return [
            'data' => $sectorData,
            'cache_hit' => false,
            'cache_created' => $cacheWasCreated
        ];
    }

    /**
     * Загрузка данных сектора из Bitrix24
     *
     * Реализует логику аналогичную frontend версии:
     * - Получение всех тикетов с пагинацией
     * - Фильтрация по сектору 1С
     * - Получение данных сотрудников
     * - Группировка по этапам и сотрудникам
     *
     * @return array Данные сектора
     */
    private static function loadSectorDataFromBitrix(): array
    {
        error_log("[DashboardSector1CService] Starting data load from Bitrix24");

        // Получаем все тикеты с пагинацией
        $allTickets = self::loadAllTickets();
        error_log("[DashboardSector1CService] Loaded " . count($allTickets) . " tickets from Bitrix24");

        // Фильтруем тикеты по сектору 1С
        $filteredTickets = self::filterTicketsBySector($allTickets);
        error_log("[DashboardSector1CService] Filtered " . count($filteredTickets) . " tickets for sector 1C");

        // Извлекаем уникальных сотрудников
        $uniqueEmployeeIds = self::extractUniqueEmployeeIds($filteredTickets);
        error_log("[DashboardSector1CService] Found " . count($uniqueEmployeeIds) . " unique employees");

        // Получаем данные сотрудников
        $employees = self::loadEmployeesData($uniqueEmployeeIds);
        error_log("[DashboardSector1CService] Loaded data for " . count($employees) . " employees");

        // Группируем тикеты по этапам и сотрудникам
        $stages = self::groupTicketsByStages($filteredTickets, $employees);
        $zeroPointTickets = self::getZeroPointTickets($filteredTickets);

        return [
            'stages' => $stages,
            'employees' => $employees,
            'zeroPointTickets' => $zeroPointTickets
        ];
    }

    /**
     * Загрузка всех тикетов с пагинацией
     *
     * @return array Все тикеты
     */
    private static function loadAllTickets(): array
    {
        $allTickets = [];
        $targetStages = array_values(self::STAGES);

        // Загружаем тикеты для каждой стадии
        foreach ($targetStages as $stageId) {
            $stageTickets = self::loadTicketsByStage($stageId);
            $allTickets = array_merge($allTickets, $stageTickets);
        }

        return $allTickets;
    }

    /**
     * Загрузка тикетов по конкретной стадии
     *
     * @param string $stageId ID стадии Bitrix24
     * @return array Тикеты стадии
     */
    private static function loadTicketsByStage(string $stageId): array
    {
        $tickets = [];
        $start = 0;
        $pageSize = 50; // Размер страницы

        while (true) {
            $params = [
                'entityTypeId' => self::ENTITY_TYPE_ID,
                'select' => [
                    'id', 'title', 'stageId', 'assignedById', 'createdTime', 'movedTime',
                    'UF_CRM_7_TYPE_PRODUCT', 'uf_crm_7_type_product'
                ],
                'filter' => [
                    'stageId' => $stageId
                ],
                'order' => ['id' => 'DESC'],
                'start' => $start
            ];

            $result = CRest::call('crm.item.list', $params);

            if (!$result || !isset($result['result'])) {
                break;
            }

            $batchTickets = $result['result'];
            if (empty($batchTickets)) {
                break;
            }

            $tickets = array_merge($tickets, $batchTickets);
            $start += $pageSize;

            // Проверяем, есть ли еще данные
            if (!isset($result['next']) || $result['next'] <= 0) {
                break;
            }

            // Ограничение на количество итераций для безопасности
            if ($start > 10000) {
                error_log("[DashboardSector1CService] Reached maximum pagination limit");
                break;
            }
        }

        return $tickets;
    }

    /**
     * Фильтрация тикетов по сектору 1С
     *
     * @param array $tickets Массив тикетов
     * @return array Отфильтрованные тикеты
     */
    private static function filterTicketsBySector(array $tickets): array
    {
        return array_filter($tickets, function($ticket) {
            return self::isTicketInSector($ticket);
        });
    }

    /**
     * Проверка, принадлежит ли тикет сектору 1С
     *
     * @param array $ticket Тикет
     * @return bool true если тикет принадлежит сектору 1С
     */
    private static function isTicketInSector(array $ticket): bool
    {
        $tagValue = $ticket['UF_CRM_7_TYPE_PRODUCT'] ??
                   $ticket['uf_crm_7_type_product'] ??
                   $ticket['ufCrm7TypeProduct'] ?? null;

        if (!$tagValue) {
            return false;
        }

        $normalizedValues = self::normalizeTagValue($tagValue);

        return in_array(self::SECTOR_TAG, $normalizedValues) ||
               !empty(array_intersect($normalizedValues, self::ALT_SECTOR_TAGS));
    }

    /**
     * Нормализация значения тега сектора
     *
     * @param mixed $value Сырое значение
     * @return array Нормализованные значения
     */
    private static function normalizeTagValue($value): array
    {
        if (!$value) {
            return [];
        }

        if (is_array($value)) {
            return array_map(function($item) {
                return self::normalizeTagString($item);
            }, array_filter($value));
        }

        if (is_object($value) && isset($value->value)) {
            $normalized = self::normalizeTagString($value->value);
            return $normalized ? [$normalized] : [];
        }

        $normalized = self::normalizeTagString($value);
        if (!$normalized) {
            return [];
        }

        return array_map('trim', array_filter(explode(',', $normalized)));
    }

    /**
     * Нормализация строки тега
     *
     * @param mixed $value Значение
     * @return string|null Нормализованная строка или null
     */
    private static function normalizeTagString($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $str = trim(strtoupper((string)$value));
        $str = str_replace('С', 'C', $str); // Кириллица -> латиница

        return $str ?: null;
    }

    /**
     * Извлечение уникальных ID сотрудников из тикетов
     *
     * @param array $tickets Массив тикетов
     * @return array Уникальные ID сотрудников
     */
    private static function extractUniqueEmployeeIds(array $tickets): array
    {
        $employeeIds = [];

        foreach ($tickets as $ticket) {
            $assignedById = $ticket['assignedById'] ?? null;
            if ($assignedById && !in_array($assignedById, $employeeIds)) {
                $employeeIds[] = $assignedById;
            }
        }

        return $employeeIds;
    }

    /**
     * Загрузка данных сотрудников
     *
     * @param array $employeeIds ID сотрудников
     * @return array Данные сотрудников
     */
    private static function loadEmployeesData(array $employeeIds): array
    {
        if (empty($employeeIds)) {
            return [];
        }

        $employees = [];
        $chunks = array_chunk($employeeIds, 50); // Ограничение API

        foreach ($chunks as $chunk) {
            $params = [
                'filter' => ['ID' => $chunk],
                'select' => ['ID', 'NAME', 'LAST_NAME', 'UF_DEPARTMENT']
            ];

            $result = CRest::call('user.get', $params);

            if ($result && isset($result['result'])) {
                $employees = array_merge($employees, $result['result']);
            }
        }

        // Нормализуем данные сотрудников
        return array_map(function($employee) {
            return [
                'id' => (int)$employee['ID'],
                'name' => trim(($employee['NAME'] ?? '') . ' ' . ($employee['LAST_NAME'] ?? '')),
                'department' => $employee['UF_DEPARTMENT'] ?? null
            ];
        }, $employees);
    }

    /**
     * Группировка тикетов по этапам и сотрудникам
     *
     * @param array $tickets Тикеты
     * @param array $employees Сотрудники
     * @return array Сгруппированные данные
     */
    private static function groupTicketsByStages(array $tickets, array $employees): array
    {
        $stages = [];
        $employeeMap = array_column($employees, null, 'id');

        // Инициализируем этапы
        foreach (self::STAGES as $stageName => $stageBitrixId) {
            $stages[$stageName] = [
                'id' => $stageName,
                'name' => self::getStageDisplayName($stageName),
                'bitrixId' => $stageBitrixId,
                'employees' => []
            ];
        }

        // Группируем тикеты
        foreach ($tickets as $ticket) {
            $stageBitrixId = $ticket['stageId'] ?? '';
            $stageName = self::getStageNameByBitrixId($stageBitrixId);
            $employeeId = $ticket['assignedById'] ?? null;

            if (!$stageName || !$employeeId) {
                continue;
            }

            if (!isset($stages[$stageName]['employees'][$employeeId])) {
                $employee = $employeeMap[$employeeId] ?? [
                    'id' => $employeeId,
                    'name' => 'Неизвестный сотрудник',
                    'department' => null
                ];

                $stages[$stageName]['employees'][$employeeId] = [
                    'employee' => $employee,
                    'tickets' => []
                ];
            }

            $stages[$stageName]['employees'][$employeeId]['tickets'][] = [
                'id' => (int)$ticket['id'],
                'title' => $ticket['title'] ?? '',
                'createdTime' => $ticket['createdTime'] ?? null,
                'movedTime' => $ticket['movedTime'] ?? null
            ];
        }

        // Преобразуем в массивы для совместимости
        foreach ($stages as &$stage) {
            $stage['employees'] = array_values($stage['employees']);
        }

        return array_values($stages);
    }

    /**
     * Получение тикетов без назначения (zero point)
     *
     * @param array $tickets Все тикеты сектора
     * @return array Тикеты без назначения
     */
    private static function getZeroPointTickets(array $tickets): array
    {
        return array_filter($tickets, function($ticket) {
            return empty($ticket['assignedById']);
        });
    }

    /**
     * Получение отображаемого имени этапа
     *
     * @param string $stageName Внутреннее имя этапа
     * @return string Отображаемое имя
     */
    private static function getStageDisplayName(string $stageName): string
    {
        $names = [
            'formed' => 'Сформировано обращение',
            'review' => 'Рассмотрение ТЗ',
            'execution' => 'Исполнение'
        ];

        return $names[$stageName] ?? $stageName;
    }

    /**
     * Получение внутреннего имени этапа по Bitrix24 ID
     *
     * @param string $bitrixId ID этапа в Bitrix24
     * @return string|null Внутреннее имя этапа или null
     */
    private static function getStageNameByBitrixId(string $bitrixId): ?string
    {
        $stageMap = array_flip(self::STAGES);
        return $stageMap[$bitrixId] ?? null;
    }

    /**
     * Получение статистики кеша
     *
     * @return array Статистика кеша
     */
    public static function getCacheStats(): array
    {
        return DashboardSector1CCache::getCacheStats();
    }

    /**
     * Очистка кеша сектора
     *
     * @return bool true при успешной очистке
     */
    public static function clearSectorCache(): bool
    {
        return DashboardSector1CCache::clearSectorCache();
    }
}