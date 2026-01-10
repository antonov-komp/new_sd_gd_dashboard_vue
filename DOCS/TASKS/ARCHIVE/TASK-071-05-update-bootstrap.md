# TASK-071-05: Обновление bootstrap.php для подключения кеша

**Дата создания:** 2025-12-23 18:03 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Backend Developer (PHP)  
**Родительская задача:** [TASK-071: Реализация кеширования данных для модуля "Трудозатраты на Тикеты сектора 1С"](./TASK-071-cache-time-tracking-sector-1c.md)  
**Подзадача:** Этап 5 из TASK-071

---

## 📋 Описание

Обновить `bootstrap.php` для инициализации `CacheStore` и передачи его в конструктор `TimeTrackingService`. Это финальный этап интеграции кеширования в модуль "Трудозатраты на Тикеты сектора 1С".

**Цель:** Завершить интеграцию кеширования, подключив все компоненты в точке входа модуля.

---

## 🎯 Контекст

### Текущее состояние:

- Класс `TimeTrackingCache` создан (TASK-071-01)
- Обёртка `CacheStore` создана (TASK-071-02)
- `TimeTrackingService` использует кеш (TASK-071-03)
- `TimeTrackingController` обрабатывает `forceRefresh` (TASK-071-04)
- `bootstrap.php` не инициализирует `CacheStore`

### Требуется:

- Подключить класс `CacheStore` в `bootstrap.php`
- Инициализировать экземпляр `CacheStore`
- Передать `CacheStore` в конструктор `TimeTrackingService`

---

## 🏗️ Модули и компоненты

### Изменяемые файлы:

- `api/tickets-time-tracking-sector-1c/bootstrap.php` — подключение и инициализация кеша

---

## 📦 Зависимости

- **От задач:** 
  - TASK-071-01: Создание класса TimeTrackingCache (должна быть завершена)
  - TASK-071-02: Создание обёртки CacheStore (должна быть завершена)
  - TASK-071-03: Интеграция кеша в TimeTrackingService (должна быть завершена)
  - TASK-071-04: Интеграция параметра forceRefresh в TimeTrackingController (должна быть завершена)
  - TASK-071: Реализация кеширования данных для модуля "Трудозатраты на Тикеты сектора 1С"
- **От модулей:** 
  - Класс: `CacheStore` в `api/tickets-time-tracking-sector-1c/cache/CacheStore.php`
  - Класс: `TimeTrackingService` в `api/tickets-time-tracking-sector-1c/service/TimeTrackingService.php`
  - Файл: `bootstrap.php` в `api/tickets-time-tracking-sector-1c/bootstrap.php`
- **От библиотек:** 
  - PHP 8.4+

---

## 🎯 Ступенчатые подзадачи

### Подзадача 5.1: Подключение класса CacheStore

**Цель:** Добавить `require_once` для класса `CacheStore` в `bootstrap.php`.

**Шаги:**

1. **Добавить `require_once` для `CacheStore`**
   ```php
   // Подключение классов модуля
   require_once __DIR__ . '/cache/CacheStore.php';
   // ... остальные require_once ...
   ```

2. **Разместить подключение в правильном месте**
   - Подключение должно быть после подключения базовых классов
   - Подключение должно быть перед использованием класса

**Критерии приёмки:**
- [ ] `require_once` для `CacheStore` добавлен
- [ ] Путь подключения корректен
- [ ] Подключение размещено в правильном месте

---

### Подзадача 5.2: Добавление use-директивы для CacheStore

**Цель:** Добавить use-директиву для класса `CacheStore`.

**Шаги:**

1. **Добавить use-директиву**
   ```php
   use TimeTracking\Cache\CacheStore;
   // ... остальные use ...
   ```

2. **Разместить use-директиву в правильном месте**
   - use-директива должна быть после всех `require_once`
   - use-директива должна быть перед инициализацией зависимостей

**Критерии приёмки:**
- [ ] use-директива для `CacheStore` добавлена
- [ ] use-директива размещена в правильном месте

**Примечание:** Если класс `CacheStore` не использует namespace, use-директива не нужна. В этом случае класс используется напрямую.

---

### Подзадача 5.3: Инициализация CacheStore

**Цель:** Создать экземпляр `CacheStore` и передать его в конструктор `TimeTrackingService`.

**Шаги:**

1. **Создать экземпляр `CacheStore`**
   ```php
   // TASK-071-05: Инициализация кеша
   $cacheStore = new CacheStore();
   ```

2. **Разместить инициализацию в правильном месте**
   - Инициализация должна быть после инициализации `Bitrix24Client`
   - Инициализация должна быть перед созданием репозиториев

3. **Передать `CacheStore` в конструктор `TimeTrackingService`**
   ```php
   $service = new TimeTrackingService(
       $employeeRepository,
       $taskRepository,
       $elapsedTimeRepository,
       $ticketRepository,
       $taskTicketMatcher,
       $timeAggregator,
       $employeeSummaryBuilder,
       $cacheStore // TASK-071-05: Передача кеша в сервис
   );
   ```

**Критерии приёмки:**
- [ ] Экземпляр `CacheStore` создан
- [ ] `CacheStore` передан в конструктор `TimeTrackingService`
- [ ] Инициализация размещена в правильном месте

---

## 🔧 Технические требования

### Изменения в bootstrap.php:

1. **Добавить require_once:**
   ```php
   require_once __DIR__ . '/cache/CacheStore.php';
   ```

2. **Добавить инициализацию:**
   ```php
   // TASK-071-05: Инициализация кеша
   $cacheStore = new CacheStore();
   ```

