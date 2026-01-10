# TASK-082: Реализация кеширования для Дашборда сектора 1С и Графика состояния

**Дата создания:** 2026-01-10 16:00 (UTC+3, Брест)
**Статус:** Готова к разработке
**Приоритет:** Высокий
**Исполнитель:** Backend Developer (PHP) + Frontend Developer (Vue.js)
**Родительская задача:** [TASK-080: Исправление несоответствия параметров универсального кеша](./TASK-080-fix-universal-cache-params.md)
**Подзадачи:** 6 подзадач

---

## 📋 Описание

Реализовать полноценное backend кеширование для двух основных модулей системы:
- 📋 **Дашборд сектора 1С** (dashboard-sector-1c)
- 📊 **График состояния** (graph-state)

Кеширование должно работать как через основной интерфейс, так и через "Ручное управление кешем".

### 🎯 Цели реализации:
1. **Ускорение загрузки** модулей на 70-80% за счет backend кеширования
2. **Снижение нагрузки** на Bitrix24 API
3. **Консистентность данных** между разными способами доступа
4. **Централизованное управление** кешем через административный интерфейс
5. **Оптимизация ресурсов** сервера путем переиспользования данных

### 📈 Ожидаемые метрики:
- **Cache Hit Ratio**: > 80% после прогрева кеша
- **Время загрузки**: уменьшение на 70-80%
- **API запросы**: снижение количества вызовов Bitrix24 API на 60-70%

---

## 🎯 Контекст

### Текущая ситуация:

**Дашборд сектора 1С:**
- ✅ In-memory кеширование (фронтенд)
- ❌ Нет backend кеширования
- ❌ Нет интеграции с "Ручное управление кешем"
- 🔄 Каждый раз загружает данные из Bitrix24 API

**График состояния:**
- ❌ Нет кеширования вообще
- 🔄 Каждый раз загружает данные через DashboardSector1CService
- ❌ Нет интеграции с "Ручное управление кешем"

### Требуется:
- Backend кеширование аналогично "Графику приема и закрытий"
- Интеграция с системой "Ручное управление кешем"
- Оптимизация производительности загрузки данных

---

## 🏗️ Модули и компоненты

### Новые файлы:

**Backend (PHP):**

1. **`api/cache/DashboardSector1CCache.php`** - Кеш-менеджер для дашборда
   ```php
   <?php
   class DashboardSector1CCache extends GraphAdmissionClosureCache {
       const CACHE_SECTOR_DIR = self::CACHE_BASE_DIR . '/dashboard-sector-1c';

       // Ключ для данных сектора
       public static function generateSectorDataKey(): string {
           return 'dashboard_sector_1c_' . md5('sector_1c_data_v2');
       }

       // Получение данных сектора из кеша
       public static function getSectorData(): ?array {
           $key = self::generateSectorDataKey();
           return self::get($key);
       }

       // Сохранение данных сектора в кеш
       public static function setSectorData(array $data, int $ttl = 600): bool {
           $key = self::generateSectorDataKey();
           return self::set($key, $data, $ttl);
       }

       // Очистка кеша сектора
       public static function clearSectorCache(): bool {
           return self::clearDirectory(self::CACHE_SECTOR_DIR);
       }
   }
   ```

2. **`api/cache/GraphStateCache.php`** - Кеш-менеджер для графика состояния
   ```php
   <?php
   class GraphStateCache extends GraphAdmissionClosureCache {
       const CACHE_GRAPH_STATE_DIR = self::CACHE_BASE_DIR . '/graph-state';

       // Ключ для данных слепков
       public static function generateSnapshotDataKey(string $type = 'current'): string {
           return 'graph_state_' . md5("snapshot_data_{$type}_v2");
       }

       // Получение данных слепков из кеша
       public static function getSnapshotData(string $type = 'current'): ?array {
           $key = self::generateSnapshotDataKey($type);
           return self::get($key);
       }

       // Сохранение данных слепков в кеш
       public static function setSnapshotData(array $data, string $type = 'current', int $ttl = 3600): bool {
           $key = self::generateSnapshotDataKey($type);
           return self::set($key, $data, $ttl);
       }

       // Очистка кеша графика состояния
       public static function clearGraphStateCache(): bool {
           return self::clearDirectory(self::CACHE_GRAPH_STATE_DIR);
       }
   }
   ```

