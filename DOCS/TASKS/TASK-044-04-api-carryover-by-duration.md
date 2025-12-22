# TASK-044-04: Расширение API для градации переходящих тикетов по срокам

**Дата создания:** 2025-12-16 11:01 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Этап 4 из TASK-044

## Цель этапа

Расширить API endpoint `graph-1c-admission-closure.php` для возврата переходящих тикетов, сгруппированных по срокам (от даты периода `weekStartUtc`), при запросе с параметром `includeCarryoverTicketsByDuration: true`. Категории сроков: Менее 1 месяца, Более 1 месяца, Более 2 месяцев, Более полугода, Более года.

## Контекст

- **Текущее состояние:** API возвращает только общее количество `carryoverTickets`, но не группировку по срокам
- **Требуется:** При запросе с `includeCarryoverTicketsByDuration: true` возвращать массив `carryoverTicketsByDuration[]` с количеством переходящих тикетов по каждой категории срока
- **Использование:** Данные будут отображаться в попапе `CarryoverDurationModal` на уровне 1

## Задачи этапа

### 1) Анализ текущей реализации API
- Изучить файл `api/graph-1c-admission-closure.php`
- Понять, как формируются переходящие тикеты (из TASK-044-01)
- Определить, где сохраняются данные переходящих тикетов

### 2) Добавление параметра `includeCarryoverTicketsByDuration`
- Добавить обработку параметра `includeCarryoverTicketsByDuration` в запросе
- По умолчанию `includeCarryoverTicketsByDuration: false` (для обратной совместимости)
- Если `includeCarryoverTicketsByDuration: true`, группировать переходящие тикеты по срокам

### 3) Реализация логики расчёта сроков
- Создать функцию `calculateDurationCategory($createdTime, $weekStartUtc)` для определения категории срока
- Рассчитывать срок от `weekStartUtc` до `createdTime` каждого тикета
- Распределять тикеты по категориям:
  - До 1 месяца: `duration < 14 дней` (0-13 дней)
  - Менее 1 месяца: `14 ≤ duration < 30 дней` (14-29 дней)
  - Более 1 месяца: `30 ≤ duration < 60 дней` (30-59 дней)
  - Более 2 месяцев: `60 ≤ duration < 180 дней` (60-179 дней)
  - Более полугода: `180 ≤ duration < 365 дней` (180-364 дня)
  - Более года: `duration ≥ 365 дней` (≥365 дней)

### 4) Модификация логики агрегации
- При агрегации переходящих тикетов группировать по категориям сроков
- Сохранять данные тикетов для каждой категории (если `includeTickets: true`)
- Подсчитывать количество тикетов в каждой категории

### 5) Формирование ответа с переходящими тикетами по срокам
- Создать массив `carryoverTicketsByDuration[]` с данными по каждой категории
- Включить все 6 категорий с их названиями и цветами
- Если `includeTickets: true`, добавить массив `tickets[]` для каждой категории

## Технические требования

### Входные параметры API

**Текущий формат:**
```json
{
  "product": "1C",
  "weekStartUtc": "2025-12-08T00:00:00Z",
  "weekEndUtc": "2025-12-15T23:59:59Z",
  "includeCarryoverTickets": true
}
```

**Расширенный формат:**
```json
{
  "product": "1C",
  "weekStartUtc": "2025-12-08T00:00:00Z",
  "weekEndUtc": "2025-12-15T23:59:59Z",
  "includeCarryoverTickets": true,
  "includeCarryoverTicketsByDuration": true,  // новый параметр
  "includeTickets": false  // опционально, для получения тикетов
}
```

### Формат ответа API

