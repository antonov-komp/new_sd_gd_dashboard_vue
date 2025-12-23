# TASK-065-1: Инвентаризация и фиксация контракта `graph-1c-admission-closure`

**Дата создания:** 2025-12-23 00:10 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Родитель:** TASK-065  
**Цель:** Зафиксировать текущий контракт API и зависимости эндпоинта `api/graph-1c-admission-closure.php` до начала разбиения на слои. Ничего в коде не меняем.

## Область
- Описать входные параметры (тело/заголовки/дефолты), режимы (`weeks`/`months`), флаги (`include*`, `forceRefresh`, `debug`).
- Описать выход (meta/data/debug/carryoverDebug), ключи series/weeksData/stagesByWeek/responsible.
- Зафиксировать хардкоды: стадии, цвета, `keeperId`, `pageSize`, категории длительности, product=1C.
- Зафиксировать кеш и логи: ключи, TTL, события hit/miss, файлы логов и формат сообщений.
- Зависимости: `CRest`, `GraphAdmissionClosureCache`, `crest.php`, файловая структура `logs/app`.
- Уточнить объёмные флаги: `includeTickets` (добавляет массивы tickets в ответственные/стадии/newTicketsByStages/carryoverByDuration), `includeNewTicketsByStages`, `includeCarryoverTicketsByDuration`, `includeCarryoverTickets`.
- Уточнить поведение forceRefresh: пропуск кеша, но сохранение результата после выполнения.

## Артефакты
- `DOCS/ANALYSIS/graph-admission-closure-spec.md` — текстовое описание контракта и зависимостей (по факту кода).
- Примеры запросов/ответов (минимум по одному для `weeks` и `months`, с включённым `includeCarryoverTickets` и `debug=false`).
- Список известных побочных эффектов: запись логов, создание каталога логов.

## План выполнения
1) Прочитать текущий файл `api/graph-1c-admission-closure.php` и выписать:
   - Вход: структура JSON, поля, дефолты, валидации/ошибки (400 при invalid periodMode, 500 при исключении).
   - Выход: структура meta/data/debug/carryoverDebug, названия ключей и вложенных полей, типы значений.
   - Режимы: отличия weeks vs months (какие массивы, какие метадаты).
   - Флаги: как влияют на включение секций ответа (tickets в ответственных/стадиях/дурациях, carryover series, newTicketsByStages).
2) Зафиксировать хардкоды и параметры:
   - Стадии target/closing, их цвета/названия.
   - `keeperId`, `pageSize`, product фильтр (`1C`, нормализация метки).
   - Duration categories (up_to_month … more_than_year).
   - entityTypeId = 140, TTL кеша 300, pageSize 50, timezone UTC, ISO-недели.
3) Зафиксировать интеграции:
   - Вызовы Bitrix24: методы, фильтры, select, пагинация, параллельные запросы, fallback при ошибках/expired_token.
   - Кеш: `GraphAdmissionClosureCache::generateKey/set/get/clearExpired`, TTL 300, ключевые параметры, логика forceRefresh.
   - Логи: путь `logs/app/graph-admission-closure-YYYY-MM-DD.log`, сообщения (PERIOD, QUERY, CARRYOVER, SERIES, MONTHS, Cache).
   - Ответственные: агрегации `responsible`, `responsibleCreatedThisWeek`, `responsibleCreatedOtherWeek` (и tickets при includeTickets).
   - Deprecated поля: `carryoverTicketsCreatedOtherWeek`.
4) Составить `graph-admission-closure-spec.md`:
   - Таблица входных параметров (имя, тип, дефолт, описание).
   - Таблица ключей ответа (meta/data/debug/carryoverDebug) с кратким описанием.
   - Список побочных эффектов.
   - Список зависимостей и хардкодов.
   - Примеры запросов/ответов (вырезать чувствительные данные).
   - Примечание о фильтре product (нормализация: upper, замена 'С' на 'C', разделитель запятая или массив).

## Критерии приёмки
- Есть файл `DOCS/ANALYSIS/graph-admission-closure-spec.md` с полным описанием входа/выхода, флагов, хардкодов, кеша и логов.
- Присутствуют хотя бы два примера (weeks и months) с актуальными ключами.
- Никаких изменений в коде endpoint не внесено.
- Хардкоды и зависимости перечислены явно.
- Отдельно перечислены эффекты флагов include* и forceRefresh на состав ответа/кеша.

## Риски и заметки
- Контракт большой: важно не пропустить поля `carryoverDebug`, `stagesByWeek`, `responsibleCreatedThisWeek/OtherWeek`, `newTicketsByStages`, серии carryover breakdown.
- Логи разноуровневые — фиксируем как есть, не нормализуем на этом этапе.


