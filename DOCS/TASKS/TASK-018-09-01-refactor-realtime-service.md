# TASK-018-09-01: Создание WebhookRealtimeService и рефакторинг webhook-realtime.php (базовая структура)

**Дата создания:** 2025-12-07 20:00 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js) + Рефактор-менеджер  
**Родительская задача:** [TASK-018](./TASK-018-refactor-webhook-logs-module.md)  
**Тип:** Рефакторинг

---

## 📋 Описание

Создать класс `WebhookRealtimeService` для инкапсуляции логики работы с SSE (Server-Sent Events) для реального времени. Превратить `webhook-realtime.php` в тонкий слой, который только обрабатывает HTTP-запросы и вызывает методы сервиса. Вынести всю логику проверки новых логов, отправки событий и управления соединениями в сервис.

**Цель этапа:**
- Создать класс `WebhookRealtimeService` для работы с SSE
- Превратить `webhook-realtime.php` в тонкий слой (только точка входа)
- Вынести логику проверки новых логов в сервис
- Интегрировать с `WebhookLogsRepository` (создан в TASK-018-03)
- Использовать сущности `WebhookLogEntry` (созданы в TASK-018-04-01)
- Сохранить обратную совместимость с Vue.js интерфейсом (useRealtime composable)

---

## 🎯 Контекст

Это первая часть девятого этапа рефакторинга модуля логирования вебхуков (TASK-018). На основе созданных компонентов (Repository, Entity, Config) создаётся сервис для работы с SSE, который обеспечивает передачу новых логов вебхуков в реальном времени для Vue.js интерфейса.

**Текущее состояние:**
- `webhook-realtime.php` содержит всю логику (161 строка)
- Глобальные функции `sendEvent()`, `sendComment()`, `checkForNewLogs()`
- Прямая работа с файлами через `file_get_contents()` и `glob()`
- Нет использования Repository и сущностей
- Нет обработки ошибок через исключения
- Простая проверка новых логов без оптимизации

**Целевое состояние:**
- `WebhookRealtimeService` инкапсулирует всю бизнес-логику SSE
- `webhook-realtime.php` становится тонким слоем (30-40 строк)
- Использование `WebhookLogsRepository` для работы с файлами
- Использование `WebhookLogEntry` для типизации данных
- Единообразная обработка ошибок через исключения
- Оптимизированная проверка новых логов

**Связи:**
- Зависит от: TASK-018-02 (Config), TASK-018-03 (Repository), TASK-018-04-01 (Entity)
- Зависит от него: TASK-018-09-02 (оптимизация и расширение)
- **Vue.js:** SSE endpoint используется `useRealtime` composable из `vue-app/src/composables/useRealtime.js`. Формат событий должен остаться совместимым:
  - События: `connected`, `new_logs`, `error`, `timeout`, `closed`
  - Формат данных: `{ logs: [...], count: number, timestamp: string }`

---

## 📁 Модули и компоненты

### Файлы для создания:

1. **`src/WebhookLogs/Service/WebhookRealtimeService.php`**
   - Основной сервис для работы с SSE
   - Методы: `checkForNewLogs()`, `sendEvent()`, `sendComment()`, `run()`
   - Интеграция с Repository и Entity

### Файлы для изменения:

1. **`api/webhook-realtime.php`**
   - Превратить в тонкий слой
   - Только обработка HTTP-запросов и настройка SSE
   - Вызов методов `WebhookRealtimeService`

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Анализ текущей логики webhook-realtime.php

**1.1. Выявить все операции:**

**Из `webhook-realtime.php`:**
- Настройка времени выполнения и заголовков SSE (строки 7-26)
- Функция `sendEvent()` для отправки событий (строки 28-35)
- Функция `sendComment()` для keep-alive (строки 37-42)
- Функция `checkForNewLogs()` для проверки новых логов (строки 44-87)
- Получение параметров из `$_GET` (строки 89-92)
- Отправка начального события `connected` (строки 94-98)
- Основной цикл проверки (строки 100-147)
- Обработка ошибок (строки 148-153)
- Закрытие соединения (строки 155-159)