3. **`api/services/DashboardSector1CService.php`** - Backend сервис с кешированием
   ```php
   <?php
   require_once __DIR__ . '/../cache/DashboardSector1CCache.php';
   require_once __DIR__ . '/../bitrix/BitrixClient.php';
   // ... другие зависимости

   class DashboardSector1CService {
       public static function getSectorDataCached(array $params = []): array {
           $forceRefresh = $params['forceRefresh'] ?? false;
           $ttl = $params['ttl'] ?? 600; // 10 минут по умолчанию

           // Проверяем кеш
           if (!$forceRefresh) {
               $cachedData = DashboardSector1CCache::getSectorData();
               if ($cachedData !== null) {
                   error_log("[DashboardSector1CService] Cache hit for sector data");
                   return $cachedData;
               }
           }

           // Загружаем данные из Bitrix24
           $bitrixClient = new BitrixClient(/* config */);
           $sectorData = self::loadSectorDataFromBitrix($bitrixClient);

           // Сохраняем в кеш
           DashboardSector1CCache::setSectorData($sectorData, $ttl);
           error_log("[DashboardSector1CService] Cache miss, data loaded and cached");

           return $sectorData;
       }

       private static function loadSectorDataFromBitrix(BitrixClient $client): array {
           // Логика загрузки данных из Bitrix24
           // Аналогично существующему DashboardSector1CService на frontend
       }
   }
   ```

4. **`api/services/GraphStateService.php`** - Backend сервис для графика состояния
   ```php
   <?php
   require_once __DIR__ . '/../cache/GraphStateCache.php';
   // ... другие зависимости

   class GraphStateService {
       public static function getSnapshotDataCached(array $params = []): array {
           $type = $params['type'] ?? 'current';
           $forceRefresh = $params['forceRefresh'] ?? false;
           $ttl = $params['ttl'] ?? 3600; // 1 час по умолчанию

           // Проверяем кеш
           if (!$forceRefresh) {
               $cachedData = GraphStateCache::getSnapshotData($type);
               if ($cachedData !== null) {
                   error_log("[GraphStateService] Cache hit for snapshot data (type: {$type})");
                   return $cachedData;
               }
           }

           // Загружаем данные слепков
           $snapshotData = self::loadSnapshotData($type);

           // Сохраняем в кеш
           GraphStateCache::setSnapshotData($snapshotData, $type, $ttl);
           error_log("[GraphStateService] Cache miss, snapshot data loaded and cached (type: {$type})");

           return $snapshotData;
       }

       private static function loadSnapshotData(string $type): array {
           // Логика загрузки данных слепков
           // Интеграция с существующей логикой SnapshotService
       }
   }
   ```

**API Endpoints (расширения):**
- `api/admin/cache-create.php` - добавить обработку новых модулей
- `api/admin/cache-status.php` - добавить новые модули в статус
- `api/admin/cache-clear.php` - добавить очистку новых директорий

### Изменяемые файлы:

**Backend:**
- `api/admin/cache-create.php` - добавить поддержку новых модулей
- `api/admin/cache-status.php` - добавить поддержку новых модулей
- `api/admin/cache-clear.php` - добавить поддержку новых модулей

**Frontend:**
- `vue-app/src/services/dashboard-sector-1c/index.js` - интегрировать backend кеширование
- `vue-app/src/services/graph-state/SectorDataAdapter.js` - интегрировать backend кеширование
- `vue-app/src/services/cache-creation-service.js` - добавить новые модули

---

## 📦 Зависимости

- **От задач:**
  - TASK-080: Система backend кеширования для GraphAdmissionClosure
  - TASK-076: Ручное управление кешем

- **От модулей:**
  - DashboardSector1CService (существующий)
  - SectorDataAdapter + SnapshotService (существующие)
  - GraphAdmissionClosureCache (как образец)

---

## 🎯 Ступенчатые подзадачи

### Подзадача 1: Анализ текущей архитектуры

**Цель:** Изучить как работают модули сейчас и спроектировать кеширование.

**Шаги:**

1. **Изучить DashboardSector1CService:**
   ```javascript
   // vue-app/src/services/dashboard-sector-1c/index.js
   // Метод getSectorData(useCache, onProgress)
   ```

2. **Изучить SectorDataAdapter:**
   ```javascript
   // vue-app/src/services/graph-state/SectorDataAdapter.js
   // Метод getSectorDataForSnapshot(options)
   ```

3. **Определить параметры кеширования:**
   - Ключи кеша (cache keys)
   - TTL для разных типов данных
   - Стратегии инвалидации

**Критерии приёмки:**
- [ ] Документ с анализом текущей архитектуры
- [ ] Определены параметры кеширования для каждого модуля

---

### Подзадача 2: Создание кеш-менеджеров

**Цель:** Реализовать backend кеширование аналогично GraphAdmissionClosureCache.

**Технические детали:**
- Наследование от `GraphAdmissionClosureCache` для переиспользования базовой функциональности
- Собственные константы директорий для изоляции данных
- Версионирование ключей (v2) для поддержки будущих изменений
- Автоматическая очистка истекших данных

**Шаги:**

