# TASK-018-08-01: Создание WebhookLogsApiService и рефакторинг webhook-logs.php (базовая структура)

**Дата создания:** 2025-12-07 18:00 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js) + Рефактор-менеджер  
**Родительская задача:** [TASK-018](./TASK-018-refactor-webhook-logs-module.md)  
**Тип:** Рефакторинг

---

## 📋 Описание

Создать класс `WebhookLogsApiService` для инкапсуляции логики работы с API логов вебхуков. Превратить `webhook-logs.php` в тонкий слой, который только обрабатывает HTTP-запросы и вызывает методы сервиса. Вынести всю логику фильтрации, сортировки и пагинации в сервис.

**Цель этапа:**
- Создать класс `WebhookLogsApiService` для работы с логами
- Превратить `webhook-logs.php` в тонкий слой (только точка входа)
- Вынести логику фильтрации, сортировки, пагинации в сервис
- Интегрировать с `WebhookLogsRepository` (создан в TASK-018-03)
- Использовать сущности `WebhookLogEntry` (созданы в TASK-018-04-01)
- Сохранить обратную совместимость с Vue.js интерфейсом

---

## 🎯 Контекст

Это первая часть восьмого этапа рефакторинга модуля логирования вебхуков (TASK-018). На основе созданных компонентов (Repository, Entity, Config) создаётся сервис для работы с API, который станет основой для всех запросов от Vue.js интерфейса.

**Текущее состояние:**
- `webhook-logs.php` содержит всю логику (154 строки)
- Логика фильтрации, сортировки, пагинации встроена в endpoint
- Прямая работа с файлами через `file_get_contents()` и `glob()`
- Нет использования Repository и сущностей
- Нет обработки ошибок через исключения

**Целевое состояние:**
- `WebhookLogsApiService` инкапсулирует всю бизнес-логику
- `webhook-logs.php` становится тонким слоем (20-30 строк)
- Использование `WebhookLogsRepository` для работы с файлами
- Использование `WebhookLogEntry` для типизации данных
- Единообразная обработка ошибок через исключения

**Связи:**
- Зависит от: TASK-018-02 (Config), TASK-018-03 (Repository), TASK-018-04-01 (Entity)
- Зависит от него: TASK-018-08-02 (оптимизация и расширение)
- **Vue.js:** API endpoint используется `WebhookLogsApiService` (Vue.js) из `vue-app/src/services/webhook-logs-api.js`. Формат ответа должен остаться совместимым:
  ```json
  {
    "success": true,
    "logs": [...],
    "pagination": {...}
  }
  ```

---

## 📁 Модули и компоненты

### Файлы для создания:

1. **`src/WebhookLogs/Service/WebhookLogsApiService.php`**
   - Основной сервис для работы с API логов
   - Методы: `getLogs()`, `filterLogs()`, `sortLogs()`, `paginateLogs()`
   - Интеграция с Repository и Entity

### Файлы для изменения:

1. **`api/webhook-logs.php`**
   - Превратить в тонкий слой
   - Только обработка HTTP-запросов
   - Вызов методов `WebhookLogsApiService`

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Анализ текущей логики webhook-logs.php

**1.1. Выявить все операции:**

**Из `webhook-logs.php`:**
- Получение параметров из `$_GET` (строки 42-47)
- Валидация параметров (строки 49-51)
- Определение папки логов (строки 53-64)
- Чтение файлов через `readLogsForDate()` (строки 69-93)
- Фильтрация по типу события (строки 114-120)
- Сортировка по дате (строки 122-127)
- Пагинация (строки 129-132)
- Формирование ответа (строки 134-144)

**1.2. Определить, что вынести в сервис:**

**В сервис:**
- Валидация параметров
- Чтение логов через Repository
- Фильтрация по всем параметрам
- Сортировка
- Пагинация
- Формирование структуры ответа

**В endpoint (webhook-logs.php):**
- Обработка HTTP-запросов (метод, headers)
- Получение параметров из `$_GET`
- Вызов методов сервиса
- Формирование HTTP-ответа
- Обработка исключений

**Результат шага 1:**
- Понимание текущей логики
- Разделение ответственности между endpoint и сервисом

**1.3. Создать карту миграции:**

**Таблица соответствия старого и нового кода:**

| Старый код (webhook-logs.php) | Новый код (WebhookLogsApiService) | Примечание |
|-------------------------------|-----------------------------------|------------|
| `$_GET['category']` | `$filters['category']` | Параметры нормализуются |
| `$_GET['event']` | `$filters['event']` | Параметры нормализуются |
| `$_GET['date']` | `$filters['date']` | Параметры нормализуются |
| `$_GET['hour']` | `$filters['hour']` | Параметры нормализуются |
| `readLogsForDate()` | `$repository->read()` | Используется Repository |
| `glob($pattern)` | `$repository->readByDate()` | Используется Repository |
| `json_decode(file_get_contents())` | `$repository->read()` | Инкапсулировано в Repository |
| `array_filter()` для event | `filterByEvent()` | Вынесено в метод |
| `usort()` для сортировки | `sortLogs()` | Вынесено в метод |
| `array_slice()` для пагинации | `paginateLogs()` | Вынесено в метод |

**Результат шага 1.3:**
- Карта миграции создана
- Понимание соответствия старого и нового кода

---

### Шаг 2: Создание базовой структуры WebhookLogsApiService

**2.1. Создать файл `src/WebhookLogs/Service/WebhookLogsApiService.php`:**

