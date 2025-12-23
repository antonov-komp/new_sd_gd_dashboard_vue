# TASK-069: Этап 6 — Создание доменных сервисов (матчинг, агрегация)

**Дата создания:** 2025-12-23 18:18 (UTC+3, Брест)  
**Версия:** 1.0  
**Статус:** Планирование  
**Исполнители:** Рефактор-менеджер, Программист

---

## 📋 Цель этапа

Выделить доменную логику (матчинг задач с тикетами, агрегация по неделям, построение summary) в отдельные сервисы.

---

## 🔍 Задачи этапа

### 1. Создание TaskTicketMatcher

#### 1.1. Файл: `api/tickets-time-tracking-sector-1c/domain/TaskTicketMatcher.php`

**Сервис для матчинга задач с тикетами:**

```php
<?php

namespace TimeTracking\Domain;

use TimeTracking\Repository\TicketRepository;
use TimeTracking\Config\TimeTrackingConfig;

/**
 * Сервис для матчинга задач с тикетами
 * 
 * Использует поле ufCrmTask из задачи (формат: ["T8c_3093"], 
 * где 8c = 140 в hex, 3093 = ID тикета)
 */
class TaskTicketMatcher
{
    protected TicketRepository $ticketRepository;
    
    public function __construct(TicketRepository $ticketRepository)
    {
        $this->ticketRepository = $ticketRepository;
    }
    
    /**
     * Матчинг задач с тикетами
     * 
     * @param array $tasks Массив задач [taskId => taskData]
     * @return array Ассоциативный массив [taskId => ['ticketId' => int, 'ticket' => array]]
     */
    public function matchTasksWithTickets(array $tasks): array
    {
        $taskTicketMap = [];
        $ticketIdsToLoad = [];
        
        // Собираем ID тикетов из задач
        foreach ($tasks as $taskId => $task) {
            $ticketId = $this->extractTicketId($task);
            
            if ($ticketId) {
                $ticketIdsToLoad[$ticketId] = true;
                $taskTicketMap[$taskId] = ['ticketId' => $ticketId];
            }
        }
        
        if (empty($ticketIdsToLoad)) {
            return [];
        }
        
        // Загружаем тикеты
        $ticketIds = array_keys($ticketIdsToLoad);
        $tickets = $this->ticketRepository->getTicketsByIds($ticketIds);
        
        // Связываем тикеты с задачами
        foreach ($tickets as $ticketId => $ticket) {
            foreach ($taskTicketMap as $taskId => &$data) {
                if (isset($data['ticketId']) && (int)$data['ticketId'] === $ticketId) {
                    $data['ticket'] = $ticket;
                    break;
                }
            }
        }
        
        return $taskTicketMap;
    }
    
    /**
     * Извлечение ID тикета из задачи
     * 
     * @param array $task Данные задачи
     * @return int|null ID тикета или null
     */
    protected function extractTicketId(array $task): ?int
    {
        // Поле ufCrmTask содержит массив строк формата ["T8c_3093"]
        // где 8c = 140 (тип сущности) в hex, 3093 = ID тикета
        if (isset($task['ufCrmTask']) && is_array($task['ufCrmTask']) && !empty($task['ufCrmTask'])) {
            $ufCrmTaskValue = $task['ufCrmTask'][0] ?? null;
            if ($ufCrmTaskValue && preg_match('/T8c_(\d+)/', $ufCrmTaskValue, $matches)) {
                return (int)$matches[1];
            }
        }
        
        // Альтернативные варианты
        if (isset($task['ufCrmTicketId'])) {
            return (int)$task['ufCrmTicketId'];
        }
        
        if (isset($task['UF_CRM_TICKET_ID'])) {
            return (int)$task['UF_CRM_TICKET_ID'];
        }
        
        if (isset($task['UF_CRM_140_ID'])) {
            return (int)$task['UF_CRM_140_ID'];
        }
        
        return null;
    }
}
```

### 2. Создание TimeAggregator

#### 2.1. Файл: `api/tickets-time-tracking-sector-1c/domain/TimeAggregator.php`

**Сервис для агрегации трудозатрат:**

