# Graph Admission/Closure API — контракт (TASK-065)

**Дата:** 2025-12-23 00:00 (UTC+3, Брест)  
**Эндпоинт:** `api/graph-1c-admission-closure.php` (legacy прокси) → `api/graph-admission-closure/bootstrap.php` (новый модуль)  
**Назначение:** график приёма/закрытий сектора 1С с метриками за недели/месяцы. Контракт сохраняется без изменений.  
**Статус рефакторинга:** Недельный режим (`periodMode=weeks`) перенесён в новый модуль (2025-12-23). Месячный режим (`periodMode=months`) остаётся в legacy до переноса.

## Входные параметры (JSON body)
- `product` — строка, по умолчанию `"1C"`. Фильтр применяется первым шагом по `UF_CRM_7_TYPE_PRODUCT` (нормализация к верхнему регистру и символу `C`).
- `weekStartUtc`, `weekEndUtc` — ISO строки. Если не заданы и `periodMode=weeks`, берутся границы текущей ISO недели (UTC, пн-вс).
- `periodMode` — `"weeks"` (дефолт) | `"months"`. Невалидные значения → `400`.
- `includeTickets` — `bool`, дефолт `false`. Добавляет массивы тикетов в агрегаты сотрудников/стадий/длительности.
- `includeNewTicketsByStages` — `bool`, дефолт `false`. Включает блок `data.newTicketsByStages`.
- `includeCarryoverTickets` — `bool`, дефолт `false` (weeks). Добавляет поля `carryover*` и серию.
- `includeCarryoverTicketsByDuration` — `bool`, дефолт `false`. Включает разрез по длительности.
- `forceRefresh` — `bool`, дефолт `false`. Для режима months пропускает кеш.
- `debug` — `bool`, дефолт `false`. Добавляет блок `debug` и расширенное логирование.

## Выход: режим `weeks` (по умолчанию)
- `success: true|false`.
- `meta`: `weekNumber`, `weekStartUtc`, `weekEndUtc`, `currentWeek` (дублирует), `weeks` (4 недели: старые→новые).
- `data`:
  - Счётчики текущей недели: `newTickets`, `closedTickets`, `closedTicketsCreatedThisWeek`, `closedTicketsCreatedOtherWeek`.
  - `series`: массивы по 4 неделям для `new`, `closed`, `closedCreatedThisWeek`, `closedCreatedOtherWeek`, `carryover`, `carryoverCreatedThisWeek`, `carryoverCreatedPreviousWeek`, `carryoverCreatedOlder`, `carryoverCreatedOtherWeek` (deprecated).
  - `weeksData`: метрики по неделям (поля как в series + `stages`).
  - `currentWeek`: дубль последних значений `weeksData`.
  - `stagesByWeek`: разбивка закрытий по стадиям (синхронизировано с `meta.weeks`).
  - `stages`: агрегат стадий текущей недели (обратная совместимость).
  - `responsible`: агрегат закрытий по сотрудникам; `responsibleCreatedThisWeek`, `responsibleCreatedOtherWeek` (с тикетами при `includeTickets=true`).
  - `newTicketsByStages`: при флаге — счётчики новых тикетов по стадиям (с цветами).
  - `carryover*` поля добавляются, если `includeCarryoverTickets=true`: общий и разбивка this/previous/older + deprecated otherWeek.
  - `carryoverTicketsByDuration`: при флаге — разрез по длительности (категории ниже).
- `carryoverDebug`: всегда присутствует, дублирует суммы/серии carryover.
- `debug`: при `debug=true` добавляет `fetchedTotal`, `sample`, `stageCounts`, `carryoverBreakdown`, `params`.

## Выход: режим `months`
- `meta`: `periodMode="months"`, `periodStartUtc`, `periodEndUtc` (4 месяца), `months` (последние 3 месяца с неделями).
- `data`:
  - `newTickets`, `newTicketsByMonth` (месяц + недели).
  - `closedTickets`, `closedTicketsByMonth` (с разбивкой createdThisWeek/OtherWeek по неделям).
  - `carryoverTickets`, `carryoverTicketsByMonth` (с разбивкой createdThisWeek/OtherWeek по неделям).
  - `stages`: агрегат по стадиям.
  - `responsible`: пока пустой массив (заглушка).
  - `previousPeriodData`: метрики 4-го (самого старого) месяца для процентов (`newTickets`, `closedTickets`, `carryoverTickets`).
- Кеш: файловый `GraphAdmissionClosureCache` (TTL 300s, ключ через нормализованные флаги, директория `api/cache/graph-admission-closure/months`). `forceRefresh=true` пропускает кеш.

## Конфигурация/константы (хардкоды в legacy)
- Entity: `entityTypeId=140`, `pageSize=50`.
- Keeper: `keeperId=1051` (используется при агрегации ответственных).
- Рабочие стадии (`targetStages`): `DT140_12:UC_0VHWE2`, `DT140_12:PREPARATION`, `DT140_12:CLIENT`.
- Закрывающие стадии (`closingStages`): `DT140_12:SUCCESS`, `DT140_12:FAIL`, `DT140_12:UC_0GBU8Z`.
- Стадии с цветами/именами:
  - `UC_0VHWE2` — «Сформировано обращение» `#007bff`
  - `PREPARATION` — «Рассмотрение ТЗ» `#ffc107`
  - `CLIENT` — «Исполнение» `#28a745`
  - `SUCCESS` — «Успешное закрытие» `#28a745`
  - `FAIL` — «Отклонено» `#dc3545`
  - `UC_0GBU8Z` — «Закрыли без задачи» `#6c757d`
- Категории длительности (для carryover, цвета):
  - `up_to_month` (0-13д) `#28a745`
  - `less_than_month` (14-29д) `#6cbd45`
  - `more_than_month` (30-59д) `#ffc107`
  - `more_than_2_months` (60-179д) `#ff9800`
  - `more_than_half_year` (180-364д) `#dc3545`
  - `more_than_year` (365+) `#c82333`

## Потоки данных (legacy)
1) Парсинг входа → валидация `periodMode`.  
2) Для `months`: кеш → расчёт 4 месяцев → запросы Bitrix24 (CRest) с пагинацией/параллелизмом → агрегация по месяцам + previousPeriod → ответ/кеш.  
3) Для `weeks`: определение 4 недель → загрузка тикетов (CRest, async, фильтр product=1C) → агрегация недель/стадий/ответственных/длительности → формирование `series`, `weeksData`, `currentWeek` → ответ.  
4) Логирование: `logs/app/graph-admission-closure-YYYY-MM-DD.log`, детальные `error_log`, carryover debug всегда включён.

## Зависимости
- `api/crest.php` (`CRest`), `api/cache/GraphAdmissionClosureCache.php`.
- PHP DateTimeImmutable/DateTimeZone; JSON input/output.
- Нормализация дат — строго UTC.

## Ограничения/риски
- Большой монолит (~2800 строк) — требуется декомпозиция без изменения контракта.
- Сохранить параллельные запросы к Bitrix24 и обработку `expired_token`.
- Время выполнения не должно увеличиться; кеш только для режима `months`.

## План слоёв (целевой модуль `api/graph-admission-closure/`)
- `bootstrap.php` (входная точка) → `controller/` (парсинг/ответ) → `service/GraphAdmissionClosureService` (оркестрация, кеш) → `bitrix/BitrixClient` (CRest, пагинация, параллельные запросы) → `domain/Aggregator` (чистые расчёты) → `cache/CacheStore` → `config/Config` → `util/DatePeriodHelper`.