```php
<?php
/**
 * Сервис для работы с API логов вебхуков
 * 
 * Расположение: src/WebhookLogs/Service/WebhookLogsApiService.php
 * 
 * Инкапсулирует всю логику работы с API:
 * - Чтение логов через Repository
 * - Фильтрация по различным параметрам
 * - Сортировка записей
 * - Пагинация результатов
 * - Формирование структурированного ответа
 */
namespace WebhookLogs\Service;

use WebhookLogs\Repository\WebhookLogsRepository;
use WebhookLogs\Entity\WebhookLogEntry;
use WebhookLogs\Config\WebhookLogsConfig;
use WebhookLogs\Exception\WebhookLoggingException;
use WebhookLogs\Exception\WebhookValidationException;

class WebhookLogsApiService
{
    /**
     * Репозиторий для работы с файлами логов
     * 
     * @var WebhookLogsRepository
     */
    protected WebhookLogsRepository $repository;
    
    /**
     * Конструктор
     * 
     * @param WebhookLogsRepository|null $repository Репозиторий (если null, создаётся новый)
     */
    public function __construct(?WebhookLogsRepository $repository = null)
    {
        $this->repository = $repository ?? new WebhookLogsRepository();
    }
    
    /**
     * Получить логи с фильтрацией, сортировкой и пагинацией
     * 
     * @param array $filters Фильтры:
     *   - category: string|null (tasks, smart-processes, errors)
     *   - event: string|null (тип события)
     *   - date: string|null (дата в формате YYYY-MM-DD)
     *   - hour: int|null (час 0-23)
     * @param int $page Номер страницы (начиная с 1)
     * @param int $limit Количество записей на странице
     * @return array Структурированный ответ:
     *   - success: bool
     *   - logs: array (массив WebhookLogEntry в виде массивов)
     *   - pagination: array (page, limit, total, pages)
     * @throws WebhookValidationException При невалидных параметрах
     * @throws WebhookLoggingException При ошибке чтения логов
     */
    public function getLogs(array $filters = [], int $page = 1, int $limit = 50): array
    {
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
        
        // Фильтрация
        if ($event !== null) {
            $allLogs = $this->filterByEvent($allLogs, $event);
        }
        
        // Сортировка
        $allLogs = $this->sortLogs($allLogs);
        
        // Пагинация
        $total = count($allLogs);
        $paginatedLogs = $this->paginateLogs($allLogs, $page, $limit);
        
        // Преобразование сущностей в массивы для JSON
        $logsArray = array_map(function($entry) {
            if ($entry instanceof WebhookLogEntry) {
                return $entry->toArray();
            }
            return $entry; // Если уже массив (для обратной совместимости)
        }, $paginatedLogs);
        
        // Формирование ответа
        return [
            'success' => true,
            'logs' => $logsArray,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => (int)ceil($total / $limit)
            ]
        ];
    }
    
    /**
     * Чтение логов через Repository
     * 
     * @param string|null $category Категория или null для всех
     * @param string $date Дата в формате YYYY-MM-DD
     * @param int|null $hour Час (0-23) или null для всех
     * @return array Массив WebhookLogEntry
     * @throws WebhookLoggingException При ошибке чтения
     */
    protected function readLogs(?string $category, string $date, ?int $hour = null): array
    {
        $allLogs = [];
        
        if ($category !== null) {
            // Чтение конкретной категории
            if (!WebhookLogsConfig::isValidCategory($category)) {
                throw new WebhookValidationException(
                    "Invalid category: {$category}",
                    'category',
                    ['category' => $category, 'valid_categories' => WebhookLogsConfig::getCategories()]
                );
            }
            
            $entries = $this->repository->read($category, $date, $hour);
            
            // Преобразование массивов в WebhookLogEntry
            foreach ($entries as $entryData) {
                try {
                    $entry = WebhookLogEntry::fromArray($entryData);
                    $allLogs[] = $entry;
                } catch (\Exception $e) {
                    // Логируем ошибку, но продолжаем обработку
                    error_log("Failed to create WebhookLogEntry: " . $e->getMessage());
                }
            }
        } else {
            // Чтение всех категорий
            $categories = WebhookLogsConfig::getCategories();
            foreach ($categories as $cat) {
                try {
                    $entries = $this->repository->read($cat, $date, $hour);
                    
                    foreach ($entries as $entryData) {
                        try {
                            // Убеждаемся, что категория установлена
                            if (!isset($entryData['category'])) {
                                $entryData['category'] = $cat;
                            }
                            
                            $entry = WebhookLogEntry::fromArray($entryData);
                            $allLogs[] = $entry;
                        } catch (\Exception $e) {
                            error_log("Failed to create WebhookLogEntry: " . $e->getMessage());
                        }
                    }
                } catch (WebhookLoggingException $e) {
                    // Логируем ошибку чтения категории, но продолжаем
                    error_log("Failed to read category {$cat}: " . $e->getMessage());
                }
            }
        }
        
        return $allLogs;
    }
    
    /**
     * Фильтрация логов по типу события
     * 
     * @param array $logs Массив WebhookLogEntry
     * @param string $event Тип события
     * @return array Отфильтрованный массив
     */
    protected function filterByEvent(array $logs, string $event): array
    {
        return array_filter($logs, function($log) use ($event) {
            if ($log instanceof WebhookLogEntry) {
                return $log->getEvent() === $event;
            }
            
            // Для обратной совместимости с массивами
            return isset($log['event']) && $log['event'] === $event;
        });
    }
    
    /**
     * Сортировка логов по дате (новые сначала)
     * 
     * @param array $logs Массив WebhookLogEntry
     * @return array Отсортированный массив
     */
    protected function sortLogs(array $logs): array
    {
        usort($logs, function($a, $b) {
            $timestampA = $this->getLogTimestamp($a);
            $timestampB = $this->getLogTimestamp($b);
            
            // Сортировка по убыванию (новые сначала)
            return $timestampB <=> $timestampA;
        });
        
        return array_values($logs); // Переиндексация
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
     * Пагинация логов
     * 
     * @param array $logs Массив всех логов
     * @param int $page Номер страницы
     * @param int $limit Количество записей на странице
     * @return array Массив логов для текущей страницы
     */
    protected function paginateLogs(array $logs, int $page, int $limit): array
    {
        $offset = ($page - 1) * $limit;
        return array_slice($logs, $offset, $limit);
    }
    
    /**
     * Нормализация параметров фильтров
     * 
     * Приводит параметры к единому формату, удаляет пустые значения
     * 
     * @param array $filters Исходные фильтры
     * @return array Нормализованные фильтры
     */
    protected function normalizeFilters(array $filters): array
    {
        $normalized = [];
        
        // Категория
        if (isset($filters['category']) && $filters['category'] !== null && $filters['category'] !== '') {
            $normalized['category'] = trim($filters['category']);
        }
        
        // Событие
        if (isset($filters['event']) && $filters['event'] !== null && $filters['event'] !== '') {
            $normalized['event'] = trim($filters['event']);
        }
        
        // Дата
        if (isset($filters['date']) && $filters['date'] !== null && $filters['date'] !== '') {
            $normalized['date'] = trim($filters['date']);
        }
        
        // Час
        if (isset($filters['hour']) && $filters['hour'] !== null && $filters['hour'] !== '') {
            $normalized['hour'] = (int)$filters['hour'];
        }
        
        return $normalized;
    }
    
    /**
     * Получить список доступных категорий
     * 
     * @return array Массив категорий
     */
    public function getAvailableCategories(): array
    {
        return WebhookLogsConfig::getCategories();
    }
    
    /**
     * Получить список уникальных типов событий из логов
     * 
     * @param string|null $category Категория для фильтрации (null = все)
     * @param string $date Дата в формате YYYY-MM-DD
     * @return array Массив уникальных типов событий
     */
    public function getAvailableEvents(?string $category = null, string $date = null): array
    {
        if ($date === null) {
            $date = date('Y-m-d');
        }
        
        $allLogs = $this->readLogs($category, $date);
        
        $events = [];
        foreach ($allLogs as $log) {
            if ($log instanceof WebhookLogEntry) {
                $event = $log->getEvent();
            } else {
                $event = $log['event'] ?? null;
            }
            
            if ($event !== null && !in_array($event, $events, true)) {
                $events[] = $event;
            }
        }
        
        sort($events);
        
        return $events;
    }
    
    /**
     * Валидация фильтров
     * 
     * @param array $filters Фильтры для валидации
     * @throws WebhookValidationException При невалидных фильтрах
     */
    protected function validateFilters(array $filters): void
    {
        // Валидация категории
        if (isset($filters['category']) && $filters['category'] !== null) {
            if (!WebhookLogsConfig::isValidCategory($filters['category'])) {
                throw new WebhookValidationException(
                    "Invalid category: {$filters['category']}",
                    'category',
                    ['category' => $filters['category'], 'valid_categories' => WebhookLogsConfig::getCategories()]
                );
            }
        }
        
        // Валидация даты
        if (isset($filters['date']) && $filters['date'] !== null) {
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $filters['date'])) {
                throw new WebhookValidationException(
                    "Invalid date format: {$filters['date']}",
                    'date',
                    ['date' => $filters['date'], 'expected_format' => 'YYYY-MM-DD']
                );
            }
        }
        
        // Валидация часа
        if (isset($filters['hour']) && $filters['hour'] !== null && $filters['hour'] !== '') {
            $hour = (int)$filters['hour'];
            if ($hour < 0 || $hour > 23) {
                throw new WebhookValidationException(
                    "Invalid hour: {$hour}",
                    'hour',
                    ['hour' => $hour, 'valid_range' => '0-23']
                );
            }
        }
    }
    
    /**
     * Валидация пагинации
     * 
     * @param int $page Номер страницы
     * @param int $limit Количество записей на странице
     * @throws WebhookValidationException При невалидных параметрах
     */
    protected function validatePagination(int $page, int $limit): void
    {
        if ($page < 1) {
            throw new WebhookValidationException(
                "Page must be greater than 0",
                'pagination',
                ['page' => $page]
            );
        }
        
        $minLimit = WebhookLogsConfig::getMinPaginationLimit();
        $maxLimit = WebhookLogsConfig::getMaxPaginationLimit();
        
        if ($limit < $minLimit || $limit > $maxLimit) {
            throw new WebhookValidationException(
                "Limit must be between {$minLimit} and {$maxLimit}",
                'pagination',
                ['limit' => $limit, 'min' => $minLimit, 'max' => $maxLimit]
            );
        }
    }
}
```

