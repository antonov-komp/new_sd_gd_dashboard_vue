# TASK-065-5: Слой доступа к Bitrix24 (`bitrix/BitrixClient.php`)

**Дата создания:** 2025-12-23 00:35 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Родитель:** TASK-065  
**Цель:** Инкапсулировать все вызовы Bitrix24/CRest для модуля графика, сохранив текущую логику (параллельные запросы, пагинация, фильтры, fallback при ошибках).

## Область
- Вынести из эндпоинта низкоуровневые вызовы Bitrix24:
  - Запрос созданных тикетов за период (createdTime).
  - Запрос закрытых тикетов за период (movedTime + closingStages).
  - Запрос переходящих тикетов (по targetStages, <= createdTime).
  - Параллельная загрузка первых страниц (двух запросов) с fallback на последовательный режим.
  - Пагинация, проверка `next` и условия останова (pageSize, hasNext).
- Сохранить сигнатуры данных (массивы items) и поведение объединения картой по `id`.
- Поддержать select-поля: `id`, `title`, `stageId`, `assignedById`, `createdTime`, `updatedTime`, `movedTime`, `UF_CRM_7_TYPE_PRODUCT`, `ufCrm7TypeProduct`.
- Сохранить фильтры:  
  - created: `>=createdTime`, `<=createdTime` (период)  
  - closed: `>=movedTime`, `<=movedTime`, `stageId` in closingStages  
  - carryover: `stageId` in targetStages, `<=createdTime` (periodEnd)  

## Требования к реализации
- Файл: `api/graph-admission-closure/bitrix/BitrixClient.php`.
- Методы (план):
  - `fetchCreatedTickets($periodStartStr, $periodEndStr, int $entityTypeId, int $pageSize): array` — все тикеты, созданные в период.
  - `fetchClosedTickets($periodStartStr, $periodEndStr, array $closingStages, int $entityTypeId, int $pageSize): array` — все тикеты, закрытые в период.
  - `fetchCarryoverTickets(array $targetStages, string $periodEndStr, int $entityTypeId, int $pageSize): array` — все тикеты в рабочих стадиях, созданные до конца периода (без фильтра по createdStart).
  - `executeParallelFirstPages($query1Params, $query2Params): array{0: array, 1: array}` — реализация параллельного старта, fallback при ошибках.
- Поддержать режим webhook/OAuth как в исходнике: чтение `CRest::getAppSettings`, токен, проверка expires_at, при необходимости вызов `app.info` для рефреша.
- Сохранить логику SSL ignore (C_REST_IGNORE_SSL), user-agent, таймауты.
- Возврат: ассоциативный массив с полями Bitrix24 (`result.items`, `result.next`), как сейчас.
- Правила `hasNext`: значение `next` может быть строкой/числом; next != null, != '', != '0', int(next)>0 и count(items)==pageSize.
- Обработка ошибок: если Bitrix вернул `error`, кидать Exception с `error_description` или `error`; логировать сетевые ошибки curl и HTTP != 200.

## План выполнения
1) Вытянуть из исходного файла весь код запросов к Bitrix24 (weeks/months) и параллельного блока `executeParallelQueries` — перенести в BitrixClient (каркас).
2) Сохранить формат параметров: фильтры по `createdTime`, `movedTime`, `stageId`, select-поля (`id, title, stageId, assignedById, createdTime, updatedTime, movedTime, UF_CRM_7_TYPE_PRODUCT, ufCrm7TypeProduct`).
3) Описать API BitrixClient в кратких docblock: вход/выход, выбрасываемые ошибки (Exception на `error` ответа).
4) Добавить утилиту пагинации (внутренний метод), которая учитывает `next` и условие `count(items) === pageSize && hasNext`.
5) Оставить семантику логов (Cache/QUERY/CARRYOVER) в вызывающем слое; в BitrixClient допускается базовое error_log для сетевых ошибок.

## Артефакты
- Файл-каркас `bitrix/BitrixClient.php` с методами и docblock (без изменения логики сейчас).
- Обновление `DOCS/ANALYSIS/graph-admission-closure-spec.md`: раздел “Интеграция с Bitrix24 (BitrixClient)” — перечисление методов, фильтров, select.

## Критерии приёмки
- Все виды запросов к Bitrix24 перечислены и покрыты методами BitrixClient.
- Сохранены фильтры/поля/select/пагинация/parallel-fallback; данные возвращаются в том же формате.
- Нет изменений контракта API; пока только подготовка и документация.

## Риски и заметки
- Параллельный блок чувствителен к ошибкам токена и HTTPS — важно оставить поведение и fallback.
- Bitrix возвращает `next` в разных видах (string/int) — условие должно остаться как в исходнике.
- Не менять user-agent/таймауты/SSL-опции, чтобы не повлиять на прод. нагрузку.

