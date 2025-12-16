# TASK-044-02: Расширение API для возврата переходящих тикетов

**Дата создания:** 2025-12-16 11:01 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Этап 2 из TASK-044

## Цель этапа

Расширить API endpoint `graph-1c-admission-closure.php` для возврата переходящих тикетов в ответе при запросе с параметром `includeCarryoverTickets: true`. Добавить поле `carryoverTickets` и массив `series.carryover[]` для графиков.

## Контекст

- **Текущее состояние:** API возвращает только `newTickets` и `closedTickets`, не учитывает переходящие тикеты
- **Требуется:** При запросе с `includeCarryoverTickets: true` возвращать количество переходящих тикетов и данные для графиков
- **Использование:** Данные будут использоваться для отображения третьей категории на графиках и в summary-карточках

## Задачи этапа

### 1) Анализ текущей реализации API
- Изучить файл `api/graph-1c-admission-closure.php`
- Понять, как формируется ответ API
- Определить, где добавлять новые поля в ответ

### 2) Добавление параметра `includeCarryoverTickets`
- Добавить обработку параметра `includeCarryoverTickets` в запросе
- По умолчанию `includeCarryoverTickets: false` (для обратной совместимости)
- Если `includeCarryoverTickets: true`, включать переходящие тикеты в ответ

### 3) Модификация формирования ответа
- Добавить поле `carryoverTickets` (количество) в ответ
- Добавить массив `series.carryover[]` для графиков
- Сохранить обратную совместимость (если параметр не передан, поле не включается)

### 4) Интеграция с логикой переходящих тикетов
- Использовать `$carryoverCount` из TASK-044-01
- Добавить в `series` массив `carryover[]` с одним значением (для недели)

## Технические требования

### Входные параметры API

**Текущий формат:**
```json
{
  "product": "1C",
  "weekStartUtc": "2025-12-08T00:00:00Z",
  "weekEndUtc": "2025-12-15T23:59:59Z",
  "includeTickets": false
}
```

**Расширенный формат:**
```json
{
  "product": "1C",
  "weekStartUtc": "2025-12-08T00:00:00Z",
  "weekEndUtc": "2025-12-15T23:59:59Z",
  "includeCarryoverTickets": true,  // новый параметр
  "includeTickets": false
}
```

### Формат ответа API

**Текущий формат:**
```json
{
  "success": true,
  "meta": {
    "weekNumber": 50,
    "weekStartUtc": "2025-12-08T00:00:00Z",
    "weekEndUtc": "2025-12-15T23:59:59Z"
  },
  "data": {
    "newTickets": 14,
    "closedTickets": 34,
    "series": {
      "new": [14],
      "closed": [34]
    },
    "stages": [ ... ],
    "responsible": [ ... ]
  }
}
```

**Расширенный формат (при `includeCarryoverTickets: true`):**
```json
{
  "success": true,
  "meta": {
    "weekNumber": 50,
    "weekStartUtc": "2025-12-08T00:00:00Z",
    "weekEndUtc": "2025-12-15T23:59:59Z"
  },
  "data": {
    "newTickets": 14,
    "closedTickets": 34,
    "carryoverTickets": 12,  // новый параметр
    "series": {
      "new": [14],
      "closed": [34],
      "carryover": [12]  // новый массив
    },
    "stages": [ ... ],
    "responsible": [ ... ]
  }
}
```

## Ступенчатые подзадачи

1. **Анализ текущего кода**
   - Изучить `api/graph-1c-admission-closure.php`
   - Найти место, где формируется ответ API
   - Понять структуру `series` для графиков

2. **Добавление параметра `includeCarryoverTickets`**
   - Добавить чтение параметра из запроса: `$includeCarryoverTickets = isset($body['includeCarryoverTickets']) ? (bool)$body['includeCarryoverTickets'] : false;`
   - Убедиться, что по умолчанию `false` (обратная совместимость)

3. **Модификация формирования ответа**
   - Использовать `$carryoverCount` из логики переходящих тикетов
   - Добавить поле `carryoverTickets` в ответ (только если `includeCarryoverTickets: true`)
   - Добавить массив `series.carryover[]` с одним значением `[$carryoverCount]`

4. **Тестирование**
   - Проверить работу API с `includeCarryoverTickets: false` (обратная совместимость)
   - Проверить работу API с `includeCarryoverTickets: true` (новый функционал)
   - Убедиться, что `carryoverTickets` корректно подсчитывается

## Пример реализации

**Файл:** `api/graph-1c-admission-closure.php`

```php
// Чтение параметра
$includeCarryoverTickets = isset($body['includeCarryoverTickets']) ? (bool)$body['includeCarryoverTickets'] : false;

// ... существующая логика обработки тикетов ...

// В формировании ответа
$response = [
    'success' => true,
    'meta' => [
        'weekNumber' => (int)$weekStart->format('W'),
        'weekStartUtc' => $weekStart->format('c'),
        'weekEndUtc' => $weekEnd->format('c')
    ],
    'data' => [
        'newTickets' => $newCount,
        'closedTickets' => $closedCount,
        'series' => [
            'new' => [$newCount],
            'closed' => [$closedCount]
        ],
        'stages' => $stagesArray,
        'responsible' => $responsibleArray
    ]
];

// Добавить переходящие тикеты, если запрошено
if ($includeCarryoverTickets) {
    $response['data']['carryoverTickets'] = $carryoverCount;
    $response['data']['series']['carryover'] = [$carryoverCount];
}
```

## Критерии приёмки этапа

- [ ] API принимает параметр `includeCarryoverTickets` (опциональный, по умолчанию `false`)
- [ ] При `includeCarryoverTickets: false` API работает как раньше (обратная совместимость)
- [ ] При `includeCarryoverTickets: true` API возвращает `carryoverTickets` (количество)
- [ ] При `includeCarryoverTickets: true` API возвращает `series.carryover[]` с одним значением
- [ ] Значение `carryoverTickets` соответствует количеству переходящих тикетов из TASK-044-01
- [ ] Структура ответа соответствует ожидаемому формату
- [ ] Не ломается существующий функционал для `newTickets` и `closedTickets`

## Дополнительные уточнения

### Обратная совместимость

- По умолчанию `includeCarryoverTickets: false`
- Если параметр не передан, API работает как раньше
- Поле `carryoverTickets` и `series.carryover[]` включаются только при `includeCarryoverTickets: true`
- Не ломать существующий функционал

### Производительность

- Подсчёт переходящих тикетов выполняется только если `includeCarryoverTickets: true`
- Использовать уже подсчитанное значение `$carryoverCount` из логики фильтрации
- Не делать дополнительных запросов к Bitrix24

### Формат данных

- `carryoverTickets` — целое число (количество)
- `series.carryover[]` — массив с одним элементом (для недели)
- Все значения в UTC, как и остальные данные

## История правок

- 2025-12-16 11:01 (UTC+3, Брест): Создан этап 2 задачи TASK-044