**Результат шага 2:**
- Базовая структура сервиса создана
- Основные методы реализованы
- Интеграция с Repository и Entity добавлена

---

### Шаг 3: Рефакторинг webhook-logs.php в тонкий слой

**3.1. Создать резервную копию старого файла:**

```bash
# Создать резервную копию перед рефакторингом
cp api/webhook-logs.php api/webhook-logs.php.backup
```

**3.2. Обновить `api/webhook-logs.php`:**

```php
<?php
/**
 * API endpoint для получения логов вебхуков
 * 
 * Расположение: api/webhook-logs.php
 * 
 * Тонкий слой для обработки HTTP-запросов.
 * Вся бизнес-логика вынесена в WebhookLogsApiService.
 * 
 * Документация:
 * - https://context7.com/bitrix24/rest/webhook/
 * - https://apidocs.bitrix24.ru/rest_help/general/webhooks/index.php
 */

require_once(__DIR__ . '/../crest.php');
require_once(__DIR__ . '/../src/WebhookLogs/bootstrap.php');

use WebhookLogs\Service\WebhookLogsApiService;
use WebhookLogs\Exception\WebhookException;
use WebhookLogs\Exception\WebhookValidationException;
use WebhookLogs\Exception\WebhookLoggingException;

// Установка заголовков
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

// Обработка preflight запросов
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Проверка метода запроса
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'error' => 'Method not allowed',
        'error_description' => 'Only GET method is allowed'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // TODO: Проверка доступа (на основе отдела пользователя)
    // Пока проверка доступа отключена для разработки
    // if (!hasAccessToWebhookLogs()) {
    //     http_response_code(403);
    //     echo json_encode(['error' => 'Access denied']);
    //     exit;
    // }
    
    // Получение параметров из запроса
    // Нормализация параметров (удаление пустых строк, приведение к нужным типам)
    $filters = [
        'category' => !empty($_GET['category']) && $_GET['category'] !== '' 
            ? trim($_GET['category']) 
            : null,
        'event' => !empty($_GET['event']) && $_GET['event'] !== '' 
            ? trim($_GET['event']) 
            : null,
        'date' => !empty($_GET['date']) && $_GET['date'] !== '' 
            ? trim($_GET['date']) 
            : date('Y-m-d'),
        'hour' => isset($_GET['hour']) && $_GET['hour'] !== '' && $_GET['hour'] !== null
            ? (int)$_GET['hour'] 
            : null
    ];
    
    // Валидация и нормализация пагинации
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    
    // Применение дефолтных значений из Config
    if ($page < 1) {
        $page = 1;
    }
    if ($limit < 1) {
        $limit = WebhookLogsConfig::getDefaultPaginationLimit();
    }
    $limit = WebhookLogsConfig::validatePaginationLimit($limit);
    
    // Создание сервиса
    $apiService = new WebhookLogsApiService();
    
    // Получение логов
    $result = $apiService->getLogs($filters, $page, $limit);
    
    // Успешный ответ
    // Используем настройки JSON из Config для консистентности
    $jsonOptions = WebhookLogsConfig::getJsonEncodeOptions();
    echo json_encode($result, $jsonOptions);
    
} catch (WebhookValidationException $e) {
    // Ошибка валидации (400 Bad Request)
    http_response_code($e->getHttpStatusCode());
    echo json_encode([
        'error' => 'Validation error',
        'error_description' => $e->getMessage(),
        'validation_type' => $e->getValidationType(),
        'context' => $e->getContext()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (WebhookLoggingException $e) {
    // Ошибка логирования (500 Internal Server Error)
    http_response_code($e->getHttpStatusCode());
    echo json_encode([
        'error' => 'Logging error',
        'error_description' => $e->getMessage(),
        'logging_type' => $e->getLoggingType(),
        'context' => $e->getContext()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (WebhookException $e) {
    // Общая ошибка вебхука
    http_response_code($e->getHttpStatusCode());
    echo json_encode([
        'error' => 'Webhook error',
        'error_description' => $e->getMessage(),
        'context' => $e->getContext()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (\Exception $e) {
    // Неожиданная ошибка
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'error_description' => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    // Логирование ошибки
    error_log("Webhook logs API error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
}
```

