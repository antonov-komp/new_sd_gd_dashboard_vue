# TASK-018-04-01: Создание сущностей (WebhookEvent, WebhookLogEntry)

**Дата создания:** 2025-12-07 15:13 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Рефактор-менеджер + Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-018](./TASK-018-refactor-webhook-logs-module.md)  
**Тип:** Рефакторинг

---

## 📋 Описание

Создать классы-сущности `WebhookEvent` и `WebhookLogEntry` для представления данных вебхуков и записей логов. Реализовать валидацию данных, методы сериализации/десериализации и типизацию полей.

**Цель этапа:**
- Создать типизированные сущности для работы с данными вебхуков
- Реализовать валидацию данных событий
- Добавить методы сериализации/десериализации
- Улучшить типобезопасность кода

---

## 🎯 Контекст

Это первая часть четвёртого этапа рефакторинга модуля логирования вебхуков (TASK-018). Создание сущностей позволит улучшить структуру данных и упростит работу с ними в последующих этапах.

**Текущее состояние:**
- Данные представлены как массивы без типизации
- Нет валидации структуры данных
- Нет методов для работы с данными
- Сложно понять структуру данных без документации

**Целевое состояние:**
- Типизированные классы-сущности
- Валидация данных при создании
- Методы для работы с данными
- Понятная структура данных

**Связи:**
- Зависит от: TASK-018-02 (использует `WebhookLogsConfig` и исключения), TASK-018-03 (использует `WebhookLogsRepository`)
- Зависит от него: TASK-018-04-02 (EventDetailsExtractor будет использовать сущности), TASK-018-06 (сервис логирования будет использовать сущности)
- **Vue.js:** Сущности должны сериализоваться в формат, который ожидают Vue.js компоненты. Структура `WebhookLogEntry::toArray()` должна соответствовать структуре объектов в `logs` массиве, который использует `WebhookLogsPage.vue`

---

## 📁 Модули и компоненты

### Файлы для создания:

1. **`src/WebhookLogs/Entity/WebhookEvent.php`**
   - Сущность события вебхука
   - Поля: `eventType`, `eventData`, `payload`, `timestamp`, `clientIp`
   - Методы: `fromArray()`, `toArray()`, `validate()`, `getCategory()`

2. **`src/WebhookLogs/Entity/WebhookLogEntry.php`**
   - Сущность записи в логе
   - Поля: `timestamp`, `ip`, `event`, `category`, `payload`, `details`
   - Методы: `fromArray()`, `toArray()`, `validate()`, `fromWebhookEvent()`

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Анализ текущей структуры данных

**1.1. Изучить структуру данных в текущем коде:**

**Из `webhook-handler.php`:**
```php
$logEntry = [
    'timestamp' => date('c'),
    'ip' => $clientIp,
    'event' => $eventType,
    'category' => $category,
    'payload' => $fullPayload,
    'details' => extractEventDetails($eventType, $eventData)
];
```

**Из `webhook-logs.php`:**
- Записи читаются как массивы
- Нет валидации структуры
- Нет типизации полей

**1.2. Определить обязательные и опциональные поля:**

**WebhookEvent:**
- Обязательные: `eventType`, `eventData`, `timestamp`
- Опциональные: `payload`, `clientIp`, `signature`

**WebhookLogEntry:**
- Обязательные: `timestamp`, `event`, `category`
- Опциональные: `ip`, `payload`, `details`

**Результат шага 1:**
- Понимание текущей структуры данных
- Список обязательных и опциональных полей
- Определение типов данных

---

### Шаг 2: Создание базовой сущности WebhookEvent

**2.1. Создать файл `src/WebhookLogs/Entity/WebhookEvent.php`:**