1. **Создать DashboardSector1CCache.php:**
   ```php
   <?php
   require_once __DIR__ . '/GraphAdmissionClosureCache.php';

   class DashboardSector1CCache extends GraphAdmissionClosureCache {
       const CACHE_SECTOR_DIR = self::CACHE_BASE_DIR . '/dashboard-sector-1c';

       /**
        * Генерация ключа для данных сектора 1С
        * Включает версию для поддержки инвалидации при изменениях
        */
       public static function generateSectorDataKey(): string {
           return 'dashboard_sector_1c_' . md5('sector_1c_data_v2');
       }

       /**
        * Получение данных сектора из кеша
        */
       public static function getSectorData(): ?array {
           $key = self::generateSectorDataKey();
           $data = self::get($key);

           if ($data !== null) {
               error_log("[DashboardSector1CCache] Cache hit for sector data");
           } else {
               error_log("[DashboardSector1CCache] Cache miss for sector data");
           }

           return $data;
       }

       /**
        * Сохранение данных сектора в кеш
        */
       public static function setSectorData(array $data, int $ttl = 600): bool {
           $key = self::generateSectorDataKey();
           $result = self::set($key, $data, $ttl);

           error_log("[DashboardSector1CCache] " . ($result ? "Saved" : "Failed to save") .
                    " sector data to cache (TTL: {$ttl}s)");

           return $result;
       }

       /**
        * Очистка всего кеша сектора
        */
       public static function clearSectorCache(): bool {
           $result = self::clearDirectory(self::CACHE_SECTOR_DIR);
           error_log("[DashboardSector1CCache] " . ($result ? "Cleared" : "Failed to clear") . " sector cache");
           return $result;
       }

       /**
        * Получение статистики кеша
        */
       public static function getCacheStats(): array {
           return [
               'directory' => self::CACHE_SECTOR_DIR,
               'files_count' => count(glob(self::CACHE_SECTOR_DIR . '/*.json') ?: []),
               'total_size' => self::getDirectorySize(self::CACHE_SECTOR_DIR)
           ];
       }
   }
   ```

2. **Создать GraphStateCache.php:**
   ```php
   <?php
   require_once __DIR__ . '/GraphAdmissionClosureCache.php';

   class GraphStateCache extends GraphAdmissionClosureCache {
       const CACHE_GRAPH_STATE_DIR = self::CACHE_BASE_DIR . '/graph-state';

       /**
        * Генерация ключа для данных графика состояния
        * Поддерживает разные типы данных (current, historical, etc.)
        */
       public static function generateSnapshotDataKey(string $type = 'current'): string {
           return 'graph_state_' . md5("snapshot_data_{$type}_v2");
       }

       /**
        * Получение данных слепков из кеша
        */
       public static function getSnapshotData(string $type = 'current'): ?array {
           $key = self::generateSnapshotDataKey($type);
           $data = self::get($key);

           if ($data !== null) {
               error_log("[GraphStateCache] Cache hit for snapshot data (type: {$type})");
           } else {
               error_log("[GraphStateCache] Cache miss for snapshot data (type: {$type})");
           }

           return $data;
       }

       /**
        * Сохранение данных слепков в кеш
        */
       public static function setSnapshotData(array $data, string $type = 'current', int $ttl = 3600): bool {
           $key = self::generateSnapshotDataKey($type);
           $result = self::set($key, $data, $ttl);

           error_log("[GraphStateCache] " . ($result ? "Saved" : "Failed to save") .
                    " snapshot data to cache (type: {$type}, TTL: {$ttl}s)");

           return $result;
       }

       /**
        * Очистка всего кеша графика состояния
        */
       public static function clearGraphStateCache(): bool {
           $result = self::clearDirectory(self::CACHE_GRAPH_STATE_DIR);
           error_log("[GraphStateCache] " . ($result ? "Cleared" : "Failed to clear") . " graph state cache");
           return $result;
       }

       /**
        * Получение статистики кеша
        */
       public static function getCacheStats(): array {
           return [
               'directory' => self::CACHE_GRAPH_STATE_DIR,
               'files_count' => count(glob(self::CACHE_GRAPH_STATE_DIR . '/*.json') ?: []),
               'total_size' => self::getDirectorySize(self::CACHE_GRAPH_STATE_DIR)
           ];
       }

       /**
        * Групповые операции с кешем
        */
       public static function invalidateByType(string $type): bool {
           // Удаление всех кешей определенного типа
           $pattern = self::CACHE_GRAPH_STATE_DIR . "/graph_state_*{$type}*.json";
           $files = glob($pattern) ?: [];

           $deleted = 0;
           foreach ($files as $file) {
               if (@unlink($file)) {
                   $deleted++;
               }
           }

           error_log("[GraphStateCache] Invalidated {$deleted} cache files for type: {$type}");
           return $deleted > 0;
       }
   }
   ```

