# TASK-069: Этап 3 — Выделение утилит (даты, недели, валидация)

**Дата создания:** 2025-12-23 18:18 (UTC+3, Брест)  
**Версия:** 1.0  
**Статус:** Планирование  
**Исполнители:** Рефактор-менеджер, Программист

---

## 📋 Цель этапа

Выделить вспомогательные функции работы с датами, неделями и HTTP-ответами в отдельные классы-утилиты.

---

## 🔍 Задачи этапа

### 1. Создание WeekHelper

#### 1.1. Файл: `api/tickets-time-tracking-sector-1c/util/WeekHelper.php`

**Класс для работы с неделями по ISO-8601:**

```php
<?php

namespace TimeTracking\Util;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Утилиты для работы с неделями по стандарту ISO-8601
 * 
 * Все расчёты выполняются в UTC
 */
class WeekHelper
{
    /**
     * Возвращает границы текущей ISO-недели (UTC) если не переданы в запросе
     * 
     * @param string|null $start Начало недели (опционально)
     * @param string|null $end Конец недели (опционально)
     * @return array [DateTimeImmutable $weekStart, DateTimeImmutable $weekEnd]
     */
    public static function getWeekBounds(?string $start = null, ?string $end = null): array
    {
        $tz = new DateTimeZone('UTC');

        if ($start && $end) {
            return [
                new DateTimeImmutable($start, $tz),
                new DateTimeImmutable($end, $tz)
            ];
        }

        $now = new DateTimeImmutable('now', $tz);
        $isoYear = (int)$now->format('o');
        $isoWeek = (int)$now->format('W');

        $weekStart = (new DateTimeImmutable('now', $tz))
            ->setISODate($isoYear, $isoWeek, 1)
            ->setTime(0, 0, 0);
        $weekEnd = $weekStart
            ->modify('+6 days')
            ->setTime(23, 59, 59);

        return [$weekStart, $weekEnd];
    }

    /**
     * Вычисляет границы N недель (текущая + N-1 предыдущие) по ISO-8601
     * 
     * @param DateTimeImmutable $currentWeekStart Начало текущей недели
     * @param DateTimeImmutable $currentWeekEnd Конец текущей недели
     * @param int $weeksCount Количество недель (по умолчанию 4)
     * @return array Массив с информацией о неделях (от старых к новым)
     */
    public static function getWeeksBounds(
        DateTimeImmutable $currentWeekStart,
        DateTimeImmutable $currentWeekEnd,
        int $weeksCount = 4
    ): array {
        $weeks = [];
        
        for ($i = 0; $i < $weeksCount; $i++) {
            $weekStart = clone $currentWeekStart;
            $weekStart = $weekStart->modify("-{$i} weeks");
            
            // Убеждаемся, что неделя начинается с понедельника
            $isoYear = (int)$weekStart->format('o');
            $isoWeek = (int)$weekStart->format('W');
            $weekStart = $weekStart->setISODate($isoYear, $isoWeek, 1)->setTime(0, 0, 0);
            
            $weekEnd = clone $weekStart;
            $weekEnd = $weekEnd->modify('+6 days')->setTime(23, 59, 59);
            
            $weeks[] = [
                'weekNumber' => (int)$weekStart->format('W'),
                'weekStartUtc' => $weekStart->format('Y-m-d\TH:i:s\Z'),
                'weekEndUtc' => $weekEnd->format('Y-m-d\TH:i:s\Z'),
                'weekStart' => $weekStart,
                'weekEnd' => $weekEnd
            ];
        }
        
        // Возвращаем от старых к новым
        return array_reverse($weeks);
    }

    /**
     * Определение номера недели по дате
     * 
     * @param string $dateStr Дата в формате строки
     * @param array $weeks Массив недель (из getWeeksBounds)
     * @return int|null Номер недели или null
     */
    public static function getWeekNumberByDate(string $dateStr, array $weeks): ?int
    {
        $ts = strtotime($dateStr);
        if ($ts === false) {
            return null;
        }
        $dt = (new DateTimeImmutable('@' . $ts))->setTimezone(new DateTimeZone('UTC'));
        
        foreach ($weeks as $week) {
            if ($dt >= $week['weekStart'] && $dt <= $week['weekEnd']) {
                return $week['weekNumber'];
            }
        }
        
        return null;
    }

    /**
     * Проверка попадания даты в интервал [start, end]
     * 
     * @param string|null $dateStr Дата в формате строки
     * @param DateTimeImmutable $start Начало интервала
     * @param DateTimeImmutable $end Конец интервала
     * @return bool
     */
    public static function isInRange(?string $dateStr, DateTimeImmutable $start, DateTimeImmutable $end): bool
    {
        if (!$dateStr) {
            return false;
        }
        $ts = strtotime($dateStr);
        if ($ts === false) {
            return false;
        }
        $dt = (new DateTimeImmutable('@' . $ts))->setTimezone(new DateTimeZone('UTC'));
        return $dt >= $start && $dt <= $end;
    }
}
```