```php
<?php

namespace TimeTracking\Domain;

use TimeTracking\Util\WeekHelper;

/**
 * Сервис для агрегации трудозатрат по неделям и сотрудникам
 */
class TimeAggregator
{
    /**
     * Агрегация трудозатрат по неделям и сотрудникам
     * 
     * @param array $records Записи трудозатрат
     * @param array $weeks Массив недель (из WeekHelper::getWeeksBounds)
     * @param array $tasks Задачи [taskId => taskData]
     * @param array $taskTicketMap Матчинг задач с тикетами [taskId => ticketData]
     * @param array $employees Данные сотрудников [employeeId => employeeData]
     * @return array Агрегированные данные
     */
    public function aggregateByWeeksAndEmployees(
        array $records,
        array $weeks,
        array $tasks,
        array $taskTicketMap,
        array $employees
    ): array {
        $aggregated = [];
        
        // Инициализация структуры
        foreach ($weeks as $week) {
            $aggregated[$week['weekNumber']] = [
                'weekNumber' => $week['weekNumber'],
                'weekStartUtc' => $week['weekStartUtc'],
                'weekEndUtc' => $week['weekEndUtc'],
                'totalElapsedTime' => 0,
                'recordsCount' => 0,
                'employees' => []
            ];
        }
        
        // Агрегация записей
        foreach ($records as $record) {
            $createdDate = $record['CREATED_DATE'] ?? $record['createdDate'] ?? null;
            if (!$createdDate) {
                continue;
            }
            
            // Определить неделю
            $weekNumber = WeekHelper::getWeekNumberByDate($createdDate, $weeks);
            if (!$weekNumber || !isset($aggregated[$weekNumber])) {
                continue;
            }
            
            $employeeId = (int)($record['USER_ID'] ?? $record['userId'] ?? 0);
            if (!$employeeId) {
                continue;
            }
            
            // Получить время в часах
            $elapsedTimeHours = $this->extractHours($record);
            if ($elapsedTimeHours <= 0) {
                continue;
            }
            
            $taskId = (int)($record['TASK_ID'] ?? $record['taskId'] ?? 0);
            
            // Инициализация сотрудника в неделе
            if (!isset($aggregated[$weekNumber]['employees'][$employeeId])) {
                $aggregated[$weekNumber]['employees'][$employeeId] = [
                    'id' => $employeeId,
                    'name' => $employees[$employeeId]['name'] ?? 'Неизвестный',
                    'elapsedTime' => 0,
                    'recordsCount' => 0,
                    'tasksCount' => 0,
                    'ticketsCount' => 0,
                    'tasks' => []
                ];
            }
            
            // Агрегация
            $aggregated[$weekNumber]['employees'][$employeeId]['elapsedTime'] += $elapsedTimeHours;
            $aggregated[$weekNumber]['employees'][$employeeId]['recordsCount']++;
            
            // Подсчёт уникальных задач и тикетов
            if ($taskId) {
                $this->processTask(
                    $aggregated[$weekNumber]['employees'][$employeeId],
                    $taskId,
                    $elapsedTimeHours,
                    $taskTicketMap,
                    $weeks
                );
            }
            
            $aggregated[$weekNumber]['totalElapsedTime'] += $elapsedTimeHours;
            $aggregated[$weekNumber]['recordsCount']++;
        }
        
        // Преобразование в формат ответа
        return $this->formatResult($aggregated);
    }
    
    /**
     * Обработка задачи в агрегации
     * 
     * @param array &$employee Данные сотрудника (по ссылке)
     * @param int $taskId ID задачи
     * @param float $elapsedTimeHours Трудозатрата в часах
     * @param array $taskTicketMap Матчинг задач с тикетами
     * @param array $weeks Массив недель
     */
    protected function processTask(
        array &$employee,
        int $taskId,
        float $elapsedTimeHours,
        array $taskTicketMap,
        array $weeks
    ): void {
        // Ищем задачу в массиве
        $taskIndex = null;
        foreach ($employee['tasks'] as $index => $task) {
            if (isset($task['id']) && $task['id'] === $taskId) {
                $taskIndex = $index;
                break;
            }
        }
        
        if ($taskIndex === null) {
            // Новая задача
            $taskData = [
                'id' => $taskId,
                'elapsedTime' => $elapsedTimeHours
            ];
            
            // Добавляем информацию о тикете
            if (isset($taskTicketMap[$taskId]['ticket'])) {
                $ticket = $taskTicketMap[$taskId]['ticket'];
                $taskData['ticket'] = [
                    'id' => (int)($ticket['id'] ?? $ticket['ID'] ?? 0),
                    'title' => $ticket['title'] ?? $ticket['name'] ?? null,
                    'createdWeek' => null
                ];
                
                // Определяем неделю создания тикета
                $ticketCreatedTime = $ticket['createdTime'] ?? $ticket['CREATED_TIME'] ?? null;
                if ($ticketCreatedTime) {
                    $ticketCreatedWeek = WeekHelper::getWeekNumberByDate($ticketCreatedTime, $weeks);
                    if ($ticketCreatedWeek) {
                        $taskData['ticket']['createdWeek'] = $ticketCreatedWeek;
                    }
                }
                
                $employee['ticketsCount']++;
            }
            
            $employee['tasks'][] = $taskData;
            $employee['tasksCount']++;
        } else {
            // Задача уже есть - добавляем трудозатрату
            $employee['tasks'][$taskIndex]['elapsedTime'] += $elapsedTimeHours;
        }
    }
    
    /**
     * Извлечение времени в часах из записи
     * 
     * @param array $record Запись трудозатраты
     * @return float Время в часах
     */
    protected function extractHours(array $record): float
    {
        $seconds = (float)($record['SECONDS'] ?? $record['seconds'] ?? 0);
        if ($seconds > 0) {
            return $seconds / 3600;
        }
        
        $minutes = (float)($record['MINUTES'] ?? $record['minutes'] ?? 0);
        if ($minutes > 0) {
            return ($minutes * 60) / 3600;
        }
        
        $hours = (float)($record['HOURS'] ?? $record['hours'] ?? 0);
        return $hours;
    }
    
    /**
     * Форматирование результата агрегации
     * 
     * @param array $aggregated Агрегированные данные
     * @return array Форматированный результат
     */
    protected function formatResult(array $aggregated): array
    {
        $result = [];
        
        foreach ($aggregated as $week) {
            // Округляем трудозатраты
            foreach ($week['employees'] as &$employee) {
                $employee['elapsedTime'] = round($employee['elapsedTime'], 2);
                
                if (isset($employee['tasks']) && is_array($employee['tasks'])) {
                    foreach ($employee['tasks'] as &$task) {
                        if (isset($task['elapsedTime'])) {
                            $task['elapsedTime'] = round($task['elapsedTime'], 2);
                        }
                    }
                    unset($task);
                }
            }
            unset($employee);
            
            $result[] = [
                'weekNumber' => $week['weekNumber'],
                'weekStartUtc' => $week['weekStartUtc'],
                'weekEndUtc' => $week['weekEndUtc'],
                'totalElapsedTime' => round($week['totalElapsedTime'], 2),
                'recordsCount' => $week['recordsCount'],
                'employees' => array_values($week['employees'])
            ];
        }
        
        return $result;
    }
}
```