**Критерии приёмки:**
- [ ] Созданы классы кеш-менеджеров с полным набором методов
- [ ] Реализованы методы генерации ключей с версионированием
- [ ] Добавлено логирование всех операций
- [ ] Протестировано сохранение/чтение данных
- [ ] Реализованы методы очистки и статистики

---

### Подзадача 3: Создание сервисов с кешированием

**Цель:** Создать backend сервисы, интегрирующие кеширование.

**Шаги:**

1. **Создать DashboardSector1CService.php:**
   ```php
   class DashboardSector1CService {
       public static function getSectorDataCached(array $params = []): array
       // Аналогично GraphAdmissionClosureService
       // - Проверка кеша
       // - Загрузка из Bitrix24 при отсутствии
       // - Сохранение в кеш
   }
   ```

2. **Создать GraphStateService.php:**
   ```php
   class GraphStateService {
       public static function getSnapshotDataCached(array $params = []): array
       // Для загрузки данных слепков с кешированием
   }
   ```

**Критерии приёмки:**
- [ ] Созданы backend сервисы
- [ ] Интегрировано кеширование
- [ ] Протестирована работа с Bitrix24 API

---

### Подзадача 4: Расширение API для кеширования

**Цель:** Добавить поддержку новых модулей в систему управления кешем.

**Технические детали:**
- Расширение существующих API endpoints без изменения контрактов
- Добавление новых модулей в конфигурацию
- Поддержка специфических параметров для каждого модуля

**Шаги:**

1. **Обновить api/admin/cache-create.php:**
   ```php
   // Найти switch($moduleId) и добавить новые case'ы
   switch ($moduleId) {
       // ... существующие case'ы ...

       case 'dashboard-sector-1c':
           require_once __DIR__ . '/../services/DashboardSector1CService.php';

           $params = $body['params'] ?? [];
           $params['forceRefresh'] = true; // Всегда пересоздавать при ручном создании

           try {
               $result = DashboardSector1CService::getSectorDataCached($params);
               updateTaskStatus($statusFile, 100, 'Кеш дашборда сектора 1С успешно создан', $cacheKey);
               error_log("[CacheCreate] Successfully created dashboard-sector-1c cache");
           } catch (Exception $e) {
               error_log("[CacheCreate] Failed to create dashboard-sector-1c cache: " . $e->getMessage());
               throw $e;
           }
           break;

       case 'graph-state':
           require_once __DIR__ . '/../services/GraphStateService.php';

           $params = $body['params'] ?? [];
           $params['forceRefresh'] = true;
           $params['type'] = $params['type'] ?? 'current'; // Тип слепков

           try {
               $result = GraphStateService::getSnapshotDataCached($params);
               updateTaskStatus($statusFile, 100, 'Кеш графика состояния успешно создан', $cacheKey);
               error_log("[CacheCreate] Successfully created graph-state cache");
           } catch (Exception $e) {
               error_log("[CacheCreate] Failed to create graph-state cache: " . $e->getMessage());
               throw $e;
           }
           break;

       // ... остальные case'ы ...
   }
   ```

2. **Обновить api/admin/cache-status.php:**
   ```php
   // Добавить в массив $modules новые модули
   $modules = [
       // ... существующие модули ...

       [
           'id' => 'dashboard-sector-1c',
           'name' => 'Дашборд сектора 1С',
           'cache_dir' => 'api/cache/dashboard-sector-1c',
           'status' => getCacheInfo(__DIR__ . '/../cache/dashboard-sector-1c', 600)['status'],
           'file_count' => getCacheInfo(__DIR__ . '/../cache/dashboard-sector-1c', 600)['file_count'],
           'total_size' => getCacheInfo(__DIR__ . '/../cache/dashboard-sector-1c', 600)['total_size'],
           'ttl' => 600, // 10 минут
           'created_at' => getCacheInfo(__DIR__ . '/../cache/dashboard-sector-1c', 600)['created_at'],
           'expires_at' => getCacheInfo(__DIR__ . '/../cache/dashboard-sector-1c', 600)['expires_at'],
           'status_text' => getCacheInfo(__DIR__ . '/../cache/dashboard-sector-1c', 600)['status_text']
       ],

       [
           'id' => 'graph-state',
           'name' => 'График состояния',
           'cache_dir' => 'api/cache/graph-state',
           'status' => getCacheInfo(__DIR__ . '/../cache/graph-state', 3600)['status'],
           'file_count' => getCacheInfo(__DIR__ . '/../cache/graph-state', 3600)['file_count'],
           'total_size' => getCacheInfo(__DIR__ . '/../cache/graph-state', 3600)['total_size'],
           'ttl' => 3600, // 1 час
           'created_at' => getCacheInfo(__DIR__ . '/../cache/graph-state', 3600)['created_at'],
           'expires_at' => getCacheInfo(__DIR__ . '/../cache/graph-state', 3600)['expires_at'],
           'status_text' => getCacheInfo(__DIR__ . '/../cache/graph-state', 3600)['status_text']
       ],

       // ... остальные модули ...
   ];
   ```

