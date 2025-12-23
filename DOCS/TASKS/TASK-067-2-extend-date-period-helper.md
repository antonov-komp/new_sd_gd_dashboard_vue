# TASK-067-2: Расширение DatePeriodHelper для месячных функций

**Дата создания:** 2025-12-23 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Родитель:** TASK-067  
**Цель:** Перенести функции работы с месяцами в `util/DatePeriodHelper.php` для использования в новом модуле.

## Область
- Добавить метод `calculateLastFourMonths(): array` в DatePeriodHelper
  - Возвращает 4 месяца (3 для отображения + 1 для расчёта процентов)
  - Включает недели внутри каждого месяца (через calculateWeeksInMonth)
  - Структура: monthNumber, monthName, year, monthStartUtc, monthEndUtc, monthStart, monthEnd, weeks[]
- Убедиться, что `calculateWeeksInMonth()` уже есть в DatePeriodHelper
- Сохранить логику из legacy кода без изменений

## Требования к реализации
- Файл: `api/graph-admission-closure/util/DatePeriodHelper.php`
- Метод: `public function calculateLastFourMonths(): array`
  - Сигнатура: без параметров (использует текущую дату)
  - Возвращает массив из 4 месяцев (от старых к новым)
  - Каждый месяц содержит:
    - `monthNumber` (int) — номер месяца (1-12), формат: `$monthStart->format('n')`
    - `monthName` (string) — название месяца на русском из массива:
      ```php
      [1 => 'Январь', 2 => 'Февраль', ..., 12 => 'Декабрь']
      ```
    - `year` (int) — год, формат: `$monthStart->format('Y')`
    - `monthStartUtc` (string) — начало месяца в ISO-8601, формат: `'Y-m-d\TH:i:s\Z'`
    - `monthEndUtc` (string) — конец месяца в ISO-8601, формат: `'Y-m-d\TH:i:s\Z'`
    - `monthStart` (DateTimeImmutable) — объект начала месяца (00:00:00 UTC)
    - `monthEnd` (DateTimeImmutable) — объект конца месяца (23:59:59 UTC)
    - `weeks` (array) — массив недель внутри месяца через `calculateWeeksInMonth()`
- Логика расчёта:
  ```php
  $currentMonth = $now->modify('first day of this month');
  $threeMonthsAgo = $currentMonth->modify('-3 months');
  
  for ($i = 0; $i < 4; $i++) {
      $monthStart = $threeMonthsAgo->modify("+{$i} months");
      $monthEnd = $monthStart->modify('last day of this month')->setTime(23, 59, 59);
      // ... формирование структуры месяца
  }
  ```
- Использовать UTC timezone: `new DateTimeZone('UTC')`
- Обработка ошибок: выбрасывать Exception при проблемах с датами, логировать через error_log
- Структура возвращаемого массива:
  - Индекс 0 = самый старый месяц (4-й, для расчёта процентов)
  - Индексы 1-3 = последние 3 месяца (для отображения)

## План выполнения
1) Прочитать код `calculateLastFourMonths()` из legacy файла (строки 181-220)
2) Проверить наличие `calculateWeeksInMonth()` в DatePeriodHelper:
   - Если есть — использовать
   - Если нет — перенести из legacy (строки 230-268)
3) Перенести метод в DatePeriodHelper:
   - Скопировать логику расчёта месяцев (строки 183-213)
   - Использовать `$this->calculateWeeksInMonth()` для расчёта недель
   - Сохранить структуру массива месяцев (все поля)
   - Сохранить массив названий месяцев на русском
   - Сохранить обработку ошибок (try-catch с error_log)
4) Проверить совместимость:
   - Убедиться, что метод можно вызвать как `$dateHelper->calculateLastFourMonths()`
   - Проверить, что возвращаемая структура идентична legacy
5) Протестировать на существующих данных:
   - Проверить корректность расчёта 4 месяцев (порядок, границы)
   - Проверить структуру weeks внутри месяцев (ISO-8601 недели)
   - Сравнить с legacy результатами (должны совпадать)
   - Проверить edge cases (переход года, февраль в високосный год)

## Артефакты
- Обновлённый `api/graph-admission-closure/util/DatePeriodHelper.php`

## Критерии приёмки
- [ ] calculateLastFourMonths() добавлен в DatePeriodHelper
- [ ] calculateWeeksInMonth() используется для расчёта недель
- [ ] Структура возвращаемого массива идентична legacy
- [ ] Функции протестированы на реальных данных
- [ ] Логика идентична legacy коду
- [ ] Обработка ошибок реализована

## Риски и заметки
- Важно сохранить порядок месяцев (от старых к новым: [0] = 4-й месяц, [1-3] = 3 месяца для отображения)
- calculateWeeksInMonth() должен корректно работать с границами месяцев (ISO-8601 недели могут выходить за границы месяца)

