# TASK-065-4: Утилиты дат/периодов для `graph-admission-closure`

**Дата создания:** 2025-12-23 00:28 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Родитель:** TASK-065  
**Цель:** Вынести расчёты дат/периодов и проверки попадания в диапазон в отдельный утилитарный слой `util/DatePeriodHelper.php`, сохранив текущую логику.

## Область
- Функции, которые должны стать чистыми (без побочных эффектов), кроме optional логов:
  - `getWeekBounds`
  - `getFourWeeksBounds`
  - `calculateLastThreeMonths` (если останется нужным) и `calculateLastFourMonths`
  - `calculateWeeksInMonth`
  - `isInRange`
  - `calculateDurationCategory`
- Логика дат/ISO-8601, UTC, границы периодов для weeks/months.
- Не трогаем бизнес-агрегацию и Bitrix-запросы.

## Требования к реализации
- Отсутствие зависимостей на глобальные переменные; вход — аргументы, выход — детерминированные структуры (DateTimeImmutable или массивы).
- Часовой пояс: использовать UTC, как в текущем коде.
- Совместимость: сигнатуры и поведение должны соответствовать текущей логике (включая fallback в `isInRange` через strtotime).
- Нейминг и структура: файл `util/DatePeriodHelper.php`, экспорт функций или класс-namespace (обсудить: статические методы vs функции).
- Edge cases: переход года для ISO-недель (isoYear/isoWeek), неделя 1 предыдущего года, корректная нормализация понедельника; `isInRange` должен переводить в UTC перед сравнением; `calculateDurationCategory` пороги (0-13, 14-29, 30-59, 60-179, 180-364, >=365).

## План выполнения
1) Перечислить функции и их параметры/возвраты из текущего файла, зафиксировать в `graph-admission-closure-spec.md` (раздел “Дата-утилиты”).
2) Подготовить каркас `util/DatePeriodHelper.php`:
   - Подключение `DateTimeImmutable`, `DateTimeZone`, `Exception`.
   - Объявить функции с текущими сигнатурами и краткими docblock (описание, ожидания).
3) Убедиться, что сигнатуры/тип возвращаемых данных совпадают:
   - `getWeekBounds(?string $start, ?string $end): array{0: DateTimeImmutable, 1: DateTimeImmutable}`
   - `getFourWeeksBounds(DateTimeImmutable $currentWeekStart, DateTimeImmutable $currentWeekEnd): array`
   - `calculateLastFourMonths(): array` (и `calculateLastThreeMonths` при необходимости)
   - `calculateWeeksInMonth(DateTimeImmutable $monthStart, DateTimeImmutable $monthEnd): array`
   - `isInRange(?string $dateStr, DateTimeImmutable $start, DateTimeImmutable $end): bool`
   - `calculateDurationCategory(string $createdTime, DateTimeImmutable $weekStart): string`
4) Оставить существующую логику парсинга (ISO-8601, fallback strtotime), границы недель/месяцев, названия месяцев (ru).
5) Не вносить изменений в основной файл на этом этапе; только документ и каркас.
6) Документировать форматы дат, которые встречались: Bitrix ISO-8601 с TZ (`2025-12-16T10:00:00+03:00`), возможные строки без TZ (используется strtotime fallback).

## Артефакты
- Каркас `util/DatePeriodHelper.php` в модуле (без изменений поведения).
- Обновление `DOCS/ANALYSIS/graph-admission-closure-spec.md`: описание функций и их контрактов.

## Критерии приёмки
- Все функции дат перечислены и задокументированы; подготовлен каркас файла-утилиты.
- Поведение и сигнатуры зафиксированы, без изменений логики/контракта.
- Нет побочных эффектов в утилитах (кроме допустимых логов, если будут перенесены).

## Риски и заметки
- Важно сохранить точность ISO-8601 и порядок недель (старые→новые).
- `isInRange` имеет fallback на `strtotime` — не менять, иначе могут всплыть ошибки парсинга нестандартных дат Bitrix24.