**3.3. Добавить логирование запросов (опционально, для отладки):**

```php
// Добавить в начало try блока (после получения параметров)

// Логирование запроса (только в режиме разработки)
if (defined('WP_DEBUG') && WP_DEBUG) {
    error_log(sprintf(
        '[WebhookLogsAPI] Request: filters=%s, page=%d, limit=%d',
        json_encode($filters),
        $page,
        $limit
    ));
}
```

**3.4. Добавить поддержку специальных параметров:**

```php
// Добавить после получения параметров

// Специальный параметр для получения только метаданных (без логов)
$metadataOnly = isset($_GET['metadata_only']) && $_GET['metadata_only'] === '1';

if ($metadataOnly) {
    // Возвращаем только метаданные (категории, события, статистику)
    $result = [
        'success' => true,
        'metadata' => [
            'categories' => $apiService->getAvailableCategories(),
            'events' => $apiService->getAvailableEvents($filters['category'], $filters['date']),
            'date' => $filters['date']
        ]
    ];
    echo json_encode($result, $jsonOptions);
    exit;
}
```

**Результат шага 3:**
- `webhook-logs.php` превращён в тонкий слой
- Вся логика вынесена в сервис
- Обработка ошибок улучшена
- Добавлена поддержка специальных параметров
- Логирование запросов добавлено

---

### Шаг 4: Детали обработки ошибок и валидации

**4.1. Расширить обработку ошибок в endpoint:**

```php
// Дополнить блок catch для более детальной обработки

} catch (WebhookValidationException $e) {
    // Ошибка валидации (400 Bad Request)
    $statusCode = $e->getHttpStatusCode();
    http_response_code($statusCode);
    
    // Формирование детального ответа об ошибке
    $errorResponse = [
        'success' => false,
        'error' => 'Validation error',
        'error_description' => $e->getMessage(),
        'validation_type' => $e->getValidationType(),
        'context' => $e->getContext()
    ];
    
    // В режиме разработки добавляем stack trace
    if (defined('WP_DEBUG') && WP_DEBUG) {
        $errorResponse['debug'] = [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ];
    }
    
    echo json_encode($errorResponse, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    // Логирование ошибки валидации
    error_log(sprintf(
        '[WebhookLogsAPI] Validation error: %s (type: %s)',
        $e->getMessage(),
        $e->getValidationType()
    ));
    
} catch (WebhookLoggingException $e) {
    // Ошибка логирования (500 Internal Server Error)
    $statusCode = $e->getHttpStatusCode();
    http_response_code($statusCode);
    
    $errorResponse = [
        'success' => false,
        'error' => 'Logging error',
        'error_description' => $e->getMessage(),
        'logging_type' => $e->getLoggingType(),
        'context' => $e->getContext()
    ];
    
    if (defined('WP_DEBUG') && WP_DEBUG) {
        $errorResponse['debug'] = [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ];
    }
    
    echo json_encode($errorResponse, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    // Логирование критической ошибки
    error_log(sprintf(
        '[WebhookLogsAPI] Logging error: %s (type: %s)',
        $e->getMessage(),
        $e->getLoggingType()
    ));
    error_log('[WebhookLogsAPI] Context: ' . json_encode($e->getContext()));
```

**4.2. Добавить валидацию формата даты с более детальными сообщениями:**

```php
// Расширить метод validateFilters() в WebhookLogsApiService

// Валидация даты
if (isset($filters['date']) && $filters['date'] !== null) {
    // Проверка формата
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $filters['date'])) {
        throw new WebhookValidationException(
            "Invalid date format: {$filters['date']}. Expected format: YYYY-MM-DD",
            'date',
            [
                'date' => $filters['date'],
                'expected_format' => 'YYYY-MM-DD',
                'examples' => ['2025-12-07', '2025-01-01']
            ]
        );
    }
    
    // Проверка валидности даты
    $dateParts = explode('-', $filters['date']);
    if (count($dateParts) === 3) {
        $year = (int)$dateParts[0];
        $month = (int)$dateParts[1];
        $day = (int)$dateParts[2];
        
        if (!checkdate($month, $day, $year)) {
            throw new WebhookValidationException(
                "Invalid date: {$filters['date']} (not a valid calendar date)",
                'date',
                ['date' => $filters['date'], 'year' => $year, 'month' => $month, 'day' => $day]
            );
        }
        
        // Проверка, что дата не в будущем (опционально)
        $dateTimestamp = strtotime($filters['date']);
        $todayTimestamp = strtotime(date('Y-m-d'));
        if ($dateTimestamp > $todayTimestamp) {
            throw new WebhookValidationException(
                "Date cannot be in the future: {$filters['date']}",
                'date',
                ['date' => $filters['date'], 'today' => date('Y-m-d')]
            );
        }
    }
}
```

**Результат шага 4:**
- Детальная обработка ошибок реализована
- Валидация дат улучшена
- Логирование ошибок добавлено

---

### Шаг 5: Тестирование базовой функциональности

**4.1. Создать тестовый скрипт:**

**Файл:** `tests/test-webhook-logs-api-service.php`