**Расширенный формат (при `includeCarryoverTicketsByDuration: true`):**
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
    "carryoverTickets": 12,
    "series": {
      "new": [14],
      "closed": [34],
      "carryover": [12]
    },
    "carryoverTicketsByDuration": [
      {
        "durationCategory": "up_to_month",
        "durationLabel": "До 1 месяца",
        "count": 3,
        "color": "#28a745",
        "tickets": [ ... ]  // если includeTickets: true
      },
      {
        "durationCategory": "less_than_month",
        "durationLabel": "Менее 1 месяца",
        "count": 2,
        "color": "#6cbd45",
        "tickets": [ ... ]
      },
      {
        "durationCategory": "more_than_month",
        "durationLabel": "Более 1 месяца",
        "count": 3,
        "color": "#ffc107",
        "tickets": [ ... ]
      },
      {
        "durationCategory": "more_than_2_months",
        "durationLabel": "Более 2 месяцев",
        "count": 2,
        "color": "#ff9800",
        "tickets": [ ... ]
      },
      {
        "durationCategory": "more_than_half_year",
        "durationLabel": "Более полугода",
        "count": 1,
        "color": "#dc3545",
        "tickets": [ ... ]
      },
      {
        "durationCategory": "more_than_year",
        "durationLabel": "Более года",
        "count": 1,
        "color": "#c82333",
        "tickets": [ ... ]
      }
    ],
    "stages": [ ... ],
    "responsible": [ ... ]
  }
}
```

### Логика расчёта сроков

**Формула:**
- Срок считается от `weekStartUtc` (начала текущего периода) до `createdTime` (даты создания тикета)
- `duration = weekStartUtc - createdTime` (в днях)

**Категории сроков (6 категорий):**
1. **До 1 месяца:**
   - Условие: `duration < 14 дней` (0-13 дней)
   - Цвет: `#28a745` (зелёный)

2. **Менее 1 месяца:**
   - Условие: `14 ≤ duration < 30 дней` (14-29 дней)
   - Цвет: `#6cbd45` (светло-зелёный)

3. **Более 1 месяца:**
   - Условие: `30 ≤ duration < 60 дней` (30-59 дней)
   - Цвет: `#ffc107` (жёлтый)

4. **Более 2 месяцев:**
   - Условие: `60 ≤ duration < 180 дней` (60-179 дней)
   - Цвет: `#ff9800` (оранжевый)

5. **Более полугода:**
   - Условие: `180 ≤ duration < 365 дней` (180-364 дня)
   - Цвет: `#dc3545` (красный)

6. **Более года:**
   - Условие: `duration ≥ 365 дней` (≥365 дней)
   - Цвет: `#c82333` (тёмно-красный)

## Ступенчатые подзадачи

1. **Анализ текущего кода**
   - Изучить `api/graph-1c-admission-closure.php`
   - Найти место, где формируются переходящие тикеты
   - Понять, где сохраняются данные тикетов

2. **Добавление параметра `includeCarryoverTicketsByDuration`**
   - Добавить чтение параметра из запроса
   - Убедиться, что по умолчанию `false` (обратная совместимость)

3. **Реализация функции расчёта категории срока**
   - Создать функцию `calculateDurationCategory($createdTime, $weekStartUtc)`
   - Рассчитывать разницу в днях между `weekStartUtc` и `createdTime`
   - Возвращать категорию срока на основе условий

4. **Модификация логики агрегации**
   - При обработке переходящих тикетов группировать по категориям сроков
   - Создать массив `$carryoverTicketsByDurationAgg = []` для агрегации
   - Подсчитывать количество для каждой категории

5. **Формирование ответа**
   - Создать массив `carryoverTicketsByDuration[]` с данными всех 5 категорий
   - Включить `durationCategory`, `durationLabel`, `count`, `color` для каждой категории
   - Если `includeTickets: true`, добавить `tickets[]` для каждой категории

6. **Тестирование**
   - Проверить работу API с `includeCarryoverTicketsByDuration: false` (обратная совместимость)
   - Проверить работу API с `includeCarryoverTicketsByDuration: true` (новый функционал)
   - Проверить расчёт сроков для разных дат создания тикетов
   - Проверить группировку по категориям

## Пример реализации

**Файл:** `api/graph-1c-admission-closure.php`

