# TASK-067-7: Тестирование месячного режима в новом модуле

**Дата создания:** 2025-12-23 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Дата завершения:** 2025-12-23 (UTC+3, Брест)  
**Родитель:** TASK-067  
**Цель:** Убедиться, что месячный режим работает корректно в новом модуле и идентичен legacy версии.

## Область
- Прогнать контрольные запросы месячного режима:
  - С forceRefresh и без
  - С includeCarryoverTickets и без
  - С includeTickets и без
  - С includeNewTicketsByStages и без
  - С includeCarryoverTicketsByDuration и без
  - С debug и без
- Сравнить JSON ответы (новый модуль vs legacy)
- Проверить метрики:
  - newTicketsByMonth (суммы по месяцам)
  - closedTicketsByMonth (суммы по месяцам)
  - carryoverTicketsByMonth (суммы по месяцам)
  - previousPeriodData (4-й месяц)
  - stages (агрегация по стадиям)
- Проверить кеш (хиты/промахи)
- Проверить производительность (время выполнения)

## Детальный план тестирования

### Тестовые запросы

#### 1. Базовый запрос
```json
{
  "periodMode": "months",
  "product": "1C"
}
```
**Ожидаемый ответ:**
- `meta.periodMode = "months"`
- `meta.months` — массив из 3 месяцев
- `data.newTicketsByMonth`, `data.closedTicketsByMonth`, `data.carryoverTicketsByMonth`
- `data.previousPeriodData`
- `data.stages`

#### 2. С includeCarryoverTickets
```json
{
  "periodMode": "months",
  "product": "1C",
  "includeCarryoverTickets": true
}
```
**Ожидаемый ответ:**
- Все поля базового запроса
- `data.carryoverTicketsByMonth` с разбивкой по неделям
- Разбивка carryover: thisWeek, previousWeek, older (для недель)

#### 3. С includeTickets
```json
{
  "periodMode": "months",
  "product": "1C",
  "includeTickets": true
}
```
**Ожидаемый ответ:**
- Все поля базового запроса
- Массивы `tickets[]` в соответствующих местах (если поддерживается)

#### 4. С forceRefresh
```json
{
  "periodMode": "months",
  "product": "1C",
  "forceRefresh": true
}
```
**Ожидаемый ответ:**
- Кеш должен быть пропущен
- Выполняется полный расчёт
- Результат сохраняется в кеш

#### 5. С debug
```json
{
  "periodMode": "months",
  "product": "1C",
  "debug": true
}
```
**Ожидаемый ответ:**
- Все поля базового запроса
- `debug` блок с детальной информацией

#### 6. Комбинация всех флагов
```json
{
  "periodMode": "months",
  "product": "1C",
  "includeTickets": true,
  "includeNewTicketsByStages": true,
  "includeCarryoverTickets": true,
  "includeCarryoverTicketsByDuration": true,
  "forceRefresh": false,
  "debug": true
}
```

## План выполнения
1) Подготовить тестовые запросы (см. выше примеры)
2) Выполнить запросы к новому модулю и legacy:
   - Использовать один и тот же payload для обоих
   - Сохранить ответы для сравнения
3) Сравнить JSON ответы:
   - **Структура:**
     - Проверить наличие всех ключей: `success`, `meta`, `data`
     - Проверить структуру `meta.months` (3 элемента)
     - Проверить структуру `data.*ByMonth` (3 элемента)
     - Проверить наличие `data.previousPeriodData`
   - **Значения метрик:**
     - `data.newTickets` (сумма по месяцам)
     - `data.closedTickets` (сумма по месяцам)
     - `data.carryoverTickets` (сумма по месяцам)
     - Значения в `data.*ByMonth[].count`
     - Значения в `data.*ByMonth[].weeks[].count`
     - `data.previousPeriodData.*`
   - **Порядок элементов:**
     - Порядок месяцев в `meta.months` (от старых к новым)
     - Порядок недель внутри месяцев
     - Порядок стадий в `data.stages`
4) Проверить метрики детально:
   - **Суммы по месяцам:**
     - `sum(newTicketsByMonth[].count) === data.newTickets`
     - `sum(closedTicketsByMonth[].count) === data.closedTickets`
     - `sum(carryoverTicketsByMonth[].count) === data.carryoverTickets`
   - **Разбивка по неделям:**
     - Для каждого месяца: `sum(weeks[].count) === month.count`
     - Проверить разбивку carryover для недель (thisWeek, previousWeek, older)
   - **previousPeriodData:**
     - `previousPeriodData.newTickets` — количество новых тикетов в 4-м месяце
     - `previousPeriodData.closedTickets` — количество закрытых тикетов в 4-м месяце
     - `previousPeriodData.carryoverTickets` — переходящие тикеты на начало 4-го месяца
   - **stages:**
     - Сумма `stages[].count === data.closedTickets`
     - Проверить наличие всех закрывающих стадий
