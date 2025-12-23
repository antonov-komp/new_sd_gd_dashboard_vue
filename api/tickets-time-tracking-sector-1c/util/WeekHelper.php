<?php

namespace TimeTracking\Util;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Утилиты для работы с неделями по стандарту ISO-8601
 * 
 * Все расчёты выполняются в UTC
 * 
 * @package TimeTracking\Util
 */
class WeekHelper
{
    /**
     * Возвращает границы текущей ISO-недели (UTC) если не переданы в запросе
     * 
     * @param string|null $start Начало недели (опционально)
     * @param string|null $end Конец недели (опционально)
     * @return array [DateTimeImmutable $weekStart, DateTimeImmutable $weekEnd]
     */
    public static function getWeekBounds(?string $start = null, ?string $end = null): array
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
     * Вычисляет границы N недель (текущая + N-1 предыдущие) по ISO-8601
     * 
     * @param DateTimeImmutable $currentWeekStart Начало текущей недели
     * @param DateTimeImmutable $currentWeekEnd Конец текущей недели
     * @param int $weeksCount Количество недель (по умолчанию 4)
     * @return array Массив с информацией о неделях (от старых к новым)
     */
    public static function getWeeksBounds(
        DateTimeImmutable $currentWeekStart,
        DateTimeImmutable $currentWeekEnd,
        int $weeksCount = 4
    ): array {
        $weeks = [];
        
        for ($i = 0; $i < $weeksCount; $i++) {
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
        
        // Возвращаем от старых к новым
        return array_reverse($weeks);
    }

    /**
     * Определение номера недели по дате
     * 
     * @param string $dateStr Дата в формате строки
     * @param array $weeks Массив недель (из getWeeksBounds)
     * @return int|null Номер недели или null
     */
    public static function getWeekNumberByDate(string $dateStr, array $weeks): ?int
    {
        $ts = strtotime($dateStr);
        if ($ts === false) {
            return null;
        }
        $dt = (new DateTimeImmutable('@' . $ts))->setTimezone(new DateTimeZone('UTC'));
        
        foreach ($weeks as $week) {
            if ($dt >= $week['weekStart'] && $dt <= $week['weekEnd']) {
                return $week['weekNumber'];
            }
        }
        
        return null;
    }

    /**
     * Проверка попадания даты в интервал [start, end]
     * 
     * @param string|null $dateStr Дата в формате строки
     * @param DateTimeImmutable $start Начало интервала
     * @param DateTimeImmutable $end Конец интервала
     * @return bool
     */
    public static function isInRange(?string $dateStr, DateTimeImmutable $start, DateTimeImmutable $end): bool
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
}

