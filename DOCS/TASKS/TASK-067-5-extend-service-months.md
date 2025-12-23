# TASK-067-5: Расширение Service для обработки months режима

**Дата создания:** 2025-12-23 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Родитель:** TASK-067  
**Цель:** Добавить обработку месячного режима в `service/GraphAdmissionClosureService.php`.

## Область
- Удалить заглушку `throw new RuntimeException('months mode not migrated yet')`
- Добавить метод `handleMonthsMode(array $payload): array`
  - Валидация параметров
  - Проверка кеша (через CacheStore)
  - Загрузка данных через BitrixClient (fetchTicketsForMonths, fetchCarryoverTicketsForMonths)
  - Агрегация через Aggregator (aggregateMonths, calculatePreviousPeriodData)
  - Формирование ответа (newTicketsByMonth, closedTicketsByMonth, carryoverTicketsByMonth)
  - Сохранение в кеш (TTL 300 секунд)
- Интегрировать handleMonthsMode() в основной метод handle()
- Обработка ошибок и логирование

## Требования к реализации
- Файл: `api/graph-admission-closure/service/GraphAdmissionClosureService.php`
- Метод `handleMonthsMode()`:
  ```php
  private function handleMonthsMode(array $payload): array
  ```
  - Параметры: `$payload` — массив входных параметров (product, include*, forceRefresh, debug)
  - Возвращает: массив ответа (success, meta, data)
  - Детальная логика:
    1. **Валидация параметров:**
       - `$product = $payload['product'] ?? '1C'`
       - `$includeTickets = $payload['includeTickets'] ?? false`
       - `$includeNewTicketsByStages = $payload['includeNewTicketsByStages'] ?? false`
       - `$includeCarryoverTickets = $payload['includeCarryoverTickets'] ?? false`
       - `$includeCarryoverTicketsByDuration = $payload['includeCarryoverTicketsByDuration'] ?? false`
       - `$forceRefresh = $payload['forceRefresh'] ?? false`
       - `$debug = $payload['debug'] ?? false`
    2. **Проверка кеша:**
       ```php
       if (!$forceRefresh) {
           $cacheKey = $this->cacheStore->generateKey([
               'product' => $product,
               'periodMode' => 'months',
               'includeTickets' => $includeTickets,
               'includeNewTicketsByStages' => $includeNewTicketsByStages,
               'includeCarryoverTickets' => $includeCarryoverTickets,
               'includeCarryoverTicketsByDuration' => $includeCarryoverTicketsByDuration
           ]);
           $cachedData = $this->cacheStore->get($cacheKey);
           if ($cachedData !== null) {
               return $cachedData; // Возврат из кеша
           }
       }
       ```
    3. **Расчёт месяцев:**
       ```php
       $allMonths = $this->dateHelper->calculateLastFourMonths();
       $months = array_slice($allMonths, 1, 3); // Индексы 1-3 для отображения
       $previousMonth = $allMonths[0] ?? null;  // Индекс 0 для процентов
       $periodStart = new DateTimeImmutable($allMonths[0]['monthStartUtc'], new DateTimeZone('UTC'));
       $periodEnd = new DateTimeImmutable($allMonths[3]['monthEndUtc'], new DateTimeZone('UTC'));
       ```
    4. **Загрузка тикетов:**
       ```php
       $allTickets = $this->bitrixClient->fetchTicketsForMonths($periodStart, $periodEnd, $product, $debug);
       if ($includeCarryoverTickets) {
           $carryoverTickets = $this->bitrixClient->fetchCarryoverTicketsForMonths(
               $this->config->getTargetStages(),
               $periodEnd,
               $product,
               $debug
           );
           // Объединение с allTickets (map по id)
       }
       ```
    5. **Агрегация:**
       ```php
       $aggregationResult = $this->aggregator->aggregateMonths(
           $months,
           $allTickets,
           $this->config->getTargetStages(),
           $this->config->getClosingStages(),
           $this->config->getKeeperId(),
           $debug
       );
       $monthMetrics = $aggregationResult['monthMetrics'];
       $stageAgg = $aggregationResult['stageAgg'];
       ```
    6. **Расчёт previousPeriodData:**
       ```php
       $previousPeriodData = $this->aggregator->calculatePreviousPeriodData(
           $previousMonth,
           $allTickets,
           $this->config->getTargetStages(),
           $this->config->getClosingStages(),
           $this->config->getKeeperId()
       );
       ```
    7. **Формирование ответа:**
       - Формирование `newTicketsByMonth`, `closedTicketsByMonth`, `carryoverTicketsByMonth`
       - Подсчёт итогов (`totalNewTickets`, `totalClosedTickets`, `totalCarryoverTickets`)
       - Формирование `stages` из `$stageAgg`
       - Структура ответа (см. этап 67-1)
    8. **Сохранение в кеш:**
       ```php
       $this->cacheStore->set($cacheKey, $response, 300); // TTL 300 секунд
       ```
