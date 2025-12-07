# TASK-018-08-02: Оптимизация и расширение WebhookLogsApiService (кеширование, расширенные фильтры)

**Дата создания:** 2025-12-07 18:00 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js) + Рефактор-менеджер  
**Родительская задача:** [TASK-018](./TASK-018-refactor-webhook-logs-module.md)  
**Предыдущий этап:** [TASK-018-08-01](./TASK-018-08-01-refactor-logs-api-service.md)  
**Тип:** Рефакторинг / Оптимизация

---

## 📋 Описание

Расширить функциональность `WebhookLogsApiService` добавлением кеширования результатов запросов, поддержки расширенных фильтров (dateFrom, dateTo, ip, status), оптимизации работы с большими объёмами данных и улучшения производительности.

**Цель этапа:**
- Добавить кеширование результатов запросов API
- Реализовать поддержку расширенных фильтров (dateFrom, dateTo, ip, status)
- Оптимизировать чтение больших объёмов данных
- Добавить метрики производительности
- Улучшить обработку ошибок и логирование
- Сохранить обратную совместимость с Vue.js интерфейсом

---

## 🎯 Контекст

Это вторая часть восьмого этапа рефакторинга модуля логирования вебхуков (TASK-018). На основе созданного базового сервиса (TASK-018-08-01) добавляются оптимизации и расширенная функциональность для улучшения производительности и поддержки всех фильтров, используемых Vue.js интерфейсом.

**Текущее состояние:**
- Базовый сервис создан (TASK-018-08-01)
- Поддерживаются базовые фильтры (category, event, date, hour)
- Нет кеширования результатов
- Нет поддержки расширенных фильтров (dateFrom, dateTo, ip, status)
- Нет оптимизации для больших объёмов данных

**Целевое состояние:**
- Кеширование результатов запросов реализовано
- Все фильтры Vue.js интерфейса поддерживаются
- Оптимизация для больших объёмов данных добавлена
- Метрики производительности собираются
- Улучшенное логирование и обработка ошибок

**Связи:**
- Зависит от: TASK-018-08-01 (базовый сервис создан)
- Зависит от него: TASK-018-09 (рефакторинг SSE)
- **Vue.js:** Vue.js интерфейс использует расширенные фильтры:
  - `dateFrom` и `dateTo` для диапазона дат
  - `ip` для фильтрации по IP адресу
  - `status` для фильтрации по статусу
  - Все фильтры передаются через `WebhookLogsApiService.getLogs(filters)`

---

## 📁 Модули и компоненты

### Файлы для изменения:

1. **`src/WebhookLogs/Service/WebhookLogsApiService.php`**
   - Добавить кеширование
   - Добавить поддержку расширенных фильтров
   - Оптимизировать чтение данных
   - Добавить метрики

2. **`src/WebhookLogs/Config/WebhookLogsConfig.php`**
   - Добавить настройки кеширования
   - Добавить настройки производительности

### Файлы для создания:

1. **`src/WebhookLogs/Service/WebhookLogsApiCache.php`**
   - Класс для управления кешем API запросов
   - Методы: `get()`, `set()`, `invalidate()`, `clear()`

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Добавление настроек кеширования в Config

**1.1. Проанализировать требования к кешированию:**

**Требования:**
- TTL кеша должен быть настраиваемым (по умолчанию 2 минуты)
- Максимальный размер кеша должен ограничивать использование памяти
- Кеширование должно быть отключаемым для отладки
- Разные TTL для разных типов запросов (опционально)

**1.2. Обновить `src/WebhookLogs/Config/WebhookLogsConfig.php`:**

```php
// Добавить в класс WebhookLogsConfig

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
    return defined('WP_DEBUG') && WP_DEBUG;
}
```

**Результат шага 1:**
- Настройки кеширования добавлены в Config
- Настройки производительности добавлены
- Поддержка разных TTL для разных типов запросов
- Настройки логирования кеша добавлены

---

### Шаг 2: Создание класса для управления кешем API

**2.1. Создать файл `src/WebhookLogs/Service/WebhookLogsApiCache.php`:**

```php
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
     * Получить информацию о записи в кеше
     * 
     * @param string $key Ключ кеша
     * @return array|null Информация о записи или null
     */
    public static function getCacheEntryInfo(string $key): ?array
    {
        if (!isset(self::$cache[$key])) {
            return null;
        }
        
        $timestamp = self::$cacheTimestamps[$key] ?? 0;
        $ttl = WebhookLogsConfig::getApiCacheTtl();
        $age = time() - $timestamp;
        $remaining = max(0, $ttl - $age);
        
        return [
            'key' => $key,
            'age' => $age,
            'remaining' => $remaining,
            'expires_at' => $timestamp + $ttl,
            'size' => strlen(json_encode(self::$cache[$key]))
        ];
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
```

**Результат шага 2:**
- Класс для управления кешем создан
- Методы кеширования реализованы
- Генерация ключей кеша добавлена

---

### Шаг 3: Добавление кеширования в WebhookLogsApiService

**3.1. Обновить `src/WebhookLogs/Service/WebhookLogsApiService.php`:**

