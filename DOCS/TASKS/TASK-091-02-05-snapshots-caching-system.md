# TASK-091-02-05: Система слепков и кеширования для множественных секторов

**Дата создания:** 2026-01-12 19:20 (UTC+3, Брест)
**Оценка трудозатрат:** 12 часов

---

## 🎯 Цель задачи

Обновить систему слепков и кеширования для поддержки изоляции данных по секторам и обеспечения эффективной работы с множественными секторами.

---

## 📋 Основные компоненты

- [ ] `UniversalSnapshotService.js` - универсальный сервис слепков
- [ ] `SectorAwareCache.js` - кеш с поддержкой секторов
- [ ] `SnapshotMigrationManager.js` - миграция существующих слепков
- [ ] Обновление `GraphStateCache.php` для мультисекторности

### 💾 Детальная спецификация системы слепков

#### UniversalSnapshotService.js - универсальный сервис (120 строк)
```javascript
/**
 * Универсальный сервис для работы со слепками состояния секторов
 * Поддерживает изоляцию данных по секторам
 */
export class UniversalSnapshotService {
  constructor(sectorId) {
    this.sectorId = sectorId;
    this.apiBaseUrl = this.getApiBaseUrl();
    this.cache = new SectorAwareCache(sectorId);
  }

  /**
   * Создание нового слепка
   */
  async createSnapshot(snapshotData, metadata = {}) {
    const snapshot = {
      id: this.generateSnapshotId(),
      meta: {
        type: metadata.type || 'manual',
        created_at: new Date().toISOString(),
        version: '2.0',
        source: `sector_${this.sectorId}`,
        sectorId: this.sectorId,
        createdBy: metadata.createdBy || null,
        description: metadata.description || '',
        tags: metadata.tags || []
      },
      data: snapshotData
    };

    try {
      // Сохранение через API
      const response = await this.apiCall('create-snapshot', {
        method: 'POST',
        body: JSON.stringify(snapshot)
      });

      // Кеширование
      this.cache.set(`snapshot:${snapshot.id}`, snapshot, 1800); // 30 мин

      return snapshot;
    } catch (error) {
      console.error(`Failed to create snapshot for sector ${this.sectorId}:`, error);
      throw error;
    }
  }

  /**
   * Получение слепков по типам
   */
  async getSnapshotsByTypes(types, sectorId = this.sectorId) {
    const cacheKey = `snapshots:types:${types.sort().join(',')}`;

    // Проверка кеша
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.apiCall('snapshots-meta', {
        method: 'GET',
        params: { sectorId, types: types.join(',') }
      });

      const snapshots = response.snapshots || [];
      this.cache.set(cacheKey, snapshots, 900); // 15 мин

      return snapshots;
    } catch (error) {
      console.error(`Failed to get snapshots for sector ${sectorId}:`, error);
      throw error;
    }
  }

  /**
   * Получение слепка по ID
   */
  async getSnapshotById(snapshotId) {
    const cacheKey = `snapshot:${snapshotId}`;

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.apiCall(`snapshot/${snapshotId}`);
      this.cache.set(cacheKey, response.snapshot, 1800);
      return response.snapshot;
    } catch (error) {
      console.error(`Failed to get snapshot ${snapshotId}:`, error);
      throw error;
    }
  }

  /**
   * Удаление слепка
   */
  async deleteSnapshot(snapshotId) {
    try {
      await this.apiCall(`snapshot/${snapshotId}`, { method: 'DELETE' });
      this.cache.invalidate(`snapshot:${snapshotId}`);
      this.cache.invalidatePattern('snapshots:*');
    } catch (error) {
      console.error(`Failed to delete snapshot ${snapshotId}:`, error);
      throw error;
    }
  }

  /**
   * Получение списка слепков сектора
   */
  async getSectorSnapshots(limit = 50, offset = 0) {
    const cacheKey = `sector:snapshots:${limit}:${offset}`;

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.apiCall('snapshots', {
        method: 'GET',
        params: { sectorId: this.sectorId, limit, offset }
      });

      this.cache.set(cacheKey, response.snapshots, 600); // 10 мин
      return response.snapshots;
    } catch (error) {
      console.error(`Failed to get sector snapshots for ${this.sectorId}:`, error);
      throw error;
    }
  }

  /**
   * Очистка кеша сектора
   */
  clearSectorCache() {
    this.cache.clear();
  }

  /**
   * Генерация уникального ID слепка
   */
  generateSnapshotId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `snap_${this.sectorId}_${timestamp}_${random}`;
  }

  /**
   * Универсальный API вызов
   */
  async apiCall(endpoint, options = {}) {
    const url = new URL(`${this.apiBaseUrl}/api/graph-state/${endpoint}`);

    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Получение базового URL API
   */
  getApiBaseUrl() {
    // Логика определения базового URL
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return process.env.API_BASE_URL || 'http://localhost:8000';
  }
}
```

