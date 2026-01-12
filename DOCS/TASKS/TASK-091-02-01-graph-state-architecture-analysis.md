# TASK-091-02-01: Анализ архитектуры и зависимостей модуля "График состояния"

**Дата создания:** 2026-01-12 19:00 (UTC+3, Брест)
**Версия:** 1.0
**Статус:** Готово к разработке 📋
**Приоритет:** Высокий
**Исполнитель:** Frontend Developer (Vue.js) + Bitrix24 Developer
**Родительская задача:** [TASK-091-02: Рефакторинг модуля "График состояния"](./TASK-091-02-graph-state-module-analysis.md)
**Связанные задачи:** TASK-091-01 (анализ DashboardSector1C)
**Оценка трудозатрат:** 8 часов

---

## 🎯 Цель задачи

Провести полный аудит архитектуры модуля "График состояния", задокументировать все зависимости, точки интеграции и конфигурационные параметры для безопасного рефакторинга в многосекторную архитектуру.

---

## 📋 Результаты анализа

### 🔍 **Архитектурный аудит завершен**
- [x] Анализ всех Vue компонентов и их зависимостей
- [x] Аудит JavaScript/TypeScript сервисов
- [x] Проверка PHP backend сервисов
- [x] Документирование API контрактов
- [x] Идентификация конфигурационных параметров
- [x] Анализ точек интеграции с другими модулями

### 📊 **Ключевые findings:**

#### 1. **Монолитная архитектура компонентов**
- `GraphStateChart.vue`: 2000+ строк кода в одном файле
- Смешивание 4 типов графиков в одном компоненте
- 50+ пропсов для конфигурации
- 30+ методов для разных типов операций
- Отсутствие модульной структуры

#### 2. **Жесткая привязка к сектору 1С**
```javascript
// Жесткая зависимость в GraphStateService.php
public static function loadSnapshotData(string $type, bool $forceRefresh = false): array
{
    $sectorData = DashboardSector1CService::getSectorDataCached([
        'forceRefresh' => $forceRefresh,
        'ttl' => 600
    ]);
    // Только сектор 1С!
}
```

#### 3. **Сложная система слепков**
- **4 типа слепков:** `week_start`, `week_end`, `manual`, `current`
- **Мета-информация:** creator, timestamp, version, source
- **JSON хранение:** Файловая система с именованием по типу и дате
- **API endpoints:** Создание, чтение, сравнение слепков

#### 4. **Многоуровневая система кеширования**
```php
// Backend кеш (PHP)
class GraphStateCache {
    const TTL_CURRENT = 600;    // 10 минут для current
    const TTL_SNAPSHOTS = 3600; // 1 час для snapshots
    const TTL_WEEK_DATA = 7200; // 2 часа для недельных данных
}
```
```javascript
// Frontend кеш (Vue composable)
const cacheConfig = {
  tickets: { ttl: 300 },      // 5 минут
  snapshots: { ttl: 1800 },   // 30 минут
  chartData: { ttl: 600 }     // 10 минут
};
```

#### 5. **4 типа визуализаций графиков**
- **Линейный:** Сравнение значений по времени
- **Столбчатый:** Распределение по категориям/сотрудникам
- **Кольцевой:** Пропорциональное распределение по стадиям
- **Комбинированный:** Сочетание линейного и столбчатого

#### 6. **Конфигурационные зависимости**
- **Chart.js:** Библиотека визуализации (версия, плагины)
- **Date handling:** moment.js или date-fns
- **Color schemes:** Темизация и цветовые палитры
- **Animation settings:** Настройки анимаций переходов

#### 7. **API контракты и интерфейсы**
```typescript
interface SnapshotData {
  meta: SnapshotMeta;
  data: SectorData;
}

interface SnapshotMeta {
  type: 'week_start' | 'week_end' | 'manual' | 'current';
  created_at: string;
  version: string;
  source: string;
  createdBy: { id: number; name: string };
  sectorId?: string; // Новое поле для мультисекторности
}
```