**1.2. Определить, что вынести в сервис:**

**В сервис:**
- Проверка новых логов через Repository
- Отправка событий SSE
- Отправка keep-alive комментариев
- Управление состоянием соединения
- Обработка таймаутов
- Логика основного цикла

**В endpoint (webhook-realtime.php):**
- Настройка заголовков SSE
- Настройка времени выполнения
- Отключение буферизации
- Получение параметров из `$_GET`
- Создание экземпляра сервиса
- Вызов метода `run()` сервиса
- Обработка исключений

**Результат шага 1:**
- Понимание текущей логики
- Разделение ответственности между endpoint и сервисом

**1.3. Создать карту миграции:**

**Таблица соответствия старого и нового кода:**

| Старый код (webhook-realtime.php) | Новый код (WebhookRealtimeService) | Примечание |
|-----------------------------------|-----------------------------------|------------|
| `sendEvent($event, $data)` | `$service->sendEvent($event, $data)` | Метод сервиса |
| `sendComment($comment)` | `$service->sendComment($comment)` | Метод сервиса |
| `checkForNewLogs($lastTimestamp)` | `$service->checkForNewLogs($lastTimestamp)` | Использует Repository |
| `file_get_contents($logFile)` | `$repository->read()` | Используется Repository |
| `json_decode($content, true)` | `WebhookLogEntry::fromArray()` | Используются сущности |
| Основной цикл `while (true)` | `$service->run()` | Инкапсулирован в сервис |

**Результат шага 1.3:**
- Карта миграции создана
- Понимание соответствия старого и нового кода

---

### Шаг 2: Создание базовой структуры WebhookRealtimeService

**2.1. Создать файл `src/WebhookLogs/Service/WebhookRealtimeService.php`:**

