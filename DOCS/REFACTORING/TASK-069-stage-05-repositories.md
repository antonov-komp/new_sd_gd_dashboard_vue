# TASK-069: Этап 5 — Создание репозиториев (Employees, Tasks, Tickets, ElapsedTime)

**Дата создания:** 2025-12-23 18:18 (UTC+3, Брест)  
**Версия:** 1.0  
**Статус:** Планирование  
**Исполнители:** Рефактор-менеджер, Программист

---

## 📋 Цель этапа

Создать репозитории для работы с данными из Bitrix24: сотрудники, задачи, тикеты и записи трудозатрат.

---

## 🔍 Задачи этапа

### 1. Создание EmployeeRepository

#### 1.1. Файл: `api/tickets-time-tracking-sector-1c/repository/EmployeeRepository.php`

**Репозиторий для работы с сотрудниками:**

```php
<?php

namespace TimeTracking\Repository;

use TimeTracking\Bitrix\Bitrix24Client;
use TimeTracking\Config\TimeTrackingConfig;

/**
 * Репозиторий для работы с сотрудниками
 */
class EmployeeRepository
{
    protected Bitrix24Client $client;
    
    public function __construct(Bitrix24Client $client)
    {
        $this->client = $client;
    }
    
    /**
     * Получение списка сотрудников сектора 1С
     * 
     * @return array Массив ID сотрудников
     */
    public function getSector1CEmployees(): array
    {
        $employeeIds = [];
        
        $users = $this->client->getAllUsers([
            'ACTIVE' => 'Y',
            'UF_DEPARTMENT' => TimeTrackingConfig::getSector1CDepartmentId()
        ], ['ID']);
        
        foreach ($users as $user) {
            if (isset($user['ID'])) {
                $employeeIds[] = (int)$user['ID'];
            }
        }
        
        return array_unique($employeeIds);
    }
    
    /**
     * Получение данных сотрудников по ID
     * 
     * @param array $employeeIds Массив ID сотрудников
     * @return array Ассоциативный массив [employeeId => employeeData]
     */
    public function getEmployeesData(array $employeeIds): array
    {
        if (empty($employeeIds)) {
            return [];
        }
        
        $employees = [];
        $users = $this->client->getAllUsers([
            'ID' => $employeeIds
        ], ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME']);
        
        foreach ($users as $user) {
            $employeeId = (int)($user['ID'] ?? 0);
            if ($employeeId) {
                $name = trim(($user['LAST_NAME'] ?? '') . ' ' . 
                           ($user['NAME'] ?? '') . ' ' . 
                           ($user['SECOND_NAME'] ?? ''));
                $employees[$employeeId] = [
                    'id' => $employeeId,
                    'name' => $name ?: 'Неизвестный'
                ];
            }
        }
        
        return $employees;
    }
}
```

### 2. Создание TaskRepository

#### 2.1. Файл: `api/tickets-time-tracking-sector-1c/repository/TaskRepository.php`

**Репозиторий для работы с задачами:**

```php
<?php

namespace TimeTracking\Repository;

use TimeTracking\Bitrix\Bitrix24Client;
use TimeTracking\Config\TimeTrackingConfig;
use DateTimeImmutable;

/**
 * Репозиторий для работы с задачами
 */
class TaskRepository
{
    protected Bitrix24Client $client;
    
    public function __construct(Bitrix24Client $client)
    {
        $this->client = $client;
    }
    
    /**
     * Получение задач по ID
     * 
     * @param array $taskIds Массив ID задач
     * @return array Ассоциативный массив [taskId => taskData]
     */
    public function getTasksByIds(array $taskIds): array
    {
        if (empty($taskIds)) {
            return [];
        }
        
        return $this->client->getTasksBatch(
            $taskIds,
            ['*', 'UF_*'],
            TimeTrackingConfig::getDefaultBatchSize()
        );
    }
    
    /**
     * Получение задач с трудозатратами за период
     * 
     * @param array $employeeIds Массив ID сотрудников
     * @param DateTimeImmutable $periodStart Начало периода
     * @param DateTimeImmutable $periodEnd Конец периода
     * @return array Массив задач
     */
    public function getTasksWithElapsedTime(
        array $employeeIds,
        DateTimeImmutable $periodStart,
        DateTimeImmutable $periodEnd
    ): array {
        if (empty($employeeIds)) {
            return [];
        }
        
        $allTasks = [];
        $start = 0;
        $pageSize = TimeTrackingConfig::getDefaultPageSize();
        
        do {
            $tasks = $this->client->getTasks([
                'RESPONSIBLE_ID' => $employeeIds,
                '>=CHANGED_DATE' => $periodStart->format('Y-m-d'),
                '<=CHANGED_DATE' => $periodEnd->format('Y-m-d'),
                '>timeSpentInLogs' => 0
            ], [
                'ID',
                'TITLE',
                'CREATED_DATE',
                'CHANGED_DATE',
                'CREATED_BY',
                'RESPONSIBLE_ID',
                'timeSpentInLogs',
                'ufCrmTask'
            ], $start);
            
            $allTasks = array_merge($allTasks, $tasks);
            $start += $pageSize;
        } while (count($tasks) === $pageSize);
        
        return $allTasks;
    }
    
    /**
     * Получение детальной информации о задачах
     * 
     * @param array $taskIds Массив ID задач
     * @param array $select Поля для выборки
     * @return array Массив задач с детальной информацией
     */
    public function getTasksDetails(array $taskIds, array $select = []): array
    {
        if (empty($taskIds)) {
            return [];
        }
        
        $defaultSelect = [
            'ID',
            'TITLE',
            'CREATED_DATE',
            'START_DATE_PLAN',
            'END_DATE_PLAN',
            'DEADLINE',
            'CLOSED_DATE',
            'STATUS',
            'STAGE_ID',
            'RESPONSIBLE_ID',
            'CREATED_BY',
            'timeSpentInLogs',
            'UF_CRM_TASK'
        ];
        
        $select = !empty($select) ? $select : $defaultSelect;
        
        return $this->client->getTasksBatch(
            $taskIds,
            $select,
            TimeTrackingConfig::getDefaultBatchSize()
        );
    }
}
```