3. **Обновить api/admin/cache-clear.php:**
   ```php
   // Найти switch($moduleId) и добавить новые case'ы
   switch ($moduleId) {
       // ... существующие case'ы ...

       case 'dashboard-sector-1c':
           require_once __DIR__ . '/../cache/DashboardSector1CCache.php';
           $result = DashboardSector1CCache::clearSectorCache();
           break;

       case 'graph-state':
           require_once __DIR__ . '/../cache/GraphStateCache.php';
           $result = GraphStateCache::clearGraphStateCache();
           break;

       case 'all':
           // Очистка всех кешей включая новые
           require_once __DIR__ . '/../cache/DashboardSector1CCache.php';
           require_once __DIR__ . '/../cache/GraphStateCache.php';

           $result = GraphAdmissionClosureCache::clearExpired() &&
                    DashboardSector1CCache::clearSectorCache() &&
                    GraphStateCache::clearGraphStateCache() &&
                    TimeTrackingCache::clearAll() &&
                    // ... остальные очистки ...
           break;

       // ... остальные case'ы ...
   }
   ```

**Критерии приёмки:**
- [ ] API endpoints поддерживают новые модули
- [ ] Ручное создание кеша работает с правильными параметрами
- [ ] Очистка кеша работает для новых модулей
- [ ] Статус кеша корректно отображается в интерфейсе
- [ ] Обработка ошибок при операциях с кешем

---

### Подзадача 5: Интеграция frontend

**Цель:** Обновить frontend сервисы для использования backend кеширования.

**Шаги:**

1. **Обновить DashboardSector1CService (frontend):**
   ```javascript
   // Добавить опцию useBackendCache
   static async getSectorData(useCache = true, useBackendCache = false, onProgress = null)
   // При useBackendCache = true использовать API вместо прямых вызовов Bitrix24
   ```

2. **Обновить SectorDataAdapter:**
   ```javascript
   // Добавить backend кеширование
   static async getSectorDataForSnapshot(options = {})
   // Опция useBackendCache для использования API
   ```

3. **Обновить cache-creation-service.js:**
   ```javascript
   // Добавить новые модули
   getDefaultParams(moduleId) {
       case 'dashboard-sector-1c': return { /* params */ };
       case 'graph-state': return { /* params */ };
   }
   ```

**Критерии приёмки:**
- [ ] Frontend сервисы поддерживают backend кеширование
- [ ] Опциональный выбор между in-memory и backend кешем
- [ ] "Ручное управление кешем" показывает новые модули

---

### Подзадача 6: Тестирование и оптимизация

**Цель:** Протестировать работу кеширования и оптимизировать производительность.

**Шаги:**

1. **Тестирование кеширования:**
   ```bash
   # Создать кеш через API
   curl -X POST /api/admin/cache-create.php \
     -d '{"module_id":"dashboard-sector-1c"}'
   
   # Проверить в интерфейсе управления кешем
   # Проверить время загрузки модулей
   ```

2. **Оптимизация TTL:**
   ```php
   // Разные TTL для разных данных:
   // - Данные сектора: 10 минут (быстро меняются)
   // - Данные слепков: 1 час (менее критичны к актуальности)
   ```

3. **Мониторинг производительности:**
   ```php
   // Добавить логирование cache hit/miss
   // Замер времени загрузки
   ```

**Критерии приёмки:**
- [ ] Кеширование работает для обоих модулей
- [ ] "Ручное управление кешем" отображает новые модули
- [ ] Производительность загрузки улучшена
- [ ] Корректное логирование операций кеширования

---

## 🔧 Технические требования

### Ключи кеша:

**Dashboard Sector 1C:**
```php
$cacheKey = 'dashboard_sector_1c_' . md5('sector_1c_data_v1');
```

**Graph State:**
```php
$cacheKey = 'graph_state_' . md5('snapshot_data_' . $snapshotType . '_v1');
```

### TTL значения:

| Модуль | Тип данных | TTL |
|--------|------------|-----|
| Dashboard Sector 1C | Данные сектора | 600 сек (10 мин) |
| Graph State | Данные слепков | 3600 сек (1 час) |

### API контракты:

**Создание кеша:**
```json
POST /api/admin/cache-create.php
{
  "module_id": "dashboard-sector-1c",
  "params": {
    "forceRefresh": true
  }
}
```

**Статус кеша:**
```json
GET /api/admin/cache-status.php
// Возвращает массив модулей с информацией о кеше
```

---

## ✅ Критерии приёмки

### Общие критерии:
- [ ] Backend кеширование работает для обоих модулей
- [ ] Интеграция с "Ручное управление кешем"
- [ ] Оптимизация производительности загрузки
- [ ] Корректное логирование операций