```php
<?php
/**
 * Сервис для работы с SSE (Server-Sent Events) для реального времени
 * 
 * Расположение: src/WebhookLogs/Service/WebhookRealtimeService.php
 * 
 * Инкапсулирует всю логику работы с SSE:
 * - Проверка новых логов через Repository
 * - Отправка событий клиенту
 * - Управление соединением
 * - Обработка таймаутов и ошибок
 */
namespace WebhookLogs\Service;

use WebhookLogs\Repository\WebhookLogsRepository;
use WebhookLogs\Entity\WebhookLogEntry;
use WebhookLogs\Config\WebhookLogsConfig;
use WebhookLogs\Exception\WebhookLoggingException;
use WebhookLogs\Exception\WebhookException;

class WebhookRealtimeService
{
    /**
     * Репозиторий для работы с файлами логов
     * 
     * @var WebhookLogsRepository
     */
    protected WebhookLogsRepository $repository;
    
    /**
     * Последний известный timestamp
     * 
     * @var string|null
     */
    protected ?string $lastTimestamp = null;
    
    /**
     * Время начала работы сервиса
     * 
     * @var int
     */
    protected int $startTime;
    
    /**
     * Время последнего keep-alive
     * 
     * @var int
     */
    protected int $lastKeepAlive;
    
    /**
     * Конструктор
     * 
     * @param WebhookLogsRepository|null $repository Репозиторий (если null, создаётся новый)
     * @param string|null $lastTimestamp Последний известный timestamp
     */
    public function __construct(?WebhookLogsRepository $repository = null, ?string $lastTimestamp = null)
    {
        $this->repository = $repository ?? new WebhookLogsRepository();
        $this->lastTimestamp = $lastTimestamp;
        $this->startTime = time();
        $this->lastKeepAlive = time();
    }
    
    /**
     * Запуск основного цикла SSE
     * 
     * Выполняет проверку новых логов и отправку событий клиенту
     * 
     * @return void
     * @throws WebhookException При критической ошибке
     */
    public function run(): void
    {
        // Отправка начального события
        $this->sendEvent('connected', [
            'message' => 'Connected to realtime stream',
            'timestamp' => date('c')
        ]);
        
        // Получение интервалов из конфигурации
        $checkInterval = WebhookLogsConfig::getRealtimeCheckInterval();
        $keepAliveInterval = WebhookLogsConfig::getRealtimeKeepAliveInterval();
        $maxConnectionTime = WebhookLogsConfig::getRealtimeMaxConnectionTime();
        
        try {
            while (true) {
                // Проверка разрыва соединения
                if ($this->isConnectionAborted()) {
                    break;
                }
                
                // Проверка новых логов
                $newLogs = $this->checkForNewLogs();
                
                if (!empty($newLogs)) {
                    // Обновление последнего timestamp
                    $lastLog = end($newLogs);
                    if ($lastLog instanceof WebhookLogEntry) {
                        $this->lastTimestamp = $lastLog->getTimestamp()->format('c');
                    } elseif (isset($lastLog['timestamp'])) {
                        $this->lastTimestamp = $lastLog['timestamp'];
                    }
                    
                    // Отправка новых логов
                    $this->sendEvent('new_logs', [
                        'logs' => $this->formatLogsForClient($newLogs),
                        'count' => count($newLogs),
                        'timestamp' => date('c')
                    ]);
                }
                
                // Keep-alive для поддержания соединения
                if (time() - $this->lastKeepAlive >= $keepAliveInterval) {
                    $this->sendComment('keep-alive');
                    $this->lastKeepAlive = time();
                }
                
                // Пауза перед следующей проверкой
                sleep($checkInterval);
                
                // Проверка таймаута соединения
                if (time() - $this->startTime > $maxConnectionTime) {
                    $this->sendEvent('timeout', [
                        'message' => 'Connection timeout, please reconnect',
                        'timestamp' => date('c')
                    ]);
                    break;
                }
            }
        } catch (WebhookException $e) {
            // Критическая ошибка вебхука
            $this->sendEvent('error', [
                'message' => 'Server error: ' . $e->getMessage(),
                'timestamp' => date('c'),
                'error_type' => $e->getType()
            ]);
            throw $e;
        } catch (\Exception $e) {
            // Неожиданная ошибка
            $this->sendEvent('error', [
                'message' => 'Server error: ' . $e->getMessage(),
                'timestamp' => date('c')
            ]);
            
            // Логирование ошибки
            error_log("WebhookRealtimeService error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            
            throw new WebhookLoggingException(
                "Realtime service error: " . $e->getMessage(),
                'realtime',
                ['exception' => get_class($e)]
            );
        } finally {
            // Закрытие соединения
            $this->sendEvent('closed', [
                'message' => 'Connection closed',
                'timestamp' => date('c')
            ]);
        }
    }
    
    /**
     * Проверка новых логов
     * 
     * @return array Массив WebhookLogEntry или массивов (для обратной совместимости)
     * @throws WebhookLoggingException При ошибке чтения логов
     */
    protected function checkForNewLogs(): array
    {
        $newLogs = [];
        
        // Получение текущей даты и часа
        $now = new \DateTime('now', new \DateTimeZone(WebhookLogsConfig::getTimezone()));
        $date = $now->format('Y-m-d');
        $hour = (int)$now->format('H');
        
        // Категории для проверки
        $categories = WebhookLogsConfig::getCategories();
        
        foreach ($categories as $category) {
            try {
                // Чтение логов через Repository
                $entries = $this->repository->read($category, $date, $hour);
                
                // Преобразование массивов в WebhookLogEntry
                foreach ($entries as $entryData) {
                    try {
                        // Убеждаемся, что категория установлена
                        if (!isset($entryData['category'])) {
                            $entryData['category'] = $category;
                        }
                        
                        $entry = WebhookLogEntry::fromArray($entryData);
                        
                        // Проверка, что лог новее последнего известного
                        if ($this->lastTimestamp === null || 
                            $entry->getTimestamp()->format('c') > $this->lastTimestamp) {
                            $newLogs[] = $entry;
                        }
                    } catch (\Exception $e) {
                        // Логируем ошибку, но продолжаем обработку
                        error_log("Failed to create WebhookLogEntry: " . $e->getMessage());
                    }
                }
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
        
        return $newLogs;
    }
    
    /**
     * Получить timestamp из записи лога
     * 
     * @param WebhookLogEntry|array $log Запись лога
     * @return int Unix timestamp
     */
    protected function getLogTimestamp($log): int
    {
        if ($log instanceof WebhookLogEntry) {
            return $log->getTimestamp()->getTimestamp();
        }
        
        // Для обратной совместимости с массивами
        if (isset($log['timestamp'])) {
            $timestamp = strtotime($log['timestamp']);
            return $timestamp !== false ? $timestamp : 0;
        }
        
        return 0;
    }
    
    /**
     * Форматирование логов для отправки клиенту
     * 
     * Преобразует WebhookLogEntry в массивы для JSON
     * 
     * @param array $logs Массив WebhookLogEntry
     * @return array Массив массивов (для JSON)
     */
    protected function formatLogsForClient(array $logs): array
    {
        return array_map(function($log) {
            if ($log instanceof WebhookLogEntry) {
                return $log->toArray();
            }
            return $log; // Если уже массив (для обратной совместимости)
        }, $logs);
    }
    
    /**
     * Отправка события SSE
     * 
     * @param string $event Тип события
     * @param array $data Данные события
     * @return void
     */
    public function sendEvent(string $event, array $data): void
    {
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        echo "event: {$event}\n";
        echo "data: {$json}\n\n";
        $this->flushOutput();
    }
    
    /**
     * Отправка комментария SSE (keep-alive)
     * 
     * @param string $comment Комментарий
     * @return void
     */
    public function sendComment(string $comment): void
    {
        echo ": {$comment}\n\n";
        $this->flushOutput();
    }
    
    /**
     * Сброс буфера вывода
     * 
     * @return void
     */
    protected function flushOutput(): void
    {
        if (ob_get_level() > 0) {
            ob_flush();
        }
        flush();
    }
    
    /**
     * Проверка разрыва соединения
     * 
     * @return bool true если соединение разорвано
     */
    protected function isConnectionAborted(): bool
    {
        return connection_aborted();
    }
    
    /**
     * Получить последний известный timestamp
     * 
     * @return string|null
     */
    public function getLastTimestamp(): ?string
    {
        return $this->lastTimestamp;
    }
    
    /**
     * Установить последний известный timestamp
     * 
     * @param string|null $timestamp
     * @return void
     */
    public function setLastTimestamp(?string $timestamp): void
    {
        $this->lastTimestamp = $timestamp;
    }
}
```

