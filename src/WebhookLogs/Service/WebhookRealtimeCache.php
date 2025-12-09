<?php
/**
 * Кеш для последних проверенных записей в SSE
 * 
 * Расположение: src/WebhookLogs/Service/WebhookRealtimeCache.php
 * 
 * Управляет кешированием последних проверенных записей для оптимизации
 * проверки новых логов в SSE соединениях
 */
namespace WebhookLogs\Service;

use WebhookLogs\Config\WebhookLogsConfig;

class WebhookRealtimeCache
{
    /**
     * Кеш последних проверенных записей по категориям
     * 
     * Структура: [
     *   'category' => [
     *     'last_timestamp' => '2025-12-07T15:30:00+03:00',
     *     'last_checked_files' => ['file1.json', 'file2.json'],
     *     'last_checked_time' => 1234567890
     *   ]
     * ]
     * 
     * @var array
     */
    private static array $cache = [];
    
    /**
     * Получить последний проверенный timestamp для категории
     * 
     * @param string $category Категория
     * @return string|null Timestamp или null
     */
    public static function getLastTimestamp(string $category): ?string
    {
        if (!WebhookLogsConfig::isRealtimeCacheEnabled()) {
            return null;
        }
        
        if (!isset(self::$cache[$category])) {
            return null;
        }
        
        $cacheEntry = self::$cache[$category];
        $ttl = WebhookLogsConfig::getRealtimeCacheTtl();
        
        // Проверка TTL
        if (time() - $cacheEntry['last_checked_time'] > $ttl) {
            unset(self::$cache[$category]);
            return null;
        }
        
        return $cacheEntry['last_timestamp'] ?? null;
    }
    
    /**
     * Установить последний проверенный timestamp для категории
     * 
     * @param string $category Категория
     * @param string $timestamp Timestamp
     * @param array $checkedFiles Список проверенных файлов
     * @return void
     */
    public static function setLastTimestamp(string $category, string $timestamp, array $checkedFiles = []): void
    {
        if (!WebhookLogsConfig::isRealtimeCacheEnabled()) {
            return;
        }
        
        // Проверка размера кеша
        $maxSize = WebhookLogsConfig::getRealtimeCacheMaxSize();
        if (count(self::$cache) >= $maxSize) {
            // Удаляем самую старую запись
            self::evictOldest();
        }
        
        self::$cache[$category] = [
            'last_timestamp' => $timestamp,
            'last_checked_files' => $checkedFiles,
            'last_checked_time' => time()
        ];
    }
    
    /**
     * Очистить кеш для категории
     * 
     * @param string|null $category Категория (null = все категории)
     * @return int Количество удалённых записей
     */
    public static function clear(?string $category = null): int
    {
        if ($category === null) {
            $count = count(self::$cache);
            self::$cache = [];
            return $count;
        }
        
        if (isset(self::$cache[$category])) {
            unset(self::$cache[$category]);
            return 1;
        }
        
        return 0;
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
            'max_size' => WebhookLogsConfig::getRealtimeCacheMaxSize(),
            'ttl' => WebhookLogsConfig::getRealtimeCacheTtl(),
            'enabled' => WebhookLogsConfig::isRealtimeCacheEnabled(),
            'categories' => array_keys(self::$cache)
        ];
    }
    
    /**
     * Удалить самую старую запись из кеша
     */
    private static function evictOldest(): void
    {
        if (empty(self::$cache)) {
            return;
        }
        
        // Находим самую старую запись
        $oldestCategory = null;
        $oldestTime = PHP_INT_MAX;
        
        foreach (self::$cache as $category => $entry) {
            if ($entry['last_checked_time'] < $oldestTime) {
                $oldestTime = $entry['last_checked_time'];
                $oldestCategory = $category;
            }
        }
        
        if ($oldestCategory !== null) {
            unset(self::$cache[$oldestCategory]);
        }
    }
    
    /**
     * Очистка устаревших записей
     * 
     * @return int Количество удалённых записей
     */
    public static function cleanupExpired(): int
    {
        $ttl = WebhookLogsConfig::getRealtimeCacheTtl();
        $now = time();
        $removed = 0;
        
        foreach (self::$cache as $category => $entry) {
            if ($now - $entry['last_checked_time'] > $ttl) {
                unset(self::$cache[$category]);
                $removed++;
            }
        }
        
        return $removed;
    }
}




