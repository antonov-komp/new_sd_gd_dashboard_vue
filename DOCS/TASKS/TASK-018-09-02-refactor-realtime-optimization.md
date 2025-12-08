# TASK-018-09-02: Оптимизация и расширение WebhookRealtimeService (производительность, обработка соединений)

**Дата создания:** 2025-12-07 20:00 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js) + Рефактор-менеджер  
**Родительская задача:** [TASK-018](./TASK-018-refactor-webhook-logs-module.md)  
**Предыдущий этап:** [TASK-018-09-01](./TASK-018-09-01-refactor-realtime-service.md)  
**Тип:** Рефакторинг / Оптимизация

---

## 📋 Описание

Расширить функциональность `WebhookRealtimeService` добавлением оптимизации проверки новых логов, кеширования последних проверенных записей, улучшения обработки разрывов соединения, поддержки фильтрации событий и метрик производительности.

**Цель этапа:**
- Оптимизировать проверку новых логов (кеширование, инкрементальное чтение)
- Добавить поддержку фильтрации событий на стороне сервера
- Улучшить обработку разрывов соединения и переподключений
- Добавить метрики производительности
- Реализовать управление множественными соединениями
- Сохранить обратную совместимость с Vue.js интерфейсом

---

## 🎯 Контекст

Это вторая часть девятого этапа рефакторинга модуля логирования вебхуков (TASK-018). На основе созданного базового сервиса (TASK-018-09-01) добавляются оптимизации и расширенная функциональность для улучшения производительности и поддержки всех возможностей, используемых Vue.js интерфейсом.

**Текущее состояние:**
- Базовый сервис создан (TASK-018-09-01)
- Поддерживается базовая проверка новых логов
- Нет оптимизации для больших объёмов данных
- Нет кеширования последних проверенных записей
- Нет поддержки фильтрации событий
- Простая обработка разрывов соединения

**Целевое состояние:**
- Оптимизированная проверка новых логов реализована
- Кеширование последних проверенных записей добавлено
- Фильтрация событий поддерживается
- Улучшенная обработка разрывов соединения
- Метрики производительности собираются
- Управление множественными соединениями реализовано

**Связи:**
- Зависит от: TASK-018-09-01 (базовый сервис создан)
- Зависит от него: TASK-018-10 (финальная полировка)
- **Vue.js:** Vue.js интерфейс может использовать фильтрацию событий:
  - Фильтрация по категориям
  - Фильтрация по типам событий
  - Все фильтры передаются через параметры URL

---

## 📁 Модули и компоненты

### Файлы для изменения:

1. **`src/WebhookLogs/Service/WebhookRealtimeService.php`**
   - Добавить оптимизацию проверки новых логов
   - Добавить поддержку фильтрации
   - Улучшить обработку соединений
   - Добавить метрики

2. **`src/WebhookLogs/Config/WebhookLogsConfig.php`**
   - Добавить настройки оптимизации
   - Добавить настройки фильтрации

### Файлы для создания:

1. **`src/WebhookLogs/Service/WebhookRealtimeCache.php`**
   - Класс для управления кешем последних проверенных записей
   - Методы: `get()`, `set()`, `clear()`, `getLastCheckedTimestamp()`

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Добавление настроек оптимизации в Config

**1.1. Обновить `src/WebhookLogs/Config/WebhookLogsConfig.php`:**

```php
// Добавить в класс WebhookLogsConfig

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
```

**Результат шага 1:**
- Настройки оптимизации добавлены в Config
- Настройки фильтрации добавлены

---

### Шаг 2: Создание класса для управления кешем последних проверенных записей

**2.1. Создать файл `src/WebhookLogs/Service/WebhookRealtimeCache.php`:**

```php
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
```

**Результат шага 2:**
- Класс для управления кешем создан
- Методы кеширования реализованы
- Очистка устаревших записей добавлена

---

### Шаг 3: Оптимизация проверки новых логов

**3.1. Обновить метод `checkForNewLogs()` в `WebhookRealtimeService.php`:**

