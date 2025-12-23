# TASK-067-4: Расширение Aggregator для месячной агрегации

**Дата создания:** 2025-12-23 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Родитель:** TASK-067  
**Цель:** Добавить методы агрегации для месячного режима в `domain/Aggregator.php`.

## Область
- Добавить метод `aggregateMonths(array $months, array $tickets, array $targetStages, array $closingStages, int $keeperId, bool $debug): array`
  - Агрегация метрик по месяцам и неделям внутри месяцев
  - Объединённая агрегация в один цикл по тикетам (TASK-059-02)
  - Разбивка carryover по категориям (this/prev/older) для недель внутри месяцев
  - Агрегация по стадиям закрытия
- Добавить метод `calculatePreviousPeriodData(array $previousMonth, array $tickets, array $targetStages, array $closingStages, int $keeperId): array`
  - Расчёт данных 4-го месяца для процентов (TASK-058-01)
  - newTickets, closedTickets, carryoverTickets
- Использовать существующие методы `calculateWeekMetrics()` и `isCarryoverTicket()`
- Сохранить логику разбивки по стадиям

## Требования к реализации
- Файл: `api/graph-admission-closure/domain/Aggregator.php`
- Метод `aggregateMonths()`:
  ```php
  public function aggregateMonths(
      array $months,
      array $tickets,
      array $targetStages,
      array $closingStages,
      int $keeperId,
      bool $debug = false
  ): array
  ```
  - Параметры:
    - `$months` — массив из 3 месяцев (для отображения, индексы 1-3 из calculateLastFourMonths)
    - `$tickets` — массив всех тикетов (после фильтрации по product)
    - `$targetStages` — рабочие стадии
    - `$closingStages` — закрывающие стадии
    - `$keeperId` — ID хранителя (1051)
    - `$debug` — флаг отладки
  - Возвращает структуру:
    ```php
    [
        'monthMetrics' => [
            monthNumber => [
                'newTickets' => int,
                'closedTickets' => int,
                'closedTicketsCreatedThisWeek' => int,
                'closedTicketsCreatedOtherWeek' => int,
                'carryoverTickets' => int,
                'carryoverTicketsCreatedThisWeek' => int,
                'carryoverTicketsCreatedPreviousWeek' => int,
                'carryoverTicketsCreatedOlder' => int,
                'carryoverTicketsCreatedOtherWeek' => int, // DEPRECATED
                'weeks' => [
                    weekNumber => [
                        'newTickets' => int,
                        'closedTickets' => int,
                        'closedTicketsCreatedThisWeek' => int,
                        'closedTicketsCreatedOtherWeek' => int,
                        'carryoverTickets' => int,
                        'carryoverTicketsCreatedThisWeek' => int,
                        'carryoverTicketsCreatedPreviousWeek' => int,
                        'carryoverTicketsCreatedOlder' => int,
                        'carryoverTicketsCreatedOtherWeek' => int // DEPRECATED
                    ]
                ]
            ]
        ],
        'stageAgg' => [
            stageId => count
        ]
    ]
    ```
  - Логика объединённой агрегации (TASK-059-02):
    1. Инициализация структуры `$monthMetrics` для всех месяцев и недель (перед циклом)
    2. Один цикл `foreach ($tickets as $ticket)` для всех тикетов
    3. Для каждого тикета:
       - Вложенный цикл по месяцам
       - Вложенный цикл по неделям внутри месяца
       - Проверка дат через `isInRange()` (из DatePeriodHelper)
       - Для недель: использование логики из `calculateWeekMetrics()` (но без вызова метода, inline)
    4. Разбивка carryover для недель:
       - thisWeek: `isInRange($createdTime, $weekStart, $weekEnd)`
       - previousWeek: расчёт предыдущей ISO-8601 недели, проверка `isInRange($createdTime, $prevWeekStart, $prevWeekEnd)`
       - older: остальные (не thisWeek и не previousWeek)
    5. Агрегация по стадиям: только для закрытых тикетов (`stageId in closingStages`)
  - Логирование: `[MONTHS-AGGREGATION]` (время выполнения, количество тикетов)
