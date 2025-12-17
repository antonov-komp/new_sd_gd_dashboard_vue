# Анализ API для модуля «Трудозатраты на Тикеты сектора 1С»

**Дата создания:** 2025-12-17 11:00 (UTC+3, Брест)  
**Связанная задача:** TASK-050-01  
**Статус:** ✅ Завершён

---

## 1. Метод API для получения трудозатрат

### Метод Bitrix24 REST API

**Название:** `task.elapseditem.getlist` (без "s" в начале!)

**Документация:**
- https://context7.com/bitrix24/rest/task.elapseditem.getlist
- https://apidocs.bitrix24.ru/rest/task.elapseditem.getlist

**Важно:** Метод называется `task.elapseditem.getlist` (без "s"), а не `tasks.elapseditem.getlist`!

**Параметры:**
- `taskId` (обязательный) - ID задачи
- `start` (опциональный) - для пагинации

**Пример использования:**
```php
$result = CRest::call('task.elapseditem.getlist', [
    'taskId' => 71261,
    'start' => 0
]);
```

### Альтернативные методы
- `task.elapseditem.get` — получение конкретной записи трудозатраты (без "s")
- `task.elapseditem.add` — добавление записи (не требуется для модуля)

**Проверено:** Методы с префиксом `tasks.` (с "s") не работают, нужно использовать `task.` (без "s").

---

## 2. Структура данных записей трудозатрат

### Предполагаемые поля записи

На основе анализа документации и примеров кода:

| Поле | Название в API | Тип | Описание |
|------|----------------|-----|----------|
| ID записи | `ID` | integer | Уникальный идентификатор записи трудозатраты |
| ID задачи | `TASK_ID` | integer | ID задачи, на которую записана трудозатрата |
| ID сотрудника | `USER_ID` или `CREATED_BY` | integer | ID сотрудника, который записал трудозатрату |
| Время создания | `CREATED_DATE` или `DATE_CREATE` | string (datetime) | Время создания записи (для определения недели) |
| Временной промежуток | `SECONDS` (основное), `MINUTES`, `HOURS` | integer/float | Количество времени в секундах (проверено) |
| Комментарий | `COMMENT_TEXT` | string | Комментарий к записи (опционально) |

### Формат единиц измерения

**Проверено через тестовый запрос:**
- Основное поле: `SECONDS` - время в секундах (например, 12600 секунд = 3.5 часа)
- Дополнительные поля: `MINUTES`, `HOURS` - для удобства
- Рекомендуется использовать `SECONDS` как основное поле

### Пример структуры ответа API (предположительно)

```json
{
  "result": [
    {
      "ID": "101857",
      "TASK_ID": "71261",
      "USER_ID": "1078",
      "CREATED_DATE": "2025-09-17T16:03:00+03:00",
      "SECONDS": 12600,
      "MINUTES": 210,
      "HOURS": 3.5,
      "COMMENT_TEXT": "скопирован документ Получение...",
      "SOURCE": 2,
      "DATE_START": "2025-09-18T09:05:48+03:00",
      "DATE_STOP": "2025-09-18T09:05:48+03:00"
    }
  ]
}
```

**Проверено:** Структура подтверждена тестовым запросом к API.

---

## 3. Связь с задачами

### Поле связи

**Поле:** `TASK_ID` — ID задачи, на которую записана трудозатрата

### Метод получения задачи

**Метод:** `tasks.task.get`

**Пример использования:**
```php
$task = CRest::call('tasks.task.get', [
    'taskId' => $taskId,
    'select' => ['*', 'UF_*']
]);
```

**Документация:**
- https://context7.com/bitrix24/rest/tasks.task.get
- https://apidocs.bitrix24.ru/rest/tasks.task.get

### Батч-запросы для оптимизации

Для получения множества задач использовать `CRest::callBatch()`:
```php
$batchData = [];
foreach ($taskIds as $taskId) {
    $batchData["task_{$taskId}"] = [
        'method' => 'tasks.task.get',
        'params' => [
            'taskId' => $taskId,
            'select' => ['*', 'UF_*']
        ]
    ];
}
$result = CRest::callBatch($batchData);
```

---

## 4. Матчинг задач с тикетами 140 сервис деска

### Проблема

**Требуется определить поле связи задачи с тикетом.**

### Возможные варианты связи

