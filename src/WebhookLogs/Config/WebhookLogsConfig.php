<?php
/**
 * Конфигурация модуля логирования вебхуков
 * 
 * Расположение: src/WebhookLogs/Config/WebhookLogsConfig.php
 * 
 * Централизованное хранение всех настроек модуля
 */
namespace WebhookLogs\Config;

class WebhookLogsConfig
{
    /**
     * Базовый путь к логам вебхуков
     * 
     * @var string|null
     */
    private static $baseLogsPath = null;
    
    /**
     * Получить базовый путь к логам
     * 
     * @return string Путь к папке logs/webhooks/
     */
    public static function getBaseLogsPath(): string
    {
        if (self::$baseLogsPath === null) {
            // Определяем путь относительно api/ директории
            self::$baseLogsPath = __DIR__ . '/../../../logs/webhooks/';
        }
        
        return self::$baseLogsPath;
    }
    
    /**
     * Получить путь к логам категории
     * 
     * @param string $category Категория (tasks, smart-processes, errors)
     * @return string Полный путь к папке категории
     */
    public static function getCategoryPath(string $category): string
    {
        return self::getBaseLogsPath() . $category . '/';
    }
    
    /**
     * Получить формат имени файла лога
     * 
     * @return string Формат (например, 'Y-m-d-H')
     */
    public static function getLogFileDateFormat(): string
    {
        return 'Y-m-d-H';
    }
    
    /**
     * Получить расширение файла лога
     * 
     * @return string Расширение (например, '.json')
     */
    public static function getLogFileExtension(): string
    {
        return '.json';
    }
    
    /**
     * Получить права доступа для директорий
     * 
     * @return int Права доступа (например, 0755)
     */
    public static function getDirectoryPermissions(): int
    {
        return 0755;
    }
    
    /**
     * Получить список поддерживаемых категорий
     * 
     * @return array Массив категорий
     */
    public static function getCategories(): array
    {
        return ['tasks', 'smart-processes', 'errors', 'user-activity'];
    }
    
    /**
     * Проверить, является ли категория валидной
     * 
     * @param string $category Категория для проверки
     * @return bool true если валидна
     */
    public static function isValidCategory(string $category): bool
    {
        return in_array($category, self::getCategories(), true);
    }
    
    /**
     * Получить лимит пагинации по умолчанию
     * 
     * @return int Количество записей на странице
     */
    public static function getDefaultPaginationLimit(): int
    {
        return 50;
    }
    
    /**
     * Получить минимальный лимит пагинации
     * 
     * @return int Минимальное количество записей
     */
    public static function getMinPaginationLimit(): int
    {
        return 1;
    }
    
    /**
     * Получить максимальный лимит пагинации
     * 
     * @return int Максимальное количество записей
     */
    public static function getMaxPaginationLimit(): int
    {
        return 1000;
    }
    
    /**
     * Валидировать лимит пагинации
     * 
     * @param int $limit Лимит для валидации
     * @return int Валидный лимит (скорректированный если нужно)
     */
    public static function validatePaginationLimit(int $limit): int
    {
        $min = self::getMinPaginationLimit();
        $max = self::getMaxPaginationLimit();
        
        if ($limit < $min) {
            return $min;
        }
        
        if ($limit > $max) {
            return $max;
        }
        
        return $limit;
    }
    
    /**
     * Получить интервал проверки новых логов (для SSE)
     * 
     * @return int Интервал в секундах
     */
    public static function getRealtimeCheckInterval(): int
    {
        return 2;
    }
    
    /**
     * Получить интервал keep-alive (для SSE)
     * 
     * @return int Интервал в секундах
     */
    public static function getRealtimeKeepAliveInterval(): int
    {
        return 30;
    }
    
    /**
     * Получить таймаут соединения SSE
     * 
     * @return int Таймаут в секундах
     */
    public static function getRealtimeTimeout(): int
    {
        return 300; // 5 минут
    }
    
    /**
     * Включено ли кеширование последних проверенных записей для SSE
     * 
     * @return bool true если включено
     */
    public static function isRealtimeCacheEnabled(): bool
    {
        return true;
    }
    
    /**
     * Получить TTL кеша последних проверенных записей (в секундах)
     * 
     * @return int TTL в секундах
     */
    public static function getRealtimeCacheTtl(): int
    {
        return 60; // 1 минута
    }
    
    /**
     * Получить максимальное количество записей в кеше
     * 
     * @return int Максимальное количество
     */
    public static function getRealtimeCacheMaxSize(): int
    {
        return 1000; // Максимум 1000 записей
    }
    
    /**
     * Получить максимальное количество одновременных SSE соединений
     * 
     * @return int Максимальное количество
     */
    public static function getRealtimeMaxConnections(): int
    {
        return 50; // Максимум 50 одновременных соединений
    }
    
