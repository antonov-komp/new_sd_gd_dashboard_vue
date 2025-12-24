<?php

require_once __DIR__ . '/../../cache/TimeTrackingCache.php';

/**
 * TASK-071-02: Обертка над TimeTrackingCache
 * 
 * Позволит сохранить совместимость при постепенном переносе логики,
 * не меняя формат ключей/TTL/структуру данных.
 * 
 * Расположение: api/tickets-time-tracking-sector-1c/cache/CacheStore.php
 * 
 * Аналогично: api/graph-admission-closure/cache/CacheStore.php
 */
class CacheStore
{
    /**
     * Получить данные из кеша
     * 
     * @param string $key Ключ кеша
     * @return array|null Данные или null, если кеш не найден/истёк
     */
    public function get(string $key): ?array
    {
        return TimeTrackingCache::get($key);
    }

    /**
     * Сохранить данные в кеш
     * 
     * @param string $key Ключ кеша
     * @param array $data Данные для кеширования
     * @param int $ttl TTL в секундах (по умолчанию 5 минут)
     * @return bool true если успешно
     */
    public function set(string $key, array $data, int $ttl = 300): bool
    {
        return TimeTrackingCache::set($key, $data, $ttl);
    }

    /**
     * Генерация ключа кеша на основе параметров запроса
     * 
     * @param array $params Параметры запроса
     * @return string Ключ кеша
     */
    public function generateKey(array $params): string
    {
        return TimeTrackingCache::generateKey($params);
    }

    /**
     * Очистить устаревшие записи из кеша
     * 
     * @return int Количество удалённых файлов
     */
    public function clearExpired(): int
    {
        return TimeTrackingCache::clearExpired();
    }
}