- Метод `calculatePreviousPeriodData()`:
  ```php
  public function calculatePreviousPeriodData(
      array $previousMonth,
      array $tickets,
      array $targetStages,
      array $closingStages,
      int $keeperId
  ): array
  ```
  - Параметры:
    - `$previousMonth` — 4-й месяц (индекс 0 из calculateLastFourMonths)
    - `$tickets` — массив всех тикетов
    - `$targetStages`, `$closingStages`, `$keeperId` — как в aggregateMonths
  - Возвращает:
    ```php
    [
        'newTickets' => int,        // тикеты, созданные в 4-м месяце
        'closedTickets' => int,     // тикеты, закрытые в 4-м месяце
        'carryoverTickets' => int  // переходящие тикеты на начало 4-го месяца
    ]
    ```
  - Логика:
    - newTickets: `isInRange($createdTime, $previousMonthStart, $previousMonthEnd)`
    - closedTickets: `isInRange($movedTime, $previousMonthStart, $previousMonthEnd)` + `stageId in closingStages`
    - carryoverTickets: `isCarryoverTicket($ticket, $previousMonthStart, $previousMonthStart, ...)`

## План выполнения
1) Прочитать код месячной агрегации из legacy файла:
   - Инициализация структуры: строки 1258-1296
   - Объединённый цикл агрегации: строки 1298-1439
   - Формирование ответа: строки 1444-1538
   - previousPeriodData: строки 1540-1613
2) Проанализировать логику:
   - Инициализация `$monthMetrics[monthNumber][weekNumber]` перед циклом
   - Вложенные циклы: тикеты → месяцы → недели
   - Проверки дат через `isInRange()`
   - Логика закрытых тикетов для недель (строки 1366-1390)
   - Логика переходящих тикетов для недель (строки 1392-1436)
3) Добавить методы в Aggregator:
   - `aggregateMonths()` — основная агрегация
     - Инициализация структуры данных
     - Объединённый цикл по тикетам
     - Вложенные циклы по месяцам и неделям
     - Использование `$this->dateHelper->isInRange()` для проверки дат
     - Использование `$this->isCarryoverTicket()` для переходящих тикетов
     - Расчёт предыдущей недели для разбивки carryover (ISO-8601)
   - `calculatePreviousPeriodData()` — данные 4-го месяца
     - Простой цикл по тикетам
     - Проверки через `isInRange()` и `isCarryoverTicket()`
4) Использовать существующие методы:
   - `$this->dateHelper->isInRange()` — из DatePeriodHelper
   - `$this->isCarryoverTicket()` — уже есть в Aggregator
   - Логику из `calculateWeekMetrics()` — но inline для недель внутри месяцев
5) Сохранить оптимизации:
   - Объединённая агрегация (один цикл по тикетам)
   - Инициализация структуры перед циклом
   - Логирование времени выполнения
6) Протестировать на реальных данных:
   - Проверить корректность метрик по месяцам
   - Проверить корректность метрик по неделям внутри месяцев
   - Проверить разбивку carryover (thisWeek, previousWeek, older)
   - Проверить previousPeriodData

## Артефакты
- Обновлённый `api/graph-admission-closure/domain/Aggregator.php`

## Критерии приёмки
- [ ] aggregateMonths() реализован
- [ ] calculatePreviousPeriodData() реализован
- [ ] Объединённая агрегация работает (один цикл)
- [ ] Разбивка carryover по категориям работает для недель
- [ ] Агрегация по стадиям работает
- [ ] Используются существующие методы (calculateWeekMetrics, isCarryoverTicket)
- [ ] Логика идентична legacy коду
- [ ] Все метрики корректно агрегируются

## Риски и заметки
- Объединённая агрегация (один цикл) — ключевая оптимизация TASK-059-02, нужно сохранить
- Важно правильно обрабатывать недели внутри месяцев (ISO-8601 недели могут выходить за границы месяца)
- Разбивка carryover по категориям для недель внутри месяцев должна быть консистентна с недельным режимом