```php
// Обновить метод checkForNewLogs()

use WebhookLogs\Service\WebhookRealtimeCache;

/**
 * Проверка новых логов (оптимизированная версия)
 * 
 * Использует кеширование для оптимизации проверки
 * 
 * @param array|null $filters Фильтры для проверки (category, event)
 * @return array Массив WebhookLogEntry
 * @throws WebhookLoggingException При ошибке чтения логов
 */
protected function checkForNewLogs(?array $filters = null): array
{
    $newLogs = [];
    $maxLogsPerCheck = WebhookLogsConfig::getRealtimeMaxLogsPerCheck();
    
    // Получение текущей даты и часа
    $now = new \DateTime('now', new \DateTimeZone(WebhookLogsConfig::getTimezone()));
    $date = $now->format('Y-m-d');
    $hour = (int)$now->format('H');
    
    // Категории для проверки
    $categories = $filters['category'] ?? WebhookLogsConfig::getCategories();
    if (!is_array($categories)) {
        $categories = [$categories];
    }
    
    foreach ($categories as $category) {
        // Проверка кеша для оптимизации
        $cachedTimestamp = WebhookRealtimeCache::getLastTimestamp($category);
        $checkFromTimestamp = $cachedTimestamp ?? $this->lastTimestamp;
        
        try {
            // Чтение логов через Repository
            $entries = $this->repository->read($category, $date, $hour);
            
            // Преобразование массивов в WebhookLogEntry
            $categoryLogs = [];
            foreach ($entries as $entryData) {
                try {
                    // Убеждаемся, что категория установлена
                    if (!isset($entryData['category'])) {
                        $entryData['category'] = $category;
                    }
                    
                    $entry = WebhookLogEntry::fromArray($entryData);
                    $entryTimestamp = $entry->getTimestamp()->format('c');
                    
                    // Проверка, что лог новее последнего известного
                    if ($checkFromTimestamp === null || $entryTimestamp > $checkFromTimestamp) {
                        // Применение фильтров
                        if ($this->shouldIncludeLog($entry, $filters)) {
                            $categoryLogs[] = $entry;
                            
                            // Ограничение количества логов
                            if ($maxLogsPerCheck > 0 && count($newLogs) + count($categoryLogs) >= $maxLogsPerCheck) {
                                break 2; // Выход из обоих циклов
                            }
                        }
                    }
                } catch (\Exception $e) {
                    // Логируем ошибку, но продолжаем обработку
                    error_log("Failed to create WebhookLogEntry: " . $e->getMessage());
                }
            }
            
            // Обновление кеша
            if (!empty($categoryLogs)) {
                $lastLog = end($categoryLogs);
                $lastTimestamp = $lastLog->getTimestamp()->format('c');
                WebhookRealtimeCache::setLastTimestamp($category, $lastTimestamp);
            }
            
            $newLogs = array_merge($newLogs, $categoryLogs);
            
        } catch (WebhookLoggingException $e) {
            // Логируем ошибку чтения категории, но продолжаем
            error_log("Failed to read category {$category}: " . $e->getMessage());
        }
    }
    
    // Сортировка по timestamp
    usort($newLogs, function($a, $b) {
        $timestampA = $this->getLogTimestamp($a);
        $timestampB = $this->getLogTimestamp($b);
        
        // Сортировка по возрастанию (старые сначала)
        return $timestampA <=> $timestampB;
    });
    
    // Ограничение количества логов
    if ($maxLogsPerCheck > 0 && count($newLogs) > $maxLogsPerCheck) {
        $newLogs = array_slice($newLogs, 0, $maxLogsPerCheck);
    }
    
    return $newLogs;
}

/**
 * Проверка, следует ли включать лог в результат
 * 
 * @param WebhookLogEntry $entry Запись лога
 * @param array|null $filters Фильтры
 * @return bool true если следует включить
 */
protected function shouldIncludeLog(WebhookLogEntry $entry, ?array $filters): bool
{
    if ($filters === null) {
        return true;
    }
    
    // Фильтр по типу события
    if (isset($filters['event']) && $filters['event'] !== null && $filters['event'] !== '') {
        if ($entry->getEvent() !== $filters['event']) {
            return false;
        }
    }
    
    // Фильтр по IP адресу
    if (isset($filters['ip']) && $filters['ip'] !== null && $filters['ip'] !== '') {
        if ($entry->getIp() !== $filters['ip']) {
            return false;
        }
    }
    
    // Дополнительные фильтры можно добавить здесь
    
    return true;
}
```

