# TASK-069: Этап 7 — Создание основного сервиса бизнес-логики

**Дата создания:** 2025-12-23 18:18 (UTC+3, Брест)  
**Версия:** 1.0  
**Статус:** Планирование  
**Исполнители:** Рефактор-менеджер, Программист

---

## 📋 Цель этапа

Создать основной сервис `TimeTrackingService`, который оркестрирует всю бизнес-логику, объединяя репозитории и доменные сервисы.

---

## 🔍 Задачи этапа

### 1. Создание TimeTrackingService

#### 1.1. Файл: `api/tickets-time-tracking-sector-1c/service/TimeTrackingService.php`

**Основной сервис бизнес-логики:**

```php
<?php

namespace TimeTracking\Service;

use TimeTracking\Repository\EmployeeRepository;
use TimeTracking\Repository\TaskRepository;
use TimeTracking\Repository\ElapsedTimeRepository;
use TimeTracking\Repository\TicketRepository;
use TimeTracking\Domain\TaskTicketMatcher;
use TimeTracking\Domain\TimeAggregator;
use TimeTracking\Domain\EmployeeSummaryBuilder;
use TimeTracking\Util\WeekHelper;
use TimeTracking\Config\TimeTrackingConfig;
use DateTimeImmutable;

/**
 * Основной сервис для получения данных учёта времени
 * 
 * Оркестрирует работу репозиториев и доменных сервисов
 */
class TimeTrackingService
{
    protected EmployeeRepository $employeeRepository;
    protected TaskRepository $taskRepository;
    protected ElapsedTimeRepository $elapsedTimeRepository;
    protected TicketRepository $ticketRepository;
    protected TaskTicketMatcher $taskTicketMatcher;
    protected TimeAggregator $timeAggregator;
    protected EmployeeSummaryBuilder $employeeSummaryBuilder;
    
    public function __construct(
        EmployeeRepository $employeeRepository,
        TaskRepository $taskRepository,
        ElapsedTimeRepository $elapsedTimeRepository,
        TicketRepository $ticketRepository,
        TaskTicketMatcher $taskTicketMatcher,
        TimeAggregator $timeAggregator,
        EmployeeSummaryBuilder $employeeSummaryBuilder
    ) {
        $this->employeeRepository = $employeeRepository;
        $this->taskRepository = $taskRepository;
        $this->elapsedTimeRepository = $elapsedTimeRepository;
        $this->ticketRepository = $ticketRepository;
        $this->taskTicketMatcher = $taskTicketMatcher;
        $this->timeAggregator = $timeAggregator;
        $this->employeeSummaryBuilder = $employeeSummaryBuilder;
    }
    
    /**
     * Получение данных учёта времени
     * 
     * @param array $params Параметры запроса:
     *   - product: string (обязательно, должен быть '1C')
     *   - weekStartUtc: string|null (опционально)
     *   - weekEndUtc: string|null (опционально)
     *   - includeTaskDetails: bool (опционально, по умолчанию false)
     *   - taskIds: array|null (опционально, для фильтрации задач)
     *   - page: int (опционально, по умолчанию 1)
     *   - perPage: int (опционально, по умолчанию 10)
     * @return array Структура ответа API
     */
    public function getTimeTrackingData(array $params): array
    {
        // Валидация product
        $product = $params['product'] ?? '1C';
        if ($product !== '1C') {
            throw new \InvalidArgumentException('Only product=1C is supported');
        }
        
        // Получение границ недель
        $weekStartParam = $params['weekStartUtc'] ?? null;
        $weekEndParam = $params['weekEndUtc'] ?? null;
        [$currentWeekStart, $currentWeekEnd] = WeekHelper::getWeekBounds($weekStartParam, $weekEndParam);
        $weeks = WeekHelper::getWeeksBounds(
            $currentWeekStart,
            $currentWeekEnd,
            TimeTrackingConfig::getWeeksCount()
        );
        
        // Определение периода для запроса
        $periodStart = $weeks[0]['weekStart'];
        $periodEnd = end($weeks)['weekEnd'];
        
        // Получение сотрудников сектора 1С
        $employeeIds = $this->employeeRepository->getSector1CEmployees();
        
        if (empty($employeeIds)) {
            return $this->buildEmptyResponse($currentWeekStart, $currentWeekEnd, $weeks, $params);
        }
        
        // Получение задач с трудозатратами
        $tasks = $this->taskRepository->getTasksWithElapsedTime(
            $employeeIds,
            $periodStart,
            $periodEnd
        );
        
        // Получение записей трудозатрат
        $records = $this->elapsedTimeRepository->getElapsedTimeRecords(
            $employeeIds,
            $periodStart,
            $periodEnd,
            $tasks
        );
        
        if (empty($records)) {
            return $this->buildEmptyResponse($currentWeekStart, $currentWeekEnd, $weeks, $params, $employeeIds);
        }
        
        // Извлечение задач из записей
        $tasksFromRecords = $this->extractTasksFromRecords($records);
        
        // Если задач нет в записях, получаем их отдельно
        if (empty($tasksFromRecords)) {
            $taskIds = $this->extractTaskIdsFromRecords($records);
            if (!empty($taskIds)) {
                $tasksFromRecords = $this->taskRepository->getTasksByIds($taskIds);
            }
        }
        
        // Матчинг задач с тикетами
        $taskTicketMap = $this->taskTicketMatcher->matchTasksWithTickets($tasksFromRecords);
        
        // Получение данных сотрудников
        $employees = $this->employeeRepository->getEmployeesData($employeeIds);
        
        // Агрегация данных
        $weeksData = $this->timeAggregator->aggregateByWeeksAndEmployees(
            $records,
            $weeks,
            $tasksFromRecords,
            $taskTicketMap,
            $employees
        );
        
        // Создание summary
        $employeesSummary = $this->employeeSummaryBuilder->createEmployeesSummary($weeksData);
        
        // Подсчёт общих метрик
        $totalElapsedTime = 0;
        $totalRecordsCount = 0;
        foreach ($weeksData as $week) {
            $totalElapsedTime += $week['totalElapsedTime'];
            $totalRecordsCount += $week['recordsCount'];
        }
        
        // Подготовка данных ответа
        $responseData = [
            'totalElapsedTime' => round($totalElapsedTime, 2),
            'totalElapsedTimeUnit' => 'hours',
            'totalRecordsCount' => $totalRecordsCount,
            'weeks' => $weeksData,
            'employeesSummary' => $employeesSummary
        ];
        
        // Если запрошены детальные данные о задачах
        $includeTaskDetails = $params['includeTaskDetails'] ?? false;
        if ($includeTaskDetails) {
            $taskDetails = $this->getTaskDetails($params, $records, $weeks, $taskTicketMap);
            $responseData['tasks'] = $taskDetails['tasks'];
            $responseData['pagination'] = $taskDetails['pagination'];
        }
        
        return [
            'success' => true,
            'meta' => [
                'weekNumber' => (int)$currentWeekStart->format('W'),
                'weekStartUtc' => $currentWeekStart->format('Y-m-d\TH:i:s\Z'),
                'weekEndUtc' => $currentWeekEnd->format('Y-m-d\TH:i:s\Z'),
                'totalWeeks' => count($weeks),
                'sector1CEmployeesCount' => count($employeeIds)
            ],
            'data' => $responseData
        ];
    }
    
    /**
     * Построение пустого ответа
     * 
     * @param DateTimeImmutable $currentWeekStart
     * @param DateTimeImmutable $currentWeekEnd
     * @param array $weeks
     * @param array $params
     * @param array $employeeIds
     * @return array
     */
    protected function buildEmptyResponse(
        DateTimeImmutable $currentWeekStart,
        DateTimeImmutable $currentWeekEnd,
        array $weeks,
        array $params,
        array $employeeIds = []
    ): array {
        $responseData = [
            'totalElapsedTime' => 0,
            'totalElapsedTimeUnit' => 'hours',
            'totalRecordsCount' => 0,
            'weeks' => [],
            'employeesSummary' => []
        ];
        
        $includeTaskDetails = $params['includeTaskDetails'] ?? false;
        if ($includeTaskDetails) {
            $responseData['tasks'] = [];
            $responseData['pagination'] = [
                'totalTasks' => 0,
                'currentPage' => 1,
                'perPage' => isset($params['perPage']) ? 
                    max(1, min(TimeTrackingConfig::getMaxTasksPerPage(), (int)$params['perPage'])) : 
                    TimeTrackingConfig::getDefaultTasksPerPage(),
                'totalPages' => 0
            ];
        }
        
        return [
            'success' => true,
            'meta' => [
                'weekNumber' => (int)$currentWeekStart->format('W'),
                'weekStartUtc' => $currentWeekStart->format('Y-m-d\TH:i:s\Z'),
                'weekEndUtc' => $currentWeekEnd->format('Y-m-d\TH:i:s\Z'),
                'totalWeeks' => count($weeks),
                'sector1CEmployeesCount' => count($employeeIds)
            ],
            'data' => $responseData
        ];
    }
    
    /**
     * Извлечение задач из записей
     * 
     * @param array $records
     * @return array
     */
    protected function extractTasksFromRecords(array $records): array
    {
        $tasks = [];
        foreach ($records as $record) {
            if (isset($record['_task'])) {
                $taskId = (int)($record['TASK_ID'] ?? 0);
                if ($taskId) {
                    $tasks[$taskId] = $record['_task'];
                }
            }
        }
        return $tasks;
    }
    
    /**
     * Извлечение ID задач из записей
     * 
     * @param array $records
     * @return array
     */
    protected function extractTaskIdsFromRecords(array $records): array
    {
        $taskIds = [];
        foreach ($records as $record) {
            $taskId = (int)($record['TASK_ID'] ?? $record['taskId'] ?? 0);
            if ($taskId > 0 && !in_array($taskId, $taskIds, true)) {
                $taskIds[] = $taskId;
            }
        }
        return array_unique($taskIds);
    }
    
    /**
     * Получение детальной информации о задачах
     * 
     * @param array $params
     * @param array $records
     * @param array $weeks
     * @param array $taskTicketMap
     * @return array
     */
    protected function getTaskDetails(array $params, array $records, array $weeks, array $taskTicketMap): array
    {
        $taskIds = [];
        
        // Если taskIds переданы в запросе, используем их
        if (isset($params['taskIds']) && is_array($params['taskIds']) && !empty($params['taskIds'])) {
            $taskIds = array_map('intval', $params['taskIds']);
            $taskIds = array_filter($taskIds, function($id) { return $id > 0; });
            $taskIds = array_values(array_unique($taskIds));
        } else {
            // Иначе собираем все уникальные ID задач из записей
            $taskIds = $this->extractTaskIdsFromRecords($records);
        }
        
        if (empty($taskIds)) {
            return [
                'tasks' => [],
                'pagination' => [
                    'totalTasks' => 0,
                    'currentPage' => 1,
                    'perPage' => isset($params['perPage']) ? 
                        max(1, min(TimeTrackingConfig::getMaxTasksPerPage(), (int)$params['perPage'])) : 
                        TimeTrackingConfig::getDefaultTasksPerPage(),
                    'totalPages' => 0
                ]
            ];
        }
        
        $page = isset($params['page']) ? max(1, (int)$params['page']) : 1;
        $perPage = isset($params['perPage']) ? 
            max(1, min(TimeTrackingConfig::getMaxTasksPerPage(), (int)$params['perPage'])) : 
            TimeTrackingConfig::getDefaultTasksPerPage();
        
        // Получаем детальную информацию о задачах
        $allTasks = $this->taskRepository->getTasksDetails($taskIds);
        
        // Добавляем информацию о тикетах
        $tasksWithTickets = [];
        foreach ($allTasks as $taskId => $task) {
            $taskData = [
                'id' => $taskId,
                'title' => $task['title'] ?? $task['TITLE'] ?? 'Без названия',
                'startDate' => $task['startDatePlan'] ?? $task['START_DATE_PLAN'] ?? 
                              $task['createdDate'] ?? $task['CREATED_DATE'] ?? null,
                'deadline' => $task['deadline'] ?? $task['DEADLINE'] ?? 
                            $task['endDatePlan'] ?? $task['END_DATE_PLAN'] ?? null,
                'closedDate' => $task['closedDate'] ?? $task['CLOSED_DATE'] ?? null,
                'status' => (int)($task['status'] ?? $task['STATUS'] ?? 0),
                'stageId' => (int)($task['stageId'] ?? $task['STAGE_ID'] ?? 0),
                'responsibleId' => (int)($task['responsibleId'] ?? $task['RESPONSIBLE_ID'] ?? 0),
                'createdBy' => (int)($task['createdBy'] ?? $task['CREATED_BY'] ?? 0),
                'elapsedTime' => 0
            ];
            
            // Получаем трудозатрату
            $timeSpentSeconds = (int)($task['timeSpentInLogs'] ?? 0);
            if ($timeSpentSeconds > 0) {
                $taskData['elapsedTime'] = round($timeSpentSeconds / 3600, 2);
            }
            
            // Добавляем информацию о тикете
            if (isset($taskTicketMap[$taskId]['ticket'])) {
                $ticket = $taskTicketMap[$taskId]['ticket'];
                $ticketCreatedWeek = null;
                if (isset($ticket['createdTime'])) {
                    $ticketCreatedWeek = WeekHelper::getWeekNumberByDate($ticket['createdTime'], $weeks);
                }
                
                $taskData['ticket'] = [
                    'id' => (int)($ticket['id'] ?? 0),
                    'title' => $ticket['title'] ?? null,
                    'createdTime' => $ticket['createdTime'] ?? null,
                    'createdWeek' => $ticketCreatedWeek,
                    'stageId' => $ticket['stageId'] ?? null,
                    'ufSubject' => $ticket['ufSubject'] ?? null,
                    'ufCrm7TypeProduct' => $ticket['UF_CRM_7_TYPE_PRODUCT'] ?? $ticket['ufCrm7TypeProduct'] ?? null,
                    'ufSlaBlockStr' => $ticket['ufSlaBlockStr'] ?? null,
                    'ufSlaServiceStr' => $ticket['ufSlaServiceStr'] ?? null,
                    'ufActionStr' => $ticket['ufActionStr'] ?? null,
                    'ufCrm7UfPriority' => $ticket['ufCrm7UfPriority'] ?? null
                ];
            } else {
                $taskData['ticket'] = null;
            }
            
            $tasksWithTickets[] = $taskData;
        }
        
        // Применяем пагинацию
        $totalTasks = count($tasksWithTickets);
        $totalPages = $totalTasks > 0 ? (int)ceil($totalTasks / $perPage) : 0;
        $currentPage = max(1, min($page, $totalPages));
        
        $start = ($currentPage - 1) * $perPage;
        $paginatedTasks = array_slice($tasksWithTickets, $start, $perPage);
        
        return [
            'tasks' => $paginatedTasks,
            'pagination' => [
                'totalTasks' => $totalTasks,
                'currentPage' => $currentPage,
                'perPage' => $perPage,
                'totalPages' => $totalPages
            ]
        ];
    }
}
```

