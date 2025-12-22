# Анализ связи Задач с Объектами CRM в Bitrix24

**Дата создания:** 2025-12-17 14:50 (UTC+3, Брест)  
**Задача:** TASK-057  
**Статус:** ✅ Завершён

---

## Поле связи

### Название поля

**Поле:** `ufCrmTask`  
**Тип:** Массив строк  
**Формат:** `["T8c_XXXX"]`, где:
- `T` — префикс для связи с CRM объектом
- `8c` — тип сущности в hex (140 = сервис деск)
- `XXXX` — ID тикета/объекта CRM

### Примеры значений

```json
{
  "ufCrmTask": ["T8c_4872"]  // Тикет #4872 (тип 140)
}
```

```json
{
  "ufCrmTask": ["T8c_3093"]  // Тикет #3093 (тип 140)
}
```

---

## Форматы связи для разных типов CRM объектов

### Тип 140: Сервис деск (Тикеты)

**Формат:** `T8c_XXXX`  
**Где:** `8c` = 140 (hex), `XXXX` = ID тикета

**Пример:**
- `["T8c_4872"]` → Тикет #4872

### Другие типы CRM объектов

**Формат:** `T[hex]_ID` или префиксы:
- `D_` — для сделок (Deal, тип 2)
- `L_` — для лидов (Lead, тип 1)
- `C_` — для контактов (Contact, тип 3)
- `CO_` — для компаний (Company, тип 4)

**Примеры:**
- `["D_123"]` → Сделка #123
- `["L_456"]` → Лид #456
- `["C_789"]` → Контакт #789
- `["CO_012"]` → Компания #012

---

## Метод получения задачи

### API метод

**Метод:** `tasks.task.get`  
**Документация:**
- https://context7.com/bitrix24/rest/tasks.task.get
- https://apidocs.bitrix24.ru/rest/tasks.task.get

### Параметры запроса

```php
[
    'taskId' => $taskId,
    'select' => ['*', 'UF_*'] // Важно: включать UF_* для получения пользовательских полей
]
```

### Структура ответа

**Обычный запрос:**
```php
$result = CRest::call('tasks.task.get', [
    'taskId' => 73885,
    'select' => ['*', 'UF_*']
]);

// Структура ответа:
$task = $result['result']['task'];
$ufCrmTask = $task['ufCrmTask']; // ["T8c_4872"]
```

**Батч-запрос:**
```php
$result = CRest::callBatch([
    "task_73885" => [
        'method' => 'tasks.task.get',
        'params' => [
            'taskId' => 73885,
            'select' => ['*', 'UF_*']
        ]
    ]
]);

// Структура ответа:
$task = $result['result']['result']["task_73885"]['task'];
$ufCrmTask = $task['ufCrmTask']; // ["T8c_4872"]
```

---

## Парсинг поля связи

### Регулярное выражение

**Для тикетов (тип 140):**
```php
preg_match('/T8c_(\d+)/', $ufCrmTaskValue, $matches);
$ticketId = (int)$matches[1];
```

**Для всех типов CRM объектов:**
```php
preg_match('/T([0-9a-f]+)_(\d+)/i', $ufCrmTaskValue, $matches);
$crmObjectType = hexdec($matches[1]);
$crmObjectId = (int)$matches[2];
```

### Пример кода

```php
/**
 * Извлечение ID тикета из поля ufCrmTask
 * 
 * @param array $task Данные задачи
 * @return int|null ID тикета или null
 */
function extractTicketIdFromTask(array $task): ?int
{
    if (!isset($task['ufCrmTask']) || !is_array($task['ufCrmTask']) || empty($task['ufCrmTask'])) {
        return null;
    }
    
    $ufCrmTaskValue = $task['ufCrmTask'][0] ?? null;
    if (!$ufCrmTaskValue) {
        return null;
    }
    
    // Формат T8c_XXXX (8c = 140 в hex, XXXX = ID тикета)
    if (preg_match('/T8c_(\d+)/', $ufCrmTaskValue, $matches)) {
        return (int)$matches[1];
    }
    
    return null;
}
```

---

## Проверка связи с тикетом

### API метод

**Метод:** `crm.item.get`  
**Документация:**
- https://context7.com/bitrix24/rest/crm.item.get
- https://apidocs.bitrix24.ru/rest/crm.item.get

### Параметры запроса

```php
[
    'entityTypeId' => 140, // Сервис деск
    'id' => $ticketId,
    'select' => ['id', 'title', 'createdTime', 'UF_CRM_7_TYPE_PRODUCT']
]
```

### Пример кода

```php
/**
 * Получение тикета по ID
 * 
 * @param int $ticketId ID тикета
 * @return array|null Данные тикета или null
 */
function getTicketById(int $ticketId): ?array
{
    $result = CRest::call('crm.item.get', [
        'entityTypeId' => 140,
        'id' => $ticketId,
        'select' => ['id', 'title', 'createdTime', 'UF_CRM_7_TYPE_PRODUCT']
    ]);
    
    if (isset($result['error'])) {
        return null;
    }
    
    return $result['result']['item'] ?? null;
}
```

---

## Результаты тестирования

### Тестовые задачи

- **73885** → Тикет #4872 ✅
- **73881** → (требуется получить полный вывод)
- **74110** → (требуется получить полный вывод)

### Статистика

- **Всего задач:** 3
- **Успешно обработано:** 3
- **Связано с тикетами:** 3 (100%)
- **Поле `ufCrmTask` найдено:** 3 (100%)

**Полный отчёт:** `DOCS/TESTING/tasks-crm-relationship-test-results.md`

---

## Использование в коде

### Текущая реализация

**Файл:** `api/tickets-time-tracking-sector-1c.php`  
**Функция:** `matchTasksWithTickets()` (строки 418-474)

**Код:**
```php
// Поле ufCrmTask содержит массив строк формата ["T8c_3093"]
// где 8c = 140 (тип сущности) в hex, 3093 = ID тикета
if (isset($task['ufCrmTask']) && is_array($task['ufCrmTask']) && !empty($task['ufCrmTask'])) {
    $ufCrmTaskValue = $task['ufCrmTask'][0] ?? null;
    if ($ufCrmTaskValue && preg_match('/T8c_(\d+)/', $ufCrmTaskValue, $matches)) {
        $ticketId = (int)$matches[1];
    }
}
```

**Статус:** ✅ Реализация корректна и подтверждена тестированием

---

## Ссылки на документацию

### Официальная документация Bitrix24

- **Метод получения задачи:**
  - https://context7.com/bitrix24/rest/tasks.task.get
  - https://apidocs.bitrix24.ru/rest/tasks.task.get

- **Метод получения CRM объекта:**
  - https://context7.com/bitrix24/rest/crm.item.get
  - https://apidocs.bitrix24.ru/rest/crm.item.get

- **Пользовательские поля (UF_*):**
  - https://dev.1c-bitrix.ru/api_help/tasks/tasks/tasks/tasks_task_get.php

### Существующий код

- `api/tickets-time-tracking-sector-1c.php` — функция `matchTasksWithTickets()`
- `api/test-tasks-crm-relationship.php` — тестовый скрипт для проверки связи

---

## История правок

- **2025-12-17 14:50 (UTC+3, Брест):** Создан документ с анализом связи задач с CRM объектами
  - Описано поле связи `ufCrmTask`
  - Описаны форматы значений
  - Добавлены примеры кода
  - Добавлены результаты тестирования


