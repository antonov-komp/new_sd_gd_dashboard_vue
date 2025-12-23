# TASK-067-6: Интеграция кеша для месячного режима

**Дата создания:** 2025-12-23 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Средний  
**Родитель:** TASK-067  
**Цель:** Убедиться, что кеширование месячного режима работает через CacheStore.

## Область
- Проверить, что CacheStore поддерживает месячный режим
- Убедиться, что ключи кеша генерируются корректно (включая periodMode=months)
- Проверить TTL (300 секунд для месячного режима)
- Протестировать кеш-хиты и промахи
- Проверить clearExpired() для месячного режима

## Требования к реализации
- Файл: `api/graph-admission-closure/cache/CacheStore.php`
- CacheStore — обёртка над `GraphAdmissionClosureCache`
- Метод `generateKey()` уже поддерживает periodMode:
  ```php
  public function generateKey(array $params): string
  {
      return GraphAdmissionClosureCache::generateKey($params);
  }
  ```
- Ключи кеша должны включать:
  - `product` (дефолт: '1C')
  - `periodMode` (дефолт: 'months' для месячного режима)
  - `includeTickets` (дефолт: false)
  - `includeNewTicketsByStages` (дефолт: false)
  - `includeCarryoverTickets` (дефолт: true для месячного режима)
  - `includeCarryoverTicketsByDuration` (дефолт: false)
- Формат ключа: `months_<md5_hash>` (префикс + MD5 хеш от JSON параметров)
- TTL: 300 секунд (5 минут) — константа `DEFAULT_TTL` в GraphAdmissionClosureCache
- Логирование: `[Cache] Cache hit/miss/saved` через error_log

## Детальная структура кеша

### Генерация ключа кеша
```php
$cacheKey = $this->cacheStore->generateKey([
    'product' => '1C',
    'periodMode' => 'months',
    'includeTickets' => false,
    'includeNewTicketsByStages' => false,
    'includeCarryoverTickets' => false,
    'includeCarryoverTicketsByDuration' => false
]);
```
- Метод `generateKey()` принимает массив параметров
- Параметры сортируются и сериализуются в строку
- Результат: хеш (md5 или sha1) для уникального ключа
- Пример ключа: `graph-admission-closure-months-abc123def456...`

### Структура данных в кеше
```php
[
    'data' => [
        'success' => true,
        'meta' => [...],
        'data' => [...]
    ],
    'metadata' => [
        'created_at' => 1703347200,  // timestamp
        'expires_at' => 1703347500,  // timestamp (created_at + TTL)
        'ttl' => 300                 // секунды
    ]
]
```

### TTL и истечение
- TTL: 300 секунд (5 минут)
- Проверка истечения: `time() > expires_at`
- Автоматическое удаление истёкших файлов при проверке

## План выполнения
1) Проверить CacheStore::generateKey() — поддерживает ли periodMode:
   - **Проверить реализацию:**
     - `api/cache/GraphAdmissionClosureCache.php` (строки 228-249)
     - Метод уже поддерживает periodMode (включается в нормализованные параметры)
     - Формат: `months_<md5_hash>` для месячного режима
   - **Проверить CacheStore:**
     - `api/graph-admission-closure/cache/CacheStore.php`
     - Метод `generateKey()` делегирует в `GraphAdmissionClosureCache::generateKey()`
   - **Протестировать генерацию ключей:**
     - Ключ 1: `['periodMode' => 'months', 'product' => '1C']`
     - Ключ 2: `['periodMode' => 'months', 'product' => '1C', 'includeCarryoverTickets' => true]`
     - Проверить, что ключи разные
2) Проверить использование кеша в Service::handleMonthsMode():
   - **Генерация ключа:**
     ```php
     $cacheKey = $this->cacheStore->generateKey([
         'product' => $product,
         'periodMode' => 'months',
         'includeTickets' => $includeTickets,
         'includeNewTicketsByStages' => $includeNewTicketsByStages,
         'includeCarryoverTickets' => $includeCarryoverTickets,
         'includeCarryoverTicketsByDuration' => $includeCarryoverTicketsByDuration
     ]);
     ```
   - **Проверка кеша (если не forceRefresh):**
     ```php
     if (!$forceRefresh) {
         $cachedData = $this->cacheStore->get($cacheKey);
         if ($cachedData !== null) {
             error_log("[Cache] Cache hit for key: {$cacheKey}");
             return $cachedData;
         }
         error_log("[Cache] Cache miss for key: {$cacheKey}");
     }
     ```
   - **Сохранение в кеш после расчёта:**
     ```php
     if ($this->cacheStore->set($cacheKey, $response, 300)) {
         error_log("[Cache] Cache saved for key: {$cacheKey}");
     } else {
         error_log("[Cache] Failed to save cache for key: {$cacheKey}");
     }
     ```
   - **Периодическая очистка (каждый 10-й запрос):**
     ```php
     if (rand(1, 10) === 1) {
         $deleted = $this->cacheStore->clearExpired();
         if ($deleted > 0) {
             error_log("[Cache] Cleared {$deleted} expired cache entries");
         }
     }
     ```
3) Протестировать кеш:
   - **Кеш-хит:**
     - Отправить запрос с periodMode=months
     - Дождаться ответа (расчёт и сохранение в кеш)
     - Отправить тот же запрос повторно
     - Проверить, что ответ пришёл быстро (из кеша)
     - Проверить логи: `[Cache] Cache hit for key: ...`
   - **Кеш-промах:**
     - Отправить запрос с новыми параметрами (например, другой include* флаг)
     - Проверить, что выполняется расчёт
     - Проверить логи: `[Cache] Cache miss for key: ...`
   - **forceRefresh:**
     - Отправить запрос с forceRefresh=true
     - Проверить, что кеш пропускается
     - Проверить, что выполняется расчёт и сохранение в кеш
   - **Разные ключи:**
     - Запрос 1: includeCarryoverTickets=false
     - Запрос 2: includeCarryoverTickets=true
     - Проверить, что ключи разные и кеши независимы
4) Проверить clearExpired():
   - Создать тестовый кеш с истёкшим TTL
   - Вызвать clearExpired()
   - Проверить, что файл удалён
   - Проверить логи: `[Cache] Cleared N expired cache entries`

## Артефакты
- Обновлённый `api/graph-admission-closure/cache/CacheStore.php` (если нужны изменения)
- Результаты тестирования кеша

## Критерии приёмки
- [ ] Кеширование работает корректно для месячного режима
- [ ] Ключи генерируются правильно (включая periodMode=months)
- [ ] TTL установлен корректно (300 секунд)
- [ ] Кеш-хиты работают (быстрый ответ из кеша)
- [ ] Кеш-промахи работают (расчёт и сохранение в кеш)
- [ ] clearExpired() удаляет устаревшие записи
- [ ] Логирование кеша работает

## Риски и заметки
- Кеширование критично для производительности месячного режима (большие объёмы данных)
- Важно, чтобы ключи кеша были уникальными для разных комбинаций параметров
- TTL 300 секунд — баланс между актуальностью данных и производительностью

