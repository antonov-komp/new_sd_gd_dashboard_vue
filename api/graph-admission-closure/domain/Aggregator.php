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
        array $allStages = []
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

            $isInClosingStages = $stageId && in_array($stageId, $closingStages, true);
            $isMovedInRange = $this->dateHelper->isInRange($movedTime, $weekStart, $weekEnd);
            $isCreatedInRange = $this->dateHelper->isInRange($createdTime, $weekStart, $weekEnd);

            // Новые за неделю
            if ($isCreatedInRange) {
                $newCount++;
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
            'stageCounts' => $stageAgg
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
        array $allStages = []
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
                $allStages
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

        return [
            'series' => $series,
            'weeksData' => $weeksData,
            'stagesByWeek' => $stagesByWeek,
            'currentWeekData' => $currentWeekData,
            'stageAgg' => $stageAgg
        ];
    }

    /**
     * Расчёт месячных метрик (заглушка, будет реализовано позже)
     */
    public function calculateMonths(array $months, array $tickets, array $config): array
    {
        throw new RuntimeException('TASK-065: calculateMonths not migrated yet. Use legacy endpoint for months mode.');
    }
}