#### 8. **Точки интеграции с другими модулями**
- **DashboardSector1C:** Источник данных сектора
- **Navigation system:** Breadcrumbs, back button
- **Cache system:** Общий менеджер кеша
- **Logging system:** Централизованное логирование
- **Access control:** Проверка прав администратора

---

## 🏗️ **Документированная архитектура**

### Компонентная структура
```
GraphStateDashboard.vue (главный контейнер)
├── LoadingSpinner.vue (прелоадер)
├── Error handling (встроенный)
├── Breadcrumbs (навигация)
├── BackButton (кнопка назад)
├── GraphStateChart.vue (ОСНОВНОЙ КОМПОНЕНТ - 2000+ строк)
│   ├── Chart type selector (переключатель типов)
│   ├── Comparison type selector (тип сравнения)
│   ├── Chart canvas (область рисования)
│   ├── Legend (легенда)
│   └── Tooltips (всплывающие подсказки)
├── LoggerControl (отладка)
└── DiagnosticsPanel (диагностика)
```

### Детальная сервисная архитектура

#### Frontend Services Layer
```
vue-app/src/services/graph-state/
├── useGraphState.js (главный composable)
│   ├── Управление состоянием компонентов
│   ├── Загрузка данных слепков
│   ├── Создание новых слепков
│   └── Обработка ошибок
├── SnapshotService.js (управление слепками)
│   ├── createSnapshot(data, type, metadata)
│   ├── getSnapshotsByTypes(types[])
│   ├── getSnapshotById(id)
│   └── deleteSnapshot(id)
├── SectorDataAdapter.js (адаптация данных)
│   ├── adaptSectorData(sectorData)
│   ├── normalizeStages(stages)
│   └── calculateMetrics(data)
├── snapshot-normalizer.js (нормализация)
│   ├── normalizeSnapshotData(data, type)
│   ├── validateSnapshotStructure(data)
│   └── enrichSnapshotMetadata(data, metadata)
└── chart/
    ├── ChartDataProcessor.js (обработка для графиков)
    ├── ChartConfigBuilder.js (построение конфигов)
    └── ChartRenderer.js (рендеринг графиков)
```

#### Backend Services Layer
```
api/services/
├── GraphStateService.php (кеширование)
│   ├── getSnapshotDataCached(params)
│   ├── loadSnapshotData(type, forceRefresh)
│   └── normalizeSectorDataToSnapshot(sectorData, type)
├── GraphStateCache.php (файловый кеш)
│   ├── CACHE_DIR = '/cache/graph-state/'
│   ├── setSnapshotData(data, type, ttl)
│   ├── getSnapshotData(type)
│   └── invalidateCache()
└── DashboardSector1CService.php (ЖЕСТКАЯ ЗАВИСИМОСТЬ)
    ├── ENTITY_TYPE_ID = 140
    ├── SECTOR_TAG = '1C'
    └── getSectorDataCached(params)
```

#### API Endpoints
```php
// Получение данных слепков с кешированием
GET|POST /api/graph-state/snapshots
- type: string (current|week_start|week_end)
- forceRefresh: boolean
- sectorId?: string (для мультисекторности)

// Создание нового слепка
POST /api/graph-state/create-snapshot
{
  "sectorData": {...},
  "type": "week_start",
  "metadata": {
    "createdBy": {"id": 123, "name": "Иван Иванов"},
    "sectorId": "1C"
  }
}

// Удаление слепка
DELETE /api/graph-state/snapshot/{id}

// Получение метаданных всех слепков
GET /api/graph-state/snapshots-meta
- sectorId?: string
```

### API контракты
```typescript
// Создание слепка
POST /api/graph-state/create-snapshot
{
  sectorData: SectorData,
  type: 'week_start' | 'week_end' | 'manual' | 'current',
  metadata: {
    createdBy: { id: number, name: string },
    sectorId: string
  }
}

// Получение слепков для графика
GET /api/graph-state/snapshots?sector=1c&type[]=week_start&type[]=week_end
```

---

## ⚠️ **Детальный анализ зависимостей**

### 🚨 Критические зависимости (блокирующие рефакторинг)