### Детальная проверка:

**Dashboard Sector 1C:**
- [ ] Кеш создается через API и интерфейс
- [ ] Повторная загрузка использует кеш (cache hit)
- [ ] Очистка кеша работает

**Graph State:**
- [ ] Кеш создается для данных слепков
- [ ] Загрузка слепков использует кеш
- [ ] Создание новых слепков не конфликтует с кешем

**Производительность:**
- [ ] Время загрузки уменьшено на 70-80%
- [ ] Cache hit ratio > 80% после прогрева кеша

---

## 🧪 Тестирование

### Ручное тестирование:

1. **Тест Dashboard Sector 1C:**
   ```bash
   # Создать кеш
   curl -X POST /api/admin/cache-create.php \
     -H "Content-Type: application/json" \
     -d '{"module_id":"dashboard-sector-1c"}'
   
   # Проверить статус
   curl /api/admin/cache-status.php
   
   # Открыть модуль - должен использовать кеш
   ```

2. **Тест Graph State:**
   ```bash
   # Создать кеш для слепков
   curl -X POST /api/admin/cache-create.php \
     -H "Content-Type: application/json" \
     -d '{"module_id":"graph-state"}'
   
   # Создать слепок - должен использовать кеш
   ```

### Автоматизированное тестирование:

#### Unit тесты:

```php
// tests/unit/DashboardSector1CCacheTest.php
class DashboardSector1CCacheTest extends TestCase {
    public function testGenerateSectorDataKey() {
        $key = DashboardSector1CCache::generateSectorDataKey();
        $this->assertStringStartsWith('dashboard_sector_1c_', $key);
        $this->assertEquals(64, strlen($key)); // MD5 hash length
    }

    public function testSetAndGetSectorData() {
        $testData = ['stages' => [], 'employees' => []];

        // Test save
        $result = DashboardSector1CCache::setSectorData($testData, 60);
        $this->assertTrue($result);

        // Test retrieve
        $cachedData = DashboardSector1CCache::getSectorData();
        $this->assertEquals($testData, $cachedData);
    }

    public function testCacheExpiration() {
        $testData = ['test' => 'data'];

        // Save with short TTL
        DashboardSector1CCache::setSectorData($testData, 1);

        // Wait for expiration
        sleep(2);

        // Should return null after expiration
        $cachedData = DashboardSector1CCache::getSectorData();
        $this->assertNull($cachedData);
    }
}
```

#### Integration тесты:

```php
// tests/integration/CacheApiIntegrationTest.php
class CacheApiIntegrationTest extends TestCase {
    public function testCreateDashboardSectorCache() {
        $response = $this->post('/api/admin/cache-create.php', [
            'module_id' => 'dashboard-sector-1c',
            'params' => ['forceRefresh' => true]
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        // Verify cache file exists
        $this->assertTrue(file_exists('/path/to/cache/dashboard-sector-1c/*.json'));
    }

    public function testCacheStatusIncludesNewModules() {
        $response = $this->get('/api/admin/cache-status.php');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'modules' => [
                '*' => [
                    'id',
                    'name',
                    'status',
                    'file_count',
                    'total_size',
                    'ttl'
                ]
            ]
        ]);

        // Verify new modules are present
        $modules = $response->json('modules');
        $moduleIds = array_column($modules, 'id');

        $this->assertContains('dashboard-sector-1c', $moduleIds);
        $this->assertContains('graph-state', $moduleIds);
    }
}
```

#### Performance тесты:

```php
// tests/performance/CachePerformanceTest.php
class CachePerformanceTest extends TestCase {
    public function testCacheHitPerformance() {
        // Warm up cache
        DashboardSector1CService::getSectorDataCached(['forceRefresh' => true]);

        // Measure cache hit time
        $startTime = microtime(true);
        $data = DashboardSector1CService::getSectorDataCached();
        $endTime = microtime(true);

        $duration = ($endTime - $startTime) * 1000; // ms
        $this->assertLessThan(50, $duration); // Should be < 50ms
    }

    public function testCacheMissPerformance() {
        // Clear cache
        DashboardSector1CCache::clearSectorCache();

        // Measure cache miss time (includes Bitrix24 API call)
        $startTime = microtime(true);
        $data = DashboardSector1CService::getSectorDataCached();
        $endTime = microtime(true);

        $duration = ($endTime - $startTime) * 1000; // ms
        $this->assertLessThan(5000, $duration); // Should be < 5 seconds
    }

    public function testConcurrentCacheAccess() {
        // Test thread safety
        $promises = [];
        for ($i = 0; $i < 10; $i++) {
            $promises[] = async(function() {
                return DashboardSector1CService::getSectorDataCached();
            });
        }

        $results = await($promises);

        // All results should be identical
        foreach ($results as $result) {
            $this->assertEquals($results[0], $result);
        }
    }
}
```

