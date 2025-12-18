<?php
/**
 * Файловый кеш для API endpoint graph-1c-admission-closure.php
 * 
 * TASK-059-05: Реализация файлового кеша для режима "3 месяца"
 * 
 * Расположение: api/cache/GraphAdmissionClosureCache.php
 * 
 * Управляет кешированием результатов запросов в режиме "3 месяца"
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
     * TTL по умолчанию (5 минут)
     */
    private const DEFAULT_TTL = 300;
    
    /**
     * Получить данные из кеша
     * 
     * @param string $key Ключ кеша
     * @return array|null Данные или null, если кеш не найден/истёк
     */
    public static function get(string $key): ?array
    {
        $cachePath = self::getCachePath($key);
        
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
     * @param string $key Ключ кеша
     * @param array $data Данные для кеширования
     * @param int $ttl TTL в секундах (по умолчанию 5 минут)
     * @return bool true если успешно
     */
    public static function set(string $key, array $data, int $ttl = self::DEFAULT_TTL): bool
    {
        // Создание директории, если не существует
        if (!self::ensureCacheDirectory()) {
            return false;
        }
        
        $cachePath = self::getCachePath($key);
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
     * @param string $key Ключ кеша
     * @return bool true если успешно
     */
    public static function delete(string $key): bool
    {
        $cachePath = self::getCachePath($key);
        
        if (file_exists($cachePath)) {
            return @unlink($cachePath);
        }
        
        return true; // Файл уже не существует
    }
    
    /**
     * Очистить весь кеш
     * 
     * @return bool true если успешно
     */
    public static function clear(): bool
    {
        $cacheDir = self::CACHE_MONTHS_DIR;
        
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
     * @return int Количество удалённых файлов
     */
    public static function clearExpired(): int
    {
        $cacheDir = self::CACHE_MONTHS_DIR;
        
        if (!is_dir($cacheDir)) {
            return 0;
        }
        
        $files = glob($cacheDir . '/*.json');
        $deleted = 0;
        $now = time();
        
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
     * @param string $key Ключ кеша
     * @return string Полный путь к файлу
     */
    private static function getCachePath(string $key): string
    {
        // Безопасное имя файла (только буквы, цифры, дефисы, подчёркивания)
        $safeKey = preg_replace('/[^a-zA-Z0-9_-]/', '_', $key);
        
        return self::CACHE_MONTHS_DIR . '/' . $safeKey . '.json';
    }
    
    /**
     * Генерация ключа кеша на основе параметров запроса
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
            'includeCarryoverTickets' => $params['includeCarryoverTickets'] ?? true,
            'includeCarryoverTicketsByDuration' => $params['includeCarryoverTicketsByDuration'] ?? false
        ];
        
        // Для режима "months" период определяется автоматически (последние 3 месяца)
        // Поэтому не включаем weekStartUtc/weekEndUtc в ключ
        
        // Генерация MD5 хеша от нормализованных параметров
        $keyString = json_encode($normalized, JSON_UNESCAPED_UNICODE);
        $hash = md5($keyString);
        
        // Добавляем префикс для читаемости
        return 'months_' . $hash;
    }
    
    /**
     * Проверка истечения срока действия кеша
     * 
     * @param string $key Ключ кеша
     * @return bool true если кеш истёк или не существует
     */
    public static function isExpired(string $key): bool
    {
        $cachePath = self::getCachePath($key);
        
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
     * @return bool true если директория существует или создана
     */
    private static function ensureCacheDirectory(): bool
    {
        $cacheDir = self::CACHE_MONTHS_DIR;
        
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