### 3. Создание ElapsedTimeRepository

#### 3.1. Файл: `api/tickets-time-tracking-sector-1c/repository/ElapsedTimeRepository.php`

**Репозиторий для работы с записями трудозатрат:**

```php
<?php

namespace TimeTracking\Repository;

use TimeTracking\Bitrix\Bitrix24Client;
use DateTimeImmutable;

/**
 * Репозиторий для работы с записями трудозатрат
 */
class ElapsedTimeRepository
{
    protected Bitrix24Client $client;
    
    public function __construct(Bitrix24Client $client)
    {
        $this->client = $client;
    }
    
    /**
     * Получение записей трудозатрат за период
     * 
     * @param array $employeeIds Массив ID сотрудников
     * @param DateTimeImmutable $periodStart Начало периода
     * @param DateTimeImmutable $periodEnd Конец периода
     * @param array $tasks Массив задач (для получения детальных записей)
     * @return array Массив записей трудозатрат
     */
    public function getElapsedTimeRecords(
        array $employeeIds,
        DateTimeImmutable $periodStart,
        DateTimeImmutable $periodEnd,
        array $tasks = []
    ): array {
        if (empty($employeeIds)) {
            return [];
        }
        
        $records = [];
        
        // Если задачи переданы, получаем детальные записи трудозатрат
        if (!empty($tasks)) {
            foreach ($tasks as $task) {
                $taskId = (int)($task['id'] ?? 0);
                if (!$taskId) {
                    continue;
                }
                
                $elapsedItems = $this->client->getElapsedItems($taskId);
                
                foreach ($elapsedItems as $item) {
                    $createdDate = $item['CREATED_DATE'] ?? $item['createdDate'] ?? null;
                    if (!$createdDate) {
                        continue;
                    }
                    
                    // Фильтрация по периоду
                    $createdDateTime = new DateTimeImmutable($createdDate);
                    if ($createdDateTime < $periodStart || $createdDateTime > $periodEnd) {
                        continue;
                    }
                    
                    // Фильтрация по сотрудникам
                    $itemUserId = (int)($item['USER_ID'] ?? $item['userId'] ?? 0);
                    if ($itemUserId && !in_array($itemUserId, $employeeIds, true)) {
                        continue;
                    }
                    
                    // Получение времени в секундах
                    $seconds = $this->extractSeconds($item);
                    if ($seconds <= 0) {
                        continue;
                    }
                    
                    $userId = $itemUserId ?: (int)($task['responsibleId'] ?? $task['createdBy'] ?? 0);
                    
                    $records[] = [
                        'ID' => $item['ID'] ?? $item['id'] ?? null,
                        'TASK_ID' => $taskId,
                        'USER_ID' => $userId,
                        'CREATED_DATE' => $createdDate,
                        'SECONDS' => $seconds,
                        'MINUTES' => round($seconds / 60, 2),
                        'HOURS' => round($seconds / 3600, 2),
                        'COMMENT_TEXT' => $item['COMMENT_TEXT'] ?? $item['commentText'] ?? '',
                        '_task' => $task,
                        '_ufCrmTask' => $task['ufCrmTask'] ?? null
                    ];
                }
            }
        }
        
        // Fallback: если нет детальных записей, используем агрегированные данные
        if (empty($records) && !empty($tasks)) {
            foreach ($tasks as $task) {
                $timeSpent = (int)($task['timeSpentInLogs'] ?? 0);
                if ($timeSpent <= 0) {
                    continue;
                }
                
                $dateForWeek = $task['changedDate'] ?? $task['createdDate'] ?? null;
                if (!$dateForWeek) {
                    continue;
                }
                
                $records[] = [
                    'ID' => $task['id'] ?? null,
                    'TASK_ID' => (int)($task['id'] ?? 0),
                    'USER_ID' => (int)($task['responsibleId'] ?? $task['createdBy'] ?? 0),
                    'CREATED_DATE' => $dateForWeek,
                    'SECONDS' => $timeSpent,
                    'MINUTES' => round($timeSpent / 60, 2),
                    'HOURS' => round($timeSpent / 3600, 2),
                    'COMMENT_TEXT' => '',
                    '_task' => $task,
                    '_ufCrmTask' => $task['ufCrmTask'] ?? null
                ];
            }
        }
        
        return $records;
    }
    
    /**
     * Извлечение времени в секундах из записи трудозатраты
     * 
     * @param array $item Запись трудозатраты
     * @return int Время в секундах
     */
    protected function extractSeconds(array $item): int
    {
        // Пробуем SECONDS
        $seconds = (int)($item['SECONDS'] ?? 0);
        if ($seconds > 0) {
            return $seconds;
        }
        
        // Пробуем MINUTES
        $minutes = (int)($item['MINUTES'] ?? 0);
        if ($minutes > 0) {
            return $minutes * 60;
        }
        
        // Пробуем HOURS
        $hours = (float)($item['HOURS'] ?? 0);
        if ($hours > 0) {
            return (int)($hours * 3600);
        }
        
        return 0;
    }
}
```