**3.2. Обновить метод `run()` для поддержки фильтров:**

```php
// Обновить метод run() для получения фильтров из параметров

public function run(?array $filters = null): void
{
    // Отправка начального события
    $this->sendEvent('connected', [
        'message' => 'Connected to realtime stream',
        'timestamp' => date('c'),
        'filters' => $filters
    ]);
    
    // ... остальной код ...
    
    // В основном цикле использовать фильтры
    $newLogs = $this->checkForNewLogs($filters);
    
    // ... остальной код ...
}
```

**Результат шага 3:**
- Оптимизация проверки новых логов реализована
- Кеширование последних проверенных записей добавлено
- Поддержка фильтрации событий добавлена

---

### Шаг 4: Улучшение обработки разрывов соединения

**4.1. Добавить методы для управления соединениями:**

```php
// Добавить в класс WebhookRealtimeService

/**
 * Регистрация активного соединения
 * 
 * @param string $connectionId ID соединения
 * @return void
 */
public function registerConnection(string $connectionId): void
{
    $maxConnections = WebhookLogsConfig::getRealtimeMaxConnections();
    $activeConnections = $this->getActiveConnectionsCount();
    
    if ($activeConnections >= $maxConnections) {
        throw new WebhookException(
            "Maximum connections limit reached: {$maxConnections}",
            'realtime',
            ['max_connections' => $maxConnections, 'active' => $activeConnections]
        );
    }
    
    // Регистрация соединения (можно использовать статический массив или файл)
    $this->registerConnectionInStorage($connectionId);
}

/**
 * Отмена регистрации соединения
 * 
 * @param string $connectionId ID соединения
 * @return void
 */
public function unregisterConnection(string $connectionId): void
{
    $this->unregisterConnectionFromStorage($connectionId);
}

/**
 * Получить количество активных соединений
 * 
 * @return int Количество соединений
 */
protected function getActiveConnectionsCount(): int
{
    // Реализация зависит от способа хранения (файл, память, БД)
    return count($this->getActiveConnectionsFromStorage());
}

/**
 * Регистрация соединения в хранилище
 * 
 * @param string $connectionId ID соединения
 * @return void
 */
protected function registerConnectionInStorage(string $connectionId): void
{
    // Простая реализация через файл
    $connectionsFile = sys_get_temp_dir() . '/webhook_realtime_connections.json';
    $connections = $this->loadConnectionsFromFile($connectionsFile);
    
    $connections[$connectionId] = [
        'id' => $connectionId,
        'started_at' => time(),
        'last_activity' => time()
    ];
    
    $this->saveConnectionsToFile($connectionsFile, $connections);
}

/**
 * Отмена регистрации соединения из хранилища
 * 
 * @param string $connectionId ID соединения
 * @return void
 */
protected function unregisterConnectionFromStorage(string $connectionId): void
{
    $connectionsFile = sys_get_temp_dir() . '/webhook_realtime_connections.json';
    $connections = $this->loadConnectionsFromFile($connectionsFile);
    
    if (isset($connections[$connectionId])) {
        unset($connections[$connectionId]);
        $this->saveConnectionsToFile($connectionsFile, $connections);
    }
}

/**
 * Получить активные соединения из хранилища
 * 
 * @return array Массив активных соединений
 */
protected function getActiveConnectionsFromStorage(): array
{
    $connectionsFile = sys_get_temp_dir() . '/webhook_realtime_connections.json';
    $connections = $this->loadConnectionsFromFile($connectionsFile);
    
    // Очистка неактивных соединений
    $cleanupInterval = WebhookLogsConfig::getRealtimeCleanupInterval();
    $now = time();
    
    foreach ($connections as $id => $connection) {
        if ($now - $connection['last_activity'] > $cleanupInterval) {
            unset($connections[$id]);
        }
    }
    
    if (count($connections) !== count($this->loadConnectionsFromFile($connectionsFile))) {
        $this->saveConnectionsToFile($connectionsFile, $connections);
    }
    
    return $connections;
}

/**
 * Загрузка соединений из файла
 * 
 * @param string $file Путь к файлу
 * @return array Массив соединений
 */
protected function loadConnectionsFromFile(string $file): array
{
    if (!file_exists($file)) {
        return [];
    }
    
    $content = file_get_contents($file);
    $connections = json_decode($content, true);
    
    return is_array($connections) ? $connections : [];
}

/**
 * Сохранение соединений в файл
 * 
 * @param string $file Путь к файлу
 * @param array $connections Массив соединений
 * @return void
 */
protected function saveConnectionsToFile(string $file, array $connections): void
{
    file_put_contents($file, json_encode($connections, JSON_PRETTY_PRINT));
}
```