```php
// Добавить в начало класса WebhookLogsApiService

use WebhookLogs\Service\WebhookLogsApiCache;

// Добавить свойство для метрик
protected array $metrics = [];

// Модифицировать метод getLogs() для добавления кеширования

/**
 * Получить логи с фильтрацией, сортировкой и пагинацией
 * 
 * @param array $filters Фильтры
 * @param int $page Номер страницы
 * @param int $limit Количество записей на странице
 * @param bool $useCache Использовать кеш (по умолчанию true)
 * @return array Структурированный ответ
 */
public function getLogs(array $filters = [], int $page = 1, int $limit = 50, bool $useCache = true): array
{
    $startTime = microtime(true);
    
    // Генерация ключа кеша
    $cacheKey = WebhookLogsApiCache::generateCacheKey($filters, $page, $limit);
    
    // Попытка получить из кеша
    if ($useCache) {
        $cached = WebhookLogsApiCache::get($cacheKey);
        if ($cached !== null) {
            $this->metrics['cache_hit'] = true;
            $this->metrics['execution_time'] = microtime(true) - $startTime;
            $this->metrics['cache_key'] = $cacheKey;
            
            // Логирование попадания в кеш
            if (WebhookLogsConfig::isApiCacheLoggingEnabled()) {
                error_log(sprintf(
                    '[WebhookLogsApiService] Cache hit: %s (time: %.2fms)',
                    substr($cacheKey, 0, 20) . '...',
                    $this->metrics['execution_time'] * 1000
                ));
            }
            
            return $cached;
        }
        
        // Логирование промаха кеша
        if (WebhookLogsConfig::isApiCacheLoggingEnabled()) {
            error_log(sprintf(
                '[WebhookLogsApiService] Cache miss: %s',
                substr($cacheKey, 0, 20) . '...'
            ));
        }
    }
    
    $this->metrics['cache_hit'] = false;
    $this->metrics['cache_key'] = $cacheKey;
    
    // Валидация параметров
    $this->validateFilters($filters);
    $this->validatePagination($page, $limit);
    
    // Нормализация параметров
    $category = $filters['category'] ?? null;
    $event = $filters['event'] ?? null;
    $date = $filters['date'] ?? date('Y-m-d');
    $hour = isset($filters['hour']) && $filters['hour'] !== '' ? (int)$filters['hour'] : null;
    
    // Чтение логов через Repository
    $allLogs = $this->readLogs($category, $date, $hour);
    
    // Применение расширенных фильтров
    $allLogs = $this->applyExtendedFilters($allLogs, $filters);
    
    // Фильтрация по типу события
    if ($event !== null) {
        $allLogs = $this->filterByEvent($allLogs, $event);
    }
    
    // Сортировка
    $allLogs = $this->sortLogs($allLogs);
    
    // Пагинация
    $total = count($allLogs);
    $paginatedLogs = $this->paginateLogs($allLogs, $page, $limit);
    
    // Преобразование сущностей в массивы
    $logsArray = array_map(function($entry) {
        if ($entry instanceof WebhookLogEntry) {
            return $entry->toArray();
        }
        return $entry;
    }, $paginatedLogs);
    
    // Формирование ответа
    $result = [
        'success' => true,
        'logs' => $logsArray,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => (int)ceil($total / $limit)
        ]
    ];
    
    // Сохранение в кеш
    if ($useCache) {
        // Проверка размера ответа перед кешированием
        $responseSize = strlen(json_encode($result));
        $maxSize = WebhookLogsConfig::getApiCacheMaxResponseSize();
        
        if ($maxSize > 0 && $responseSize > $maxSize) {
            // Ответ слишком большой для кеширования
            if (WebhookLogsConfig::isApiCacheLoggingEnabled()) {
                error_log(sprintf(
                    '[WebhookLogsApiService] Response too large for cache: %d bytes (max: %d)',
                    $responseSize,
                    $maxSize
                ));
            }
        } else {
            WebhookLogsApiCache::set($cacheKey, $result);
            
            if (WebhookLogsConfig::isApiCacheLoggingEnabled()) {
                error_log(sprintf(
                    '[WebhookLogsApiService] Cached response: %s (size: %d bytes)',
                    substr($cacheKey, 0, 20) . '...',
                    $responseSize
                ));
            }
        }
    }
    
    $this->metrics['execution_time'] = microtime(true) - $startTime;
    $this->metrics['logs_count'] = count($logsArray);
    $this->metrics['total_logs'] = $total;
    $this->metrics['response_size'] = $responseSize ?? strlen(json_encode($result));
    
    return $result;
}

/**
 * Применить расширенные фильтры
 * 
 * @param array $logs Массив WebhookLogEntry
 * @param array $filters Фильтры
 * @return array Отфильтрованный массив
 */
protected function applyExtendedFilters(array $logs, array $filters): array
{
    // Фильтр по диапазону дат (dateFrom, dateTo)
    if (isset($filters['dateFrom']) || isset($filters['dateTo'])) {
        $logs = $this->filterByDateRange($logs, $filters['dateFrom'] ?? null, $filters['dateTo'] ?? null);
    }
    
    // Фильтр по IP адресу
    if (isset($filters['ip']) && $filters['ip'] !== null && $filters['ip'] !== '') {
        $logs = $this->filterByIp($logs, $filters['ip']);
    }
    
    // Фильтр по статусу (если есть в details)
    if (isset($filters['status']) && $filters['status'] !== null && $filters['status'] !== '') {
        $logs = $this->filterByStatus($logs, $filters['status']);
    }
    
    return $logs;
}

/**
 * Фильтрация по диапазону дат
 * 
 * @param array $logs Массив WebhookLogEntry
 * @param string|null $dateFrom Начальная дата (YYYY-MM-DD)
 * @param string|null $dateTo Конечная дата (YYYY-MM-DD)
 * @return array Отфильтрованный массив
 */
protected function filterByDateRange(array $logs, ?string $dateFrom, ?string $dateTo): array
{
    $fromTimestamp = $dateFrom ? strtotime($dateFrom . ' 00:00:00') : null;
    $toTimestamp = $dateTo ? strtotime($dateTo . ' 23:59:59') : null;
    
    return array_filter($logs, function($log) use ($fromTimestamp, $toTimestamp) {
        $logTimestamp = $this->getLogTimestamp($log);
        
        if ($fromTimestamp !== null && $logTimestamp < $fromTimestamp) {
            return false;
        }
        
        if ($toTimestamp !== null && $logTimestamp > $toTimestamp) {
            return false;
        }
        
        return true;
    });
}

/**
 * Фильтрация по IP адресу
 * 
 * @param array $logs Массив WebhookLogEntry
 * @param string $ip IP адрес для фильтрации
 * @return array Отфильтрованный массив
 */
protected function filterByIp(array $logs, string $ip): array
{
    return array_filter($logs, function($log) use ($ip) {
        if ($log instanceof WebhookLogEntry) {
            $logIp = $log->getIp();
            return $logIp !== null && $logIp === $ip;
        }
        
        // Для обратной совместимости с массивами
        return isset($log['ip']) && $log['ip'] === $ip;
    });
}

/**
 * Фильтрация по статусу
 * 
 * @param array $logs Массив WebhookLogEntry
 * @param string $status Статус для фильтрации
 * @return array Отфильтрованный массив
 */
protected function filterByStatus(array $logs, string $status): array
{
    return array_filter($logs, function($log) use ($status) {
        if ($log instanceof WebhookLogEntry) {
            $details = $log->getDetails();
            if ($details && isset($details['status_id'])) {
                return (string)$details['status_id'] === (string)$status;
            }
        }
        
        // Для обратной совместимости с массивами
        if (isset($log['details']['status_id'])) {
            return (string)$log['details']['status_id'] === (string)$status;
        }
        
        return false;
    });
}

/**
 * Получить метрики последнего запроса
 * 
 * @return array Метрики
 */
public function getMetrics(): array
{
    return $this->metrics;
}

/**
 * Очистить метрики
 */
public function clearMetrics(): void
{
    $this->metrics = [];
}
```