```php
<?php
/**
 * Тестирование WebhookLogsApiService
 * 
 * Использование: php tests/test-webhook-logs-api-service.php
 */

require_once __DIR__ . '/../src/WebhookLogs/bootstrap.php';

use WebhookLogs\Service\WebhookLogsApiService;
use WebhookLogs\Exception\WebhookValidationException;
use WebhookLogs\Exception\WebhookLoggingException;

echo "=== Тестирование WebhookLogsApiService ===\n\n";

try {
    $apiService = new WebhookLogsApiService();
    
    // Тест 1: Получение логов без фильтров
    echo "Тест 1: Получение логов без фильтров...\n";
    $result = $apiService->getLogs([], 1, 10);
    echo "✅ Успешно\n";
    echo "  - Логов: " . count($result['logs']) . "\n";
    echo "  - Всего: " . $result['pagination']['total'] . "\n";
    echo "  - Страниц: " . $result['pagination']['pages'] . "\n\n";
    
    // Тест 2: Фильтрация по категории
    echo "Тест 2: Фильтрация по категории 'tasks'...\n";
    $result = $apiService->getLogs(['category' => 'tasks'], 1, 10);
    echo "✅ Успешно\n";
    echo "  - Логов: " . count($result['logs']) . "\n\n";
    
    // Тест 3: Фильтрация по событию
    echo "Тест 3: Фильтрация по событию 'ONTASKADD'...\n";
    $result = $apiService->getLogs(['event' => 'ONTASKADD'], 1, 10);
    echo "✅ Успешно\n";
    echo "  - Логов: " . count($result['logs']) . "\n\n";
    
    // Тест 4: Пагинация
    echo "Тест 4: Пагинация (страница 2, лимит 5)...\n";
    $result = $apiService->getLogs([], 2, 5);
    echo "✅ Успешно\n";
    echo "  - Логов на странице: " . count($result['logs']) . "\n";
    echo "  - Текущая страница: " . $result['pagination']['page'] . "\n\n";
    
    // Тест 5: Валидация (невалидная категория)
    echo "Тест 5: Валидация (невалидная категория)...\n";
    try {
        $apiService->getLogs(['category' => 'invalid-category'], 1, 10);
        echo "❌ Ожидалось исключение\n\n";
    } catch (WebhookValidationException $e) {
        echo "✅ Исключение поймано: " . $e->getMessage() . "\n\n";
    }
    
    // Тест 6: Валидация (невалидная пагинация)
    echo "Тест 6: Валидация (невалидная пагинация)...\n";
    try {
        $apiService->getLogs([], 0, 10); // page = 0
        echo "❌ Ожидалось исключение\n\n";
    } catch (WebhookValidationException $e) {
        echo "✅ Исключение поймано: " . $e->getMessage() . "\n\n";
    }
    
    echo "=== Тестирование завершено ===\n";
    
} catch (\Exception $e) {
    echo "❌ Критическая ошибка: " . $e->getMessage() . "\n";
    echo "Файл: " . $e->getFile() . "\n";
    echo "Строка: " . $e->getLine() . "\n";
    exit(1);
}
```

**4.2. Расширить тестовый скрипт дополнительными тестами:**

```php
// Добавить в test-webhook-logs-api-service.php

// Тест 7: Проверка структуры ответа
echo "Тест 7: Проверка структуры ответа...\n";
$result = $apiService->getLogs([], 1, 5);
$requiredKeys = ['success', 'logs', 'pagination'];
$hasAllKeys = true;
foreach ($requiredKeys as $key) {
    if (!isset($result[$key])) {
        echo "  ❌ Отсутствует ключ: {$key}\n";
        $hasAllKeys = false;
    }
}
if ($hasAllKeys) {
    echo "✅ Все обязательные ключи присутствуют\n";
    
    // Проверка структуры пагинации
    $paginationKeys = ['page', 'limit', 'total', 'pages'];
    $hasPaginationKeys = true;
    foreach ($paginationKeys as $key) {
        if (!isset($result['pagination'][$key])) {
            echo "  ❌ Отсутствует ключ пагинации: {$key}\n";
            $hasPaginationKeys = false;
        }
    }
    if ($hasPaginationKeys) {
        echo "✅ Структура пагинации корректна\n";
    }
}
echo "\n";

// Тест 8: Проверка структуры записей логов
echo "Тест 8: Проверка структуры записей логов...\n";
if (!empty($result['logs'])) {
    $firstLog = $result['logs'][0];
    $requiredLogKeys = ['timestamp', 'event', 'category'];
    $hasLogKeys = true;
    foreach ($requiredLogKeys as $key) {
        if (!isset($firstLog[$key])) {
            echo "  ❌ Отсутствует ключ в записи: {$key}\n";
            $hasLogKeys = false;
        }
    }
    if ($hasLogKeys) {
        echo "✅ Структура записи лога корректна\n";
        echo "  - Timestamp: " . $firstLog['timestamp'] . "\n";
        echo "  - Event: " . $firstLog['event'] . "\n";
        echo "  - Category: " . $firstLog['category'] . "\n";
    }
} else {
    echo "⚠️  Нет логов для проверки структуры\n";
}
echo "\n";

// Тест 9: Получение доступных категорий
echo "Тест 9: Получение доступных категорий...\n";
$categories = $apiService->getAvailableCategories();
echo "✅ Категории получены: " . implode(', ', $categories) . "\n\n";

// Тест 10: Получение доступных событий
echo "Тест 10: Получение доступных событий...\n";
try {
    $events = $apiService->getAvailableEvents('tasks', date('Y-m-d'));
    echo "✅ События получены: " . count($events) . " уникальных\n";
    if (count($events) > 0) {
        echo "  - Примеры: " . implode(', ', array_slice($events, 0, 5)) . "\n";
    }
} catch (\Exception $e) {
    echo "⚠️  Ошибка получения событий: " . $e->getMessage() . "\n";
}
echo "\n";
```

**4.3. Протестировать через HTTP с различными сценариями:**

```bash
# Базовые тесты
curl "http://localhost/api/webhook-logs.php?category=tasks&page=1&limit=10"
curl "http://localhost/api/webhook-logs.php?event=ONTASKADD&date=2025-12-07"

# Тесты граничных случаев
curl "http://localhost/api/webhook-logs.php?page=0"  # Должна быть ошибка валидации
curl "http://localhost/api/webhook-logs.php?limit=2000"  # Должен быть ограничен до max
curl "http://localhost/api/webhook-logs.php?category=invalid"  # Должна быть ошибка валидации
curl "http://localhost/api/webhook-logs.php?date=invalid-date"  # Должна быть ошибка валидации
curl "http://localhost/api/webhook-logs.php?hour=25"  # Должна быть ошибка валидации

# Тесты с пустыми параметрами
curl "http://localhost/api/webhook-logs.php"
curl "http://localhost/api/webhook-logs.php?category=&event="

# Тесты с большими значениями
curl "http://localhost/api/webhook-logs.php?page=999999&limit=50"
```