```php
<?php
/**
 * Сущность события вебхука
 * 
 * Расположение: src/WebhookLogs/Entity/WebhookEvent.php
 * 
 * Представляет входящее событие от Bitrix24
 */
namespace WebhookLogs\Entity;

use WebhookLogs\Config\WebhookLogsConfig;
use WebhookLogs\Exception\WebhookValidationException;

class WebhookEvent
{
    /**
     * Тип события (например, ONTASKADD, ONCRMDYNAMICITEMADD)
     * 
     * @var string
     */
    private string $eventType;
    
    /**
     * Данные события
     * 
     * @var array
     */
    private array $eventData;
    
    /**
     * Полный payload вебхука
     * 
     * @var array|null
     */
    private ?array $payload = null;
    
    /**
     * Временная метка события
     * 
     * @var \DateTime
     */
    private \DateTime $timestamp;
    
    /**
     * IP адрес клиента
     * 
     * @var string|null
     */
    private ?string $clientIp = null;
    
    /**
     * Подпись вебхука (HMAC)
     * 
     * @var string|null
     */
    private ?string $signature = null;
    
    /**
     * Конструктор
     * 
     * @param string $eventType Тип события
     * @param array $eventData Данные события
     * @param \DateTime|null $timestamp Временная метка (null = текущее время)
     */
    public function __construct(string $eventType, array $eventData, ?\DateTime $timestamp = null)
    {
        $this->eventType = $eventType;
        $this->eventData = $eventData;
        $this->timestamp = $timestamp ?? WebhookLogsConfig::getDateTime();
    }
    
    /**
     * Создать из массива данных
     * 
     * @param array $data Данные события
     * @return self Экземпляр сущности
     * @throws WebhookValidationException При невалидных данных
     */
    public static function fromArray(array $data): self
    {
        // Валидация обязательных полей
        if (!isset($data['event'])) {
            throw new WebhookValidationException(
                'Missing required field: event',
                'required_field',
                ['field' => 'event', 'data' => $data]
            );
        }
        
        if (!isset($data['data'])) {
            throw new WebhookValidationException(
                'Missing required field: data',
                'required_field',
                ['field' => 'data', 'data' => $data]
            );
        }
        
        // Создание сущности
        $event = new self($data['event'], $data['data']);
        
        // Установка опциональных полей
        if (isset($data['payload'])) {
            $event->setPayload($data['payload']);
        }
        
        if (isset($data['timestamp'])) {
            try {
                $timestamp = WebhookLogsConfig::getDateTime($data['timestamp']);
                $event->setTimestamp($timestamp);
            } catch (\Exception $e) {
                throw new WebhookValidationException(
                    'Invalid timestamp format: ' . $data['timestamp'],
                    'invalid_format',
                    ['field' => 'timestamp', 'value' => $data['timestamp']]
                );
            }
        }
        
        if (isset($data['client_ip'])) {
            $event->setClientIp($data['client_ip']);
        }
        
        if (isset($data['signature'])) {
            $event->setSignature($data['signature']);
        }
        
        // Валидация сущности
        $event->validate();
        
        return $event;
    }
    
    /**
     * Преобразовать в массив
     * 
     * @return array Массив данных
     */
    public function toArray(): array
    {
        $data = [
            'event' => $this->eventType,
            'data' => $this->eventData,
            'timestamp' => $this->timestamp->format('c')
        ];
        
        if ($this->payload !== null) {
            $data['payload'] = $this->payload;
        }
        
        if ($this->clientIp !== null) {
            $data['client_ip'] = $this->clientIp;
        }
        
        if ($this->signature !== null) {
            $data['signature'] = $this->signature;
        }
        
        return $data;
    }
    
    /**
     * Валидация сущности
     * 
     * @return bool true если валидна
     * @throws WebhookValidationException При невалидных данных
     */
    public function validate(): bool
    {
        // Валидация типа события
        if (empty($this->eventType)) {
            throw new WebhookValidationException(
                'Event type cannot be empty',
                'required_field',
                ['field' => 'eventType']
            );
        }
        
        // Валидация формата типа события
        if (!preg_match('/^[A-Z][A-Z0-9_]+$/', $this->eventType)) {
            throw new WebhookValidationException(
                'Invalid event type format: ' . $this->eventType,
                'invalid_format',
                ['field' => 'eventType', 'value' => $this->eventType]
            );
        }
        
        // Валидация данных события
        if (!is_array($this->eventData)) {
            throw new WebhookValidationException(
                'Event data must be an array',
                'invalid_type',
                ['field' => 'eventData', 'type' => gettype($this->eventData)]
            );
        }
        
        // Валидация IP адреса (если установлен)
        if ($this->clientIp !== null && !filter_var($this->clientIp, FILTER_VALIDATE_IP)) {
            throw new WebhookValidationException(
                'Invalid IP address: ' . $this->clientIp,
                'invalid_format',
                ['field' => 'clientIp', 'value' => $this->clientIp]
            );
        }
        
        return true;
    }
    
    /**
     * Получить категорию события
     * 
     * @return string|null Категория (tasks, smart-processes) или null
     */
    public function getCategory(): ?string
    {
        if (strpos($this->eventType, 'ONCRMDYNAMIC') === 0) {
            return 'smart-processes';
        }
        
        if (strpos($this->eventType, 'ONTASK') === 0) {
            return 'tasks';
        }
        
        return null;
    }
    
    /**
     * Получить тип события
     * 
     * @return string Тип события
     */
    public function getEventType(): string
    {
        return $this->eventType;
    }
    
    /**
     * Получить данные события
     * 
     * @return array Данные события
     */
    public function getEventData(): array
    {
        return $this->eventData;
    }
    
    /**
     * Установить payload
     * 
     * @param array $payload Payload вебхука
     * @return self
     */
    public function setPayload(array $payload): self
    {
        $this->payload = $payload;
        return $this;
    }
    
    /**
     * Получить payload
     * 
     * @return array|null Payload вебхука
     */
    public function getPayload(): ?array
    {
        return $this->payload;
    }
    
    /**
     * Установить временную метку
     * 
     * @param \DateTime $timestamp Временная метка
     * @return self
     */
    public function setTimestamp(\DateTime $timestamp): self
    {
        $this->timestamp = $timestamp;
        return $this;
    }
    
    /**
     * Получить временную метку
     * 
     * @return \DateTime Временная метка
     */
    public function getTimestamp(): \DateTime
    {
        return $this->timestamp;
    }
    
    /**
     * Установить IP адрес клиента
     * 
     * @param string $clientIp IP адрес
     * @return self
     */
    public function setClientIp(string $clientIp): self
    {
        $this->clientIp = $clientIp;
        return $this;
    }
    
    /**
     * Получить IP адрес клиента
     * 
     * @return string|null IP адрес
     */
    public function getClientIp(): ?string
    {
        return $this->clientIp;
    }
    
    /**
     * Установить подпись вебхука
     * 
     * @param string $signature Подпись (HMAC)
     * @return self
     */
    public function setSignature(string $signature): self
    {
        $this->signature = $signature;
        return $this;
    }
    
    /**
     * Получить подпись вебхука
     * 
     * @return string|null Подпись
     */
    public function getSignature(): ?string
    {
        return $this->signature;
    }
    
    /**
     * Сериализация в JSON
     * 
     * @return string JSON строка
     */
    public function toJson(): string
    {
        return json_encode($this->toArray(), WebhookLogsConfig::getJsonEncodeOptions());
    }
    
    /**
     * Десериализация из JSON
     * 
     * @param string $json JSON строка
     * @return self Экземпляр сущности
     * @throws WebhookValidationException При ошибке парсинга
     */
    public static function fromJson(string $json): self
    {
        $data = json_decode($json, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new WebhookValidationException(
                'Invalid JSON: ' . json_last_error_msg(),
                'parse',
                ['json_error' => json_last_error_msg()]
            );
        }
        
        return self::fromArray($data);
    }
}
```

