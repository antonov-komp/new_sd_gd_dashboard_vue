# TASK-043-02: Расширение API для получения новых тикетов по стадиям

**Дата создания:** 2025-12-16 13:28 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Этап 2 из TASK-043

## Цель этапа
Расширить API endpoint `graph-1c-admission-closure.php` для возврата новых тикетов, сгруппированных по стадиям, при запросе с параметром `includeNewTicketsByStages: true`.

## Контекст
- **Текущее состояние:** API возвращает только общее количество `newTickets`, но не группировку по стадиям
- **Требуется:** При запросе с `includeNewTicketsByStages: true` возвращать массив `newTicketsByStages[]` с количеством новых тикетов по каждой стадии
- **Использование:** Данные будут отображаться в попапе `StagesModal` на уровне 1

## Задачи этапа

### 1) Анализ текущей реализации API
- Изучить файл `api/graph-1c-admission-closure.php`
- Понять, как формируется `newCount` (новые тикеты)
- Определить, где сохраняются данные тикетов для агрегации

### 2) Добавление параметра `includeNewTicketsByStages`
- Добавить обработку параметра `includeNewTicketsByStages` в запросе
- По умолчанию `includeNewTicketsByStages: false` (для обратной совместимости)
- Если `includeNewTicketsByStages: true`, сохранять полные данные тикетов

### 3) Модификация логики агрегации
- При агрегации новых тикетов сохранять данные тикетов (не только счёт)
- Группировать новые тикеты по стадиям (`stageId`)
- Фильтровать по `createdTime` в диапазоне `[weekStartUtc, weekEndUtc]`
- Включать все 6 стадий (даже если count = 0)

### 4) Формирование ответа с новыми тикетами по стадиям
- Создать массив `newTicketsByStages[]` с данными по каждой стадии
- Включить все 6 стадий с их названиями и цветами
- Если `includeTickets: true`, добавить массив `tickets[]` для каждой стадии

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
  "includeNewTicketsByStages": true,  // новый параметр
  "includeTickets": false  // опционально, для получения тикетов
}
```

### Формат ответа API

**Текущий формат:**
```json
{
  "success": true,
  "meta": { ... },
  "data": {
    "newTickets": 14,
    "closedTickets": 34,
    "stages": [ ... ],  // только для закрытых
    "responsible": [ ... ]
  }
}
```

**Расширенный формат (при `includeNewTicketsByStages: true`):**
```json
{
  "success": true,
  "meta": { ... },
  "data": {
    "newTickets": 14,
    "closedTickets": 34,
    "newTicketsByStages": [
      {
        "stageId": "DT140_12:UC_0VHWE2",
        "stageName": "Сформировано обращение",
        "count": 5,
        "color": "#007bff",
        "tickets": [ ... ]  // если includeTickets: true
      },
      {
        "stageId": "DT140_12:PREPARATION",
        "stageName": "Рассмотрение ТЗ",
        "count": 3,
        "color": "#ffc107",
        "tickets": [ ... ]
      },
      {
        "stageId": "DT140_12:CLIENT",
        "stageName": "Исполнение",
        "count": 2,
        "color": "#28a745",
        "tickets": [ ... ]
      },
      {
        "stageId": "DT140_12:SUCCESS",
        "stageName": "Успешное закрытие",
        "count": 2,
        "color": "#28a745",
        "tickets": [ ... ]
      },
      {
        "stageId": "DT140_12:FAIL",
        "stageName": "Отклонено",
        "count": 1,
        "color": "#dc3545",
        "tickets": [ ... ]
      },
      {
        "stageId": "DT140_12:UC_0GBU8Z",
        "stageName": "Закрыли без задачи",
        "count": 1,
        "color": "#6c757d",
        "tickets": [ ... ]
      }
    ],
    "stages": [ ... ],
    "responsible": [ ... ]
  }
}
```

### Логика фильтрации новых тикетов

**Для каждой стадии:**
1. Фильтр по `createdTime` в диапазоне `[weekStartUtc, weekEndUtc]`
2. Фильтр по `stageId` = ID стадии
3. Подсчёт количества тикетов
4. Сохранение данных тикетов (если `includeTickets: true`)

**Все стадии:**
- `DT140_12:UC_0VHWE2` — Сформировано обращение (рабочая)
- `DT140_12:PREPARATION` — Рассмотрение ТЗ (рабочая)
- `DT140_12:CLIENT` — Исполнение (рабочая)
- `DT140_12:SUCCESS` — Успешное закрытие (закрывающая)
- `DT140_12:FAIL` — Отклонено (закрывающая)
- `DT140_12:UC_0GBU8Z` — Закрыли без задачи (закрывающая)

**Оптимизация:**
- Использовать те же запросы к Bitrix24 (созданные + закрытые), но группировать по стадиям
- Сохранять полные данные тикетов только если `includeTickets: true`

## Ступенчатые подзадачи

1. **Анализ текущего кода**
   - Изучить `api/graph-1c-admission-closure.php`
   - Найти место, где формируется `newCount`
   - Понять, где сохраняются данные тикетов

2. **Добавление параметра `includeNewTicketsByStages`**
   - Добавить чтение параметра из запроса: `$includeNewTicketsByStages = isset($body['includeNewTicketsByStages']) ? (bool)$body['includeNewTicketsByStages'] : false;`
   - Убедиться, что по умолчанию `false` (обратная совместимость)

3. **Модификация логики агрегации**
   - При обработке новых тикетов сохранять массив тикетов для каждой стадии
   - Создать массив `$newTicketsByStagesAgg = []` для агрегации
   - Группировать тикеты по `stageId`
   - Подсчитывать количество для каждой стадии

4. **Формирование ответа**
   - Создать массив `newTicketsByStages[]` с данными всех 6 стадий
   - Включить `stageId`, `stageName`, `count`, `color` для каждой стадии
   - Если `includeTickets: true`, добавить `tickets[]` для каждой стадии

5. **Тестирование**
   - Проверить работу API с `includeNewTicketsByStages: false` (обратная совместимость)
   - Проверить работу API с `includeNewTicketsByStages: true` (новый функционал)
   - Проверить группировку новых тикетов по стадиям
   - Проверить фильтрацию по дате создания

## Пример реализации

**Файл:** `api/graph-1c-admission-closure.php`

```php
// Чтение параметра
$includeNewTicketsByStages = isset($body['includeNewTicketsByStages']) ? (bool)$body['includeNewTicketsByStages'] : false;