**3.2. Обновить валидацию фильтров:**

```php
// Обновить метод validateFilters()

protected function validateFilters(array $filters): void
{
    // ... существующая валидация ...
    
    // Валидация dateFrom
    if (isset($filters['dateFrom']) && $filters['dateFrom'] !== null) {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $filters['dateFrom'])) {
            throw new WebhookValidationException(
                "Invalid dateFrom format: {$filters['dateFrom']}",
                'date',
                ['date' => $filters['dateFrom'], 'expected_format' => 'YYYY-MM-DD']
            );
        }
    }
    
    // Валидация dateTo
    if (isset($filters['dateTo']) && $filters['dateTo'] !== null) {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $filters['dateTo'])) {
            throw new WebhookValidationException(
                "Invalid dateTo format: {$filters['dateTo']}",
                'date',
                ['date' => $filters['dateTo'], 'expected_format' => 'YYYY-MM-DD']
            );
        }
    }
    
    // Валидация диапазона дат
    if (isset($filters['dateFrom']) && isset($filters['dateTo'])) {
        $fromTimestamp = strtotime($filters['dateFrom']);
        $toTimestamp = strtotime($filters['dateTo']);
        
        if ($fromTimestamp === false || $toTimestamp === false) {
            throw new WebhookValidationException(
                "Invalid date range",
                'date',
                ['dateFrom' => $filters['dateFrom'], 'dateTo' => $filters['dateTo']]
            );
        }
        
        if ($fromTimestamp > $toTimestamp) {
            throw new WebhookValidationException(
                "dateFrom must be less than or equal to dateTo",
                'date',
                ['dateFrom' => $filters['dateFrom'], 'dateTo' => $filters['dateTo']]
            );
        }
    }
    
    // Валидация IP адреса
    if (isset($filters['ip']) && $filters['ip'] !== null && $filters['ip'] !== '') {
        if (!filter_var($filters['ip'], FILTER_VALIDATE_IP)) {
            throw new WebhookValidationException(
                "Invalid IP address: {$filters['ip']}",
                'ip',
                ['ip' => $filters['ip']]
            );
        }
    }
}
```

**Результат шага 3:**
- Кеширование добавлено в сервис
- Расширенные фильтры реализованы
- Метрики производительности добавлены

---

### Шаг 4: Оптимизация чтения больших объёмов данных

**4.1. Добавить проверку использования памяти:**

```php
// Добавить в начало метода getLogs()

// Проверка доступной памяти
$memoryLimit = ini_get('memory_limit');
$memoryUsage = memory_get_usage(true);
$availableMemory = $this->parseMemoryLimit($memoryLimit) - $memoryUsage;

// Предупреждение, если памяти мало
if ($availableMemory < 10 * 1024 * 1024) { // Меньше 10 МБ
    error_log(sprintf(
        '[WebhookLogsApiService] Low memory warning: %d bytes available',
        $availableMemory
    ));
}
```

**4.2. Добавить метод для парсинга лимита памяти:**

```php
// Добавить в класс WebhookLogsApiService

/**
 * Парсинг лимита памяти из ini_get('memory_limit')
 * 
 * @param string $memoryLimit Строка лимита (например, "128M")
 * @return int Лимит в байтах
 */
protected function parseMemoryLimit(string $memoryLimit): int
{
    $memoryLimit = trim($memoryLimit);
    $last = strtolower($memoryLimit[strlen($memoryLimit) - 1]);
    $value = (int)$memoryLimit;
    
    switch ($last) {
        case 'g':
            $value *= 1024;
        case 'm':
            $value *= 1024;
        case 'k':
            $value *= 1024;
    }
    
    return $value;
}
```

**4.3. Добавить оптимизацию в метод `readLogs()`:**

