# TASK-069: Этап 9 — Рефакторинг endpoint и интеграция

**Дата создания:** 2025-12-23 18:18 (UTC+3, Брест)  
**Версия:** 1.0  
**Статус:** Планирование  
**Исполнители:** Рефактор-менеджер, Программист

---

## 📋 Цель этапа

Интегрировать новый модуль, обновить `bootstrap.php` и `tickets-time-tracking-sector-1c.php`, сохранив обратную совместимость.

---

## 🔍 Задачи этапа

### 1. Обновление bootstrap.php

#### 1.1. Файл: `api/tickets-time-tracking-sector-1c/bootstrap.php`

**Полная реализация точки входа:**

```php
<?php
/**
 * Bootstrap для модуля учёта времени сектора 1С
 * 
 * Точка входа для нового модульного кода
 * 
 * @package TimeTracking
 */

// Подключение зависимостей
require_once __DIR__ . '/../crest.php';

// Подключение автозагрузки (если используется)
// require_once __DIR__ . '/autoload.php';

// Установка заголовков
header('Content-Type: application/json; charset=utf-8');

// Подключение классов модуля
require_once __DIR__ . '/config/TimeTrackingConfig.php';
require_once __DIR__ . '/util/WeekHelper.php';
require_once __DIR__ . '/util/DateHelper.php';
require_once __DIR__ . '/util/ResponseHelper.php';
require_once __DIR__ . '/bitrix/Bitrix24Client.php';
require_once __DIR__ . '/repository/EmployeeRepository.php';
require_once __DIR__ . '/repository/TaskRepository.php';
require_once __DIR__ . '/repository/ElapsedTimeRepository.php';
require_once __DIR__ . '/repository/TicketRepository.php';
require_once __DIR__ . '/domain/TaskTicketMatcher.php';
require_once __DIR__ . '/domain/TimeAggregator.php';
require_once __DIR__ . '/domain/EmployeeSummaryBuilder.php';
require_once __DIR__ . '/service/TimeTrackingService.php';
require_once __DIR__ . '/controller/TimeTrackingController.php';

use TimeTracking\Bitrix\Bitrix24Client;
use TimeTracking\Repository\EmployeeRepository;
use TimeTracking\Repository\TaskRepository;
use TimeTracking\Repository\ElapsedTimeRepository;
use TimeTracking\Repository\TicketRepository;
use TimeTracking\Domain\TaskTicketMatcher;
use TimeTracking\Domain\TimeAggregator;
use TimeTracking\Domain\EmployeeSummaryBuilder;
use TimeTracking\Service\TimeTrackingService;
use TimeTracking\Controller\TimeTrackingController;

try {
    // Инициализация зависимостей
    $bitrixClient = new Bitrix24Client();
    
    $employeeRepository = new EmployeeRepository($bitrixClient);
    $taskRepository = new TaskRepository($bitrixClient);
    $elapsedTimeRepository = new ElapsedTimeRepository($bitrixClient);
    $ticketRepository = new TicketRepository($bitrixClient);
    
    $taskTicketMatcher = new TaskTicketMatcher($ticketRepository);
    $timeAggregator = new TimeAggregator();
    $employeeSummaryBuilder = new EmployeeSummaryBuilder();
    
    $service = new TimeTrackingService(
        $employeeRepository,
        $taskRepository,
        $elapsedTimeRepository,
        $ticketRepository,
        $taskTicketMatcher,
        $timeAggregator,
        $employeeSummaryBuilder
    );
    
    $controller = new TimeTrackingController($service);
    
    // Обработка запроса
    $controller->handleRequest();
    
} catch (\Exception $e) {
    error_log("Fatal error in TimeTracking bootstrap: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => 'internal_error',
        'error_description' => 'An internal error occurred'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
```

### 2. Обновление legacy endpoint

#### 2.1. Файл: `api/tickets-time-tracking-sector-1c.php`

**Перенаправление на новый модуль:**

```php
<?php
/**
 * API endpoint: Трудозатраты на Тикеты сектора 1С
 * 
 * Legacy endpoint - перенаправляет на новый модульный код
 * 
 * @deprecated Используйте api/tickets-time-tracking-sector-1c/bootstrap.php напрямую
 */

// Перенаправление на новый модуль
require_once __DIR__ . '/tickets-time-tracking-sector-1c/bootstrap.php';
```

**Альтернативный вариант (с проверкой существования):**

```php
<?php
/**
 * API endpoint: Трудозатраты на Тикеты сектора 1С
 * 
 * Legacy endpoint - перенаправляет на новый модульный код
 */

$bootstrapPath = __DIR__ . '/tickets-time-tracking-sector-1c/bootstrap.php';

if (file_exists($bootstrapPath)) {
    // Используем новый модуль
    require_once $bootstrapPath;
} else {
    // Fallback на старый код (если новый модуль ещё не готов)
    // Это временная мера для плавного перехода
    error_log("[TimeTracking] New module not found, using legacy code");
    
    // Здесь можно оставить старый код или выбросить ошибку
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => 'service_unavailable',
        'error_description' => 'Module is under maintenance'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
```