// Определение всех стадий с названиями и цветами
$allStages = [
    'DT140_12:UC_0VHWE2' => ['name' => 'Сформировано обращение', 'color' => '#007bff'],
    'DT140_12:PREPARATION' => ['name' => 'Рассмотрение ТЗ', 'color' => '#ffc107'],
    'DT140_12:CLIENT' => ['name' => 'Исполнение', 'color' => '#28a745'],
    'DT140_12:SUCCESS' => ['name' => 'Успешное закрытие', 'color' => '#28a745'],
    'DT140_12:FAIL' => ['name' => 'Отклонено', 'color' => '#dc3545'],
    'DT140_12:UC_0GBU8Z' => ['name' => 'Закрыли без задачи', 'color' => '#6c757d']
];

// Инициализация агрегации новых тикетов по стадиям
$newTicketsByStagesAgg = [];
foreach ($allStages as $stageId => $stageInfo) {
    $newTicketsByStagesAgg[$stageId] = [
        'stageId' => $stageId,
        'stageName' => $stageInfo['name'],
        'color' => $stageInfo['color'],
        'count' => 0,
        'tickets' => []
    ];
}

// В цикле обработки тикетов
foreach ($tickets as $ticket) {
    $createdTime = $ticket['createdTime'] ?? null;
    $stageId = $ticket['stageId'] ?? null;
    $stageId = $stageId ? strtoupper($stageId) : null;
    
    // Новые за неделю
    if (isInRange($createdTime, $weekStart, $weekEnd)) {
        $newCount++;
        
        // Если нужно включить новые тикеты по стадиям
        if ($includeNewTicketsByStages && $stageId && isset($newTicketsByStagesAgg[$stageId])) {
            $newTicketsByStagesAgg[$stageId]['count']++;
            
            // Если нужно включить тикеты, сохранить данные тикета
            if ($includeTickets) {
                $newTicketsByStagesAgg[$stageId]['tickets'][] = [
                    'id' => (int)$ticket['id'],
                    'title' => $ticket['title'] ?? 'Без названия',
                    'createdTime' => $ticket['createdTime'] ?? null,
                    'stageId' => $stageId,
                    'assignedById' => $ticket['assignedById'] ?? null
                ];
            }
        }
    }
    
    // ... существующая логика для закрытых ...
}

// В формировании ответа
$response = [
    'success' => true,
    'meta' => [ ... ],
    'data' => [
        'newTickets' => $newCount,
        'closedTickets' => $closedCount,
        // ... существующие поля ...
        'newTicketsByStages' => $includeNewTicketsByStages 
            ? array_map(function ($item) use ($includeTickets) {
                $result = [
                    'stageId' => $item['stageId'],
                    'stageName' => $item['stageName'],
                    'color' => $item['color'],
                    'count' => $item['count']
                ];
                
                // Включить тикеты только если запрошено
                if ($includeTickets && isset($item['tickets'])) {
                    $result['tickets'] = $item['tickets'];
                }
                
                return $result;
            }, array_values($newTicketsByStagesAgg))
            : null
    ]
];
```

## Критерии приёмки этапа

- [ ] API принимает параметр `includeNewTicketsByStages` (опциональный, по умолчанию `false`)
- [ ] При `includeNewTicketsByStages: false` API работает как раньше (обратная совместимость)
- [ ] При `includeNewTicketsByStages: true` API возвращает `newTicketsByStages[]` с данными всех 6 стадий
- [ ] Новые тикеты фильтруются по `createdTime` в диапазоне `[weekStartUtc, weekEndUtc]`
- [ ] Новые тикеты группируются по `stageId`
- [ ] Все 6 стадий включены в ответ (даже если count = 0)
- [ ] В ответе включены `stageId`, `stageName`, `color`, `count` для каждой стадии
- [ ] При `includeTickets: true` включены `tickets[]` для каждой стадии
- [ ] Названия стадий соответствуют ожидаемым

## Дополнительные уточнения

### Производительность
- При `includeNewTicketsByStages: false` не сохранять данные тикетов (экономия памяти)
- Использовать те же запросы к Bitrix24 (созданные + закрытые)
- Не делать дополнительных запросов к API

### Обратная совместимость
- По умолчанию `includeNewTicketsByStages: false`
- Если параметр не передан, API работает как раньше
- Не ломать существующий функционал

## История правок

- 2025-12-16 13:28 (UTC+3, Брест): Создан этап 2 задачи TASK-043