**4.2. Обновить метод `run()` для регистрации соединения:**

```php
// Обновить метод run()

public function run(?array $filters = null): void
{
    // Генерация ID соединения
    $connectionId = uniqid('sse_', true);
    
    try {
        // Регистрация соединения
        $this->registerConnection($connectionId);
        
        // Отправка начального события
        $this->sendEvent('connected', [
            'message' => 'Connected to realtime stream',
            'timestamp' => date('c'),
            'filters' => $filters,
            'connection_id' => $connectionId
        ]);
        
        // ... остальной код ...
        
    } finally {
        // Отмена регистрации соединения
        $this->unregisterConnection($connectionId);
    }
}
```

**Результат шага 4:**
- Управление множественными соединениями реализовано
- Обработка разрывов соединения улучшена
- Очистка неактивных соединений добавлена

---

### Шаг 5: Добавление метрик производительности

**5.1. Добавить сбор метрик в `WebhookRealtimeService.php`:**

```php
// Добавить свойства для метрик

protected array $metrics = [
    'checks_count' => 0,
    'logs_found' => 0,
    'events_sent' => 0,
    'errors_count' => 0,
    'start_time' => 0,
    'last_check_time' => 0
];

// Обновить метод run() для сбора метрик

public function run(?array $filters = null): void
{
    $this->metrics['start_time'] = microtime(true);
    
    // ... остальной код ...
    
    // В основном цикле
    $checkStartTime = microtime(true);
    $newLogs = $this->checkForNewLogs($filters);
    $this->metrics['checks_count']++;
    $this->metrics['last_check_time'] = microtime(true) - $checkStartTime;
    
    if (!empty($newLogs)) {
        $this->metrics['logs_found'] += count($newLogs);
        $this->metrics['events_sent']++;
        
        // Отправка новых логов
        $this->sendEvent('new_logs', [
            'logs' => $this->formatLogsForClient($newLogs),
            'count' => count($newLogs),
            'timestamp' => date('c')
        ]);
    }
    
    // ... остальной код ...
}

/**
 * Получить метрики производительности
 * 
 * @return array Метрики
 */
public function getMetrics(): array
{
    $currentTime = microtime(true);
    $uptime = $currentTime - $this->metrics['start_time'];
    
    return [
        'checks_count' => $this->metrics['checks_count'],
        'logs_found' => $this->metrics['logs_found'],
        'events_sent' => $this->metrics['events_sent'],
        'errors_count' => $this->metrics['errors_count'],
        'uptime' => $uptime,
        'avg_check_time' => $this->metrics['checks_count'] > 0 
            ? $this->metrics['last_check_time'] / $this->metrics['checks_count'] 
            : 0,
        'logs_per_check' => $this->metrics['checks_count'] > 0 
            ? $this->metrics['logs_found'] / $this->metrics['checks_count'] 
            : 0
    ];
}
```

