# TASK-069: Этап 4 — Создание клиента Bitrix24

**Дата создания:** 2025-12-23 18:18 (UTC+3, Брест)  
**Версия:** 1.0  
**Статус:** Планирование  
**Исполнители:** Рефактор-менеджер, Программист

---

## 📋 Цель этапа

Создать абстракцию для работы с Bitrix24 REST API, обёртку над `CRest` с обработкой ошибок и логированием.

---

## 🔍 Задачи этапа

### 1. Создание базового класса Bitrix24Client

#### 1.1. Файл: `api/tickets-time-tracking-sector-1c/bitrix/Bitrix24Client.php`

**Базовый класс клиента:**

```php
<?php

namespace TimeTracking\Bitrix;

/**
 * Клиент для работы с Bitrix24 REST API
 * 
 * Обёртка над CRest с обработкой ошибок и логированием
 * 
 * Документация Bitrix24 REST API:
 * - https://context7.com/bitrix24/rest/
 * - https://apidocs.bitrix24.ru/
 */
class Bitrix24Client
{
    /**
     * Вызов метода Bitrix24 REST API
     * 
     * @param string $method Метод API (например, 'user.get')
     * @param array $params Параметры запроса
     * @return array Ответ от Bitrix24
     * @throws \Exception При ошибке API
     */
    public function call(string $method, array $params = []): array
    {
        $result = CRest::call($method, $params);
        
        if (isset($result['error'])) {
            $errorMsg = sprintf(
                "Bitrix24 API error (%s): %s",
                $method,
                $result['error_description'] ?? $result['error']
            );
            error_log("[Bitrix24Client] {$errorMsg}");
            throw new \Exception($errorMsg);
        }
        
        return $result;
    }

    /**
     * Батч-вызов методов Bitrix24 REST API
     * 
     * @param array $batchData Массив запросов ['key' => ['method' => '...', 'params' => [...]]]
     * @return array Ответ от Bitrix24
     * @throws \Exception При ошибке API
     */
    public function callBatch(array $batchData): array
    {
        $result = CRest::callBatch($batchData);
        
        if (isset($result['error'])) {
            $errorMsg = sprintf(
                "Bitrix24 API batch error: %s",
                $result['error_description'] ?? $result['error']
            );
            error_log("[Bitrix24Client] {$errorMsg}");
            throw new \Exception($errorMsg);
        }
        
        return $result;
    }
}
```

### 2. Добавление специализированных методов

#### 2.1. Методы для работы с пользователями

```php
/**
 * Получение пользователей
 * 
 * Метод: user.get
 * Документация: https://context7.com/bitrix24/rest/user.get
 * 
 * @param array $filter Фильтр пользователей
 * @param array $select Поля для выборки
 * @param int $start Смещение для пагинации
 * @return array Массив пользователей
 */
public function getUsers(array $filter = [], array $select = ['ID'], int $start = 0): array
{
    $result = $this->call('user.get', [
        'filter' => $filter,
        'select' => $select,
        'start' => $start
    ]);
    
    return $result['result'] ?? [];
}

/**
 * Получение пользователей с пагинацией
 * 
 * @param array $filter Фильтр пользователей
 * @param array $select Поля для выборки
 * @param int $pageSize Размер страницы
 * @return array Все пользователи
 */
public function getAllUsers(array $filter = [], array $select = ['ID'], int $pageSize = 50): array
{
    $allUsers = [];
    $start = 0;
    
    do {
        $users = $this->getUsers($filter, $select, $start);
        $allUsers = array_merge($allUsers, $users);
        $start += $pageSize;
    } while (count($users) === $pageSize);
    
    return $allUsers;
}
```

#### 2.2. Методы для работы с задачами

