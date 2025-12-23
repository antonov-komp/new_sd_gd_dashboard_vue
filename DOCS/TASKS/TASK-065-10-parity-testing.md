# TASK-065-10: Проверка функционального паритета и обратной совместимости

**Дата создания:** 2025-12-23 01:05 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Родитель:** TASK-065  
**Цель:** Подтвердить, что после рефакторинга контракт API, данные и поведение идентичны исходной версии. Обнаружить расхождения до выката.

## Область
- Сравнение ответов до/после на одинаковых входах (weeks и months) с разными флагами:
  - Базовый запрос (weeks, без include*, без debug).
  - weeks + includeCarryoverTickets + includeCarryoverTicketsByDuration.
  - weeks + includeNewTicketsByStages.
  - months режим (3+1 месяца) с includeCarryoverTickets.
  - forceRefresh=true (проверка кеш-байпаса).
  - debug=true (проверить структуру debug/carryoverDebug).
- Проверка кеша: hit/miss, время ответа, clearExpired (rand 1..10).
- Проверка логов: файл создаётся, префиксы сообщений сохраняются.
- Проверка стадиальных данных: `stages`, `stagesByWeek`, цвета/названия из Config сохранены.
- Проверка ответственных: `responsible`, `responsibleCreatedThisWeek`, `responsibleCreatedOtherWeek` (counts и tickets при includeTickets).
- Проверка deprecated: наличие `carryoverTicketsCreatedOtherWeek` и совпадение значений.

## Требования к тестам/сравнениям
- Использовать один и тот же бэкенд Bitrix24 (тестовый набор) и зафиксировать период (weekStartUtc/weekEndUtc для weeks, periodStart/End для months).
- Сравнивать JSON по ключам/значениям (deep equal), допускается разница в порядке полей, но не в значениях.
- Проверить суммы: carryoverThis+Prev+Older == carryover; closed == closedThis+closedOther; series длина == 4 (weeks) или == count(months/weeks).
- Проверить, что deprecated поля присутствуют (`carryoverTicketsCreatedOtherWeek`) и содержат те же значения.
- Кеш: замерить время для запроса с cache miss/hit; убедиться, что при forceRefresh пропуск кеша.
- Логи: убедиться, что создаётся файл `logs/app/graph-admission-closure-YYYY-MM-DD.log` и содержатся ключевые префиксы (PERIOD, QUERY, MONTHS, Cache, CARRYOVER, SERIES).
- includeTickets: при false — отсутствуют секции tickets внутри ответственных/стадий/дураций; при true — содержимое совпадает.
- carryoverByDuration: присутствует только если includeCarryoverTicketsByDuration=true; counts совпадают сумме категорий и carryover.
- months: previousPeriodData (4-й месяц) совпадает с baseline.

## План выполнения
1) Подготовить набор входных JSON (минимум 5 сценариев, см. выше) в `DOCS/ANALYSIS/graph-admission-closure-testcases.json` (или .md с примерами).
2) Снять эталонные ответы на текущей версии (до рефакторинга) и сохранить снапшоты (например, `DOCS/ANALYSIS/graph-admission-closure-baseline/`), маскируя чувствительные данные.
3) После переноса — повторить запросы, сравнить с baseline (скрипт/ручное сравнение jq).
4) Проверить логи и кеш:
   - Лог: наличие файла, ключевые строки.
   - Кеш: лог hit/miss, отсутствие изменений ключей.
5) Зафиксировать результаты и расхождения (если есть) в `graph-admission-closure-spec.md` или отдельном `parity-report.md`.

## Артефакты
- Набор тест-кейсов (inputs).
- Baseline ответы (до) и сравнение (после).
- Краткий отчет о паритете (pass/fail, найденные отличия).

## Критерии приёмки
- Все заявленные сценарии сравнения выполнены; ответы совпадают по ключам/значениям.
- Кеш и логи ведут себя как до рефакторинга (hit/miss, файлы, префиксы).
- Проверки сумм и длин series/arrays проходят.
- Задокументирован результат (parity-report).

## Риски и заметки
- Данные Bitrix24 могут меняться между замерами — фиксировать тестовый период и по возможности использовать стабилизированный стенд.
- Различия в порядке ключей не критичны, но значения должны совпадать.