```php
// Обновить метод readLogs() в WebhookLogsApiService

protected function readLogs(?string $category, string $date, ?int $hour = null): array
{
    $allLogs = [];
    $maxLogs = WebhookLogsConfig::getMaxLogsPerRequest();
    $streamingThreshold = WebhookLogsConfig::getStreamingThreshold();
    
    if ($category !== null) {
        // Чтение конкретной категории
        if (!WebhookLogsConfig::isValidCategory($category)) {
            throw new WebhookValidationException(
                "Invalid category: {$category}",
                'category',
                ['category' => $category, 'valid_categories' => WebhookLogsConfig::getCategories()]
            );
        }
        
        // Проверка необходимости потокового чтения
        $entries = $this->repository->read($category, $date, $hour);
        
        // Ограничение количества записей
        if ($maxLogs > 0 && count($entries) > $maxLogs) {
            $entries = array_slice($entries, 0, $maxLogs);
            error_log("WebhookLogsApiService: Limited logs to {$maxLogs} entries");
        }
        
        // Преобразование массивов в WebhookLogEntry
        foreach ($entries as $entryData) {
            try {
                $entry = WebhookLogEntry::fromArray($entryData);
                $allLogs[] = $entry;
            } catch (\Exception $e) {
                error_log("Failed to create WebhookLogEntry: " . $e->getMessage());
            }
        }
    } else {
        // Чтение всех категорий с оптимизацией
        $categories = WebhookLogsConfig::getCategories();
        $logsPerCategory = [];
        
        foreach ($categories as $cat) {
            try {
                $entries = $this->repository->read($cat, $date, $hour);
                
                // Ограничение на категорию
                $categoryLimit = $maxLogs > 0 ? (int)($maxLogs / count($categories)) : 0;
                if ($categoryLimit > 0 && count($entries) > $categoryLimit) {
                    $entries = array_slice($entries, 0, $categoryLimit);
                }
                
                $logsPerCategory[$cat] = $entries;
            } catch (WebhookLoggingException $e) {
                error_log("Failed to read category {$cat}: " . $e->getMessage());
                $logsPerCategory[$cat] = [];
            }
        }
        
        // Преобразование и объединение
        foreach ($logsPerCategory as $cat => $entries) {
            foreach ($entries as $entryData) {
                try {
                    if (!isset($entryData['category'])) {
                        $entryData['category'] = $cat;
                    }
                    
                    $entry = WebhookLogEntry::fromArray($entryData);
                    $allLogs[] = $entry;
                    
                    // Проверка общего лимита
                    if ($maxLogs > 0 && count($allLogs) >= $maxLogs) {
                        break 2; // Выход из обоих циклов
                    }
                } catch (\Exception $e) {
                    error_log("Failed to create WebhookLogEntry: " . $e->getMessage());
                }
            }
        }
    }
    
    return $allLogs;
}
```

**4.4. Добавить мониторинг использования памяти:**

```php
// Добавить в метод readLogs() после чтения данных

// Мониторинг использования памяти
$memoryAfter = memory_get_usage(true);
$memoryUsed = ($memoryAfter - $memoryBefore) / 1024 / 1024; // В МБ

if ($memoryUsed > 50) { // Больше 50 МБ
    error_log(sprintf(
        '[WebhookLogsApiService] High memory usage: %.2f MB for %d logs',
        $memoryUsed,
        count($allLogs)
    ));
}

$this->metrics['memory_used_mb'] = round($memoryUsed, 2);
$this->metrics['logs_read'] = count($allLogs);
```

**Результат шага 4:**
- Оптимизация для больших объёмов данных добавлена
- Ограничение количества записей реализовано
- Защита от перегрузки памяти добавлена
- Мониторинг использования памяти реализован

---

### Шаг 5: Обновление webhook-logs.php для поддержки расширенных фильтров

**5.1. Обновить `api/webhook-logs.php`:**

```php
// Обновить секцию получения параметров

// Получение параметров из запроса
$filters = [
    'category' => !empty($_GET['category']) ? $_GET['category'] : null,
    'event' => !empty($_GET['event']) ? $_GET['event'] : null,
    'date' => !empty($_GET['date']) ? $_GET['date'] : date('Y-m-d'),
    'hour' => isset($_GET['hour']) && $_GET['hour'] !== '' ? $_GET['hour'] : null,
    // Расширенные фильтры
    'dateFrom' => !empty($_GET['dateFrom']) ? $_GET['dateFrom'] : null,
    'dateTo' => !empty($_GET['dateTo']) ? $_GET['dateTo'] : null,
    'ip' => !empty($_GET['ip']) ? $_GET['ip'] : null,
    'status' => !empty($_GET['status']) ? $_GET['status'] : null
];

$page = (int)($_GET['page'] ?? 1);
$limit = (int)($_GET['limit'] ?? 50);

// Опционально: параметр для отключения кеша
$useCache = !isset($_GET['no_cache']) || $_GET['no_cache'] !== '1';

// Создание сервиса
$apiService = new WebhookLogsApiService();

// Получение логов
$result = $apiService->getLogs($filters, $page, $limit, $useCache);
```

**Результат шага 5:**
- Поддержка расширенных фильтров добавлена в endpoint
- Опция отключения кеша добавлена

---

### Шаг 6: Детали работы кеша и стратегии инвалидации

**6.1. Создать стратегии инвалидации кеша:**

**Добавить в `WebhookLogsApiCache.php`:**