```php
/**
 * Определение категории срока для переходящего тикета
 * 
 * @param string $createdTime Дата создания тикета (ISO-8601)
 * @param DateTimeImmutable $weekStart Начало недели (UTC)
 * @return string Категория срока
 */
function calculateDurationCategory(string $createdTime, DateTimeImmutable $weekStart): string
{
    $createdDt = new DateTimeImmutable($createdTime, new DateTimeZone('UTC'));
    $diff = $weekStart->diff($createdDt);
    $days = (int)$diff->format('%a'); // Количество дней
    
    if ($days < 14) {
        return 'up_to_month'; // До 1 месяца (0-13 дней)
    } elseif ($days < 30) {
        return 'less_than_month'; // Менее 1 месяца (14-29 дней)
    } elseif ($days < 60) {
        return 'more_than_month'; // Более 1 месяца (30-59 дней)
    } elseif ($days < 180) {
        return 'more_than_2_months'; // Более 2 месяцев (60-179 дней)
    } elseif ($days < 365) {
        return 'more_than_half_year'; // Более полугода (180-364 дня)
    } else {
        return 'more_than_year'; // Более года (≥365 дней)
    }
}

// Определение всех категорий сроков с названиями и цветами
$durationCategories = [
    'up_to_month' => [
        'label' => 'До 1 месяца',
        'color' => '#28a745' // Зелёный (0-13 дней)
    ],
    'less_than_month' => [
        'label' => 'Менее 1 месяца',
        'color' => '#6cbd45' // Светло-зелёный (14-29 дней)
    ],
    'more_than_month' => [
        'label' => 'Более 1 месяца',
        'color' => '#ffc107' // Жёлтый (30-59 дней)
    ],
    'more_than_2_months' => [
        'label' => 'Более 2 месяцев',
        'color' => '#ff9800' // Оранжевый (60-179 дней)
    ],
    'more_than_half_year' => [
        'label' => 'Более полугода',
        'color' => '#dc3545' // Красный (180-364 дня)
    ],
    'more_than_year' => [
        'label' => 'Более года',
        'color' => '#c82333' // Тёмно-красный (≥365 дней)
    ]
];

// Чтение параметра
$includeCarryoverTicketsByDuration = isset($body['includeCarryoverTicketsByDuration']) 
    ? (bool)$body['includeCarryoverTicketsByDuration'] 
    : false;

// Инициализация агрегации переходящих тикетов по срокам
$carryoverTicketsByDurationAgg = [];
foreach ($durationCategories as $category => $info) {
    $carryoverTicketsByDurationAgg[$category] = [
        'durationCategory' => $category,
        'durationLabel' => $info['label'],
        'color' => $info['color'],
        'count' => 0,
        'tickets' => []
    ];
}

// В цикле обработки переходящих тикетов
foreach ($carryoverTickets as $ticket) {
    if (isCarryoverTicket($ticket, $weekStart, $targetStages, $closingStages)) {
        $carryoverCount++;
        
        // Если нужно включить переходящие тикеты по срокам
        if ($includeCarryoverTicketsByDuration) {
            $createdTime = $ticket['createdTime'] ?? null;
            if ($createdTime) {
                $category = calculateDurationCategory($createdTime, $weekStart);
                
                if (isset($carryoverTicketsByDurationAgg[$category])) {
                    $carryoverTicketsByDurationAgg[$category]['count']++;
                    
                    // Если нужно включить тикеты, сохранить данные тикета
                    if ($includeTickets) {
                        $carryoverTicketsByDurationAgg[$category]['tickets'][] = [
                            'id' => (int)$ticket['id'],
                            'title' => $ticket['title'] ?? 'Без названия',
                            'createdTime' => $createdTime,
                            'stageId' => $ticket['stageId'] ?? null,
                            'assignedById' => $ticket['assignedById'] ?? null
                        ];
                    }
                }
            }
        }
    }
}

// В формировании ответа
$response = [
    'success' => true,
    'meta' => [ ... ],
    'data' => [
        'newTickets' => $newCount,
        'closedTickets' => $closedCount,
        'carryoverTickets' => $carryoverCount,
        'series' => [
            'new' => [$newCount],
            'closed' => [$closedCount],
            'carryover' => [$carryoverCount]
        ],
        // ... существующие поля ...
        'carryoverTicketsByDuration' => $includeCarryoverTicketsByDuration
            ? array_map(function ($item) use ($includeTickets) {
                $result = [
                    'durationCategory' => $item['durationCategory'],
                    'durationLabel' => $item['durationLabel'],
                    'color' => $item['color'],
                    'count' => $item['count']
                ];
                
                // Включить тикеты только если запрошено
                if ($includeTickets && isset($item['tickets'])) {
                    $result['tickets'] = $item['tickets'];
                }
                
                return $result;
            }, array_values($carryoverTicketsByDurationAgg))
            : null
    ]
];
```