**Результат шага 2:**
- Базовая структура сервиса создана
- Основные методы реализованы
- Интеграция с Repository и Entity добавлена

---

### Шаг 3: Добавление настроек в Config

**3.1. Обновить `src/WebhookLogs/Config/WebhookLogsConfig.php`:**

```php
// Добавить в класс WebhookLogsConfig

/**
 * Получить интервал проверки новых логов для SSE (в секундах)
 * 
 * @return int Интервал в секундах
 */
public static function getRealtimeCheckInterval(): int
{
    return 2; // Проверка каждые 2 секунды
}

/**
 * Получить интервал keep-alive для SSE (в секундах)
 * 
 * @return int Интервал в секундах
 */
public static function getRealtimeKeepAliveInterval(): int
{
    return 30; // Keep-alive каждые 30 секунд
}

/**
 * Получить максимальное время соединения SSE (в секундах)
 * 
 * @return int Максимальное время в секундах
 */
public static function getRealtimeMaxConnectionTime(): int
{
    return 300; // 5 минут
}

/**
 * Получить таймзону для работы с датами
 * 
 * @return string Таймзона (например, 'Europe/Minsk')
 */
public static function getTimezone(): string
{
    return 'Europe/Minsk';
}
```

**Результат шага 3:**
- Настройки SSE добавлены в Config
- Интервалы настраиваемые

