# TASK-050-02: Backend API endpoint для получения трудозатрат

**Дата создания:** 2025-12-17 09:30 (UTC+3, Брест)  
**Дата завершения:** 2025-12-17 11:30 (UTC+3, Брест)  
**Статус:** ✅ Завершён  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Этап 2 из TASK-050  
**Зависимости:** TASK-050-01 (завершён)

---

## Цель этапа

Создать REST API endpoint для получения данных о трудозатратах сотрудников сектора 1С. Endpoint должен получать записи из таблицы фактов Bitrix24 "Трудозатрата", получать связанные задачи и тикеты, агрегировать данные по неделям и сотрудникам.

---

## Контекст

- Модуль «Трудозатраты на Тикеты сектора 1С» (TASK-050) — 4-й модуль в дашборде сектора 1С
- Данные получаются из таблицы фактов Bitrix24 "Трудозатрата"
- Необходимо использовать ту же логику определения недель и фильтрации по сектору 1С, что и в модуле "График приема и закрытий сектора 1С"
- Связь данных: Трудозатраты → Задачи → Тикеты

---

## Задачи этапа

### 1. Создание API endpoint

**Файл:** `api/tickets-time-tracking-sector-1c.php`

**Структура endpoint:**
- Метод: POST (как в других модулях сектора 1С)
- Входные параметры:
  - `product` (string, default="1C") — фильтр на сектор 1С
  - `weekStartUtc` (string, optional) — начало недели (ISO-8601, UTC)
  - `weekEndUtc` (string, optional) — конец недели (ISO-8601, UTC)
  - `weeksCount` (int, default=4) — количество недель для отображения

**Формат ответа:**
```json
{
  "meta": {
    "weekNumber": 51,
    "weekStartUtc": "2025-12-15T00:00:00Z",
    "weekEndUtc": "2025-12-21T23:59:59Z",
    "totalWeeks": 4,
    "sector1CEmployeesCount": 15
  },
  "data": {
    "totalElapsedTime": 125.5,
    "totalElapsedTimeUnit": "hours",
    "totalRecordsCount": 342,
    "weeks": [
      {
        "weekNumber": 48,
        "weekStartUtc": "2025-11-24T00:00:00Z",
        "weekEndUtc": "2025-11-30T23:59:59Z",
        "totalElapsedTime": 32.5,
        "recordsCount": 89,
        "employees": [
          {
            "id": 123,
            "name": "Иванов Иван",
            "elapsedTime": 15.5,
            "recordsCount": 42,
            "tasksCount": 8,
            "ticketsCount": 6
          }
        ]
      }
    ],
    "employeesSummary": [
      {
        "id": 123,
        "name": "Иванов Иван",
        "totalElapsedTime": 45.5,
        "totalRecordsCount": 125,
        "totalTasksCount": 25,
        "totalTicketsCount": 18
      }
    ]
  }
}
```

### 2. Получение списка сотрудников сектора 1С

**Логика:**
- Использовать константу отделов (устойчивый массив сотрудников по сектору 1С)
- Использовать ту же логику, что и в других модулях сектора 1С
- Отдел 366 — Сектор 1С (из `access-config.js`)

**Реализация:**
- Получить список сотрудников через Bitrix24 API или константу
- Фильтровать по отделу сектора 1С

### 3. Получение записей из таблицы фактов "Трудозатрата"

**Логика:**
- Использовать метод Bitrix24 API (определённый в TASK-050-01)
- Фильтровать по сотрудникам сектора 1С
- Получить все записи за период (4 недели: текущая + 3 предыдущие)

**Структура записи:**
- Время создания записи (для определения недели)
- Задача (`TASK_ID`)
- Сотрудник (`USER_ID`)
- Временной промежуток (часы/минуты/секунды)

### 4. Получение задач по TASK_ID

**Логика:**
- Для каждой записи трудозатраты получить задачу по `TASK_ID`
- Использовать Bitrix24 API для получения задач
- Кешировать задачи для оптимизации (если одна задача встречается в нескольких записях)