#### 1. **Жесткая привязка к DashboardSector1CService**
```javascript
// Текущая реализация в GraphStateService.php
public static function loadSnapshotData(string $type, bool $forceRefresh = false): array
{
    // ЖЕСТКАЯ ЗАВИСИМОСТЬ - только сектор 1С!
    $sectorData = DashboardSector1CService::getSectorDataCached([
        'forceRefresh' => $forceRefresh,
        'ttl' => 600
    ]);

    return self::normalizeSectorDataToSnapshot($sectorData, $type);
}
```

**Последствия:** Невозможно использовать модуль для других секторов без изменения API

#### 2. **Фильтрация по UF_CRM_7_TYPE_PRODUCT = '1C'**
```javascript
// В DashboardSector1CService.php
const SECTOR_TAG = '1C';
// Фильтр: UF_CRM_7_TYPE_PRODUCT = '1C'
```

**Последствия:** Данные других секторов будут исключены из обработки

#### 3. **Фиксированные стадии смарт-процесса 140**
```javascript
// Жестко заданные стадии только для сектора 1С
const STAGES = {
  FORMED: { id: 'DT140_12:UC_0VHWE2', name: 'Сформировано обращение' },
  REVIEW: { id: 'DT140_12:PREPARATION', name: 'Рассмотрение ТЗ' },
  EXECUTION: { id: 'DT140_12:CLIENT', name: 'Исполнение' }
};
```

**Последствия:** Невозможно адаптировать под другие сектора с разными стадиями

#### 4. **Специфическая структура данных сектора 1С**
```javascript
// Ожидаемая структура данных
{
  stages: {
    'DT140_12:UC_0VHWE2': { tickets: [...], employees: [...] },
    'DT140_12:PREPARATION': { tickets: [...], employees: [...] },
    'DT140_12:CLIENT': { tickets: [...], employees: [...] }
  },
  employees: [...],
  zeroPointTickets: [...]
}
```

**Последствия:** Другие сектора могут иметь другую структуру данных

### ⚠️ Высокоуровневые зависимости

#### 5. **Библиотека Chart.js**
- Версия: Требуется проверка совместимости
- Плагины: Необходимые расширения для разных типов графиков
- Темизация: Кастомные цветовые схемы

#### 6. **Система кеширования**
```javascript
// Многоуровневое кеширование
- GraphStateCache.php (Backend, файлы)
- useGraphState.js (Frontend, memory)
- Browser Cache API (опционально)
```

#### 7. **Система логирования**
- LoggerControl.vue (отладочный компонент)
- Централизованное логирование через Logger
- Диагностическая панель для администраторов

#### 8. **Навигационная система**
- Breadcrumbs: Главная / График состояния
- BackButton: Навигация назад
- Route guards: Защита маршрутов

### ✅ Некритические зависимости

#### 9. **UI компоненты**
- LoadingSpinner.vue (можно заменить)
- Error handling (стандартный механизм)
- Modal dialogs (встроенные)

#### 10. **Вспомогательные утилиты**
- Date formatting (moment.js → date-fns)
- Color utilities (можно заменить)
- Animation helpers (CSS transitions)

### Некритические зависимости:
- Chart.js library (можно заменить)
- Moment.js (можно заменить на date-fns)
- Локальное хранилище для настроек

---

## 📋 **Детальный план безопасного рефакторинга**

### Фаза 1: Подготовка и анализ (2 дня)

#### 1.1 Создание интерфейсов абстракции
```typescript
// IGraphStateService.ts - Интерфейс для всех сервисов графиков
interface IGraphStateService {
  getSectorData(options?: any): Promise<SectorData>;
  createSnapshot(type: string, metadata: any): Promise<Snapshot>;
  getSnapshots(types: string[]): Promise<Snapshot[]>;
  getStagesConfig(): StageConfig[];
  getMetricsConfig(): MetricConfig[];
}

// ISectorDataAdapter.ts - Интерфейс адаптеров данных
interface ISectorDataAdapter {
  adaptSectorData(sectorData: any): AdaptedSectorData;
  normalizeStages(stages: any[]): NormalizedStage[];
  calculateMetrics(data: any): MetricsData;
  getStagesConfig(): StageConfig[];
  getFilterConfig(): FilterConfig;
}
```

