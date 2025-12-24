<?php

require_once __DIR__ . '/../../cache/TimeTrackingCache.php';

/**
 * TASK-071-02: Обертка над TimeTrackingCache
 * TASK-075: Обновлено для поддержки режимов
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
     * TASK-075: Обновлено для поддержки автоматического TTL по режиму
     * 
     * @param string $key Ключ кеша
     * @param array $data Данные для кеширования
     * @param int|null $ttl TTL в секундах (null = автоматический выбор по режиму)
     * @return bool true если успешно
     */
    public function set(string $key, array $data, ?int $ttl = null): bool
    {
        return TimeTrackingCache::set($key, $data, $ttl);
    }

    /**
     * Генерация ключа кеша на основе параметров запроса
     * 
     * TASK-075: Обновлено для поддержки режимов
     * 
     * @param array $params Параметры запроса
     * @param string $mode Режим ('default', 'detailed', 'summary')
     * @return string Ключ кеша
     */
    public function generateKey(array $params, string $mode = 'default'): string
    {
        return TimeTrackingCache::generateKey($params, $mode);
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
    
    /**
     * Очистить кеш для конкретного режима
     * 
     * TASK-075: Новый метод для очистки конкретного режима
     * 
     * @param string $mode Режим ('default', 'detailed', 'summary')
     * @return bool true если успешно
     */
    public function clearByMode(string $mode): bool
    {
        return TimeTrackingCache::clearByMode($mode);
    }
}