```php
/**
 * Получение списка задач
 * 
 * Метод: tasks.task.list
 * Документация: https://context7.com/bitrix24/rest/tasks.task.list
 * 
 * @param array $filter Фильтр задач
 * @param array $select Поля для выборки
 * @param int $start Смещение для пагинации
 * @return array Массив задач
 */
public function getTasks(array $filter = [], array $select = [], int $start = 0): array
{
    $result = $this->call('tasks.task.list', [
        'filter' => $filter,
        'select' => $select,
        'start' => $start
    ]);
    
    return $result['result']['tasks'] ?? [];
}

/**
 * Получение задачи по ID
 * 
 * Метод: tasks.task.get
 * Документация: https://context7.com/bitrix24/rest/tasks.task.get
 * 
 * @param int $taskId ID задачи
 * @param array $select Поля для выборки
 * @return array Данные задачи
 */
public function getTask(int $taskId, array $select = ['*', 'UF_*']): array
{
    $result = $this->call('tasks.task.get', [
        'taskId' => $taskId,
        'select' => $select
    ]);
    
    return $result['result']['task'] ?? [];
}

/**
 * Получение задач батч-запросом
 * 
 * @param array $taskIds Массив ID задач
 * @param array $select Поля для выборки
 * @param int $batchSize Размер батча
 * @return array Ассоциативный массив [taskId => taskData]
 */
public function getTasksBatch(array $taskIds, array $select = ['*', 'UF_*'], int $batchSize = 50): array
{
    $allTasks = [];
    $uniqueTaskIds = array_unique($taskIds);
    $batches = array_chunk($uniqueTaskIds, $batchSize);
    
    foreach ($batches as $batch) {
        $batchData = [];
        foreach ($batch as $taskId) {
            $batchData["task_{$taskId}"] = [
                'method' => 'tasks.task.get',
                'params' => [
                    'taskId' => $taskId,
                    'select' => $select
                ]
            ];
        }
        
        $result = $this->callBatch($batchData);
        
        if (isset($result['result']['result'])) {
            foreach ($result['result']['result'] as $key => $taskData) {
                if (isset($taskData['error'])) {
                    $taskId = str_replace('task_', '', $key);
                    error_log(sprintf(
                        "[Bitrix24Client] Error loading task %s: %s",
                        $taskId,
                        $taskData['error_description'] ?? 'Unknown error'
                    ));
                    continue;
                }
                
                $taskId = (int)($taskData['id'] ?? $taskData['ID'] ?? 0);
                if ($taskId) {
                    $allTasks[$taskId] = $taskData;
                }
            }
        }
    }
    
    return $allTasks;
}
```

#### 2.3. Методы для работы с трудозатратами

```php
/**
 * Получение записей трудозатрат для задачи
 * 
 * Метод: task.elapseditem.getlist
 * Документация: https://context7.com/bitrix24/rest/task.elapseditem.getlist
 * 
 * @param int $taskId ID задачи
 * @param int $start Смещение для пагинации
 * @return array Массив записей трудозатрат
 */
public function getElapsedItems(int $taskId, int $start = 0): array
{
    $result = $this->call('task.elapseditem.getlist', [
        'taskId' => $taskId,
        'start' => $start
    ]);
    
    return $result['result'] ?? [];
}
```

#### 2.4. Методы для работы с тикетами

