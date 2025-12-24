# TASK-067-1: Анализ месячного режима и фиксация контракта

**Дата создания:** 2025-12-23 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Родитель:** TASK-067  
**Цель:** Зафиксировать контракт месячного режима (входные параметры и формат ответа) для обеспечения обратной совместимости при переносе в новый модуль.

## Область
- Проанализировать входные параметры месячного режима (совпадают с недельным режимом)
- Зафиксировать структуру ответа месячного режима:
  - `meta.periodMode = "months"`
  - `meta.months` — массив из 3 месяцев с неделями внутри каждого
  - `meta.periodStartUtc`, `meta.periodEndUtc` — границы периода (4 месяца)
  - `data.newTicketsByMonth`, `data.closedTicketsByMonth`, `data.carryoverTicketsByMonth` — массивы с метриками по месяцам
  - `data.previousPeriodData` — данные 4-го месяца для расчёта процентов (TASK-058-01)
  - `data.stages` — агрегация по стадиям закрытия
  - `data.responsible` — агрегация по ответственным (пока пустой массив, TODO)
- Зафиксировать особенности месячного режима:
  - Загрузка 4 месяцев (3 для отображения + 1 для расчёта процентов)
  - Параллельные запросы к Bitrix24 для первых страниц (TASK-059-03)
  - Объединённая агрегация в один цикл по тикетам (TASK-059-02)
  - Кеширование с TTL 300 секунд
  - Оптимизация запроса переходящих тикетов с фильтром по createdTime (TASK-059-01)

## Детальная структура ответа

### meta.months (массив из 3 месяцев)
```php
[
    [
        'monthNumber' => 10,           // int: 1-12
        'monthName' => 'Октябрь',      // string: русское название
        'year' => 2025,                // int
        'monthStartUtc' => '2025-10-01T00:00:00Z',  // ISO-8601
        'monthEndUtc' => '2025-10-31T23:59:59Z',    // ISO-8601
        'weeks' => [                   // массив недель внутри месяца
            [
                'weekNumber' => 40,
                'weekStartUtc' => '2025-09-29T00:00:00Z',
                'weekEndUtc' => '2025-10-05T23:59:59Z'
            ],
            // ... остальные недели
        ]
    ],
    // ... ещё 2 месяца (Ноябрь, Декабрь)
]
```

### data.newTicketsByMonth
```php
[
    [
        'month' => 10,
        'monthName' => 'Октябрь',
        'count' => 45,                  // int: новых тикетов за месяц
        'weeks' => [                    // разбивка по неделям
            [
                'weekNumber' => 40,
                'count' => 12
            ],
            // ... остальные недели
        ]
    ],
    // ... остальные месяцы
]
```

### data.closedTicketsByMonth
```php
[
    [
        'month' => 10,
        'monthName' => 'Октябрь',
        'count' => 38,                   // int: закрытых тикетов за месяц
        'closedCreatedThisWeek' => 25,   // int: закрытых, созданных в этом месяце
        'closedCreatedOtherWeek' => 13,  // int: закрытых, созданных ранее
        'weeks' => [
            [
                'weekNumber' => 40,
                'count' => 10,
                'closedCreatedThisWeek' => 7,
                'closedCreatedOtherWeek' => 3
            ],
            // ... остальные недели
        ]
    ],
    // ... остальные месяцы
]
```

### data.carryoverTicketsByMonth
```php
[
    [
        'month' => 10,
        'monthName' => 'Октябрь',
        'count' => 90,                   // int: переходящих тикетов на конец месяца
        'carryoverCreatedThisWeek' => 15, // int: созданных в этом месяце
        'carryoverCreatedOtherWeek' => 75, // int: созданных ранее (DEPRECATED)
        'weeks' => [
            [
                'weekNumber' => 40,
                'count' => 88,
                'carryoverCreatedThisWeek' => 9,
                'carryoverCreatedPreviousWeek' => 3,  // TASK-063: НОВОЕ
                'carryoverCreatedOlder' => 76,       // TASK-063: НОВОЕ
                'carryoverCreatedOtherWeek' => 79    // TASK-063: DEPRECATED
            ],
            // ... остальные недели
        ]
    ],
    // ... остальные месяцы
]
```