**4.4. Создать скрипт для нагрузочного тестирования:**

**Файл:** `tests/load-test-webhook-logs-api.php`

```php
<?php
/**
 * Нагрузочное тестирование WebhookLogsApiService
 * 
 * Использование: php tests/load-test-webhook-logs-api.php
 */

require_once __DIR__ . '/../src/WebhookLogs/bootstrap.php';

use WebhookLogs\Service\WebhookLogsApiService;

echo "=== Нагрузочное тестирование WebhookLogsApiService ===\n\n";

$apiService = new WebhookLogsApiService();
$iterations = 10;
$times = [];

echo "Выполнение {$iterations} запросов...\n";

for ($i = 1; $i <= $iterations; $i++) {
    $start = microtime(true);
    $result = $apiService->getLogs([], 1, 50);
    $time = microtime(true) - $start;
    $times[] = $time;
    
    echo "  Запрос {$i}: " . round($time * 1000, 2) . "ms\n";
}

$avgTime = array_sum($times) / count($times);
$minTime = min($times);
$maxTime = max($times);

echo "\n=== Результаты ===\n";
echo "Среднее время: " . round($avgTime * 1000, 2) . "ms\n";
echo "Минимальное время: " . round($minTime * 1000, 2) . "ms\n";
echo "Максимальное время: " . round($maxTime * 1000, 2) . "ms\n";
```

**Результат шага 4:**
- Тестовый скрипт расширен дополнительными тестами
- HTTP endpoint протестирован с различными сценариями
- Нагрузочное тестирование добавлено
- Все граничные случаи проверены

---

### Шаг 5: Проверка совместимости с Vue.js

**5.1. Проверить формат ответа:**

**Ожидаемый формат (совместимый с Vue.js):**
```json
{
  "success": true,
  "logs": [
    {
      "timestamp": "2025-12-07T15:00:00+03:00",
      "event": "ONTASKADD",
      "category": "tasks",
      "ip": "192.168.1.1",
      "payload": {...},
      "details": {...}
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}
```

**5.2. Детальная проверка работы с Vue.js компонентами:**

**5.2.1. Проверка WebhookLogsPage.vue:**

**Что проверить:**
1. Открыть `/admin/webhook-logs` в браузере
2. Проверить загрузку логов при монтировании компонента
3. Проверить работу метода `loadLogs()`:
   ```javascript
   // В WebhookLogsPage.vue должен вызываться:
   const result = await WebhookLogsApiService.getLogs(
     apiFilters,
     pagination.value.page,
     pagination.value.limit,
     forceRefresh
   );
   ```
4. Проверить обновление реактивных данных:
   ```javascript
   logs.value = result.logs || [];
   pagination.value = result.pagination || pagination.value;
   ```
5. Проверить обработку ошибок (должны отображаться в `error.value`)

**5.2.2. Проверка WebhookLogList.vue:**

**Что проверить:**
1. Проверить отображение списка логов:
   ```vue
   <!-- В WebhookLogList.vue -->
   <tr v-for="log in logs" :key="log.timestamp + log.event">
     <td>{{ formatTimestamp(log.timestamp) }}</td>
     <td>{{ log.event }}</td>
     <td>{{ log.category }}</td>
     <!-- ... -->
   </tr>
   ```
2. Проверить, что все поля доступны:
   - `log.timestamp` - должен быть в формате ISO 8601
   - `log.event` - должен быть строкой
   - `log.category` - должен быть одной из категорий
   - `log.ip` - может быть null или строкой
   - `log.payload` - может быть null или объектом
   - `log.details` - может быть null или объектом
3. Проверить форматирование данных (даты, события)

**5.2.3. Проверка WebhookLogDetails.vue:**

**Что проверить:**
1. Проверить отображение детальной информации:
   ```vue
   <!-- В WebhookLogDetails.vue -->
   <div v-if="log.details">
     <h3>Детали события</h3>
     <pre>{{ JSON.stringify(log.details, null, 2) }}</pre>
   </div>
   ```
2. Проверить структуру `details`:
   - Для задач: `task_id`, `task_title`, `created_by`, `responsible_id`
   - Для смарт-процессов: `entity_id`, `title`, `entity_type_id`
   - Для комментариев: `comment_id`, `comment_text`, `task_id`
3. Проверить отображение `payload` (полный payload вебхука)

**5.2.4. Проверка фильтров в Vue.js:**

**Сценарии тестирования:**

1. **Фильтр по категории:**
   ```javascript
   // В WebhookLogsPage.vue
   filters.value.category = 'tasks';
   await loadLogs();
   // Проверить, что все логи имеют category === 'tasks'
   ```

2. **Фильтр по событию:**
   ```javascript
   filters.value.event = 'ONTASKADD';
   await loadLogs();
   // Проверить, что все логи имеют event === 'ONTASKADD'
   ```

3. **Фильтр по дате:**
   ```javascript
   filters.value.date = '2025-12-07';
   await loadLogs();
   // Проверить, что все логи за эту дату
   ```

4. **Фильтр по часу:**
   ```javascript
   filters.value.hour = 15;
   await loadLogs();
   // Проверить, что все логи за 15:00-15:59
   ```

5. **Комбинация фильтров:**
   ```javascript
   filters.value = {
     category: 'tasks',
     event: 'ONTASKADD',
     date: '2025-12-07',
     hour: 15
   };
   await loadLogs();
   // Проверить, что все условия выполнены
   ```

**5.2.5. Проверка пагинации в Vue.js:**

**Сценарии тестирования:**

1. **Переход на следующую страницу:**
   ```javascript
   pagination.value.page = 2;
   await loadLogs();
   // Проверить, что загружены логи со 2-й страницы
   ```

2. **Изменение лимита:**
   ```javascript
   pagination.value.limit = 100;
   await loadLogs();
   // Проверить, что загружено до 100 логов
   ```