### 4. Создание TicketRepository

#### 4.1. Файл: `api/tickets-time-tracking-sector-1c/repository/TicketRepository.php`

**Репозиторий для работы с тикетами:**

```php
<?php

namespace TimeTracking\Repository;

use TimeTracking\Bitrix\Bitrix24Client;
use TimeTracking\Config\TimeTrackingConfig;

/**
 * Репозиторий для работы с тикетами (CRM items)
 */
class TicketRepository
{
    protected Bitrix24Client $client;
    
    public function __construct(Bitrix24Client $client)
    {
        $this->client = $client;
    }
    
    /**
     * Получение тикетов по ID
     * 
     * @param array $ticketIds Массив ID тикетов
     * @param array $filter Дополнительный фильтр
     * @return array Ассоциативный массив [ticketId => ticketData]
     */
    public function getTicketsByIds(array $ticketIds, array $filter = []): array
    {
        if (empty($ticketIds)) {
            return [];
        }
        
        $filter = array_merge($filter, [
            'UF_CRM_7_TYPE_PRODUCT' => TimeTrackingConfig::getSector1CTag()
        ]);
        
        return $this->client->getTicketsBatch(
            TimeTrackingConfig::getEntityTypeId(),
            $ticketIds,
            $filter,
            [
                'id',
                'title',
                'createdTime',
                'UF_CRM_7_TYPE_PRODUCT',
                'stageId',
                'ufSubject',
                'ufSlaBlockStr',
                'ufSlaServiceStr',
                'ufActionStr',
                'ufCrm7UfPriority'
            ],
            TimeTrackingConfig::getDefaultBatchSize()
        );
    }
}
```

---

## 📝 Структура файлов после этапа 5

```
api/
└── tickets-time-tracking-sector-1c/
    ├── repository/
    │   ├── EmployeeRepository.php      # ✅ Реализовано
    │   ├── TaskRepository.php          # ✅ Реализовано
    │   ├── ElapsedTimeRepository.php   # ✅ Реализовано
    │   └── TicketRepository.php       # ✅ Реализовано
    └── ...
```

---

## ✅ Критерии приёмки этапа

- [ ] Класс `EmployeeRepository` создан и содержит:
  - [ ] `getSector1CEmployees()`
  - [ ] `getEmployeesData()`
- [ ] Класс `TaskRepository` создан и содержит:
  - [ ] `getTasksByIds()`
  - [ ] `getTasksWithElapsedTime()`
  - [ ] `getTasksDetails()`
- [ ] Класс `ElapsedTimeRepository` создан и содержит:
  - [ ] `getElapsedTimeRecords()`
  - [ ] `extractSeconds()` (protected)
- [ ] Класс `TicketRepository` создан и содержит:
  - [ ] `getTicketsByIds()`
- [ ] Все репозитории используют `Bitrix24Client`
- [ ] Все репозитории используют `TimeTrackingConfig`
- [ ] Все методы протестированы
- [ ] Код соответствует стандартам PSR-12

---

## 🧪 Тестирование

### Unit-тесты для репозиториев

```php
<?php
// tests/EmployeeRepositoryTest.php
// tests/TaskRepositoryTest.php
// tests/ElapsedTimeRepositoryTest.php
// tests/TicketRepositoryTest.php
```

**Примечание:** Тесты требуют мокирования `Bitrix24Client`

---

## 🔗 Связанные документы

- **Основной план:** `DOCS/REFACTORING/TASK-069-refactoring-plan-tickets-time-tracking.md`
- **Предыдущий этап:** `DOCS/REFACTORING/TASK-069-stage-04-bitrix-client.md`
- **Следующий этап:** `DOCS/REFACTORING/TASK-069-stage-06-domain.md`

---

## ⏱️ Оценка времени

**4-5 часов**

- Создание EmployeeRepository: 45 минут
- Создание TaskRepository: 1.5 часа
- Создание ElapsedTimeRepository: 1.5 часа
- Создание TicketRepository: 45 минут
- Написание тестов: 1 час
- Тестирование и проверка: 30 минут

---

**История правок:**
- 2025-12-23 18:18 (UTC+3, Брест): Создан документ этапа 5

