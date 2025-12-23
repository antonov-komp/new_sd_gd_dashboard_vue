<?php

require_once __DIR__ . '/../../cache/GraphAdmissionClosureCache.php';

/**
 * TASK-065: Обертка над legacy GraphAdmissionClosureCache.
 *
 * Позволит сохранить совместимость при постепенном переносе логики,
 * не меняя формат ключей/TTL/структуру данных.
 */
class CacheStore
{
    public function get(string $key): ?array
    {
        return GraphAdmissionClosureCache::get($key);
    }

    public function set(string $key, array $data, int $ttl = 300): bool
    {
        return GraphAdmissionClosureCache::set($key, $data, $ttl);
    }

    public function generateKey(array $params): string
    {
        return GraphAdmissionClosureCache::generateKey($params);
    }

    public function clearExpired(): int
    {
        return GraphAdmissionClosureCache::clearExpired();
    }
}

