# TASK-055-01: Расширение backend API для получения детальной информации о задачах

**Дата создания:** 2025-12-17 17:04 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Backend Developer)  
**Связь с задачей:** Этап 1 из TASK-055

---

## Цель этапа

Расширить backend API endpoint `api/tickets-time-tracking-sector-1c.php` для получения детальной информации о задачах через Bitrix24 API с поддержкой пагинации.

---

## Контекст

- **Текущее состояние:**
  - API возвращает только базовую информацию о задачах: `id`, `elapsedTime`, `ticket`
  - Нет детальной информации: название, даты (начала, дедлайна, завершения), статус
  - Нет поддержки пагинации для большого количества задач

- **Проблема:**
  - Frontend не может получить полную информацию о задачах для отображения в карточках
  - При большом количестве задач (>10) нет механизма пагинации

- **Требуется:**
  1. Изучить документацию Bitrix24 API для задач
  2. Расширить API endpoint с параметром `includeTaskDetails: true`
  3. Реализовать функцию получения детальной информации о задачах
  4. Добавить поддержку пагинации

---

## Задачи этапа

### 1) Изучение документации Bitrix24 API

**Цель:** Определить точные названия полей и методы получения задач.

**Задачи:**
- Изучить документацию `tasks.task.list`: https://apidocs.bitrix24.ru/rest/tasks.task.list
- Изучить документацию `tasks.task.get`: https://apidocs.bitrix24.ru/rest/tasks.task.get
- Проверить доступность полей:
  - `ID` — ID задачи
  - `TITLE` — название задачи
  - `CREATED_DATE` — дата создания
  - `START_DATE_PLAN` — планируемая дата начала
  - `END_DATE_PLAN` — планируемая дата завершения
  - `DEADLINE` — дедлайн
  - `CLOSED_DATE` — дата завершения
  - `STATUS` — статус задачи (числовое значение)
  - `STAGE_ID` — ID стадии
  - `RESPONSIBLE_ID` — ID ответственного
  - `CREATED_BY` — ID создателя
  - `timeSpentInLogs` — трудозатрата в секундах

**Результат:** Список доступных полей и их форматы.

---

### 2) Расширение API endpoint

**Файл:** `api/tickets-time-tracking-sector-1c.php`

**Задачи:**

1. **Добавить обработку нового параметра `includeTaskDetails`:**
   ```php
   $includeTaskDetails = isset($_POST['includeTaskDetails']) && $_POST['includeTaskDetails'] === true;
   $taskIds = isset($_POST['taskIds']) ? (array)$_POST['taskIds'] : [];
   $employeeId = isset($_POST['employeeId']) ? (int)$_POST['employeeId'] : null;
   $weekNumber = isset($_POST['weekNumber']) ? (int)$_POST['weekNumber'] : null;
   $page = isset($_POST['page']) ? max(1, (int)$_POST['page']) : 1;
   $perPage = isset($_POST['perPage']) ? max(1, min(100, (int)$_POST['perPage'])) : 10;
   ```

2. **Реализовать функцию `getTasksDetails()`:**
   - Принимает массив ID задач, параметры пагинации
   - Использует батч-запросы `CRest::callBatch()` для оптимизации
   - Обрабатывает ошибки при загрузке задач
   - Возвращает массив задач с детальной информацией и метаданными пагинации

3. **Интегрировать функцию в основной поток:**
   - Если `includeTaskDetails === true`, вызывать `getTasksDetails()`
   - Возвращать результат в формате JSON

---

### 3) Реализация функции getTasksDetails()

**Полный код функции:**