**Результат шага 2:**
- Класс `WebhookEvent` создан
- Валидация реализована
- Методы сериализации/десериализации добавлены

---

### Шаг 3: Создание сущности WebhookLogEntry

**3.1. Создать файл `src/WebhookLogs/Entity/WebhookLogEntry.php`:**

```php
<?php
/**
 * Сущность записи в логе вебхуков
 * 
 * Расположение: src/WebhookLogs/Entity/WebhookLogEntry.php
 * 
 * Представляет запись, сохранённую в файле лога
 */
namespace WebhookLogs\Entity;

use WebhookLogs\Config\WebhookLogsConfig;
use WebhookLogs\Exception\WebhookLoggingException;

class WebhookLogEntry
{
    /**
     * Временная метка записи
     * 
     * @var \DateTime
     */
    private \DateTime $timestamp;
    
    /**
     * IP адрес клиента
     * 
     * @var string|null
     */
    private ?string $ip = null;
    
    /**
     * Тип события
     * 
     * @var string
     */
    private string $event;
    
    /**
     * Категория события
     * 
     * @var string
     */
    private string $category;
    
    /**
     * Полный payload вебхука
     * 
     * @var array|null
     */
    private ?array $payload = null;
    
    /**
     * Детали события (извлечённые данные)
     * 
     * @var array|null
     */
    private ?array $details = null;
    
    /**
     * Конструктор
     * 
     * @param string $event Тип события
     * @param string $category Категория
     * @param \DateTime|null $timestamp Временная метка (null = текущее время)
     */
    public function __construct(string $event, string $category, ?\DateTime $timestamp = null)
    {
        $this->event = $event;
        $this->category = $category;
        $this->timestamp = $timestamp ?? WebhookLogsConfig::getDateTime();
    }
    
    /**
     * Создать из WebhookEvent
     * 
     * @param WebhookEvent $event Событие вебхука
     * @param array|null $details Детали события (извлечённые)
     * @return self Экземпляр записи
     */
    public static function fromWebhookEvent(WebhookEvent $event, ?array $details = null): self
    {
        $category = $event->getCategory();
        
        if ($category === null) {
            throw new WebhookLoggingException(
                'Cannot determine category for event: ' . $event->getEventType(),
                'category',
                ['event_type' => $event->getEventType()]
            );
        }
        
        $entry = new self($event->getEventType(), $category, $event->getTimestamp());
        
        if ($event->getClientIp() !== null) {
            $entry->setIp($event->getClientIp());
        }
        
        if ($event->getPayload() !== null) {
            $entry->setPayload($event->getPayload());
        }
        
        if ($details !== null) {
            $entry->setDetails($details);
        }
        
        return $entry;
    }
    
    /**
     * Создать из массива данных
     * 
     * @param array $data Данные записи
     * @return self Экземпляр записи
     * @throws WebhookLoggingException При невалидных данных
     */
    public static function fromArray(array $data): self
    {
        // Валидация обязательных полей
        if (!isset($data['event'])) {
            throw new WebhookLoggingException(
                'Missing required field: event',
                'required_field',
                ['field' => 'event', 'data' => $data]
            );
        }
        
        if (!isset($data['category'])) {
            throw new WebhookLoggingException(
                'Missing required field: category',
                'required_field',
                ['field' => 'category', 'data' => $data]
            );
        }
        
        // Парсинг временной метки
        $timestamp = null;
        if (isset($data['timestamp'])) {
            try {
                $timestamp = WebhookLogsConfig::getDateTime($data['timestamp']);
            } catch (\Exception $e) {
                throw new WebhookLoggingException(
                    'Invalid timestamp format: ' . $data['timestamp'],
                    'parse',
                    ['field' => 'timestamp', 'value' => $data['timestamp']]
                );
            }
        }
        
        // Создание записи
        $entry = new self($data['event'], $data['category'], $timestamp);
        
        // Установка опциональных полей
        if (isset($data['ip'])) {
            $entry->setIp($data['ip']);
        }
        
        if (isset($data['payload'])) {
            $entry->setPayload($data['payload']);
        }
        
        if (isset($data['details'])) {
            $entry->setDetails($data['details']);
        }
        
        // Валидация записи
        $entry->validate();
        
        return $entry;
    }
    
    /**
     * Преобразовать в массив
     * 
     * @return array Массив данных
     */
    public function toArray(): array
    {
        $data = [
            'timestamp' => $this->timestamp->format('c'),
            'event' => $this->event,
            'category' => $this->category
        ];
        
        if ($this->ip !== null) {
            $data['ip'] = $this->ip;
        }
        
        if ($this->payload !== null) {
            $data['payload'] = $this->payload;
        }
        
        if ($this->details !== null) {
            $data['details'] = $this->details;
        }
        
        return $data;
    }
    
    /**
     * Валидация записи
     * 
     * @return bool true если валидна
     * @throws WebhookLoggingException При невалидных данных
     */
    public function validate(): bool
    {
        // Валидация типа события
        if (empty($this->event)) {
            throw new WebhookLoggingException(
                'Event cannot be empty',
                'required_field',
                ['field' => 'event']
            );
        }
        
        // Валидация категории
        if (!WebhookLogsConfig::isValidCategory($this->category)) {
            throw new WebhookLoggingException(
                'Invalid category: ' . $this->category,
                'category',
                [
                    'category' => $this->category,
                    'valid_categories' => WebhookLogsConfig::getCategories()
                ]
            );
        }
        
        // Валидация IP адреса (если установлен)
        if ($this->ip !== null && !filter_var($this->ip, FILTER_VALIDATE_IP)) {
            throw new WebhookLoggingException(
                'Invalid IP address: ' . $this->ip,
                'invalid_format',
                ['field' => 'ip', 'value' => $this->ip]
            );
        }
        
        return true;
    }
    
    /**
     * Получить временную метку
     * 
     * @return \DateTime Временная метка
     */
    public function getTimestamp(): \DateTime
    {
        return $this->timestamp;
    }
    
    /**
     * Установить IP адрес
     * 
     * @param string $ip IP адрес
     * @return self
     */
    public function setIp(string $ip): self
    {
        $this->ip = $ip;
        return $this;
    }
    
    /**
     * Получить IP адрес
     * 
     * @return string|null IP адрес
     */
    public function getIp(): ?string
    {
        return $this->ip;
    }
    
    /**
     * Получить тип события
     * 
     * @return string Тип события
     */
    public function getEvent(): string
    {
        return $this->event;
    }
    
    /**
     * Получить категорию
     * 
     * @return string Категория
     */
    public function getCategory(): string
    {
        return $this->category;
    }
    
    /**
     * Установить payload
     * 
     * @param array $payload Payload вебхука
     * @return self
     */
    public function setPayload(array $payload): self
    {
        $this->payload = $payload;
        return $this;
    }
    
    /**
     * Получить payload
     * 
     * @return array|null Payload вебхука
     */
    public function getPayload(): ?array
    {
        return $this->payload;
    }
    
    /**
     * Установить детали события
     * 
     * @param array $details Детали события
     * @return self
     */
    public function setDetails(array $details): self
    {
        $this->details = $details;
        return $this;
    }
    
    /**
     * Получить детали события
     * 
     * @return array|null Детали события
     */
    public function getDetails(): ?array
    {
        return $this->details;
    }
    
    /**
     * Сериализация в JSON
     * 
     * @return string JSON строка
     */
    public function toJson(): string
    {
        return json_encode($this->toArray(), WebhookLogsConfig::getJsonEncodeOptions());
    }
    
    /**
     * Десериализация из JSON
     * 
     * @param string $json JSON строка
     * @return self Экземпляр записи
     * @throws WebhookLoggingException При ошибке парсинга
     */
    public static function fromJson(string $json): self
    {
        $data = json_decode($json, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new WebhookLoggingException(
                'Invalid JSON: ' . json_last_error_msg(),
                'parse',
                ['json_error' => json_last_error_msg()]
            );
        }
        
        return self::fromArray($data);
    }
}
```