```php
/**
 * Инвалидировать кеш по паттерну фильтров
 * 
 * Полезно для инвалидации всех запросов с определёнными фильтрами
 * 
 * @param array $filterPattern Паттерн фильтров (null = любое значение)
 * @return int Количество удалённых записей
 */
public static function invalidateByFilterPattern(array $filterPattern): int
{
    $removed = 0;
    
    foreach (self::$cache as $key => $value) {
        // Извлекаем фильтры из ключа (если возможно)
        // В реальности нужно хранить метаданные о фильтрах
        $shouldRemove = false;
        
        // Простая проверка: если ключ содержит хеш фильтров
        // В реальности лучше хранить метаданные отдельно
        if ($shouldRemove) {
            unset(self::$cache[$key]);
            unset(self::$cacheTimestamps[$key]);
            $removed++;
        }
    }
    
    return $removed;
}

/**
 * Инвалидировать кеш для конкретной категории
 * 
 * @param string $category Категория
 * @return int Количество удалённых записей
 */
public static function invalidateByCategory(string $category): int
{
    // Инвалидируем все записи, которые могут содержать эту категорию
    // В реальности нужно хранить метаданные о фильтрах
    return self::invalidate('*category*' . $category . '*');
}

/**
 * Инвалидировать кеш для конкретной даты
 * 
 * @param string $date Дата в формате YYYY-MM-DD
 * @return int Количество удалённых записей
 */
public static function invalidateByDate(string $date): int
{
    // Инвалидируем все записи за эту дату
    return self::invalidate('*date*' . $date . '*');
}
```

**6.2. Добавить автоматическую очистку устаревших записей:**

```php
// Добавить в метод get() класса WebhookLogsApiCache

// Автоматическая очистка устаревших записей (каждый 100-й запрос)
static $requestCount = 0;
$requestCount++;

if ($requestCount % 100 === 0) {
    self::cleanupExpired();
}
```

**Результат шага 6:**
- Стратегии инвалидации кеша реализованы
- Автоматическая очистка устаревших записей добавлена

---

### Шаг 7: Тестирование оптимизаций и расширенных фильтров

**7.1. Создать тестовый скрипт:**

**Файл:** `tests/test-webhook-logs-api-optimization.php`

```php
<?php
/**
 * Тестирование оптимизаций WebhookLogsApiService
 * 
 * Использование: php tests/test-webhook-logs-api-optimization.php
 */

require_once __DIR__ . '/../src/WebhookLogs/bootstrap.php';

use WebhookLogs\Service\WebhookLogsApiService;
use WebhookLogs\Service\WebhookLogsApiCache;

echo "=== Тестирование оптимизаций WebhookLogsApiService ===\n\n";

try {
    $apiService = new WebhookLogsApiService();
    
    // Тест 1: Кеширование
    echo "Тест 1: Кеширование...\n";
    $start1 = microtime(true);
    $result1 = $apiService->getLogs([], 1, 10);
    $time1 = microtime(true) - $start1;
    echo "  - Первый запрос: " . round($time1 * 1000, 2) . "ms\n";
    
    $start2 = microtime(true);
    $result2 = $apiService->getLogs([], 1, 10);
    $time2 = microtime(true) - $start2;
    echo "  - Второй запрос (из кеша): " . round($time2 * 1000, 2) . "ms\n";
    
    if ($time2 < $time1) {
        echo "✅ Кеширование работает (ускорение: " . round(($time1 / $time2), 2) . "x)\n\n";
    } else {
        echo "⚠️  Кеширование может не работать\n\n";
    }
    
    // Тест 2: Расширенные фильтры (dateFrom, dateTo)
    echo "Тест 2: Фильтрация по диапазону дат...\n";
    $result = $apiService->getLogs([
        'dateFrom' => '2025-12-01',
        'dateTo' => '2025-12-07'
    ], 1, 10);
    echo "✅ Успешно\n";
    echo "  - Логов: " . count($result['logs']) . "\n\n";
    
    // Тест 3: Фильтрация по IP
    echo "Тест 3: Фильтрация по IP...\n";
    $result = $apiService->getLogs([
        'ip' => '192.168.1.1'
    ], 1, 10);
    echo "✅ Успешно\n";
    echo "  - Логов: " . count($result['logs']) . "\n\n";
    
    // Тест 4: Метрики
    echo "Тест 4: Метрики производительности...\n";
    $metrics = $apiService->getMetrics();
    echo "✅ Метрики получены:\n";
    echo "  - Время выполнения: " . round($metrics['execution_time'] * 1000, 2) . "ms\n";
    echo "  - Количество логов: " . ($metrics['logs_count'] ?? 0) . "\n";
    echo "  - Всего логов: " . ($metrics['total_logs'] ?? 0) . "\n";
    echo "  - Попадание в кеш: " . ($metrics['cache_hit'] ? 'да' : 'нет') . "\n\n";
    
    // Тест 5: Статистика кеша
    echo "Тест 5: Статистика кеша...\n";
    $cacheStats = WebhookLogsApiCache::getStats();
    echo "✅ Статистика:\n";
    echo "  - Размер кеша: " . $cacheStats['size'] . "\n";
    echo "  - Максимальный размер: " . $cacheStats['max_size'] . "\n";
    echo "  - TTL: " . $cacheStats['ttl'] . " сек\n";
    echo "  - Включен: " . ($cacheStats['enabled'] ? 'да' : 'нет') . "\n\n";
    
    echo "=== Тестирование завершено ===\n";
    
} catch (\Exception $e) {
    echo "❌ Критическая ошибка: " . $e->getMessage() . "\n";
    echo "Файл: " . $e->getFile() . "\n";
    echo "Строка: " . $e->getLine() . "\n";
    exit(1);
}
```

**7.2. Расширить тестовый скрипт дополнительными тестами:**