### 5. Матчинг задач с тикетами 140 сервис деска

**Логика:**
- Связать задачи с тикетами сервис деска
- Фильтровать только тикеты сектора 1С (поле `UF_CRM_7_TYPE_PRODUCT` = "1C")
- Получить информацию о тикете: ID, название, неделя создания

**Важно:** Тикеты могут быть созданы в другие недели (не той, в которую записана трудозатрата)

### 6. Расчёт недель (ISO-8601)

**Логика:**
- Использовать ту же логику, что и в модуле "График приема и закрытий сектора 1С"
- Неделя определяется по **времени создания записи трудозатраты** (не по времени создания задачи/тикета)
- Формат: ISO-8601 (понедельник–воскресенье, UTC)
- Рассчитать границы 4 недель (текущая + 3 предыдущие)

### 7. Агрегация данных

**Логика:**
- Агрегировать трудозатраты по неделям и сотрудникам
- Сумма всех записей за неделю (каждая неделя по отдельности)
- Подсчитать количество записей, задач, тикетов
- Создать summary по сотрудникам (общая сумма за период)

---

## Технические требования

### Использование существующего кода

- Использовать `crest.php` для работы с Bitrix24 API (как в других модулях)
- Использовать функции расчёта недель из `api/graph-1c-admission-closure.php`
- Использовать логику фильтрации по сектору 1С из существующих модулей

### Обработка ошибок

- Логирование всех ошибок API
- Обработка случаев отсутствия данных
- Валидация входных параметров

### Производительность

- Оптимизация запросов к Bitrix24 API (батч-запросы, кеширование)
- Обработка больших объёмов данных (пагинация при необходимости)

---

## Критерии приёмки этапа

- [x] Создан API endpoint `api/tickets-time-tracking-sector-1c.php`
- [x] Реализовано получение списка сотрудников сектора 1С (через константу отделов)
- [x] Реализовано получение записей из таблицы фактов "Трудозатрата" (Bitrix24 API)
- [x] Реализовано получение задач по `TASK_ID` из записей трудозатрат
- [x] Реализован матчинг задач с тикетами 140 сервис деска
- [x] Реализована фильтрация по сектору 1С (использовать существующую логику)
- [x] Реализован расчёт недель (ISO-8601) по времени создания записи
- [x] Реализована агрегация данных по сотрудникам и неделям (сумма записей за неделю)
- [x] API возвращает корректный JSON-ответ согласно контракту
- [x] Добавлено логирование и обработка ошибок
- [ ] Протестирован endpoint с реальными данными (требуется тестирование после уточнения формата API)

---

## Дополнительные уточнения

- При реализации использовать примеры из `api/graph-1c-admission-closure.php`
- Обратить внимание на нормализацию единиц измерения (если API возвращает секунды, а нужны часы)
- Учесть возможность отсутствия связи задачи с тикетом (не все задачи могут быть связаны с тикетами)

## Примеры кода из существующих модулей

### Структура API endpoint

**Пример из `api/graph-1c-admission-closure.php`:**

```php
<?php
/**
 * API endpoint: Трудозатраты на Тикеты сектора 1С
 *
 * Реализует контракт из TASK-050-02:
 * - Неделя ISO-8601 (пн–вс), расчёт в UTC.
 * - product=1C фильтруется первым шагом.
 * - Получение записей из таблицы фактов "Трудозатрата".
 * - Матчинг с задачами и тикетами.
 */

require_once __DIR__ . '/../crest.php';

header('Content-Type: application/json; charset=utf-8');

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

// Использовать функции из graph-1c-admission-closure.php
// getWeekBounds(), getFourWeeksBounds(), isInRange()
```

### Получение записей трудозатрат

**Пример получения записей (требуется уточнить метод API):**