#### 1.2 Feature flags для безопасного перехода
```javascript
// config/feature-flags.js
export const GRAPH_STATE_FEATURE_FLAGS = {
  MULTI_SECTOR_SUPPORT: false,    // Включение мультисекторности
  NEW_CHART_COMPONENTS: false,    // Новые компоненты графиков
  UNIVERSAL_API: false,           // Универсальный API
  SNAPSHOT_MIGRATION: false       // Миграция слепков
};

// Условная логика в компонентах
if (GRAPH_STATE_FEATURE_FLAGS.MULTI_SECTOR_SUPPORT) {
  // Новая универсальная логика
  return UniversalGraphStateService.getSectorData(sectorId);
} else {
  // Старая логика для обратной совместимости
  return DashboardSector1CService.getSectorData();
}
```

#### 1.3 Создание абстрактных адаптеров
```javascript
// AbstractSectorAdapter.js
export class AbstractSectorAdapter {
  constructor(sectorConfig) {
    this.sectorConfig = sectorConfig;
  }

  // Абстрактные методы
  adaptSectorData(sectorData) {
    throw new Error('adaptSectorData must be implemented');
  }

  getStagesConfig() {
    throw new Error('getStagesConfig must be implemented');
  }

  getFilterConfig() {
    return {
      field: this.sectorConfig.filterField || 'UF_CRM_7_TYPE_PRODUCT',
      value: this.sectorConfig.sectorTag,
      altValues: this.sectorConfig.altTags || []
    };
  }

  // Общие методы
  normalizeStages(stages) {
    return stages.map(stage => ({
      id: stage.id,
      name: stage.name || stage.id,
      color: stage.color || '#666',
      ticketsCount: stage.tickets?.length || 0,
      employeesCount: stage.employees?.length || 0
    }));
  }
}

// Sector1CAdapter.js - адаптер для обратной совместимости
export class Sector1CAdapter extends AbstractSectorAdapter {
  adaptSectorData(sectorData) {
    // Адаптация данных сектора 1С под универсальный формат
    return {
      stages: sectorData.stages,
      employees: sectorData.employees,
      zeroPointTickets: sectorData.zeroPointTickets,
      metrics: this.calculateSector1CMetrics(sectorData)
    };
  }

  getStagesConfig() {
    return [
      { id: 'DT140_12:UC_0VHWE2', name: 'Сформировано обращение', color: '#007bff' },
      { id: 'DT140_12:PREPARATION', name: 'Рассмотрение ТЗ', color: '#ffc107' },
      { id: 'DT140_12:CLIENT', name: 'Исполнение', color: '#28a745' }
    ];
  }

  calculateSector1CMetrics(data) {
    // Специфичные метрики для сектора 1С
    return {
      totalTickets: data.zeroPointTickets.length + Object.values(data.stages).reduce((sum, stage) => sum + stage.tickets.length, 0),
      activeEmployees: data.employees.length,
      stagesCount: Object.keys(data.stages).length
    };
  }
}
```

### Фаза 2: Модуляризация компонентов (3 дня)

#### 2.1 Декомпозиция GraphStateChart.vue
```javascript
// Исходный монолит (2000+ строк)
export default {
  name: 'GraphStateChart',
  props: ['snapshots', 'chartType', 'comparisonType', /* 50+ props */],
  methods: {
    // 30+ методов для разных типов графиков
    prepareLineChartData() { /* 50 строк */ },
    prepareBarChartData() { /* 40 строк */ },
    prepareDoughnutChartData() { /* 30 строк */ },
    renderLineChart() { /* 80 строк */ },
    renderBarChart() { /* 60 строк */ },
    // ...
  }
}

// Рефакторинг: разделение на модули
// components/graph-state/charts/
├── BaseChart.vue           // Базовый компонент графика (50 строк)
├── LineChart.vue           // Линейный график (30 строк)
├── BarChart.vue            // Столбчатый график (25 строк)
├── DoughnutChart.vue       // Кольцевой график (20 строк)
└── ComboChart.vue          // Комбинированный график (40 строк)

// components/graph-state/controls/
├── ChartTypeSelector.vue   // Переключатель типов (15 строк)
├── ComparisonSelector.vue  // Выбор сравнения (20 строк)
└── ChartSettings.vue       // Настройки (25 строк)

// components/graph-state/ui/
├── ChartContainer.vue      // Контейнер (35 строк)
├── ChartLegend.vue         // Легенда (30 строк)
├── ChartTooltip.vue        // Подсказки (25 строк)
└── ChartZoom.vue           // Масштабирование (20 строк)
```

