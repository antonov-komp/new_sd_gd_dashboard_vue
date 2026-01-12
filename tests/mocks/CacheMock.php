<?php
/**
 * Mock класс для имитации системы кеширования
 *
 * Этот класс предоставляет mock реализацию кеширования для тестирования
 * без использования реальных файловых систем или Redis.
 *
 * Имитирует поведение различных типов кеша в проекте.
 *
 * @created 2026-01-12
 * @author Full-Stack инженер
 */

class CacheMock
{
    private static $cache = [];
    private static $stats = [
        'hits' => 0,
        'misses' => 0,
        'sets' => 0,
        'deletes' => 0
    ];

    /**
     * Установка значения в кеш
     *
     * @param string $key Ключ кеша
     * @param mixed $value Значение для сохранения
     * @param int $ttl Время жизни в секундах
     * @return bool Успешность операции
     */
    public static function set(string $key, $value, int $ttl = 3600): bool
    {
        self::$cache[$key] = [
            'value' => $value,
            'expires' => time() + $ttl,
            'created' => time()
        ];

        self::$stats['sets']++;

        // Имитация возможной ошибки записи
        if (rand(1, 1000) === 1) { // 0.1% вероятность ошибки
            return false;
        }

        return true;
    }

    /**
     * Получение значения из кеша
     *
     * @param string $key Ключ кеша
     * @return mixed Значение или null если не найдено/истекло
     */
    public static function get(string $key)
    {
        self::$stats['misses']++; // Предполагаем miss по умолчанию

        if (!isset(self::$cache[$key])) {
            return null;
        }

        $item = self::$cache[$key];

        if (time() > $item['expires']) {
            // Кеш истек, удаляем
            unset(self::$cache[$key]);
            return null;
        }

        self::$stats['hits']++; // Было попадание
        self::$stats['misses']--; // Корректируем счетчик

        return $item['value'];
    }

    /**
     * Удаление значения из кеша
     *
     * @param string $key Ключ кеша
     * @return bool Успешность операции
     */
    public static function delete(string $key): bool
    {
        if (isset(self::$cache[$key])) {
            unset(self::$cache[$key]);
            self::$stats['deletes']++;
            return true;
        }
        return false;
    }

    /**
     * Очистка всего кеша
     *
     * @return bool Успешность операции
     */
    public static function clear(): bool
    {
        self::$cache = [];
        self::$stats['deletes'] += count(self::$cache);
        return true;
    }

    /**
     * Проверка существования ключа в кеше
     *
     * @param string $key Ключ кеша
     * @return bool Существует ли ключ
     */
    public static function has(string $key): bool
    {
        if (!isset(self::$cache[$key])) {
            return false;
        }

        if (time() > self::$cache[$key]['expires']) {
            unset(self::$cache[$key]);
            return false;
        }

        return true;
    }

    /**
     * Получение статистики кеширования
     *
     * @return array Статистика использования кеша
     */
    public static function getStats(): array
    {
        $totalRequests = self::$stats['hits'] + self::$stats['misses'];
        $hitRate = $totalRequests > 0 ? (self::$stats['hits'] / $totalRequests) * 100 : 0;

        return [
            'items_count' => count(self::$cache),
            'memory_usage' => self::calculateMemoryUsage(),
            'hits' => self::$stats['hits'],
            'misses' => self::$stats['misses'],
            'sets' => self::$stats['sets'],
            'deletes' => self::$stats['deletes'],
            'hit_rate' => round($hitRate, 2),
            'total_requests' => $totalRequests
        ];
    }

    /**
     * Получение всех ключей кеша
     *
     * @return array Массив ключей
     */
    public static function getAllKeys(): array
    {
        // Удаляем истекшие ключи перед возвратом
        self::cleanupExpired();

        return array_keys(self::$cache);
    }

    /**
     * Получение информации о ключе
     *
     * @param string $key Ключ кеша
     * @return array|null Информация о ключе или null
     */
    public static function getKeyInfo(string $key): ?array
    {
        if (!isset(self::$cache[$key])) {
            return null;
        }

        $item = self::$cache[$key];

        if (time() > $item['expires']) {
            unset(self::$cache[$key]);
            return null;
        }

        return [
            'key' => $key,
            'created' => $item['created'],
            'expires' => $item['expires'],
            'ttl_remaining' => $item['expires'] - time(),
            'value_type' => gettype($item['value']),
            'value_size' => strlen(serialize($item['value']))
        ];
    }

    /**
     * Увеличение числового значения в кеше
     *
     * @param string $key Ключ кеша
     * @param int $value Значение для увеличения (по умолчанию 1)
     * @return int Новое значение
     */
    public static function increment(string $key, int $value = 1): int
    {
        $current = self::get($key) ?? 0;

        if (!is_numeric($current)) {
            $current = 0;
        }

        $newValue = (int)$current + $value;
        self::set($key, $newValue);

        return $newValue;
    }

    /**
     * Уменьшение числового значения в кеше
     *
     * @param string $key Ключ кеша
     * @param int $value Значение для уменьшения (по умолчанию 1)
     * @return int Новое значение
     */
    public static function decrement(string $key, int $value = 1): int
    {
        return self::increment($key, -$value);
    }

    /**
     * Установка нескольких значений одновременно
     *
     * @param array $items Массив ключ=>значение
     * @param int $ttl Время жизни
     * @return bool Успешность операции
     */
    public static function setMultiple(array $items, int $ttl = 3600): bool
    {
        foreach ($items as $key => $value) {
            self::set($key, $value, $ttl);
        }
        return true;
    }

    /**
     * Получение нескольких значений одновременно
     *
     * @param array $keys Массив ключей
     * @return array Массив ключ=>значение
     */
    public static function getMultiple(array $keys): array
    {
        $result = [];
        foreach ($keys as $key) {
            $result[$key] = self::get($key);
        }
        return $result;
    }

    /**
     * Удаление нескольких ключей одновременно
     *
     * @param array $keys Массив ключей
     * @return bool Успешность операции
     */
    public static function deleteMultiple(array $keys): bool
    {
        foreach ($keys as $key) {
            self::delete($key);
        }
        return true;
    }

    /**
     * Имитация различных типов кеша (файловый, Redis и т.д.)
     */
    public static function simulateCacheType(string $type): void
    {
        switch ($type) {
            case 'file':
                // Имитация задержек файловой системы
                usleep(rand(1000, 5000)); // 1-5мс
                break;
            case 'redis':
                // Имитация сетевых задержек Redis
                usleep(rand(500, 2000)); // 0.5-2мс
                break;
            case 'memory':
                // Быстрая память, минимальная задержка
                usleep(rand(50, 200)); // 0.05-0.2мс
                break;
        }
    }

    /**
     * Очистка истекших ключей
     */
    private static function cleanupExpired(): void
    {
        $now = time();
        foreach (self::$cache as $key => $item) {
            if ($now > $item['expires']) {
                unset(self::$cache[$key]);
            }
        }
    }

    /**
     * Расчет использования памяти
     */
    private static function calculateMemoryUsage(): int
    {
        return strlen(serialize(self::$cache));
    }

    /**
     * Сброс статистики
     */
    public static function resetStats(): void
    {
        self::$stats = [
            'hits' => 0,
            'misses' => 0,
            'sets' => 0,
            'deletes' => 0
        ];
    }

    /**
     * Сброс всего состояния mock кеша
     */
    public static function reset(): void
    {
        self::$cache = [];
        self::resetStats();
    }
}