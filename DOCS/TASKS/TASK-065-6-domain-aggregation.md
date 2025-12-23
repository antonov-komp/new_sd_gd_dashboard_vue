# TASK-065-6: Доменная агрегация метрик (Aggregator)

**Дата создания:** 2025-12-23 00:40 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Родитель:** TASK-065  
**Цель:** Вынести бизнес-логику расчёта метрик недель/месяцев в `domain/Aggregator.php` (и вспомогательные структуры), сохранив поведение текущего эндпоинта.

## Область
- Логика, которую нужно изолировать от ввода/вывода и Bitrix:
  - `calculateWeekMetrics`: new/closed/carryover, разбивка closed по createdThisWeek/OtherWeek, carryover breakdown (this/prev/older + deprecated otherWeek), стадии по неделе.
  - Месячная агрегация: new/closed/carryover по месяцам и неделям внутри месяца, стадии, предыдущий период для процентов.
  - Разбивки по ответственным (responsible, responsibleCreatedThisWeek/OtherWeek), newTicketsByStages (если запрошено).
  - Формирование `series`, `weeksData`, `stagesByWeek`, итоговых полей currentWeek/currentMonth (поведение как сейчас).
- Без сетевых вызовов и кеша; вход — уже загруженные тикеты + конфиг + даты.
- Учитывать include-флаги:  
  - `includeTickets` — добавляет вложенные tickets в ответственных/стадиях/newTicketsByStages/carryoverByDuration.  
  - `includeNewTicketsByStages` — добавляет секцию newTicketsByStages с агрегацией по текущему stageId тикета.  
  - `includeCarryoverTicketsByDuration` — добавляет carryoverTicketsByDuration по категориям (up_to_month … more_than_year).  
  - `includeCarryoverTickets` — включает расчёт carryover/series carryover.  

## Требования к реализации
- Файл: `domain/Aggregator.php` (можно разбить на класс + вспомогательные функции/DTO).
- Вход: массив тикетов (как сейчас после фильтра product), конфиг (stages/duration/keeperId), периоды (weeks array, months array), флаги include*.
- Выход: структуры данных, совместимые с текущим ответом (data/series/weeksData/stagesByWeek/responsible/etc.).
- Сохранить существующие правила:
  - carryover sum check (this + prev + older == total);
  - closed: допускаем counted-closed при createdThisWeek без movedTime;
  - порядок недель: от старых к новым; currentWeek — последний.
  - durationCategory: те же пороги.
  - deprecated поля (carryoverTicketsCreatedOtherWeek) оставить для обратной совместимости.
- Логи: оставить возможность прокидывать debug (bool) и писать error_log внутри (как сейчас), но без чтения входа/выхода.
- Ответственные: нормализация `assignedById` (если массив — id/ID/value), keeperId → "Не назначен"/unassigned; агрегаты responsible, responsibleCreatedThisWeek, responsibleCreatedOtherWeek.
- Стадии: использовать allStages из Config для имен/цветов; если нет в map — оставить stageId как name.
- Тикеты для includeTickets: должны содержать id, title, createdTime, movedTime (для закрытых), stageId, assignedById.
- WeeksData/series: длина 4 для недельного режима, порядок синхронизирован с meta.weeks (старые→новые).

## План выполнения
1) Вытянуть из эндпоинта весь блок агрегации (недельный + месячный) в чистые функции:
   - `aggregateWeeks($tickets, $weeks, $config, $flags): array` — возвращает series, weeksData, currentWeekData, stagesByWeek, stageAgg, responsibleAgg, newTicketsByStages, carryover duration breakdown.
   - `aggregateMonths($tickets, $months, $previousMonth, $config, $flags): array` — new/closed/carryover by month/week, stages, previousPeriodData.
   - Внутренние помощники: normalizeResponsible, normalizeTags/productFilter (может остаться в сервисе), stage aggregation.
2) Определить структуры (можно без классов DTO, но с чёткими ключами).
3) Сохранить вычисления:
   - carryoverTicket detection (isCarryoverTicket) — вызывать из domain или util.
   - isInRange — из `DatePeriodHelper`.
   - durationCategory — из `DatePeriodHelper`.
4) Подготовить каркас файла с docblock: вход/выход, инварианты, ожидаемые ключи.
5) Обновить `graph-admission-closure-spec.md`: раздел “Aggregator” — какие функции, что возвращают.

## Артефакты
- Каркас `domain/Aggregator.php` с объявленными функциями/классами и docblock.
- Обновление `DOCS/ANALYSIS/graph-admission-closure-spec.md` по доменному слою.

## Критерии приёмки
- Все ветки агрегации (weeks, months, responsible, newTicketsByStages, carryover breakdown, stagesByWeek) перечислены и отражены в каркасе.
- Сохранены правила сумм, порядок недель, deprecated поля.
- Контракт выходных структур совместим с текущим API.

## Риски и заметки
- Высокая сложность carryover логики: важно не потерять категории previousWeek/older и проверки сумм.
- Разные режимы (weeks vs months) имеют различия в разбивках — описать явно.
- Новая точка отказа — нужно планировать юнит-тесты на агрегатор до выноса кода.

