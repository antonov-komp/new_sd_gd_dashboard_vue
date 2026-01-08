<?php
/**
 * Файловый кеш для API endpoint graph-1c-admission-closure.php
 * 
 * TASK-059-05: Реализация файлового кеша для режима "3 месяца"
 * TASK-068-01: Расширение для поддержки режима "4 недели"
 * 
 * Расположение: api/cache/GraphAdmissionClosureCache.php
 * 
 * Управляет кешированием результатов запросов в режимах "3 месяца" и "4 недели"
 */
class GraphAdmissionClosureCache
{
    /**
     * Базовый путь к директории кеша
     * Файл находится в api/cache/, поэтому используем __DIR__ напрямую
     */
    private const CACHE_BASE_DIR = __DIR__ . '/graph-admission-closure';
    
    /**
     * Поддиректория для режима "months"
     */
    private const CACHE_MONTHS_DIR = self::CACHE_BASE_DIR . '/months';
    
    /**
     * Поддиректория для режима "weeks"
     * TASK-068-01: Добавлена поддержка режима "weeks"
     */
    private const CACHE_WEEKS_DIR = self::CACHE_BASE_DIR . '/weeks';
    
    /**
     * TTL по умолчанию (5 минут)
     */
    private const DEFAULT_TTL = 300;
    
    /**
     * Получить данные из кеша
     * 
     * TASK-068-01: Обновлено для поддержки режима "weeks"
     * 
     * @param string $key Ключ кеша
     * @return array|null Данные или null, если кеш не найден/истёк
     */
    public static function get(string $key): ?array
    {
        // Определяем режим из префикса ключа
        $periodMode = strpos($key, 'weeks_') === 0 ? 'weeks' : 'months';
        $cachePath = self::getCachePath($key, $periodMode);
        
        // Проверка существования файла
        if (!file_exists($cachePath)) {
            return null;
        }
        
        // Чтение файла
        $content = @file_get_contents($cachePath);
        if ($content === false) {
            error_log("[Cache] Failed to read cache file: {$cachePath}");
            return null;
        }
        
        // Декодирование JSON
        $data = @json_decode($content, true);
        if ($data === null || !is_array($data)) {
            error_log("[Cache] Failed to decode cache file: {$cachePath}");
            return null;
        }
        
        // Проверка структуры данных
        if (!isset($data['metadata']['expires_at'])) {
            error_log("[Cache] Invalid cache structure: {$cachePath}");
            return null;
        }
        
        // Проверка истечения срока действия
        if (time() > $data['metadata']['expires_at']) {
            // Кеш истёк, удаляем файл
            @unlink($cachePath);
            return null;
        }
        
        return $data['data'] ?? null;
    }
    