---

## 📝 Структура файлов после этапа 7

```
api/
└── tickets-time-tracking-sector-1c/
    ├── service/
    │   └── TimeTrackingService.php    # ✅ Реализовано
    └── ...
```

---

## ✅ Критерии приёмки этапа

- [ ] Класс `TimeTrackingService` создан
- [ ] Метод `getTimeTrackingData()` реализован
- [ ] Метод `buildEmptyResponse()` реализован
- [ ] Метод `extractTasksFromRecords()` реализован
- [ ] Метод `extractTaskIdsFromRecords()` реализован
- [ ] Метод `getTaskDetails()` реализован
- [ ] Все зависимости инжектируются через конструктор
- [ ] Обработка ошибок реализована
- [ ] Логирование добавлено
- [ ] Все методы протестированы
- [ ] Код соответствует стандартам PSR-12

---

## 🧪 Тестирование

### Unit-тесты для TimeTrackingService

```php
<?php
// tests/TimeTrackingServiceTest.php
```

**Примечание:** Тесты требуют мокирования всех зависимостей

---

## 🔗 Связанные документы

- **Основной план:** `DOCS/REFACTORING/TASK-069-refactoring-plan-tickets-time-tracking.md`
- **Предыдущий этап:** `DOCS/REFACTORING/TASK-069-stage-06-domain.md`
- **Следующий этап:** `DOCS/REFACTORING/TASK-069-stage-08-controller.md`

---

## ⏱️ Оценка времени

**3-4 часа**

- Создание основного метода: 1.5 часа
- Реализация вспомогательных методов: 1 час
- Интеграция всех компонентов: 1 час
- Написание тестов: 1 час
- Тестирование и проверка: 30 минут

---

**История правок:**
- 2025-12-23 18:18 (UTC+3, Брест): Создан документ этапа 7

