# TASK-065-7: Сервисный слой orchestration (`service/GraphAdmissionClosureService.php`)

**Дата создания:** 2025-12-23 00:48 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Родитель:** TASK-065  
**Цель:** Собрать единый сервис, который валидирует вход, выбирает режим (weeks/months), дергает BitrixClient, агрегатор, кеш, формирует финальный ответ, сохраняя контракт API.

## Область
- Вход: тело запроса (массив), флаги (`periodMode`, `includeTickets`, `includeNewTicketsByStages`, `includeCarryoverTickets`, `includeCarryoverTicketsByDuration`, `forceRefresh`, `debug`), опциональные даты `weekStartUtc/weekEndUtc`.
- Зависимости: Config (стадии, цвета, keeperId, pageSize, entityTypeId, durationCategories), DatePeriodHelper (периоды), BitrixClient (загрузка тикетов), Aggregator (метрики), CacheStore (GraphAdmissionClosureCache), ResponseHelper (формирование ответа/ошибок).
- Поведение: идентично текущему эндпоинту — те же ключи meta/data/debug/carryoverDebug, те же дефолты и проверки.
- Параметры include*:  
  - `includeTickets` → вложенные tickets в ответственных/стадиях/newTicketsByStages/carryoverByDuration;  
  - `includeNewTicketsByStages` → секция newTicketsByStages;  
  - `includeCarryoverTickets` → расчёт carryover (series, breakdown);  
  - `includeCarryoverTicketsByDuration` → секция carryoverTicketsByDuration (если includeCarryoverTickets=true).  

## Требования к реализации
- Файл: `service/GraphAdmissionClosureService.php`.
- Публичный метод: `handle(array $body): array` (может выбрасывать Exception на ошибки).
- Шаги:
  1) Валидация/установка дефолтов параметров (periodMode, include*, forceRefresh, debug).
  2) Разветвление по режиму:
     - weeks: расчёт 4 недель (`getFourWeeksBounds`), период для запросов (firstWeekStart..lastWeekEnd).
     - months: расчёт 4 месяцев (`calculateLastFourMonths`), выбор 3 для вывода + 4-й для процентов, период Start/End.
  3) Кеш: generateKey по набору параметров; если `forceRefresh=false` — попытка чтения, при попадании — вернуть.
  4) Загрузка тикетов: через BitrixClient (created/closed/carryover), merge картой по id.
  5) Фильтр product=1C (первым шагом), нормализация тегов как сейчас.
  6) Агрегация:
     - weeks: Aggregator.aggregateWeeks(...) с флагами include*.
     - months: Aggregator.aggregateMonths(...) + previousPeriodData.
  7) Формирование ответа: meta (периоды, weeks/months), data (new/closed/carryover, series, stages, responsible, etc.), carryoverDebug (как сейчас).
  8) Кеширование результата (TTL из Config) + периодическая очистка (rand 1..10, как в исходнике).
- Логи: сохранить текущие сообщения и точки (PERIOD, QUERY, MONTHS, Cache, CARRYOVER) — можно делегировать в сервис, но не менять текст/уровень.
- Ошибки: 400 при invalid periodMode, 500 при исключениях.
- Ответственные: в ответ включать поля responsible/responsibleCreatedThisWeek/responsibleCreatedOtherWeek; если includeTickets=false — без массива tickets.
- Стадии: data.stages (агрегат текущей недели), data.stagesByWeek (на каждую из 4 недель).
- Debug: при debug=true — включать debug и carryoverDebug, как сейчас (fetchedTotal, sample, stageCounts, carryoverBreakdown).

## План выполнения
1) Описать интерфейс сервиса и входные/выходные структуры (в комментарии).
2) Прописать последовательность шагов (валидация → период → кеш → загрузка → фильтр → агрегация → ответ → кеш-сохранение).
3) Зафиксировать используемые функции/классы (Config, DatePeriodHelper, BitrixClient, Aggregator, CacheStore).
4) Подготовить каркас файла с пустыми методами/сигнатурами (без изменения логики пока).
5) Обновить `graph-admission-closure-spec.md`: раздел “Service orchestration” — кратко шаги и зависимости.

## Артефакты
- Каркас `service/GraphAdmissionClosureService.php` с публичным `handle(array $body): array`.
- Обновление `DOCS/ANALYSIS/graph-admission-closure-spec.md` (раздел сервиса).

## Критерии приёмки
- Описаны все шаги потока и зависимости; сохранён существующий контракт ответа.
- Каркас готов, без изменения боевой логики.
- Чётко указаны дефолты/валидация/ветки режимов/кеш/загрузка/агрегация/ответ.

## Риски и заметки
- Важно не потерять промежуточные флаги (`includeCarryoverTicketsByDuration`, `includeNewTicketsByStages`, `forceRefresh`).
- Суммарная структура ответа (series, weeksData, stagesByWeek, responsible...) должна остаться byte-to-byte эквивалентной после внедрения.

