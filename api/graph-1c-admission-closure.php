<?php
/**
 * API endpoint: График приёма и закрытий сектора 1С
 *
 * Реализует контракт из TASK-041-02:
 * - Неделя ISO-8601 (пн–вс), расчёт в UTC.
 * - product=1C фильтруется первым шагом.
 * - Закрывающие стадии: DT140_12:SUCCESS, DT140_12:FAIL, DT140_12:UC_0GBU8Z.
 * - Ответ: meta + data (newTickets, closedTickets, series, stages, responsible).
 *
 * Примечание: минимальная реализация напрямую читает Bitrix24 через CRest.
 * При необходимости можно заменить на кеш/логи.
 */

require_once __DIR__ . '/../crest.php';

header('Content-Type: application/json; charset=utf-8');

function jsonResponse($data)
{
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function parseJsonBody(): array
{
    $input = file_get_contents('php://input');
    if (!$input) {
        return [];
    }
    $decoded = json_decode($input, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Возвращает границы текущей ISO-недели (UTC) если не переданы в запросе.
 */
function getWeekBounds(?string $start, ?string $end): array
{
    $tz = new DateTimeZone('UTC');

    if ($start && $end) {
        return [
            new DateTimeImmutable($start, $tz),
            new DateTimeImmutable($end, $tz)
        ];
    }

    $now = new DateTimeImmutable('now', $tz);
    $isoYear = (int)$now->format('o');
    $isoWeek = (int)$now->format('W');

    $weekStart = (new DateTimeImmutable('now', $tz))
        ->setISODate($isoYear, $isoWeek, 1)
        ->setTime(0, 0, 0);
    $weekEnd = $weekStart
        ->modify('+6 days')
        ->setTime(23, 59, 59);

    return [$weekStart, $weekEnd];
}

/**
 * Вычисляет границы 4 недель (текущая + 3 предыдущие) по ISO-8601
 * 
 * @param DateTimeImmutable $currentWeekStart Начало текущей недели
 * @param DateTimeImmutable $currentWeekEnd Конец текущей недели
 * @return array Массив с информацией о 4 неделях (от старых к новым)
 */
function getFourWeeksBounds(DateTimeImmutable $currentWeekStart, DateTimeImmutable $currentWeekEnd): array
{
    $weeks = [];
    
    for ($i = 0; $i < 4; $i++) {
        $weekStart = clone $currentWeekStart;
        $weekStart = $weekStart->modify("-{$i} weeks");
        
        // Убеждаемся, что неделя начинается с понедельника
        $isoYear = (int)$weekStart->format('o');
        $isoWeek = (int)$weekStart->format('W');
        $weekStart = $weekStart->setISODate($isoYear, $isoWeek, 1)->setTime(0, 0, 0);
        
        $weekEnd = clone $weekStart;
        $weekEnd = $weekEnd->modify('+6 days')->setTime(23, 59, 59);
        
        $weeks[] = [
            'weekNumber' => (int)$weekStart->format('W'),
            'weekStartUtc' => $weekStart->format('Y-m-d\TH:i:s\Z'),
            'weekEndUtc' => $weekEnd->format('Y-m-d\TH:i:s\Z'),
            'weekStart' => $weekStart,
            'weekEnd' => $weekEnd
        ];
    }
    
    // Возвращаем от старых к новым (неделя 47, 48, 49, 50)
    return array_reverse($weeks);
}

/**
 * Проверка попадания даты в интервал [start, end]
 */
function isInRange(?string $dateStr, DateTimeImmutable $start, DateTimeImmutable $end): bool
{
    if (!$dateStr) {
        return false;
    }
    $ts = strtotime($dateStr);
    if ($ts === false) {
        return false;
    }
    $dt = (new DateTimeImmutable('@' . $ts))->setTimezone(new DateTimeZone('UTC'));
    return $dt >= $start && $dt <= $end;
}

/**
 * Подсчитывает метрики для конкретной недели
 * 
 * @param DateTimeImmutable $weekStart Начало недели
 * @param DateTimeImmutable $weekEnd Конец недели
 * @param array $allTickets Все тикеты (для фильтрации)
 * @param array $targetStages Рабочие стадии
 * @param array $closingStages Закрывающие стадии
 * @param int $keeperId ID хранителя объектов
 * @return array Метрики недели
 */
function calculateWeekMetrics(
    DateTimeImmutable $weekStart,
    DateTimeImmutable $weekEnd,
    array $allTickets,
    array $targetStages,
    array $closingStages,
    int $keeperId
): array {
    $newCount = 0;
    $closedCount = 0;
    $closedTicketsCreatedThisWeek = 0;
    $closedTicketsCreatedOtherWeek = 0;
    $carryoverCount = 0;
    $carryoverTicketsCreatedThisWeek = 0;
    $carryoverTicketsCreatedOtherWeek = 0;
    
    $weekStartStr = $weekStart->format('Y-m-d H:i:s');
    $weekEndStr = $weekEnd->format('Y-m-d H:i:s');
    
    foreach ($allTickets as $ticket) {
        $createdTime = $ticket['createdTime'] ?? null;
        $movedTime = $ticket['movedTime'] ?? $ticket['updatedTime'] ?? null;
        $stageId = $ticket['stageId'] ?? null;
        $stageId = $stageId ? strtoupper($stageId) : null;
        
        // Новые за неделю
        if (isInRange($createdTime, $weekStart, $weekEnd)) {
            $newCount++;
        }
        
        // Закрытые за неделю
        if ($stageId && in_array($stageId, $closingStages, true) && isInRange($movedTime, $weekStart, $weekEnd)) {
            $closedCount++;
            
            // Разбивка по критерию создания
            $createdInThisWeek = isInRange($createdTime, $weekStart, $weekEnd);
            if ($createdInThisWeek) {
                $closedTicketsCreatedThisWeek++;
            } else {
                $closedTicketsCreatedOtherWeek++;
            }
        }
        
        // Переходящие тикеты (в рабочих стадиях, не закрытые)
        if (isCarryoverTicket($ticket, $weekStart, $weekEnd, $targetStages, $closingStages)) {
            $carryoverCount++;
            
            // Разбивка по критерию создания
            $createdInThisWeek = isInRange($createdTime, $weekStart, $weekEnd);
            if ($createdInThisWeek) {
                $carryoverTicketsCreatedThisWeek++;
            } else {
                $carryoverTicketsCreatedOtherWeek++;
            }
        }
    }
    
    return [
        'newTickets' => $newCount,
        'closedTickets' => $closedCount,
        'closedTicketsCreatedThisWeek' => $closedTicketsCreatedThisWeek,
        'closedTicketsCreatedOtherWeek' => $closedTicketsCreatedOtherWeek,
        'carryoverTickets' => $carryoverCount,
        'carryoverTicketsCreatedThisWeek' => $carryoverTicketsCreatedThisWeek,
        'carryoverTicketsCreatedOtherWeek' => $carryoverTicketsCreatedOtherWeek
    ];
}

/**
 * Определение категории срока для переходящего тикета
 * 
 * Срок считается от weekStartUtc (начала текущего периода) до createdTime (даты создания тикета).
 * 
 * @param string $createdTime Дата создания тикета (ISO-8601)
 * @param DateTimeImmutable $weekStart Начало недели (UTC)
 * @return string Категория срока: up_to_month, less_than_month, more_than_month, more_than_2_months, more_than_half_year, more_than_year
 */
function calculateDurationCategory(string $createdTime, DateTimeImmutable $weekStart): string
{
    $ts = strtotime($createdTime);
    if ($ts === false) {
        return 'up_to_month'; // По умолчанию, если дата некорректна
    }
    
    $createdDt = (new DateTimeImmutable('@' . $ts))->setTimezone(new DateTimeZone('UTC'));
    $diff = $weekStart->diff($createdDt);
    $days = (int)$diff->format('%a'); // Количество дней
    
    if ($days < 14) {
        return 'up_to_month'; // До 1 месяца (0-13 дней)
    } elseif ($days < 30) {
        return 'less_than_month'; // Менее 1 месяца (14-29 дней)
    } elseif ($days < 60) {
        return 'more_than_month'; // Более 1 месяца (30-59 дней)
    } elseif ($days < 180) {
        return 'more_than_2_months'; // Более 2 месяцев (60-179 дней)
    } elseif ($days < 365) {
        return 'more_than_half_year'; // Более полугода (180-364 дня)
    } else {
        return 'more_than_year'; // Более года (≥365 дней)
    }
}

/**
 * Проверка, является ли тикет переходящим для конкретной недели
 * 
 * Переходящий тикет для недели — это тикет, который:
 * 1. Находится в рабочих стадиях (targetStages)
 * 2. Не в закрывающих стадиях (closingStages)
 * 3. Не был закрыт до начала этой недели (movedTime в закрывающей стадии < weekStart)
 * 
 * TASK-048: Обновлено для работы с каждой неделей отдельно
 * 
 * @param array $ticket Данные тикета
 * @param DateTimeImmutable $weekStart Начало недели (UTC)
 * @param DateTimeImmutable $weekEnd Конец недели (UTC)
 * @param array $targetStages Рабочие стадии
 * @param array $closingStages Закрывающие стадии
 * @return bool
 */
function isCarryoverTicket(array $ticket, DateTimeImmutable $weekStart, DateTimeImmutable $weekEnd, array $targetStages, array $closingStages): bool
{
    $createdTime = $ticket['createdTime'] ?? null;
    $movedTime = $ticket['movedTime'] ?? $ticket['updatedTime'] ?? null;
    $stageId = $ticket['stageId'] ?? null;
    
    if (!$stageId) {
        return false;
    }
    
    // Нормализация stageId
    $stageId = strtoupper($stageId);
    
    // Условие 1: Находится в рабочих стадиях
    if (!in_array($stageId, $targetStages, true)) {
        return false; // Не в рабочей стадии
    }
    
    // Условие 2: Не в закрывающих стадиях
    if (in_array($stageId, $closingStages, true)) {
        return false; // В закрывающей стадии
    }
    
    // TASK-048: Условие 3: Тикет не должен быть закрыт до начала этой недели
    // Если movedTime в закрывающей стадии и movedTime < weekStart, то тикет был закрыт до начала недели
    // Но мы не знаем историю, поэтому проверяем только текущее состояние
    // Если тикет в рабочей стадии и не в закрывающей - он переходящий
    
    // TASK-047: Переходящие тикеты - это все не закрытые тикеты в рабочих стадиях
    // (независимо от даты создания - включаем и созданные этой неделей, и созданные ранее)
    return true;
}

try {
    $body = parseJsonBody();

    $product = isset($body['product']) ? (string)$body['product'] : '1C';
    $weekStartParam = isset($body['weekStartUtc']) ? (string)$body['weekStartUtc'] : null;
    $weekEndParam = isset($body['weekEndUtc']) ? (string)$body['weekEndUtc'] : null;
    $includeTickets = isset($body['includeTickets']) ? (bool)$body['includeTickets'] : false;
    $includeNewTicketsByStages = isset($body['includeNewTicketsByStages']) ? (bool)$body['includeNewTicketsByStages'] : false;
    $includeCarryoverTickets = isset($body['includeCarryoverTickets']) ? (bool)$body['includeCarryoverTickets'] : false;
    $includeCarryoverTicketsByDuration = isset($body['includeCarryoverTicketsByDuration']) ? (bool)$body['includeCarryoverTicketsByDuration'] : false;
    $debug = isset($body['debug']) ? (bool)$body['debug'] : false;

    // Границы недели
    [$weekStart, $weekEnd] = getWeekBounds($weekStartParam, $weekEndParam);
    
    // TASK-048: Получаем границы 4 недель (текущая + 3 предыдущие)
    $weeks = getFourWeeksBounds($weekStart, $weekEnd);
    $firstWeekStart = $weeks[0]['weekStart']; // Самая старая неделя
    $lastWeekEnd = $weeks[count($weeks) - 1]['weekEnd']; // Текущая неделя

    // Опорные значения (совпадают с модулями 1/2), но выборку делаем по всем стадиям,
    // чтобы не потерять новые тикеты, которые появляются вне targetStages.
    $targetStages = [
        'DT140_12:UC_0VHWE2',   // formed
        'DT140_12:PREPARATION', // review
        'DT140_12:CLIENT'       // execution
    ];
    $closingStages = [
        'DT140_12:SUCCESS',
        'DT140_12:FAIL',
        'DT140_12:UC_0GBU8Z'
    ];
    $keeperId = 1051; // KEEPER_OBJECTS_ID

    // Запрос элементов смарт-процесса 140
    // Стратегия: запрашиваем тикеты, которые либо созданы в неделю, либо закрыты в неделю
    $entityTypeId = 140;
    $pageSize = 50;
    $start = 0;
    $tickets = [];
    $debugRaw = [];
    
    // TASK-048: Форматируем даты для фильтра Bitrix24 за весь период 4 недель
    $periodStartStr = $firstWeekStart->format('Y-m-d H:i:s');
    $periodEndStr = $lastWeekEnd->format('Y-m-d H:i:s');
    
    // Для обратной совместимости (используется в некоторых местах)
    $weekStartStr = $weekStart->format('Y-m-d H:i:s');
    $weekEndStr = $weekEnd->format('Y-m-d H:i:s');

    // Запрос 1: тикеты, созданные в неделю (для новых)
    // Запрос 2: тикеты, закрытые в неделю (movedTime в неделе + закрывающие стадии)
    // Объединяем оба запроса
    
    $allTicketsMap = []; // Используем map по ID, чтобы избежать дублей
    
    // TASK-048: Запрос тикетов, созданных за период 4 недель
    $start = 0;
    do {
        $result = CRest::call('crm.item.list', [
            'entityTypeId' => $entityTypeId,
            'filter' => [
                '>=createdTime' => $periodStartStr,
                '<=createdTime' => $periodEndStr
            ],
            'select' => [
                'id',
                'title',
                'stageId',
                'assignedById',
                'createdTime',
                'updatedTime',
                'movedTime',
                'UF_CRM_7_TYPE_PRODUCT',
                'ufCrm7TypeProduct'
            ],
            'start' => $start
        ]);

        if (isset($result['error'])) {
            throw new Exception($result['error_description'] ?? $result['error']);
        }

        $items = $result['result']['items'] ?? [];
        foreach ($items as $item) {
            $allTicketsMap[$item['id']] = $item;
        }

        $start += $pageSize;
    } while (isset($result['result']['next']));
    
    // TASK-048: Запрос тикетов, закрытых за период 4 недель (movedTime в периоде + закрывающие стадии)
    $start = 0;
    do {
        $result = CRest::call('crm.item.list', [
            'entityTypeId' => $entityTypeId,
            'filter' => [
                '>=movedTime' => $periodStartStr,
                '<=movedTime' => $periodEndStr,
                'stageId' => $closingStages
            ],
            'select' => [
                'id',
                'title',
                'stageId',
                'assignedById',
                'createdTime',
                'updatedTime',
                'movedTime',
                'UF_CRM_7_TYPE_PRODUCT',
                'ufCrm7TypeProduct'
            ],
            'start' => $start
        ]);

        if (isset($result['error'])) {
            throw new Exception($result['error_description'] ?? $result['error']);
        }

        $items = $result['result']['items'] ?? [];
        foreach ($items as $item) {
            $allTicketsMap[$item['id']] = $item;
        }

        $start += $pageSize;
    } while (isset($result['result']['next']));
    
    // TASK-048: Запрос 3: переходящие тикеты (в рабочих стадиях на момент любой из 4 недель)
    // Запрашиваем только если includeCarryoverTickets === true
    // ВАЖНО: Запрашиваем ВСЕ тикеты в рабочих стадиях (без фильтра по createdTime),
    // затем фильтруем на PHP для каждой недели отдельно
    if ($includeCarryoverTickets) {
        $carryoverQueryCount = 0; // Счётчик для отладки
        $carryoverByStageBeforeFilter = [];
        $carryoverByStageAfterFilter = [];
        
        error_log("[CARRYOVER] Начало загрузки переходящих тикетов. periodStart: {$periodStartStr}, periodEnd: {$periodEndStr}");
        
        // Запрашиваем ВСЕ тикеты для каждой рабочей стадии отдельно (без фильтра по createdTime)
        // Это нужно для того, чтобы получить все переходящие тикеты, которые могут быть в рабочих стадиях
        // на момент любой из 4 недель
        foreach ($targetStages as $stageId) {
            $start = 0;
            $pageNum = 0;
            $hasMore = true;
            $stageTotalBeforeFilter = 0;
            $stageTotalAfterFilter = 0;
            
            error_log("[CARRYOVER] Стадия: {$stageId}");
            
            while ($hasMore) {
                $result = CRest::call('crm.item.list', [
                    'entityTypeId' => $entityTypeId,
                    'filter' => [
                        'stageId' => $stageId  // Фильтр только по стадии, БЕЗ фильтра по createdTime
                    ],
                    'select' => [
                        'id',
                        'title',
                        'stageId',
                        'assignedById',
                        'createdTime',
                        'updatedTime',
                        'movedTime',
                        'UF_CRM_7_TYPE_PRODUCT',
                        'ufCrm7TypeProduct'
                    ],
                    'start' => $start
                ]);

                if (isset($result['error'])) {
                    throw new Exception($result['error_description'] ?? $result['error']);
                }

                $items = $result['result']['items'] ?? [];
                $carryoverQueryCount += count($items);
                $pageNum++;
                $stageTotalBeforeFilter += count($items);
                
                $nextValue = $result['result']['next'] ?? $result['next'] ?? null;
                error_log("[CARRYOVER] Стадия {$stageId}, Страница {$pageNum}: загружено " . count($items) . " тикетов, start={$start}, next=" . ($nextValue ?? 'null'));
                
                // Отладочная информация для каждой страницы
                if ($debug) {
                    $debugRaw['carryover_stage_' . $stageId . '_page_' . $pageNum] = [
                        'start' => $start,
                        'items_count' => count($items),
                        'next' => $nextValue
                    ];
                }
                
                foreach ($items as $item) {
                    // TASK-048: Добавляем все тикеты в рабочих стадиях (без фильтра по createdTime)
                    // Фильтрация по неделям будет происходить в calculateWeekMetrics() для каждой недели отдельно
                    // Это позволяет учитывать переходящие тикеты, которые могут быть созданы в любой момент
                    if (!isset($allTicketsMap[$item['id']])) {
                        $allTicketsMap[$item['id']] = $item;
                        $stageTotalAfterFilter++;
                    }
                }

                // Улучшенная проверка наличия следующей страницы
                // Bitrix24 может возвращать next в разных форматах
                $hasNext = $nextValue !== null && 
                          $nextValue !== '' && 
                          $nextValue !== '0' && 
                          (int)$nextValue > 0;
                
                // Продолжаем загрузку, если:
                // 1. Получили полный батч (pageSize) И есть next - точно есть ещё данные
                // 2. Если получили меньше pageSize - это последняя страница (даже если есть next)
                $hasMore = count($items) === $pageSize && $hasNext;
                
                if (!$hasMore) {
                    error_log("[CARRYOVER] Стадия {$stageId}: пагинация завершена (получено " . count($items) . " тикетов, hasNext=" . ($hasNext ? 'true' : 'false') . ")");
                }
                
                $start += $pageSize;
            }
            
            $carryoverByStageBeforeFilter[$stageId] = $stageTotalBeforeFilter;
            $carryoverByStageAfterFilter[$stageId] = $stageTotalAfterFilter;
            error_log("[CARRYOVER] Стадия {$stageId} завершена: всего загружено {$stageTotalBeforeFilter}, после фильтра по createdTime: {$stageTotalAfterFilter}");
        }
        
        error_log("[CARRYOVER] Всего загружено тикетов: {$carryoverQueryCount}");
        error_log("[CARRYOVER] Уникальных тикетов в allTicketsMap (после фильтра по createdTime): " . count($allTicketsMap));
        
        // Отладочная информация (всегда выводим в консоль)
        error_log("[CARRYOVER] Статистика по стадиям (до фильтра по createdTime): " . json_encode($carryoverByStageBeforeFilter, JSON_UNESCAPED_UNICODE));
        error_log("[CARRYOVER] Статистика по стадиям (после фильтра по createdTime): " . json_encode($carryoverByStageAfterFilter, JSON_UNESCAPED_UNICODE));
        
        if ($debug) {
            $debugRaw['carryover_query_total'] = $carryoverQueryCount;
            $debugRaw['carryover_query_unique_before_filter'] = count($allTicketsMap);
            $debugRaw['carryover_by_stage_before_filter'] = $carryoverByStageBeforeFilter;
            $debugRaw['carryover_by_stage_after_filter'] = $carryoverByStageAfterFilter;
        }
    }
    
    // Преобразуем map в массив
    $allTickets = array_values($allTicketsMap);

    // Фильтруем по product=1C (первым шагом, как в модулях 1/2)
    $ticketsBeforeProductFilter = count($allTickets);
    error_log("[CARRYOVER] Тикетов до фильтра по продукту 1C: {$ticketsBeforeProductFilter}");
    
    foreach ($allTickets as $item) {
        // Фильтр product первым шагом
        $tagRaw = $item['UF_CRM_7_TYPE_PRODUCT'] ?? $item['ufCrm7TypeProduct'] ?? null;
        $tags = [];
        if (is_array($tagRaw)) {
            $tags = $tagRaw;
        } elseif (is_string($tagRaw)) {
            $parts = array_map('trim', explode(',', $tagRaw));
            $tags = $parts;
        }
        $normalized = array_map(function ($v) {
            return mb_strtoupper(str_replace('С', 'C', trim((string)$v)));
        }, $tags);
        $is1C = in_array('1C', $normalized, true);
        if (!$is1C && mb_strtoupper($product) === '1C') {
            continue;
        }

        if ($debug && count($debugRaw) < 10) {
            $debugRaw[] = $item;
        }
        $tickets[] = $item;
    }
    
    $ticketsAfterProductFilter = count($tickets);
    error_log("[CARRYOVER] Тикетов после фильтра по продукту 1C: {$ticketsAfterProductFilter}");

    // Определение всех стадий с названиями и цветами
    $allStages = [
        'DT140_12:UC_0VHWE2' => ['name' => 'Сформировано обращение', 'color' => '#007bff'],
        'DT140_12:PREPARATION' => ['name' => 'Рассмотрение ТЗ', 'color' => '#ffc107'],
        'DT140_12:CLIENT' => ['name' => 'Исполнение', 'color' => '#28a745'],
        'DT140_12:SUCCESS' => ['name' => 'Успешное закрытие', 'color' => '#28a745'],
        'DT140_12:FAIL' => ['name' => 'Отклонено', 'color' => '#dc3545'],
        'DT140_12:UC_0GBU8Z' => ['name' => 'Закрыли без задачи', 'color' => '#6c757d']
    ];
    
    // Определение всех категорий сроков с названиями и цветами (TASK-044-04)
    // Порядок важен: от меньшего к большему сроку
    $durationCategories = [
        'up_to_month' => [
            'label' => 'До 1 месяца',
            'color' => '#28a745' // Зелёный (свежие тикеты, 0-13 дней)
        ],
        'less_than_month' => [
            'label' => 'Менее 1 месяца',
            'color' => '#6cbd45' // Светло-зелёный (14-29 дней)
        ],
        'more_than_month' => [
            'label' => 'Более 1 месяца',
            'color' => '#ffc107' // Жёлтый (30-59 дней)
        ],
        'more_than_2_months' => [
            'label' => 'Более 2 месяцев',
            'color' => '#ff9800' // Оранжевый (60-179 дней)
        ],
        'more_than_half_year' => [
            'label' => 'Более полугода',
            'color' => '#dc3545' // Красный (180-364 дня)
        ],
        'more_than_year' => [
            'label' => 'Более года',
            'color' => '#c82333' // Тёмно-красный (≥365 дней)
        ]
    ];

    // Инициализация агрегации новых тикетов по стадиям
    $newTicketsByStagesAgg = [];
    if ($includeNewTicketsByStages) {
        foreach ($allStages as $stageId => $stageInfo) {
            $newTicketsByStagesAgg[$stageId] = [
                'stageId' => $stageId,
                'stageName' => $stageInfo['name'],
                'color' => $stageInfo['color'],
                'count' => 0,
                'tickets' => []
            ];
        }
    }

    // Агрегации
    $newCount = 0;
    $closedCount = 0;
    $closedTicketsCreatedThisWeek = 0; // TASK-047: закрытые тикеты, созданные в эту же неделю
    $closedTicketsCreatedOtherWeek = 0; // TASK-047: закрытые тикеты, созданные в другие недели
    $carryoverCount = 0;
    // TASK-047: Разбивка переходящих тикетов по критерию создания
    $carryoverTicketsCreatedThisWeek = 0;
    $carryoverTicketsCreatedOtherWeek = 0;
    $carryoverTickets = []; // Для будущего использования
    $stageAgg = [];
    $responsibleAgg = [];
    $responsibleCreatedThisWeekAgg = []; // TASK-047: агрегация по сотрудникам для категории "созданные этой неделей"
    $responsibleCreatedOtherWeekAgg = []; // TASK-047: агрегация по сотрудникам для категории "созданные ранее"
    
    // Инициализация агрегации переходящих тикетов по срокам (TASK-044-04)
    $carryoverTicketsByDurationAgg = [];
    if ($includeCarryoverTicketsByDuration) {
        foreach ($durationCategories as $category => $info) {
            $carryoverTicketsByDurationAgg[$category] = [
                'durationCategory' => $category,
                'durationLabel' => $info['label'],
                'color' => $info['color'],
                'count' => 0,
                'tickets' => []
            ];
        }
    }

    foreach ($tickets as $ticket) {
        $createdTime = $ticket['createdTime'] ?? null;
        // Для закрытых используем movedTime, если нет — fallback на updatedTime
        $movedTime = $ticket['movedTime'] ?? $ticket['updatedTime'] ?? null;
        $stageId = $ticket['stageId'] ?? null;
        $stageId = $stageId ? strtoupper($stageId) : null;
        $assignedRaw = $ticket['assignedById'] ?? null;

        // Новые за неделю
        if (isInRange($createdTime, $weekStart, $weekEnd)) {
            $newCount++;
            
            // Если нужно включить новые тикеты по стадиям
            if ($includeNewTicketsByStages && $stageId && isset($newTicketsByStagesAgg[$stageId])) {
                $newTicketsByStagesAgg[$stageId]['count']++;
                
                // Если нужно включить тикеты, сохранить данные тикета
                if ($includeTickets) {
                    // Нормализация assignedById (как для закрытых тикетов)
                    $responsibleId = $assignedRaw;
                    if (is_array($responsibleId)) {
                        $responsibleId = $responsibleId['id'] ?? $responsibleId['ID'] ?? $responsibleId['value'] ?? null;
                    }
                    $responsibleId = $responsibleId ? (int)$responsibleId : null;
                    
                    $newTicketsByStagesAgg[$stageId]['tickets'][] = [
                        'id' => (int)$ticket['id'],
                        'title' => $ticket['title'] ?? 'Без названия',
                        'createdTime' => $ticket['createdTime'] ?? null,
                        'stageId' => $stageId,
                        'assignedById' => $responsibleId
                    ];
                }
            }
        }

        // Закрытые за неделю
        if ($stageId && in_array($stageId, $closingStages, true) && isInRange($movedTime, $weekStart, $weekEnd)) {
            $closedCount++;

            // TASK-047: Разбивка по критерию создания
            $createdInThisWeek = isInRange($createdTime, $weekStart, $weekEnd);
            
            // Нормализация assignedById (как для закрытых тикетов)
            $responsibleId = $assignedRaw;
            if (is_array($responsibleId)) {
                $responsibleId = $responsibleId['id'] ?? $responsibleId['ID'] ?? $responsibleId['value'] ?? null;
            }
            $responsibleId = $responsibleId ? (int)$responsibleId : null;
            $responsibleKey = ($responsibleId === null || $responsibleId === $keeperId) ? 'unassigned' : (string)$responsibleId;

            if ($createdInThisWeek) {
                $closedTicketsCreatedThisWeek++;
                
                // Агрегация по сотрудникам для категории "созданные этой неделей"
                if (!isset($responsibleCreatedThisWeekAgg[$responsibleKey])) {
                    $responsibleCreatedThisWeekAgg[$responsibleKey] = [
                        'id' => $responsibleId,
                        'name' => ($responsibleId === null || $responsibleId === $keeperId) ? 'Не назначен' : ('ID ' . $responsibleId),
                        'count' => 0,
                        'tickets' => []
                    ];
                }
                $responsibleCreatedThisWeekAgg[$responsibleKey]['count']++;
                
                // Если нужно включить тикеты, сохранить данные тикета
                if ($includeTickets) {
                    $responsibleCreatedThisWeekAgg[$responsibleKey]['tickets'][] = [
                        'id' => (int)$ticket['id'],
                        'title' => $ticket['title'] ?? 'Без названия',
                        'createdTime' => $ticket['createdTime'] ?? null,
                        'movedTime' => $movedTime,
                        'stageId' => $stageId,
                        'assignedById' => $responsibleId
                    ];
                }
            } else {
                $closedTicketsCreatedOtherWeek++;
                
                // Агрегация по сотрудникам для категории "созданные ранее"
                if (!isset($responsibleCreatedOtherWeekAgg[$responsibleKey])) {
                    $responsibleCreatedOtherWeekAgg[$responsibleKey] = [
                        'id' => $responsibleId,
                        'name' => ($responsibleId === null || $responsibleId === $keeperId) ? 'Не назначен' : ('ID ' . $responsibleId),
                        'count' => 0,
                        'tickets' => []
                    ];
                }
                $responsibleCreatedOtherWeekAgg[$responsibleKey]['count']++;
                
                // Если нужно включить тикеты, сохранить данные тикета
                if ($includeTickets) {
                    $responsibleCreatedOtherWeekAgg[$responsibleKey]['tickets'][] = [
                        'id' => (int)$ticket['id'],
                        'title' => $ticket['title'] ?? 'Без названия',
                        'createdTime' => $ticket['createdTime'] ?? null,
                        'movedTime' => $movedTime,
                        'stageId' => $stageId,
                        'assignedById' => $responsibleId
                    ];
                }
            }

            // Агрегация по стадиям (общая для всех закрытых)
            if (!isset($stageAgg[$stageId])) {
                $stageAgg[$stageId] = 0;
            }
            $stageAgg[$stageId]++;

            // Агрегация по ответственным (общая для всех закрытых, для обратной совместимости)
            if (!isset($responsibleAgg[$responsibleKey])) {
                $responsibleAgg[$responsibleKey] = [
                    'id' => $responsibleId,
                    'name' => ($responsibleId === null || $responsibleId === $keeperId) ? 'Не назначен' : ('ID ' . $responsibleId),
                    'count' => 0,
                    'tickets' => [] // Добавить массив для тикетов
                ];
            }
            $responsibleAgg[$responsibleKey]['count']++;
            
            // Если нужно включить тикеты, сохранить данные тикета (общая агрегация)
            if ($includeTickets) {
                $responsibleAgg[$responsibleKey]['tickets'][] = [
                    'id' => (int)$ticket['id'],
                    'title' => $ticket['title'] ?? 'Без названия',
                    'createdTime' => $ticket['createdTime'] ?? null,
                    'movedTime' => $movedTime,
                    'stageId' => $stageId,
                    'assignedById' => $responsibleId
                ];
            }
        }
        
        // Переходящие тикеты (в рабочих стадиях, не закрытые)
        // TASK-047: Расширено определение - теперь включаем все не закрытые тикеты в рабочих стадиях
        if ($includeCarryoverTickets && isCarryoverTicket($ticket, $weekStart, $weekEnd, $targetStages, $closingStages)) {
            $carryoverCount++;
            
            // TASK-047: Разбивка по критерию создания
            $createdInThisWeek = isInRange($createdTime, $weekStart, $weekEnd);
            
            if ($createdInThisWeek) {
                $carryoverTicketsCreatedThisWeek++;
            } else {
                $carryoverTicketsCreatedOtherWeek++;
            }
            
            // Логируем первые 10 и каждый 10-й переходящий тикет для диагностики
            if ($carryoverCount <= 10 || $carryoverCount % 10 === 0) {
                error_log("[CARRYOVER] Переходящий тикет #{$carryoverCount}: ID={$ticket['id']}, stageId={$stageId}, createdTime={$createdTime}, createdInThisWeek=" . ($createdInThisWeek ? 'true' : 'false'));
            }
            
            // Нормализация assignedById (как для закрытых тикетов)
            $responsibleId = $assignedRaw;
            if (is_array($responsibleId)) {
                $responsibleId = $responsibleId['id'] ?? $responsibleId['ID'] ?? $responsibleId['value'] ?? null;
            }
            $responsibleId = $responsibleId ? (int)$responsibleId : null;
            
            // Сохранить данные тикета для будущего использования
            if ($includeTickets) {
                $carryoverTickets[] = [
                    'id' => (int)$ticket['id'],
                    'title' => $ticket['title'] ?? 'Без названия',
                    'createdTime' => $createdTime,
                    'stageId' => $stageId,
                    'assignedById' => $responsibleId
                ];
            }
            
            // Группировка переходящих тикетов по срокам (TASK-044-04)
            if ($includeCarryoverTicketsByDuration && $createdTime) {
                $category = calculateDurationCategory($createdTime, $weekStart);
                
                if (isset($carryoverTicketsByDurationAgg[$category])) {
                    $carryoverTicketsByDurationAgg[$category]['count']++;
                    
                    // Если нужно включить тикеты, сохранить данные тикета
                    if ($includeTickets) {
                        $carryoverTicketsByDurationAgg[$category]['tickets'][] = [
                            'id' => (int)$ticket['id'],
                            'title' => $ticket['title'] ?? 'Без названия',
                            'createdTime' => $createdTime,
                            'stageId' => $stageId,
                            'assignedById' => $responsibleId
                        ];
                    }
                }
            }
        }
    }

    // TASK-048: Подсчёт метрик для каждой из 4 недель
    $series = [
        'new' => [],
        'closed' => [],
        'closedCreatedThisWeek' => [],
        'closedCreatedOtherWeek' => [],
        'carryover' => [],
        'carryoverCreatedThisWeek' => [],
        'carryoverCreatedOtherWeek' => []
    ];
    
    $weeksData = [];
    $currentWeekData = null;
    
    // Для каждой недели подсчитываем метрики
    foreach ($weeks as $week) {
        $weekMetrics = calculateWeekMetrics(
            $week['weekStart'],
            $week['weekEnd'],
            $tickets,
            $targetStages,
            $closingStages,
            $keeperId
        );
        
        // Добавляем в series (от старых к новым)
        $series['new'][] = $weekMetrics['newTickets'];
        $series['closed'][] = $weekMetrics['closedTickets'];
        $series['closedCreatedThisWeek'][] = $weekMetrics['closedTicketsCreatedThisWeek'];
        $series['closedCreatedOtherWeek'][] = $weekMetrics['closedTicketsCreatedOtherWeek'];
        $series['carryover'][] = $weekMetrics['carryoverTickets'];
        $series['carryoverCreatedThisWeek'][] = $weekMetrics['carryoverTicketsCreatedThisWeek'];
        $series['carryoverCreatedOtherWeek'][] = $weekMetrics['carryoverTicketsCreatedOtherWeek'];
        
        // Сохраняем данные недели
        $weekData = [
            'weekNumber' => $week['weekNumber'],
            'newTickets' => $weekMetrics['newTickets'],
            'closedTickets' => $weekMetrics['closedTickets'],
            'closedTicketsCreatedThisWeek' => $weekMetrics['closedTicketsCreatedThisWeek'],
            'closedTicketsCreatedOtherWeek' => $weekMetrics['closedTicketsCreatedOtherWeek'],
            'carryoverTickets' => $weekMetrics['carryoverTickets'],
            'carryoverTicketsCreatedThisWeek' => $weekMetrics['carryoverTicketsCreatedThisWeek'],
            'carryoverTicketsCreatedOtherWeek' => $weekMetrics['carryoverTicketsCreatedOtherWeek']
        ];
        $weeksData[] = $weekData;
        
        // Сохраняем данные текущей недели (последняя в массиве)
        // TASK-048: Используем последний элемент массива как текущую неделю
        // (массив weeks уже отсортирован от старых к новым)
        if ($week === end($weeks)) {
            $currentWeekData = $weekData;
        }
    }
    
    // Если не нашли текущую неделю, используем последнюю из weeksData
    if (!$currentWeekData && count($weeksData) > 0) {
        $currentWeekData = $weeksData[count($weeksData) - 1];
    }
    
    // TASK-048: Дополнительная проверка - если currentWeekData всё ещё null или содержит только нули,
    // но series содержит данные, берём данные из последнего элемента series
    if ((!$currentWeekData || 
         (($currentWeekData['newTickets'] ?? 0) === 0 && 
          ($currentWeekData['closedTickets'] ?? 0) === 0 && 
          ($currentWeekData['carryoverTickets'] ?? 0) === 0)) &&
        count($series['new']) > 0) {
        // Берём последний элемент из каждого массива series
        $lastIndex = count($series['new']) - 1;
        $currentWeekData = [
            'weekNumber' => $weeks[count($weeks) - 1]['weekNumber'] ?? (int)$weekStart->format('W'),
            'newTickets' => $series['new'][$lastIndex] ?? 0,
            'closedTickets' => $series['closed'][$lastIndex] ?? 0,
            'closedTicketsCreatedThisWeek' => $series['closedCreatedThisWeek'][$lastIndex] ?? 0,
            'closedTicketsCreatedOtherWeek' => $series['closedCreatedOtherWeek'][$lastIndex] ?? 0,
            'carryoverTickets' => $series['carryover'][$lastIndex] ?? 0,
            'carryoverTicketsCreatedThisWeek' => $series['carryoverCreatedThisWeek'][$lastIndex] ?? 0,
            'carryoverTicketsCreatedOtherWeek' => $series['carryoverCreatedOtherWeek'][$lastIndex] ?? 0
        ];
    }
    
    // Используем данные текущей недели для обратной совместимости
    $newCount = $currentWeekData['newTickets'] ?? 0;
    $closedCount = $currentWeekData['closedTickets'] ?? 0;
    $closedTicketsCreatedThisWeek = $currentWeekData['closedTicketsCreatedThisWeek'] ?? 0;
    $closedTicketsCreatedOtherWeek = $currentWeekData['closedTicketsCreatedOtherWeek'] ?? 0;
    $carryoverCount = $currentWeekData['carryoverTickets'] ?? 0;
    $carryoverTicketsCreatedThisWeek = $currentWeekData['carryoverTicketsCreatedThisWeek'] ?? 0;
    $carryoverTicketsCreatedOtherWeek = $currentWeekData['carryoverTicketsCreatedOtherWeek'] ?? 0;

    // Формирование ответа
    $responseData = [
        'newTickets' => $newCount,
        'closedTickets' => $closedCount,
        'closedTicketsCreatedThisWeek' => $closedTicketsCreatedThisWeek, // TASK-047
        'closedTicketsCreatedOtherWeek' => $closedTicketsCreatedOtherWeek, // TASK-047
        'series' => $series, // TASK-048: массивы с 4 элементами (по одному для каждой недели)
        'weeksData' => $weeksData, // TASK-048: данные для каждой недели
        'currentWeek' => $currentWeekData, // TASK-048: данные текущей недели (для summary-карточек)
        'stages' => array_map(function ($stageId) use ($stageAgg, $allStages) {
            $stageName = isset($allStages[$stageId]) ? $allStages[$stageId]['name'] : $stageId;
            return [
                'stageId' => $stageId,
                'stageName' => $stageName,
                'count' => $stageAgg[$stageId]
            ];
        }, array_keys($stageAgg)),
        'responsible' => array_map(function ($item) use ($includeTickets) {
            $result = [
                'id' => $item['id'],
                'name' => $item['name'],
                'count' => $item['count']
            ];
            
            // Включить тикеты только если запрошено
            if ($includeTickets && isset($item['tickets'])) {
                $result['tickets'] = $item['tickets'];
            }
            
            return $result;
        }, array_values($responsibleAgg)),
        'responsibleCreatedThisWeek' => array_map(function ($item) use ($includeTickets) { // TASK-047
            $result = [
                'id' => $item['id'],
                'name' => $item['name'],
                'count' => $item['count']
            ];
            
            // Включить тикеты только если запрошено
            if ($includeTickets && isset($item['tickets'])) {
                $result['tickets'] = $item['tickets'];
            }
            
            return $result;
        }, array_values($responsibleCreatedThisWeekAgg)),
        'responsibleCreatedOtherWeek' => array_map(function ($item) use ($includeTickets) { // TASK-047
            $result = [
                'id' => $item['id'],
                'name' => $item['name'],
                'count' => $item['count']
            ];
            
            // Включить тикеты только если запрошено
            if ($includeTickets && isset($item['tickets'])) {
                $result['tickets'] = $item['tickets'];
            }
            
            return $result;
        }, array_values($responsibleCreatedOtherWeekAgg)),
        'newTicketsByStages' => $includeNewTicketsByStages 
            ? array_map(function ($item) use ($includeTickets) {
                $result = [
                    'stageId' => $item['stageId'],
                    'stageName' => $item['stageName'],
                    'color' => $item['color'],
                    'count' => $item['count']
                ];
                
                // Включить тикеты только если запрошено
                if ($includeTickets && isset($item['tickets'])) {
                    $result['tickets'] = $item['tickets'];
                }
                
                return $result;
            }, array_values($newTicketsByStagesAgg))
            : null
    ];
    
    // Добавить переходящие тикеты, если запрошено
    if ($includeCarryoverTickets) {
        $responseData['carryoverTickets'] = $carryoverCount;
        // TASK-047: Разбивка переходящих тикетов по критерию создания
        $responseData['carryoverTicketsCreatedThisWeek'] = $carryoverTicketsCreatedThisWeek;
        $responseData['carryoverTicketsCreatedOtherWeek'] = $carryoverTicketsCreatedOtherWeek;
        // TASK-049: series['carryover'] уже заполнен выше для одной недели
        
        error_log("[CARRYOVER] ИТОГО переходящих тикетов после всех фильтров: {$carryoverCount}");
        error_log("[CARRYOVER] Созданных этой неделей: {$carryoverTicketsCreatedThisWeek}, созданных прошлыми неделями (жёсткий остаток): {$carryoverTicketsCreatedOtherWeek}");
        error_log("[CARRYOVER] ========================================");
    } else {
        // Если переходящие тикеты не запрошены, заполняем series пустыми массивами с одним элементом
        $series['carryover'] = [0];
        $series['carryoverCreatedThisWeek'] = [0];
        $series['carryoverCreatedOtherWeek'] = [0];
    }
    
    // Добавить переходящие тикеты по срокам, если запрошено (TASK-044-04)
    if ($includeCarryoverTicketsByDuration) {
        $responseData['carryoverTicketsByDuration'] = array_map(function ($item) use ($includeTickets) {
            $result = [
                'durationCategory' => $item['durationCategory'],
                'durationLabel' => $item['durationLabel'],
                'color' => $item['color'],
                'count' => $item['count']
            ];
            
            // Включить тикеты только если запрошено
            if ($includeTickets && isset($item['tickets']) && count($item['tickets']) > 0) {
                $result['tickets'] = $item['tickets'];
            }
            
            return $result;
        }, array_values($carryoverTicketsByDurationAgg));
    }
    
    // TASK-048: Формирование метаданных для 4 недель
    $response = [
        'success' => true,
        'meta' => [
            'weekNumber' => (int)$weekStart->format('W'),
            'weekStartUtc' => $weekStart->format('Y-m-d\TH:i:s\Z'),
            'weekEndUtc' => $weekEnd->format('Y-m-d\TH:i:s\Z'),
            'currentWeek' => [
                'weekNumber' => (int)$weekStart->format('W'),
                'weekStartUtc' => $weekStart->format('Y-m-d\TH:i:s\Z'),
                'weekEndUtc' => $weekEnd->format('Y-m-d\TH:i:s\Z')
            ],
            'weeks' => array_map(function($week) {
                return [
                    'weekNumber' => $week['weekNumber'],
                    'weekStartUtc' => $week['weekStartUtc'],
                    'weekEndUtc' => $week['weekEndUtc']
                ];
            }, $weeks)
        ],
        'data' => $responseData,
        'debug' => $debug ? [
            'fetchedTotal' => count($tickets),
            'sample' => array_slice($debugRaw, 0, 5),
            'stageCounts' => $stageAgg,
            'carryoverCount' => $includeCarryoverTickets ? $carryoverCount : null,
            'params' => [
                'product' => $product,
                'weekStartUtc' => $weekStart->format('Y-m-d\TH:i:s\Z'),
                'weekEndUtc' => $weekEnd->format('Y-m-d\TH:i:s\Z'),
                'includeCarryoverTickets' => $includeCarryoverTickets
            ]
        ] : null
    ];

    jsonResponse($response);
} catch (Exception $e) {
    http_response_code(500);
    jsonResponse([
        'success' => false,
        'message' => 'Ошибка получения данных: ' . $e->getMessage()
    ]);
}