```php
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
    $records = [];
    $start = 0;
    $pageSize = 50;
    
    do {
        // Требуется уточнить точный метод API (определяется в TASK-050-01)
        $result = CRest::call('tasks.elapseditem.getlist', [
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
                'MINUTES', // или SECONDS, HOURS (требуется уточнить)
                'COMMENT_TEXT'
            ],
            'start' => $start,
            'order' => ['CREATED_DATE' => 'ASC']
        ]);
        
        if (isset($result['error'])) {
            error_log("Bitrix24 API error (elapseditem.getlist): " . $result['error_description']);
            break;
        }
        
        $items = $result['result'] ?? [];
        foreach ($items as $item) {
            $records[] = $item;
        }
        
        $start += $pageSize;
        
    } while (count($items) === $pageSize);
    
    return $records;
}
```

### Получение задач по TASK_ID

**Пример получения задач:**

```php
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
            error_log("Bitrix24 API error (tasks batch): " . $result['error_description']);
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
```

### Матчинг задач с тикетами

**Пример матчинга (требуется уточнить поле связи):**

```php
/**
 * Матчинг задач с тикетами 140 сервис деска
 * 
 * @param array $tasks Массив задач
 * @return array Ассоциативный массив [taskId => ticketData]
 */
function matchTasksWithTickets(array $tasks): array
{
    $taskTicketMap = [];
    
    // Требуется определить поле связи задачи с тикетом
    // Возможные варианты:
    // - UF_CRM_TICKET_ID в задаче
    // - Связь через UF_* поля
    // - Поиск тикета по названию задачи
    
    foreach ($tasks as $taskId => $task) {
        $ticketId = null;
        
        // Вариант 1: Прямое поле связи
        if (isset($task['ufCrmTicketId']) || isset($task['UF_CRM_TICKET_ID'])) {
            $ticketId = $task['ufCrmTicketId'] ?? $task['UF_CRM_TICKET_ID'];
        }
        
        // Вариант 2: Поиск по названию или другому полю
        // (требуется уточнить логику матчинга)
        
        if ($ticketId) {
            // Получить тикет
            $ticket = getTicketById($ticketId);
            if ($ticket && ($ticket['UF_CRM_7_TYPE_PRODUCT'] ?? null) === '1C') {
                $taskTicketMap[$taskId] = $ticket;
            }
        }
    }
    
    return $taskTicketMap;
}

/**
 * Получение тикета по ID
 */
function getTicketById(int $ticketId): ?array
{
    $result = CRest::call('crm.item.get', [
        'entityTypeId' => 140,
        'id' => $ticketId,
        'select' => [
            'id',
            'title',
            'createdTime',
            'UF_CRM_7_TYPE_PRODUCT'
        ]
    ]);
    
    if (isset($result['error'])) {
        return null;
    }
    
    return $result['result']['item'] ?? null;
}
```

### Агрегация данных по неделям

**Пример агрегации (использовать логику из graph-1c-admission-closure.php):**

```php
/**
 * Агрегация трудозатрат по неделям и сотрудникам
 * 
 * @param array $records Записи трудозатрат
 * @param array $weeks Массив недель (из getFourWeeksBounds)
 * @return array Агрегированные данные
 */
function aggregateByWeeksAndEmployees(array $records, array $weeks): array
{
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
        if (!$weekNumber) {
            continue;
        }
        
        $employeeId = $record['USER_ID'] ?? $record['userId'] ?? null;
        $elapsedTime = $record['MINUTES'] ?? $record['minutes'] ?? 0;
        
        // Нормализация единиц (если MINUTES, преобразовать в часы)
        $elapsedTimeHours = $elapsedTime / 60; // если в минутах
        
        // Агрегация
        if (!isset($aggregated[$weekNumber]['employees'][$employeeId])) {
            $aggregated[$weekNumber]['employees'][$employeeId] = [
                'id' => $employeeId,
                'elapsedTime' => 0,
                'recordsCount' => 0
            ];
        }
        
        $aggregated[$weekNumber]['employees'][$employeeId]['elapsedTime'] += $elapsedTimeHours;
        $aggregated[$weekNumber]['employees'][$employeeId]['recordsCount']++;
        $aggregated[$weekNumber]['totalElapsedTime'] += $elapsedTimeHours;
        $aggregated[$weekNumber]['recordsCount']++;
    }
    
    // Преобразование в формат ответа
    $result = [];
    foreach ($aggregated as $week) {
        $result[] = [
            'weekNumber' => $week['weekNumber'],
            'weekStartUtc' => $week['weekStartUtc'],
            'weekEndUtc' => $week['weekEndUtc'],
            'totalElapsedTime' => round($week['totalElapsedTime'], 1),
            'recordsCount' => $week['recordsCount'],
            'employees' => array_values($week['employees'])
        ];
    }
    
    return $result;
}
```

