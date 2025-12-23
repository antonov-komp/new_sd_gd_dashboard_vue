<?php

namespace TimeTracking\Util;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Утилиты для работы с датами
 * 
 * Все операции выполняются в UTC
 * 
 * @package TimeTracking\Util
 */
class DateHelper
{
    /**
     * Создать DateTimeImmutable из строки в UTC
     * 
     * @param string $dateStr Дата в формате строки
     * @return DateTimeImmutable|null
     */
    public static function createFromString(string $dateStr): ?DateTimeImmutable
    {
        $ts = strtotime($dateStr);
        if ($ts === false) {
            return null;
        }
        return (new DateTimeImmutable('@' . $ts))->setTimezone(new DateTimeZone('UTC'));
    }

    /**
     * Форматировать дату в ISO-8601 формат (UTC)
     * 
     * @param DateTimeImmutable $date
     * @return string
     */
    public static function formatIso8601(DateTimeImmutable $date): string
    {
        return $date->format('Y-m-d\TH:i:s\Z');
    }

    /**
     * Форматировать дату для фильтра Bitrix24 (Y-m-d)
     * 
     * @param DateTimeImmutable $date
     * @return string
     */
    public static function formatForBitrixFilter(DateTimeImmutable $date): string
    {
        return $date->format('Y-m-d');
    }
}