**Результат шага 5:**
- Метрики производительности собираются
- Статистика работы сервиса доступна

---

### Шаг 6: Обновление webhook-realtime.php для поддержки фильтров

**6.1. Обновить `api/webhook-realtime.php`:**

```php
// Обновить секцию получения параметров

// Получение параметров из запроса
$lastTimestamp = isset($_GET['last_timestamp']) && $_GET['last_timestamp'] !== '' 
    ? trim($_GET['last_timestamp']) 
    : null;

// Получение фильтров
$filters = [];
if (isset($_GET['category']) && $_GET['category'] !== '') {
    $filters['category'] = trim($_GET['category']);
}
if (isset($_GET['event']) && $_GET['event'] !== '') {
    $filters['event'] = trim($_GET['event']);
}
if (isset($_GET['ip']) && $_GET['ip'] !== '') {
    $filters['ip'] = trim($_GET['ip']);
}

// Валидация фильтров
if (isset($filters['category']) && !WebhookLogsConfig::isValidCategory($filters['category'])) {
    echo "event: error\n";
    echo "data: " . json_encode([
        'message' => 'Invalid category: ' . $filters['category'],
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE) . "\n\n";
    exit;
}

// Создание сервиса
$realtimeService = new WebhookRealtimeService(null, $lastTimestamp);

// Запуск основного цикла SSE с фильтрами
$realtimeService->run(!empty($filters) ? $filters : null);
```

**Результат шага 6:**
- Поддержка фильтров добавлена в endpoint
- Валидация фильтров реализована

---

### Шаг 7: Тестирование оптимизаций

**7.1. Создать тестовый скрипт:**

**Файл:** `tests/test-webhook-realtime-optimization.php`

```php
<?php
/**
 * Тестирование оптимизаций WebhookRealtimeService
 * 
 * Использование: php tests/test-webhook-realtime-optimization.php
 */

require_once __DIR__ . '/../src/WebhookLogs/bootstrap.php';

use WebhookLogs\Service\WebhookRealtimeService;
use WebhookLogs\Service\WebhookRealtimeCache;

echo "=== Тестирование оптимизаций WebhookRealtimeService ===\n\n";

try {
    $service = new WebhookRealtimeService();
    
    // Тест 1: Кеширование
    echo "Тест 1: Кеширование последних проверенных записей...\n";
    WebhookRealtimeCache::setLastTimestamp('tasks', '2025-12-07T15:30:00+03:00');
    $cached = WebhookRealtimeCache::getLastTimestamp('tasks');
    if ($cached === '2025-12-07T15:30:00+03:00') {
        echo "✅ Кеширование работает\n\n";
    } else {
        echo "❌ Кеширование не работает\n\n";
    }
    
    // Тест 2: Фильтрация событий
    echo "Тест 2: Фильтрация событий...\n";
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('checkForNewLogs');
    $method->setAccessible(true);
    
    $service->setLastTimestamp(date('c', strtotime('-1 hour')));
    $logsWithFilter = $method->invoke($service, ['event' => 'ONTASKADD']);
    echo "✅ Фильтрация выполнена, найдено логов: " . count($logsWithFilter) . "\n\n";
    
    // Тест 3: Метрики
    echo "Тест 3: Метрики производительности...\n";
    // Метрики будут доступны после выполнения run(), но для теста можно проверить структуру
    $metricsMethod = $reflection->getMethod('getMetrics');
    $metricsMethod->setAccessible(true);
    $metrics = $metricsMethod->invoke($service);
    echo "✅ Метрики получены:\n";
    echo "  - Структура: " . json_encode(array_keys($metrics), JSON_UNESCAPED_UNICODE) . "\n\n";
    
    // Тест 4: Статистика кеша
    echo "Тест 4: Статистика кеша...\n";
    $cacheStats = WebhookRealtimeCache::getStats();
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

**7.2. Протестировать через HTTP:**

```bash
# Тест с фильтрами
curl -N "http://localhost/api/webhook-realtime.php?category=tasks&event=ONTASKADD"
curl -N "http://localhost/api/webhook-realtime.php?ip=192.168.1.1"