#### E2E тесты:

```javascript
// tests/e2e/cache-management.e2e.js
describe('Cache Management E2E', () => {
  it('should create and display dashboard sector cache', () => {
    // Navigate to cache management page
    cy.visit('/admin/cache-management');

    // Find dashboard sector module
    cy.contains('Дашборд сектора 1С').should('be.visible');

    // Create cache
    cy.contains('Дашборд сектора 1С').parent().find('.btn-create').click();

    // Wait for cache creation
    cy.contains('Кеш успешно создан').should('be.visible');

    // Verify cache status updated
    cy.contains('Дашборд сектора 1С')
      .parent()
      .should('contain', 'Активен')
      .and('not.contain', '0 B');
  });

  it('should clear cache and update status', () => {
    // Clear cache
    cy.contains('Дашборд сектора 1С').parent().find('.btn-clear').click();

    // Confirm clearing
    cy.on('window:confirm', () => true);

    // Verify cache cleared
    cy.contains('Дашборд сектора 1С')
      .parent()
      .should('contain', 'Пуст');
  });
});
```

#### Load testing:

```bash
# Load test with Apache Bench
ab -n 100 -c 10 -p payload.json -T application/json http://localhost/api/admin/cache-create.php

# Payload for cache creation
{
  "module_id": "dashboard-sector-1c",
  "params": {
    "forceRefresh": true
  }
}
```

### Нагрузочное тестирование сценариев:

1. **Одновременное создание кеша** разными модулями
2. **Чтение кеша** при высокой нагрузке
3. **Очистка кеша** во время активного использования
4. **Истечение TTL** и автоматическая очистка

---

## 🏗️ Архитектурные решения

### Стратегия кеширования:

1. **Двухуровневое кеширование:**
   - **Уровень 1**: In-memory кеш (существующий) - быстрый доступ, TTL 5-10 мин
   - **Уровень 2**: Backend кеш (новый) - persistent, TTL 10 мин - 1 час

2. **Приоритет загрузки:**
   ```
   Запрос данных → Проверка in-memory → Проверка backend → Загрузка из Bitrix24
   ```

3. **Инвалидация кеша:**
   - **Автоматическая**: TTL expiration
   - **Ручная**: Через административный интерфейс
   - **Событийная**: При изменениях в Bitrix24 (webhooks)

### Миграция данных:

**Пошаговая миграция:**
1. **Этап 1**: Реализация backend кеширования (параллельно с существующим)
2. **Этап 2**: Тестирование в staging среде
3. **Этап 3**: Постепенное переключение пользователей
4. **Этап 4**: Удаление старого in-memory кеша (опционально)

**Обратная совместимость:**
- Существующие API остаются неизменными
- Новые параметры опциональны
- Fallback на старое поведение при ошибках

---

## 📊 Мониторинг и метрики

### Ключевые метрики:

1. **Производительность:**
   - Cache Hit Ratio: `hits / (hits + misses) * 100%`
   - Среднее время загрузки модулей
   - Количество запросов к Bitrix24 API

2. **Ресурсы:**
   - Размер кеш файлов на диске
   - Количество кеш файлов
   - Время очистки истекших кешей

3. **Надежность:**
   - Процент успешных операций кеширования
   - Время восстановления после сбоев

### Логирование:

```php
// Структура логов операций кеширования
[
    'timestamp' => '2026-01-10 18:30:00 UTC',
    'operation' => 'cache_hit|cache_miss|cache_save|cache_clear',
    'module' => 'dashboard-sector-1c|graph-state',
    'key' => 'cache_key_hash',
    'duration_ms' => 150,
    'size_bytes' => 45632,
    'ttl_seconds' => 600
]
```

### Мониторинг в реальном времени:

- **Dashboard кеша** в административном интерфейсе
- **Графики метрик** в Grafana/Prometheus
- **Алёрты** при низком Cache Hit Ratio

---

## 🔒 Безопасность

### Защита данных кеша:

1. **Валидация данных:**
   ```php
   // Проверка структуры данных перед сохранением
   if (!is_array($data) || !isset($data['meta'])) {
       throw new InvalidArgumentException('Invalid cache data structure');
   }
   ```

2. **Ограничение размера:**
   ```php
   // Предотвращение переполнения диска
   $maxCacheSize = 100 * 1024 * 1024; // 100MB
   if (self::getDirectorySize(self::CACHE_DIR) > $maxCacheSize) {
       self::clearExpired();
   }
   ```

3. **Защита от манипуляций:**
   - Хранение в защищенной директории
   - Проверка целостности данных при чтении
   - Логирование всех операций

---

## ⚠️ Потенциальные проблемы и решения

### Проблема 1: Конфликт с существующим in-memory кешем
**Симптомы:** Дублирование данных, несогласованность
**Решение:** Иерархическая структура с приоритетом in-memory кеша