**Результат шага 3:**
- Класс `WebhookLogEntry` создан
- Валидация реализована
- Методы сериализации/десериализации добавлены
- Метод создания из `WebhookEvent` реализован

---

### Шаг 4: Тестирование сущностей

**4.1. Создать тестовый скрипт:**

**Файл:** `tests/test-entities.php`

```php
<?php
/**
 * Тестирование сущностей WebhookEvent и WebhookLogEntry
 * 
 * Использование: php tests/test-entities.php
 */

require_once __DIR__ . '/../src/WebhookLogs/bootstrap.php';

use WebhookLogs\Entity\WebhookEvent;
use WebhookLogs\Entity\WebhookLogEntry;
use WebhookLogs\Exception\WebhookValidationException;
use WebhookLogs\Exception\WebhookLoggingException;

echo "=== Тестирование сущностей ===\n\n";

try {
    // Тест 1: Создание WebhookEvent
    echo "Тест 1: Создание WebhookEvent...\n";
    $event = new WebhookEvent('ONTASKADD', ['TASK' => ['ID' => 123, 'TITLE' => 'Test']]);
    echo "✅ WebhookEvent создан\n";
    echo "  - Тип события: " . $event->getEventType() . "\n";
    echo "  - Категория: " . ($event->getCategory() ?? 'null') . "\n\n";
    
    // Тест 2: Создание из массива
    echo "Тест 2: Создание WebhookEvent из массива...\n";
    $eventData = [
        'event' => 'ONCRMDYNAMICITEMADD',
        'data' => ['FIELDS' => ['ID' => 456, 'TITLE' => 'Test Item']],
        'client_ip' => '192.168.1.1'
    ];
    $event2 = WebhookEvent::fromArray($eventData);
    echo "✅ WebhookEvent создан из массива\n";
    echo "  - IP: " . ($event2->getClientIp() ?? 'null') . "\n\n";
    
    // Тест 3: Валидация (невалидные данные)
    echo "Тест 3: Валидация невалидных данных...\n";
    try {
        WebhookEvent::fromArray(['event' => 'TEST']); // Нет поля 'data'
        echo "❌ Ожидалось исключение\n\n";
    } catch (WebhookValidationException $e) {
        echo "✅ Исключение поймано: " . $e->getMessage() . "\n\n";
    }
    
    // Тест 4: Создание WebhookLogEntry
    echo "Тест 4: Создание WebhookLogEntry...\n";
    $entry = new WebhookLogEntry('ONTASKADD', 'tasks');
    $entry->setIp('192.168.1.1');
    $entry->setDetails(['task_id' => 123]);
    echo "✅ WebhookLogEntry создан\n";
    echo "  - Событие: " . $entry->getEvent() . "\n";
    echo "  - Категория: " . $entry->getCategory() . "\n\n";
    
    // Тест 5: Создание из WebhookEvent
    echo "Тест 5: Создание WebhookLogEntry из WebhookEvent...\n";
    $entry2 = WebhookLogEntry::fromWebhookEvent($event, ['task_id' => 123]);
    echo "✅ WebhookLogEntry создан из WebhookEvent\n";
    echo "  - Событие: " . $entry2->getEvent() . "\n";
    echo "  - Категория: " . $entry2->getCategory() . "\n\n";
    
    // Тест 6: Сериализация/десериализация
    echo "Тест 6: Сериализация/десериализация...\n";
    $json = $entry->toJson();
    $entry3 = WebhookLogEntry::fromJson($json);
    echo "✅ Сериализация/десериализация работает\n";
    echo "  - JSON длина: " . strlen($json) . " байт\n\n";
    
    echo "=== Тестирование завершено ===\n";
    
} catch (\Exception $e) {
    echo "❌ Критическая ошибка: " . $e->getMessage() . "\n";
    echo "Файл: " . $e->getFile() . "\n";
    echo "Строка: " . $e->getLine() . "\n";
    exit(1);
}
```