#### SectorAwareCache.js - кеш с поддержкой секторов (80 строк)
```javascript
/**
 * Кеш с поддержкой изоляции по секторам
 * Предотвращает конфликты данных между секторами
 */
export class SectorAwareCache {
  constructor(sectorId, options = {}) {
    this.sectorId = sectorId;
    this.storage = options.storage || new Map();
    this.defaultTtl = options.defaultTtl || 300; // 5 минут
    this.maxSize = options.maxSize || 1000;
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 минута

    // Периодическая очистка устаревших данных
    this.startCleanupInterval();
  }

  /**
   * Установка значения в кеш
   */
  set(key, value, ttl = this.defaultTtl) {
    const sectorKey = this.getSectorKey(key);
    const expiresAt = Date.now() + (ttl * 1000);

    // Проверка размера кеша
    if (this.storage.size >= this.maxSize) {
      this.evictOldEntries();
    }

    this.storage.set(sectorKey, {
      value,
      expiresAt,
      createdAt: Date.now()
    });
  }

  /**
   * Получение значения из кеша
   */
  get(key) {
    const sectorKey = this.getSectorKey(key);
    const entry = this.storage.get(sectorKey);

    if (!entry) return null;

    // Проверка срока действия
    if (Date.now() > entry.expiresAt) {
      this.storage.delete(sectorKey);
      return null;
    }

    return entry.value;
  }

  /**
   * Удаление значения из кеша
   */
  delete(key) {
    const sectorKey = this.getSectorKey(key);
    return this.storage.delete(sectorKey);
  }

  /**
   * Очистка всего кеша сектора
   */
  clear() {
    const sectorPrefix = `${this.sectorId}:`;
    const keysToDelete = [];

    for (const key of this.storage.keys()) {
      if (key.startsWith(sectorPrefix)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.storage.delete(key));
  }

  /**
   * Инвалидация по паттерну
   */
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete = [];

    for (const key of this.storage.keys()) {
      if (key.startsWith(`${this.sectorId}:`) && regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.storage.delete(key));
  }

  /**
   * Получение статистики кеша
   */
  getStats() {
    const sectorPrefix = `${this.sectorId}:`;
    let totalEntries = 0;
    let expiredEntries = 0;
    const now = Date.now();

    for (const [key, entry] of this.storage.entries()) {
      if (key.startsWith(sectorPrefix)) {
        totalEntries++;
        if (now > entry.expiresAt) {
          expiredEntries++;
        }
      }
    }

    return {
      sectorId: this.sectorId,
      totalEntries,
      expiredEntries,
      activeEntries: totalEntries - expiredEntries,
      hitRate: this.calculateHitRate()
    };
  }

  /**
   * Генерация ключа с префиксом сектора
   */
  getSectorKey(key) {
    return `${this.sectorId}:${key}`;
  }

  /**
   * Очистка устаревших записей
   */
  evictOldEntries() {
    const now = Date.now();
    const entries = Array.from(this.storage.entries());

    // Сортировка по времени создания (старые первые)
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt);

    // Удаление 20% самых старых записей
    const toDelete = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toDelete; i++) {
      this.storage.delete(entries[i][0]);
    }
  }

  /**
   * Расчет процента попаданий в кеш
   */
  calculateHitRate() {
    // Заглушка - в реальности нужно отслеживать запросы
    return 0.85; // 85% попаданий
  }

  /**
   * Запуск интервала очистки
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Ручная очистка устаревших данных
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, entry] of this.storage.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.storage.delete(key));
  }
}
```

