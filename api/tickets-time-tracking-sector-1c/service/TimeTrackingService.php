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
 * 
 * @package TimeTracking\Service
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
     * @throws \InvalidArgumentException При неверных параметрах
     */
    public function getTimeTrackingData(array $params): array
    {
        error_log("[TimeTrackingService] Starting data collection");
        
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
        
        error_log(sprintf(
            "[TimeTrackingService] Week bounds: %s to %s (%d weeks)",
            $currentWeekStart->format('Y-m-d'),
            $currentWeekEnd->format('Y-m-d'),
            count($weeks)
        ));
        
        // Определение периода для запроса
        $periodStart = $weeks[0]['weekStart'];
        $periodEnd = end($weeks)['weekEnd'];
        
        // Получение сотрудников сектора 1С
        error_log("[TimeTrackingService] Getting sector 1C employees");
        $employeeIds = $this->employeeRepository->getSector1CEmployees();
        error_log(sprintf("[TimeTrackingService] Found %d employees in sector 1C", count($employeeIds)));
        
        if (empty($employeeIds)) {
            error_log("[TimeTrackingService] No employees found in sector 1C");
            return $this->buildEmptyResponse($currentWeekStart, $currentWeekEnd, $weeks, $params);
        }
        
        // Получение задач с трудозатратами
        error_log(sprintf(
            "[TimeTrackingService] Getting tasks with elapsed time: employees=%d, period=%s to %s",
            count($employeeIds),
            $periodStart->format('Y-m-d H:i:s'),
            $periodEnd->format('Y-m-d H:i:s')
        ));
        
        $tasks = $this->taskRepository->getTasksWithElapsedTime(
            $employeeIds,
            $periodStart,
            $periodEnd
        );
        
        // Получение записей трудозатрат
        error_log("[TimeTrackingService] Getting elapsed time records");
        $records = $this->elapsedTimeRepository->getElapsedTimeRecords(
            $employeeIds,
            $periodStart,
            $periodEnd,
            $tasks
        );
        
        error_log(sprintf("[TimeTrackingService] Records collected: %d", count($records)));
        
        if (empty($records)) {
            error_log("[TimeTrackingService] No records found, returning empty response");
            return $this->buildEmptyResponse($currentWeekStart, $currentWeekEnd, $weeks, $params, $employeeIds);
        }
        
        // Извлечение задач из записей
        $tasksFromRecords = $this->extractTasksFromRecords($records);
        
        // Если задач нет в записях, получаем их отдельно
        if (empty($tasksFromRecords)) {
            $taskIds = $this->extractTaskIdsFromRecords($records);
            if (!empty($taskIds)) {
                error_log(sprintf("[TimeTrackingService] Loading tasks by IDs: %d tasks", count($taskIds)));
                $tasksFromRecords = $this->taskRepository->getTasksByIds($taskIds);
            }
        }
        
        error_log(sprintf("[TimeTrackingService] Tasks collected: %d", count($tasksFromRecords)));
        
        // Матчинг задач с тикетами
        error_log("[TimeTrackingService] Matching tasks with tickets");
        $taskTicketMap = $this->taskTicketMatcher->matchTasksWithTickets($tasksFromRecords);
        
        // Получение данных сотрудников
        error_log("[TimeTrackingService] Getting employees data");
        $employees = $this->employeeRepository->getEmployeesData($employeeIds);
        
        // Агрегация данных
        error_log("[TimeTrackingService] Aggregating data by weeks and employees");
        $weeksData = $this->timeAggregator->aggregateByWeeksAndEmployees(
            $records,
            $weeks,
            $tasksFromRecords,
            $taskTicketMap,
            $employees
        );
        
        // Создание summary
        error_log("[TimeTrackingService] Creating employees summary");
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
            error_log("[TimeTrackingService] Getting task details");
            $taskDetails = $this->getTaskDetails($params, $records, $weeks, $taskTicketMap);
            $responseData['tasks'] = $taskDetails['tasks'];
            $responseData['pagination'] = $taskDetails['pagination'];
            
            error_log(sprintf(
                "[TimeTrackingService] Task details loaded: %d tasks, page %d/%d",
                count($taskDetails['tasks']),
                $taskDetails['pagination']['currentPage'],
                $taskDetails['pagination']['totalPages']
            ));
        }
        
        error_log("[TimeTrackingService] Data collection completed successfully");
        
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