```php
/**
 * Получение детальной информации о задачах с поддержкой пагинации
 * 
 * @param array $taskIds Массив ID задач
 * @param int $page Номер страницы (по умолчанию 1)
 * @param int $perPage Количество задач на страницу (по умолчанию 10)
 * @return array Массив с задачами и метаданными пагинации
 */
function getTasksDetails(array $taskIds, int $page = 1, int $perPage = 10): array
{
    if (empty($taskIds)) {
        return [
            'tasks' => [],
            'pagination' => [
                'totalTasks' => 0,
                'currentPage' => 1,
                'perPage' => $perPage,
                'totalPages' => 0
            ]
        ];
    }
    
    $allTasks = [];
    $batchSize = 50; // Bitrix24 ограничение на батч-запросы
    
    // Разбиваем на батчи
    $batches = array_chunk($taskIds, $batchSize);
    
    foreach ($batches as $batch) {
        $batchData = [];
        
        foreach ($batch as $taskId) {
            $batchData["task_{$taskId}"] = [
                'method' => 'tasks.task.get',
                'params' => [
                    'taskId' => $taskId,
                    'select' => [
                        'ID',
                        'TITLE',
                        'CREATED_DATE',
                        'START_DATE_PLAN',
                        'END_DATE_PLAN',
                        'DEADLINE',
                        'CLOSED_DATE',
                        'STATUS',  // Загружаем, но не отображаем пока
                        'STAGE_ID',  // Загружаем, но не отображаем пока
                        'RESPONSIBLE_ID',
                        'CREATED_BY',
                        'timeSpentInLogs'
                    ]
                ]
            ];
        }
        
        $result = CRest::callBatch($batchData);
        
        if (isset($result['result']['result'])) {
            foreach ($result['result']['result'] as $key => $taskResult) {
                if (isset($taskResult['error'])) {
                    error_log(sprintf(
                        "[TimeTracking] Error loading task %s: %s",
                        str_replace('task_', '', $key),
                        $taskResult['error_description'] ?? 'Unknown error'
                    ));
                    continue;
                }
                
                $task = $taskResult['task'] ?? null;
                if ($task) {
                    // Определяем дату начала (приоритет: START_DATE_PLAN, затем CREATED_DATE)
                    $startDate = $task['startDatePlan'] ?? $task['START_DATE_PLAN'] ?? 
                                 $task['createdDate'] ?? $task['CREATED_DATE'] ?? null;
                    
                    // Определяем дедлайн (приоритет: DEADLINE, затем END_DATE_PLAN)
                    $deadline = $task['deadline'] ?? $task['DEADLINE'] ?? 
                                $task['endDatePlan'] ?? $task['END_DATE_PLAN'] ?? null;
                    
                    $allTasks[] = [
                        'id' => (int)($task['id'] ?? $task['ID'] ?? 0),
                        'title' => $task['title'] ?? $task['TITLE'] ?? 'Без названия',
                        'startDate' => $startDate,
                        'deadline' => $deadline,
                        'closedDate' => $task['closedDate'] ?? $task['CLOSED_DATE'] ?? null,
                        'status' => (int)($task['status'] ?? $task['STATUS'] ?? 0),  // Для будущего использования
                        'stageId' => (int)($task['stageId'] ?? $task['STAGE_ID'] ?? 0),  // Для будущего использования
                        'responsibleId' => (int)($task['responsibleId'] ?? $task['RESPONSIBLE_ID'] ?? 0),
                        'createdBy' => (int)($task['createdBy'] ?? $task['CREATED_BY'] ?? 0),
                        'elapsedTime' => isset($task['timeSpentInLogs']) ? ($task['timeSpentInLogs'] / 3600) : 0 // секунды -> часы
                    ];
                }
            }
        }
    }
    
    // Применяем пагинацию
    $totalTasks = count($allTasks);
    $totalPages = $totalTasks > 0 ? (int)ceil($totalTasks / $perPage) : 0;
    $currentPage = max(1, min($page, $totalPages)); // Ограничиваем текущую страницу
    
    $start = ($currentPage - 1) * $perPage;
    $end = $start + $perPage;
    $paginatedTasks = array_slice($allTasks, $start, $perPage);
    
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
```

---

### 4) Интеграция в основной поток API

**Место в коде:** После получения основных данных о трудозатратах

**Логика:**

```php
// В функции getDetailData() или аналогичной

// Если запрошены детальные данные о задачах
if (isset($_POST['includeTaskDetails']) && $_POST['includeTaskDetails'] === true) {
    // Получаем ID задач из данных
    $taskIds = [];
    foreach ($weeks as $week) {
        foreach ($week['employees'] as $employee) {
            foreach ($employee['tasks'] as $task) {
                if (isset($task['id']) && !in_array($task['id'], $taskIds)) {
                    $taskIds[] = $task['id'];
                }
            }
        }
    }
    
    // Фильтруем по employeeId и weekNumber, если указаны
    if (!empty($taskIds)) {
        $page = isset($_POST['page']) ? max(1, (int)$_POST['page']) : 1;
        $perPage = isset($_POST['perPage']) ? max(1, min(100, (int)$_POST['perPage'])) : 10;
        
        $tasksDetails = getTasksDetails($taskIds, $page, $perPage);
        
        // Добавляем в ответ
        $response['data']['tasks'] = $tasksDetails['tasks'];
        $response['data']['pagination'] = $tasksDetails['pagination'];
    }
}
```

---

## Формат запроса

**Пример запроса:**

```json
{
  "product": "1C",
  "weeksCount": 4,
  "includeTaskDetails": true,
  "taskIds": [1001, 1002, 1003],
  "employeeId": 123,
  "weekNumber": 50,
  "page": 1,
  "perPage": 10
}
```

