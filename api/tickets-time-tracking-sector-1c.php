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
 * Получение записей трудозатрат из таблицы фактов Bitrix24
 * 
 * @param array $employeeIds Массив ID сотрудников сектора 1С
 * @param DateTimeImmutable $periodStart Начало периода
 * @param DateTimeImmutable $periodEnd Конец периода
 * @return array Массив записей трудозатрат
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
        "[TimeTracking] Requesting elapsed time records: employees=%s, period=%s to %s",
        implode(',', $employeeIds),
        $periodStart->format('Y-m-d H:i:s'),
        $periodEnd->format('Y-m-d H:i:s')
    ));
    
    do {
        // Метод API для получения записей трудозатрат
        // Пробуем разные варианты методов API и форматов фильтров
        $paramsVariants = [
            // Вариант 1: Стандартный формат
            [
                'filter' => [
                    'USER_ID' => $employeeIds,
                    '>=CREATED_DATE' => $periodStart->format('Y-m-d H:i:s'),
                    '<=CREATED_DATE' => $periodEnd->format('Y-m-d H:i:s')
                ],
                'select' => [
                    'ID',
                    'TASK_ID',
                    'USER_ID',
                    'CREATED_DATE',
                    'MINUTES',
                    'SECONDS',
                    'HOURS',
                    'COMMENT_TEXT'
                ],
                'start' => $start
            ],
            // Вариант 2: USER_ID как массив
            [
                'filter' => [
                    'USER_ID' => $employeeIds,
                    '>=CREATED_DATE' => $periodStart->format('Y-m-d'),
                    '<=CREATED_DATE' => $periodEnd->format('Y-m-d')
                ],
                'select' => ['*'],
                'start' => $start
            ],
            // Вариант 3: Без select (получить все поля)
            [
                'filter' => [
                    'USER_ID' => $employeeIds,
                    '>=CREATED_DATE' => $periodStart->format('Y-m-d H:i:s'),
                    '<=CREATED_DATE' => $periodEnd->format('Y-m-d H:i:s')
                ],
                'start' => $start
            ]
        ];
        
        $params = $paramsVariants[0]; // Используем первый вариант по умолчанию
        
        // Пробуем разные варианты методов API
        $methodsToTry = [
            'tasks.elapseditem.getlist',
            'tasks.elapseditem.list',
            'tasks.task.elapseditem.getlist',
            'tasks.task.elapseditem.list'
        ];
        
        $result = null;
        $lastError = null;
        
        foreach ($methodsToTry as $method) {
            error_log(sprintf("[TimeTracking] Trying method: %s", $method));
            
            $result = CRest::call($method, $params);
            
            if (!isset($result['error'])) {
                error_log(sprintf("[TimeTracking] Success with method: %s", $method));
                break;
            }
            
            $lastError = [
                'method' => $method,
                'error' => $result['error'] ?? '',
                'description' => $result['error_description'] ?? ''
            ];
            
            error_log(sprintf(
                "[TimeTracking] Method %s failed: %s - %s",
                $method,
                $lastError['error'],
                $lastError['description']
            ));
        }
        
        // Если все методы не сработали
        if (isset($result['error'])) {
            error_log(sprintf(
                "[TimeTracking] All methods failed. Last error: %s - %s",
                $lastError['error'] ?? '',
                $lastError['description'] ?? ''
            ));
            
            // Если это не ошибка "метод не найден", а другая (например, нет данных) - продолжаем
            $errorCode = $result['error'] ?? '';
            if (strpos($errorCode, 'METHOD_NOT_FOUND') !== false || 
                strpos($errorCode, 'NOT_FOUND') !== false) {
                error_log("[TimeTracking] Method not found, stopping");
                break;
            }
            
            // Для других ошибок (например, пустой результат) - продолжаем с пустым массивом
            $result = ['result' => []];
        }
        
        // Логирование результата
        $items = $result['result'] ?? [];
        
        // Детальное логирование структуры ответа (только для первого запроса)
        if ($start === 0) {
            error_log(sprintf(
                "[TimeTracking] API response structure: %s",
                json_encode([
                    'has_result' => isset($result['result']),
                    'result_type' => gettype($result['result'] ?? null),
                    'result_count' => is_array($result['result'] ?? null) ? count($result['result']) : 'N/A',
                    'result_keys' => is_array($result['result'] ?? null) ? array_keys($result['result']) : 'N/A',
                    'full_response_keys' => array_keys($result)
                ], JSON_UNESCAPED_UNICODE)
            ));
        }
        
        error_log(sprintf(
            "[TimeTracking] Received %d items (start=%d, total so far=%d)",
            count($items),
            $start,
            count($records)
        ));
        
        // Если результат пустой, но нет ошибки - это нормально
        if (empty($items)) {
            if ($start === 0) {
                error_log("[TimeTracking] No elapsed time records found for the period");
                // Логируем полный ответ для отладки
                error_log(sprintf(
                    "[TimeTracking] Full API response: %s",
                    json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
                ));
            }
            break;
        }
        
        foreach ($items as $item) {
            $records[] = $item;
        }
        
        $start += $pageSize;
        
    } while (count($items) === $pageSize);
    
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
        
        // Вариант 1: Прямое поле связи (требуется уточнить точное название)
        if (isset($task['ufCrmTicketId'])) {
            $ticketId = $task['ufCrmTicketId'];
        } elseif (isset($task['UF_CRM_TICKET_ID'])) {
            $ticketId = $task['UF_CRM_TICKET_ID'];
        } elseif (isset($task['UF_CRM_140_ID'])) {
            $ticketId = $task['UF_CRM_140_ID'];
        }
        
        if ($ticketId) {
            $ticketIdsToLoad[$ticketId] = true;
            $taskTicketMap[$taskId] = ['ticketId' => $ticketId];
        }
    }
    
    if (empty($ticketIdsToLoad)) {
        return [];
    }
    
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
        
        // Получить временной промежуток (требуется уточнить формат единиц)
        $elapsedTime = (float)($record['MINUTES'] ?? $record['minutes'] ?? $record['SECONDS'] ?? $record['seconds'] ?? $record['HOURS'] ?? $record['hours'] ?? 0);
        
        // Нормализация единиц (предполагаем, что API возвращает минуты)
        // Если API возвращает секунды, делим на 60, если часы - умножаем на 60
        // Требуется уточнить через тестовый запрос
        $elapsedTimeHours = $elapsedTime / 60; // если в минутах
        
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
    
    // Получение задач
    $taskIds = array_unique(array_filter(array_map(function($record) {
        return (int)($record['TASK_ID'] ?? $record['taskId'] ?? 0);
    }, $records)));
    
    $tasks = getTasksByIds($taskIds);
    
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

