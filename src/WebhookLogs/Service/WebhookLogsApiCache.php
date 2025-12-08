<?php
/**
 * Кеш для результатов API запросов
 * 
 * Расположение: src/WebhookLogs/Service/WebhookLogsApiCache.php
 * 
 * Управляет кешированием результатов запросов к API логов
 */
namespace WebhookLogs\Service;

use WebhookLogs\Config\WebhookLogsConfig;

class WebhookLogsApiCache
{
    /**
     * Кеш записей
     * 
     * @var array
     */
    private static array $cache = [];
    
    /**
     * Временные метки записей кеша
     * 
     * @var array
     */
    private static array $cacheTimestamps = [];
    
    /**
     * Получить значение из кеша
     * 
     * @param string $key Ключ кеша
     * @return array|null Значение или null если не найдено/истекло
     */
    public static function get(string $key): ?array
    {
        if (!WebhookLogsConfig::isApiCacheEnabled()) {
            return null;
        }
        
        // Проверка существования
        if (!isset(self::$cache[$key])) {
            return null;
        }
        
        // Проверка TTL
        $ttl = WebhookLogsConfig::getApiCacheTtl();
        $timestamp = self::$cacheTimestamps[$key] ?? 0;
        
        if (time() - $timestamp > $ttl) {
            // Истёк срок действия
            unset(self::$cache[$key]);
            unset(self::$cacheTimestamps[$key]);
            return null;
        }
        
        return self::$cache[$key];
    }
    
    /**
     * Сохранить значение в кеш
     * 
     * @param string $key Ключ кеша
     * @param array $value Значение для кеширования
     * @return bool true если успешно
     */
    public static function set(string $key, array $value): bool
    {
        if (!WebhookLogsConfig::isApiCacheEnabled()) {
            return false;
        }
        
        // Проверка размера кеша
        $maxSize = WebhookLogsConfig::getApiCacheMaxSize();
        if (count(self::$cache) >= $maxSize) {
            // Удаляем самую старую запись
            self::evictOldest();
        }
        
        self::$cache[$key] = $value;
        self::$cacheTimestamps[$key] = time();
        
        return true;
    }
    
    /**
     * Инвалидировать запись в кеше
     * 
     * @param string $key Ключ кеша (или паттерн для поиска)
     * @return int Количество удалённых записей
     */
    public static function invalidate(string $key): int
    {
        $count = 0;
        
        // Если ключ содержит * - это паттерн
        if (strpos($key, '*') !== false) {
            $pattern = '/^' . str_replace('*', '.*', preg_quote($key, '/')) . '$/';
            foreach (array_keys(self::$cache) as $cacheKey) {
                if (preg_match($pattern, $cacheKey)) {
                    unset(self::$cache[$cacheKey]);
                    unset(self::$cacheTimestamps[$cacheKey]);
                    $count++;
                }
            }
        } else {
            // Точное совпадение
            if (isset(self::$cache[$key])) {
                unset(self::$cache[$key]);
                unset(self::$cacheTimestamps[$key]);
                $count = 1;
            }
        }
        
        return $count;
    }
    
    /**
     * Очистить весь кеш
     * 
     * @return int Количество удалённых записей
     */
    public static function clear(): int
    {
        $count = count(self::$cache);
        self::$cache = [];
        self::$cacheTimestamps = [];
        return $count;
    }
    
    /**
     * Удалить самую старую запись из кеша
     */
    private static function evictOldest(): void
    {
        if (empty(self::$cacheTimestamps)) {
            return;
        }
        
        // Находим самую старую запись
        $oldestKey = null;
        $oldestTimestamp = PHP_INT_MAX;
        
        foreach (self::$cacheTimestamps as $key => $timestamp) {
            if ($timestamp < $oldestTimestamp) {
                $oldestTimestamp = $timestamp;
                $oldestKey = $key;
            }
        }
        
        if ($oldestKey !== null) {
            unset(self::$cache[$oldestKey]);
            unset(self::$cacheTimestamps[$oldestKey]);
        }
    }
    
    /**
     * Получить статистику кеша
     * 
     * @return array Статистика
     */
    public static function getStats(): array
    {
        return [
            'size' => count(self::$cache),
            'max_size' => WebhookLogsConfig::getApiCacheMaxSize(),
            'ttl' => WebhookLogsConfig::getApiCacheTtl(),
            'enabled' => WebhookLogsConfig::isApiCacheEnabled()
        ];
    }
    
    /**
     * Генерация ключа кеша из параметров запроса
     * 
     * @param array $filters Фильтры
     * @param int $page Номер страницы
     * @param int $limit Лимит
     * @return string Ключ кеша
     */
    public static function generateCacheKey(array $filters, int $page, int $limit): string
    {
        // Сортировка фильтров для консистентности ключа
        ksort($filters);
        
        // Нормализация фильтров (удаление null значений для консистентности)
        $normalizedFilters = array_filter($filters, function($value) {
            return $value !== null && $value !== '';
        });
        
        $keyParts = [
            'filters' => md5(json_encode($normalizedFilters, JSON_UNESCAPED_UNICODE)),
            'page' => $page,
            'limit' => $limit
        ];
        
        $key = 'webhook_logs_api_' . md5(json_encode($keyParts));
        
        // Логирование генерации ключа (для отладки)
        if (WebhookLogsConfig::isApiCacheLoggingEnabled()) {
            error_log(sprintf(
                '[WebhookLogsApiCache] Generated cache key: %s (filters: %s)',
                $key,
                json_encode($normalizedFilters)
            ));
        }
        
        return $key;
    }
    
    /**
     * Очистить устаревшие записи из кеша
     * 
     * @return int Количество удалённых записей
     */
    public static function cleanupExpired(): int
    {
        $ttl = WebhookLogsConfig::getApiCacheTtl();
        $now = time();
        $removed = 0;
        
        foreach (self::$cacheTimestamps as $key => $timestamp) {
            if ($now - $timestamp > $ttl) {
                unset(self::$cache[$key]);
                unset(self::$cacheTimestamps[$key]);
                $removed++;
            }
        }
        
        if ($removed > 0 && WebhookLogsConfig::isApiCacheLoggingEnabled()) {
            error_log(sprintf(
                '[WebhookLogsApiCache] Cleaned up %d expired entries',
                $removed
            ));
        }
        
        return $removed;
    }
}