    /**
     * Получить интервал очистки неактивных соединений (в секундах)
     * 
     * @return int Интервал в секундах
     */
    public static function getRealtimeCleanupInterval(): int
    {
        return 300; // 5 минут
    }
    
    /**
     * Получить максимальное количество новых логов за одну проверку
     * 
     * @return int Максимальное количество (0 = без ограничений)
     */
    public static function getRealtimeMaxLogsPerCheck(): int
    {
        return 100; // Максимум 100 новых логов за проверку
    }
    
    /**
     * Получить путь к файлу секрета вебхука
     * 
     * @return string Путь к файлу
     */
    public static function getSecretFilePath(): string
    {
        return __DIR__ . '/../../../webhook-secret.php';
    }
    
    /**
     * Получить имя переменной окружения для секрета
     * 
     * @return string Имя переменной
     */
    public static function getSecretEnvName(): string
    {
        return 'BITRIX24_WEBHOOK_SECRET';
    }
    
    /**
     * Получить путь к файлу settings.json (fallback)
     * 
     * @return string Путь к файлу
     */
    public static function getSettingsFilePath(): string
    {
        return __DIR__ . '/../../../settings.json';
    }
    
    /**
     * Получить JSON опции для кодирования
     * 
     * @return int Битовая маска опций JSON
     */
    public static function getJsonEncodeOptions(): int
    {
        return JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE;
    }
    
    /**
     * Получить JSON опции для декодирования
     * 
     * @return int Битовая маска опций JSON
     */
    public static function getJsonDecodeOptions(): int
    {
        return JSON_OBJECT_AS_ARRAY;
    }
    
    /**
     * Получить часовой пояс для дат
     * 
     * @return string Часовой пояс (например, 'Europe/Minsk')
     */
    public static function getTimezone(): string
    {
        return 'Europe/Minsk';
    }
    
    /**
     * Получить TTL кеша API запросов (в секундах)
     * 
     * @return int TTL в секундах
     */
    public static function getApiCacheTtl(): int
    {
        return 120; // 2 минуты
    }
    
    /**
     * Получить максимальный размер кеша API (количество записей)
     * 
     * @return int Максимальный размер
     */
    public static function getApiCacheMaxSize(): int
    {
        return 100;
    }
    
    /**
     * Включено ли кеширование API по умолчанию
     * 
     * @return bool true если включено
     */
    public static function isApiCacheEnabled(): bool
    {
        return true;
    }
    
    /**
     * Получить максимальное количество логов для чтения за один запрос
     * 
     * @return int Максимальное количество (0 = без ограничений)
     */
    public static function getMaxLogsPerRequest(): int
    {
        return 10000; // Защита от перегрузки памяти
    }
    
    /**
     * Получить порог для использования потокового чтения (количество записей)
     * 
     * @return int Порог
     */
    public static function getStreamingThreshold(): int
    {
        return 5000; // При более 5000 записей использовать потоковое чтение
    }
    
    /**
     * Получить TTL кеша для конкретного типа запроса
     * 
     * @param string $requestType Тип запроса (default, filtered, paginated)
     * @return int TTL в секундах
     */
    public static function getApiCacheTtlForRequestType(string $requestType = 'default'): int
    {
        $ttls = [
            'default' => 120,      // 2 минуты для обычных запросов
            'filtered' => 60,      // 1 минута для запросов с фильтрами
            'paginated' => 180,    // 3 минуты для запросов с пагинацией
            'stats' => 300         // 5 минут для статистики
        ];
        
        return $ttls[$requestType] ?? self::getApiCacheTtl();
    }
    
    /**
     * Получить максимальный размер одного кешируемого ответа (в байтах)
     * 
     * @return int Максимальный размер в байтах (0 = без ограничений)
     */
    public static function getApiCacheMaxResponseSize(): int
    {
        return 10 * 1024 * 1024; // 10 МБ
    }
    
    /**
     * Включено ли логирование кеша
     * 
     * @return bool true если включено
     */
    public static function isApiCacheLoggingEnabled(): bool
    {
        return false; // По умолчанию отключено
    }
    
    /**
     * Валидация всей конфигурации
     * 
     * @return array Массив ошибок (пустой если всё ОК)
     */
    public static function validate(): array
    {
        $errors = [];
        
        // Проверка базового пути
        $basePath = self::getBaseLogsPath();
        if (!is_dir($basePath)) {
            $errors[] = "Base logs path does not exist: {$basePath}";
        } elseif (!is_writable($basePath)) {
            $errors[] = "Base logs path is not writable: {$basePath}";
        }
        
        // Проверка категорий
        foreach (self::getCategories() as $category) {
            $categoryPath = self::getCategoryPath($category);
            if (!is_dir($categoryPath) && !mkdir($categoryPath, self::getDirectoryPermissions(), true)) {
                $errors[] = "Cannot create category directory: {$categoryPath}";
            }
        }
        
        // Проверка файла секрета (опционально)
        $secretFile = self::getSecretFilePath();
        if (!file_exists($secretFile)) {
            $errors[] = "Secret file does not exist: {$secretFile} (warning, not critical)";
        }
        
        // Проверка часового пояса
        try {
            new \DateTimeZone(self::getTimezone());
        } catch (\Exception $e) {
            $errors[] = "Invalid timezone: " . self::getTimezone();
        }
        
        return $errors;
    }
    