### data.previousPeriodData (4-й месяц для процентов)
```php
[
    'newTickets' => 42,        // int: новых тикетов в 4-м месяце
    'closedTickets' => 35,     // int: закрытых тикетов в 4-м месяце
    'carryoverTickets' => 80    // int: переходящих тикетов на начало 4-го месяца
]
```

### data.stages (агрегация по стадиям закрытия)
```php
[
    [
        'stageId' => 'DT140_12:SUCCESS',
        'stageName' => 'Успешное закрытие',
        'count' => 25
    ],
    [
        'stageId' => 'DT140_12:FAIL',
        'stageName' => 'Отклонено',
        'count' => 10
    ],
    [
        'stageId' => 'DT140_12:UC_0GBU8Z',
        'stageName' => 'Закрыли без задачи',
        'count' => 3
    ]
]
```

## План выполнения
1) Прочитать код месячного режима в `api/graph-1c-admission-closure.php` (строки 670-1693)
2) Выписать структуру ответа (см. выше детальные примеры)
3) Зафиксировать особенности реализации:
   - **Логика расчёта 4 месяцев:**
     - `calculateLastFourMonths()` возвращает массив из 4 месяцев
     - Индекс 0 = самый старый месяц (4-й, для процентов)
     - Индексы 1-3 = последние 3 месяца (для отображения)
     - Каждый месяц содержит `weeks[]` через `calculateWeeksInMonth()`
   - **Параллельные запросы:**
     - `executeParallelQueries()` выполняет первые страницы created и closed тикетов параллельно
     - Fallback на последовательные запросы при ошибках
     - Поддержка webhook и OAuth (проверка expires_at, обновление токена)
   - **Объединённая агрегация (TASK-059-02):**
     - Один цикл `foreach ($tickets as $ticket)` для всех месяцев и недель
     - Инициализация структуры `$monthMetrics[monthNumber][weekNumber]` перед циклом
     - Для каждого тикета проверка всех месяцев и всех недель внутри месяцев
     - Логирование времени агрегации: `[MONTHS-AGGREGATION]`
   - **Кеш:**
     - Ключ включает: product, periodMode, includeTickets, includeNewTicketsByStages, includeCarryoverTickets, includeCarryoverTicketsByDuration
     - TTL: 300 секунд (5 минут)
     - Периодическая очистка: каждый 10-й запрос вызывает `clearExpired()`
4) Зафиксировать логику агрегации:
   - Для месяцев: проверка `isInRange($createdTime, $monthStart, $monthEnd)`
   - Для недель внутри месяцев: проверка `isInRange($createdTime, $weekStart, $weekEnd)`
   - Закрытые тикеты: `isInRange($movedTime, ...)` + проверка `stageId in closingStages`
   - Переходящие тикеты: `isCarryoverTicket($ticket, $weekEnd, $weekEnd, ...)` для недель
   - Разбивка carryover для недель: thisWeek, previousWeek (ISO-8601), older
5) Обновить спецификацию:
   - Добавить раздел "Months Mode" в `DOCS/ANALYSIS/graph-admission-closure-spec.md`
   - Описать структуру ответа с примерами
   - Описать особенности реализации (параллельные запросы, объединённая агрегация)
   - Добавить примеры запросов/ответов

## Артефакты
- Обновлённая `DOCS/ANALYSIS/graph-admission-closure-spec.md` (раздел months mode)
- Примеры запросов/ответов месячного режима (минимум один с includeCarryoverTickets)

## Критерии приёмки
- [ ] Контракт месячного режима задокументирован в spec.md
- [ ] Все особенности месячного режима зафиксированы
- [ ] Структура ответа полностью описана
- [ ] Примеры запросов/ответов добавлены
- [ ] Никаких изменений в коде не внесено

## Риски и заметки
- Месячный режим имеет сложную структуру ответа (месяцы → недели → метрики)
- Важно не пропустить previousPeriodData (4-й месяц для процентов)
- Параллельные запросы и объединённая агрегация — ключевые оптимизации, которые нужно сохранить

