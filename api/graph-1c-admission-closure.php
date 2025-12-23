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
require_once __DIR__ . '/cache/GraphAdmissionClosureCache.php';

header('Content-Type: application/json; charset=utf-8');

/**
 * TASK-059: Логирование в локальный файл приложения
 * 
 * Настройка логирования для записи в logs/app/ вместо системного nginx лога
 */
function setupAppLogging() {
    $logDir = __DIR__ . '/../logs/app';
    
    // Создаём директорию, если не существует
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    
    // Формируем путь к файлу лога (по дням)
    $logFile = $logDir . '/graph-admission-closure-' . date('Y-m-d') . '.log';
    
    // Настраиваем error_log для записи в локальный файл
    ini_set('log_errors', '1');
    ini_set('error_log', $logFile);
    
    return $logFile;
}

// Инициализация логирования
$appLogFile = setupAppLogging();

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
 * Вычисляет последние 4 месяца от текущей даты
 * TASK-058-01: Функция для расчета периода 4-месячного режима (3 для отображения + 1 для процентов)
 * 
 * @return array Массив месяцев с границами и неделями (4 месяца)
 * @throws Exception При ошибке работы с датами
 */
function calculateLastFourMonths(): array
{
    try {
        $tz = new DateTimeZone('UTC');
        $now = new DateTimeImmutable('now', $tz);
        $months = [];
        
        // Текущий месяц
        $currentMonth = $now->modify('first day of this month');
        // 3 месяца назад (начало периода)
        $threeMonthsAgo = $currentMonth->modify('-3 months');
        
        $monthNames = [
            1 => 'Январь', 2 => 'Февраль', 3 => 'Март', 4 => 'Апрель',
            5 => 'Май', 6 => 'Июнь', 7 => 'Июль', 8 => 'Август',
            9 => 'Сентябрь', 10 => 'Октябрь', 11 => 'Ноябрь', 12 => 'Декабрь'
        ];
        
        for ($i = 0; $i < 4; $i++) {
            $monthStart = $threeMonthsAgo->modify("+{$i} months");
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
        error_log('[calculateLastFourMonths] Error: ' . $e->getMessage());
        throw new Exception('Failed to calculate last four months: ' . $e->getMessage());
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
 * @param array $allStages Полный список стадий (для маппинга названий) - нужен для stagesByWeek (TASK-064)
 * @return array Метрики недели
 */
function calculateWeekMetrics(
    DateTimeImmutable $weekStart,
    DateTimeImmutable $weekEnd,
    array $allTickets,
    array $targetStages,
    array $closingStages,
    int $keeperId,
    bool $debug = false,
    array $allStages = []
): array {
    $newCount = 0;
    $closedCount = 0;
    $closedTicketsCreatedThisWeek = 0;
    $closedTicketsCreatedOtherWeek = 0;
    $carryoverCount = 0;
    $carryoverTicketsCreatedThisWeek = 0;
    $carryoverTicketsCreatedPreviousWeek = 0; // TASK-063: НОВОЕ
    $carryoverTicketsCreatedOlder = 0; // TASK-063: НОВОЕ
    $carryoverTicketsCreatedOtherWeek = 0; // TASK-063: DEPRECATED (для обратной совместимости)
    // TASK-064: Разбивка закрытий по стадиям для каждой недели
    $stageAgg = [];
    
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
            
            // Детальное отладочное логирование отключено
            //             // Детальное отладочное логирование отключено для уменьшения объёма логов
            // error_log("[CALCULATE-DEBUG] Ticket {$ticketId}:");
            // error_log("  - stageId: {$stageId} (inClosingStages: " . ($isInClosingStages ? 'true' : 'false') . ")");
            // error_log("  - createdTime: {$createdTime} -> " . ($createdDt ? $createdDt->format('Y-m-d H:i:s') : 'null'));
            // error_log("  - movedTime: {$movedTime} -> " . ($movedDt ? $movedDt->format('Y-m-d H:i:s') : 'null'));
            // error_log("  - weekStart: {$weekStartStr}, weekEnd: {$weekEndStr}");
            // error_log("  - isCreatedInRange: " . ($isCreatedInRange ? 'true' : 'false'));
            // error_log("  - isMovedInRange: " . ($isMovedInRange ? 'true' : 'false'));
            // error_log("  - Will be counted as closed: " . ($isInClosingStages && $isMovedInRange ? 'YES' : 'NO'));
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
                // Детальное логирование отключено для производительности
                // error_log("[CALCULATE] Ticket {$ticketId}: Created this week but movedTime out of range - createdTime: {$createdTime}, movedTime: {$movedTime}, stageId: {$stageId}");
            }
        }
        
        if ($shouldCountAsClosed) {
            $closedCount++;
            
            // Разбивка по критерию создания
            if ($isCreatedInRange) {
                $closedTicketsCreatedThisWeek++;
                
                // TASK-054: Логирование тикетов, созданных и закрытых на текущей неделе
                // Детальное логирование отключено для производительности
                // error_log("[CALCULATE] Ticket {$ticketId}: closedTicketsCreatedThisWeek (reason: {$closedReason}) - createdTime: {$createdTime}, movedTime: {$movedTime}, stageId: {$stageId}");
            } else {
                $closedTicketsCreatedOtherWeek++;
            }

            // TASK-064: Агрегация закрытий по стадиям для недели
            if ($stageId) {
                if (!isset($stageAgg[$stageId])) {
                    $stageAgg[$stageId] = 0;
                }
                $stageAgg[$stageId]++;
            }
        } else if ($isInClosingStages && !$isMovedInRange) {
            // TASK-054: Логирование закрытых тикетов, которые не попали в диапазон
            // Детальное логирование отключено для производительности
            // error_log("[CALCULATE] Ticket {$ticketId}: Closed ticket but not counted - createdTime: {$createdTime}, movedTime: {$movedTime}, stageId: {$stageId}, isCreatedInRange: " . ($isCreatedInRange ? 'true' : 'false') . ", isMovedInRange: " . ($isMovedInRange ? 'true' : 'false'));
        }
        
        // Переходящие тикеты (в рабочих стадиях, не закрытые)
        if (isCarryoverTicket($ticket, $weekStart, $weekEnd, $targetStages, $closingStages)) {
            $carryoverCount++;
            
            // TASK-063: Разбивка по критерию создания на три категории
            $createdInThisWeek = isInRange($createdTime, $weekStart, $weekEnd);
            if ($createdInThisWeek) {
                $carryoverTicketsCreatedThisWeek++;
            } else {
                // TASK-063: Определяем, создан ли тикет в предыдущую неделю (ISO-8601)
                // Используем простой подход: вычитаем 1 неделю от начала текущей недели
                $previousWeekStart = (clone $weekStart)->modify('-1 week');
                // Убеждаемся, что это начало недели (понедельник)
                $isoYear = (int)$previousWeekStart->format('o');
                $isoWeek = (int)$previousWeekStart->format('W');
                $previousWeekStart = $previousWeekStart->setISODate($isoYear, $isoWeek, 1)->setTime(0, 0, 0);
                $previousWeekEnd = (clone $previousWeekStart)->modify('+6 days')->setTime(23, 59, 59);
                
                $createdInPreviousWeek = isInRange($createdTime, $previousWeekStart, $previousWeekEnd);
                if ($createdInPreviousWeek) {
                    $carryoverTicketsCreatedPreviousWeek++;
                } else {
                    $carryoverTicketsCreatedOlder++;
                }
                
                // TASK-063: Логирование для всех тикетов для диагностики (первые 10)
                if ($carryoverCount <= 10 && $createdTime) {
                    $prevStartStr = $previousWeekStart->format('Y-m-d H:i:s');
                    $prevEndStr = $previousWeekEnd->format('Y-m-d H:i:s');
                    
                    // Парсим createdTime для сравнения
                    try {
                        $createdDt = new DateTimeImmutable($createdTime, new DateTimeZone('UTC'));
                        $createdDtStr = $createdDt->format('Y-m-d H:i:s');
                    } catch (Exception $e) {
                        $createdDtStr = 'parse_error';
                    }
                    
                    error_log("[CALCULATE-CARRYOVER-DEBUG] Ticket #{$carryoverCount}: createdTime={$createdTime} ({$createdDtStr}), weekStart={$weekStartStr}, previousWeek={$prevStartStr} - {$prevEndStr}, inPreviousWeek=" . ($createdInPreviousWeek ? 'YES' : 'NO') . ", category=" . ($createdInPreviousWeek ? 'previousWeek' : 'older'));
                }
            }
        }
    }
    
    // TASK-063: Вычисляем старое поле для обратной совместимости
    $carryoverTicketsCreatedOtherWeek = $carryoverTicketsCreatedPreviousWeek + $carryoverTicketsCreatedOlder;
    
    // TASK-063: Логирование для диагностики
    if ($carryoverCount > 0) {
        $weekNum = (int)$weekStart->format('W');
        error_log("[CALCULATE-CARRYOVER] Week {$weekNum}: {$weekStartStr} - {$weekEndStr}");
        error_log("[CALCULATE-CARRYOVER] Total: {$carryoverCount}, ThisWeek: {$carryoverTicketsCreatedThisWeek}, PreviousWeek: {$carryoverTicketsCreatedPreviousWeek}, Older: {$carryoverTicketsCreatedOlder}");
        $sum = $carryoverTicketsCreatedThisWeek + $carryoverTicketsCreatedPreviousWeek + $carryoverTicketsCreatedOlder;
        if ($sum != $carryoverCount) {
            error_log("[CALCULATE-CARRYOVER] ERROR: Sum mismatch! {$sum} != {$carryoverCount}");
        }
    }
    
    // TASK-064: Формируем массив стадий для конкретной недели
    $stages = array_map(function ($stageId) use ($stageAgg, $allStages) {
        $stageName = isset($allStages[$stageId]) ? $allStages[$stageId]['name'] : $stageId;
        return [
            'stageId' => $stageId,
            'stageName' => $stageName,
            'count' => $stageAgg[$stageId]
        ];
    }, array_keys($stageAgg));

    return [
        'newTickets' => $newCount,
        'closedTickets' => $closedCount,
        'closedTicketsCreatedThisWeek' => $closedTicketsCreatedThisWeek,
        'closedTicketsCreatedOtherWeek' => $closedTicketsCreatedOtherWeek,
        'carryoverTickets' => $carryoverCount,
        'carryoverTicketsCreatedThisWeek' => $carryoverTicketsCreatedThisWeek,
        'carryoverTicketsCreatedPreviousWeek' => $carryoverTicketsCreatedPreviousWeek, // TASK-063: НОВОЕ
        'carryoverTicketsCreatedOlder' => $carryoverTicketsCreatedOlder, // TASK-063: НОВОЕ
        'carryoverTicketsCreatedOtherWeek' => $carryoverTicketsCreatedOtherWeek, // TASK-063: DEPRECATED (для обратной совместимости)
        // TASK-064: Отдаём разбивку закрытий по стадиям для этой недели
        'stages' => $stages,
        'stageCounts' => $stageAgg
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
    $forceRefresh = isset($body['forceRefresh']) ? (bool)$body['forceRefresh'] : false; // TASK-059-05: Параметр для принудительного обновления кеша
    $debug = isset($body['debug']) ? (bool)$body['debug'] : false;
    
    // TASK-053-03: Валидация periodMode
    if (!in_array($periodMode, ['weeks', 'months'], true)) {
        http_response_code(400);
        jsonResponse([
            'success' => false,
            'error' => 'Invalid periodMode. Must be "weeks" or "months".'
        ]);
    }

    // TASK-065: Для недельного режима используем новый модуль
    if ($periodMode === 'weeks') {
        require_once __DIR__ . '/graph-admission-closure/bootstrap.php';
        exit; // bootstrap.php уже отправит ответ и завершит выполнение
    }

    // TASK-053-03: Обработка режима периода (months - legacy)
    if ($periodMode === 'months') {
        // TASK-059: Логирование общего времени выполнения для режима "months"
        $monthsModeStartTime = microtime(true);
        
        // TASK-059-05: Проверка кеша для режима "months"
        if (!$forceRefresh) {
            $cacheKey = GraphAdmissionClosureCache::generateKey([
                'product' => $product,
                'periodMode' => $periodMode,
                'includeTickets' => $includeTickets,
                'includeNewTicketsByStages' => $includeNewTicketsByStages,
                'includeCarryoverTickets' => $includeCarryoverTickets,
                'includeCarryoverTicketsByDuration' => $includeCarryoverTicketsByDuration
            ]);
            
            $cachedData = GraphAdmissionClosureCache::get($cacheKey);
            if ($cachedData !== null) {
                $cacheResponseTime = microtime(true) - $monthsModeStartTime;
                error_log("[Cache] Cache hit for key: {$cacheKey}");
                error_log("[MONTHS-PERFORMANCE] Total execution time (from cache): " . round($cacheResponseTime, 3) . " seconds");
                jsonResponse($cachedData);
            }
            
            error_log("[Cache] Cache miss for key: {$cacheKey}");
        } else {
            error_log("[Cache] Force refresh requested, skipping cache check");
        }
        
        // TASK-058-01: Получаем 4 месяца (3 для отображения + 1 для процентов)
        $allMonths = calculateLastFourMonths();
        // Структура $allMonths: [0 => Сентябрь (4-й, для процентов), 1 => Октябрь, 2 => Ноябрь, 3 => Декабрь]
        
        // Последние 3 месяца для отображения (Октябрь, Ноябрь, Декабрь)
        // TASK-058-01-FIX: Берем последние 3 месяца для отображения, а не первые
        $months = array_slice($allMonths, 1, 3); // Индексы 1, 2, 3
        
        // 4-й месяц (самый старый, Сентябрь) для расчета процентов
        $previousMonth = $allMonths[0] ?? null; // Индекс 0
        
        // Логирование месяцев отключено для уменьшения объёма логов
        // error_log("[MONTHS] All 4 months: " . json_encode(array_map(function($m) {
        //     return $m['monthName'] . ' ' . $m['year'];
        // }, $allMonths), JSON_UNESCAPED_UNICODE));
        
        // Период для запросов к Bitrix24 (включая 4-й месяц для расчета процентов)
        $periodStartUtc = $allMonths[0]['monthStartUtc']; // Самый старый месяц (4-й, Сентябрь)
        $periodEndUtc = $allMonths[3]['monthEndUtc']; // Последний месяц (Декабрь, текущий)
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
        
        /**
         * TASK-059-03: Параллельное выполнение запросов к Bitrix24 API
         * 
         * Выполняет первые страницы запросов 1 и 2 параллельно через curl_multi_exec
         * 
         * @param array $query1Params Параметры запроса 1
         * @param array $query2Params Параметры запроса 2
         * @return array [query1Result, query2Result]
         */
        function executeParallelQueries(array $query1Params, array $query2Params): array
        {
            // Получаем настройки через рефлексию (как в CRest)
            $settings = null;
            $isWebhook = false;
            
            try {
                $reflection = new ReflectionClass('CRest');
                $method = $reflection->getMethod('getAppSettings');
                $method->setAccessible(true);
                $settings = $method->invoke(null);
            } catch (Exception $e) {
                error_log("[PARALLEL-QUERIES] Failed to get settings: " . $e->getMessage());
                return [
                    ['error' => 'settings_not_available'],
                    ['error' => 'settings_not_available']
                ];
            }
            
            if (!$settings || $settings === false) {
                return [
                    ['error' => 'settings_not_available'],
                    ['error' => 'settings_not_available']
                ];
            }
            
            // Определяем тип авторизации
            $isWebhook = !empty($settings['is_web_hook']) && $settings['is_web_hook'] === 'Y';
            $baseUrl = '';
            
            if ($isWebhook) {
                // Webhook URL уже содержит токен авторизации
                $baseUrl = defined('C_REST_WEB_HOOK_URL') ? C_REST_WEB_HOOK_URL : '';
                if (empty($baseUrl) && isset($settings['client_endpoint'])) {
                    $baseUrl = $settings['client_endpoint'];
                }
                // error_log("[PARALLEL-QUERIES] Using webhook authentication");
            } else {
                // OAuth - используем client_endpoint и добавляем токен в параметры
                $baseUrl = isset($settings['client_endpoint']) ? $settings['client_endpoint'] : '';
                
                // Получаем токен из настроек
                $accessToken = $settings['access_token'] ?? '';
                
                // Проверяем, не истёк ли токен (проверяем expires_at если есть)
                $expiresAt = isset($settings['expires_at']) ? (int)$settings['expires_at'] : 0;
                $now = time();
                
                // Если токен истёк или истекает в ближайшие 60 секунд, пытаемся обновить
                if (empty($accessToken) || ($expiresAt > 0 && $now >= ($expiresAt - 60))) {
                    // error_log("[PARALLEL-QUERIES] Token expired or expiring soon, attempting refresh...");
                    
                    // Пытаемся сделать тестовый запрос через CRest, который автоматически обновит токен при ошибке
                    // Это вызовет GetNewAuth внутри CRest
                    try {
                        $testResult = CRest::call('app.info', []);
                        // if (isset($testResult['error']) && $testResult['error'] === 'expired_token') {
                        //     error_log("[PARALLEL-QUERIES] Token expired, CRest should refresh it automatically");
                        // }
                        
                        // Получаем обновлённые настройки после возможного обновления
                        $reflection = new ReflectionClass('CRest');
                        $getMethod = $reflection->getMethod('getAppSettings');
                        $getMethod->setAccessible(true);
                        $settings = $getMethod->invoke(null);
                        $accessToken = $settings['access_token'] ?? '';
                    } catch (Exception $e) {
                        error_log("[PARALLEL-QUERIES] Error checking token: " . $e->getMessage());
                    }
                }
                
                if (!empty($accessToken)) {
                    // Добавляем токен авторизации в параметры
                    $query1Params['auth'] = $accessToken;
                    $query2Params['auth'] = $accessToken;
                    // error_log("[PARALLEL-QUERIES] Using OAuth authentication with token");
                } else {
                    error_log("[PARALLEL-QUERIES] ERROR: OAuth mode but access_token not available");
                }
            }
            
            if (empty($baseUrl)) {
                error_log("[PARALLEL-QUERIES] Base URL not found");
                return [
                    ['error' => 'base_url_not_configured'],
                    ['error' => 'base_url_not_configured']
                ];
            }
            
            // Формируем URL для запросов (как в CRest::callCurl)
            // Для webhook URL уже содержит путь /rest/1/token/, для OAuth - только /rest/
            // В обоих случаях добавляем метод и расширение
            $method = 'crm.item.list';
            $extension = '.json';
            
            if ($isWebhook) {
                // Webhook URL уже содержит полный путь, просто добавляем метод
                $url1 = rtrim($baseUrl, '/') . '/' . $method . $extension;
                $url2 = rtrim($baseUrl, '/') . '/' . $method . $extension;
            } else {
                // OAuth - добавляем метод к client_endpoint
                $url1 = rtrim($baseUrl, '/') . '/' . $method . $extension;
                $url2 = rtrim($baseUrl, '/') . '/' . $method . $extension;
            }
            
            // Создаем POST данные
            $postData1 = http_build_query($query1Params);
            $postData2 = http_build_query($query2Params);
            
            // Инициализируем curl_multi
            $multiHandle = curl_multi_init();
            $handles = [];
            $results = [];
            
            // Создаем curl дескрипторы
            foreach ([
                ['url' => $url1, 'data' => $postData1, 'index' => 0],
                ['url' => $url2, 'data' => $postData2, 'index' => 1]
            ] as $query) {
                $ch = curl_init($query['url']);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, $query['data']);
                curl_setopt($ch, CURLOPT_TIMEOUT, 30);
                curl_setopt($ch, CURLOPT_USERAGENT, 'Bitrix24 CRest PHP Parallel');
                
                if (defined("C_REST_IGNORE_SSL") && C_REST_IGNORE_SSL === true) {
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
                }
                
                curl_multi_add_handle($multiHandle, $ch);
                $handles[$query['index']] = $ch;
            }
            
            // Выполняем параллельные запросы
            $running = null;
            do {
                curl_multi_exec($multiHandle, $running);
                curl_multi_select($multiHandle, 0.1);
            } while ($running > 0);
            
            // Получаем результаты
            foreach ($handles as $index => $ch) {
                $response = curl_multi_getcontent($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $error = curl_error($ch);
                
                if ($error) {
                    error_log("[PARALLEL-QUERIES] Error for query {$index}: {$error}");
                    $results[$index] = ['error' => $error];
                } elseif ($httpCode !== 200) {
                    error_log("[PARALLEL-QUERIES] HTTP error {$httpCode} for query {$index}");
                    $results[$index] = ['error' => "HTTP {$httpCode}"];
                } else {
                    // Парсим JSON ответ
                    $data = json_decode($response, true);
                    if ($data === null) {
                        error_log("[PARALLEL-QUERIES] Failed to decode JSON for query {$index}");
                        $results[$index] = ['error' => 'invalid_json'];
                    } else {
                        $results[$index] = $data;
                    }
                }
                
                curl_multi_remove_handle($multiHandle, $ch);
                curl_close($ch);
            }
            
            curl_multi_close($multiHandle);
            
            return [
                $results[0] ?? ['error' => 'unknown_error'],
                $results[1] ?? ['error' => 'unknown_error']
            ];
        }
        
        // TASK-059-03: Параллельная загрузка первых страниц запросов 1 и 2
        $query1StartTime = microtime(true);
        $query2StartTime = microtime(true);
        
        // Параметры запроса 1 (первая страница)
        $query1Params = [
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
            'start' => 0
        ];
        
        // Параметры запроса 2 (первая страница)
        $query2Params = [
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
            'start' => 0
        ];
        
        // Выполняем первые страницы параллельно
        $parallelResults = executeParallelQueries($query1Params, $query2Params);
        $query1FirstPage = $parallelResults[0];
        $query2FirstPage = $parallelResults[1];
        
        // Проверяем ошибки и fallback на последовательные запросы при необходимости
        $useParallel = !isset($query1FirstPage['error']) && !isset($query2FirstPage['error']);
        
        if (!$useParallel) {
            error_log("[MONTHS-PARALLEL] Parallel queries failed, falling back to sequential queries");
            error_log("[MONTHS-PARALLEL] Query1 error: " . ($query1FirstPage['error'] ?? 'none'));
            error_log("[MONTHS-PARALLEL] Query2 error: " . ($query2FirstPage['error'] ?? 'none'));
        }
        
        // Запрос 1: тикеты, созданные за период 3 месяцев
        // TASK-059-03: Используем результат параллельного запроса для первой страницы
        if ($useParallel) {
            $result = $query1FirstPage;
            $pageNum = 1;
        } else {
            // Fallback на последовательный запрос
            $result = CRest::call('crm.item.list', $query1Params);
            $pageNum = 1;
        }
        
        if (isset($result['error'])) {
            throw new Exception($result['error_description'] ?? $result['error']);
        }

        $items = $result['result']['items'] ?? [];
        
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
            // Логирование пагинации отключено для уменьшения объёма логов
            // error_log("[MONTHS-QUERY1] Page {$pageNum}: loaded " . count($items) . " items, hasNext: " . ($hasNext ? 'true' : 'false') . ", continuing...");
        }
        
        // Продолжаем пагинацию последовательно (если нужно)
        $start = $pageSize;
        while ($hasMore) {
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

            $nextValue = $result['result']['next'] ?? $result['next'] ?? null;
            $hasNext = $nextValue !== null && 
                      $nextValue !== '' && 
                      $nextValue !== '0' && 
                      (int)$nextValue > 0;
            
            $hasMore = count($items) === $pageSize && $hasNext;
            
            if ($debug && $hasMore) {
                // Логирование пагинации отключено для уменьшения объёма логов
            // error_log("[MONTHS-QUERY1] Page {$pageNum}: loaded " . count($items) . " items, hasNext: " . ($hasNext ? 'true' : 'false') . ", continuing...");
            }
            
            $start += $pageSize;
        }
        
        $query1Time = microtime(true) - $query1StartTime;
        error_log("[MONTHS-QUERY1] Created tickets total count: " . count($allTicketsMap) . " (time: " . round($query1Time, 2) . "s, parallel: " . ($useParallel ? 'yes' : 'no') . ")");
        
        // Запрос 2: тикеты, закрытые за период 3 месяцев
        // TASK-059-03: Используем результат параллельного запроса для первой страницы
        if ($useParallel) {
            $result = $query2FirstPage;
            $pageNum = 1;
        } else {
            // Fallback на последовательный запрос
            $result = CRest::call('crm.item.list', $query2Params);
            $pageNum = 1;
        }
        
        if (isset($result['error'])) {
            throw new Exception($result['error_description'] ?? $result['error']);
        }

        $items = $result['result']['items'] ?? [];
        
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
            // Логирование пагинации отключено для уменьшения объёма логов
            // error_log("[MONTHS-QUERY2] Page {$pageNum}: loaded " . count($items) . " items, hasNext: " . ($hasNext ? 'true' : 'false') . ", continuing...");
        }
        
        // Продолжаем пагинацию последовательно (если нужно)
        $start = $pageSize;
        while ($hasMore) {
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

            $nextValue = $result['result']['next'] ?? $result['next'] ?? null;
            $hasNext = $nextValue !== null && 
                      $nextValue !== '' && 
                      $nextValue !== '0' && 
                      (int)$nextValue > 0;
            
            $hasMore = count($items) === $pageSize && $hasNext;
            
            if ($debug && $hasMore) {
                // Логирование пагинации отключено для уменьшения объёма логов
                // error_log("[MONTHS-QUERY2] Page {$pageNum}: loaded " . count($items) . " items, hasNext: " . ($hasNext ? 'true' : 'false') . ", continuing...");
            }
            
            $start += $pageSize;
        }
        
        $query2Time = microtime(true) - $query2StartTime;
        error_log("[MONTHS-QUERY2] Closed tickets total count (after merge): " . count($allTicketsMap) . " (time: " . round($query2Time, 2) . "s, parallel: " . ($useParallel ? 'yes' : 'no') . ")");
        
        // Запрос 3: переходящие тикеты (если запрошено)
        if ($includeCarryoverTickets) {
            // TASK-059-01: Оптимизация запроса переходящих тикетов
            // Добавлен фильтр по createdTime для ограничения периода загрузки
            // Переходящие тикеты — это тикеты, созданные до конца периода и находящиеся в рабочих стадиях
            // Поэтому достаточно фильтровать по createdTime <= periodEnd
            $query3StartTime = microtime(true);
            $ticketsCountBeforeQuery3 = count($allTicketsMap);
            error_log("[MONTHS-QUERY3] Starting carryover tickets query with createdTime filter: <= {$periodEndStr}");
            
            foreach ($targetStages as $stageId) {
                $start = 0;
                $pageNum = 0;
                $hasMore = true;
                
                while ($hasMore) {
                    $result = CRest::call('crm.item.list', [
                        'entityTypeId' => $entityTypeId,
                        'filter' => [
                            'stageId' => $stageId,
                            // TASK-059-01: Фильтр по createdTime для ограничения периода
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
            
            $query3Time = microtime(true) - $query3StartTime;
            $query3TicketsCount = count($allTicketsMap) - $ticketsCountBeforeQuery3;
            error_log("[MONTHS-QUERY3] Carryover tickets query completed in " . round($query3Time, 2) . " seconds, loaded {$query3TicketsCount} new tickets (total: " . count($allTicketsMap) . ")");
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
        
        // TASK-059-02: Объединённая агрегация в один цикл по тикетам
        // Инициализация структуры данных для агрегации всех метрик
        $monthMetrics = [];
        $stageAgg = [];
        $allStages = [
            'DT140_12:SUCCESS' => ['name' => 'Успешное закрытие', 'color' => '#28a745'],
            'DT140_12:FAIL' => ['name' => 'Отклонено', 'color' => '#dc3545'],
            'DT140_12:UC_0GBU8Z' => ['name' => 'Закрыли без задачи', 'color' => '#6c757d']
        ];
        
        // Инициализация структуры данных для каждого месяца и недели
        foreach ($months as $month) {
            $monthNumber = $month['monthNumber'];
            $monthMetrics[$monthNumber] = [
                'newTickets' => 0,
                'closedTickets' => 0,
                'closedTicketsCreatedThisWeek' => 0,
                'closedTicketsCreatedOtherWeek' => 0,
                'carryoverTickets' => 0,
                'carryoverTicketsCreatedThisWeek' => 0,
                'carryoverTicketsCreatedPreviousWeek' => 0, // TASK-063: НОВОЕ
                'carryoverTicketsCreatedOlder' => 0, // TASK-063: НОВОЕ
                'carryoverTicketsCreatedOtherWeek' => 0, // TASK-063: DEPRECATED
                'weeks' => []
            ];
            
            foreach ($month['weeks'] as $week) {
                $weekNumber = $week['weekNumber'];
                $monthMetrics[$monthNumber]['weeks'][$weekNumber] = [
                    'newTickets' => 0,
                    'closedTickets' => 0,
                    'closedTicketsCreatedThisWeek' => 0,
                    'closedTicketsCreatedOtherWeek' => 0,
                    'carryoverTickets' => 0,
                    'carryoverTicketsCreatedThisWeek' => 0,
                    'carryoverTicketsCreatedOtherWeek' => 0
                ];
            }
        }
        
        // TASK-059-02: Один проход по тикетам для агрегации всех метрик
        $aggregationStartTime = microtime(true);
        error_log("[MONTHS-AGGREGATION] Starting unified aggregation for " . count($tickets) . " tickets");
        
        foreach ($tickets as $ticket) {
            $createdTime = $ticket['createdTime'] ?? null;
            $movedTime = $ticket['movedTime'] ?? $ticket['updatedTime'] ?? null;
            $stageId = $ticket['stageId'] ?? null;
            $stageId = $stageId ? strtoupper($stageId) : null;
            
            // Для каждого месяца определяем метрики
            foreach ($months as $month) {
                $monthStart = $month['monthStart'];
                $monthEnd = $month['monthEnd'];
                $monthNumber = $month['monthNumber'];
                
                // Новые тикеты за месяц
                if (isInRange($createdTime, $monthStart, $monthEnd)) {
                    $monthMetrics[$monthNumber]['newTickets']++;
                }
                
                // Закрытые тикеты за месяц
                if ($stageId && in_array($stageId, $closingStages, true)) {
                    if (isInRange($movedTime, $monthStart, $monthEnd)) {
                        $monthMetrics[$monthNumber]['closedTickets']++;
                        
                        // Разбивка по критерию создания (TASK-058-03)
                        if (isInRange($createdTime, $monthStart, $monthEnd)) {
                            $monthMetrics[$monthNumber]['closedTicketsCreatedThisWeek']++;
                        } else {
                            $monthMetrics[$monthNumber]['closedTicketsCreatedOtherWeek']++;
                        }
                        
                        // Агрегация по стадиям
                        if (!isset($stageAgg[$stageId])) {
                            $stageAgg[$stageId] = 0;
                        }
                        $stageAgg[$stageId]++;
                    }
                }
                
                // Переходящие тикеты на конец месяца
                if (isCarryoverTicket($ticket, $monthEnd, $monthEnd, $targetStages, $closingStages)) {
                    $monthMetrics[$monthNumber]['carryoverTickets']++;
                    
                    // TASK-063: Разбивка по критерию создания на три категории
                    // Для месячного режима используем логику месяца (этого месяца, предыдущего месяца, остальные)
                    // Но для консистентности с недельным режимом, оставляем старую логику для месячной агрегации
                    // и обновляем только недельную разбивку
                    if (isInRange($createdTime, $monthStart, $monthEnd)) {
                        $monthMetrics[$monthNumber]['carryoverTicketsCreatedThisWeek']++;
                    } else {
                        $monthMetrics[$monthNumber]['carryoverTicketsCreatedOtherWeek']++;
                    }
                }
                
                // Агрегация по неделям внутри месяца
                foreach ($month['weeks'] as $week) {
                    $weekStart = $week['weekStart'];
                    $weekEnd = $week['weekEnd'];
                    $weekNumber = $week['weekNumber'];
                    
                    // Новые тикеты за неделю
                    if (isInRange($createdTime, $weekStart, $weekEnd)) {
                        $monthMetrics[$monthNumber]['weeks'][$weekNumber]['newTickets']++;
                    }
                    
                    // Закрытые тикеты за неделю
                    if ($stageId && in_array($stageId, $closingStages, true)) {
                        // Используем логику из calculateWeekMetrics для определения закрытых тикетов
                        $isMovedInRange = isInRange($movedTime, $weekStart, $weekEnd);
                        $isCreatedInRange = isInRange($createdTime, $weekStart, $weekEnd);
                        $shouldCountAsClosed = false;
                        
                        if ($isMovedInRange) {
                            $shouldCountAsClosed = true;
                        } else if ($isCreatedInRange && !$movedTime) {
                            $shouldCountAsClosed = true;
                        } else if ($isCreatedInRange) {
                            $shouldCountAsClosed = true;
                        }
                        
                        if ($shouldCountAsClosed) {
                            $monthMetrics[$monthNumber]['weeks'][$weekNumber]['closedTickets']++;
                            
                            // Разбивка по критерию создания
                            if ($isCreatedInRange) {
                                $monthMetrics[$monthNumber]['weeks'][$weekNumber]['closedTicketsCreatedThisWeek']++;
                            } else {
                                $monthMetrics[$monthNumber]['weeks'][$weekNumber]['closedTicketsCreatedOtherWeek']++;
                            }
                        }
                    }
                    
                    // Переходящие тикеты за неделю
                    if (isCarryoverTicket($ticket, $weekStart, $weekEnd, $targetStages, $closingStages)) {
                        $monthMetrics[$monthNumber]['weeks'][$weekNumber]['carryoverTickets']++;
                        
                        // TASK-063: Разбивка по критерию создания на три категории
                        $createdInThisWeek = isInRange($createdTime, $weekStart, $weekEnd);
                        if ($createdInThisWeek) {
                            $monthMetrics[$monthNumber]['weeks'][$weekNumber]['carryoverTicketsCreatedThisWeek']++;
                        } else {
                            // TASK-063: Определяем, создан ли тикет в предыдущую неделю (ISO-8601)
                            $tz = $weekStart->getTimezone();
                            $isoYear = (int)$weekStart->format('o');
                            $isoWeek = (int)$weekStart->format('W');
                            
                            if ($isoWeek > 1) {
                                $previousWeekNumber = $isoWeek - 1;
                                $previousWeekYear = $isoYear;
                            } else {
                                $previousWeekYear = $isoYear - 1;
                                $lastDayOfPrevYear = (new DateTimeImmutable('now', $tz))->setISODate($previousWeekYear, 1, 1)->modify('-1 day');
                                $previousWeekNumber = (int)$lastDayOfPrevYear->format('W');
                            }
                            
                            $previousWeekStart = (new DateTimeImmutable('now', $tz))->setISODate($previousWeekYear, $previousWeekNumber, 1)->setTime(0, 0, 0);
                            $previousWeekEnd = (clone $previousWeekStart)->modify('+6 days')->setTime(23, 59, 59);
                            
                            $createdInPreviousWeek = isInRange($createdTime, $previousWeekStart, $previousWeekEnd);
                            if ($createdInPreviousWeek) {
                                if (!isset($monthMetrics[$monthNumber]['weeks'][$weekNumber]['carryoverTicketsCreatedPreviousWeek'])) {
                                    $monthMetrics[$monthNumber]['weeks'][$weekNumber]['carryoverTicketsCreatedPreviousWeek'] = 0;
                                }
                                $monthMetrics[$monthNumber]['weeks'][$weekNumber]['carryoverTicketsCreatedPreviousWeek']++;
                            } else {
                                if (!isset($monthMetrics[$monthNumber]['weeks'][$weekNumber]['carryoverTicketsCreatedOlder'])) {
                                    $monthMetrics[$monthNumber]['weeks'][$weekNumber]['carryoverTicketsCreatedOlder'] = 0;
                                }
                                $monthMetrics[$monthNumber]['weeks'][$weekNumber]['carryoverTicketsCreatedOlder']++;
                            }
                            // DEPRECATED: для обратной совместимости
                            if (!isset($monthMetrics[$monthNumber]['weeks'][$weekNumber]['carryoverTicketsCreatedOtherWeek'])) {
                                $monthMetrics[$monthNumber]['weeks'][$weekNumber]['carryoverTicketsCreatedOtherWeek'] = 0;
                            }
                            $monthMetrics[$monthNumber]['weeks'][$weekNumber]['carryoverTicketsCreatedOtherWeek']++;
                        }
                    }
                }
            }
        }
        
        $aggregationTime = microtime(true) - $aggregationStartTime;
        error_log("[MONTHS-AGGREGATION] Unified aggregation completed in " . round($aggregationTime, 2) . " seconds");
        
        // Формирование ответа из агрегированных данных
        $newTicketsByMonth = [];
        $closedTicketsByMonth = [];
        $carryoverTicketsByMonth = [];
        $totalNewTickets = 0;
        $totalClosedTickets = 0;
        $totalCarryoverTickets = 0;
        
        foreach ($months as $month) {
            $monthNumber = $month['monthNumber'];
            $metrics = $monthMetrics[$monthNumber];
            
            // Подсчёт итогов
            $totalNewTickets += $metrics['newTickets'];
            $totalClosedTickets += $metrics['closedTickets'];
            $totalCarryoverTickets += $metrics['carryoverTickets'];
            
            // TASK-058-03: Проверка корректности расчета
            // Общее число закрытых тикетов должно равняться сумме "этой неделей" + "другой неделей"
            if ($metrics['closedTickets'] !== ($metrics['closedTicketsCreatedThisWeek'] + $metrics['closedTicketsCreatedOtherWeek'])) {
                error_log("[MONTHS] Warning: Total closed tickets ({$metrics['closedTickets']}) != thisWeek ({$metrics['closedTicketsCreatedThisWeek']}) + otherWeek ({$metrics['closedTicketsCreatedOtherWeek']}) for month: {$month['monthName']} {$month['year']}");
            }
            
            // Формирование данных для недель
            $weeksData = [];
            foreach ($month['weeks'] as $week) {
                $weekNumber = $week['weekNumber'];
                $weekMetrics = $metrics['weeks'][$weekNumber] ?? [
                    'newTickets' => 0,
                    'closedTickets' => 0,
                    'closedTicketsCreatedThisWeek' => 0,
                    'closedTicketsCreatedOtherWeek' => 0,
                    'carryoverTickets' => 0,
                    'carryoverTicketsCreatedThisWeek' => 0,
                    'carryoverTicketsCreatedPreviousWeek' => 0, // TASK-063: НОВОЕ
                    'carryoverTicketsCreatedOlder' => 0, // TASK-063: НОВОЕ
                    'carryoverTicketsCreatedOtherWeek' => 0 // TASK-063: DEPRECATED
                ];
                
                $weeksData[] = [
                    'weekNumber' => $weekNumber,
                    'count' => $weekMetrics['newTickets'],
                    'closedCount' => $weekMetrics['closedTickets'],
                    'closedCreatedThisWeek' => $weekMetrics['closedTicketsCreatedThisWeek'],
                    'closedCreatedOtherWeek' => $weekMetrics['closedTicketsCreatedOtherWeek'],
                    'carryoverCount' => $weekMetrics['carryoverTickets'],
                    'carryoverCreatedThisWeek' => $weekMetrics['carryoverTicketsCreatedThisWeek'],
                    'carryoverCreatedPreviousWeek' => $weekMetrics['carryoverTicketsCreatedPreviousWeek'] ?? 0, // TASK-063: НОВОЕ
                    'carryoverCreatedOlder' => $weekMetrics['carryoverTicketsCreatedOlder'] ?? 0, // TASK-063: НОВОЕ
                    'carryoverCreatedOtherWeek' => $weekMetrics['carryoverTicketsCreatedOtherWeek'] ?? 0 // TASK-063: DEPRECATED
                ];
            }
            
            // Формирование ответа для месяца
            $newTicketsByMonth[] = [
                'month' => $monthNumber,
                'monthName' => $month['monthName'],
                'count' => $metrics['newTickets'],
                'weeks' => $weeksData
            ];
            
            $closedTicketsByMonth[] = [
                'month' => $monthNumber,
                'monthName' => $month['monthName'],
                'count' => $metrics['closedTickets'],
                'closedCreatedThisWeek' => $metrics['closedTicketsCreatedThisWeek'],
                'closedCreatedOtherWeek' => $metrics['closedTicketsCreatedOtherWeek'],
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
                'month' => $monthNumber,
                'monthName' => $month['monthName'],
                'count' => $metrics['carryoverTickets'],
                'carryoverCreatedThisWeek' => $metrics['carryoverTicketsCreatedThisWeek'],
                'carryoverCreatedOtherWeek' => $metrics['carryoverTicketsCreatedOtherWeek'],
                'weeks' => array_map(function($week) {
                    return [
                        'weekNumber' => $week['weekNumber'],
                        'count' => $week['carryoverCount'],
                        'carryoverCreatedThisWeek' => $week['carryoverCreatedThisWeek'],
                        'carryoverCreatedOtherWeek' => $week['carryoverCreatedOtherWeek']
                    ];
                }, $weeksData)
            ];
            
            // Подсчёт итогов уже выполнен выше (строки 1234-1236), эти строки удалены как дубликаты
        }
        
        // TASK-058-01: Расчет данных 4-го месяца для процентов
        $previousPeriodData = [
            'newTickets' => 0,
            'closedTickets' => 0,
            'carryoverTickets' => 0
        ];
        
        try {
            if ($previousMonth && isset($previousMonth['monthStart']) && isset($previousMonth['monthEnd'])) {
                $previousMonthStart = $previousMonth['monthStart'];
                $previousMonthEnd = $previousMonth['monthEnd'];
                
                // Проверка валидности дат
                if (!($previousMonthStart instanceof DateTimeImmutable) || 
                    !($previousMonthEnd instanceof DateTimeImmutable)) {
                    throw new Exception('Invalid date objects for previous month');
                }
                
                // error_log("[MONTHS] Calculating previous period data for month: {$previousMonth['monthName']} {$previousMonth['year']}");
                // error_log("[MONTHS] Previous month period: {$previousMonthStart->format('Y-m-d H:i:s')} to {$previousMonthEnd->format('Y-m-d H:i:s')}");
                
                // Проверка наличия массива тикетов
                if (!is_array($tickets)) {
                    error_log("[MONTHS] Warning: Tickets is not an array");
                } elseif (empty($tickets)) {
                    error_log("[MONTHS] Warning: Tickets array is empty, cannot calculate previous period data");
                } else {
                    // Подсчет новых тикетов 4-го месяца
                    // Используем ту же логику, что и для 3 месяцев (строки 788-793)
                    foreach ($tickets as $ticket) {
                        $createdTime = $ticket['createdTime'] ?? null;
                        if (isInRange($createdTime, $previousMonthStart, $previousMonthEnd)) {
                            $previousPeriodData['newTickets']++;
                        }
                    }
                    
                    // Подсчет закрытых тикетов 4-го месяца
                    // Используем ту же логику, что и для 3 месяцев (строки 796-815)
                    foreach ($tickets as $ticket) {
                        $movedTime = $ticket['movedTime'] ?? $ticket['updatedTime'] ?? null;
                        $stageId = $ticket['stageId'] ?? null;
                        $stageId = $stageId ? strtoupper($stageId) : null;
                        
                        if ($stageId && in_array($stageId, $closingStages, true)) {
                            if (isInRange($movedTime, $previousMonthStart, $previousMonthEnd)) {
                                $previousPeriodData['closedTickets']++;
                            }
                        }
                    }
                    
                    // Подсчет переходящих тикетов на начало 4-го месяца
                    // Переходящие = тикеты, созданные до начала 4-го месяца, но находящиеся в рабочих стадиях на начало 4-го месяца
                    // Используем ту же логику, что и для 3 месяцев (строки 818-831)
                    foreach ($tickets as $ticket) {
                        if (isCarryoverTicket($ticket, $previousMonthStart, $previousMonthStart, $targetStages, $closingStages)) {
                            $previousPeriodData['carryoverTickets']++;
                        }
                    }
                    
                    error_log("[MONTHS] Previous period data (4th month): " . json_encode($previousPeriodData, JSON_UNESCAPED_UNICODE));
                }
            } else {
                error_log("[MONTHS] Warning: Previous month (4th) not found or invalid, previousPeriodData will be empty");
            }
        } catch (Exception $e) {
            error_log("[MONTHS] Error calculating previous period data: " . $e->getMessage());
            error_log("[MONTHS] Stack trace: " . $e->getTraceAsString());
            // Продолжаем работу с нулевыми значениями
            $previousPeriodData = [
                'newTickets' => 0,
                'closedTickets' => 0,
                'carryoverTickets' => 0
            ];
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
        $response = [
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
                'responsible' => [], // TODO: Реализовать агрегацию по сотрудникам при необходимости
                // TASK-058-01: Данные 4-го месяца для расчета процентов
                'previousPeriodData' => $previousPeriodData
            ]
        ];
        
        // TASK-059-05: Сохранение в кеш для режима "months"
        $cacheKey = GraphAdmissionClosureCache::generateKey([
            'product' => $product,
            'periodMode' => $periodMode,
            'includeTickets' => $includeTickets,
            'includeNewTicketsByStages' => $includeNewTicketsByStages,
            'includeCarryoverTickets' => $includeCarryoverTickets,
            'includeCarryoverTicketsByDuration' => $includeCarryoverTicketsByDuration
        ]);
        
        if (GraphAdmissionClosureCache::set($cacheKey, $response, 300)) {
            error_log("[Cache] Cache saved for key: {$cacheKey}");
        } else {
            error_log("[Cache] Failed to save cache for key: {$cacheKey}");
        }
        
        // Периодическая очистка устаревших кешей (каждый 10-й запрос)
        if (rand(1, 10) === 1) {
            $deleted = GraphAdmissionClosureCache::clearExpired();
            if ($deleted > 0) {
                error_log("[Cache] Cleared {$deleted} expired cache entries");
            }
        }
        
        // TASK-059: Логирование общего времени выполнения для режима "months"
        $monthsModeTotalTime = microtime(true) - $monthsModeStartTime;
        error_log("[MONTHS-PERFORMANCE] Total execution time: " . round($monthsModeTotalTime, 2) . " seconds");
        
        jsonResponse($response);
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
    $carryoverTicketsCreatedPreviousWeek = 0; // TASK-063: НОВОЕ
    $carryoverTicketsCreatedOlder = 0; // TASK-063: НОВОЕ
    $carryoverTicketsCreatedOtherWeek = 0; // TASK-063: DEPRECATED (для обратной совместимости)
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
            
            // TASK-063: Разбивка по критерию создания на три категории
            $createdInThisWeek = isInRange($createdTime, $weekStart, $weekEnd);
            
            if ($createdInThisWeek) {
                $carryoverTicketsCreatedThisWeek++;
            } else {
                // TASK-063: Определяем, создан ли тикет в предыдущую неделю (ISO-8601)
                $tz = $weekStart->getTimezone();
                $isoYear = (int)$weekStart->format('o');
                $isoWeek = (int)$weekStart->format('W');
                
                if ($isoWeek > 1) {
                    $previousWeekNumber = $isoWeek - 1;
                    $previousWeekYear = $isoYear;
                } else {
                    $previousWeekYear = $isoYear - 1;
                    $lastDayOfPrevYear = (new DateTimeImmutable('now', $tz))->setISODate($previousWeekYear, 1, 1)->modify('-1 day');
                    $previousWeekNumber = (int)$lastDayOfPrevYear->format('W');
                }
                
                $previousWeekStart = (new DateTimeImmutable('now', $tz))->setISODate($previousWeekYear, $previousWeekNumber, 1)->setTime(0, 0, 0);
                $previousWeekEnd = (clone $previousWeekStart)->modify('+6 days')->setTime(23, 59, 59);
                
                $createdInPreviousWeek = isInRange($createdTime, $previousWeekStart, $previousWeekEnd);
                if ($createdInPreviousWeek) {
                    $carryoverTicketsCreatedPreviousWeek++;
                } else {
                    $carryoverTicketsCreatedOlder++;
                }
                // DEPRECATED: для обратной совместимости
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
        'carryoverCreatedPreviousWeek' => [], // TASK-063: НОВОЕ
        'carryoverCreatedOlder' => [], // TASK-063: НОВОЕ
        'carryoverCreatedOtherWeek' => [] // TASK-063: DEPRECATED
    ];
    
    $weeksData = [];
    $stagesByWeek = []; // TASK-064: Стадии по каждой неделе (порядок совпадает с series/meta.weeks)
    $lastWeekStageCounts = []; // TASK-064: Используем для обратной совместимости (data.stages)
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
            $debug,
            $allStages // TASK-064: прокидываем список стадий для формирования stagesByWeek
        );
        
        // TASK-063: Детальное логирование для диагностики
        $weekNum = $week['weekNumber'] ?? 'unknown';
        $weekStartStr = $week['weekStart']->format('Y-m-d H:i:s');
        $weekEndStr = $week['weekEnd']->format('Y-m-d H:i:s');
        error_log("[SERIES] ========================================");
        error_log("[SERIES] Week {$weekNum}: {$weekStartStr} - {$weekEndStr}");
        error_log("[SERIES] Total carryover: {$weekMetrics['carryoverTickets']}");
        error_log("[SERIES] ThisWeek: {$weekMetrics['carryoverTicketsCreatedThisWeek']}, PreviousWeek: {$weekMetrics['carryoverTicketsCreatedPreviousWeek']}, Older: {$weekMetrics['carryoverTicketsCreatedOlder']}");
        $sum = $weekMetrics['carryoverTicketsCreatedThisWeek'] + $weekMetrics['carryoverTicketsCreatedPreviousWeek'] + $weekMetrics['carryoverTicketsCreatedOlder'];
        error_log("[SERIES] Sum: {$sum} (expected: {$weekMetrics['carryoverTickets']})");
        if ($sum != $weekMetrics['carryoverTickets']) {
            error_log("[SERIES] ERROR Week {$weekNum}: Sum mismatch! Difference: " . abs($sum - $weekMetrics['carryoverTickets']));
        }
        error_log("[SERIES] ========================================");
        
        // Добавляем в series (от старых к новым)
        $series['new'][] = $weekMetrics['newTickets'];
        $series['closed'][] = $weekMetrics['closedTickets'];
        $series['closedCreatedThisWeek'][] = $weekMetrics['closedTicketsCreatedThisWeek'];
        $series['closedCreatedOtherWeek'][] = $weekMetrics['closedTicketsCreatedOtherWeek'];
        $series['carryover'][] = $weekMetrics['carryoverTickets'];
        $series['carryoverCreatedThisWeek'][] = $weekMetrics['carryoverTicketsCreatedThisWeek'];
        $series['carryoverCreatedPreviousWeek'][] = $weekMetrics['carryoverTicketsCreatedPreviousWeek']; // TASK-063: НОВОЕ
        $series['carryoverCreatedOlder'][] = $weekMetrics['carryoverTicketsCreatedOlder']; // TASK-063: НОВОЕ
        // TASK-063: Оставляем старое поле для обратной совместимости (deprecated)
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
            'carryoverTicketsCreatedPreviousWeek' => $weekMetrics['carryoverTicketsCreatedPreviousWeek'], // TASK-063: НОВОЕ
            'carryoverTicketsCreatedOlder' => $weekMetrics['carryoverTicketsCreatedOlder'], // TASK-063: НОВОЕ
            'carryoverTicketsCreatedOtherWeek' => $weekMetrics['carryoverTicketsCreatedOtherWeek'], // TASK-063: DEPRECATED (для обратной совместимости)
            // TASK-064: Разбивка закрытий по стадиям для конкретной недели
            'stages' => $weekMetrics['stages'] ?? []
        ];
        $weeksData[] = $weekData;
        $stagesByWeek[] = $weekMetrics['stages'] ?? [];
        $lastWeekStageCounts = $weekMetrics['stageCounts'] ?? [];
    }
    
    // TASK-064: Обновляем агрегат стадий для совместимости (data.stages) — берём текущую неделю (последний элемент)
    $stageAgg = $lastWeekStageCounts ?: [];
    
    // TASK-048: Всегда используем последний элемент из weeksData как текущую неделю
    // (массив weeksData уже отсортирован от старых к новым, последний элемент - текущая неделя)
    if (count($weeksData) > 0) {
        $currentWeekData = $weeksData[count($weeksData) - 1];
        // TASK-063: Логирование для диагностики
        if (isset($currentWeekData['carryoverTickets']) && $currentWeekData['carryoverTickets'] > 0) {
            error_log("[CURRENT-WEEK-DATA] carryover={$currentWeekData['carryoverTickets']}, thisWeek={$currentWeekData['carryoverTicketsCreatedThisWeek']}, previousWeek={$currentWeekData['carryoverTicketsCreatedPreviousWeek']}, older={$currentWeekData['carryoverTicketsCreatedOlder']}");
        }
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
            'carryoverTicketsCreatedPreviousWeek' => $series['carryoverCreatedPreviousWeek'][$lastIndex] ?? 0, // TASK-063: НОВОЕ
            'carryoverTicketsCreatedOlder' => $series['carryoverCreatedOlder'][$lastIndex] ?? 0, // TASK-063: НОВОЕ
            'carryoverTicketsCreatedOtherWeek' => $series['carryoverCreatedOtherWeek'][$lastIndex] ?? 0 // TASK-063: DEPRECATED
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
            'carryoverTicketsCreatedPreviousWeek' => $series['carryoverCreatedPreviousWeek'][$lastIndex] ?? 0, // TASK-063: НОВОЕ
            'carryoverTicketsCreatedOlder' => $series['carryoverCreatedOlder'][$lastIndex] ?? 0, // TASK-063: НОВОЕ
            'carryoverTicketsCreatedOtherWeek' => $series['carryoverCreatedOtherWeek'][$lastIndex] ?? 0 // TASK-063: DEPRECATED
        ];
    }
    
    $newCount = $currentWeekData['newTickets'] ?? 0;
    $closedCount = $currentWeekData['closedTickets'] ?? 0;
    $closedTicketsCreatedThisWeek = $currentWeekData['closedTicketsCreatedThisWeek'] ?? 0;
    $closedTicketsCreatedOtherWeek = $currentWeekData['closedTicketsCreatedOtherWeek'] ?? 0;
    $carryoverCount = $currentWeekData['carryoverTickets'] ?? 0;
    $carryoverTicketsCreatedThisWeek = $currentWeekData['carryoverTicketsCreatedThisWeek'] ?? 0;
    $carryoverTicketsCreatedPreviousWeek = $currentWeekData['carryoverTicketsCreatedPreviousWeek'] ?? 0; // TASK-063: НОВОЕ
    $carryoverTicketsCreatedOlder = $currentWeekData['carryoverTicketsCreatedOlder'] ?? 0; // TASK-063: НОВОЕ
    $carryoverTicketsCreatedOtherWeek = $currentWeekData['carryoverTicketsCreatedOtherWeek'] ?? 0; // TASK-063: DEPRECATED

    // Формирование ответа
    $responseData = [
        'newTickets' => $newCount,
        'closedTickets' => $closedCount,
        'closedTicketsCreatedThisWeek' => $closedTicketsCreatedThisWeek, // TASK-047
        'closedTicketsCreatedOtherWeek' => $closedTicketsCreatedOtherWeek, // TASK-047
        'series' => $series, // TASK-048: массивы с 4 элементами (по одному для каждой недели)
        'weeksData' => $weeksData, // TASK-048: данные для каждой недели
        'currentWeek' => $currentWeekData, // TASK-048: данные текущей недели (для summary-карточек)
        // TASK-064: Новый контракт — разбивка закрытий по стадиям для каждой недели (индексы синхронизированы с meta.weeks / series)
        'stagesByWeek' => $stagesByWeek,
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
        // TASK-063: Разбивка на три категории
        $responseData['carryoverTicketsCreatedPreviousWeek'] = $carryoverTicketsCreatedPreviousWeek; // НОВОЕ
        $responseData['carryoverTicketsCreatedOlder'] = $carryoverTicketsCreatedOlder; // НОВОЕ
        // TASK-063: Оставляем старое поле для обратной совместимости (deprecated)
        $responseData['carryoverTicketsCreatedOtherWeek'] = $carryoverTicketsCreatedOtherWeek;
        // TASK-049: series['carryover'] уже заполнен выше для одной недели
        
        error_log("[CARRYOVER] ИТОГО переходящих тикетов после всех фильтров: {$carryoverCount}");
        error_log("[CARRYOVER] Созданных этой неделей: {$carryoverTicketsCreatedThisWeek}, предыдущей неделей: {$carryoverTicketsCreatedPreviousWeek}, остальные: {$carryoverTicketsCreatedOlder}");
        error_log("[CARRYOVER] DEPRECATED: созданных прошлыми неделями (жёсткий остаток): {$carryoverTicketsCreatedOtherWeek}");
        $sum = $carryoverTicketsCreatedThisWeek + $carryoverTicketsCreatedPreviousWeek + $carryoverTicketsCreatedOlder;
        error_log("[CARRYOVER] Проверка суммы: {$carryoverTicketsCreatedThisWeek} + {$carryoverTicketsCreatedPreviousWeek} + {$carryoverTicketsCreatedOlder} = {$sum} (ожидается: {$carryoverCount})");
        if ($sum != $carryoverCount) {
            error_log("[CARRYOVER] ERROR: Sum mismatch! Difference: " . abs($sum - $carryoverCount));
        }
        
        // TASK-063: Детальное логирование series для диагностики
        error_log("[CARRYOVER-SERIES] ========================================");
        error_log("[CARRYOVER-SERIES] Series arrays length:");
        error_log("[CARRYOVER-SERIES]   carryover: " . (is_array($series['carryover']) ? count($series['carryover']) : 'not array'));
        error_log("[CARRYOVER-SERIES]   carryoverCreatedThisWeek: " . (is_array($series['carryoverCreatedThisWeek']) ? count($series['carryoverCreatedThisWeek']) : 'not array'));
        error_log("[CARRYOVER-SERIES]   carryoverCreatedPreviousWeek: " . (is_array($series['carryoverCreatedPreviousWeek']) ? count($series['carryoverCreatedPreviousWeek']) : 'not array'));
        error_log("[CARRYOVER-SERIES]   carryoverCreatedOlder: " . (is_array($series['carryoverCreatedOlder']) ? count($series['carryoverCreatedOlder']) : 'not array'));
        
        if (isset($series['carryoverCreatedPreviousWeek']) && is_array($series['carryoverCreatedPreviousWeek']) && count($series['carryoverCreatedPreviousWeek']) > 0) {
            $lastIndex = count($series['carryoverCreatedPreviousWeek']) - 1;
            error_log("[CARRYOVER-SERIES] Last index: {$lastIndex}");
            error_log("[CARRYOVER-SERIES] Values at last index:");
            error_log("[CARRYOVER-SERIES]   carryover[{$lastIndex}]=" . ($series['carryover'][$lastIndex] ?? 'undefined'));
            error_log("[CARRYOVER-SERIES]   carryoverCreatedThisWeek[{$lastIndex}]=" . ($series['carryoverCreatedThisWeek'][$lastIndex] ?? 'undefined'));
            error_log("[CARRYOVER-SERIES]   carryoverCreatedPreviousWeek[{$lastIndex}]=" . ($series['carryoverCreatedPreviousWeek'][$lastIndex] ?? 'undefined'));
            error_log("[CARRYOVER-SERIES]   carryoverCreatedOlder[{$lastIndex}]=" . ($series['carryoverCreatedOlder'][$lastIndex] ?? 'undefined'));
            
            // Выводим все значения для проверки
            error_log("[CARRYOVER-SERIES] All values:");
            error_log("[CARRYOVER-SERIES]   carryover: " . json_encode($series['carryover']));
            error_log("[CARRYOVER-SERIES]   carryoverCreatedThisWeek: " . json_encode($series['carryoverCreatedThisWeek']));
            error_log("[CARRYOVER-SERIES]   carryoverCreatedPreviousWeek: " . json_encode($series['carryoverCreatedPreviousWeek']));
            error_log("[CARRYOVER-SERIES]   carryoverCreatedOlder: " . json_encode($series['carryoverCreatedOlder']));
        } else {
            error_log("[CARRYOVER-SERIES] WARNING: series['carryoverCreatedPreviousWeek'] is empty or not set!");
        }
        error_log("[CARRYOVER-SERIES] ========================================");
        
        error_log("[CARRYOVER] ========================================");
    } else {
        // Если переходящие тикеты не запрошены, заполняем series пустыми массивами с одним элементом
        $series['carryover'] = [0];
        $series['carryoverCreatedThisWeek'] = [0];
        $series['carryoverCreatedPreviousWeek'] = [0]; // TASK-063: НОВОЕ
        $series['carryoverCreatedOlder'] = [0]; // TASK-063: НОВОЕ
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
        // TASK-063: Временный debug для проверки carryover breakdown (всегда включён)
        'carryoverDebug' => [
            'total' => $carryoverCount ?? 0,
            'thisWeek' => $carryoverTicketsCreatedThisWeek ?? 0,
            'previousWeek' => $carryoverTicketsCreatedPreviousWeek ?? 0,
            'older' => $carryoverTicketsCreatedOlder ?? 0,
            'sum' => ($carryoverTicketsCreatedThisWeek ?? 0) + ($carryoverTicketsCreatedPreviousWeek ?? 0) + ($carryoverTicketsCreatedOlder ?? 0),
            'series' => [
                'carryover' => $series['carryover'] ?? [],
                'carryoverCreatedThisWeek' => $series['carryoverCreatedThisWeek'] ?? [],
                'carryoverCreatedPreviousWeek' => $series['carryoverCreatedPreviousWeek'] ?? [],
                'carryoverCreatedOlder' => $series['carryoverCreatedOlder'] ?? [],
            ],
            'currentWeekData' => $currentWeekData ? [
                'weekNumber' => $currentWeekData['weekNumber'] ?? null,
                'carryoverTickets' => $currentWeekData['carryoverTickets'] ?? 0,
                'carryoverTicketsCreatedThisWeek' => $currentWeekData['carryoverTicketsCreatedThisWeek'] ?? 0,
                'carryoverTicketsCreatedPreviousWeek' => $currentWeekData['carryoverTicketsCreatedPreviousWeek'] ?? 0,
                'carryoverTicketsCreatedOlder' => $currentWeekData['carryoverTicketsCreatedOlder'] ?? 0,
            ] : null,
            'weeksData' => array_map(function($week) {
                return [
                    'weekNumber' => $week['weekNumber'] ?? null,
                    'carryoverTickets' => $week['carryoverTickets'] ?? 0,
                    'carryoverTicketsCreatedThisWeek' => $week['carryoverTicketsCreatedThisWeek'] ?? 0,
                    'carryoverTicketsCreatedPreviousWeek' => $week['carryoverTicketsCreatedPreviousWeek'] ?? 0,
                    'carryoverTicketsCreatedOlder' => $week['carryoverTicketsCreatedOlder'] ?? 0,
                ];
            }, $weeksData ?? [])
        ],
        'debug' => $debug ? [
            'fetchedTotal' => count($tickets),
            'sample' => array_slice($debugRaw, 0, 5),
            'stageCounts' => $stageAgg,
            // TASK-063: Временный debug для проверки carryover breakdown
            'carryoverBreakdown' => [
                'total' => $carryoverCount ?? 0,
                'thisWeek' => $carryoverTicketsCreatedThisWeek ?? 0,
                'previousWeek' => $carryoverTicketsCreatedPreviousWeek ?? 0,
                'older' => $carryoverTicketsCreatedOlder ?? 0,
                'sum' => ($carryoverTicketsCreatedThisWeek ?? 0) + ($carryoverTicketsCreatedPreviousWeek ?? 0) + ($carryoverTicketsCreatedOlder ?? 0),
                'series' => [
                    'carryover' => $series['carryover'] ?? [],
                    'carryoverCreatedThisWeek' => $series['carryoverCreatedThisWeek'] ?? [],
                    'carryoverCreatedPreviousWeek' => $series['carryoverCreatedPreviousWeek'] ?? [],
                    'carryoverCreatedOlder' => $series['carryoverCreatedOlder'] ?? [],
                ],
                'currentWeekData' => $currentWeekData ?? null,
                'weeksData' => array_map(function($week) {
                    return [
                        'weekNumber' => $week['weekNumber'] ?? null,
                        'carryoverTickets' => $week['carryoverTickets'] ?? 0,
                        'carryoverTicketsCreatedThisWeek' => $week['carryoverTicketsCreatedThisWeek'] ?? 0,
                        'carryoverTicketsCreatedPreviousWeek' => $week['carryoverTicketsCreatedPreviousWeek'] ?? 0,
                        'carryoverTicketsCreatedOlder' => $week['carryoverTicketsCreatedOlder'] ?? 0,
                    ];
                }, $weeksData ?? [])
            ],
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