---

### Шаг 4: Рефакторинг webhook-realtime.php в тонкий слой

**4.1. Создать резервную копию старого файла:**

```bash
# Создать резервную копию перед рефакторингом
cp api/webhook-realtime.php api/webhook-realtime.php.backup
```

**4.2. Обновить `api/webhook-realtime.php`:**

```php
<?php
/**
 * API endpoint для Server-Sent Events (SSE)
 * Отправляет новые логи вебхуков в реальном времени
 * 
 * Расположение: api/webhook-realtime.php
 * 
 * Тонкий слой для обработки HTTP-запросов SSE.
 * Вся бизнес-логика вынесена в WebhookRealtimeService.
 * 
 * Документация:
 * - https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
 * - https://context7.com/bitrix24/rest/webhook/
 */

require_once(__DIR__ . '/../crest.php');
require_once(__DIR__ . '/../src/WebhookLogs/bootstrap.php');

use WebhookLogs\Service\WebhookRealtimeService;
use WebhookLogs\Exception\WebhookException;
use WebhookLogs\Exception\WebhookLoggingException;

// Настройка времени выполнения (для долгих соединений)
set_time_limit(0);
ignore_user_abort(false);

// Заголовки для SSE
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('X-Accel-Buffering: no'); // Отключение буферизации в Nginx

// Отключение буферизации вывода
if (ob_get_level()) {
    ob_end_clean();
}

// Отключение сжатия для SSE
if (function_exists('apache_setenv')) {
    apache_setenv('no-gzip', 1);
}
ini_set('zlib.output_compression', 0);

try {
    // TODO: Проверка доступа (на основе отдела пользователя)
    // Пока проверка доступа отключена для разработки
    // if (!hasAccessToWebhookLogs()) {
    //     http_response_code(403);
    //     echo "event: error\n";
    //     echo "data: " . json_encode(['message' => 'Access denied']) . "\n\n";
    //     exit;
    // }
    
    // Получение параметров из запроса
    $lastTimestamp = isset($_GET['last_timestamp']) && $_GET['last_timestamp'] !== '' 
        ? trim($_GET['last_timestamp']) 
        : null;
    
    // Валидация формата timestamp (опционально)
    if ($lastTimestamp !== null) {
        $timestamp = strtotime($lastTimestamp);
        if ($timestamp === false) {
            // Невалидный формат timestamp, игнорируем
            $lastTimestamp = null;
        }
    }
    
    // Создание сервиса
    $realtimeService = new WebhookRealtimeService(null, $lastTimestamp);
    
    // Запуск основного цикла SSE
    $realtimeService->run();
    
} catch (WebhookLoggingException $e) {
    // Ошибка логирования
    echo "event: error\n";
    echo "data: " . json_encode([
        'message' => 'Logging error: ' . $e->getMessage(),
        'timestamp' => date('c'),
        'error_type' => $e->getLoggingType()
    ], JSON_UNESCAPED_UNICODE) . "\n\n";
    
    // Логирование ошибки
    error_log("Webhook realtime API error: " . $e->getMessage());
    
} catch (WebhookException $e) {
    // Общая ошибка вебхука
    echo "event: error\n";
    echo "data: " . json_encode([
        'message' => 'Webhook error: ' . $e->getMessage(),
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE) . "\n\n";
    
    // Логирование ошибки
    error_log("Webhook realtime API error: " . $e->getMessage());
    
} catch (\Exception $e) {
    // Неожиданная ошибка
    echo "event: error\n";
    echo "data: " . json_encode([
        'message' => 'Internal server error: ' . $e->getMessage(),
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE) . "\n\n";
    
    // Логирование ошибки
    error_log("Webhook realtime API error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
}
```