**Параметры:**
- `includeTaskDetails` (boolean, обязательный) — включить детальную информацию о задачах
- `taskIds` (array, опционально) — фильтр по ID задач
- `employeeId` (integer, опционально) — фильтр по ID сотрудника
- `weekNumber` (integer, опционально) — фильтр по номеру недели
- `page` (integer, опционально, по умолчанию 1) — номер страницы
- `perPage` (integer, опционально, по умолчанию 10, максимум 100) — количество задач на страницу

---

## Формат ответа

**Без пагинации (если задач <= 10):**

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1001,
        "title": "Исправление ошибки в модуле",
        "startDate": "2025-12-15T10:00:00+03:00",
        "deadline": "2025-12-20T18:00:00+03:00",
        "closedDate": "2025-12-18T15:30:00+03:00",
        "status": 5,
        "stageId": 5,
        "responsibleId": 123,
        "createdBy": 123,
        "elapsedTime": 5.0
      }
    ],
    "pagination": {
      "totalTasks": 8,
      "currentPage": 1,
      "perPage": 10,
      "totalPages": 1
    }
  }
}
```

**С пагинацией (если задач > 10):**

```json
{
  "success": true,
  "data": {
    "tasks": [
      // ... массив задач (до 10 на страницу)
    ],
    "pagination": {
      "totalTasks": 25,
      "currentPage": 1,
      "perPage": 10,
      "totalPages": 3
    }
  }
}
```

---

## Обработка ошибок

**Типы ошибок:**

1. **Ошибка Bitrix24 API:**
   - Логировать в error_log
   - Продолжать обработку других задач
   - Не прерывать основной процесс

2. **Отсутствие задач:**
   - Возвращать пустой массив `tasks: []`
   - Метаданные пагинации: `totalTasks: 0`, `totalPages: 0`

3. **Некорректные параметры:**
   - Валидировать `page` (минимум 1)
   - Валидировать `perPage` (минимум 1, максимум 100)
   - Использовать значения по умолчанию при ошибках

---

## Критерии приёмки

- [ ] Функция `getTasksDetails()` реализована и работает корректно
- [ ] API endpoint обрабатывает параметр `includeTaskDetails: true`
- [ ] Детальная информация о задачах загружается через Bitrix24 API
- [ ] Пагинация работает корректно (если задач > 10)
- [ ] Метаданные пагинации возвращаются в ответе
- [ ] Ошибки Bitrix24 API обрабатываются и логируются
- [ ] Формат ответа соответствует спецификации
- [ ] Код соответствует стандартам PSR-12
- [ ] Логирование добавлено для всех критических операций

---

## Тестирование

### 1. Тестирование загрузки задач

**Тест 1: Загрузка одной задачи**
```bash
curl -X POST http://localhost/api/tickets-time-tracking-sector-1c.php \
  -H "Content-Type: application/json" \
  -d '{
    "product": "1C",
    "includeTaskDetails": true,
    "taskIds": [1001]
  }'
```

**Ожидаемый результат:** Массив с одной задачей и детальной информацией.

---

### 2. Тестирование пагинации

**Тест 2: Пагинация (25 задач, 10 на страницу)**
```bash
curl -X POST http://localhost/api/tickets-time-tracking-sector-1c.php \
  -H "Content-Type: application/json" \
  -d '{
    "product": "1C",
    "includeTaskDetails": true,
    "taskIds": [1001, 1002, ..., 1025],
    "page": 1,
    "perPage": 10
  }'
```

**Ожидаемый результат:**
- `tasks`: массив из 10 задач
- `pagination.totalTasks`: 25
- `pagination.totalPages`: 3
- `pagination.currentPage`: 1

**Тест 3: Вторая страница**
```bash
# page: 2
```

**Ожидаемый результат:**
- `tasks`: массив из 10 задач (задачи 11-20)
- `pagination.currentPage`: 2

---

### 3. Тестирование ошибок

**Тест 4: Несуществующий ID задачи**
```bash
# taskIds: [999999]
```

**Ожидаемый результат:**
- Ошибка логируется в error_log
- Возвращается пустой массив или задача с `id: 0`

**Тест 5: Пустой массив taskIds**
```bash
# taskIds: []
```

**Ожидаемый результат:**
- `tasks`: []
- `pagination.totalTasks`: 0

---

## Примечания

- **Батч-запросы:** Используем `CRest::callBatch()` для оптимизации (до 50 запросов в одном батче)
- **Логирование:** Все ошибки логируются в error_log с префиксом `[TimeTracking]`
- **Производительность:** При большом количестве задач (>50) разбиваем на несколько батчей
- **Поля STATUS и STAGE_ID:** Загружаются, но не используются в текущем этапе (для будущего использования)
- **Валидация:** Все параметры валидируются перед использованием

---

## Следующий этап

После завершения этого этапа переходим к **TASK-055-02: Расширение сервиса (Frontend)**.