    /**
     * Инициализация конфигурации (создание необходимых директорий)
     * 
     * @return bool true если инициализация успешна
     * @throws \RuntimeException При ошибке инициализации
     */
    public static function initialize(): bool
    {
        $basePath = self::getBaseLogsPath();
        
        // Создание базовой директории
        if (!is_dir($basePath)) {
            if (!mkdir($basePath, self::getDirectoryPermissions(), true)) {
                throw new \RuntimeException("Cannot create base logs directory: {$basePath}");
            }
        }
        
        // Создание директорий для категорий
        foreach (self::getCategories() as $category) {
            $categoryPath = self::getCategoryPath($category);
            if (!is_dir($categoryPath)) {
                if (!mkdir($categoryPath, self::getDirectoryPermissions(), true)) {
                    throw new \RuntimeException("Cannot create category directory: {$categoryPath}");
                }
            }
        }
        
        return true;
    }
    
    /**
     * Получить полный путь к файлу лога
     * 
     * @param string $category Категория
     * @param string $date Дата в формате YYYY-MM-DD
     * @param int|null $hour Час (0-23) или null для всех часов
     * @return string|array Путь к файлу или массив путей
     */
    public static function getLogFilePath(string $category, string $date, ?int $hour = null): string|array
    {
        if (!self::isValidCategory($category)) {
            throw new \InvalidArgumentException("Invalid category: {$category}");
        }
        
        $categoryPath = self::getCategoryPath($category);
        $extension = self::getLogFileExtension();
        
        if ($hour !== null) {
            $hourStr = str_pad((string)$hour, 2, '0', STR_PAD_LEFT);
            return $categoryPath . $date . '-' . $hourStr . $extension;
        } else {
            // Возвращаем паттерн для поиска всех файлов за дату
            $pattern = $categoryPath . $date . '-*' . $extension;
            $files = glob($pattern);
            return $files ?: [];
        }
    }
    
    /**
     * Получить максимальный размер файла лога (в байтах)
     * 
     * @return int Максимальный размер в байтах (0 = без ограничений)
     */
    public static function getMaxLogFileSize(): int
    {
        return 10 * 1024 * 1024; // 10 МБ
    }
    
    /**
     * Получить максимальное количество записей в файле
     * 
     * @return int Максимальное количество (0 = без ограничений)
     */
    public static function getMaxLogEntriesPerFile(): int
    {
        return 10000;
    }
    
    /**
     * Получить объект DateTime с правильным часовым поясом
     * 
     * @param string|null $time Время (null = текущее)
     * @return \DateTime Объект DateTime
     */
    public static function getDateTime(?string $time = null): \DateTime
    {
        $timezone = new \DateTimeZone(self::getTimezone());
        
        if ($time === null) {
            return new \DateTime('now', $timezone);
        }
        
        return new \DateTime($time, $timezone);
    }
    
    /**
     * Форматировать дату для имени файла
     * 
     * @param \DateTime|null $date Дата (null = текущая)
     * @return string Отформатированная дата
     */
    public static function formatDateForFile(?\DateTime $date = null): string
    {
        if ($date === null) {
            $date = self::getDateTime();
        }
        
        return $date->format(self::getLogFileDateFormat());
    }
    
    /**
     * Проверить безопасность пути (защита от directory traversal)
     * 
     * @param string $path Путь для проверки
     * @return bool true если путь безопасен
     */
    public static function isPathSafe(string $path): bool
    {
        // Проверка на directory traversal
        if (strpos($path, '..') !== false) {
            return false;
        }
        
        // Проверка на абсолютные пути (должны быть относительными)
        if (strpos($path, '/') === 0 || preg_match('/^[A-Z]:\\\\/i', $path)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Санитизация имени категории
     * 
     * @param string $category Категория
     * @return string Санитизированная категория
     * @throws \InvalidArgumentException При невалидной категории
     */
    public static function sanitizeCategory(string $category): string
    {
        // Удаляем опасные символы
        $sanitized = preg_replace('/[^a-z0-9_-]/', '', strtolower($category));
        
        if (empty($sanitized)) {
            throw new \InvalidArgumentException("Invalid category name: {$category}");
        }
        
        if (!self::isValidCategory($sanitized)) {
            throw new \InvalidArgumentException("Category not supported: {$sanitized}");
        }
        
        return $sanitized;
    }
}