**Результат шага 4:**
- `webhook-realtime.php` превращён в тонкий слой
- Вся логика вынесена в сервис
- Обработка ошибок улучшена

---

### Шаг 5: Тестирование базовой функциональности

**5.1. Создать тестовый скрипт:**

**Файл:** `tests/test-webhook-realtime-service.php`

```php
<?php
/**
 * Тестирование WebhookRealtimeService
 * 
 * Использование: php tests/test-webhook-realtime-service.php
 * 
 * Внимание: Этот тест проверяет только базовую функциональность.
 * Полное тестирование SSE требует HTTP-запросов.
 */

require_once __DIR__ . '/../src/WebhookLogs/bootstrap.php';

use WebhookLogs\Service\WebhookRealtimeService;
use WebhookLogs\Exception\WebhookException;

echo "=== Тестирование WebhookRealtimeService ===\n\n";

try {
    // Тест 1: Создание сервиса
    echo "Тест 1: Создание сервиса...\n";
    $service = new WebhookRealtimeService();
    echo "✅ Сервис создан\n\n";
    
    // Тест 2: Установка последнего timestamp
    echo "Тест 2: Установка последнего timestamp...\n";
    $service->setLastTimestamp('2025-12-07T15:00:00+03:00');
    $timestamp = $service->getLastTimestamp();
    echo "✅ Timestamp установлен: {$timestamp}\n\n";
    
    // Тест 3: Проверка новых логов (без запуска цикла)
    echo "Тест 3: Проверка новых логов (через рефлексию)...\n";
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('checkForNewLogs');
    $method->setAccessible(true);
    
    // Установка timestamp на будущее, чтобы не получить старые логи
    $service->setLastTimestamp(date('c', strtotime('+1 hour')));
    
    $newLogs = $method->invoke($service);
    echo "✅ Проверка выполнена, найдено новых логов: " . count($newLogs) . "\n\n";
    
    // Тест 4: Форматирование логов для клиента
    echo "Тест 4: Форматирование логов для клиента...\n";
    if (!empty($newLogs)) {
        $formatMethod = $reflection->getMethod('formatLogsForClient');
        $formatMethod->setAccessible(true);
        $formatted = $formatMethod->invoke($service, $newLogs);
        echo "✅ Логи отформатированы: " . count($formatted) . " записей\n";
        if (!empty($formatted)) {
            echo "  - Пример записи: " . json_encode($formatted[0], JSON_UNESCAPED_UNICODE) . "\n";
        }
    } else {
        echo "⚠️  Нет логов для форматирования\n";
    }
    echo "\n";
    
    echo "=== Тестирование завершено ===\n";
    echo "\n⚠️  Внимание: Полное тестирование SSE требует HTTP-запросов через EventSource API\n";
    
} catch (\Exception $e) {
    echo "❌ Критическая ошибка: " . $e->getMessage() . "\n";
    echo "Файл: " . $e->getFile() . "\n";
    echo "Строка: " . $e->getLine() . "\n";
    exit(1);
}
```

**5.2. Протестировать через HTTP (вручную):**

**Создать HTML-страницу для тестирования:**

**Файл:** `tests/test-sse-manual.html`