### 3. Создание EmployeeSummaryBuilder

#### 3.1. Файл: `api/tickets-time-tracking-sector-1c/domain/EmployeeSummaryBuilder.php`

**Сервис для построения summary по сотрудникам:**

```php
<?php

namespace TimeTracking\Domain;

/**
 * Сервис для построения summary по сотрудникам
 */
class EmployeeSummaryBuilder
{
    /**
     * Создание summary по сотрудникам
     * 
     * @param array $weeksData Агрегированные данные по неделям
     * @return array Summary по сотрудникам
     */
    public function createEmployeesSummary(array $weeksData): array
    {
        $summary = [];
        
        foreach ($weeksData as $week) {
            foreach ($week['employees'] as $employee) {
                $employeeId = $employee['id'];
                
                if (!isset($summary[$employeeId])) {
                    $summary[$employeeId] = [
                        'id' => $employeeId,
                        'name' => $employee['name'],
                        'totalElapsedTime' => 0,
                        'totalRecordsCount' => 0,
                        'totalTasksCount' => 0,
                        'totalTicketsCount' => 0
                    ];
                }
                
                $summary[$employeeId]['totalElapsedTime'] += $employee['elapsedTime'];
                $summary[$employeeId]['totalRecordsCount'] += $employee['recordsCount'];
                $summary[$employeeId]['totalTasksCount'] += $employee['tasksCount'];
                $summary[$employeeId]['totalTicketsCount'] += $employee['ticketsCount'];
            }
        }
        
        // Округление значений
        foreach ($summary as &$emp) {
            $emp['totalElapsedTime'] = round($emp['totalElapsedTime'], 2);
        }
        unset($emp);
        
        return array_values($summary);
    }
}
```

---

## 📝 Структура файлов после этапа 6

```
api/
└── tickets-time-tracking-sector-1c/
    ├── domain/
    │   ├── TaskTicketMatcher.php      # ✅ Реализовано
    │   ├── TimeAggregator.php         # ✅ Реализовано
    │   └── EmployeeSummaryBuilder.php # ✅ Реализовано
    └── ...
```

---

## ✅ Критерии приёмки этапа

- [ ] Класс `TaskTicketMatcher` создан и содержит:
  - [ ] `matchTasksWithTickets()`
  - [ ] `extractTicketId()` (protected)
- [ ] Класс `TimeAggregator` создан и содержит:
  - [ ] `aggregateByWeeksAndEmployees()`
  - [ ] `processTask()` (protected)
  - [ ] `extractHours()` (protected)
  - [ ] `formatResult()` (protected)
- [ ] Класс `EmployeeSummaryBuilder` создан и содержит:
  - [ ] `createEmployeesSummary()`
- [ ] Все методы протестированы
- [ ] Код соответствует стандартам PSR-12

---

## 🧪 Тестирование

### Unit-тесты для доменных сервисов

```php
<?php
// tests/TaskTicketMatcherTest.php
// tests/TimeAggregatorTest.php
// tests/EmployeeSummaryBuilderTest.php
```

---

## 🔗 Связанные документы

- **Основной план:** `DOCS/REFACTORING/TASK-069-refactoring-plan-tickets-time-tracking.md`
- **Предыдущий этап:** `DOCS/REFACTORING/TASK-069-stage-05-repositories.md`
- **Следующий этап:** `DOCS/REFACTORING/TASK-069-stage-07-service.md`

---

## ⏱️ Оценка времени

**4-5 часов**

- Создание TaskTicketMatcher: 1 час
- Создание TimeAggregator: 2 часа
- Создание EmployeeSummaryBuilder: 30 минут
- Написание тестов: 1.5 часа
- Тестирование и проверка: 30 минут

---

**История правок:**
- 2025-12-23 18:18 (UTC+3, Брест): Создан документ этапа 6