1. **Прямое поле в задаче:**
   - `UF_CRM_TICKET_ID` — ID тикета
   - `ufCrmTicketId` — альтернативное название (camelCase)

2. **Связь через пользовательские поля (UF_*):**
   - Другие UF_* поля в задаче, которые могут содержать ID тикета
   - Требуется проверить структуру задачи через API

3. **Поиск тикета по названию задачи:**
   - Матчинг по названию задачи и тикета (менее надёжный метод)

### Метод получения тикета

**Метод:** `crm.item.get` или `crm.item.list`

**Пример:**
```php
$ticket = CRest::call('crm.item.get', [
    'entityTypeId' => 140,
    'id' => $ticketId,
    'select' => [
        'id',
        'title',
        'createdTime',
        'UF_CRM_7_TYPE_PRODUCT'
    ]
]);
```

### Фильтрация по сектору 1С

**Поле:** `UF_CRM_7_TYPE_PRODUCT` = `"1C"`

**Пример фильтрации:**
```php
$tickets = CRest::call('crm.item.list', [
    'entityTypeId' => 140,
    'filter' => [
        'UF_CRM_7_TYPE_PRODUCT' => '1C'
    ],
    'select' => ['*']
]);
```

### Рекомендация

**Требуется провести тестовый запрос:**
1. Получить несколько задач через `tasks.task.get`
2. Проверить наличие полей `UF_CRM_TICKET_ID`, `ufCrmTicketId` или других UF_* полей
3. Определить точное поле связи

---

## 5. Определение сотрудников сектора 1С

### Константа отделов

**Файл:** `vue-app/src/services/dashboard-sector-1c/utils/sector-constants.js`

**ID сектора 1С:** `366`

**Константа:**
```javascript
export const SECTOR_IDS = {
  SECTOR_1C: 366,
  // ...
};
```

### Метод получения сотрудников

**Метод:** `user.get`

**Пример из существующего кода:**
```javascript
// Из vue-app/src/api/sector1cEmployees.js
const result = await Bitrix24ApiService.call('user.get', {
  filter: {
    'ACTIVE': 'Y',
    'UF_DEPARTMENT': [366] // Сектор 1С
  },
  select: [
    'ID',
    'NAME',
    'LAST_NAME',
    'SECOND_NAME',
    'WORK_POSITION',
    'UF_DEPARTMENT'
  ]
});
```

**Документация:**
- https://context7.com/bitrix24/rest/user.get
- https://apidocs.bitrix24.ru/rest/user.get

### Использование в проекте

**Файлы:**
- `vue-app/src/api/sector1cEmployees.js` — сервис для получения сотрудников
- `vue-app/src/services/dashboard-sector-1c/utils/sector-constants.js` — константы секторов

---

## 6. Логика определения недель (ISO-8601)

### Источник логики

**Файл:** `api/graph-1c-admission-closure.php`

**Функции:**
- `getWeekBounds()` — получение границ текущей недели
- `getFourWeeksBounds()` — получение границ 4 недель (текущая + 3 предыдущие)

### Формат недели

- **Стандарт:** ISO-8601 (понедельник–воскресенье)
- **Часовой пояс:** UTC
- **Расчёт:** Используется `DateTimeImmutable` с `setISODate()`

### Пример кода

```php
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
```

### Определение недели для трудозатрат

**Важно:** Неделя определяется по **времени создания записи трудозатраты** (`CREATED_DATE`), а не по времени создания задачи или тикета.

---

## 7. Изучение существующих модулей

### Модуль "График приёма и закрытий сектора 1С" (TASK-041)

**Файлы:**
- `api/graph-1c-admission-closure.php` — backend API endpoint
- `vue-app/src/services/graph-admission-closure/admissionClosureService.js` — frontend сервис
- `vue-app/src/components/graph-admission-closure/GraphAdmissionClosureDashboard.vue` — главный компонент

**Ключевые моменты:**
- Логика расчёта недель (ISO-8601, UTC)
- Фильтрация по сектору 1С (`UF_CRM_7_TYPE_PRODUCT` = "1C")
- Структура ответа API (meta + data)
- Навигация (breadcrumbs)

### Модуль "График состояния сектора 1С"

**Файлы:**
- `vue-app/src/components/graph-state/GraphStateDashboard.vue` — структура дашборда
- `vue-app/src/services/dashboard-sector-1c/utils/ticket-utils.js` — утилиты для работы с тикетами

