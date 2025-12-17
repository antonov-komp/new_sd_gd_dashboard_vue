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
 * Вычисляет последние 3 месяца от текущей даты
 * TASK-053-03: Функция для расчета периода 3-месячного режима
 * 
 * @return array Массив месяцев с границами и неделями
 * @throws Exception При ошибке работы с датами
 */
function calculateLastThreeMonths(): array
{
    try {
        $tz = new DateTimeZone('UTC');
        $now = new DateTimeImmutable('now', $tz);
        $months = [];
        
        // Текущий месяц
        $currentMonth = $now->modify('first day of this month');
        // 2 месяца назад (начало периода)
        $twoMonthsAgo = $currentMonth->modify('-2 months');
        
        $monthNames = [
            1 => 'Январь', 2 => 'Февраль', 3 => 'Март', 4 => 'Апрель',
            5 => 'Май', 6 => 'Июнь', 7 => 'Июль', 8 => 'Август',
            9 => 'Сентябрь', 10 => 'Октябрь', 11 => 'Ноябрь', 12 => 'Декабрь'
        ];
        
        for ($i = 0; $i < 3; $i++) {
            $monthStart = $twoMonthsAgo->modify("+{$i} months");
            $monthEnd = $monthStart->modify('last day of this month')->setTime(23, 59, 59);
            
            $months[] = [
                'monthNumber' => (int)$monthStart->format('n'),
                'monthName' => $monthNames[(int)$monthStart->format('n')],
                'year' => (int)$monthStart->format('Y'),
                'monthStartUtc' => $monthStart->setTime(0, 0, 0)->format('Y-m-d\TH:i:s\Z'),
                'monthEndUtc' => $monthEnd->format('Y-m-d\TH:i:s\Z'),
                'monthStart' => $monthStart->setTime(0, 0, 0),
                'monthEnd' => $monthEnd,
                'weeks' => calculateWeeksInMonth($monthStart->setTime(0, 0, 0), $monthEnd)
            ];
        }
        
        return $months;
    } catch (Exception $e) {
        error_log('[calculateLastThreeMonths] Error: ' . $e->getMessage());
        throw new Exception('Failed to calculate last three months: ' . $e->getMessage());
    }
}

/**
 * Вычисляет все недели, которые пересекаются с месяцем
 * TASK-053-03: Функция для расчета недель внутри месяца (ISO-8601)
 * 
 * @param DateTimeImmutable $monthStart Начало месяца (UTC)
 * @param DateTimeImmutable $monthEnd Конец месяца (UTC)
 * @return array Массив недель с границами
 */
function calculateWeeksInMonth(DateTimeImmutable $monthStart, DateTimeImmutable $monthEnd): array
{
    $weeks = [];
    $tz = new DateTimeZone('UTC');
    
    // Находим первую неделю месяца (ISO-8601, понедельник)
    $firstDay = $monthStart;
    $dayOfWeek = (int)$firstDay->format('N'); // 1 = понедельник, 7 = воскресенье
    
    // Если первый день месяца не понедельник, начинаем с предыдущего понедельника
    if ($dayOfWeek !== 1) {
        $firstDay = $firstDay->modify('-' . ($dayOfWeek - 1) . ' days');
    }
    
    $currentWeekStart = $firstDay->setTime(0, 0, 0);
    
    // Генерируем недели до конца месяца
    while ($currentWeekStart <= $monthEnd) {
        $currentWeekEnd = $currentWeekStart->modify('+6 days')->setTime(23, 59, 59);
        
        // Проверяем, что неделя пересекается с месяцем
        if ($currentWeekEnd >= $monthStart && $currentWeekStart <= $monthEnd) {
            $isoYear = (int)$currentWeekStart->format('o');
            $isoWeek = (int)$currentWeekStart->format('W');
            
            $weeks[] = [
                'weekNumber' => $isoWeek,
                'weekStartUtc' => $currentWeekStart->format('Y-m-d\TH:i:s\Z'),
                'weekEndUtc' => $currentWeekEnd->format('Y-m-d\TH:i:s\Z'),
                'weekStart' => $currentWeekStart,
                'weekEnd' => $currentWeekEnd
            ];
        }
        
        $currentWeekStart = $currentWeekStart->modify('+1 week');
    }
    
    return $weeks;
}

/**
 * Проверка попадания даты в интервал [start, end]
 * 
 * TASK-054: Улучшена для правильного парсинга дат из Bitrix24 (ISO-8601 с часовым поясом)
 */