```html
<!DOCTYPE html>
<html>
<head>
    <title>SSE Test</title>
</head>
<body>
    <h1>SSE Test для webhook-realtime.php</h1>
    <div id="status">Отключено</div>
    <div id="logs"></div>
    <button onclick="connect()">Подключиться</button>
    <button onclick="disconnect()">Отключиться</button>
    
    <script>
        let eventSource = null;
        
        function connect() {
            if (eventSource) {
                eventSource.close();
            }
            
            const url = '/api/webhook-realtime.php?last_timestamp=' + 
                encodeURIComponent(new Date(Date.now() - 60000).toISOString());
            
            eventSource = new EventSource(url);
            
            eventSource.onopen = () => {
                document.getElementById('status').textContent = 'Подключено';
            };
            
            eventSource.addEventListener('connected', (e) => {
                const data = JSON.parse(e.data);
                console.log('Connected:', data);
                document.getElementById('status').textContent = 'Подключено: ' + data.timestamp;
            });
            
            eventSource.addEventListener('new_logs', (e) => {
                const data = JSON.parse(e.data);
                console.log('New logs:', data);
                const logsDiv = document.getElementById('logs');
                logsDiv.innerHTML += '<p>Получено ' + data.count + ' новых логов</p>';
            });
            
            eventSource.addEventListener('error', (e) => {
                const data = JSON.parse(e.data);
                console.error('Error:', data);
                document.getElementById('status').textContent = 'Ошибка: ' + data.message;
            });
            
            eventSource.addEventListener('timeout', (e) => {
                const data = JSON.parse(e.data);
                console.warn('Timeout:', data);
                document.getElementById('status').textContent = 'Таймаут: ' + data.message;
            });
            
            eventSource.addEventListener('closed', (e) => {
                const data = JSON.parse(e.data);
                console.log('Closed:', data);
                document.getElementById('status').textContent = 'Закрыто';
            });
            
            eventSource.onerror = (error) => {
                console.error('EventSource error:', error);
                document.getElementById('status').textContent = 'Ошибка соединения';
            };
        }
        
        function disconnect() {
            if (eventSource) {
                eventSource.close();
                eventSource = null;
                document.getElementById('status').textContent = 'Отключено';
            }
        }
    </script>
</body>
</html>
```

**Результат шага 5:**
- Тестовый скрипт создан
- HTML-страница для ручного тестирования создана
- Основная функциональность протестирована

---

### Шаг 6: Проверка совместимости с Vue.js

**6.1. Проверить формат событий:**

**Ожидаемый формат (совместимый с Vue.js):**

**Событие `connected`:**
```
event: connected
data: {"message":"Connected to realtime stream","timestamp":"2025-12-07T20:00:00+03:00"}
```

**Событие `new_logs`:**
```
event: new_logs
data: {
  "logs": [
    {
      "timestamp": "2025-12-07T15:30:00+03:00",
      "event": "ONTASKADD",
      "category": "tasks",
      "ip": "192.168.1.1",
      "payload": {...},
      "details": {...}
    }
  ],
  "count": 1,
  "timestamp": "2025-12-07T20:00:00+03:00"
}
```

**Событие `error`:**
```
event: error
data: {"message":"Server error: ...","timestamp":"2025-12-07T20:00:00+03:00"}
```

**Событие `timeout`:**
```
event: timeout
data: {"message":"Connection timeout, please reconnect","timestamp":"2025-12-07T20:00:00+03:00"}
```

**Событие `closed`:**
```
event: closed
data: {"message":"Connection closed","timestamp":"2025-12-07T20:00:00+03:00"}
```

**6.2. Проверить работу с Vue.js composable:**

1. Открыть `/admin/webhook-logs` в браузере
2. Включить реальное время (кнопка "Включить автообновление")
3. Проверить подключение к SSE endpoint
4. Проверить получение новых событий
5. Проверить обработку ошибок
6. Проверить обработку таймаута
7. Проверить переподключение при разрыве соединения

**6.3. Создать чек-лист для ручного тестирования:**

**Файл:** `tests/manual-test-sse-integration-checklist.md`