```php
// Добавить в test-webhook-logs-api-optimization.php

// Тест 6: Инвалидация кеша
echo "Тест 6: Инвалидация кеша...\n";
$result1 = $apiService->getLogs([], 1, 10);
$cacheKey = WebhookLogsApiCache::generateCacheKey([], 1, 10);
$invalidated = WebhookLogsApiCache::invalidate($cacheKey);
echo "✅ Инвалидировано записей: {$invalidated}\n";

// Проверка, что кеш очищен
$cached = WebhookLogsApiCache::get($cacheKey);
if ($cached === null) {
    echo "✅ Кеш успешно инвалидирован\n\n";
} else {
    echo "❌ Кеш не был инвалидирован\n\n";
}

// Тест 7: Очистка устаревших записей
echo "Тест 7: Очистка устаревших записей...\n";
$cleaned = WebhookLogsApiCache::cleanupExpired();
echo "✅ Очищено устаревших записей: {$cleaned}\n\n";

// Тест 8: Информация о записи в кеше
echo "Тест 8: Информация о записи в кеше...\n";
$result = $apiService->getLogs([], 1, 10);
$cacheKey = WebhookLogsApiCache::generateCacheKey([], 1, 10);
$info = WebhookLogsApiCache::getCacheEntryInfo($cacheKey);
if ($info) {
    echo "✅ Информация о записи:\n";
    echo "  - Возраст: {$info['age']} сек\n";
    echo "  - Осталось: {$info['remaining']} сек\n";
    echo "  - Размер: {$info['size']} байт\n\n";
} else {
    echo "⚠️  Запись не найдена в кеше\n\n";
}

// Тест 9: Производительность с большим количеством данных
echo "Тест 9: Производительность с большим лимитом...\n";
$start = microtime(true);
$result = $apiService->getLogs([], 1, 1000);
$time = microtime(true) - $start;
echo "✅ Запрос выполнен за " . round($time * 1000, 2) . "ms\n";
echo "  - Логов: " . count($result['logs']) . "\n";
echo "  - Всего: " . $result['pagination']['total'] . "\n";
$metrics = $apiService->getMetrics();
if (isset($metrics['memory_used_mb'])) {
    echo "  - Память: " . $metrics['memory_used_mb'] . " МБ\n";
}
echo "\n";
```

**7.3. Протестировать через HTTP:**

```bash
# Тест с расширенными фильтрами
curl "http://localhost/api/webhook-logs.php?dateFrom=2025-12-01&dateTo=2025-12-07&page=1&limit=10"
curl "http://localhost/api/webhook-logs.php?ip=192.168.1.1&page=1&limit=10"
curl "http://localhost/api/webhook-logs.php?status=2&page=1&limit=10"

# Тест с отключением кеша
curl "http://localhost/api/webhook-logs.php?no_cache=1&page=1&limit=10"
```

**Результат шага 6:**
- Тесты созданы и проходят
- Все расширенные фильтры работают
- Кеширование работает корректно

---

### Шаг 8: Проверка совместимости с Vue.js

**8.1. Детальная проверка работы всех фильтров в Vue.js:**

1. Открыть `/admin/webhook-logs` в браузере
2. Проверить фильтр по диапазону дат (dateFrom, dateTo)
3. Проверить фильтр по IP адресу
4. Проверить фильтр по статусу
5. Проверить комбинацию фильтров
6. Проверить работу кеширования (второй запрос должен быть быстрее)
7. Проверить отключение кеша через параметр `no_cache=1`

**8.2. Детальная проверка производительности:**

**8.2.1. Тест кеширования в браузере:**

1. Открыть DevTools → Network
2. Выполнить первый запрос к `/api/webhook-logs.php`
3. Зафиксировать время выполнения (Time)
4. Выполнить второй запрос с теми же параметрами
5. Проверить, что второй запрос быстрее (из кеша)
6. Проверить в консоли браузера логи о кеше

**8.2.2. Тест с отключением кеша:**

```javascript
// В WebhookLogsPage.vue
const result = await WebhookLogsApiService.getLogs(
  filters,
  page,
  limit,
  true // forceRefresh = true (игнорировать кеш)
);
```

**8.2.3. Проверка метрик производительности:**

```javascript
// После выполнения запроса проверить метрики
console.log('API Metrics:', {
  executionTime: metrics.execution_time,
  cacheHit: metrics.cache_hit,
  logsCount: metrics.logs_count,
  memoryUsed: metrics.memory_used_mb
});
```

**8.2.4. Тест с большими объёмами данных:**

1. Создать тестовые данные (10000+ записей)
2. Выполнить запрос с limit=1000
3. Проверить, что запрос выполняется за разумное время (< 5 сек)
4. Проверить использование памяти (не должно превышать лимит)
5. Проверить, что ответ ограничен максимальным количеством записей

**8.3. Проверить работу расширенных фильтров:**

**8.3.1. Фильтр по диапазону дат:**

```javascript
// В WebhookLogsPage.vue
filters.value = {
  dateFrom: '2025-12-01',
  dateTo: '2025-12-07'
};
await loadLogs();

// Проверить в консоли браузера
console.log('Filtered logs:', logs.value);
// Все логи должны быть в диапазоне дат
logs.value.forEach(log => {
  const logDate = new Date(log.timestamp).toISOString().split('T')[0];
  console.assert(
    logDate >= '2025-12-01' && logDate <= '2025-12-07',
    'Log date out of range:', logDate
  );
});
```

**8.3.2. Фильтр по IP адресу:**

```javascript
filters.value = {
  ip: '192.168.1.1'
};
await loadLogs();

// Проверить, что все логи имеют указанный IP
logs.value.forEach(log => {
  console.assert(
    log.ip === '192.168.1.1',
    'Log IP mismatch:', log.ip
  );
});
```

**8.3.3. Фильтр по статусу:**

