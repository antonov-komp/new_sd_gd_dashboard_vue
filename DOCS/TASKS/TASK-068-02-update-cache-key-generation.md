# TASK-068-02: Обновление генерации ключа кеша для учёта weekStartUtc/weekEndUtc

**Дата создания:** 2025-12-23 15:01 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Backend Developer (PHP)  
**Родительская задача:** [TASK-068: Добавление кеширования для режима "4 недели"](./TASK-068-cache-for-weeks-mode.md)  
**Подзадача:** Этап 2 из TASK-068

---

## 📋 Описание

Обновить генерацию ключа кеша для режима "weeks", чтобы учитывать границы недель (`weekStartUtc` и `weekEndUtc`) в ключе кеша. Это обеспечит уникальность ключей для разных периодов.

**Цель:** Обеспечить корректную генерацию ключей кеша для режима "4 недели" с учётом границ недель.

---

## 🎯 Контекст

### Текущее состояние:

- **Текущая реализация:** Строки 228-249 в `GraphAdmissionClosureCache.php`
- Метод `generateKey()` в `GraphAdmissionClosureCache` не учитывает `weekStartUtc` и `weekEndUtc`
- Для режима "months" период определяется автоматически (последние 3 месяца), поэтому даты не нужны в ключе
- Для режима "weeks" период может быть произвольным (передаётся в запросе), поэтому даты должны быть в ключе
- **Текущий формат ключа для months:** `months_{MD5_хеш}` (строка 248)
- **Текущие параметры в ключе:** `product`, `periodMode`, `includeTickets`, `includeNewTicketsByStages`, `includeCarryoverTickets`, `includeCarryoverTicketsByDuration` (строки 231-238)

### Требуется:

- Обновить метод `generateKey()` для включения `weekStartUtc` и `weekEndUtc` в ключ для режима "weeks"
- Сохранить обратную совместимость для режима "months"
- Обновить `CacheStore::generateKey()` для передачи параметров недель

---

## 🏗️ Модули и компоненты

### Изменяемые файлы:

- `api/cache/GraphAdmissionClosureCache.php` — обновление метода `generateKey()`
- `api/graph-admission-closure/cache/CacheStore.php` — обновление метода `generateKey()` (если нужно)

---

## 📦 Зависимости

- **От задач:** 
  - TASK-068-01: Расширение GraphAdmissionClosureCache для поддержки режима "weeks"
- **От модулей:** 
  - Класс: `GraphAdmissionClosureCache`
  - Класс: `CacheStore`

---

## 🎯 Ступенчатые подзадачи

### Подзадача 2.1: Обновление метода generateKey() в GraphAdmissionClosureCache

**Цель:** Обновить метод `generateKey()` для включения `weekStartUtc` и `weekEndUtc` в ключ для режима "weeks".

**Шаги:**

1. **Модифицировать метод `generateKey()`**
   - **Текущая реализация:** Строки 228-249 в `GraphAdmissionClosureCache.php`
   - Проверять `periodMode` в параметрах
   - Для режима "weeks" включать `weekStartUtc` и `weekEndUtc` в нормализованные параметры
   - Для режима "months" оставить логику без изменений
   ```php
   /**
    * Генерация ключа кеша на основе параметров запроса
    * 
    * @param array $params Параметры запроса
    * @return string Ключ кеша
    */
   public static function generateKey(array $params): string
   {
       // Нормализация параметров для генерации ключа
       $normalized = [
           'product' => $params['product'] ?? '1C',
           'periodMode' => $params['periodMode'] ?? 'months',
           'includeTickets' => $params['includeTickets'] ?? false,
           'includeNewTicketsByStages' => $params['includeNewTicketsByStages'] ?? false,
           'includeCarryoverTicketsByDuration' => $params['includeCarryoverTicketsByDuration'] ?? false
       ];
       
       // Для режима "weeks" включаем границы недель в ключ
       if ($normalized['periodMode'] === 'weeks') {
           $normalized['weekStartUtc'] = $params['weekStartUtc'] ?? null;
           $normalized['weekEndUtc'] = $params['weekEndUtc'] ?? null;
           $normalized['includeCarryoverTickets'] = $params['includeCarryoverTickets'] ?? false;
       } else {
           // Для режима "months" период определяется автоматически (последние 3 месяца)
           // Поэтому не включаем weekStartUtc/weekEndUtc в ключ
           $normalized['includeCarryoverTickets'] = $params['includeCarryoverTickets'] ?? true;
       }
       
       // Генерация MD5 хеша от нормализованных параметров
       // Важно: json_encode с JSON_UNESCAPED_UNICODE для консистентности
       $keyString = json_encode($normalized, JSON_UNESCAPED_UNICODE);
       $hash = md5($keyString);
       
       // Добавляем префикс для читаемости и определения режима
       $prefix = $normalized['periodMode'] === 'weeks' ? 'weeks' : 'months';
       return $prefix . '_' . $hash;
   }
   ```
   - **Важные детали:**
     - Использовать `JSON_UNESCAPED_UNICODE` для консистентности (как в строке 244)
     - Префикс должен быть `weeks_` или `months_` для определения режима в методах `get()` и `set()`
     - Для режима "weeks" `includeCarryoverTickets` по умолчанию `false` (в отличие от "months")
     - `weekStartUtc` и `weekEndUtc` должны быть в формате ISO-8601: `'2025-12-16T00:00:00Z'`