#### SnapshotMigrationManager.js - миграция слепков (90 строк)
```javascript
/**
 * Менеджер миграции слепков при переходе на мультисекторную архитектуру
 */
export class SnapshotMigrationManager {
  static async migrateExistingSnapshots() {
    const existingSnapshots = await this.loadAllExistingSnapshots();
    let migratedCount = 0;
    let errorCount = 0;

    console.log(`[Migration] Starting migration of ${existingSnapshots.length} snapshots...`);

    for (const snapshot of existingSnapshots) {
      try {
        if (!this.isMigrated(snapshot)) {
          const migratedSnapshot = await this.migrateSnapshot(snapshot);
          await this.saveMigratedSnapshot(migratedSnapshot);
          migratedCount++;
        }
      } catch (error) {
        console.error(`[Migration] Failed to migrate snapshot ${snapshot.id}:`, error);
        errorCount++;
      }
    }

    console.log(`[Migration] Completed: ${migratedCount} migrated, ${errorCount} errors`);
    return { migratedCount, errorCount };
  }

  static isMigrated(snapshot) {
    return snapshot.meta &&
           snapshot.meta.version === '2.0' &&
           snapshot.meta.sectorId;
  }

  static async migrateSnapshot(snapshot) {
    const sectorId = await this.detectSector(snapshot);

    return {
      ...snapshot,
      meta: {
        ...snapshot.meta,
        version: '2.0',
        sectorId,
        migrated: true,
        migratedAt: new Date().toISOString()
      }
    };
  }

  static async detectSector(snapshot) {
    // Определение сектора по структуре данных
    const data = snapshot.data;

    // Проверка стадий специфичных для сектора 1С
    if (data.stages && data.stages.some(stage =>
      stage.id?.startsWith('DT140_12:')
    )) {
      return '1C';
    }

    // Анализ других характеристик
    if (data.zeroPointTickets && Array.isArray(data.zeroPointTickets)) {
      return '1C'; // По умолчанию для старых слепков
    }

    return 'unknown';
  }

  static async loadAllExistingSnapshots() {
    // Загрузка всех существующих слепков
    try {
      const response = await fetch('/api/graph-state/snapshots?all=true');
      const data = await response.json();
      return data.snapshots || [];
    } catch (error) {
      console.error('[Migration] Failed to load existing snapshots:', error);
      return [];
    }
  }

  static async saveMigratedSnapshot(snapshot) {
    try {
      const response = await fetch(`/api/graph-state/snapshot/${snapshot.id}/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot)
      });

      if (!response.ok) {
        throw new Error(`Migration save failed: ${response.status}`);
      }
    } catch (error) {
      console.error(`[Migration] Failed to save migrated snapshot ${snapshot.id}:`, error);
      throw error;
    }
  }

  /**
   * Резервное копирование слепков перед миграцией
   */
  static async createBackup() {
    try {
      const snapshots = await this.loadAllExistingSnapshots();
      const backupData = {
        createdAt: new Date().toISOString(),
        version: '1.0',
        snapshots
      };

      const response = await fetch('/api/graph-state/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData)
      });

      return response.ok;
    } catch (error) {
      console.error('[Migration] Failed to create backup:', error);
      return false;
    }
  }

  /**
   * Восстановление из резервной копии
   */
  static async restoreFromBackup(backupId) {
    try {
      const response = await fetch(`/api/graph-state/backup/${backupId}/restore`, {
        method: 'POST'
      });

      return response.ok;
    } catch (error) {
      console.error('[Migration] Failed to restore from backup:', error);
      return false;
    }
  }
}
```

### 🔄 Обновление GraphStateCache.php

**Текущая структура:**
```php
class GraphStateCache {
    const CACHE_DIR = '/cache/graph-state/';
    const TTL_CURRENT = 600;    // 10 минут
    const TTL_SNAPSHOTS = 3600; // 1 час

    public static function getSnapshotData($type) {
        $file = self::CACHE_DIR . "snapshot_{$type}.json";
        // Чтение из файла
    }

    public static function setSnapshotData($data, $type, $ttl) {
        $file = self::CACHE_DIR . "snapshot_{$type}.json";
        // Запись в файл
    }
}
```

**Обновленная структура:**
```php
class GraphStateCache {
    const CACHE_DIR = '/cache/graph-state/';
    const TTL_CURRENT = 600;    // 10 минут
    const TTL_SNAPSHOTS = 3600; // 1 час

    /**
     * Получение данных слепка с поддержкой секторов
     */
    public static function getSnapshotData($type, $sectorId = null) {
        $fileName = $sectorId ?
            "snapshot_{$sectorId}_{$type}.json" :
            "snapshot_{$type}.json"; // Для обратной совместимости

        $file = self::CACHE_DIR . $fileName;

        if (!file_exists($file)) {
            return null;
        }

        $data = json_decode(file_get_contents($file), true);

        // Проверка срока действия
        if (isset($data['expiresAt']) && time() > $data['expiresAt']) {
            unlink($file); // Удаление устаревшего файла
            return null;
        }

        return $data['snapshot'] ?? null;
    }

    /**
     * Сохранение данных слепка с поддержкой секторов
     */
    public static function setSnapshotData($snapshot, $type, $ttl, $sectorId = null) {
        $fileName = $sectorId ?
            "snapshot_{$sectorId}_{$type}.json" :
            "snapshot_{$type}.json";

        $file = self::CACHE_DIR . $fileName;

        $data = [
            'snapshot' => $snapshot,
            'createdAt' => time(),
            'expiresAt' => time() + $ttl,
            'sectorId' => $sectorId,
            'type' => $type
        ];

        // Создание директории если не существует
        $dir = dirname($file);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
    }

    /**
     * Очистка кеша для сектора
     */
    public static function clearSectorCache($sectorId) {
        $pattern = self::CACHE_DIR . "snapshot_{$sectorId}_*.json";
        $files = glob($pattern);

        foreach ($files as $file) {
            unlink($file);
        }
    }

    /**
     * Получение статистики кеша
     */
    public static function getCacheStats() {
        $files = glob(self::CACHE_DIR . "*.json");
        $stats = [
            'totalFiles' => count($files),
            'totalSize' => 0,
            'sectors' => []
        ];

        foreach ($files as $file) {
            $stats['totalSize'] += filesize($file);

            // Извлечение информации о секторе из имени файла
            $filename = basename($file, '.json');
            if (preg_match('/snapshot_([^_]+)_(.+)/', $filename, $matches)) {
                $sectorId = $matches[1];
                if (!isset($stats['sectors'][$sectorId])) {
                    $stats['sectors'][$sectorId] = 0;
                }
                $stats['sectors'][$sectorId]++;
            }
        }

        return $stats;
    }
}
```

---

## 🔗 Зависимости

- [ ] TASK-091-02-02: Универсальный API
- [ ] TASK-091-02-04: Адаптеры данных