```javascript
filters.value = {
  status: '2' // ID статуса
};
await loadLogs();

// Проверить, что все логи имеют указанный статус
logs.value.forEach(log => {
  console.assert(
    log.details?.status_id === '2',
    'Log status mismatch:', log.details?.status_id
  );
});
```

**8.3.4. Комбинация всех фильтров:**

```javascript
filters.value = {
  category: 'tasks',
  event: 'ONTASKADD',
  dateFrom: '2025-12-01',
  dateTo: '2025-12-07',
  ip: '192.168.1.1',
  status: '2',
  hour: 15
};
await loadLogs();

// Проверить, что все условия выполнены
logs.value.forEach(log => {
  console.assert(log.category === 'tasks', 'Category mismatch');
  console.assert(log.event === 'ONTASKADD', 'Event mismatch');
  console.assert(log.ip === '192.168.1.1', 'IP mismatch');
  // ... проверка остальных условий
});
```

**8.4. Создать скрипт для тестирования производительности:**

**Файл:** `tests/performance-test-webhook-logs-api.php`

```php
<?php
/**
 * Тестирование производительности WebhookLogsApiService
 * 
 * Использование: php tests/performance-test-webhook-logs-api.php
 */

require_once __DIR__ . '/../src/WebhookLogs/bootstrap.php';

use WebhookLogs\Service\WebhookLogsApiService;
use WebhookLogs\Service\WebhookLogsApiCache;

echo "=== Тестирование производительности WebhookLogsApiService ===\n\n";

$apiService = new WebhookLogsApiService();

// Тест 1: Производительность без кеша
echo "Тест 1: Производительность без кеша (10 запросов)...\n";
WebhookLogsApiCache::clear();
$times = [];
for ($i = 0; $i < 10; $i++) {
    $start = microtime(true);
    $apiService->getLogs([], 1, 50, false); // Без кеша
    $times[] = microtime(true) - $start;
}
$avgTime = array_sum($times) / count($times);
echo "  Среднее время: " . round($avgTime * 1000, 2) . "ms\n";
echo "  Минимальное: " . round(min($times) * 1000, 2) . "ms\n";
echo "  Максимальное: " . round(max($times) * 1000, 2) . "ms\n\n";

// Тест 2: Производительность с кешем
echo "Тест 2: Производительность с кешем (10 запросов)...\n";
WebhookLogsApiCache::clear();
$times = [];
for ($i = 0; $i < 10; $i++) {
    $start = microtime(true);
    $apiService->getLogs([], 1, 50, true); // С кешем
    $times[] = microtime(true) - $start;
}
$avgTime = array_sum($times) / count($times);
echo "  Среднее время: " . round($avgTime * 1000, 2) . "ms\n";
echo "  Минимальное: " . round(min($times) * 1000, 2) . "ms\n";
echo "  Максимальное: " . round(max($times) * 1000, 2) . "ms\n";
echo "  Ускорение: " . round(($times[0] / $avgTime), 2) . "x\n\n";

// Тест 3: Производительность с фильтрами
echo "Тест 3: Производительность с фильтрами...\n";
$filters = [
    'category' => 'tasks',
    'event' => 'ONTASKADD',
    'date' => date('Y-m-d')
];
$start = microtime(true);
$result = $apiService->getLogs($filters, 1, 50);
$time = microtime(true) - $start;
echo "  Время выполнения: " . round($time * 1000, 2) . "ms\n";
echo "  Логов найдено: " . count($result['logs']) . "\n";
$metrics = $apiService->getMetrics();
if (isset($metrics['memory_used_mb'])) {
    echo "  Память использована: " . $metrics['memory_used_mb'] . " МБ\n";
}
echo "\n";

// Тест 4: Производительность с расширенными фильтрами
echo "Тест 4: Производительность с расширенными фильтрами...\n";
$filters = [
    'dateFrom' => '2025-12-01',
    'dateTo' => '2025-12-07',
    'ip' => '192.168.1.1'
];
$start = microtime(true);
$result = $apiService->getLogs($filters, 1, 50);
$time = microtime(true) - $start;
echo "  Время выполнения: " . round($time * 1000, 2) . "ms\n";
echo "  Логов найдено: " . count($result['logs']) . "\n\n";

echo "=== Тестирование завершено ===\n";
```

**Результат шага 8:**
- Все фильтры Vue.js работают корректно
- Производительность улучшена
- Кеширование работает
- Детальные тесты производительности созданы
- Проверка расширенных фильтров реализована

---

## 📊 Критерии приёмки

- [ ] Класс `WebhookLogsApiCache` создан и реализован
- [ ] Кеширование результатов запросов реализовано
- [ ] Поддержка расширенных фильтров (dateFrom, dateTo, ip, status) добавлена
- [ ] Методы `applyExtendedFilters()`, `filterByDateRange()`, `filterByIp()`, `filterByStatus()` реализованы
- [ ] Оптимизация для больших объёмов данных добавлена
- [ ] Ограничение количества записей реализовано
- [ ] Метрики производительности собираются
- [ ] Настройки кеширования добавлены в Config
- [ ] Валидация расширенных фильтров реализована
- [ ] `webhook-logs.php` обновлён для поддержки расширенных фильтров
- [ ] Тесты созданы и проходят успешно
- [ ] Код соответствует стандартам PSR-12
- [ ] PHPDoc комментарии добавлены для всех методов
- [ ] **Все расширенные фильтры работают в Vue.js интерфейсе**
- [ ] **Кеширование улучшает производительность**
- [ ] **Vue.js компоненты корректно работают со всеми фильтрами**

---

## 🔍 Проверка выполнения

**Команды для проверки:**