2. **Проверить уникальность ключей**
   - Разные периоды должны генерировать разные ключи
   - Одинаковые периоды должны генерировать одинаковые ключи

**Критерии приёмки:**
- [ ] Метод `generateKey()` обновлён
- [ ] Для режима "weeks" `weekStartUtc` и `weekEndUtc` включаются в ключ
- [ ] Для режима "months" логика без изменений
- [ ] Уникальность ключей для разных периодов обеспечена

---

### Подзадача 2.2: Обновление CacheStore::generateKey() (если нужно)

**Цель:** Убедиться, что `CacheStore::generateKey()` корректно передаёт параметры в `GraphAdmissionClosureCache::generateKey()`.

**Шаги:**

1. **Проверить текущую реализацию `CacheStore::generateKey()`**
   - Метод должен делегировать в `GraphAdmissionClosureCache::generateKey()`
   - Параметры должны передаваться без изменений

2. **Обновить (если нужно)**
   - Убедиться, что все параметры передаются корректно
   - Добавить комментарии о поддержке режима "weeks"

**Критерии приёмки:**
- [ ] `CacheStore::generateKey()` корректно передаёт параметры
- [ ] Комментарии добавлены

---

### Подзадача 2.3: Тестирование генерации ключей

**Цель:** Протестировать генерацию ключей для разных сценариев.

**Шаги:**

1. **Тест одинаковых периодов**
   ```php
   $key1 = GraphAdmissionClosureCache::generateKey([
       'periodMode' => 'weeks',
       'weekStartUtc' => '2025-12-16T00:00:00Z',
       'weekEndUtc' => '2025-12-22T23:59:59Z',
       'product' => '1C'
   ]);
   
   $key2 = GraphAdmissionClosureCache::generateKey([
       'periodMode' => 'weeks',
       'weekStartUtc' => '2025-12-16T00:00:00Z',
       'weekEndUtc' => '2025-12-22T23:59:59Z',
       'product' => '1C'
   ]);
   
   assert($key1 === $key2, 'Same periods should generate same key');
   ```

2. **Тест разных периодов**
   ```php
   $key1 = GraphAdmissionClosureCache::generateKey([
       'periodMode' => 'weeks',
       'weekStartUtc' => '2025-12-16T00:00:00Z',
       'weekEndUtc' => '2025-12-22T23:59:59Z',
       'product' => '1C'
   ]);
   
   $key2 = GraphAdmissionClosureCache::generateKey([
       'periodMode' => 'weeks',
       'weekStartUtc' => '2025-12-23T00:00:00Z',
       'weekEndUtc' => '2025-12-29T23:59:59Z',
       'product' => '1C'
   ]);
   
   assert($key1 !== $key2, 'Different periods should generate different keys');
   ```

3. **Тест разных режимов**
   ```php
   $weeksKey = GraphAdmissionClosureCache::generateKey([
       'periodMode' => 'weeks',
       'product' => '1C'
   ]);
   
   $monthsKey = GraphAdmissionClosureCache::generateKey([
       'periodMode' => 'months',
       'product' => '1C'
   ]);
   
   assert($weeksKey !== $monthsKey, 'Different modes should generate different keys');
   assert(strpos($weeksKey, 'weeks_') === 0, 'Weeks key should have weeks_ prefix');
   assert(strpos($monthsKey, 'months_') === 0, 'Months key should have months_ prefix');
   ```