```markdown
# Чек-лист ручного тестирования SSE интеграции с Vue.js

## Базовая функциональность
- [ ] SSE endpoint `/api/webhook-realtime.php` открывается без ошибок
- [ ] Событие `connected` получается при подключении
- [ ] Новые логи отправляются через событие `new_logs`
- [ ] Keep-alive комментарии отправляются каждые 30 секунд
- [ ] Соединение закрывается корректно при отключении

## Интеграция с Vue.js
- [ ] `useRealtime` composable подключается к endpoint
- [ ] Состояние `connectionState` обновляется корректно
- [ ] Новые логи добавляются в `newLogs`
- [ ] Счётчик `newLogsCount` обновляется
- [ ] Callback `onNewLogs` вызывается при новых логах

## Обработка ошибок
- [ ] Ошибки отправляются через событие `error`
- [ ] Vue.js обрабатывает ошибки корректно
- [ ] Сообщения об ошибках отображаются пользователю

## Таймауты и переподключение
- [ ] Таймаут отправляется через событие `timeout`
- [ ] Vue.js переподключается при таймауте
- [ ] Переподключение работает после разрыва соединения

## Производительность
- [ ] Соединение не создаёт нагрузку на сервер
- [ ] Проверка новых логов выполняется за разумное время
- [ ] Нет утечек памяти при длительных соединениях
```

**Результат шага 6:**
- Формат событий соответствует ожиданиям Vue.js
- Vue.js composable работает корректно
- Чек-лист для ручного тестирования создан

---

## 📊 Критерии приёмки

- [ ] Класс `WebhookRealtimeService` создан и реализован
- [ ] Метод `run()` реализован с поддержкой основного цикла SSE
- [ ] Методы `checkForNewLogs()`, `sendEvent()`, `sendComment()` реализованы
- [ ] Интеграция с `WebhookLogsRepository` реализована
- [ ] Использование `WebhookLogEntry` для типизации данных
- [ ] `webhook-realtime.php` превращён в тонкий слой (30-40 строк)
- [ ] Обработка ошибок через исключения реализована
- [ ] Настройки SSE добавлены в Config
- [ ] Тесты созданы и проходят успешно
- [ ] Код соответствует стандартам PSR-12
- [ ] PHPDoc комментарии добавлены для всех методов
- [ ] **Формат событий SSE совместим с Vue.js интерфейсом**
- [ ] **Vue.js composable `useRealtime` работает корректно с новым endpoint**
- [ ] **Все события (connected, new_logs, error, timeout, closed) работают**
- [ ] **Keep-alive комментарии отправляются регулярно**

---

## 🔍 Проверка выполнения

**Команды для проверки:**

```bash
# Проверить синтаксис PHP файлов
php -l src/WebhookLogs/Service/WebhookRealtimeService.php
php -l api/webhook-realtime.php

# Запустить тесты
php tests/test-webhook-realtime-service.php

# Проверить структуру
tree src/WebhookLogs/Service/

# Проверить работу через HTTP (вручную)
# Открыть tests/test-sse-manual.html в браузере
```

**Ручное тестирование:**
1. Открыть `/admin/webhook-logs` в браузере
2. Включить реальное время
3. Проверить подключение к SSE endpoint
4. Проверить получение новых событий
5. Проверить обработку ошибок
6. Проверить обработку таймаута

---

## 🔗 Связи с другими этапами

**Зависит от:**
- **TASK-018-02:** Использует `WebhookLogsConfig`
- **TASK-018-03:** Использует `WebhookLogsRepository`
- **TASK-018-04-01:** Использует `WebhookLogEntry`

**Зависит от него:**
- **TASK-018-09-02:** Оптимизация и расширение функциональности

---

## 📝 История правок

- **2025-12-07 20:00 (UTC+3, Брест):** Создана задача создания WebhookRealtimeService и рефакторинга webhook-realtime.php (базовая структура)

---

## 💡 Дополнительные рекомендации

1. **Производительность:**
   - В следующем этапе (09-02) будет добавлена оптимизация проверки новых логов
   - Кеширование последних проверенных логов
   - Оптимизация работы с большими объёмами данных

2. **Расширяемость:**
   - Легко добавлять новые типы событий
   - Поддержка фильтрации событий на стороне сервера
   - Гибкая настройка интервалов

3. **Безопасность:**
   - Проверка прав доступа перед подключением
   - Ограничение количества одновременных соединений
   - Защита от DoS атак

4. **Документация:**
   - Примеры использования в PHPDoc
   - Описание формата событий SSE
   - Руководство по расширению



