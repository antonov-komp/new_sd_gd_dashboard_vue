<?php

/**
 * TASK-065: Утилиты работы с датами/периодами.
 * Логика перенесена из legacy `graph-1c-admission-closure.php`
 * без изменений, чтобы сохранить контракт.
 */
class DatePeriodHelper
{
    public function getWeekBounds(?string $start, ?string $end): array
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

    public function getFourWeeksBounds(DateTimeImmutable $currentWeekStart, DateTimeImmutable $currentWeekEnd): array
    {
        $weeks = [];

        for ($i = 0; $i < 4; $i++) {
            $weekStart = clone $currentWeekStart;
            $weekStart = $weekStart->modify("-{$i} weeks");

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

        return array_reverse($weeks);
    }

    public function calculateLastFourMonths(): array
    {
        try {
            $tz = new DateTimeZone('UTC');
            $now = new DateTimeImmutable('now', $tz);
            $months = [];

            $currentMonth = $now->modify('first day of this month');
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
                    'weeks' => $this->calculateWeeksInMonth($monthStart->setTime(0, 0, 0), $monthEnd)
                ];
            }

            return $months;
        } catch (Exception $e) {
            error_log('[DatePeriodHelper::calculateLastFourMonths] Error: ' . $e->getMessage());
            throw new Exception('Failed to calculate last four months: ' . $e->getMessage());
        }
    }

    public function calculateLastThreeMonths(): array
    {
        try {
            $tz = new DateTimeZone('UTC');
            $now = new DateTimeImmutable('now', $tz);
            $months = [];

            $currentMonth = $now->modify('first day of this month');
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
                    'weeks' => $this->calculateWeeksInMonth($monthStart->setTime(0, 0, 0), $monthEnd)
                ];
            }

            return $months;
        } catch (Exception $e) {
            error_log('[DatePeriodHelper::calculateLastThreeMonths] Error: ' . $e->getMessage());
            throw new Exception('Failed to calculate last three months: ' . $e->getMessage());
        }
    }

    public function calculateWeeksInMonth(DateTimeImmutable $monthStart, DateTimeImmutable $monthEnd): array
    {
        $weeks = [];
        $tz = new DateTimeZone('UTC');

        $firstDay = $monthStart;
        $dayOfWeek = (int)$firstDay->format('N');

        if ($dayOfWeek !== 1) {
            $firstDay = $firstDay->modify('-' . ($dayOfWeek - 1) . ' days');
        }

        $currentWeekStart = $firstDay->setTime(0, 0, 0);

        while ($currentWeekStart <= $monthEnd) {
            $currentWeekEnd = $currentWeekStart->modify('+6 days')->setTime(23, 59, 59);

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

    public function isInRange(?string $dateStr, DateTimeImmutable $start, DateTimeImmutable $end): bool
    {
        if (!$dateStr) {
            return false;
        }

        try {
            $dt = new DateTimeImmutable($dateStr, new DateTimeZone('UTC'));
        } catch (Exception $e) {
            $ts = strtotime($dateStr);
            if ($ts === false) {
                error_log("[DatePeriodHelper::isInRange] Failed to parse date: {$dateStr}, error: " . $e->getMessage());
                return false;
            }
            $dt = (new DateTimeImmutable('@' . $ts))->setTimezone(new DateTimeZone('UTC'));
        }

        $dt = $dt->setTimezone(new DateTimeZone('UTC'));

        return $dt >= $start && $dt <= $end;
    }

    public function calculateDurationCategory(string $createdTimeStr, DateTimeImmutable $weekStart): string
    {
        $ts = strtotime($createdTimeStr);
        if ($ts === false) {
            return 'up_to_month';
        }

        $createdDt = (new DateTimeImmutable('@' . $ts))->setTimezone(new DateTimeZone('UTC'));
        $diff = $weekStart->diff($createdDt);
        $days = (int)$diff->format('%a');

        if ($days < 14) {
            return 'up_to_month';
        } elseif ($days < 30) {
            return 'less_than_month';
        } elseif ($days < 60) {
            return 'more_than_month';
        } elseif ($days < 180) {
            return 'more_than_2_months';
        } elseif ($days < 365) {
            return 'more_than_half_year';
        }

        return 'more_than_year';
    }

    /**
     * Проверка, является ли тикет переходящим для конкретной недели
     * Логика перенесена из legacy без изменений (TASK-065)
     */
    public function isCarryoverTicket(array $ticket, DateTimeImmutable $weekStart, DateTimeImmutable $weekEnd, array $targetStages, array $closingStages): bool
    {
        $createdTime = $ticket['createdTime'] ?? null;
        $movedTime = $ticket['movedTime'] ?? $ticket['updatedTime'] ?? null;
        $stageId = $ticket['stageId'] ?? null;

        if (!$stageId || !$createdTime) {
            return false;
        }

        $stageId = strtoupper($stageId);

        $createdDt = new DateTimeImmutable($createdTime, new DateTimeZone('UTC'));
        if ($createdDt > $weekEnd) {
            return false;
        }

        if (!in_array($stageId, $targetStages, true)) {
            return false;
        }

        if (in_array($stageId, $closingStages, true)) {
            return false;
        }

        return true;
    }
}