4. **Тест формата дат**
   ```php
   // Правильный формат (ISO-8601 с UTC)
   $key1 = GraphAdmissionClosureCache::generateKey([
       'periodMode' => 'weeks',
       'weekStartUtc' => '2025-12-16T00:00:00Z',
       'weekEndUtc' => '2025-12-22T23:59:59Z'
   ]);
   
   // Неправильный формат (без 'Z' и с пробелом)
   $key2 = GraphAdmissionClosureCache::generateKey([
       'periodMode' => 'weeks',
       'weekStartUtc' => '2025-12-16 00:00:00',  // Неправильный формат
       'weekEndUtc' => '2025-12-22 23:59:59'    // Неправильный формат
   ]);
   
   // Ключи должны быть разными
   assert($key1 !== $key2, 'Different date formats should generate different keys');
   ```

5. **Тест с реальными значениями из DatePeriodHelper**
   ```php
   // Использование реальных значений из DatePeriodHelper
   $dateHelper = new DatePeriodHelper();
   [$weekStart, $weekEnd] = $dateHelper->getWeekBounds(null, null);
   
   $key = GraphAdmissionClosureCache::generateKey([
       'periodMode' => 'weeks',
       'weekStartUtc' => $weekStart->format('Y-m-d\TH:i:s\Z'),
       'weekEndUtc' => $weekEnd->format('Y-m-d\TH:i:s\Z'),
       'product' => '1C'
   ]);
   
   // Проверить префикс
   assert(strpos($key, 'weeks_') === 0, 'Key should start with weeks_');
   
   // Проверить длину (префикс + MD5 хеш = 5 + 32 = 37 символов)
   assert(strlen($key) === 37, 'Key should be 37 characters long (weeks_ + 32-char MD5)');
   ```

**Критерии приёмки:**
- [ ] Тесты проходят успешно
- [ ] Уникальность ключей обеспечена
- [ ] Префиксы ключей корректны

---

## 🔧 Технические требования

### Формат ключа кеша:

**Для режима "weeks":**
```
weeks_{MD5_хеш_параметров}
```

**Пример ключа:**
```
weeks_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**Параметры, включаемые в хеш:**
- `product` (по умолчанию: '1C')
- `periodMode` ('weeks')
- `weekStartUtc` (обязательно для режима "weeks", формат: `'2025-12-16T00:00:00Z'`)
- `weekEndUtc` (обязательно для режима "weeks", формат: `'2025-12-22T23:59:59Z'`)
- `includeTickets` (по умолчанию: false)
- `includeNewTicketsByStages` (по умолчанию: false)
- `includeCarryoverTickets` (по умолчанию: false для режима "weeks")
- `includeCarryoverTicketsByDuration` (по умолчанию: false)

**Пример нормализованных параметров для режима "weeks":**
```json
{
  "product": "1C",
  "periodMode": "weeks",
  "weekStartUtc": "2025-12-16T00:00:00Z",
  "weekEndUtc": "2025-12-22T23:59:59Z",
  "includeTickets": false,
  "includeNewTicketsByStages": false,
  "includeCarryoverTickets": false,
  "includeCarryoverTicketsByDuration": false
}
```

**MD5 хеш от JSON строки:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6` (пример)

**Для режима "months":**
```
months_{MD5_хеш_параметров}
```

**Параметры, включаемые в хеш:**
- `product` (по умолчанию: '1C')
- `periodMode` ('months')
- `includeTickets` (по умолчанию: false)
- `includeNewTicketsByStages` (по умолчанию: false)
- `includeCarryoverTickets` (по умолчанию: true для режима "months")
- `includeCarryoverTicketsByDuration` (по умолчанию: false)

**Примечание:** Для режима "months" `weekStartUtc` и `weekEndUtc` не включаются, так как период определяется автоматически.

---

## ✅ Критерии приёмки

### Общие критерии:
- [ ] Метод `generateKey()` обновлён для поддержки режима "weeks"
- [ ] `weekStartUtc` и `weekEndUtc` включаются в ключ для режима "weeks"
- [ ] Обратная совместимость сохранена (режим "months" работает как раньше)
- [ ] Уникальность ключей для разных периодов обеспечена
- [ ] Префиксы ключей корректны (`weeks_` или `months_`)
- [ ] Тесты проходят успешно
- [ ] Код соответствует стандартам PSR-12
- [ ] Комментарии добавлены

---

## 🧪 Тестирование

### Функциональное тестирование:

1. **Тест генерации ключей для одинаковых периодов**
2. **Тест генерации ключей для разных периодов**
3. **Тест генерации ключей для разных режимов**
4. **Тест генерации ключей с разными параметрами**

### Примеры тестов:

```php
// Тест 1: Одинаковые периоды
$key1 = GraphAdmissionClosureCache::generateKey([
    'periodMode' => 'weeks',
    'weekStartUtc' => '2025-12-16T00:00:00Z',
    'weekEndUtc' => '2025-12-22T23:59:59Z'
]);
$key2 = GraphAdmissionClosureCache::generateKey([
    'periodMode' => 'weeks',
    'weekStartUtc' => '2025-12-16T00:00:00Z',
    'weekEndUtc' => '2025-12-22T23:59:59Z'
]);
assert($key1 === $key2);

// Тест 2: Разные периоды
$key1 = GraphAdmissionClosureCache::generateKey([
    'periodMode' => 'weeks',
    'weekStartUtc' => '2025-12-16T00:00:00Z',
    'weekEndUtc' => '2025-12-22T23:59:59Z'
]);
$key2 = GraphAdmissionClosureCache::generateKey([
    'periodMode' => 'weeks',
    'weekStartUtc' => '2025-12-23T00:00:00Z',
    'weekEndUtc' => '2025-12-29T23:59:59Z'
]);
assert($key1 !== $key2);

// Тест 3: Префиксы
$weeksKey = GraphAdmissionClosureCache::generateKey(['periodMode' => 'weeks']);
$monthsKey = GraphAdmissionClosureCache::generateKey(['periodMode' => 'months']);
assert(strpos($weeksKey, 'weeks_') === 0);
assert(strpos($monthsKey, 'months_') === 0);
```

---

## 🔍 Валидация и проверки

### Проверка корректности генерации ключей:

**Скрипт для проверки:**
```php
<?php
// test-cache-key-generation.php

require_once __DIR__ . '/api/cache/GraphAdmissionClosureCache.php';

// Тест 1: Одинаковые периоды
$key1 = GraphAdmissionClosureCache::generateKey([
    'periodMode' => 'weeks',
    'weekStartUtc' => '2025-12-16T00:00:00Z',
    'weekEndUtc' => '2025-12-22T23:59:59Z',
    'product' => '1C'
]);

$key2 = GraphAdmissionClosureCache::generateKey([
    'periodMode' => 'weeks',
    'weekStartUtc' => '2025-12-16T00:00:00Z',
    'weekEndUtc' => '2025-12-22T23:59:59Z',
    'product' => '1C'
]);

echo "Test 1 - Same periods:\n";
echo "Key 1: {$key1}\n";
echo "Key 2: {$key2}\n";
echo "Match: " . ($key1 === $key2 ? "YES ✓" : "NO ✗") . "\n\n";

// Тест 2: Разные периоды
$key3 = GraphAdmissionClosureCache::generateKey([
    'periodMode' => 'weeks',
    'weekStartUtc' => '2025-12-23T00:00:00Z',
    'weekEndUtc' => '2025-12-29T23:59:59Z',
    'product' => '1C'
]);

echo "Test 2 - Different periods:\n";
echo "Key 1: {$key1}\n";
echo "Key 3: {$key3}\n";
echo "Different: " . ($key1 !== $key3 ? "YES ✓" : "NO ✗") . "\n\n";

// Тест 3: Префиксы
echo "Test 3 - Prefixes:\n";
echo "Weeks key prefix: " . (strpos($key1, 'weeks_') === 0 ? "YES ✓" : "NO ✗") . "\n";

$monthsKey = GraphAdmissionClosureCache::generateKey([
    'periodMode' => 'months',
    'product' => '1C'
]);
echo "Months key prefix: " . (strpos($monthsKey, 'months_') === 0 ? "YES ✓" : "NO ✗") . "\n";
```

**Запуск:**
```bash
php test-cache-key-generation.php
```

---

## 📝 Примеры кода

### Обновлённый метод generateKey():