**Ключевые моменты:**
- Логика определения сотрудников сектора 1С
- Структура доступа и фильтров
- Принципы работы с данными

### Модуль "Дашборд сектора 1С"

**Файлы:**
- `vue-app/src/services/dashboard-sector-1c-service.js` — основной сервис
- `vue-app/src/services/dashboard-sector-1c/utils/sector-constants.js` — константы секторов

**Ключевые моменты:**
- Определение сектора 1С через константу (ID: 366)
- Получение тикетов через `crm.item.list` (entityTypeId: 140)
- Фильтрация по `UF_CRM_7_TYPE_PRODUCT` = "1C"

---

## 8. Ограничения API

### Лимиты запросов

- **Максимум запросов:** 2 запроса в секунду (QUERY_LIMIT_EXCEEDED)
- **Пагинация:** Максимум 50 элементов за запрос (для `crm.item.list`)
- **Батч-запросы:** Максимум 50 запросов в одном батче (`CRest::BATCH_COUNT = 50`)

### Рекомендации

1. Использовать пагинацию для получения всех записей трудозатрат
2. Использовать батч-запросы для получения множества задач
3. Кешировать данные сотрудников и задач для оптимизации
4. Обрабатывать ошибки `QUERY_LIMIT_EXCEEDED` с повторными попытками

---

## 9. Следующие шаги

### Требуется выполнить тестовые запросы

1. **Тестовый запрос к `tasks.elapseditem.getlist`:**
   ```php
   $result = CRest::call('tasks.elapseditem.getlist', [
       'filter' => [
           '>=CREATED_DATE' => '2025-12-01',
           '<=CREATED_DATE' => '2025-12-17'
       ],
       'select' => ['*'],
       'start' => 0
   ]);
   var_dump($result);
   ```

2. **Проверка структуры задачи:**
   - Получить несколько задач через `tasks.task.get`
   - Проверить наличие полей связи с тикетами (UF_CRM_TICKET_ID и др.)

3. **Проверка формата единиц измерения:**
   - Определить, в каких единицах возвращается временной промежуток (секунды/минуты/часы)

### Документирование результатов тестов

После выполнения тестовых запросов обновить этот документ:
- Точная структура ответа API
- Названия полей
- Формат единиц измерения
- Поле связи задачи с тикетом

---

## 10. Выводы

### Определено

✅ **Метод API:** `task.elapseditem.getlist` (без "s" в начале!)  
✅ **Сектор 1С:** ID = 366 (константа из `sector-constants.js`)  
✅ **Логика недель:** ISO-8601, UTC (из `graph-1c-admission-closure.php`)  
✅ **Метод получения задач:** `tasks.task.list` / `tasks.task.get`  
✅ **Метод получения тикетов:** `crm.item.get` / `crm.item.list`  
✅ **Фильтрация по сектору:** `UF_CRM_7_TYPE_PRODUCT` = "1C"  
✅ **Структура ответа API:** Подтверждена тестовым запросом  
✅ **Формат единиц измерения:** `SECONDS` (основное поле, в секундах)  
✅ **Поле связи задачи с тикетом:** `ufCrmTask` (формат: `["T8c_3093"]`, где 8c = 140 в hex, 3093 = ID тикета)  
✅ **Названия полей:** `ID`, `TASK_ID`, `USER_ID`, `CREATED_DATE`, `SECONDS`, `MINUTES`, `COMMENT_TEXT`

---

## История правок

- **2025-12-17 11:00 (UTC+3, Брест):** Создан документ с результатами анализа этапа TASK-050-01
  - Определён метод API для трудозатрат
  - Изучена структура данных
  - Определена логика недель и фильтрации
  - Определена константа сектора 1С
  - Выявлены вопросы, требующие уточнения через тестовые запросы
- **2025-12-17 17:00 (UTC+3, Брест):** Обновлён документ после тестирования API
  - ✅ Найден правильный метод: `task.elapseditem.getlist` (без "s" в начале)
  - ✅ Подтверждена структура ответа API через тестовый запрос
  - ✅ Определён формат единиц измерения: `SECONDS` (в секундах)
  - ✅ Определено поле связи с тикетами: `ufCrmTask` (формат `["T8c_3093"]`)
  - ✅ Обновлены примеры использования и структура данных