3. **Переход на последнюю страницу:**
   ```javascript
   pagination.value.page = pagination.value.pages;
   await loadLogs();
   // Проверить, что загружена последняя страница
   ```

**5.2.6. Проверка обработки ошибок в Vue.js:**

**Сценарии тестирования:**

1. **Невалидная категория:**
   ```javascript
   filters.value.category = 'invalid-category';
   await loadLogs();
   // Проверить, что error.value содержит сообщение об ошибке
   ```

2. **Невалидная дата:**
   ```javascript
   filters.value.date = 'invalid-date';
   await loadLogs();
   // Проверить обработку ошибки валидации
   ```

3. **Невалидная пагинация:**
   ```javascript
   pagination.value.page = 0;
   await loadLogs();
   // Проверить, что page автоматически исправлен на 1
   ```

**5.2.7. Создать чек-лист для ручного тестирования:**

**Файл:** `tests/manual-test-vue-integration-checklist.md`

```markdown
# Чек-лист ручного тестирования интеграции с Vue.js

## Базовая функциональность
- [ ] Страница `/admin/webhook-logs` открывается без ошибок
- [ ] Логи загружаются при открытии страницы
- [ ] Список логов отображается в `WebhookLogList.vue`
- [ ] Пагинация работает (переход между страницами)
- [ ] Кнопки "Предыдущая"/"Следующая" работают

## Фильтры
- [ ] Фильтр по категории работает
- [ ] Фильтр по событию работает
- [ ] Фильтр по дате работает
- [ ] Фильтр по часу работает
- [ ] Комбинация фильтров работает
- [ ] Сброс фильтров работает

## Детальный просмотр
- [ ] Клик по записи открывает `WebhookLogDetails.vue`
- [ ] Все поля записи отображаются корректно
- [ ] Детали события (`details`) отображаются
- [ ] Payload отображается (если есть)
- [ ] Закрытие детального просмотра работает

## Обработка ошибок
- [ ] Невалидные параметры обрабатываются корректно
- [ ] Сообщения об ошибках отображаются пользователю
- [ ] Приложение не падает при ошибках API

## Производительность
- [ ] Загрузка логов выполняется за разумное время (< 2 сек)
- [ ] Нет задержек при переключении фильтров
- [ ] Нет задержек при пагинации
```

**Результат шага 5:**
- Формат ответа соответствует ожиданиям Vue.js
- Vue.js компоненты работают корректно
- Детальные сценарии тестирования созданы
- Чек-лист для ручного тестирования создан

---

## 📊 Критерии приёмки

- [ ] Класс `WebhookLogsApiService` создан и реализован
- [ ] Метод `getLogs()` реализован с поддержкой фильтрации, сортировки, пагинации
- [ ] Методы `readLogs()`, `filterByEvent()`, `sortLogs()`, `paginateLogs()` реализованы
- [ ] Валидация параметров реализована (`validateFilters()`, `validatePagination()`)
- [ ] Интеграция с `WebhookLogsRepository` реализована
- [ ] Использование `WebhookLogEntry` для типизации данных
- [ ] `webhook-logs.php` превращён в тонкий слой (20-30 строк)
- [ ] Обработка ошибок через исключения реализована
- [ ] Тесты созданы и проходят успешно
- [ ] Код соответствует стандартам PSR-12
- [ ] PHPDoc комментарии добавлены для всех методов
- [ ] **Формат ответа API совместим с Vue.js интерфейсом**
- [ ] **Vue.js компоненты (`WebhookLogsPage`, `WebhookLogList`, `WebhookLogDetails`) работают корректно**
- [ ] **Все фильтры (category, event, date, hour) работают через новый API**
- [ ] **Пагинация работает корректно в Vue.js интерфейсе**

---

## 🔍 Проверка выполнения

**Команды для проверки:**

```bash
# Проверить синтаксис PHP файлов
php -l src/WebhookLogs/Service/WebhookLogsApiService.php
php -l api/webhook-logs.php

# Запустить тесты
php tests/test-webhook-logs-api-service.php

# Проверить структуру
tree src/WebhookLogs/Service/

# Проверить работу через HTTP
curl "http://localhost/api/webhook-logs.php?category=tasks&page=1&limit=10" | jq
```

**Ручное тестирование:**
1. Открыть `/admin/webhook-logs` в браузере
2. Проверить загрузку логов
3. Проверить работу всех фильтров
4. Проверить работу пагинации
5. Проверить отображение данных
6. Проверить обработку ошибок (невалидные параметры)

---

## 🔗 Связи с другими этапами

**Зависит от:**
- **TASK-018-02:** Использует `WebhookLogsConfig`
- **TASK-018-03:** Использует `WebhookLogsRepository`
- **TASK-018-04-01:** Использует `WebhookLogEntry`

**Зависит от него:**
- **TASK-018-08-02:** Оптимизация и расширение функциональности

---

## 📝 История правок

- **2025-12-07 18:00 (UTC+3, Брест):** Создана задача создания WebhookLogsApiService и рефакторинга webhook-logs.php (базовая структура)

---

## 💡 Дополнительные рекомендации

1. **Производительность:**
   - В следующем этапе (08-02) будет добавлено кеширование
   - Оптимизация чтения больших объёмов данных
   - Использование индексов для быстрого поиска (если будет БД)
   - Ленивая загрузка деталей событий

2. **Расширяемость:**
   - Легко добавлять новые фильтры через метод `applyExtendedFilters()`
   - Поддержка новых типов сортировки через метод `sortLogs()`
   - Гибкая пагинация через метод `paginateLogs()`
   - Возможность добавления кастомных валидаторов

3. **Безопасность:**
   - Валидация всех входных параметров
   - Защита от SQL-инъекций (не применимо, так как нет SQL)
   - Ограничение размера ответа
   - Санитизация данных перед возвратом
   - Проверка прав доступа (TODO в коде)

4. **Документация:**
   - Примеры использования в PHPDoc
   - Описание формата ответа
   - Руководство по расширению
   - Примеры запросов для Vue.js разработчиков

---

## 📖 Примеры использования API

### Пример 1: Базовый запрос

**Запрос:**
```bash
GET /api/webhook-logs.php?page=1&limit=50
```