```php
/**
 * Генерация ключа кеша на основе параметров запроса
 * 
 * @param array $params Параметры запроса
 * @return string Ключ кеша
 */
public static function generateKey(array $params): string
{
    // Нормализация параметров для генерации ключа
    $normalized = [
        'product' => $params['product'] ?? '1C',
        'periodMode' => $params['periodMode'] ?? 'months',
        'includeTickets' => $params['includeTickets'] ?? false,
        'includeNewTicketsByStages' => $params['includeNewTicketsByStages'] ?? false,
        'includeCarryoverTicketsByDuration' => $params['includeCarryoverTicketsByDuration'] ?? false
    ];
    
    // Для режима "weeks" включаем границы недель в ключ
    if ($normalized['periodMode'] === 'weeks') {
        $normalized['weekStartUtc'] = $params['weekStartUtc'] ?? null;
        $normalized['weekEndUtc'] = $params['weekEndUtc'] ?? null;
        $normalized['includeCarryoverTickets'] = $params['includeCarryoverTickets'] ?? false;
    } else {
        // Для режима "months" период определяется автоматически (последние 3 месяца)
        // Поэтому не включаем weekStartUtc/weekEndUtc в ключ
        $normalized['includeCarryoverTickets'] = $params['includeCarryoverTickets'] ?? true;
    }
    
    // Генерация MD5 хеша от нормализованных параметров
    $keyString = json_encode($normalized, JSON_UNESCAPED_UNICODE);
    $hash = md5($keyString);
    
    // Добавляем префикс для читаемости
    $prefix = $normalized['periodMode'] === 'weeks' ? 'weeks' : 'months';
    return $prefix . '_' . $hash;
}
```

---

## ⚠️ Потенциальные проблемы и решения

### Проблема 1: Формат дат в ключе кеша

**Проблема:** `weekStartUtc` и `weekEndUtc` должны быть в едином формате для консистентности ключей.

**Решение:**
- Использовать формат ISO-8601 с UTC: `Y-m-d\TH:i:s\Z`
- Форматировать через `DateTimeImmutable::format('Y-m-d\TH:i:s\Z')`
- **Пример:** `'2025-12-16T00:00:00Z'` (не `'2025-12-16 00:00:00'`)

**Проверка:**
```php
// Правильно
$weekStart->format('Y-m-d\TH:i:s\Z'); // '2025-12-16T00:00:00Z'

// Неправильно
$weekStart->format('Y-m-d H:i:s'); // '2025-12-16 00:00:00' (разные ключи!)
```

### Проблема 2: Null значения в ключе

**Проблема:** Если `weekStartUtc` или `weekEndUtc` равны `null`, ключ будет некорректным.

**Решение:**
- Для режима "weeks" `weekStartUtc` и `weekEndUtc` должны быть обязательными
- Если они не переданы, использовать значения из `DatePeriodHelper::getWeekBounds()`
- **Проверка:** Убедиться, что значения не `null` перед генерацией ключа

**Пример:**
```php
// В GraphAdmissionClosureService::handle()
[$weekStart, $weekEnd] = $this->dateHelper->getWeekBounds($weekStartParam, $weekEndParam);
// $weekStart и $weekEnd всегда не null (метод возвращает DateTimeImmutable)

$cacheKey = $this->cacheStore->generateKey([
    'weekStartUtc' => $weekStart->format('Y-m-d\TH:i:s\Z'), // Всегда не null
    'weekEndUtc' => $weekEnd->format('Y-m-d\TH:i:s\Z'),     // Всегда не null
    // ...
]);
```

### Проблема 3: Порядок параметров в JSON

**Проблема:** `json_encode()` может сериализовать массив в разном порядке, что приведёт к разным ключам.

**Решение:**
- Использовать `ksort()` перед `json_encode()` для сортировки ключей
- Или использовать ассоциативный массив с явным порядком ключей

**Пример:**
```php
// В generateKey()
$normalized = [
    'product' => ...,
    'periodMode' => ...,
    // ... в явном порядке
];

// Сортировка для консистентности (опционально, но рекомендуется)
ksort($normalized);

$keyString = json_encode($normalized, JSON_UNESCAPED_UNICODE);
```

---

## 🔗 Связанные документы

- [TASK-068: Добавление кеширования для режима "4 недели"](./TASK-068-cache-for-weeks-mode.md)
- [TASK-068-01: Расширение GraphAdmissionClosureCache для поддержки режима "weeks"](./TASK-068-01-extend-cache-for-weeks.md)
- [DatePeriodHelper::getWeekBounds()](../../../api/graph-admission-closure/util/DatePeriodHelper.php)

---

## 📊 История правок

- **2025-12-23 15:01 (UTC+3, Брест):** Создана подзадача для обновления генерации ключа кеша

---

**Автор:** Технический писатель  
**Версия документа:** 1.0

