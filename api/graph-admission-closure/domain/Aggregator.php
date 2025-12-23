<?php

require_once __DIR__ . '/../util/DatePeriodHelper.php';

/**
 * TASK-065: Доменный слой — чистые расчёты метрик.
 *
 * Перенесена логика из legacy `graph-1c-admission-closure.php`:
 * - calculateWeekMetrics (подсчёт метрик для недели)
 * - Агрегация series, weeksData, stagesByWeek
 * - Carryover breakdown (this/prev/older)
 */
class Aggregator
{
    private DatePeriodHelper $dateHelper;

    public function __construct(DatePeriodHelper $dateHelper)
    {
        $this->dateHelper = $dateHelper;
    }

    /**
     * Подсчитывает метрики для конкретной недели
     * Логика перенесена из legacy calculateWeekMetrics без изменений (TASK-065)
     */
    public function calculateWeekMetrics(
        DateTimeImmutable $weekStart,
        DateTimeImmutable $weekEnd,
        array $allTickets,
        array $targetStages,
        array $closingStages,
        int $keeperId,
        bool $debug = false,
        array $allStages = [],
        bool $includeNewTicketsByStages = false,
        bool $includeTickets = false,
        bool $includeCarryoverTicketsByDuration = false,
        array $durationCategories = []
    ): array {
        $newCount = 0;
        $closedCount = 0;
        $closedTicketsCreatedThisWeek = 0;
        $closedTicketsCreatedOtherWeek = 0;
        $carryoverCount = 0;
        $carryoverTicketsCreatedThisWeek = 0;
        $carryoverTicketsCreatedPreviousWeek = 0;
        $carryoverTicketsCreatedOlder = 0;
        $carryoverTicketsCreatedOtherWeek = 0;
        $stageAgg = [];

        // TASK-070: Инициализация агрегации новых тикетов по стадиям
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

        // TASK-070: Инициализация агрегации переходящих тикетов по срокам
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

        $weekStartStr = $weekStart->format('Y-m-d H:i:s');
        $weekEndStr = $weekEnd->format('Y-m-d H:i:s');

        if ($debug) {
            error_log("[Aggregator::calculateWeekMetrics] Week bounds: {$weekStartStr} - {$weekEndStr} (UTC)");
            error_log("[Aggregator::calculateWeekMetrics] Total tickets to process: " . count($allTickets));
        }

        foreach ($allTickets as $ticket) {
            $createdTime = $ticket['createdTime'] ?? null;
            $movedTime = $ticket['movedTime'] ?? $ticket['updatedTime'] ?? null;
            $stageId = $ticket['stageId'] ?? null;
            $stageId = $stageId ? strtoupper($stageId) : null;
            $ticketId = $ticket['id'] ?? 'unknown';
            $assignedRaw = $ticket['assignedById'] ?? null;

            $isInClosingStages = $stageId && in_array($stageId, $closingStages, true);
            $isMovedInRange = $this->dateHelper->isInRange($movedTime, $weekStart, $weekEnd);
            $isCreatedInRange = $this->dateHelper->isInRange($createdTime, $weekStart, $weekEnd);

            // Новые за неделю
            if ($isCreatedInRange) {
                $newCount++;
                
                // TASK-070: Агрегация новых тикетов по стадиям
                if ($includeNewTicketsByStages) {
                    if ($stageId && isset($newTicketsByStagesAgg[$stageId])) {
                        $newTicketsByStagesAgg[$stageId]['count']++;
                        
                        // Если нужно включить тикеты, сохранить данные тикета
                        if ($includeTickets) {
                            // Нормализация assignedById
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
                    } else if ($debug) {
                        // Логирование для отладки: почему тикет не попал в агрегацию
                        if (!$stageId) {
                            error_log("[TASK-070] New ticket #{$ticketId} has no stageId");
                        } else if (!isset($newTicketsByStagesAgg[$stageId])) {
                            error_log("[TASK-070] New ticket #{$ticketId} has stageId '{$stageId}' which is not in allStages. Available stages: " . implode(', ', array_keys($newTicketsByStagesAgg)));
                        }
                    }
                }
            }

            // Закрытые за неделю
            $shouldCountAsClosed = false;
            if ($isInClosingStages) {
                if ($isMovedInRange) {
                    $shouldCountAsClosed = true;
                } else if ($isCreatedInRange && !$movedTime) {
                    $shouldCountAsClosed = true;
                } else if ($isCreatedInRange) {
                    $shouldCountAsClosed = true;
                }
            }

            if ($shouldCountAsClosed) {
                $closedCount++;
                if ($isCreatedInRange) {
                    $closedTicketsCreatedThisWeek++;
                } else {
                    $closedTicketsCreatedOtherWeek++;
                }

                if ($stageId) {
                    if (!isset($stageAgg[$stageId])) {
                        $stageAgg[$stageId] = 0;
                    }
                    $stageAgg[$stageId]++;
                }
            }

            // Переходящие тикеты
            if ($this->dateHelper->isCarryoverTicket($ticket, $weekStart, $weekEnd, $targetStages, $closingStages)) {
                $carryoverCount++;
                $createdInThisWeek = $this->dateHelper->isInRange($createdTime, $weekStart, $weekEnd);
                if ($createdInThisWeek) {
                    $carryoverTicketsCreatedThisWeek++;
                } else {
                    // Определяем предыдущую неделю (ISO-8601)
                    $previousWeekStart = (clone $weekStart)->modify('-1 week');
                    $isoYear = (int)$previousWeekStart->format('o');
                    $isoWeek = (int)$previousWeekStart->format('W');
                    $previousWeekStart = $previousWeekStart->setISODate($isoYear, $isoWeek, 1)->setTime(0, 0, 0);
                    $previousWeekEnd = (clone $previousWeekStart)->modify('+6 days')->setTime(23, 59, 59);

                    $createdInPreviousWeek = $this->dateHelper->isInRange($createdTime, $previousWeekStart, $previousWeekEnd);
                    if ($createdInPreviousWeek) {
                        $carryoverTicketsCreatedPreviousWeek++;
                    } else {
                        $carryoverTicketsCreatedOlder++;
                    }
                }
                
                // TASK-070: Группировка переходящих тикетов по срокам
                if ($includeCarryoverTicketsByDuration && $createdTime) {
                    $category = $this->dateHelper->calculateDurationCategory($createdTime, $weekStart);
                    
                    if (isset($carryoverTicketsByDurationAgg[$category])) {
                        $carryoverTicketsByDurationAgg[$category]['count']++;
                        
                        // Если нужно включить тикеты, сохранить данные тикета
                        if ($includeTickets) {
                            // Нормализация assignedById
                            $responsibleId = $assignedRaw;
                            if (is_array($responsibleId)) {
                                $responsibleId = $responsibleId['id'] ?? $responsibleId['ID'] ?? $responsibleId['value'] ?? null;
                            }
                            $responsibleId = $responsibleId ? (int)$responsibleId : null;
                            
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

        // DEPRECATED: для обратной совместимости
        $carryoverTicketsCreatedOtherWeek = $carryoverTicketsCreatedPreviousWeek + $carryoverTicketsCreatedOlder;

        if ($debug && $carryoverCount > 0) {
            $weekNum = (int)$weekStart->format('W');
            error_log("[Aggregator::calculateWeekMetrics] Week {$weekNum}: Total carryover={$carryoverCount}, ThisWeek={$carryoverTicketsCreatedThisWeek}, PreviousWeek={$carryoverTicketsCreatedPreviousWeek}, Older={$carryoverTicketsCreatedOlder}");
        }

        // Формируем массив стадий для конкретной недели
        $stages = array_map(function ($stageId) use ($stageAgg, $allStages) {
            $stageName = isset($allStages[$stageId]) ? $allStages[$stageId]['name'] : $stageId;
            return [
                'stageId' => $stageId,
                'stageName' => $stageName,
                'count' => $stageAgg[$stageId]
            ];
        }, array_keys($stageAgg));

        // TASK-070: Формируем массив новых тикетов по стадиям
        $newTicketsByStages = null;
        if ($includeNewTicketsByStages) {
            $newTicketsByStages = array_map(function ($item) use ($includeTickets) {
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
            }, array_values($newTicketsByStagesAgg));
            
            // Фильтруем только стадии с count > 0
            $newTicketsByStages = array_filter($newTicketsByStages, function($stage) {
                return $stage['count'] > 0;
            });
            $newTicketsByStages = array_values($newTicketsByStages);
        }

        // TASK-070: Формируем массив переходящих тикетов по срокам
        $carryoverTicketsByDuration = null;
        if ($includeCarryoverTicketsByDuration) {
            $carryoverTicketsByDuration = array_map(function ($item) use ($includeTickets) {
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
            
            // Фильтруем только категории с count > 0
            $carryoverTicketsByDuration = array_filter($carryoverTicketsByDuration, function($category) {
                return $category['count'] > 0;
            });
            $carryoverTicketsByDuration = array_values($carryoverTicketsByDuration);
        }

        return [
            'newTickets' => $newCount,
            'closedTickets' => $closedCount,
            'closedTicketsCreatedThisWeek' => $closedTicketsCreatedThisWeek,
            'closedTicketsCreatedOtherWeek' => $closedTicketsCreatedOtherWeek,
            'carryoverTickets' => $carryoverCount,
            'carryoverTicketsCreatedThisWeek' => $carryoverTicketsCreatedThisWeek,
            'carryoverTicketsCreatedPreviousWeek' => $carryoverTicketsCreatedPreviousWeek,
            'carryoverTicketsCreatedOlder' => $carryoverTicketsCreatedOlder,
            'carryoverTicketsCreatedOtherWeek' => $carryoverTicketsCreatedOtherWeek,
            'stages' => $stages,
            'stageCounts' => $stageAgg,
            'newTicketsByStages' => $newTicketsByStages,
            'carryoverTicketsByDuration' => $carryoverTicketsByDuration
        ];
    }

    /**
     * Формирование series и weeksData для недельного режима
     * Логика перенесена из legacy без изменений (TASK-065)
     */
    public function aggregateWeeks(
        array $weeks,
        array $tickets,
        array $targetStages,
        array $closingStages,
        int $keeperId,
        bool $debug = false,
        array $allStages = [],
        bool $includeNewTicketsByStages = false,
        bool $includeTickets = false,
        bool $includeCarryoverTicketsByDuration = false,
        array $durationCategories = []
    ): array {
        $series = [
            'new' => [],
            'closed' => [],
            'closedCreatedThisWeek' => [],
            'closedCreatedOtherWeek' => [],
            'carryover' => [],
            'carryoverCreatedThisWeek' => [],
            'carryoverCreatedPreviousWeek' => [],
            'carryoverCreatedOlder' => [],
            'carryoverCreatedOtherWeek' => []
        ];

        $weeksData = [];
        $stagesByWeek = [];
        $lastWeekStageCounts = [];
        $currentWeekData = null;

        foreach ($weeks as $week) {
            $weekMetrics = $this->calculateWeekMetrics(
                $week['weekStart'],
                $week['weekEnd'],
                $tickets,
                $targetStages,
                $closingStages,
                $keeperId,
                $debug,
                $allStages,
                $includeNewTicketsByStages,
                $includeTickets,
                $includeCarryoverTicketsByDuration,
                $durationCategories
            );

            $series['new'][] = $weekMetrics['newTickets'];
            $series['closed'][] = $weekMetrics['closedTickets'];
            $series['closedCreatedThisWeek'][] = $weekMetrics['closedTicketsCreatedThisWeek'];
            $series['closedCreatedOtherWeek'][] = $weekMetrics['closedTicketsCreatedOtherWeek'];
            $series['carryover'][] = $weekMetrics['carryoverTickets'];
            $series['carryoverCreatedThisWeek'][] = $weekMetrics['carryoverTicketsCreatedThisWeek'];
            $series['carryoverCreatedPreviousWeek'][] = $weekMetrics['carryoverTicketsCreatedPreviousWeek'];
            $series['carryoverCreatedOlder'][] = $weekMetrics['carryoverTicketsCreatedOlder'];
            $series['carryoverCreatedOtherWeek'][] = $weekMetrics['carryoverTicketsCreatedOtherWeek'];

            $weekData = [
                'weekNumber' => $week['weekNumber'],
                'newTickets' => $weekMetrics['newTickets'],
                'closedTickets' => $weekMetrics['closedTickets'],
                'closedTicketsCreatedThisWeek' => $weekMetrics['closedTicketsCreatedThisWeek'],
                'closedTicketsCreatedOtherWeek' => $weekMetrics['closedTicketsCreatedOtherWeek'],
                'carryoverTickets' => $weekMetrics['carryoverTickets'],
                'carryoverTicketsCreatedThisWeek' => $weekMetrics['carryoverTicketsCreatedThisWeek'],
                'carryoverTicketsCreatedPreviousWeek' => $weekMetrics['carryoverTicketsCreatedPreviousWeek'],
                'carryoverTicketsCreatedOlder' => $weekMetrics['carryoverTicketsCreatedOlder'],
                'carryoverTicketsCreatedOtherWeek' => $weekMetrics['carryoverTicketsCreatedOtherWeek'],
                'stages' => $weekMetrics['stages'] ?? []
            ];
            $weeksData[] = $weekData;
            $stagesByWeek[] = $weekMetrics['stages'] ?? [];
            $lastWeekStageCounts = $weekMetrics['stageCounts'] ?? [];
        }

        if (count($weeksData) > 0) {
            $currentWeekData = $weeksData[count($weeksData) - 1];
        }

        $stageAgg = $lastWeekStageCounts ?: [];
        
        // TASK-070: Получаем newTicketsByStages и carryoverTicketsByDuration для текущей недели (последняя неделя)
        $currentWeekNewTicketsByStages = null;
        $currentWeekCarryoverTicketsByDuration = null;
        if (($includeNewTicketsByStages || $includeCarryoverTicketsByDuration) && count($weeks) > 0) {
            $lastWeek = $weeks[count($weeks) - 1];
            $lastWeekMetrics = $this->calculateWeekMetrics(
                $lastWeek['weekStart'],
                $lastWeek['weekEnd'],
                $tickets,
                $targetStages,
                $closingStages,
                $keeperId,
                $debug,
                $allStages,
                $includeNewTicketsByStages,
                $includeTickets,
                $includeCarryoverTicketsByDuration,
                $durationCategories
            );
            $currentWeekNewTicketsByStages = $lastWeekMetrics['newTicketsByStages'] ?? null;
            $currentWeekCarryoverTicketsByDuration = $lastWeekMetrics['carryoverTicketsByDuration'] ?? null;
        }

        return [
            'series' => $series,
            'weeksData' => $weeksData,
            'stagesByWeek' => $stagesByWeek,
            'currentWeekData' => $currentWeekData,
            'stageAgg' => $stageAgg,
            'currentWeekNewTicketsByStages' => $currentWeekNewTicketsByStages,
            'currentWeekCarryoverTicketsByDuration' => $currentWeekCarryoverTicketsByDuration
        ];
    }

    /**
     * TASK-067-4: Агрегация метрик для месячного режима
     * 
     * Объединённая агрегация в один цикл по тикетам (TASK-059-02).
     * Агрегирует метрики по месяцам и неделям внутри месяцев.
     * 
     * @param array $months Массив из 3 месяцев (для отображения)
     * @param array $tickets Массив всех тикетов (после фильтрации по product)
     * @param array $targetStages Рабочие стадии
     * @param array $closingStages Закрывающие стадии
     * @param int $keeperId ID хранителя
     * @param bool $debug Флаг отладки
     * @return array Структура с monthMetrics и stageAgg
     */
    public function aggregateMonths(
        array $months,
        array $tickets,
        array $targetStages,
        array $closingStages,
        int $keeperId,
        bool $debug = false
    ): array {
        // Инициализация структуры данных для агрегации всех метрик
        $monthMetrics = [];
        $stageAgg = [];

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
                'carryoverTicketsCreatedPreviousWeek' => 0,
                'carryoverTicketsCreatedOlder' => 0,
                'carryoverTicketsCreatedOtherWeek' => 0, // DEPRECATED
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
                    'carryoverTicketsCreatedPreviousWeek' => 0,
                    'carryoverTicketsCreatedOlder' => 0,
                    'carryoverTicketsCreatedOtherWeek' => 0 // DEPRECATED
                ];
            }
        }

        // TASK-059-02: Один проход по тикетам для агрегации всех метрик
        $aggregationStartTime = microtime(true);
        if ($debug) {
            error_log("[MONTHS-AGGREGATION] Starting unified aggregation for " . count($tickets) . " tickets");
        }

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
                if ($this->dateHelper->isInRange($createdTime, $monthStart, $monthEnd)) {
                    $monthMetrics[$monthNumber]['newTickets']++;
                }

                // Закрытые тикеты за месяц
                if ($stageId && in_array($stageId, $closingStages, true)) {
                    if ($this->dateHelper->isInRange($movedTime, $monthStart, $monthEnd)) {
                        $monthMetrics[$monthNumber]['closedTickets']++;

                        // Разбивка по критерию создания
                        if ($this->dateHelper->isInRange($createdTime, $monthStart, $monthEnd)) {
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
                if ($this->dateHelper->isCarryoverTicket($ticket, $monthEnd, $monthEnd, $targetStages, $closingStages)) {
                    $monthMetrics[$monthNumber]['carryoverTickets']++;

                    // Разбивка по критерию создания
                    if ($this->dateHelper->isInRange($createdTime, $monthStart, $monthEnd)) {
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
                    if ($this->dateHelper->isInRange($createdTime, $weekStart, $weekEnd)) {
                        $monthMetrics[$monthNumber]['weeks'][$weekNumber]['newTickets']++;
                    }

                    // Закрытые тикеты за неделю
                    if ($stageId && in_array($stageId, $closingStages, true)) {
                        $isMovedInRange = $this->dateHelper->isInRange($movedTime, $weekStart, $weekEnd);
                        $isCreatedInRange = $this->dateHelper->isInRange($createdTime, $weekStart, $weekEnd);
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
                    if ($this->dateHelper->isCarryoverTicket($ticket, $weekStart, $weekEnd, $targetStages, $closingStages)) {
                        $monthMetrics[$monthNumber]['weeks'][$weekNumber]['carryoverTickets']++;

                        // TASK-063: Разбивка по критерию создания на три категории
                        $createdInThisWeek = $this->dateHelper->isInRange($createdTime, $weekStart, $weekEnd);
                        if ($createdInThisWeek) {
                            $monthMetrics[$monthNumber]['weeks'][$weekNumber]['carryoverTicketsCreatedThisWeek']++;
                        } else {
                            // Определяем предыдущую неделю (ISO-8601)
                            $tz = $weekStart->getTimezone();
                            $isoYear = (int)$weekStart->format('o');
                            $isoWeek = (int)$weekStart->format('W');

                            if ($isoWeek > 1) {
                                $previousWeekNumber = $isoWeek - 1;
                                $previousWeekYear = $isoYear;
                            } else {
                                $previousWeekYear = $isoYear - 1;
                                $lastDayOfPrevYear = (new \DateTimeImmutable('now', $tz))->setISODate($previousWeekYear, 1, 1)->modify('-1 day');
                                $previousWeekNumber = (int)$lastDayOfPrevYear->format('W');
                            }

                            $previousWeekStart = (new \DateTimeImmutable('now', $tz))->setISODate($previousWeekYear, $previousWeekNumber, 1)->setTime(0, 0, 0);
                            $previousWeekEnd = (clone $previousWeekStart)->modify('+6 days')->setTime(23, 59, 59);

                            $createdInPreviousWeek = $this->dateHelper->isInRange($createdTime, $previousWeekStart, $previousWeekEnd);
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
        if ($debug) {
            error_log("[MONTHS-AGGREGATION] Unified aggregation completed in " . round($aggregationTime, 2) . " seconds");
        }

        return [
            'monthMetrics' => $monthMetrics,
            'stageAgg' => $stageAgg
        ];
    }

    /**
     * TASK-067-4: Расчёт данных 4-го месяца для процентов (TASK-058-01)
     * 
     * Вычисляет метрики для самого старого месяца (4-й месяц) для расчёта процентов.
     * 
     * @param array $previousMonth 4-й месяц (индекс 0 из calculateLastFourMonths)
     * @param array $tickets Массив всех тикетов
     * @param array $targetStages Рабочие стадии
     * @param array $closingStages Закрывающие стадии
     * @param int $keeperId ID хранителя
     * @return array Структура с newTickets, closedTickets, carryoverTickets
     */
    public function calculatePreviousPeriodData(
        array $previousMonth,
        array $tickets,
        array $targetStages,
        array $closingStages,
        int $keeperId
    ): array {
        $previousPeriodData = [
            'newTickets' => 0,
            'closedTickets' => 0,
            'carryoverTickets' => 0
        ];

        try {
            if (!isset($previousMonth['monthStart']) || !isset($previousMonth['monthEnd'])) {
                error_log("[MONTHS] Warning: Previous month (4th) not found or invalid, previousPeriodData will be empty");
                return $previousPeriodData;
            }

            $previousMonthStart = $previousMonth['monthStart'];
            $previousMonthEnd = $previousMonth['monthEnd'];

            // Проверка валидности дат
            if (!($previousMonthStart instanceof \DateTimeImmutable) || 
                !($previousMonthEnd instanceof \DateTimeImmutable)) {
                throw new \Exception('Invalid date objects for previous month');
            }

            if (!is_array($tickets) || empty($tickets)) {
                error_log("[MONTHS] Warning: Tickets array is empty, cannot calculate previous period data");
                return $previousPeriodData;
            }

            // Подсчёт новых тикетов 4-го месяца
            foreach ($tickets as $ticket) {
                $createdTime = $ticket['createdTime'] ?? null;
                if ($this->dateHelper->isInRange($createdTime, $previousMonthStart, $previousMonthEnd)) {
                    $previousPeriodData['newTickets']++;
                }
            }

            // Подсчёт закрытых тикетов 4-го месяца
            foreach ($tickets as $ticket) {
                $movedTime = $ticket['movedTime'] ?? $ticket['updatedTime'] ?? null;
                $stageId = $ticket['stageId'] ?? null;
                $stageId = $stageId ? strtoupper($stageId) : null;

                if ($stageId && in_array($stageId, $closingStages, true)) {
                    if ($this->dateHelper->isInRange($movedTime, $previousMonthStart, $previousMonthEnd)) {
                        $previousPeriodData['closedTickets']++;
                    }
                }
            }

            // Подсчёт переходящих тикетов на начало 4-го месяца
            foreach ($tickets as $ticket) {
                if ($this->dateHelper->isCarryoverTicket($ticket, $previousMonthStart, $previousMonthStart, $targetStages, $closingStages)) {
                    $previousPeriodData['carryoverTickets']++;
                }
            }

            error_log("[MONTHS] Previous period data (4th month): " . json_encode($previousPeriodData, JSON_UNESCAPED_UNICODE));
        } catch (\Exception $e) {
            error_log("[MONTHS] Error calculating previous period data: " . $e->getMessage());
            error_log("[MONTHS] Stack trace: " . $e->getTraceAsString());
            // Продолжаем работу с нулевыми значениями
            $previousPeriodData = [
                'newTickets' => 0,
                'closedTickets' => 0,
                'carryoverTickets' => 0
            ];
        }

        return $previousPeriodData;
    }
}