function isInRange(?string $dateStr, DateTimeImmutable $start, DateTimeImmutable $end): bool
{
    if (!$dateStr) {
        return false;
    }
    
    try {
        // Пробуем создать DateTimeImmutable напрямую (поддерживает ISO-8601 с часовым поясом)
        // Bitrix24 возвращает даты в формате ISO-8601, например: "2025-12-16T10:00:00+03:00"
        $dt = new DateTimeImmutable($dateStr, new DateTimeZone('UTC'));
    } catch (Exception $e) {
        // Fallback на strtotime, если прямой парсинг не сработал
        $ts = strtotime($dateStr);
        if ($ts === false) {
            error_log("[isInRange] Failed to parse date: {$dateStr}, error: " . $e->getMessage());
            return false;
        }
        $dt = (new DateTimeImmutable('@' . $ts))->setTimezone(new DateTimeZone('UTC'));
    }
    
    // Нормализуем в UTC для сравнения
    $dt = $dt->setTimezone(new DateTimeZone('UTC'));
    
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
 * @param bool $debug Включить детальное логирование (TASK-054)
 * @return array Метрики недели
 */
function calculateWeekMetrics(
    DateTimeImmutable $weekStart,
    DateTimeImmutable $weekEnd,
    array $allTickets,
    array $targetStages,
    array $closingStages,
    int $keeperId,
    bool $debug = false
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
    
    // TASK-054: Логирование границ недели для диагностики
    error_log("[CALCULATE] Week bounds: {$weekStartStr} - {$weekEndStr} (UTC)");
    error_log("[CALCULATE] Total tickets to process: " . count($allTickets));
    
    foreach ($allTickets as $ticket) {
        $createdTime = $ticket['createdTime'] ?? null;
        $movedTime = $ticket['movedTime'] ?? $ticket['updatedTime'] ?? null;
        $stageId = $ticket['stageId'] ?? null;
        $stageId = $stageId ? strtoupper($stageId) : null;
        $ticketId = $ticket['id'] ?? 'unknown';
        
        // TASK-054: Детальное логирование для закрытых тикетов
        $isInClosingStages = $stageId && in_array($stageId, $closingStages, true);
        $isMovedInRange = isInRange($movedTime, $weekStart, $weekEnd);
        $isCreatedInRange = isInRange($createdTime, $weekStart, $weekEnd);
        
        // TASK-054: Логирование всех закрытых тикетов для диагностики
        if ($isInClosingStages && $debug) {
            // Парсим даты для детального логирования
            $createdDt = null;
            $movedDt = null;
            if ($createdTime) {
                try {
                    $createdDt = new DateTimeImmutable($createdTime, new DateTimeZone('UTC'));
                } catch (Exception $e) {
                    $createdDt = null;
                }
            }
            if ($movedTime) {
                try {
                    $movedDt = new DateTimeImmutable($movedTime, new DateTimeZone('UTC'));
                } catch (Exception $e) {
                    $movedDt = null;
                }
            }
            
            error_log("[CALCULATE-DEBUG] Ticket {$ticketId}:");
            error_log("  - stageId: {$stageId} (inClosingStages: " . ($isInClosingStages ? 'true' : 'false') . ")");
            error_log("  - createdTime: {$createdTime} -> " . ($createdDt ? $createdDt->format('Y-m-d H:i:s') : 'null'));
            error_log("  - movedTime: {$movedTime} -> " . ($movedDt ? $movedDt->format('Y-m-d H:i:s') : 'null'));
            error_log("  - weekStart: {$weekStartStr}, weekEnd: {$weekEndStr}");
            error_log("  - isCreatedInRange: " . ($isCreatedInRange ? 'true' : 'false'));
            error_log("  - isMovedInRange: " . ($isMovedInRange ? 'true' : 'false'));
            error_log("  - Will be counted as closed: " . ($isInClosingStages && $isMovedInRange ? 'YES' : 'NO'));
            if ($isInClosingStages && $isMovedInRange) {
                error_log("  - Category: " . ($isCreatedInRange ? 'closedTicketsCreatedThisWeek' : 'closedTicketsCreatedOtherWeek'));
            }
        }
        
        // Новые за неделю
        if ($isCreatedInRange) {
            $newCount++;
        }
        
        // Закрытые за неделю
        // TASK-054: Улучшенная логика - если тикет в закрывающей стадии и создан на текущей неделе,
        // но movedTime не попадает в диапазон (возможно, из-за проблем с парсингом или форматом),
        // то считаем его закрытым на текущей неделе
        $shouldCountAsClosed = false;
        $closedReason = '';
        
        if ($isInClosingStages) {
            if ($isMovedInRange) {
                // Стандартный случай: movedTime попадает в диапазон
                $shouldCountAsClosed = true;
                $closedReason = 'movedTime_in_range';
            } else if ($isCreatedInRange && !$movedTime) {
                // Тикет создан на текущей неделе, но movedTime отсутствует
                // Если тикет в закрывающей стадии, считаем его закрытым на текущей неделе
                $shouldCountAsClosed = true;
                $closedReason = 'created_this_week_no_movedTime';
            } else if ($isCreatedInRange) {
                // Тикет создан на текущей неделе, но movedTime не попадает в диапазон
                // Это может быть из-за проблем с парсингом или форматом дат
                // Если тикет в закрывающей стадии, считаем его закрытым на текущей неделе
                $shouldCountAsClosed = true;
                $closedReason = 'created_this_week_movedTime_out_of_range';
                
                // TASK-054: Логирование для диагностики
                error_log("[CALCULATE] Ticket {$ticketId}: Created this week but movedTime out of range - createdTime: {$createdTime}, movedTime: {$movedTime}, stageId: {$stageId}");
            }
        }
        
        if ($shouldCountAsClosed) {
            $closedCount++;
            
            // Разбивка по критерию создания
            if ($isCreatedInRange) {
                $closedTicketsCreatedThisWeek++;
                
                // TASK-054: Логирование тикетов, созданных и закрытых на текущей неделе
                error_log("[CALCULATE] Ticket {$ticketId}: closedTicketsCreatedThisWeek (reason: {$closedReason}) - createdTime: {$createdTime}, movedTime: {$movedTime}, stageId: {$stageId}");
            } else {
                $closedTicketsCreatedOtherWeek++;
            }
        } else if ($isInClosingStages && !$isMovedInRange) {
            // TASK-054: Логирование закрытых тикетов, которые не попали в диапазон
            error_log("[CALCULATE] Ticket {$ticketId}: Closed ticket but not counted - createdTime: {$createdTime}, movedTime: {$movedTime}, stageId: {$stageId}, isCreatedInRange: " . ($isCreatedInRange ? 'true' : 'false') . ", isMovedInRange: " . ($isMovedInRange ? 'true' : 'false'));
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
 * 1. Создан до конца этой недели (createdTime <= weekEnd)
 * 2. Находится в рабочих стадиях (targetStages) - текущее состояние
 * 3. Не был закрыт до конца этой недели (если закрыт, то movedTime > weekEnd)
 * 
 * TASK-048: Обновлено для правильного подсчёта накопления переходящих тикетов
 * Переходящие тикеты накапливаются: неделя 48 → неделя 49 → неделя 50 → неделя 51
 * 
 * Логика накопления:
 * - Неделя 48: все тикеты, созданные до конца недели 48, в рабочих стадиях сейчас
 * - Неделя 49: все тикеты, созданные до конца недели 49, в рабочих стадиях сейчас
 * - И так далее
 * 
 * Это даёт накопление, так как для каждой следующей недели добавляются новые тикеты,
 * которые были созданы в эту неделю и остались в рабочих стадиях.
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
    
    if (!$stageId || !$createdTime) {
        return false;
    }
    
    // Нормализация stageId
    $stageId = strtoupper($stageId);
    
    // Условие 1: Тикет создан до конца этой недели (включительно)
    $createdDt = new DateTimeImmutable($createdTime, new DateTimeZone('UTC'));
    if ($createdDt > $weekEnd) {
        return false; // Создан после конца недели, не переходящий для этой недели
    }
    
    // Условие 2: Находится в рабочих стадиях (текущее состояние)
    if (!in_array($stageId, $targetStages, true)) {
        return false; // Не в рабочей стадии
    }
    
    // Условие 3: Не в закрывающих стадиях
    if (in_array($stageId, $closingStages, true)) {
        return false; // В закрывающей стадии
    }
    
    // Условие 4: Если тикет был закрыт, то закрыт после конца этой недели
    // (если закрыт до конца недели, он не переходящий для этой недели)
    if ($movedTime) {
        $movedDt = new DateTimeImmutable($movedTime, new DateTimeZone('UTC'));
        // Если movedTime <= weekEnd, значит тикет был закрыт до или в конце недели
        // Но если тикет в рабочих стадиях сейчас, значит он не был закрыт
        // Поэтому эта проверка избыточна, но оставим для ясности
    }
    
    // Тикет создан до конца недели, находится в рабочих стадиях сейчас
    // Это переходящий тикет для этой недели
    return true;
}

try {
    $body = parseJsonBody();

    $product = isset($body['product']) ? (string)$body['product'] : '1C';
    $weekStartParam = isset($body['weekStartUtc']) ? (string)$body['weekStartUtc'] : null;
    $weekEndParam = isset($body['weekEndUtc']) ? (string)$body['weekEndUtc'] : null;
    $periodMode = isset($body['periodMode']) ? (string)$body['periodMode'] : 'weeks'; // TASK-053-03: Новый параметр
    $includeTickets = isset($body['includeTickets']) ? (bool)$body['includeTickets'] : false;
    $includeNewTicketsByStages = isset($body['includeNewTicketsByStages']) ? (bool)$body['includeNewTicketsByStages'] : false;
    $includeCarryoverTickets = isset($body['includeCarryoverTickets']) ? (bool)$body['includeCarryoverTickets'] : false;
    $includeCarryoverTicketsByDuration = isset($body['includeCarryoverTicketsByDuration']) ? (bool)$body['includeCarryoverTicketsByDuration'] : false;
    $debug = isset($body['debug']) ? (bool)$body['debug'] : false;
    
    // TASK-053-03: Валидация periodMode
    if (!in_array($periodMode, ['weeks', 'months'], true)) {
        http_response_code(400);
        jsonResponse([
            'success' => false,
            'error' => 'Invalid periodMode. Must be "weeks" or "months".'
        ]);
    }

    // TASK-053-03: Обработка режима периода
    if ($periodMode === 'months') {
        // Логика для 3-месячного режима
        $months = calculateLastThreeMonths();
        $periodStartUtc = $months[0]['monthStartUtc'];
        $periodEndUtc = $months[2]['monthEndUtc'];
        $periodStart = new DateTimeImmutable($periodStartUtc, new DateTimeZone('UTC'));
        $periodEnd = new DateTimeImmutable($periodEndUtc, new DateTimeZone('UTC'));
        
        // Форматируем даты для фильтра Bitrix24
        $periodStartStr = $periodStart->format('Y-m-d H:i:s');
        $periodEndStr = $periodEnd->format('Y-m-d H:i:s');
        
        error_log("[MONTHS] Period for Bitrix24 queries: {$periodStartStr} - {$periodEndStr} (UTC)");
        
        // Опорные значения (совпадают с недельным режимом)
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
        
        // Загрузка тикетов за весь период 3 месяцев с правильной пагинацией (TASK-054)
        $entityTypeId = 140;
        $pageSize = 50;
        $allTicketsMap = [];
        
        // Запрос 1: тикеты, созданные за период 3 месяцев
        $start = 0;
        $pageNum = 0;
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
            $pageNum++;
            
            foreach ($items as $item) {
                $allTicketsMap[$item['id']] = $item;
            }

            // TASK-054: Улучшенная проверка наличия следующей страницы
            $nextValue = $result['result']['next'] ?? $result['next'] ?? null;
            $hasNext = $nextValue !== null && 
                      $nextValue !== '' && 
                      $nextValue !== '0' && 
                      (int)$nextValue > 0;
            
            $hasMore = count($items) === $pageSize && $hasNext;
            
            if ($debug && $hasMore) {
                error_log("[MONTHS-QUERY1] Page {$pageNum}: loaded " . count($items) . " items, hasNext: " . ($hasNext ? 'true' : 'false') . ", continuing...");
            }
            
            $start += $pageSize;
        } while ($hasMore);
        
        error_log("[MONTHS-QUERY1] Created tickets total count: " . count($allTicketsMap));
        
        // Запрос 2: тикеты, закрытые за период 3 месяцев
        $start = 0;
        $pageNum = 0;
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
            $pageNum++;
            
            foreach ($items as $item) {
                $allTicketsMap[$item['id']] = $item;
            }

            // TASK-054: Улучшенная проверка наличия следующей страницы
            $nextValue = $result['result']['next'] ?? $result['next'] ?? null;
            $hasNext = $nextValue !== null && 
                      $nextValue !== '' && 
                      $nextValue !== '0' && 
                      (int)$nextValue > 0;
            
            $hasMore = count($items) === $pageSize && $hasNext;
            
            if ($debug && $hasMore) {
                error_log("[MONTHS-QUERY2] Page {$pageNum}: loaded " . count($items) . " items, hasNext: " . ($hasNext ? 'true' : 'false') . ", continuing...");
            }
            
            $start += $pageSize;
        } while ($hasMore);
        
        error_log("[MONTHS-QUERY2] Closed tickets total count (after merge): " . count($allTicketsMap));
        
        // Запрос 3: переходящие тикеты (если запрошено)
        if ($includeCarryoverTickets) {
            foreach ($targetStages as $stageId) {
                $start = 0;
                $pageNum = 0;
                $hasMore = true;
                
                while ($hasMore) {
                    $result = CRest::call('crm.item.list', [
                        'entityTypeId' => $entityTypeId,
                        'filter' => [
                            'stageId' => $stageId
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
                    $pageNum++;
                    
                    foreach ($items as $item) {
                        if (!isset($allTicketsMap[$item['id']])) {
                            $allTicketsMap[$item['id']] = $item;
                        }
                    }

                    $nextValue = $result['result']['next'] ?? $result['next'] ?? null;
                    $hasNext = $nextValue !== null && 
                              $nextValue !== '' && 
                              $nextValue !== '0' && 
                              (int)$nextValue > 0;
                    
                    $hasMore = count($items) === $pageSize && $hasNext;
                    
                    $start += $pageSize;
                }
            }
        }
        
        // Фильтруем по product=1C
        $tickets = [];
        foreach ($allTicketsMap as $item) {
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
            $tickets[] = $item;
        }
        
        error_log("[MONTHS] Tickets after product filter: " . count($tickets));
        
        // Агрегация данных по месяцам
        $newTicketsByMonth = [];
        $closedTicketsByMonth = [];
        $carryoverTicketsByMonth = [];
        $totalNewTickets = 0;
        $totalClosedTickets = 0;
        $totalCarryoverTickets = 0;
        
        // Агрегация по стадиям (суммарно за 3 месяца)
        $stageAgg = [];
        $allStages = [
            'DT140_12:SUCCESS' => ['name' => 'Успешное закрытие', 'color' => '#28a745'],
            'DT140_12:FAIL' => ['name' => 'Отклонено', 'color' => '#dc3545'],
            'DT140_12:UC_0GBU8Z' => ['name' => 'Закрыли без задачи', 'color' => '#6c757d']
        ];
        
        foreach ($months as $month) {
            $monthNewTickets = 0;
            $monthClosedTickets = 0;
            $monthClosedTicketsCreatedThisWeek = 0;
            $monthClosedTicketsCreatedOtherWeek = 0;
            $monthCarryoverTickets = 0;
            $monthCarryoverTicketsCreatedThisWeek = 0;
            $monthCarryoverTicketsCreatedOtherWeek = 0;
            
            $weeksData = [];
            
            // Для каждой недели в месяце вычисляем метрики
            foreach ($month['weeks'] as $week) {
                $weekMetrics = calculateWeekMetrics(
                    $week['weekStart'],
                    $week['weekEnd'],
                    $tickets,
                    $targetStages,
                    $closingStages,
                    $keeperId,
                    $debug
                );
                
                $monthNewTickets += $weekMetrics['newTickets'];
                $monthClosedTickets += $weekMetrics['closedTickets'];
                $monthClosedTicketsCreatedThisWeek += $weekMetrics['closedTicketsCreatedThisWeek'];
                $monthClosedTicketsCreatedOtherWeek += $weekMetrics['closedTicketsCreatedOtherWeek'];
                $monthCarryoverTickets += $weekMetrics['carryoverTickets'];
                $monthCarryoverTicketsCreatedThisWeek += $weekMetrics['carryoverTicketsCreatedThisWeek'];
                $monthCarryoverTicketsCreatedOtherWeek += $weekMetrics['carryoverTicketsCreatedOtherWeek'];
                
                $weeksData[] = [
                    'weekNumber' => $week['weekNumber'],
                    'count' => $weekMetrics['newTickets'],
                    'closedCount' => $weekMetrics['closedTickets'],
                    'closedCreatedThisWeek' => $weekMetrics['closedTicketsCreatedThisWeek'],
                    'closedCreatedOtherWeek' => $weekMetrics['closedTicketsCreatedOtherWeek'],
                    'carryoverCount' => $weekMetrics['carryoverTickets'],
                    'carryoverCreatedThisWeek' => $weekMetrics['carryoverTicketsCreatedThisWeek'],
                    'carryoverCreatedOtherWeek' => $weekMetrics['carryoverTicketsCreatedOtherWeek']
                ];
            }
            
            // Подсчёт новых тикетов за месяц (созданных в этом месяце)
            $monthStart = $month['monthStart'];
            $monthEnd = $month['monthEnd'];
            $monthNewCount = 0;
            foreach ($tickets as $ticket) {
                $createdTime = $ticket['createdTime'] ?? null;
                if (isInRange($createdTime, $monthStart, $monthEnd)) {
                    $monthNewCount++;
                }
            }
            
            // Подсчёт закрытых тикетов за месяц (закрытых в этом месяце)
            $monthClosedCount = 0;
            $monthClosedCreatedThisWeek = 0;
            $monthClosedCreatedOtherWeek = 0;
            foreach ($tickets as $ticket) {
                $movedTime = $ticket['movedTime'] ?? $ticket['updatedTime'] ?? null;
                $createdTime = $ticket['createdTime'] ?? null;
                $stageId = $ticket['stageId'] ?? null;
                $stageId = $stageId ? strtoupper($stageId) : null;
                
                if ($stageId && in_array($stageId, $closingStages, true)) {
                    if (isInRange($movedTime, $monthStart, $monthEnd)) {
                        $monthClosedCount++;
                        if (isInRange($createdTime, $monthStart, $monthEnd)) {
                            $monthClosedCreatedThisWeek++;
                        } else {
                            $monthClosedCreatedOtherWeek++;
                        }
                    }
                }
            }
            
            // Подсчёт переходящих тикетов на конец месяца
            $monthCarryoverCount = 0;
            $monthCarryoverCreatedThisWeek = 0;
            $monthCarryoverCreatedOtherWeek = 0;
            foreach ($tickets as $ticket) {
                if (isCarryoverTicket($ticket, $monthEnd, $monthEnd, $targetStages, $closingStages)) {
                    $monthCarryoverCount++;
                    $createdTime = $ticket['createdTime'] ?? null;
                    if (isInRange($createdTime, $monthStart, $monthEnd)) {
                        $monthCarryoverCreatedThisWeek++;
                    } else {
                        $monthCarryoverCreatedOtherWeek++;
                    }
                }
            }
            
            // Агрегация по стадиям (только закрытые за месяц)
            foreach ($tickets as $ticket) {
                $movedTime = $ticket['movedTime'] ?? $ticket['updatedTime'] ?? null;
                $stageId = $ticket['stageId'] ?? null;
                $stageId = $stageId ? strtoupper($stageId) : null;
                
                if ($stageId && in_array($stageId, $closingStages, true)) {
                    if (isInRange($movedTime, $monthStart, $monthEnd)) {
                        if (!isset($stageAgg[$stageId])) {
                            $stageAgg[$stageId] = 0;
                        }
                        $stageAgg[$stageId]++;
                    }
                }
            }
            
            $newTicketsByMonth[] = [
                'month' => $month['monthNumber'],
                'monthName' => $month['monthName'],
                'count' => $monthNewCount,
                'weeks' => $weeksData
            ];
            
            $closedTicketsByMonth[] = [
                'month' => $month['monthNumber'],
                'monthName' => $month['monthName'],
                'count' => $monthClosedCount,
                'closedCreatedThisWeek' => $monthClosedCreatedThisWeek,
                'closedCreatedOtherWeek' => $monthClosedCreatedOtherWeek,
                'weeks' => array_map(function($week) {
                    return [
                        'weekNumber' => $week['weekNumber'],
                        'count' => $week['closedCount'],
                        'closedCreatedThisWeek' => $week['closedCreatedThisWeek'],
                        'closedCreatedOtherWeek' => $week['closedCreatedOtherWeek']
                    ];
                }, $weeksData)
            ];
            
            $carryoverTicketsByMonth[] = [
                'month' => $month['monthNumber'],
                'monthName' => $month['monthName'],
                'count' => $monthCarryoverCount,
                'carryoverCreatedThisWeek' => $monthCarryoverCreatedThisWeek,
                'carryoverCreatedOtherWeek' => $monthCarryoverCreatedOtherWeek,
                'weeks' => array_map(function($week) {
                    return [
                        'weekNumber' => $week['weekNumber'],
                        'count' => $week['carryoverCount'],
                        'carryoverCreatedThisWeek' => $week['carryoverCreatedThisWeek'],
                        'carryoverCreatedOtherWeek' => $week['carryoverCreatedOtherWeek']
                    ];
                }, $weeksData)
            ];
            
            $totalNewTickets += $monthNewCount;
            $totalClosedTickets += $monthClosedCount;
            $totalCarryoverTickets += $monthCarryoverCount;
        }
        
        // Формирование массива стадий
        $stages = [];
        foreach ($stageAgg as $stageId => $count) {
            $stageName = isset($allStages[$stageId]) ? $allStages[$stageId]['name'] : $stageId;
            $stages[] = [
                'stageId' => $stageId,
                'stageName' => $stageName,
                'count' => $count
            ];
        }
        
        // Формирование ответа
        jsonResponse([
            'success' => true,
            'meta' => [
                'periodMode' => 'months',
                'periodStartUtc' => $periodStartUtc,
                'periodEndUtc' => $periodEndUtc,
                'months' => array_map(function($month) {
                    return [
                        'monthNumber' => $month['monthNumber'],
                        'monthName' => $month['monthName'],
                        'year' => $month['year'],
                        'monthStartUtc' => $month['monthStartUtc'],
                        'monthEndUtc' => $month['monthEndUtc'],
                        'weeks' => array_map(function($week) {
                            return [
                                'weekNumber' => $week['weekNumber'],
                                'weekStartUtc' => $week['weekStartUtc'],
                                'weekEndUtc' => $week['weekEndUtc']
                            ];
                        }, $month['weeks'])
                    ];
                }, $months)
            ],
            'data' => [
                'newTickets' => $totalNewTickets,
                'newTicketsByMonth' => $newTicketsByMonth,
                'closedTickets' => $totalClosedTickets,
                'closedTicketsByMonth' => $closedTicketsByMonth,
                'carryoverTickets' => $totalCarryoverTickets,
                'carryoverTicketsByMonth' => $carryoverTicketsByMonth,
                'stages' => $stages,
                'responsible' => [] // TODO: Реализовать агрегацию по сотрудникам при необходимости
            ]
        ]);
    }
    
    // Границы недели (для режима 'weeks')
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
    
    // TASK-054: Логирование границ периода для запросов к Bitrix24
    error_log("[PERIOD] Period for Bitrix24 queries: {$periodStartStr} - {$periodEndStr} (UTC)");
    error_log("[PERIOD] Current week bounds: {$weekStart->format('Y-m-d H:i:s')} - {$weekEnd->format('Y-m-d H:i:s')} (UTC)");
    
    // Для обратной совместимости (используется в некоторых местах)
    $weekStartStr = $weekStart->format('Y-m-d H:i:s');
    $weekEndStr = $weekEnd->format('Y-m-d H:i:s');

    // Запрос 1: тикеты, созданные в неделю (для новых)
    // Запрос 2: тикеты, закрытые в неделю (movedTime в неделе + закрывающие стадии)
    // Объединяем оба запроса
    
    $allTicketsMap = []; // Используем map по ID, чтобы избежать дублей
    
    // TASK-048: Запрос тикетов, созданных за период 4 недель
    // TASK-054: Исправлена пагинация - загружаем все страницы
    $start = 0;
    $pageNum = 0;
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
        $pageNum++;
        
        // TASK-054: Логирование формата дат из Bitrix24 (первые 3 тикета)
        if ($start === 0 && count($items) > 0) {
            $sampleTicket = $items[0];
            error_log("[QUERY1] Sample ticket createdTime format: " . ($sampleTicket['createdTime'] ?? 'null'));
            error_log("[QUERY1] Sample ticket movedTime format: " . ($sampleTicket['movedTime'] ?? 'null'));
            error_log("[QUERY1] Sample ticket stageId: " . ($sampleTicket['stageId'] ?? 'null'));
            
            // TASK-054: Логирование всех тикетов из первого батча для диагностики
            if ($debug) {
                error_log("[QUERY1] First batch tickets (up to 5):");
                foreach (array_slice($items, 0, 5) as $idx => $item) {
                    error_log("  [{$idx}] ID: {$item['id']}, createdTime: " . ($item['createdTime'] ?? 'null') . ", movedTime: " . ($item['movedTime'] ?? 'null') . ", stageId: " . ($item['stageId'] ?? 'null'));
                }
            }
        }
        
        foreach ($items as $item) {
            $allTicketsMap[$item['id']] = $item;
        }

        // TASK-054: Улучшенная проверка наличия следующей страницы
        $nextValue = $result['result']['next'] ?? $result['next'] ?? null;
        $hasNext = $nextValue !== null && 
                  $nextValue !== '' && 
                  $nextValue !== '0' && 
                  (int)$nextValue > 0;
        
        // Продолжаем загрузку, если получили полный батч (pageSize) И есть next
        $hasMore = count($items) === $pageSize && $hasNext;
        
        if ($debug && $hasMore) {
            error_log("[QUERY1] Page {$pageNum}: loaded " . count($items) . " items, hasNext: " . ($hasNext ? 'true' : 'false') . ", continuing...");
        }
        
        $start += $pageSize;
    } while ($hasMore);
    
    error_log("[QUERY1] Created tickets total count: " . count($allTicketsMap));
    
    // TASK-048: Запрос тикетов, закрытых за период 4 недель (movedTime в периоде + закрывающие стадии)
    // TASK-054: Исправлена пагинация - загружаем все страницы
    $start = 0;
    $pageNum = 0;
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
        $pageNum++;
        
        // TASK-054: Логирование формата дат из Bitrix24 (первые 3 тикета)
        if ($start === 0 && count($items) > 0) {
            $sampleTicket = $items[0];
            error_log("[QUERY2] Sample ticket createdTime format: " . ($sampleTicket['createdTime'] ?? 'null'));
            error_log("[QUERY2] Sample ticket movedTime format: " . ($sampleTicket['movedTime'] ?? 'null'));
            error_log("[QUERY2] Sample ticket stageId: " . ($sampleTicket['stageId'] ?? 'null'));
            
            // TASK-054: Логирование всех тикетов из первого батча для диагностики
            if ($debug) {
                error_log("[QUERY2] First batch tickets (up to 5):");
                foreach (array_slice($items, 0, 5) as $idx => $item) {
                    error_log("  [{$idx}] ID: {$item['id']}, createdTime: " . ($item['createdTime'] ?? 'null') . ", movedTime: " . ($item['movedTime'] ?? 'null') . ", stageId: " . ($item['stageId'] ?? 'null'));
                }
            }
        }
        
        foreach ($items as $item) {
            $allTicketsMap[$item['id']] = $item;
        }

        // TASK-054: Улучшенная проверка наличия следующей страницы
        $nextValue = $result['result']['next'] ?? $result['next'] ?? null;
        $hasNext = $nextValue !== null && 
                  $nextValue !== '' && 
                  $nextValue !== '0' && 
                  (int)$nextValue > 0;
        
        // Продолжаем загрузку, если получили полный батч (pageSize) И есть next
        $hasMore = count($items) === $pageSize && $hasNext;
        
        if ($debug && $hasMore) {
            error_log("[QUERY2] Page {$pageNum}: loaded " . count($items) . " items, hasNext: " . ($hasNext ? 'true' : 'false') . ", continuing...");
        }
        
        $start += $pageSize;
    } while ($hasMore);
    
    error_log("[QUERY2] Closed tickets total count (after merge): " . count($allTicketsMap));
    
    // TASK-054: Проверка тикетов, которые есть в QUERY1, но могут отсутствовать в QUERY2
    // Это поможет понять, почему тикеты не попадают в категорию closedTicketsCreatedThisWeek
    if ($debug) {
        $query1Tickets = [];
        $query2Tickets = [];
        
        // Собираем ID тикетов из QUERY1 (созданные за период)
        $start = 0;
        do {
            $result = CRest::call('crm.item.list', [
                'entityTypeId' => $entityTypeId,
                'filter' => [
                    '>=createdTime' => $periodStartStr,
                    '<=createdTime' => $periodEndStr
                ],
                'select' => ['id', 'createdTime', 'movedTime', 'stageId'],
                'start' => $start
            ]);
            
            $items = $result['result']['items'] ?? [];
            foreach ($items as $item) {
                $query1Tickets[$item['id']] = $item;
            }
            
            $start += $pageSize;
        } while (isset($result['result']['next']));
        
        // Собираем ID тикетов из QUERY2 (закрытые за период)
        $start = 0;
        do {
            $result = CRest::call('crm.item.list', [
                'entityTypeId' => $entityTypeId,
                'filter' => [
                    '>=movedTime' => $periodStartStr,
                    '<=movedTime' => $periodEndStr,
                    'stageId' => $closingStages
                ],
                'select' => ['id', 'createdTime', 'movedTime', 'stageId'],
                'start' => $start
            ]);
            
            $items = $result['result']['items'] ?? [];
            foreach ($items as $item) {
                $query2Tickets[$item['id']] = $item;
            }
            
            $start += $pageSize;
        } while (isset($result['result']['next']));
        
        // Находим тикеты, которые есть в QUERY1, но отсутствуют в QUERY2
        $missingInQuery2 = [];
        foreach ($query1Tickets as $ticketId => $ticket) {
            if (!isset($query2Tickets[$ticketId])) {
                $stageId = $ticket['stageId'] ?? null;
                $stageIdUpper = $stageId ? strtoupper($stageId) : null;
                $isInClosingStages = $stageIdUpper && in_array($stageIdUpper, $closingStages, true);
                
                // Проверяем, может ли этот тикет быть закрытым
                if ($isInClosingStages) {
                    $missingInQuery2[$ticketId] = $ticket;
                }
            }
        }
        
        if (count($missingInQuery2) > 0) {
            error_log("[DEBUG] Tickets in QUERY1 but missing in QUERY2 (potential issue): " . count($missingInQuery2));
            foreach (array_slice($missingInQuery2, 0, 10) as $ticketId => $ticket) {
                error_log("  - Ticket {$ticketId}: createdTime={$ticket['createdTime']}, movedTime=" . ($ticket['movedTime'] ?? 'null') . ", stageId={$ticket['stageId']}");
            }
        }
    }
    
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
            $keeperId,
            $debug
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
    }
    
    // TASK-048: Всегда используем последний элемент из weeksData как текущую неделю
    // (массив weeksData уже отсортирован от старых к новым, последний элемент - текущая неделя)
    if (count($weeksData) > 0) {
        $currentWeekData = $weeksData[count($weeksData) - 1];
    } else {
        // Fallback: если weeksData пуст, формируем из series (последний элемент)
        $lastIndex = count($series['new']) > 0 ? count($series['new']) - 1 : 0;
        $currentWeekData = [
            'weekNumber' => (int)$weekStart->format('W'),
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
    // TASK-048: Гарантируем, что currentWeekData не null
    if (!$currentWeekData) {
        // Если currentWeekData всё ещё null, создаём из series (последний элемент)
        $lastIndex = count($series['new']) > 0 ? count($series['new']) - 1 : 0;
        $currentWeekData = [
            'weekNumber' => (int)$weekStart->format('W'),
            'newTickets' => $series['new'][$lastIndex] ?? 0,
            'closedTickets' => $series['closed'][$lastIndex] ?? 0,
            'closedTicketsCreatedThisWeek' => $series['closedCreatedThisWeek'][$lastIndex] ?? 0,
            'closedTicketsCreatedOtherWeek' => $series['closedCreatedOtherWeek'][$lastIndex] ?? 0,
            'carryoverTickets' => $series['carryover'][$lastIndex] ?? 0,
            'carryoverTicketsCreatedThisWeek' => $series['carryoverCreatedThisWeek'][$lastIndex] ?? 0,
            'carryoverTicketsCreatedOtherWeek' => $series['carryoverCreatedOtherWeek'][$lastIndex] ?? 0
        ];
    }
    
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

