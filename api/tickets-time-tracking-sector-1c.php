<?php
/**
 * API endpoint: Трудозатраты на Тикеты сектора 1С
 *
 * Реализует контракт из TASK-050-02:
 * - Неделя ISO-8601 (пн–вс), расчёт в UTC.
 * - product=1C фильтруется первым шагом.
 * - Получение записей из таблицы фактов "Трудозатрата".
 * - Матчинг с задачами и тикетами.
 * - Агрегация по неделям и сотрудникам.
 *
 * Примечание: минимальная реализация напрямую читает Bitrix24 через CRest.
 * При необходимости можно заменить на кеш/логи.
 */

require_once __DIR__ . '/../crest.php';

header('Content-Type: application/json; charset=utf-8');

// Константы
const SECTOR_1C_DEPARTMENT_ID = 366; // Отдел "Сектор 1С"
const ENTITY_TYPE_ID = 140; // Сервис деск 140
const SECTOR_1C_TAG = '1C'; // Тег сектора 1С

function jsonResponse($data)
{
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function parseJsonBody(): array
{
    $input = file_get_contents('php://input');
    if (!$input) {
        return [];
    }
    $decoded = json_decode($input, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Возвращает границы текущей ISO-недели (UTC) если не переданы в запросе.
 */
function getWeekBounds(?string $start, ?string $end): array
{
    $tz = new DateTimeZone('UTC');

    if ($start && $end) {
        return [
            new DateTimeImmutable($start, $tz),
            new DateTimeImmutable($end, $tz)
        ];
    }

    $now = new DateTimeImmutable('now', $tz);
    $isoYear = (int)$now->format('o');
    $isoWeek = (int)$now->format('W');

    $weekStart = (new DateTimeImmutable('now', $tz))
        ->setISODate($isoYear, $isoWeek, 1)
        ->setTime(0, 0, 0);
    $weekEnd = $weekStart
        ->modify('+6 days')
        ->setTime(23, 59, 59);

    return [$weekStart, $weekEnd];
}

/**
 * Вычисляет границы 4 недель (текущая + 3 предыдущие) по ISO-8601
 * 
 * @param DateTimeImmutable $currentWeekStart Начало текущей недели
 * @param DateTimeImmutable $currentWeekEnd Конец текущей недели
 * @return array Массив с информацией о 4 неделях (от старых к новым)
 */
function getFourWeeksBounds(DateTimeImmutable $currentWeekStart, DateTimeImmutable $currentWeekEnd): array
{
    $weeks = [];
    
    for ($i = 0; $i < 4; $i++) {
        $weekStart = clone $currentWeekStart;
        $weekStart = $weekStart->modify("-{$i} weeks");
        
        // Убеждаемся, что неделя начинается с понедельника
        $isoYear = (int)$weekStart->format('o');
        $isoWeek = (int)$weekStart->format('W');
        $weekStart = $weekStart->setISODate($isoYear, $isoWeek, 1)->setTime(0, 0, 0);
        
        $weekEnd = clone $weekStart;
        $weekEnd = $weekEnd->modify('+6 days')->setTime(23, 59, 59);
        
        $weeks[] = [
            'weekNumber' => (int)$weekStart->format('W'),
            'weekStartUtc' => $weekStart->format('Y-m-d\TH:i:s\Z'),
            'weekEndUtc' => $weekEnd->format('Y-m-d\TH:i:s\Z'),
            'weekStart' => $weekStart,
            'weekEnd' => $weekEnd
        ];
    }
    
    // Возвращаем от старых к новым (неделя 47, 48, 49, 50)
    return array_reverse($weeks);
}

/**
 * Проверка попадания даты в интервал [start, end]
 */
function isInRange(?string $dateStr, DateTimeImmutable $start, DateTimeImmutable $end): bool
{
    if (!$dateStr) {
        return false;
    }
    $ts = strtotime($dateStr);
    if ($ts === false) {
        return false;
    }
    $dt = (new DateTimeImmutable('@' . $ts))->setTimezone(new DateTimeZone('UTC'));
    return $dt >= $start && $dt <= $end;
}

/**
 * Получение списка сотрудников сектора 1С
 * 
 * @return array Массив ID сотрудников
 */
function getSector1CEmployees(): array
{
    $employeeIds = [];
    $start = 0;
    $pageSize = 50;
    
    error_log(sprintf("[TimeTracking] Getting employees from department %d", SECTOR_1C_DEPARTMENT_ID));
    
    do {
        $result = CRest::call('user.get', [
            'filter' => [
                'ACTIVE' => 'Y',
                'UF_DEPARTMENT' => SECTOR_1C_DEPARTMENT_ID
            ],
            'select' => ['ID'],
            'start' => $start
        ]);
        
        if (isset($result['error'])) {
            error_log("Bitrix24 API error (user.get): " . ($result['error_description'] ?? $result['error']));
            break;
        }
        
        $users = $result['result'] ?? [];
        error_log(sprintf("[TimeTracking] Received %d users (start=%d)", count($users), $start));
        
        foreach ($users as $user) {
            if (isset($user['ID'])) {
                $employeeIds[] = (int)$user['ID'];
            }
        }
        
        $start += $pageSize;
        
    } while (count($users) === $pageSize);
    
    $uniqueIds = array_unique($employeeIds);
    error_log(sprintf("[TimeTracking] Total unique employees: %d", count($uniqueIds)));
    
    return $uniqueIds;
}

/**
 * Получение записей трудозатрат через задачи Bitrix24
 * 
 * ВАЖНО: Методы tasks.elapseditem.* не существуют в этой версии Bitrix24.
 * Используем альтернативный подход через tasks.task.list с полем timeSpentInLogs.
 * 
 * Ограничения:
 * - timeSpentInLogs - агрегированное значение (общее время в секундах)
 * - Неделя определяется по дате задачи (createdDate/changedDate), а не по дате фиксации трудозатраты
 * - Нет детальных записей трудозатрат
 * 
 * @param array $employeeIds Массив ID сотрудников сектора 1С
 * @param DateTimeImmutable $periodStart Начало периода
 * @param DateTimeImmutable $periodEnd Конец периода
 * @return array Массив записей трудозатрат (в формате совместимом с оригинальным)
 */
function getElapsedTimeRecords(array $employeeIds, DateTimeImmutable $periodStart, DateTimeImmutable $periodEnd): array
{
    if (empty($employeeIds)) {
        error_log("[TimeTracking] Empty employee IDs list");
        return [];
    }
    
    $records = [];
    $start = 0;
    $pageSize = 50;
    
    // Логирование параметров запроса
    error_log(sprintf(
        "[TimeTracking] Requesting tasks with elapsed time: employees=%s, period=%s to %s",
        implode(',', $employeeIds),
        $periodStart->format('Y-m-d H:i:s'),
        $periodEnd->format('Y-m-d H:i:s')
    ));
    
    // Сначала получаем задачи с трудозатратами
    $tasksWithTime = [];
    $startTasks = 0;
    
    do {
        $tasksResult = CRest::call('tasks.task.list', [
            'filter' => [
                'RESPONSIBLE_ID' => $employeeIds,
                '>=CHANGED_DATE' => $periodStart->format('Y-m-d'),
                '<=CHANGED_DATE' => $periodEnd->format('Y-m-d'),
                '>timeSpentInLogs' => 0
            ],
            'select' => [
                'ID',
                'TITLE',
                'CREATED_DATE',
                'CHANGED_DATE',
                'CREATED_BY',
                'RESPONSIBLE_ID',
                'timeSpentInLogs',
                'ufCrmTask'
            ],
            'start' => $startTasks
        ]);
        
        if (isset($tasksResult['error'])) {
            error_log(sprintf(
                "[TimeTracking] API error (tasks.task.list): %s - %s",
                $tasksResult['error'] ?? '',
                $tasksResult['error_description'] ?? ''
            ));
            break;
        }
        
        $tasks = $tasksResult['result']['tasks'] ?? [];
        $tasksWithTime = array_merge($tasksWithTime, $tasks);
        $startTasks += $pageSize;
        
    } while (count($tasks) === $pageSize);
    
    error_log(sprintf("[TimeTracking] Found %d tasks with time spent", count($tasksWithTime)));
    
    // Получаем детальные записи трудозатрат для каждой задачи
    // Используем метод task.elapseditem.getlist (без "s" в начале)
    error_log("[TimeTracking] Using method task.elapseditem.getlist to get detailed records");
    
    foreach ($tasksWithTime as $task) {
        $taskId = (int)($task['id'] ?? 0);
        if (!$taskId) {
            continue;
        }
        
        // Получаем записи трудозатрат для задачи
        $elapsedResult = CRest::call('task.elapseditem.getlist', [
            'taskId' => $taskId,
            'start' => 0
        ]);
        
        if (isset($elapsedResult['error'])) {
            error_log(sprintf(
                "[TimeTracking] Error getting elapsed items for task %d: %s - %s",
                $taskId,
                $elapsedResult['error'] ?? '',
                $elapsedResult['error_description'] ?? ''
            ));
            continue;
        }
        
        $elapsedItems = $elapsedResult['result'] ?? [];
        
        // Фильтруем записи по периоду и сотрудникам
        foreach ($elapsedItems as $item) {
            $createdDate = $item['CREATED_DATE'] ?? $item['createdDate'] ?? null;
            if (!$createdDate) {
                continue;
            }
            
            // Проверяем, что запись в нужном периоде
            $createdDateTime = new DateTimeImmutable($createdDate);
            if ($createdDateTime < $periodStart || $createdDateTime > $periodEnd) {
                continue;
            }
            
            // Проверяем, что запись от нужного сотрудника
            $itemUserId = (int)($item['USER_ID'] ?? $item['userId'] ?? 0);
            if ($itemUserId && !in_array($itemUserId, $employeeIds, true)) {
                continue;
            }
            
            // Получаем время в секундах (поле SECONDS уже в секундах)
            $seconds = (int)($item['SECONDS'] ?? 0);
            if ($seconds <= 0) {
                // Если SECONDS нет, пробуем MINUTES
                $minutes = (int)($item['MINUTES'] ?? 0);
                if ($minutes > 0) {
                    $seconds = $minutes * 60;
                } else {
                    // Если и MINUTES нет, пробуем HOURS
                    $hours = (float)($item['HOURS'] ?? 0);
                    if ($hours > 0) {
                        $seconds = (int)($hours * 3600);
                    }
                }
            }
            
            if ($seconds <= 0) {
                continue;
            }
            
            // Определяем USER_ID (приоритет: из записи, иначе из задачи)
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
    
    // Fallback: если нет детальных записей, используем агрегированные данные
    if (empty($records)) {
        // Fallback: используем агрегированные данные из задач
        error_log("[TimeTracking] No working elapseditem method found, using aggregated timeSpentInLogs");
        
        foreach ($tasksWithTime as $task) {
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
    
    error_log(sprintf("[TimeTracking] Total records collected: %d", count($records)));
    
    return $records;
}

/**
 * Получение задач по массиву TASK_ID
 * 
 * @param array $taskIds Массив ID задач
 * @return array Ассоциативный массив [taskId => taskData]
 */
function getTasksByIds(array $taskIds): array
{
    if (empty($taskIds)) {
        return [];
    }
    
    $tasks = [];
    $uniqueTaskIds = array_unique($taskIds);
    
    // Батч-запросы для оптимизации
    $batchSize = 50;
    $batches = array_chunk($uniqueTaskIds, $batchSize);
    
    foreach ($batches as $batch) {
        $batchData = [];
        foreach ($batch as $taskId) {
            $batchData["task_{$taskId}"] = [
                'method' => 'tasks.task.get',
                'params' => [
                    'taskId' => $taskId,
                    'select' => ['*', 'UF_*']
                ]
            ];
        }
        
        $result = CRest::callBatch($batchData);
        
        if (isset($result['error'])) {
            error_log("Bitrix24 API error (tasks batch): " . ($result['error_description'] ?? $result['error']));
            continue;
        }
        
        foreach ($batch as $taskId) {
            $key = "task_{$taskId}";
            if (isset($result['result']['result'][$key])) {
                $taskData = $result['result']['result'][$key];
                if (!isset($taskData['error'])) {
                    $tasks[$taskId] = $taskData;
                }
            }
        }
    }
    
    return $tasks;
}

/**
 * Матчинг задач с тикетами 140 сервис деска
 * 
 * Использует поле ufCrmTask из задачи (формат: ["T8c_3093"], где 8c = 140 в hex, 3093 = ID тикета)
 * 
 * @param array $tasks Массив задач
 * @return array Ассоциативный массив [taskId => ticketData]
 */
function matchTasksWithTickets(array $tasks): array
{
    $taskTicketMap = [];
    $ticketIdsToLoad = [];
    
    // Собираем ID тикетов из задач
    foreach ($tasks as $taskId => $task) {
        $ticketId = null;
        
        // Поле ufCrmTask содержит массив строк формата ["T8c_3093"]
        // где 8c = 140 (тип сущности) в hex, 3093 = ID тикета
        if (isset($task['ufCrmTask']) && is_array($task['ufCrmTask']) && !empty($task['ufCrmTask'])) {
            $ufCrmTaskValue = $task['ufCrmTask'][0] ?? null;
            if ($ufCrmTaskValue && preg_match('/T8c_(\d+)/', $ufCrmTaskValue, $matches)) {
                $ticketId = (int)$matches[1];
            }
        }
        
        // Альтернативные варианты (на случай другого формата)
        if (!$ticketId) {
            if (isset($task['ufCrmTicketId'])) {
                $ticketId = $task['ufCrmTicketId'];
            } elseif (isset($task['UF_CRM_TICKET_ID'])) {
                $ticketId = $task['UF_CRM_TICKET_ID'];
            } elseif (isset($task['UF_CRM_140_ID'])) {
                $ticketId = $task['UF_CRM_140_ID'];
            }
        }
        
        if ($ticketId) {
            $ticketIdsToLoad[$ticketId] = true;
            $taskTicketMap[$taskId] = ['ticketId' => $ticketId];
        }
    }
    
    if (empty($ticketIdsToLoad)) {
        error_log("[TimeTracking] No ticket IDs found in tasks");
        return [];
    }
    
    error_log(sprintf("[TimeTracking] Found %d unique ticket IDs to load", count($ticketIdsToLoad)));
    
    // Загружаем тикеты батч-запросом
    $ticketIds = array_keys($ticketIdsToLoad);
    $batchSize = 50;
    $batches = array_chunk($ticketIds, $batchSize);
    
    foreach ($batches as $batch) {
        $result = CRest::call('crm.item.list', [
            'entityTypeId' => ENTITY_TYPE_ID,
            'filter' => [
                'id' => $batch,
                'UF_CRM_7_TYPE_PRODUCT' => SECTOR_1C_TAG
            ],
            'select' => [
                'id',
                'title',
                'createdTime',
                'UF_CRM_7_TYPE_PRODUCT'
            ]
        ]);
        
        if (isset($result['error'])) {
            error_log("Bitrix24 API error (crm.item.list): " . ($result['error_description'] ?? $result['error']));
            continue;
        }
        
        $tickets = $result['result']['items'] ?? $result['result'] ?? [];
        error_log(sprintf("[TimeTracking] Loaded %d tickets from batch", count($tickets)));
        
        foreach ($tickets as $ticket) {
            $ticketId = (int)($ticket['id'] ?? $ticket['ID']);
            foreach ($taskTicketMap as $taskId => &$data) {
                if (isset($data['ticketId']) && (int)$data['ticketId'] === $ticketId) {
                    $data['ticket'] = $ticket;
                    break;
                }
            }
        }
    }
    
    $matchedCount = count(array_filter($taskTicketMap, function($data) {
        return isset($data['ticket']);
    }));
    error_log(sprintf("[TimeTracking] Matched %d tasks with tickets", $matchedCount));
    
    return $taskTicketMap;
}

/**
 * Определение номера недели по дате
 * 
 * @param string $dateStr Дата в формате строки
 * @param array $weeks Массив недель
 * @return int|null Номер недели или null
 */
function getWeekNumberByDate(string $dateStr, array $weeks): ?int
{
    $ts = strtotime($dateStr);
    if ($ts === false) {
        return null;
    }
    $dt = (new DateTimeImmutable('@' . $ts))->setTimezone(new DateTimeZone('UTC'));
    
    foreach ($weeks as $week) {
        if ($dt >= $week['weekStart'] && $dt <= $week['weekEnd']) {
            return $week['weekNumber'];
        }
    }
    
    return null;
}

/**
 * Получение данных сотрудников для summary
 * 
 * @param array $employeeIds Массив ID сотрудников
 * @return array Ассоциативный массив [employeeId => employeeData]
 */
function getEmployeesData(array $employeeIds): array
{
    if (empty($employeeIds)) {
        return [];
    }
    
    $employees = [];
    $start = 0;
    $pageSize = 50;
    
    do {
        $result = CRest::call('user.get', [
            'filter' => [
                'ID' => $employeeIds
            ],
            'select' => ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME'],
            'start' => $start
        ]);
        
        if (isset($result['error'])) {
            error_log("Bitrix24 API error (user.get for employees): " . ($result['error_description'] ?? $result['error']));
            break;
        }
        
        $users = $result['result'] ?? [];
        foreach ($users as $user) {
            $employeeId = (int)($user['ID'] ?? 0);
            if ($employeeId) {
                $name = trim(($user['LAST_NAME'] ?? '') . ' ' . ($user['NAME'] ?? '') . ' ' . ($user['SECOND_NAME'] ?? ''));
                $employees[$employeeId] = [
                    'id' => $employeeId,
                    'name' => $name ?: 'Неизвестный'
                ];
            }
        }
        
        $start += $pageSize;
        
    } while (count($users) === $pageSize);
    
    return $employees;
}

/**
 * Агрегация трудозатрат по неделям и сотрудникам
 * 
 * @param array $records Записи трудозатрат
 * @param array $weeks Массив недель (из getFourWeeksBounds)
 * @param array $tasks Задачи [taskId => taskData]
 * @param array $taskTicketMap Матчинг задач с тикетами [taskId => ticketData]
 * @param array $employees Данные сотрудников [employeeId => employeeData]
 * @return array Агрегированные данные
 */
function aggregateByWeeksAndEmployees(
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
        
        // Определить неделю по времени создания записи
        $weekNumber = getWeekNumberByDate($createdDate, $weeks);
        if (!$weekNumber || !isset($aggregated[$weekNumber])) {
            continue;
        }
        
        $employeeId = (int)($record['USER_ID'] ?? $record['userId'] ?? 0);
        if (!$employeeId) {
            continue;
        }
        
        // Получить временной промежуток
        // timeSpentInLogs возвращается в секундах, преобразуем в часы
        $elapsedTimeSeconds = (float)($record['SECONDS'] ?? $record['seconds'] ?? 0);
        if ($elapsedTimeSeconds <= 0) {
            // Пробуем другие форматы (на случай, если данные в другом формате)
            $elapsedTimeSeconds = (float)($record['MINUTES'] ?? $record['minutes'] ?? 0) * 60;
            if ($elapsedTimeSeconds <= 0) {
                $elapsedTimeSeconds = (float)($record['HOURS'] ?? $record['hours'] ?? 0) * 3600;
            }
        }
        
        // Преобразуем секунды в часы
        $elapsedTimeHours = $elapsedTimeSeconds / 3600;
        
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
        if ($taskId && !in_array($taskId, $aggregated[$weekNumber]['employees'][$employeeId]['tasks'], true)) {
            $aggregated[$weekNumber]['employees'][$employeeId]['tasks'][] = $taskId;
            $aggregated[$weekNumber]['employees'][$employeeId]['tasksCount']++;
            
            // Проверка связи с тикетом
            if (isset($taskTicketMap[$taskId]['ticket'])) {
                $aggregated[$weekNumber]['employees'][$employeeId]['ticketsCount']++;
            }
        }
        
        $aggregated[$weekNumber]['totalElapsedTime'] += $elapsedTimeHours;
        $aggregated[$weekNumber]['recordsCount']++;
    }
    
    // Преобразование в формат ответа
    $result = [];
    foreach ($aggregated as $week) {
        // Удаляем временный массив tasks
        foreach ($week['employees'] as &$employee) {
            unset($employee['tasks']);
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

/**
 * Создание summary по сотрудникам
 * 
 * @param array $weeksData Агрегированные данные по неделям
 * @return array Summary по сотрудникам
 */
function createEmployeesSummary(array $weeksData): array
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

// Основная логика
try {
    $body = parseJsonBody();
    $product = $body['product'] ?? '1C';
    
    // Фильтрация по сектору 1С
    if ($product !== '1C') {
        jsonResponse([
            'error' => 'invalid_product',
            'error_description' => 'Only product=1C is supported'
        ]);
    }
    
    // Получение параметров недели
    $weekStartParam = $body['weekStartUtc'] ?? null;
    $weekEndParam = $body['weekEndUtc'] ?? null;
    
    // Расчёт границ недель
    [$currentWeekStart, $currentWeekEnd] = getWeekBounds($weekStartParam, $weekEndParam);
    $weeks = getFourWeeksBounds($currentWeekStart, $currentWeekEnd);
    
    // Определение периода для запроса (от самой старой недели до самой новой)
    $periodStart = $weeks[0]['weekStart'];
    $periodEnd = end($weeks)['weekEnd'];
    
    // Получение сотрудников сектора 1С
    error_log("[TimeTracking] Getting sector 1C employees");
    $employeeIds = getSector1CEmployees();
    error_log(sprintf("[TimeTracking] Found %d employees in sector 1C", count($employeeIds)));
    
    if (empty($employeeIds)) {
        error_log("[TimeTracking] No employees found in sector 1C");
        jsonResponse([
            'meta' => [
                'weekNumber' => (int)$currentWeekStart->format('W'),
                'weekStartUtc' => $currentWeekStart->format('Y-m-d\TH:i:s\Z'),
                'weekEndUtc' => $currentWeekEnd->format('Y-m-d\TH:i:s\Z'),
                'totalWeeks' => count($weeks),
                'sector1CEmployeesCount' => 0
            ],
            'data' => [
                'totalElapsedTime' => 0,
                'totalElapsedTimeUnit' => 'hours',
                'totalRecordsCount' => 0,
                'weeks' => [],
                'employeesSummary' => []
            ]
        ]);
    }
    
    // Получение записей трудозатрат
    error_log(sprintf(
        "[TimeTracking] Starting data collection: employees=%d, period=%s to %s",
        count($employeeIds),
        $periodStart->format('Y-m-d H:i:s'),
        $periodEnd->format('Y-m-d H:i:s')
    ));
    
    $records = getElapsedTimeRecords($employeeIds, $periodStart, $periodEnd);
    
    error_log(sprintf("[TimeTracking] Records collected: %d", count($records)));
    
    if (empty($records)) {
        error_log("[TimeTracking] No records found, returning empty response");
        jsonResponse([
            'meta' => [
                'weekNumber' => (int)$currentWeekStart->format('W'),
                'weekStartUtc' => $currentWeekStart->format('Y-m-d\TH:i:s\Z'),
                'weekEndUtc' => $currentWeekEnd->format('Y-m-d\TH:i:s\Z'),
                'totalWeeks' => count($weeks),
                'sector1CEmployeesCount' => count($employeeIds)
            ],
            'data' => [
                'totalElapsedTime' => 0,
                'totalElapsedTimeUnit' => 'hours',
                'totalRecordsCount' => 0,
                'weeks' => [],
                'employeesSummary' => []
            ]
        ]);
    }
    
    // Извлекаем задачи из записей (они уже получены в getElapsedTimeRecords)
    $tasks = [];
    foreach ($records as $record) {
        if (isset($record['_task'])) {
            $taskId = (int)($record['TASK_ID'] ?? 0);
            if ($taskId) {
                $tasks[$taskId] = $record['_task'];
            }
        }
    }
    
    // Если задач нет в записях, получаем их отдельно (fallback)
    if (empty($tasks)) {
        $taskIds = array_unique(array_filter(array_map(function($record) {
            return (int)($record['TASK_ID'] ?? $record['taskId'] ?? 0);
        }, $records)));
        
        if (!empty($taskIds)) {
            $tasks = getTasksByIds($taskIds);
        }
    }
    
    error_log(sprintf("[TimeTracking] Tasks collected: %d", count($tasks)));
    
    // Матчинг задач с тикетами
    $taskTicketMap = matchTasksWithTickets($tasks);
    
    // Получение данных сотрудников
    $employees = getEmployeesData($employeeIds);
    
    // Агрегация данных
    $weeksData = aggregateByWeeksAndEmployees($records, $weeks, $tasks, $taskTicketMap, $employees);
    
    // Создание summary
    $employeesSummary = createEmployeesSummary($weeksData);
    
    // Подсчёт общих метрик
    $totalElapsedTime = 0;
    $totalRecordsCount = 0;
    foreach ($weeksData as $week) {
        $totalElapsedTime += $week['totalElapsedTime'];
        $totalRecordsCount += $week['recordsCount'];
    }
    
    // Формирование ответа
    jsonResponse([
        'meta' => [
            'weekNumber' => (int)$currentWeekStart->format('W'),
            'weekStartUtc' => $currentWeekStart->format('Y-m-d\TH:i:s\Z'),
            'weekEndUtc' => $currentWeekEnd->format('Y-m-d\TH:i:s\Z'),
            'totalWeeks' => count($weeks),
            'sector1CEmployeesCount' => count($employeeIds)
        ],
        'data' => [
            'totalElapsedTime' => round($totalElapsedTime, 2),
            'totalElapsedTimeUnit' => 'hours',
            'totalRecordsCount' => $totalRecordsCount,
            'weeks' => $weeksData,
            'employeesSummary' => $employeesSummary
        ]
    ]);
    
} catch (\Exception $e) {
    error_log("Exception in time tracking API: " . $e->getMessage());
    jsonResponse([
        'error' => 'internal_error',
        'error_description' => $e->getMessage()
    ]);
}