### Проблема 2: Синхронизация данных
**Симптомы:** Устаревшие данные в кеше после изменений в Bitrix24
**Решение:**
- Webhook обработчики для инвалидации кеша
- TTL-based автоматическая инвалидация
- Ручная инвалидация через API

### Проблема 3: Производительность записи в кеш
**Симптомы:** Задержки при сохранении больших объемов данных
**Решение:**
- Асинхронная запись через очереди
- Компрессия данных при сохранении
- Оптимизация сериализации JSON

### Проблема 4: Переполнение диска
**Симптомы:** Рост размера кеш директорий
**Решение:**
- Автоматическая очистка по LRU принципу
- Ограничение максимального размера
- Мониторинг и алерты

### Проблема 5: Гонка условий (Race conditions)
**Симптомы:** Несогласованные данные при одновременном доступе
**Решение:**
- File locking при операциях чтения/записи
- Atomic operations для критических секций
- Версионирование данных

### Проблема 6: Сетевая недоступность Bitrix24
**Симптомы:** Невозможно обновить кеш при недоступности API
**Решение:**
- Graceful degradation (использование stale кеша)
- Circuit breaker pattern
- Retry logic с exponential backoff

---

## 🔗 Связанные документы

- [TASK-080: Исправление параметров кеширования](./TASK-080-fix-universal-cache-params.md)
- [TASK-076: Ручное управление кешем](./TASK-076-manual-cache-creation-with-notifications.md)
- [Архитектура кеширования](../ARCHITECTURE/cache-mechanism-dashboard-sector-1c.md)
- [GraphAdmissionClosureCache.php](../../../api/cache/GraphAdmissionClosureCache.php)

---

## 🚀 План развертывания

### Подготовка:
1. **Создание бэкапа** существующих кеш директорий
2. **Тестирование в staging** среде
3. **Проверка мониторинга** и логирования

### Порядок развертывания:

**Этап 1: Backend компоненты (Zero-downtime)**
```bash
# Деплой кеш-менеджеров
scp api/cache/DashboardSector1CCache.php server:/path/to/api/cache/
scp api/cache/GraphStateCache.php server:/path/to/api/cache/

# Деплой сервисов
scp api/services/DashboardSector1CService.php server:/path/to/api/services/
scp api/services/GraphStateService.php server:/path/to/api/services/
```

**Этап 2: API обновления**
```bash
# Обновление API endpoints
scp api/admin/cache-create.php server:/path/to/api/admin/
scp api/admin/cache-status.php server:/path/to/api/admin/
scp api/admin/cache-clear.php server:/path/to/api/admin/
```

**Этап 3: Frontend интеграция**
```bash
# Обновление сервисов
scp vue-app/src/services/dashboard-sector-1c/index.js server:/path/to/vue-app/src/services/dashboard-sector-1c/
scp vue-app/src/services/graph-state/SectorDataAdapter.js server:/path/to/vue-app/src/services/graph-state/
scp vue-app/src/services/cache-creation-service.js server:/path/to/vue-app/src/services/
```

**Этап 4: Перезапуск сервисов**
```bash
# Перезапуск PHP-FPM и веб-сервера
sudo systemctl restart php8.3-fpm
sudo systemctl restart nginx

# Очистка opcode кеша
php -r "opcache_reset();"
```

### План отката:

**При обнаружении проблем:**
```bash
# Откат API файлов
git checkout HEAD~1 api/admin/cache-*.php
git checkout HEAD~1 api/cache/DashboardSector1CCache.php
git checkout HEAD~1 api/cache/GraphStateCache.php
git checkout HEAD~1 api/services/DashboardSector1CService.php
git checkout HEAD~1 api/services/GraphStateService.php

# Очистка новых кеш файлов
rm -rf api/cache/dashboard-sector-1c/
rm -rf api/cache/graph-state/

# Перезапуск сервисов
sudo systemctl restart php8.3-fpm
sudo systemctl restart nginx
```

### Критерии успешности развертывания:

- ✅ Все API endpoints отвечают корректно
- ✅ Интерфейс "Управление кешем" показывает новые модули
- ✅ Возможность создавать/очищать кеш новых модулей
- ✅ Cache hit ratio > 80% после прогрева
- ✅ Нет ошибок в логах приложений

---

## 📊 История правок

- **2026-01-10 16:00 (UTC+3, Брест):** Создана задача на основе анализа кодовой базы
- **2026-01-10 16:30 (UTC+3, Брест):** Добавлены детальные спецификации компонентов и API
- **2026-01-10 17:00 (UTC+3, Брест):** Расширены разделы тестирования, мониторинга и безопасности
- **2026-01-10 17:30 (UTC+3, Брест):** Добавлен план развертывания и отката

---

**Автор:** Технический писатель и Аналитик
**Версия документа:** 2.0