### 2. Создание DateHelper

#### 2.1. Файл: `api/tickets-time-tracking-sector-1c/util/DateHelper.php`

**Класс для работы с датами:**

```php
<?php

namespace TimeTracking\Util;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Утилиты для работы с датами
 * 
 * Все операции выполняются в UTC
 */
class DateHelper
{
    /**
     * Создать DateTimeImmutable из строки в UTC
     * 
     * @param string $dateStr Дата в формате строки
     * @return DateTimeImmutable|null
     */
    public static function createFromString(string $dateStr): ?DateTimeImmutable
    {
        $ts = strtotime($dateStr);
        if ($ts === false) {
            return null;
        }
        return (new DateTimeImmutable('@' . $ts))->setTimezone(new DateTimeZone('UTC'));
    }

    /**
     * Форматировать дату в ISO-8601 формат (UTC)
     * 
     * @param DateTimeImmutable $date
     * @return string
     */
    public static function formatIso8601(DateTimeImmutable $date): string
    {
        return $date->format('Y-m-d\TH:i:s\Z');
    }

    /**
     * Форматировать дату для фильтра Bitrix24 (Y-m-d)
     * 
     * @param DateTimeImmutable $date
     * @return string
     */
    public static function formatForBitrixFilter(DateTimeImmutable $date): string
    {
        return $date->format('Y-m-d');
    }
}
```

### 3. Создание ResponseHelper

#### 3.1. Файл: `api/tickets-time-tracking-sector-1c/util/ResponseHelper.php`

**Класс для работы с HTTP-ответами:**

```php
<?php

namespace TimeTracking\Util;

/**
 * Утилиты для формирования HTTP-ответов
 */
class ResponseHelper
{
    /**
     * Отправить JSON-ответ и завершить выполнение
     * 
     * @param array $data Данные для ответа
     * @param int $httpCode HTTP-код ответа (по умолчанию 200)
     * @return void
     */
    public static function jsonResponse(array $data, int $httpCode = 200): void
    {
        http_response_code($httpCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * Парсинг JSON-тела запроса
     * 
     * @return array Массив данных из тела запроса или пустой массив
     */
    public static function parseJsonBody(): array
    {
        $input = file_get_contents('php://input');
        if (!$input) {
            return [];
        }
        $decoded = json_decode($input, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Отправить ответ об ошибке
     * 
     * @param string $error Код ошибки
     * @param string $description Описание ошибки
     * @param int $httpCode HTTP-код ответа
     * @return void
     */
    public static function errorResponse(string $error, string $description, int $httpCode = 400): void
    {
        self::jsonResponse([
            'error' => $error,
            'error_description' => $description
        ], $httpCode);
    }

    /**
     * Отправить успешный ответ
     * 
     * @param array $data Данные ответа
     * @param array $meta Метаданные (опционально)
     * @return void
     */
    public static function successResponse(array $data, array $meta = []): void
    {
        $response = [
            'success' => true,
            'data' => $data
        ];
        
        if (!empty($meta)) {
            $response['meta'] = $meta;
        }
        
        self::jsonResponse($response);
    }
}
```

---

## 📝 Структура файлов после этапа 3

```
api/
└── tickets-time-tracking-sector-1c/
    ├── util/
    │   ├── WeekHelper.php          # ✅ Реализовано
    │   ├── DateHelper.php          # ✅ Реализовано
    │   └── ResponseHelper.php     # ✅ Реализовано
    └── ...
```

