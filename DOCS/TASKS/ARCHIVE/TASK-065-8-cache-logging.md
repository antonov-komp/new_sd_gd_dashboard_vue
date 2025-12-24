# TASK-065-8: Кеш и логирование (`cache/CacheStore.php` + лог-флоу)

**Дата создания:** 2025-12-23 00:53 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Родитель:** TASK-065  
**Цель:** Выделить кеш- и лог-слои модуля, сохранив текущее поведение: ключи, TTL, clearExpired, точки логирования, файлы логов.

## Область
- Кеш: текущий `GraphAdmissionClosureCache` (TTL 300, generateKey по параметрам, set/get/clearExpired, periodic cleanup 1/10).
- Логи: запись в `logs/app/graph-admission-closure-YYYY-MM-DD.log`, сообщения с префиксами (PERIOD, QUERY1/2/3, MONTHS, Cache, CARRYOVER, SERIES, etc.).
- Нельзя менять семантику: hit/miss, forceRefresh skip, ошибки записи кеша.
- Ключ кеша учитывает: product, periodMode, includeTickets, includeNewTicketsByStages, includeCarryoverTickets, includeCarryoverTicketsByDuration, (months режим) возможно debug? (проверить в коде), forceRefresh не влияет на ключ.
- Очистка кеша: rand(1,10) === 1 → clearExpired() (возвращает кол-во удалённых).

## Требования к реализации
- Файл: `cache/CacheStore.php` — обёртка над существующим `GraphAdmissionClosureCache` (можно require исходный класс или инкапсулировать).
- Методы:
  - `get($key)` → mixed|null
  - `set($key, $value, $ttl)` → bool
  - `clearExpired()` → int (кол-во удалённых), вызывать по rand(1,10) как сейчас.
  - `generateKey(array $params): string` — совместимый с текущим.
- Логи: либо оставить в сервисе/клиенте, либо ввести минимальный Logger helper, но без изменения текста/масок сообщений.
- Создание каталога логов (если нет) — сохранить в bootstrap/setupLogging.
- setupLogging: создать `logs/app/` при отсутствии, настроить ini_set log_errors/error_log на файл `graph-admission-closure-YYYY-MM-DD.log`.
- Не менять JSON_UNESCAPED_UNICODE флаг при ответах (логика в контроллере/сервисе).

## План выполнения
1) Описать API CacheStore и совместимость ключей/TTL с текущим кодом.
2) Вынести настройку логирования в отдельную функцию/хелпер (setupAppLogging), оставить вызов из bootstrap.
3) Зафиксировать все ключевые сообщения логов в `graph-admission-closure-spec.md` (раздел “Логирование”).
4) Подготовить каркас `cache/CacheStore.php` и (опционально) `util/Logger.php` или reuse setupAppLogging.
5) Не менять вызовы в сервисе до миграции; на этом этапе — только каркасы и документация.

## Артефакты
- Файл-каркас `cache/CacheStore.php`.
- Обновление `DOCS/ANALYSIS/graph-admission-closure-spec.md`: разделы “Кеш” и “Логи”.

## Критерии приёмки
- Описано API кеша, совместимое с текущим `GraphAdmissionClosureCache`.
- Ключи/TTL/clearExpired поведение зафиксированы.
- Точки логирования и путь файла логов зафиксированы; setupLogging вынесен как функция.
- Контракт эндпоинта и логика не изменены.

## Риски и заметки
- Нельзя менять формат ключей кеша, иначе потеряем совместимость и увеличим нагрузку.
- Логи чувствительны к объёму — не добавляем новые записи, только сохраняем точки.