#### 2.2 Создание ChartFactory с ленивой загрузкой
```javascript
// ChartFactory.js
export class ChartFactory {
  static chartComponents = new Map();
  static preloadedComponents = new Set();

  static registerChart(type, componentLoader) {
    this.chartComponents.set(type, componentLoader);
  }

  static async createChartComponent(type, props = {}) {
    const componentLoader = this.chartComponents.get(type);

    if (!componentLoader) {
      throw new Error(`Chart type "${type}" not registered`);
    }

    try {
      // Ленивая загрузка компонента
      const module = await componentLoader();
      return module.default;
    } catch (error) {
      console.error(`Failed to load chart component "${type}":`, error);
      // Fallback to base chart
      return (await import('./charts/BaseChart.vue')).default;
    }
  }

  static preloadChart(type) {
    // Предварительная загрузка для лучшей производительности
    if (this.preloadedComponents.has(type)) return;

    const componentLoader = this.chartComponents.get(type);
    if (componentLoader) {
      componentLoader().then(() => {
        this.preloadedComponents.add(type);
      }).catch(error => {
        console.warn(`Failed to preload chart component "${type}":`, error);
      });
    }
  }

  static preloadCommonCharts() {
    // Предварительная загрузка наиболее используемых графиков
    ['line', 'bar', 'combo'].forEach(type => this.preloadChart(type));
  }
}

// Регистрация компонентов
ChartFactory.registerChart('line', () => import('./charts/LineChart.vue'));
ChartFactory.registerChart('bar', () => import('./charts/BarChart.vue'));
ChartFactory.registerChart('doughnut', () => import('./charts/DoughnutChart.vue'));
ChartFactory.registerChart('combo', () => import('./charts/ComboChart.vue'));
```

### Фаза 3: Универсализация API (3 дня)

#### 3.1 Создание универсального сервиса
```javascript
// UniversalGraphStateService.js
export class UniversalGraphStateService {
  constructor(sectorId) {
    this.sectorId = sectorId;
    this.sectorConfig = SectorConfigFactory.getConfig(sectorId);
    this.adapter = this.createAdapter(sectorId);
    this.snapshotService = new UniversalSnapshotService(sectorId);
    this.cache = new SectorAwareCache(sectorId);
  }

  createAdapter(sectorId) {
    // Создание адаптера на основе типа сектора
    const adapterMap = {
      '1c': () => new Sector1CAdapter(this.sectorConfig),
      'pdm': () => new SectorPDMAdapter(this.sectorConfig),
      'bitrix24': () => new SectorBitrix24Adapter(this.sectorConfig),
      'infrastructure': () => new SectorInfrastructureAdapter(this.sectorConfig)
    };

    const adapterFactory = adapterMap[sectorId];
    if (!adapterFactory) {
      throw new Error(`Unknown sector: ${sectorId}`);
    }

    return adapterFactory();
  }

  async getSectorData(options = {}) {
    const cacheKey = `sectorData:${JSON.stringify(options)}`;

    // Проверяем кеш
    if (!options.forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      // Получение данных сектора через универсальный API
      const rawData = await SectorDataService.getSectorData(this.sectorId, options);

      // Адаптация данных под нужды графиков
      const adaptedData = this.adapter.adaptSectorData(rawData);

      // Кешируем результат
      this.cache.set(cacheKey, adaptedData, 300); // 5 минут

      return adaptedData;
    } catch (error) {
      console.error(`Failed to get sector data for ${this.sectorId}:`, error);
      throw error;
    }
  }

  async createSnapshot(type, metadata = {}) {
    const sectorData = await this.getSectorData();
    const snapshotData = this.adapter.normalizeForSnapshot(sectorData, type);

    return this.snapshotService.createSnapshot(snapshotData, {
      ...metadata,
      sectorId: this.sectorId,
      createdAt: new Date().toISOString()
    });
  }

  async getSnapshotsForChart(types) {
    return this.snapshotService.getSnapshotsByTypes(types, this.sectorId);
  }

  getStagesConfig() {
    return this.adapter.getStagesConfig();
  }

  getMetricsConfig() {
    return this.adapter.getMetricsConfig();
  }

  // Метод для принудительной очистки кеша сектора
  clearCache() {
    this.cache.clear();
  }
}
```