3. **Обновить создание сервиса:**
   ```php
   $service = new TimeTrackingService(
       // ... существующие зависимости ...
       $cacheStore
   );
   ```

### Порядок инициализации:

1. Подключение зависимостей (`crest.php`)
2. Подключение классов модуля (включая `CacheStore`)
3. Инициализация `Bitrix24Client`
4. Инициализация `CacheStore` (TASK-071-05)
5. Инициализация репозиториев
6. Инициализация доменных сервисов
7. Инициализация `TimeTrackingService` (с `CacheStore`)
8. Инициализация `TimeTrackingController`
9. Обработка запроса

---

## ✅ Критерии приёмки

### Общие критерии:
- [ ] `CacheStore` подключён в `bootstrap.php`
- [ ] `CacheStore` инициализирован
- [ ] `CacheStore` передан в сервис
- [ ] Кеш работает корректно
- [ ] Код соответствует стандартам PSR-12
- [ ] Комментарии добавлены с ссылкой на TASK-071-05

### Детальная проверка:

**Проверка подключения:**
```php
// Должен быть require_once для CacheStore
require_once __DIR__ . '/cache/CacheStore.php';
```

**Проверка инициализации:**
```php
// Должна быть инициализация CacheStore
$cacheStore = new CacheStore();
```

**Проверка передачи в сервис:**
```php
// CacheStore должен быть передан в конструктор TimeTrackingService
$service = new TimeTrackingService(
    // ... существующие зависимости ...
    $cacheStore
);
```

---

## 🧪 Тестирование

### Функциональное тестирование:

1. **Тест инициализации кеша:**
   ```php
   // Проверить, что CacheStore инициализирован
   $cacheStore = new CacheStore();
   assert($cacheStore instanceof CacheStore, 'CacheStore should be initialized');
   ```

2. **Тест передачи в сервис:**
   ```php
   // Проверить, что сервис получает CacheStore
   $service = new TimeTrackingService(
       // ... зависимости ...
       $cacheStore
   );
   
   // Вызвать метод сервиса
   $result = $service->getTimeTrackingData(['product' => '1C']);
   
   // Проверить, что кеш работает (через логи или моки)
   ```

3. **Тест работы кеша end-to-end:**
   ```php
   // Первый запрос (без кеша)
   $result1 = $service->getTimeTrackingData(['product' => '1C']);
   
   // Второй запрос (с кешем)
   $result2 = $service->getTimeTrackingData(['product' => '1C']);
   
   // Проверить, что результаты одинаковые
   assert($result1 === $result2, 'Cached data should match');
   
   // Проверить время выполнения (второй запрос должен быть быстрее)
   ```

---

## 📝 Примеры кода

### Полный пример изменений в bootstrap.php:

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
require_once __DIR__ . '/../../crest.php';

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
require_once __DIR__ . '/cache/CacheStore.php'; // TASK-071-05: Подключение CacheStore

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
// TASK-071-05: Если CacheStore использует namespace, добавить use
// use TimeTracking\Cache\CacheStore;

try {
    // Инициализация зависимостей
    $bitrixClient = new Bitrix24Client();
    
    // TASK-071-05: Инициализация кеша
    $cacheStore = new CacheStore();
    
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
        $employeeSummaryBuilder,
        $cacheStore // TASK-071-05: Передача кеша в сервис
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

---

## ⚠️ Потенциальные проблемы и решения

### Проблема 1: Неправильный путь подключения

**Проблема:** Путь `__DIR__ . '/cache/CacheStore.php'` может быть неверным.

**Решение:**
- Проверить структуру директорий:
  - `api/tickets-time-tracking-sector-1c/bootstrap.php` (текущий файл)
  - `api/tickets-time-tracking-sector-1c/cache/CacheStore.php` (подключаемый файл)
- Относительный путь: `__DIR__` → `api/tickets-time-tracking-sector-1c/`
- Войти в `cache/`: `cache/CacheStore.php`
- **Итоговый путь:** `__DIR__ . '/cache/CacheStore.php'`

### Проблема 2: Порядок инициализации

**Проблема:** `CacheStore` должен быть инициализирован до создания `TimeTrackingService`.

**Решение:**
- Инициализировать `CacheStore` после `Bitrix24Client`
- Инициализировать `CacheStore` перед созданием репозиториев
- Передать `CacheStore` в конструктор `TimeTrackingService` последним параметром

### Проблема 3: Namespace для CacheStore

**Проблема:** Если `CacheStore` использует namespace, нужно добавить use-директиву.

**Решение:**
- Проверить, использует ли `CacheStore` namespace
- Если использует, добавить `use TimeTracking\Cache\CacheStore;`
- Если не использует, использовать класс напрямую: `new CacheStore()`

---

## 🔗 Связанные документы

- [TASK-071: Реализация кеширования данных для модуля "Трудозатраты на Тикеты сектора 1С"](./TASK-071-cache-time-tracking-sector-1c.md)
- [TASK-071-01: Создание класса TimeTrackingCache](./TASK-071-01-create-time-tracking-cache.md)
- [TASK-071-02: Создание обёртки CacheStore](./TASK-071-02-create-cache-store-wrapper.md)
- [TASK-071-03: Интеграция кеша в TimeTrackingService](./TASK-071-03-integrate-cache-service.md)
- [TASK-071-04: Интеграция параметра forceRefresh в TimeTrackingController](./TASK-071-04-integrate-force-refresh-controller.md)

---

## 📊 История правок

- **2025-12-23 18:03 (UTC+3, Брест):** Создана подзадача TASK-071-05 для обновления bootstrap.php

---

**Автор:** Технический писатель  
**Версия документа:** 1.0