**Результат шага 4:**
- Тестовый скрипт создан
- Основные операции протестированы
- Валидация проверена

---

## 📊 Критерии приёмки

- [ ] Класс `WebhookEvent` создан и реализован
- [ ] Класс `WebhookLogEntry` создан и реализован
- [ ] Валидация данных реализована для обеих сущностей
- [ ] Методы `fromArray()` и `toArray()` реализованы
- [ ] Методы `fromJson()` и `toJson()` реализованы
- [ ] Метод `fromWebhookEvent()` реализован в `WebhookLogEntry`
- [ ] Метод `getCategory()` реализован в `WebhookEvent`
- [ ] Тесты созданы и проходят успешно
- [ ] Код соответствует стандартам PSR-12
- [ ] PHPDoc комментарии добавлены для всех методов
- [ ] **Структура `WebhookLogEntry::toArray()` соответствует ожиданиям Vue.js компонентов**
- [ ] **Поля `timestamp`, `event`, `category`, `ip`, `payload`, `details` присутствуют и в правильном формате**
- [ ] **Тестирование с Vue.js компонентами: проверка отображения в `WebhookLogList.vue` и `WebhookLogDetails.vue`**

---

## 🔍 Проверка выполнения

**Команды для проверки:**

```bash
# Проверить синтаксис PHP файлов
php -l src/WebhookLogs/Entity/WebhookEvent.php
php -l src/WebhookLogs/Entity/WebhookLogEntry.php

# Запустить тесты
php tests/test-entities.php

# Проверить структуру
tree src/WebhookLogs/Entity/
```

---

## 🔗 Связи с другими этапами

**Зависит от:**
- **TASK-018-02:** Использует `WebhookLogsConfig` и исключения
- **TASK-018-03:** Использует `WebhookLogsRepository` (опционально)

**Зависит от него:**
- **TASK-018-04-02:** EventDetailsExtractor будет использовать сущности
- **TASK-018-06:** Сервис логирования будет использовать сущности
- **TASK-018-07:** Handler сервис будет использовать сущности

---

## 📝 История правок

- **2025-12-07 15:13 (UTC+3, Брест):** Создана задача создания сущностей WebhookEvent и WebhookLogEntry

---

## 💡 Дополнительные рекомендации

1. **Расширяемость:**
   - В будущем можно добавить больше типов событий
   - Реализовать интерфейсы для разных типов событий
   - Добавить специфичные методы для каждого типа

2. **Производительность:**
   - Кеширование результатов валидации
   - Ленивая загрузка больших payload
   - Оптимизация сериализации

3. **Безопасность:**
   - Санитизация данных при создании
   - Валидация размера payload
   - Защита от переполнения памяти

4. **Документация:**
   - Примеры использования в PHPDoc
   - Описание структуры данных
   - Руководство по расширению