```bash
# Проверить синтаксис PHP файлов
php -l src/WebhookLogs/Service/WebhookLogsApiCache.php
php -l src/WebhookLogs/Service/WebhookLogsApiService.php
php -l api/webhook-logs.php

# Запустить тесты
php tests/test-webhook-logs-api-optimization.php

# Проверить работу через HTTP
curl "http://localhost/api/webhook-logs.php?dateFrom=2025-12-01&dateTo=2025-12-07" | jq
```

**Ручное тестирование:**
1. Открыть `/admin/webhook-logs` в браузере
2. Проверить все фильтры (включая расширенные)
3. Проверить производительность (кеширование)
4. Проверить работу с большими объёмами данных
5. Проверить метрики в логах

---

## 🔗 Связи с другими этапами

**Зависит от:**
- **TASK-018-08-01:** Базовый сервис должен быть создан

**Зависит от него:**
- **TASK-018-09:** Рефакторинг SSE может использовать кеш

---

## 📝 История правок

- **2025-12-07 18:00 (UTC+3, Брест):** Создана задача оптимизации и расширения WebhookLogsApiService

---

## 💡 Дополнительные рекомендации

1. **Производительность:**
   - Мониторинг размера кеша
   - Автоматическая очистка старых записей
   - Оптимизация генерации ключей кеша
   - Использование более эффективных алгоритмов сортировки для больших объёмов
   - Кеширование метаданных (списки событий, категорий)

2. **Масштабируемость:**
   - В будущем можно использовать Redis для кеша
   - Распределённое кеширование для нескольких серверов
   - Инвалидация кеша при обновлении логов
   - Использование очередей для тяжёлых операций
   - Горизонтальное масштабирование через балансировщик

3. **Мониторинг:**
   - Логирование медленных запросов (> 1 сек)
   - Метрики попаданий в кеш (hit rate)
   - Алерты при превышении лимитов
   - Графики производительности
   - Отслеживание использования памяти

4. **Безопасность:**
   - Ограничение размера запросов
   - Защита от DoS атак через ограничение лимитов
   - Валидация всех входных параметров
   - Rate limiting для API endpoints
   - Проверка прав доступа перед возвратом данных

---

## 📖 Примеры использования расширенных фильтров

### Пример 1: Фильтрация по диапазону дат

**Запрос:**
```bash
GET /api/webhook-logs.php?dateFrom=2025-12-01&dateTo=2025-12-07&page=1&limit=50
```

**Ответ:**
```json
{
  "success": true,
  "logs": [
    {
      "timestamp": "2025-12-05T10:30:00+03:00",
      "event": "ONTASKADD",
      "category": "tasks"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "pages": 1
  }
}
```

### Пример 2: Комбинация всех фильтров

**Запрос:**
```bash
GET /api/webhook-logs.php?category=tasks&event=ONTASKADD&dateFrom=2025-12-01&dateTo=2025-12-07&ip=192.168.1.1&status=2&page=1&limit=10
```

**Использование в Vue.js:**
```javascript
const result = await WebhookLogsApiService.getLogs({
  category: 'tasks',
  event: 'ONTASKADD',
  dateFrom: '2025-12-01',
  dateTo: '2025-12-07',
  ip: '192.168.1.1',
  status: '2'
}, 1, 10);
```

### Пример 3: Отключение кеша для свежих данных

**Запрос:**
```bash
GET /api/webhook-logs.php?no_cache=1&page=1&limit=50
```

**Использование в Vue.js:**
```javascript
// Принудительное обновление (игнорировать кеш)
const result = await WebhookLogsApiService.getLogs(
  filters,
  page,
  limit,
  true // forceRefresh
);
```

---

## 🔍 Детали работы кеша

### Стратегии инвалидации

**1. По времени (TTL):**
- Автоматическая инвалидация через TTL
- Настраивается через `WebhookLogsConfig::getApiCacheTtl()`

**2. По событиям:**
- Инвалидация при создании нового лога
- Инвалидация при обновлении категории

**3. По паттерну:**
- Инвалидация всех запросов с определёнными фильтрами
- Используется при изменении фильтров в Vue.js

**4. Ручная инвалидация:**
- Через метод `WebhookLogsApiCache::invalidate()`
- Через параметр `no_cache=1` в запросе

### Мониторинг кеша

**Статистика кеша:**
```php
$stats = WebhookLogsApiCache::getStats();
// Возвращает:
// - size: текущий размер кеша
// - max_size: максимальный размер
// - ttl: время жизни записей
// - enabled: включен ли кеш
```

**Информация о записи:**
```php
$info = WebhookLogsApiCache::getCacheEntryInfo($cacheKey);
// Возвращает:
// - age: возраст записи в секундах
// - remaining: оставшееся время жизни
// - expires_at: время истечения
// - size: размер записи в байтах
```

---

## 🎯 Оптимизация производительности

### Рекомендации по настройке

**1. TTL кеша:**
- Для статических данных: 300-600 секунд (5-10 минут)
- Для динамических данных: 60-120 секунд (1-2 минуты)
- Для часто изменяющихся данных: 30-60 секунд

**2. Максимальный размер кеша:**
- Зависит от доступной памяти сервера
- Рекомендуется: 50-100 записей для начала
- Можно увеличить при наличии достаточной памяти

**3. Лимиты запросов:**
- Максимальное количество логов: 10000
- Порог потокового чтения: 5000
- Защита от перегрузки памяти

### Метрики для мониторинга

**Ключевые метрики:**
- Hit rate кеша (должен быть > 50%)
- Среднее время выполнения запросов
- Использование памяти
- Количество запросов в секунду
- Размер ответов API

**Алерты:**
- Hit rate < 30% (кеш неэффективен)
- Время выполнения > 2 сек (медленные запросы)
- Использование памяти > 80% лимита
- Количество запросов > 100/сек (высокая нагрузка)