#### 3.2 Обновление useGraphState composable
```javascript
// useUniversalGraphState.js
import { ref, computed } from 'vue';
import { UniversalGraphStateService } from '@/services/graph-state/UniversalGraphStateService.js';
import { useNotifications } from './useNotifications.js';

export function useUniversalGraphState(sectorId) {
  const service = ref(null);
  const isLoading = ref(false);
  const error = ref(null);
  const notifications = useNotifications();

  // Инициализация сервиса
  const initService = () => {
    if (!service.value) {
      service.value = new UniversalGraphStateService(sectorId);
    }
    return service.value;
  };

  // Универсальная логика для любого сектора
  const loadSectorData = async (options = {}) => {
    const svc = initService();
    isLoading.value = true;
    error.value = null;

    try {
      const data = await svc.getSectorData(options);
      return data;
    } catch (err) {
      error.value = err;
      notifications.error('Ошибка загрузки данных сектора', err.message);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const createSnapshot = async (type, metadata = {}) => {
    const svc = initService();

    try {
      const snapshot = await svc.createSnapshot(type, metadata);
      notifications.success('Слепок создан', `Слепок "${type}" успешно создан`);
      return snapshot;
    } catch (err) {
      notifications.error('Ошибка создания слепка', err.message);
      throw err;
    }
  };

  const getSnapshotsForChart = async (types) => {
    const svc = initService();

    try {
      return await svc.getSnapshotsForChart(types);
    } catch (err) {
      notifications.error('Ошибка загрузки слепков', err.message);
      throw err;
    }
  };

  // Вычисляемые свойства
  const stagesConfig = computed(() => {
    const svc = service.value;
    return svc ? svc.getStagesConfig() : [];
  });

  const metricsConfig = computed(() => {
    const svc = service.value;
    return svc ? svc.getMetricsConfig() : {};
  });

  const clearCache = () => {
    const svc = service.value;
    if (svc) svc.clearCache();
  };

  return {
    // Состояние
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Методы
    loadSectorData,
    createSnapshot,
    getSnapshotsForChart,
    clearCache,

    // Конфигурации
    stagesConfig,
    metricsConfig
  };
}
```

### Фаза 4: Миграция и оптимизация (2 дня)

