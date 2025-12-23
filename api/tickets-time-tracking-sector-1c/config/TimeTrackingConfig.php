<?php

namespace TimeTracking\Config;

/**
 * Конфигурация модуля учёта времени
 * 
 * Содержит все константы и параметры конфигурации модуля
 * 
 * @package TimeTracking\Config
 */
class TimeTrackingConfig
{
    // Константы сектора 1С
    public const SECTOR_1C_DEPARTMENT_ID = 366;
    public const ENTITY_TYPE_ID = 140; // Сервис деск 140
    public const SECTOR_1C_TAG = '1C';
    
    // Параметры пагинации
    public const DEFAULT_PAGE_SIZE = 50;
    public const DEFAULT_BATCH_SIZE = 50;
    public const DEFAULT_TASKS_PER_PAGE = 10;
    public const MAX_TASKS_PER_PAGE = 100;
    
    // Параметры недель
    public const WEEKS_COUNT = 4; // Количество недель для анализа
    
    // Параметры времени
    public const TIMEZONE_UTC = 'UTC';
    
    /**
     * Получить ID отдела сектора 1С
     * 
     * @return int
     */
    public static function getSector1CDepartmentId(): int
    {
        return self::SECTOR_1C_DEPARTMENT_ID;
    }
    
    /**
     * Получить ID типа сущности (сервис деск)
     * 
     * @return int
     */
    public static function getEntityTypeId(): int
    {
        return self::ENTITY_TYPE_ID;
    }
    
    /**
     * Получить тег сектора 1С
     * 
     * @return string
     */
    public static function getSector1CTag(): string
    {
        return self::SECTOR_1C_TAG;
    }
    
    /**
     * Получить размер страницы по умолчанию
     * 
     * @return int
     */
    public static function getDefaultPageSize(): int
    {
        return self::DEFAULT_PAGE_SIZE;
    }
    
    /**
     * Получить размер батча по умолчанию
     * 
     * @return int
     */
    public static function getDefaultBatchSize(): int
    {
        return self::DEFAULT_BATCH_SIZE;
    }
    
    /**
     * Получить количество задач на страницу по умолчанию
     * 
     * @return int
     */
    public static function getDefaultTasksPerPage(): int
    {
        return self::DEFAULT_TASKS_PER_PAGE;
    }
    
    /**
     * Получить максимальное количество задач на страницу
     * 
     * @return int
     */
    public static function getMaxTasksPerPage(): int
    {
        return self::MAX_TASKS_PER_PAGE;
    }
    
    /**
     * Получить количество недель для анализа
     * 
     * @return int
     */
    public static function getWeeksCount(): int
    {
        return self::WEEKS_COUNT;
    }
    
    /**
     * Получить часовой пояс (UTC)
     * 
     * @return string
     */
    public static function getTimezone(): string
    {
        return self::TIMEZONE_UTC;
    }
}