```php
/**
 * Получение списка тикетов (CRM items)
 * 
 * Метод: crm.item.list
 * Документация: https://context7.com/bitrix24/rest/crm.item.list
 * 
 * @param int $entityTypeId ID типа сущности (например, 140)
 * @param array $filter Фильтр тикетов
 * @param array $select Поля для выборки
 * @param int $start Смещение для пагинации
 * @return array Массив тикетов
 */
public function getTickets(int $entityTypeId, array $filter = [], array $select = [], int $start = 0): array
{
    $result = $this->call('crm.item.list', [
        'entityTypeId' => $entityTypeId,
        'filter' => $filter,
        'select' => $select,
        'start' => $start
    ]);
    
    return $result['result']['items'] ?? $result['result'] ?? [];
}

/**
 * Получение тикетов батч-запросом
 * 
 * @param int $entityTypeId ID типа сущности
 * @param array $ticketIds Массив ID тикетов
 * @param array $filter Дополнительный фильтр
 * @param array $select Поля для выборки
 * @param int $batchSize Размер батча
 * @return array Ассоциативный массив [ticketId => ticketData]
 */
public function getTicketsBatch(
    int $entityTypeId,
    array $ticketIds,
    array $filter = [],
    array $select = [],
    int $batchSize = 50
): array {
    $allTickets = [];
    $uniqueTicketIds = array_unique($ticketIds);
    $batches = array_chunk($uniqueTicketIds, $batchSize);
    
    foreach ($batches as $batch) {
        $batchFilter = array_merge($filter, ['id' => $batch]);
        $tickets = $this->getTickets($entityTypeId, $batchFilter, $select);
        
        foreach ($tickets as $ticket) {
            $ticketId = (int)($ticket['id'] ?? $ticket['ID'] ?? 0);
            if ($ticketId) {
                $allTickets[$ticketId] = $ticket;
            }
        }
    }
    
    return $allTickets;
}
```

---

## 📝 Полный код класса Bitrix24Client

См. файл `api/tickets-time-tracking-sector-1c/bitrix/Bitrix24Client.php` (будет создан на этапе реализации)

---

## ✅ Критерии приёмки этапа

- [ ] Класс `Bitrix24Client` создан
- [ ] Метод `call()` реализован с обработкой ошибок
- [ ] Метод `callBatch()` реализован с обработкой ошибок
- [ ] Метод `getUsers()` реализован
- [ ] Метод `getAllUsers()` реализован
- [ ] Метод `getTasks()` реализован
- [ ] Метод `getTask()` реализован
- [ ] Метод `getTasksBatch()` реализован
- [ ] Метод `getElapsedItems()` реализован
- [ ] Метод `getTickets()` реализован
- [ ] Метод `getTicketsBatch()` реализован
- [ ] Все методы логируют ошибки
- [ ] Все методы документированы с ссылками на документацию Bitrix24
- [ ] Код соответствует стандартам PSR-12

---

## 🧪 Тестирование

### Unit-тесты для Bitrix24Client

```php
<?php
// tests/Bitrix24ClientTest.php

use TimeTracking\Bitrix\Bitrix24Client;

// Тест call() с успешным ответом
// Тест call() с ошибкой API
// Тест callBatch() с успешным ответом
// Тест callBatch() с ошибкой
// Тест getUsers()
// Тест getAllUsers() с пагинацией
// Тест getTasks()
// Тест getTask()
// Тест getTasksBatch()
// Тест getElapsedItems()
// Тест getTickets()
// Тест getTicketsBatch()
```

**Примечание:** Тесты требуют мокирования `CRest::call()` и `CRest::callBatch()`

---

## 🔗 Связанные документы

- **Основной план:** `DOCS/REFACTORING/TASK-069-refactoring-plan-tickets-time-tracking.md`
- **Предыдущий этап:** `DOCS/REFACTORING/TASK-069-stage-03-utils.md`
- **Следующий этап:** `DOCS/REFACTORING/TASK-069-stage-05-repositories.md`
- **Документация Bitrix24:** 
  - https://context7.com/bitrix24/rest/
  - https://apidocs.bitrix24.ru/

---

## ⏱️ Оценка времени

**3-4 часа**

- Создание базового класса: 30 минут
- Реализация методов для пользователей: 30 минут
- Реализация методов для задач: 1 час
- Реализация методов для трудозатрат: 30 минут
- Реализация методов для тикетов: 30 минут
- Написание тестов: 1 час
- Тестирование и проверка: 30 минут

---

**История правок:**
- 2025-12-23 18:18 (UTC+3, Брест): Создан документ этапа 4