### 3. Интеграционное тестирование

#### 3.1. Сценарии тестирования

**Тест 1: Базовый запрос без параметров**
```bash
curl -X POST http://example.com/api/tickets-time-tracking-sector-1c.php \
  -H "Content-Type: application/json" \
  -d '{"product": "1C"}'
```

**Тест 2: Запрос с датами**
```bash
curl -X POST http://example.com/api/tickets-time-tracking-sector-1c.php \
  -H "Content-Type: application/json" \
  -d '{
    "product": "1C",
    "weekStartUtc": "2025-12-15T00:00:00Z",
    "weekEndUtc": "2025-12-21T23:59:59Z"
  }'
```

**Тест 3: Запрос с детальными данными о задачах**
```bash
curl -X POST http://example.com/api/tickets-time-tracking-sector-1c.php \
  -H "Content-Type: application/json" \
  -d '{
    "product": "1C",
    "includeTaskDetails": true,
    "page": 1,
    "perPage": 10
  }'
```

**Тест 4: Запрос с фильтрацией задач**
```bash
curl -X POST http://example.com/api/tickets-time-tracking-sector-1c.php \
  -H "Content-Type: application/json" \
  -d '{
    "product": "1C",
    "includeTaskDetails": true,
    "taskIds": [123, 456, 789]
  }'
```

**Тест 5: Обработка ошибок**
```bash
# Невалидный product
curl -X POST http://example.com/api/tickets-time-tracking-sector-1c.php \
  -H "Content-Type: application/json" \
  -d '{"product": "2C"}'

# Невалидные даты
curl -X POST http://example.com/api/tickets-time-tracking-sector-1c.php \
  -H "Content-Type: application/json" \
  -d '{
    "product": "1C",
    "weekStartUtc": "invalid-date"
  }'
```

### 4. Сравнение ответов старого и нового кода

#### 4.1. Скрипт для сравнения

```php
<?php
// scripts/compare-responses.php

/**
 * Скрипт для сравнения ответов старого и нового кода
 */

// Запрос к старому endpoint (если он ещё доступен)
$oldResponse = makeRequest('api/tickets-time-tracking-sector-1c-old.php');

// Запрос к новому endpoint
$newResponse = makeRequest('api/tickets-time-tracking-sector-1c.php');

// Сравнение структур
compareStructures($oldResponse, $newResponse);

// Сравнение данных
compareData($oldResponse, $newResponse);
```

---

## 📝 Структура файлов после этапа 9

```
api/
├── tickets-time-tracking-sector-1c.php          # ✅ Обновлено (перенаправление)
└── tickets-time-tracking-sector-1c/
    ├── bootstrap.php                             # ✅ Реализовано
    └── ...
```

---

## ✅ Критерии приёмки этапа

- [ ] Файл `bootstrap.php` полностью реализован
- [ ] Все зависимости подключены
- [ ] Инициализация всех компонентов реализована
- [ ] Обработка запроса работает корректно
- [ ] Файл `tickets-time-tracking-sector-1c.php` обновлён
- [ ] Обратная совместимость сохранена
- [ ] Интеграционные тесты проведены:
  - [ ] Базовый запрос работает
  - [ ] Запрос с параметрами работает
  - [ ] Запрос с детальными данными работает
  - [ ] Обработка ошибок работает
- [ ] Ответы нового кода идентичны старому (или совместимы)
- [ ] Производительность проверена

---

## 🧪 Тестирование

### Интеграционные тесты

1. **Тест полного цикла** (без `includeTaskDetails`)
2. **Тест полного цикла** с `includeTaskDetails=true`
3. **Тест обработки пустых данных**
4. **Тест обработки ошибок Bitrix24 API**
5. **Тест валидации параметров запроса**
6. **Тест производительности** (сравнение со старым кодом)

### Проверка производительности

```bash
# Замер времени выполнения
time curl -X POST http://example.com/api/tickets-time-tracking-sector-1c.php \
  -H "Content-Type: application/json" \
  -d '{"product": "1C"}'
```

---

## 🔗 Связанные документы

- **Основной план:** `DOCS/REFACTORING/TASK-069-refactoring-plan-tickets-time-tracking.md`
- **Предыдущий этап:** `DOCS/REFACTORING/TASK-069-stage-08-controller.md`
- **Следующий этап:** `DOCS/REFACTORING/TASK-069-stage-10-testing.md`

---

## ⏱️ Оценка времени

**3-4 часа**

- Обновление bootstrap.php: 1 час
- Обновление legacy endpoint: 30 минут
- Интеграционное тестирование: 1.5 часа
- Сравнение со старым кодом: 1 час
- Проверка производительности: 30 минут

---

**История правок:**
- 2025-12-23 18:18 (UTC+3, Брест): Создан документ этапа 9