- Интеграция в `handle()`:
  ```php
  if ($periodMode === 'months') {
      return $this->handleMonthsMode($payload);
  }
  ```
  - Удалить строку: `throw new RuntimeException('months mode not migrated yet')`
- Обработка ошибок:
  - Логирование через `error_log()` с префиксами `[MONTHS-*]`
  - Выбрасывание исключений для критических ошибок (Exception с описанием)
  - Логирование времени выполнения: `[MONTHS-PERFORMANCE]`

## План выполнения
1) Прочитать код месячного режима из legacy файла (строки 670-1693):
   - Валидация и кеш: строки 670-696
   - Расчёт месяцев: строки 698-724
   - Загрузка тикетов: строки 739-1233
   - Агрегация: строки 1258-1442
   - Формирование ответа: строки 1444-1662
   - Сохранение в кеш: строки 1664-1686
2) Удалить заглушку из Service::handle():
   - Найти строку: `throw new RuntimeException('months mode not migrated yet')`
   - Заменить на вызов: `return $this->handleMonthsMode($payload);`
3) Реализовать handleMonthsMode() по шагам:
   - **Шаг 1:** Валидация параметров (извлечение из payload)
   - **Шаг 2:** Проверка кеша (через CacheStore, если не forceRefresh)
   - **Шаг 3:** Расчёт месяцев (через DatePeriodHelper::calculateLastFourMonths())
   - **Шаг 4:** Загрузка тикетов (через BitrixClient::fetchTicketsForMonths())
   - **Шаг 5:** Загрузка переходящих тикетов (если includeCarryoverTickets)
   - **Шаг 6:** Агрегация (через Aggregator::aggregateMonths())
   - **Шаг 7:** Расчёт previousPeriodData (через Aggregator::calculatePreviousPeriodData())
   - **Шаг 8:** Формирование ответа (структура из этапа 67-1)
   - **Шаг 9:** Сохранение в кеш (TTL 300 секунд)
4) Добавить логирование:
   - `[MONTHS]` — общая информация
   - `[MONTHS-PERFORMANCE]` — время выполнения
   - `[Cache]` — кеш-хиты/промахи
5) Добавить обработку ошибок:
   - Try-catch для критических операций
   - Логирование ошибок
   - Выбрасывание исключений с понятными сообщениями
6) Протестировать на реальных данных:
   - Проверить все комбинации параметров
   - Проверить кеширование
   - Сравнить ответы с legacy

## Артефакты
- Обновлённый `api/graph-admission-closure/service/GraphAdmissionClosureService.php`

## Критерии приёмки
- [ ] handleMonthsMode() реализован
- [ ] Заглушка удалена из handle()
- [ ] Интеграция в handle() выполнена
- [ ] Кеширование работает (TTL 300 секунд)
- [ ] Обработка ошибок реализована
- [ ] Логирование работает
- [ ] Формат ответа идентичен legacy

## Риски и заметки
- Важно сохранить структуру ответа идентичной legacy (meta.months, data.*ByMonth, previousPeriodData)
- Кеширование критично для производительности месячного режима
- Обработка ошибок должна быть консистентна с недельным режимом