# Тест с last_timestamp
curl -N "http://localhost/api/webhook-realtime.php?last_timestamp=2025-12-07T15:00:00+03:00"
```

**Результат шага 7:**
- Тесты созданы и проходят
- Все оптимизации работают
- Фильтрация работает корректно

---

### Шаг 8: Проверка совместимости с Vue.js

**8.1. Проверить работу фильтров в Vue.js:**

1. Открыть `/admin/webhook-logs` в браузере
2. Включить реальное время
3. Применить фильтры (category, event)
4. Проверить, что получаются только отфильтрованные события
5. Проверить работу кеширования (второй запрос должен быть быстрее)

**8.2. Проверить производительность:**

- Первая проверка должна выполняться нормально
- Последующие проверки (с кешем) должны быть быстрее
- Запросы с фильтрами должны работать корректно

**Результат шага 8:**
- Все фильтры Vue.js работают корректно
- Производительность улучшена
- Кеширование работает

---

## 📊 Критерии приёмки

- [ ] Класс `WebhookRealtimeCache` создан и реализован
- [ ] Кеширование последних проверенных записей реализовано
- [ ] Оптимизация проверки новых логов добавлена
- [ ] Поддержка фильтрации событий (category, event, ip) добавлена
- [ ] Методы `shouldIncludeLog()`, `checkForNewLogs()` обновлены
- [ ] Управление множественными соединениями реализовано
- [ ] Метрики производительности собираются
- [ ] Настройки оптимизации добавлены в Config
- [ ] `webhook-realtime.php` обновлён для поддержки фильтров
- [ ] Тесты созданы и проходят успешно
- [ ] Код соответствует стандартам PSR-12
- [ ] PHPDoc комментарии добавлены для всех методов
- [ ] **Все фильтры работают в Vue.js интерфейсе**
- [ ] **Кеширование улучшает производительность**
- [ ] **Vue.js composable корректно работает со всеми фильтрами**

---

## 🔍 Проверка выполнения

**Команды для проверки:**

```bash
# Проверить синтаксис PHP файлов
php -l src/WebhookLogs/Service/WebhookRealtimeCache.php
php -l src/WebhookLogs/Service/WebhookRealtimeService.php
php -l api/webhook-realtime.php

# Запустить тесты
php tests/test-webhook-realtime-optimization.php

# Проверить работу через HTTP
curl -N "http://localhost/api/webhook-realtime.php?category=tasks" | head -20
```

**Ручное тестирование:**
1. Открыть `/admin/webhook-logs` в браузере
2. Проверить все фильтры (включая фильтрацию в SSE)
3. Проверить производительность (кеширование)
4. Проверить работу с множественными соединениями
5. Проверить метрики в логах

---

## 🔗 Связи с другими этапами

**Зависит от:**
- **TASK-018-09-01:** Базовый сервис должен быть создан

**Зависит от него:**
- **TASK-018-10:** Финальная полировка может использовать метрики

---

## 📝 История правок

- **2025-12-07 20:00 (UTC+3, Брест):** Создана задача оптимизации и расширения WebhookRealtimeService

---

## 💡 Дополнительные рекомендации

1. **Производительность:**
   - Мониторинг размера кеша
   - Автоматическая очистка устаревших записей
   - Оптимизация проверки новых логов

2. **Масштабируемость:**
   - В будущем можно использовать Redis для кеша
   - Распределённое управление соединениями для нескольких серверов
   - Очереди для обработки больших объёмов событий

3. **Мониторинг:**
   - Логирование медленных проверок
   - Метрики попаданий в кеш
   - Алерты при превышении лимитов соединений

4. **Безопасность:**
   - Ограничение количества одновременных соединений
   - Защита от DoS атак
   - Валидация всех входных параметров


