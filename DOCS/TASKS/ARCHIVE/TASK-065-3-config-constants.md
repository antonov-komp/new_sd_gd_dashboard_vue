# TASK-065-3: Вынесение конфигурации и констант `graph-admission-closure`

**Дата создания:** 2025-12-23 00:25 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Родитель:** TASK-065  
**Цель:** Централизовать хардкоды (стадии, цвета, keeperId, pageSize, product, durationCategories) в модуль `config`, не меняя поведение эндпоинта.

## Область
- Только выделение и консолидация констант/настроек. Логика агрегации/запросов не меняется.
- Файлы модуля (план): `config/Config.php` или `config/constants.php`.
- Старый контракт API и значения остаются без изменений.
- Добавить геттеры/функции для удобства: `getTargetStages()`, `getClosingStages()`, `getAllStages()`, `getDurationCategories()`, `getKeeperId()`, `getPageSize()`, `getProductDefault()`, `getEntityTypeId()`, `getCacheTtl()`.

## Текущие хардкоды (по исходному файлу)
- Стадии:
  - `targetStages`: `DT140_12:UC_0VHWE2`, `DT140_12:PREPARATION`, `DT140_12:CLIENT`
  - `closingStages`: `DT140_12:SUCCESS`, `DT140_12:FAIL`, `DT140_12:UC_0GBU8Z`
- Названия/цвета (используются в `stages`, `stagesByWeek`, `newTicketsByStages`): см. блок `allStages`.
- Duration categories: `up_to_month`, `less_than_month`, `more_than_month`, `more_than_2_months`, `more_than_half_year`, `more_than_year` + цвета/лейблы.
- Прочее: `keeperId = 1051`, `pageSize = 50`, product-фильтр по тегу `1C` (нормализация метки), `entityTypeId = 140`, TTL кеша 300 (в Cache-классе).
- Цвета/названия стадий (из кода):
  - `DT140_12:UC_0VHWE2` → "Сформировано обращение", color `#007bff`
  - `DT140_12:PREPARATION` → "Рассмотрение ТЗ", color `#ffc107`
  - `DT140_12:CLIENT` → "Исполнение", color `#28a745`
  - `DT140_12:SUCCESS` → "Успешное закрытие", color `#28a745`
  - `DT140_12:FAIL` → "Отклонено", color `#dc3545`
  - `DT140_12:UC_0GBU8Z` → "Закрыли без задачи", color `#6c757d`
- Duration categories (лейблы/цвета):
  - `up_to_month` → "До 1 месяца", `#28a745`
  - `less_than_month` → "Менее 1 месяца", `#6cbd45`
  - `more_than_month` → "Более 1 месяца", `#ffc107`
  - `more_than_2_months` → "Более 2 месяцев", `#ff9800`
  - `more_than_half_year` → "Более полугода", `#dc3545`
  - `more_than_year` → "Более года", `#c82333`

## План выполнения
1) Создать `config/Config.php` (или `constants.php`) с массивами/константами:
   - `targetStages`, `closingStages`, `allStages` (id → name/color), `durationCategories`.
   - `keeperId`, `pageSize`, `productDefault = '1C'`, `entityTypeId = 140`, `cacheTtl = 300`.
   - Функции/статические методы-доступники для каждого набора, чтобы исключить дубли.
2) Обеспечить простой способ доступа (функции-обёртки или статический класс). Без зависимости от фреймворка.
3) В коде (позже) заменить хардкоды на обращения к Config — в текущем этапе только подготовка файла и фиксация значений в документации.
4) Обновить `graph-admission-closure-spec.md`: раздел “Конфигурация” (перечень значений).

## Артефакты
- Файл `config/Config.php` (пустой каркас с константами) в модульной папке.
- Обновление `DOCS/ANALYSIS/graph-admission-closure-spec.md` — список констант и их значения/назначение.

## Критерии приёмки
- Все хардкоды перечислены и перенесены в один конфигурационный файл (каркас).
- Значения совпадают с текущим кодом (никаких изменений параметров).
- Контракт API и вычисления не изменены на этом этапе.

## Риски и заметки
- Важно не изменить значения (особенно названия стадий и цвета, `keeperId`, product).  
- Потребуется аккуратная замена в следующих этапах; сейчас — только вынос и фиксация.