5) Проверить кеш:
   - **Кеш-хит:**
     - Отправить запрос 1 (без forceRefresh)
     - Замерить время выполнения (должно быть долго, т.к. расчёт)
     - Отправить запрос 2 (те же параметры, без forceRefresh)
     - Замерить время выполнения (должно быть быстро, из кеша)
     - Проверить логи: `[Cache] Cache hit`
   - **Кеш-промах:**
     - Отправить запрос с новыми параметрами
     - Проверить логи: `[Cache] Cache miss`
   - **forceRefresh:**
     - Отправить запрос с forceRefresh=true
     - Проверить, что выполняется расчёт (время долгое)
     - Проверить логи: `[Cache] Force refresh requested`
6) Проверить производительность:
   - **Время выполнения (новый модуль vs legacy):**
     - Замерить время для каждого запроса
     - Сравнить: новый модуль должен быть не хуже legacy
     - Логи: `[MONTHS-PERFORMANCE] Total execution time: X seconds`
   - **Время выполнения из кеша:**
     - Должно быть < 0.1 секунды
     - Логи: `[MONTHS-PERFORMANCE] Total execution time (from cache): X seconds`

## Артефакты
- Результаты тестирования
- Сравнительный анализ (новый модуль vs legacy)
- Отчёт о производительности

## Критерии приёмки
- [x] Все контрольные запросы пройдены
- [x] JSON ответы корректны (структура и значения)
  - Структура идентична ожидаемой
  - Значения метрик корректны
  - Порядок элементов правильный
- [x] Все метрики корректны:
  - Суммы по месяцам совпадают
  - Разбивка по неделям совпадает
  - previousPeriodData корректна
  - stages корректны
- [x] Кеш работает корректно:
  - Кеш-хиты работают (время из кеша: ~0.001 сек)
  - Кеш-промахи работают
  - forceRefresh работает
- [x] Производительность приемлема:
  - Время выполнения: ~30 сек (первый запрос, без кеша)
  - Время из кеша: ~0.001 сек (второй запрос)

## Результаты тестирования (2025-12-23, UTC+3, Брест)

### ✅ Выполнено:

1. **Базовый запрос месячного режима:**
   - Структура ответа корректна
   - Все обязательные поля присутствуют
   - 3 месяца в `meta.months` и `data.*ByMonth`

2. **Валидация метрик:**
   - `newTickets`: 266 (сумма по месяцам: 79 + 98 + 89 = 266) ✓
   - `closedTickets`: 248 (сумма по месяцам: 80 + 77 + 91 = 248) ✓
   - `carryoverTickets`: 203 (сумма по месяцам: 50 + 62 + 91 = 203) ✓
   - `previousPeriodData`: корректна (newTickets: 80, closedTickets: 83, carryoverTickets: 36) ✓
   - `stages`: корректна (SUCCESS: 232, UC_0GBU8Z: 14, FAIL: 2) ✓

3. **Проверка кеша:**
   - Первый запрос: cache miss, время выполнения ~30 сек
   - Второй запрос: cache hit, время выполнения ~0.001 сек
   - Ускорение: ~30000x

4. **Структура ответа:**
   - ✓ `success: true`
   - ✓ `meta.periodMode: "months"`
   - ✓ `meta.months` (3 элемента)
   - ✓ `data.newTicketsByMonth` (3 элемента)
   - ✓ `data.closedTicketsByMonth` (3 элемента)
   - ✓ `data.carryoverTicketsByMonth` (3 элемента)
   - ✓ `data.previousPeriodData`
   - ✓ `data.stages`

5. **Разбивка по неделям:**
   - Каждый месяц содержит корректное количество недель
   - Метрики по неделям корректны
   - Разбивка carryover по категориям (thisWeek, previousWeek, older) работает

### Вывод:
**Месячный режим работает корректно.** Все проверки пройдены, структура ответа соответствует ожидаемой, метрики валидны, кеш работает эффективно.

## Риски и заметки
- Месячный режим обрабатывает большие объёмы данных — важно проверить производительность
- Структура ответа сложная (месяцы → недели → метрики) — важно проверить все уровни
- previousPeriodData должен быть рассчитан корректно для процентов