## Критерии приёмки этапа

- [x] API принимает параметр `includeCarryoverTicketsByDuration` (опциональный, по умолчанию `false`)
- [x] При `includeCarryoverTicketsByDuration: false` API работает как раньше (обратная совместимость)
- [x] При `includeCarryoverTicketsByDuration: true` API возвращает `carryoverTicketsByDuration[]` с данными всех 6 категорий
- [x] Сроки рассчитываются корректно от `weekStartUtc` до `createdTime` каждого тикета
- [x] Тикеты распределяются по категориям согласно условиям:
  - [x] До 1 месяца: `duration < 14 дней` (0-13 дней)
  - [x] Менее 1 месяца: `14 ≤ duration < 30 дней` (14-29 дней)
  - [x] Более 1 месяца: `30 ≤ duration < 60 дней` (30-59 дней)
  - [x] Более 2 месяцев: `60 ≤ duration < 180 дней` (60-179 дней)
  - [x] Более полугода: `180 ≤ duration < 365 дней` (180-364 дня)
  - [x] Более года: `duration ≥ 365 дней` (≥365 дней)
- [x] Все 6 категорий включены в ответ (даже если count = 0)
- [x] В ответе включены `durationCategory`, `durationLabel`, `color`, `count` для каждой категории
- [x] При `includeTickets: true` включены `tickets[]` для каждой категории
- [x] Названия категорий соответствуют ожидаемым

## Дополнительные уточнения

### Производительность

- При `includeCarryoverTicketsByDuration: false` не группировать по срокам (экономия ресурсов)
- Использовать уже отфильтрованные переходящие тикеты из TASK-044-01
- Не делать дополнительных запросов к Bitrix24

### Обратная совместимость

- По умолчанию `includeCarryoverTicketsByDuration: false`
- Если параметр не передан, API работает как раньше
- Не ломать существующий функционал

### Точность расчёта сроков

- Все расчёты выполняются в UTC
- Использовать точную разницу в днях (не округление)
- Категории не пересекаются (каждый тикет попадает только в одну категорию)

## История правок

- 2025-12-16 11:01 (UTC+3, Брест): Создан этап 4 задачи TASK-044
- 2025-12-16 18:15 (UTC+3, Брест): Реализовано расширение API для градации переходящих тикетов по срокам
  - Добавлена функция `calculateDurationCategory()` для определения категории срока
  - Добавлен параметр `includeCarryoverTicketsByDuration` в API
  - Реализована группировка переходящих тикетов по 6 категориям сроков
  - Добавлен массив `carryoverTicketsByDuration[]` в ответ API
  - Все 6 категорий включены в ответ с названиями, цветами и количеством тикетов
  - Поддержка `includeTickets: true` для получения тикетов каждой категории
- 2025-12-16 18:45 (UTC+3, Брест): Добавлена 6-я категория «До 1 месяца» (0-13 дней)
  - Разделена первая категория на две: «До 1 месяца» (0-13 дней) и «Менее 1 месяца» (14-29 дней)
  - Обновлена функция `calculateDurationCategory()` для поддержки 6 категорий
  - Обновлён массив `$durationCategories` с новыми цветами

