# TASK-065-2: Проект структуры модуля `graph-admission-closure` (разделение на слои)

**Дата создания:** 2025-12-23 00:15 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Родитель:** TASK-065  
**Цель:** Спроектировать целевую файловую структуру и слои для вынесения `api/graph-1c-admission-closure.php` в отдельный модуль, не меняя контракт API.

## Область
- Определить дерево каталогов в `api/graph-admission-closure/` (или `api/graph/admission-closure/` — выбрать и зафиксировать).
- Описать слои и ответственность: bootstrap/controller/service/bitrix/domain/cache/util/config.
- Определить именование файлов и классов, способ подключения (require_once vs PSR-4 в текущем проекте).
- Зафиксировать точку входа (новый bootstrap) и способ сохранения старого пути (прокси/require).
- Не менять логику, только проектирование.

## Предлагаемая структура (черновик для утверждения)
- Базовый путь (предлагается зафиксировать): `api/graph-admission-closure/`  
  - Старый `api/graph-1c-admission-closure.php` становится прокси (require нового bootstrap), чтобы URL не менялся.
  - `bootstrap.php` — входная точка эндпоинта (headers, parse body, delegate to controller/service).
  - `controller/GraphAdmissionClosureController.php` — приём запроса, вызов сервиса, формирование ответа/кодов.
  - `service/GraphAdmissionClosureService.php` — orchestration: валидация входа, выбор режима, кеш, вызов BitrixClient, агрегатор, сбор ответа.
  - `bitrix/BitrixClient.php` — вызовы CRest, параллельные запросы, пагинация, фильтры, объединение результатов.
  - `domain/Aggregator.php` (+ DTO/массивы) — расчёт метрик недель/месяцев, carryover breakdown, стадии, ответственные.
  - `cache/CacheStore.php` — обёртка над GraphAdmissionClosureCache (TTL, ключи, clearExpired).
  - `config/Config.php` — стадии, цвета, keeperId, pageSize, product, durationCategories.
  - `util/DatePeriodHelper.php` — недели/месяцы/длительности, isInRange, др. утилиты без побочных эффектов.
  - `util/ResponseHelper.php` (опционально) — jsonResponse/ошибки.

## План выполнения
1) Зафиксировать корневую папку: `api/graph-admission-closure/` + прокси в старом файле.  
2) Описать ответственность каждого слоя (1–2 предложения) и границы данных:  
   - Controller ↔ Service: входное тело (array), ответы (array), коды ошибок.  
   - Service ↔ BitrixClient: строки дат, массивы фильтров, entityTypeId/pageSize/stages.  
   - Service ↔ Aggregator: списки тикетов (после product-фильтра), weeks/months периоды, флаги include*.  
   - Service ↔ CacheStore: ключ, TTL, set/get/clearExpired.  
3) Определить именование: файлы — snake/kebab в файловой системе, классы — PSR-12; загрузка: require_once цепочка в bootstrap (если нет Composer autoload); неймспейс опционален, но следует описать (e.g. `GraphAdmissionClosure\...`).  
4) Точка входа:  
   - Новый `bootstrap.php` в модуле.  
   - Старый `api/graph-1c-admission-closure.php` → require bootstrap для сохранения URL.  
5) ADR-мини: фиксируем, что контракт/поведение не меняем; оптимизации (логов/кеш) не делаем сейчас; цель — модульность и поддерживаемость.

## Артефакты
- Этот файл с финальной структурой.
- Обновление `DOCS/ANALYSIS/graph-admission-closure-spec.md`: раздел “Структура модуля” (кратко).
- Скелет каталогов (пустые файлы-заглушки) можно создать в этапе 65-2 или следующем, но без логики.

## Критерии приёмки
- Структура и ответственность слоёв описаны, путь модуля выбран и зафиксирован.
- Определён способ загрузки файлов (require/autoload) и сохранения старого URL.
- Есть короткое ADR-примечание (в этом файле или приложением) о выбранных решениях.
- Нет изменений в рабочей логике/контракте.

## Риски и заметки
- В проекте может не быть общего автозагрузчика для api/ — предусмотреть require_once порядок в bootstrap.
- Важно не поменять публичный путь эндпоинта: сохранить `api/graph-1c-admission-closure.php` как прокси.
- При будущем переносе убедиться, что логи/кеш создают каталоги так же, как сейчас.