#### 4.1 Миграция существующих слепков
```javascript
// SnapshotMigrationService.js
export class SnapshotMigrationService {
  static async migrateExistingSnapshots() {
    const existingSnapshots = await this.getAllExistingSnapshots();
    let migratedCount = 0;
    let errorCount = 0;

    console.log(`Starting migration of ${existingSnapshots.length} snapshots...`);

    for (const snapshot of existingSnapshots) {
      try {
        if (!snapshot.meta.sectorId) {
          // Автоматическая миграция для старых слепков
          snapshot.meta.sectorId = await this.detectSector(snapshot.data);
          snapshot.meta.migrated = true;
          snapshot.meta.migratedAt = new Date().toISOString();
          snapshot.meta.version = '2.0'; // Новая версия формата

          await this.saveMigratedSnapshot(snapshot);
          migratedCount++;
        }
      } catch (error) {
        console.error(`Failed to migrate snapshot ${snapshot.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Migration completed: ${migratedCount} migrated, ${errorCount} errors`);
    return { migratedCount, errorCount };
  }

  static async detectSectorFromSnapshot(snapshot) {
    // Логика определения сектора по структуре данных слепка
    const data = snapshot.data;

    // Проверяем наличие стадий характерных для сектора 1С
    if (data.stages && data.stages['DT140_12:UC_0VHWE2']) {
      return '1C';
    }

    // Анализ других характеристик
    if (data.zeroPointTickets && Array.isArray(data.zeroPointTickets)) {
      // Типичная структура для сектора 1С
      return '1C';
    }

    // По умолчанию - сектор 1С для обратной совместимости
    return '1C';
  }

  static async getAllExistingSnapshots() {
    // Получение всех существующих слепков из файловой системы
    // Реализация зависит от текущего хранилища
    return SnapshotService.getAllSnapshots();
  }

  static async saveMigratedSnapshot(snapshot) {
    // Сохранение миграционного слепка
    const fileName = this.generateMigratedFileName(snapshot);
    const filePath = `/cache/graph-state/${fileName}`;

    await this.writeJsonFile(filePath, snapshot);
  }

  static generateMigratedFileName(snapshot) {
    const type = snapshot.meta.type;
    const timestamp = new Date(snapshot.meta.created_at).getTime();
    const sectorId = snapshot.meta.sectorId;

    return `snapshot_${sectorId}_${type}_${timestamp}_v2.json`;
  }
}
```

#### 4.2 Оптимизация производительности
```javascript
// PerformanceOptimizer.js
export class GraphPerformanceOptimizer {
  // Оптимизация данных для больших графиков
  static optimizeChartData(data, maxPoints = 1000) {
    if (!Array.isArray(data) || data.length <= maxPoints) {
      return data;
    }

    // Семплирование данных с сохранением ключевых точек
    const step = Math.floor(data.length / maxPoints);
    const optimized = [];

    for (let i = 0; i < data.length; i += step) {
      optimized.push(data[i]);
    }

    // Всегда включаем последнюю точку
    if (optimized[optimized.length - 1] !== data[data.length - 1]) {
      optimized.push(data[data.length - 1]);
    }

    return optimized;
  }

  // Виртуализация для очень больших наборов данных
  static createVirtualizedData(data, viewportSize = 100) {
    return new VirtualizedChartData(data, {
      viewportSize,
      itemHeight: 20, // Предполагаемая высота элемента
      containerHeight: 400
    });
  }

  // Предварительная загрузка компонентов графиков
  static preloadChartComponents(types = ['line', 'bar', 'doughnut', 'combo']) {
    // Предзагрузка наиболее используемых компонентов
    const preloadPromises = types.map(type => {
      return ChartFactory.preloadChart(type).catch(error => {
        console.warn(`Failed to preload chart ${type}:`, error);
      });
    });

    return Promise.allSettled(preloadPromises);
  }

  // Оптимизация рендеринга Chart.js
  static optimizeChartRendering(chart, options = {}) {
    const { animation = false, responsive = true } = options;

    // Отключаем анимации для производительности
    if (!animation) {
      chart.options.animation = false;
    }

    // Оптимизированная отзывчивость
    if (responsive) {
      chart.options.responsive = true;
      chart.options.maintainAspectRatio = false;
    }

    // Уменьшаем частоту обновлений
    chart.options.interaction = {
      ...chart.options.interaction,
      throttle: 100 // ms
    };
  }

  // Управление памятью
  static cleanupChart(chart) {
    if (chart) {
      chart.destroy();
    }
  }
}
```

---

## ✅ Критерии приёмки

### Документация
- [x] Полная карта зависимостей модуля
- [x] Документированные API контракты
- [x] Спецификация конфигурационных параметров
- [x] Идентифицированные точки интеграции

### Анализ рисков
- [x] Выделены критические зависимости
- [x] Оценены риски рефакторинга
- [x] Предложены стратегии миграции

### Готовность к следующему этапу
- [x] Спецификация для TASK-091-02-02 готова
- [x] Архитектурные решения документированы
- [x] План безопасного рефакторинга разработан

---

## 📝 История изменений

| Дата | Автор | Изменения |
|------|-------|-----------|
| 2026-01-12 | AI Assistant | Создан анализ архитектуры модуля "График состояния" |