    /**
     * Сохранить данные в кеш
     * 
     * TASK-068-01: Обновлено для поддержки режима "weeks"
     * 
     * @param string $key Ключ кеша
     * @param array $data Данные для кеширования
     * @param int $ttl TTL в секундах (по умолчанию 5 минут)
     * @return bool true если успешно
     */
    public static function set(string $key, array $data, int $ttl = self::DEFAULT_TTL): bool
    {
        // Определяем режим из префикса ключа
        $periodMode = strpos($key, 'weeks_') === 0 ? 'weeks' : 'months';
        
        // Создание директории, если не существует
        if (!self::ensureCacheDirectory($periodMode)) {
            return false;
        }
        
        $cachePath = self::getCachePath($key, $periodMode);
        $now = time();
        
        // Формирование структуры данных
        $cacheData = [
            'data' => $data,
            'metadata' => [
                'created_at' => $now,
                'expires_at' => $now + $ttl,
                'ttl' => $ttl
            ]
        ];
        
        // Кодирование в JSON
        $json = json_encode($cacheData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        if ($json === false) {
            error_log("[Cache] Failed to encode cache data for key: {$key}");
            return false;
        }
        
        // Запись в файл (атомарная операция через временный файл)
        $tempPath = $cachePath . '.tmp';
        if (@file_put_contents($tempPath, $json, LOCK_EX) === false) {
            error_log("[Cache] Failed to write cache file: {$tempPath}");
            return false;
        }
        
        // Атомарное переименование
        if (!@rename($tempPath, $cachePath)) {
            error_log("[Cache] Failed to rename cache file: {$tempPath} -> {$cachePath}");
            @unlink($tempPath);
            return false;
        }
        
        return true;
    }
    
    /**
     * Удалить запись из кеша
     * 
     * TASK-068-01: Обновлено для поддержки режима "weeks"
     * 
     * @param string $key Ключ кеша
     * @return bool true если успешно
     */
    public static function delete(string $key): bool
    {
        // Определяем режим из префикса ключа
        $periodMode = strpos($key, 'weeks_') === 0 ? 'weeks' : 'months';
        $cachePath = self::getCachePath($key, $periodMode);
        
        if (file_exists($cachePath)) {
            return @unlink($cachePath);
        }
        
        return true; // Файл уже не существует
    }
    
    /**
     * Очистить весь кеш
     * 
     * TASK-068-01: Обновлено для очистки обоих режимов (weeks и months)
     * 
     * @return bool true если успешно
     */
    public static function clear(): bool
    {
        $success = true;
        
        // Очистка кешей режима "weeks"
        if (!self::clearDirectory(self::CACHE_WEEKS_DIR)) {
            $success = false;
        }
        
        // Очистка кешей режима "months"
        if (!self::clearDirectory(self::CACHE_MONTHS_DIR)) {
            $success = false;
        }
        
        return $success;
    }
    
    /**
     * Очистить все файлы в директории
     * 
     * TASK-068-01: Вспомогательный метод для избежания дублирования кода
     * 
     * @param string $cacheDir Путь к директории кеша
     * @return bool true если успешно
     */
    private static function clearDirectory(string $cacheDir): bool
    {
        if (!is_dir($cacheDir)) {
            return true; // Директория не существует
        }
        
        $files = glob($cacheDir . '/*.json');
        $success = true;
        
        foreach ($files as $file) {
            if (!@unlink($file)) {
                error_log("[Cache] Failed to delete cache file: {$file}");
                $success = false;
            }
        }
        
        return $success;
    }
    
    /**
     * Очистить устаревшие записи
     * 
     * TASK-068-01: Обновлено для очистки обоих режимов (weeks и months)
     * 
     * @return int Количество удалённых файлов (из обеих директорий)
     */
    public static function clearExpired(): int
    {
        $deleted = 0;
        $now = time();
        
        // Очистка кешей режима "weeks"
        $deleted += self::clearExpiredInDirectory(self::CACHE_WEEKS_DIR, $now);
        
        // Очистка кешей режима "months"
        $deleted += self::clearExpiredInDirectory(self::CACHE_MONTHS_DIR, $now);
        
        return $deleted;
    }
    
    /**
     * Очистить устаревшие записи в конкретной директории
     * 
     * TASK-068-01: Вспомогательный метод для избежания дублирования кода
     * 
     * @param string $cacheDir Путь к директории кеша
     * @param int $now Текущее время (Unix timestamp)
     * @return int Количество удалённых файлов
     */
    private static function clearExpiredInDirectory(string $cacheDir, int $now): int
    {
        if (!is_dir($cacheDir)) {
            return 0;
        }
        
        $files = glob($cacheDir . '/*.json');
        $deleted = 0;
        
        foreach ($files as $file) {
            $content = @file_get_contents($file);
            if ($content === false) {
                continue;
            }
            
            $data = @json_decode($content, true);
            if ($data === null || !is_array($data)) {
                continue;
            }
            
            $expiresAt = $data['metadata']['expires_at'] ?? 0;
            if ($now > $expiresAt) {
                if (@unlink($file)) {
                    $deleted++;
                }
            }
        }
        
        return $deleted;
    }
    
    /**
     * Получить путь к файлу кеша
     * 
     * TASK-068-01: Обновлено для поддержки обоих режимов (weeks и months)
     * 
     * @param string $key Ключ кеша
     * @param string $periodMode Режим периода ('weeks' или 'months')
     * @return string Полный путь к файлу
     */
    private static function getCachePath(string $key, string $periodMode = 'months'): string
    {
        // Безопасное имя файла (только буквы, цифры, дефисы, подчёркивания)
        $safeKey = preg_replace('/[^a-zA-Z0-9_-]/', '_', $key);
        
        // Выбор директории в зависимости от режима
        $cacheDir = $periodMode === 'weeks' 
            ? self::CACHE_WEEKS_DIR 
            : self::CACHE_MONTHS_DIR;
        
        return $cacheDir . '/' . $safeKey . '.json';
    }
    
    /**
     * Генерация ключа кеша на основе параметров запроса
     * 
     * TASK-068-02: Обновлено для включения weekStartUtc/weekEndUtc в ключ для режима "weeks"
     * 
     * @param array $params Параметры запроса
     * @return string Ключ кеша
     */
    public static function generateKey(array $params): string
    {
        // Нормализация параметров для генерации ключа
        $normalized = [
            'product' => $params['product'] ?? '1C',
            'periodMode' => $params['periodMode'] ?? 'months',
            'includeTickets' => $params['includeTickets'] ?? false,
            'includeNewTicketsByStages' => $params['includeNewTicketsByStages'] ?? false,
            'includeCarryoverTicketsByDuration' => $params['includeCarryoverTicketsByDuration'] ?? false
        ];

        // Для режима "weeks" включаем границы недель в ключ
        if ($normalized['periodMode'] === 'weeks') {
            $normalized['weekStartUtc'] = $params['weekStartUtc'] ?? null;
            $normalized['weekEndUtc'] = $params['weekEndUtc'] ?? null;
            $normalized['includeCarryoverTickets'] = $params['includeCarryoverTickets'] ?? false;
        } else {
            // Для режима "months" период определяется автоматически (последние 3 месяца)
            // Поэтому не включаем weekStartUtc/weekEndUtc в ключ
            $normalized['includeCarryoverTickets'] = $params['includeCarryoverTickets'] ?? true;
        }
        
        // Генерация MD5 хеша от нормализованных параметров
        // Важно: json_encode с JSON_UNESCAPED_UNICODE для консистентности
        $keyString = json_encode($normalized, JSON_UNESCAPED_UNICODE);
        $hash = md5($keyString);
        
        // Добавляем префикс для читаемости и определения режима
        $prefix = $normalized['periodMode'] === 'weeks' ? 'weeks' : 'months';
        return $prefix . '_' . $hash;
    }

    /**
     * Генерация универсального ключа для weeks режима
     *
     * TASK-076: Второй вариант - универсальный кеш для weeks режима
     * Создает ключ с стандартными параметрами, используемыми в интерфейсе
     *
     * @param string|null $weekStartUtc Начало недели (опционально, по умолчанию текущая неделя)
     * @param string|null $weekEndUtc Конец недели (опционально, по умолчанию текущая неделя)
     * @return string Универсальный ключ кеша
     */
    public static function generateUniversalKey(?string $weekStartUtc = null, ?string $weekEndUtc = null): string
    {
        // Если границы недели не переданы, используем текущую неделю
        if ($weekStartUtc === null || $weekEndUtc === null) {
            $tz = new DateTimeZone('UTC');
            $now = new DateTimeImmutable('now', $tz);
            $isoYear = (int)$now->format('o');
            $isoWeek = (int)$now->format('W');

            $weekStart = (new DateTimeImmutable('now', $tz))
                ->setISODate($isoYear, $isoWeek, 1)
                ->setTime(0, 0, 0);
            $weekEnd = $weekStart
                ->modify('+6 days')
                ->setTime(23, 59, 59);

            $weekStartUtc = $weekStart->format('Y-m-d\TH:i:s\Z');
            $weekEndUtc = $weekEnd->format('Y-m-d\TH:i:s\Z');
        }

        // TASK-076: Всегда используем переданные границы недели
        // Не рассчитываем заново, даже если они переданы

        // Стандартные параметры, используемые в интерфейсе weeks режима
        $universalParams = [
            'product' => '1C',
            'periodMode' => 'weeks',
            'weekStartUtc' => $weekStartUtc,
            'weekEndUtc' => $weekEndUtc,
            'includeTickets' => true,                    // Как в интерфейсе
            'includeNewTicketsByStages' => true,         // Как в интерфейсе
            'includeCarryoverTickets' => false,          // По умолчанию
            'includeCarryoverTicketsByDuration' => true  // Как в интерфейсе
        ];

        return self::generateKey($universalParams);
    }

    /**
     * Проверка истечения срока действия кеша
     * 
     * TASK-068-01: Обновлено для поддержки режима "weeks"
     * 
     * @param string $key Ключ кеша
     * @return bool true если кеш истёк или не существует
     */
    public static function isExpired(string $key): bool
    {
        // Определяем режим из префикса ключа
        $periodMode = strpos($key, 'weeks_') === 0 ? 'weeks' : 'months';
        $cachePath = self::getCachePath($key, $periodMode);
        
        if (!file_exists($cachePath)) {
            return true;
        }
        
        $content = @file_get_contents($cachePath);
        if ($content === false) {
            return true;
        }
        
        $data = @json_decode($content, true);
        if ($data === null || !is_array($data)) {
            return true;
        }
        
        $expiresAt = $data['metadata']['expires_at'] ?? 0;
        return time() > $expiresAt;
    }
    
    /**
     * Убедиться, что директория кеша существует
     * 
     * TASK-068-01: Обновлено для поддержки обоих режимов (weeks и months)
     * 
     * @param string $periodMode Режим периода ('weeks' или 'months')
     * @return bool true если директория существует или создана
     */
    private static function ensureCacheDirectory(string $periodMode = 'months'): bool
    {
        $cacheDir = $periodMode === 'weeks' 
            ? self::CACHE_WEEKS_DIR 
            : self::CACHE_MONTHS_DIR;
        
        if (is_dir($cacheDir)) {
            return is_writable($cacheDir);
        }
        
        // Создание директории рекурсивно
        if (!@mkdir($cacheDir, 0755, true)) {
            error_log("[Cache] Failed to create cache directory: {$cacheDir}");
            return false;
        }
        
        return true;
    }
}