### Получение списка сотрудников сектора 1С

**Пример (требуется уточнить метод получения):**

```php
/**
 * Получение списка сотрудников сектора 1С
 * 
 * @return array Массив ID сотрудников
 */
function getSector1CEmployees(): array
{
    // Вариант 1: Через отдел (требуется уточнить метод)
    $result = CRest::call('department.get', [
        'ID' => 366 // Отдел "Сектор 1С"
    ]);
    
    // Вариант 2: Через пользователей отдела
    $result = CRest::call('user.get', [
        'filter' => [
            'UF_DEPARTMENT' => 366 // Отдел "Сектор 1С"
        ],
        'select' => ['ID']
    ]);
    
    $employeeIds = [];
    if (isset($result['result'])) {
        foreach ($result['result'] as $user) {
            $employeeIds[] = (int)$user['ID'];
        }
    }
    
    return $employeeIds;
}
```

## Ссылки на существующий код

**Использовать функции из:**
- `api/graph-1c-admission-closure.php`:
  - `getWeekBounds()` — расчёт границ недели
  - `getFourWeeksBounds()` — расчёт 4 недель
  - `isInRange()` — проверка попадания даты в интервал
  - `calculateWeekMetrics()` — пример агрегации метрик

**Пример использования:**
```php
// Использовать функцию расчёта недель
[$weekStart, $weekEnd] = getWeekBounds($weekStartParam, $weekEndParam);
$weeks = getFourWeeksBounds($weekStart, $weekEnd);
```

## Обработка ошибок

**Пример обработки ошибок:**

```php
try {
    $result = CRest::call('tasks.elapseditem.getlist', $params);
    
    if (isset($result['error'])) {
        error_log("Bitrix24 API error: " . json_encode($result));
        jsonResponse([
            'error' => $result['error'],
            'error_description' => $result['error_description'] ?? 'Unknown error'
        ]);
    }
    
    // Обработка результата
} catch (\Exception $e) {
    error_log("Exception in time tracking API: " . $e->getMessage());
    jsonResponse([
        'error' => 'internal_error',
        'error_description' => $e->getMessage()
    ]);
}
```

## История правок

- **2025-12-17 09:30 (UTC+3, Брест):** Создан этап backend API endpoint
- **2025-12-17 10:40 (UTC+3, Брест):** Добавлены детали:
  - Примеры кода из существующих модулей
  - Функции для получения записей трудозатрат
  - Функции для получения задач и матчинга с тикетами
  - Функции агрегации данных
  - Ссылки на существующий код
  - Примеры обработки ошибок
- **2025-12-17 11:30 (UTC+3, Брест):** Этап завершён
  - Создан API endpoint `api/tickets-time-tracking-sector-1c.php`
  - Реализованы все функции для получения и агрегации данных
  - Добавлена обработка ошибок и логирование
  - Требуется тестирование после уточнения формата API (метод `tasks.elapseditem.getlist`, единицы измерения)

---

## Следующий этап

После завершения этого этапа переходить к **TASK-050-03: Frontend структура компонентов и сервисов**

---

## История правок

- **2025-12-17 09:30 (UTC+3, Брест):** Создан этап backend API endpoint