**Ответ:**
```json
{
  "success": true,
  "logs": [
    {
      "timestamp": "2025-12-07T15:30:00+03:00",
      "event": "ONTASKADD",
      "category": "tasks",
      "ip": "192.168.1.1",
      "payload": {
        "event": "ONTASKADD",
        "data": {
          "TASK": {
            "ID": 123,
            "TITLE": "Test Task"
          }
        }
      },
      "details": {
        "task_id": 123,
        "task_title": "Test Task",
        "created_by": 456
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

### Пример 2: Запрос с фильтрами

**Запрос:**
```bash
GET /api/webhook-logs.php?category=tasks&event=ONTASKADD&date=2025-12-07&page=1&limit=10
```

**Ответ:**
```json
{
  "success": true,
  "logs": [
    {
      "timestamp": "2025-12-07T15:30:00+03:00",
      "event": "ONTASKADD",
      "category": "tasks",
      "ip": "192.168.1.1",
      "details": {
        "task_id": 123,
        "task_title": "Test Task"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### Пример 3: Ошибка валидации

**Запрос:**
```bash
GET /api/webhook-logs.php?category=invalid-category
```

**Ответ:**
```json
{
  "success": false,
  "error": "Validation error",
  "error_description": "Invalid category: invalid-category",
  "validation_type": "category",
  "context": {
    "category": "invalid-category",
    "valid_categories": ["tasks", "smart-processes", "errors"]
  }
}
```

### Пример 4: Использование в Vue.js

```javascript
// В WebhookLogsPage.vue
import { WebhookLogsApiService } from '@/services/webhook-logs-api.js';

// Загрузка логов
const loadLogs = async () => {
  try {
    const result = await WebhookLogsApiService.getLogs(
      {
        category: 'tasks',
        event: 'ONTASKADD',
        date: '2025-12-07'
      },
      1, // page
      50 // limit
    );
    
    logs.value = result.logs;
    pagination.value = result.pagination;
  } catch (error) {
    console.error('Error loading logs:', error);
    error.value = error.message;
  }
};
```

---

## 🔧 Дополнительные методы и утилиты

### Метод для получения статистики

**Добавить в `WebhookLogsApiService.php`:**

```php
/**
 * Получить статистику по логам
 * 
 * @param array $filters Фильтры
 * @param string|null $date Дата (null = текущая)
 * @return array Статистика:
 *   - total: общее количество
 *   - by_category: количество по категориям
 *   - by_event: количество по событиям
 *   - by_hour: количество по часам
 */
public function getStats(array $filters = [], ?string $date = null): array
{
    if ($date === null) {
        $date = date('Y-m-d');
    }
    
    $category = $filters['category'] ?? null;
    $allLogs = $this->readLogs($category, $date);
    
    $stats = [
        'total' => count($allLogs),
        'by_category' => [],
        'by_event' => [],
        'by_hour' => []
    ];
    
    foreach ($allLogs as $log) {
        // По категориям
        $logCategory = $log instanceof WebhookLogEntry 
            ? $log->getCategory() 
            : ($log['category'] ?? 'unknown');
        $stats['by_category'][$logCategory] = ($stats['by_category'][$logCategory] ?? 0) + 1;
        
        // По событиям
        $logEvent = $log instanceof WebhookLogEntry 
            ? $log->getEvent() 
            : ($log['event'] ?? 'unknown');
        $stats['by_event'][$logEvent] = ($stats['by_event'][$logEvent] ?? 0) + 1;
        
        // По часам
        $timestamp = $this->getLogTimestamp($log);
        $hour = (int)date('H', $timestamp);
        $stats['by_hour'][$hour] = ($stats['by_hour'][$hour] ?? 0) + 1;
    }
    
    return $stats;
}
```

### Метод для экспорта логов

**Добавить в `WebhookLogsApiService.php`:**

```php
/**
 * Экспорт логов в CSV формат
 * 
 * @param array $filters Фильтры
 * @param int $page Номер страницы
 * @param int $limit Лимит (максимум 10000 для экспорта)
 * @return string CSV содержимое
 */
public function exportToCsv(array $filters = [], int $page = 1, int $limit = 10000): string
{
    // Ограничение лимита для экспорта
    $limit = min($limit, 10000);
    
    $result = $this->getLogs($filters, $page, $limit);
    
    $csv = [];
    $csv[] = 'Timestamp,Event,Category,IP,Task ID,Task Title'; // Заголовки
    
    foreach ($result['logs'] as $log) {
        $row = [
            $log['timestamp'] ?? '',
            $log['event'] ?? '',
            $log['category'] ?? '',
            $log['ip'] ?? '',
            $log['details']['task_id'] ?? '',
            $log['details']['task_title'] ?? ''
        ];
        
        // Экранирование запятых и кавычек
        $row = array_map(function($field) {
            if (strpos($field, ',') !== false || strpos($field, '"') !== false) {
                return '"' . str_replace('"', '""', $field) . '"';
            }
            return $field;
        }, $row);
        
        $csv[] = implode(',', $row);
    }
    
    return implode("\n", $csv);
}
```

---

## 🐛 Отладка и логирование

### Включение детального логирования

**Добавить в `WebhookLogsApiService.php`:**

```php
/**
 * Логировать запрос (для отладки)
 * 
 * @param array $filters Фильтры
 * @param int $page Страница
 * @param int $limit Лимит
 */
protected function logRequest(array $filters, int $page, int $limit): void
{
    if (!defined('WP_DEBUG') || !WP_DEBUG) {
        return;
    }
    
    error_log(sprintf(
        '[WebhookLogsApiService] Request: filters=%s, page=%d, limit=%d',
        json_encode($filters),
        $page,
        $limit
    ));
}

/**
 * Логировать результат (для отладки)
 * 
 * @param array $result Результат
 * @param float $executionTime Время выполнения в секундах
 */
protected function logResult(array $result, float $executionTime): void
{
    if (!defined('WP_DEBUG') || !WP_DEBUG) {
        return;
    }
    
    error_log(sprintf(
        '[WebhookLogsApiService] Result: logs=%d, total=%d, time=%.2fms',
        count($result['logs'] ?? []),
        $result['pagination']['total'] ?? 0,
        $executionTime * 1000
    ));
}
```

**Использование в методе `getLogs()`:**

```php
public function getLogs(array $filters = [], int $page = 1, int $limit = 50): array
{
    $startTime = microtime(true);
    $this->logRequest($filters, $page, $limit);
    
    // ... существующий код ...
    
    $executionTime = microtime(true) - $startTime;
    $this->logResult($result, $executionTime);
    
    return $result;
}
```