---

## ✅ Критерии приёмки этапа

- [ ] Класс `WeekHelper` создан и содержит все методы:
  - [ ] `getWeekBounds()`
  - [ ] `getWeeksBounds()`
  - [ ] `getWeekNumberByDate()`
  - [ ] `isInRange()`
- [ ] Класс `DateHelper` создан и содержит методы работы с датами
- [ ] Класс `ResponseHelper` создан и содержит методы:
  - [ ] `jsonResponse()`
  - [ ] `parseJsonBody()`
  - [ ] `errorResponse()`
  - [ ] `successResponse()`
- [ ] Все методы протестированы изолированно
- [ ] Код соответствует стандартам PSR-12
- [ ] Все методы документированы

---

## 🧪 Тестирование

### Unit-тесты для WeekHelper

```php
<?php
// tests/WeekHelperTest.php

use TimeTracking\Util\WeekHelper;
use DateTimeImmutable;
use DateTimeZone;

// Тест getWeekBounds() с параметрами
$start = '2025-12-15T00:00:00Z';
$end = '2025-12-21T23:59:59Z';
[$weekStart, $weekEnd] = WeekHelper::getWeekBounds($start, $end);
assert($weekStart->format('Y-m-d') === '2025-12-15');
assert($weekEnd->format('Y-m-d') === '2025-12-21');

// Тест getWeekBounds() без параметров (текущая неделя)
[$currentStart, $currentEnd] = WeekHelper::getWeekBounds();
$now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
assert($currentStart <= $now);
assert($currentEnd >= $now);

// Тест getWeeksBounds()
[$weekStart, $weekEnd] = WeekHelper::getWeekBounds();
$weeks = WeekHelper::getWeeksBounds($weekStart, $weekEnd, 4);
assert(count($weeks) === 4);
assert($weeks[0]['weekNumber'] < $weeks[3]['weekNumber']); // От старых к новым

// Тест getWeekNumberByDate()
$dateStr = '2025-12-20T12:00:00Z';
$weekNumber = WeekHelper::getWeekNumberByDate($dateStr, $weeks);
assert($weekNumber !== null);

// Тест isInRange()
$inRange = WeekHelper::isInRange('2025-12-20T12:00:00Z', $weekStart, $weekEnd);
assert($inRange === true);
$notInRange = WeekHelper::isInRange('2025-12-10T12:00:00Z', $weekStart, $weekEnd);
assert($notInRange === false);
```

### Unit-тесты для DateHelper

```php
<?php
// tests/DateHelperTest.php

use TimeTracking\Util\DateHelper;
use DateTimeImmutable;
use DateTimeZone;

// Тест createFromString()
$date = DateHelper::createFromString('2025-12-20T12:00:00Z');
assert($date instanceof DateTimeImmutable);

// Тест formatIso8601()
$formatted = DateHelper::formatIso8601($date);
assert(strpos($formatted, 'T') !== false);
assert(strpos($formatted, 'Z') !== false);

// Тест formatForBitrixFilter()
$bitrixFormat = DateHelper::formatForBitrixFilter($date);
assert($bitrixFormat === '2025-12-20');
```

### Unit-тесты для ResponseHelper

```php
<?php
// tests/ResponseHelperTest.php

use TimeTracking\Util\ResponseHelper;

// Тест parseJsonBody() (требует мокирования php://input)
// Тест errorResponse() (требует мокирования вывода)
// Тест successResponse() (требует мокирования вывода)
```

---

## 🔗 Связанные документы

- **Основной план:** `DOCS/REFACTORING/TASK-069-refactoring-plan-tickets-time-tracking.md`
- **Предыдущий этап:** `DOCS/REFACTORING/TASK-069-stage-02-structure.md`
- **Следующий этап:** `DOCS/REFACTORING/TASK-069-stage-04-bitrix-client.md`

---

## ⏱️ Оценка времени

**2-3 часа**

- Создание WeekHelper: 1 час
- Создание DateHelper: 30 минут
- Создание ResponseHelper: 30 минут
- Написание тестов: 1 час
- Тестирование и проверка: 30 минут

---

**История правок:**
- 2025-12-23 18:18 (UTC+3, Брест): Создан документ этапа 3

