# TASK-091-02-02: Проектирование универсального API для многосекторной работы

**Дата создания:** 2026-01-12 19:05 (UTC+3, Брест)
**Статус:** Ожидает разработки ⏳
**Приоритет:** Высокий
**Оценка трудозатрат:** 12 часов

---

## 🎯 Цель задачи

Создать абстрактные интерфейсы и базовые классы для работы с графиками состояния любого сектора, обеспечивая полную универсальность и расширяемость системы.

---

## 📋 Детальные спецификации API

### 🎯 Основные deliverables

#### 1. **IGraphStateService** - базовый интерфейс
```typescript
// IGraphStateService.ts
interface IGraphStateService {
  // Основные методы данных
  getSectorData(options?: SectorDataOptions): Promise<SectorData>;
  createSnapshot(type: SnapshotType, metadata: SnapshotMetadata): Promise<Snapshot>;
  getSnapshots(types: SnapshotType[]): Promise<Snapshot[]>;
  getSnapshotsForChart(types: SnapshotType[]): Promise<ChartSnapshotData[]>;

  // Конфигурационные методы
  getStagesConfig(): StageConfig[];
  getMetricsConfig(): MetricConfig[];
  getSupportedCharts(): ChartType[];
  getDefaultChart(): ChartType;

  // Управление состоянием
  clearCache(): void;
  getCacheStats(): CacheStats;
  isInitialized(): boolean;
}

// Типы для интерфейса
interface SectorDataOptions {
  forceRefresh?: boolean;
  includeMetrics?: boolean;
  dateRange?: DateRange;
  filters?: DataFilters;
}

interface SnapshotMetadata {
  createdBy: { id: number; name: string };
  description?: string;
  tags?: string[];
}

type SnapshotType = 'week_start' | 'week_end' | 'manual' | 'current' | 'auto';

interface SectorData {
  stages: StageData[];
  employees: EmployeeData[];
  zeroPointTickets: TicketData[];
  metrics: MetricsData;
  metadata: SectorMetadata;
}
```

#### 2. **BaseGraphStateService** - абстрактная реализация
```javascript
// BaseGraphStateService.js
export class BaseGraphStateService {
  constructor(sectorConfig) {
    if (this.constructor === BaseGraphStateService) {
      throw new Error('BaseGraphStateService is abstract and cannot be instantiated directly');
    }

    this.sectorConfig = sectorConfig;
    this.sectorId = sectorConfig.id;
    this.cache = new SectorAwareCache(this.sectorId);
    this.initialized = false;
  }

  // Абстрактные методы (должны быть реализованы наследниками)
  async getSectorData(options = {}) {
    throw new Error('getSectorData must be implemented by subclass');
  }

  async createSnapshot(type, metadata = {}) {
    throw new Error('createSnapshot must be implemented by subclass');
  }

  getStagesConfig() {
    throw new Error('getStagesConfig must be implemented by subclass');
  }

  getMetricsConfig() {
    throw new Error('getMetricsConfig must be implemented by subclass');
  }

  // Общие методы с реализацией по умолчанию
  async getSnapshots(types) {
    const snapshotService = this.getSnapshotService();
    return snapshotService.getSnapshotsByTypes(types, this.sectorId);
  }

  async getSnapshotsForChart(types) {
    const snapshots = await this.getSnapshots(types);
    return this.prepareSnapshotsForChart(snapshots);
  }

  getSupportedCharts() {
    return ['line', 'bar', 'doughnut', 'combo'];
  }

  getDefaultChart() {
    return 'combo';
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  isInitialized() {
    return this.initialized;
  }

  // Защищенные методы для использования наследниками
  _getCacheKey(operation, params = {}) {
    return `${this.sectorId}:${operation}:${JSON.stringify(params)}`;
  }

  _cacheResult(key, data, ttl = 300) {
    this.cache.set(key, data, ttl);
  }

  _getCachedResult(key) {
    return this.cache.get(key);
  }

  _getSnapshotService() {
    if (!this._snapshotService) {
      this._snapshotService = new UniversalSnapshotService(this.sectorId);
    }
    return this._snapshotService;
  }

  _prepareSnapshotsForChart(snapshots) {
    // Общая логика подготовки данных для графиков
    return snapshots.map(snapshot => ({
      id: snapshot.id,
      type: snapshot.meta.type,
      createdAt: snapshot.meta.created_at,
      data: this.normalizeSnapshotData(snapshot.data),
      metadata: snapshot.meta
    }));
  }

  normalizeSnapshotData(data) {
    // Базовая нормализация (может быть переопределена)
    return {
      stages: data.stages || [],
      employees: data.employees || [],
      metrics: data.metrics || {}
    };
  }
}
```

#### 3. **UniversalGraphStateService** - конкретная реализация
```javascript
// UniversalGraphStateService.js
import { BaseGraphStateService } from './BaseGraphStateService.js';
import { SectorConfigFactory } from '../config/SectorConfigFactory.js';

export class UniversalGraphStateService extends BaseGraphStateService {
  constructor(sectorId) {
    const sectorConfig = SectorConfigFactory.getConfig(sectorId);

    if (!sectorConfig) {
      throw new Error(`Sector configuration not found for: ${sectorId}`);
    }

    super(sectorConfig);

    // Инициализация специфичных для сектора компонентов
    this.adapter = this.createSectorAdapter(sectorConfig);
    this.dataService = this.createDataService(sectorConfig);
    this.validator = this.createValidator(sectorConfig);

    this.initialized = true;
  }

  createSectorAdapter(config) {
    // Создание адаптера на основе типа сектора
    const adapterMap = {
      '1c': () => new Sector1CAdapter(config),
      'pdm': () => new SectorPDMAdapter(config),
      'bitrix24': () => new SectorBitrix24Adapter(config),
      'infrastructure': () => new SectorInfrastructureAdapter(config)
    };

    const adapterFactory = adapterMap[config.id];
    if (!adapterFactory) {
      throw new Error(`No adapter available for sector: ${config.id}`);
    }

    return adapterFactory();
  }

  createDataService(config) {
    // Создание сервиса данных для сектора
    return new SectorDataService(config);
  }

  createValidator(config) {
    // Создание валидатора для данных сектора
    return new SectorDataValidator(config);
  }

  // Реализация абстрактных методов
  async getSectorData(options = {}) {
    const cacheKey = this._getCacheKey('sectorData', options);

    // Проверяем кеш
    if (!options.forceRefresh) {
      const cached = this._getCachedResult(cacheKey);
      if (cached) {
        console.log(`[UniversalGraphStateService] Cache hit for sector data: ${this.sectorId}`);
        return cached;
      }
    }

    try {
      console.log(`[UniversalGraphStateService] Loading sector data: ${this.sectorId}`);

      // Получаем сырые данные сектора
      const rawData = await this.dataService.getSectorData(options);

      // Валидируем данные
      const validationResult = this.validator.validate(rawData);
      if (!validationResult.isValid) {
        throw new Error(`Sector data validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Адаптируем данные под нужды графиков
      const adaptedData = this.adapter.adaptSectorData(rawData);

      // Кешируем результат
      this._cacheResult(cacheKey, adaptedData, 300); // 5 минут

      return adaptedData;

    } catch (error) {
      console.error(`[UniversalGraphStateService] Failed to get sector data for ${this.sectorId}:`, error);
      throw new GraphStateError(`Failed to load sector data: ${error.message}`, error);
    }
  }

  async createSnapshot(type, metadata = {}) {
    try {
      // Получаем текущие данные сектора
      const sectorData = await this.getSectorData();

      // Нормализуем для слепка
      const snapshotData = this.adapter.normalizeForSnapshot(sectorData, type);

      // Создаем слепок
      const snapshot = await this._getSnapshotService().createSnapshot(snapshotData, {
        type,
        sectorId: this.sectorId,
        createdBy: metadata.createdBy,
        description: metadata.description,
        tags: metadata.tags,
        createdAt: new Date().toISOString()
      });

      console.log(`[UniversalGraphStateService] Snapshot created: ${snapshot.id} for sector ${this.sectorId}`);

      return snapshot;

    } catch (error) {
      console.error(`[UniversalGraphStateService] Failed to create snapshot for ${this.sectorId}:`, error);
      throw new GraphStateError(`Failed to create snapshot: ${error.message}`, error);
    }
  }

  getStagesConfig() {
    return this.adapter.getStagesConfig();
  }

  getMetricsConfig() {
    return this.adapter.getMetricsConfig();
  }

  // Расширенные методы
  async getSectorStats() {
    const data = await this.getSectorData();
    return {
      totalTickets: data.zeroPointTickets.length +
                   data.stages.reduce((sum, stage) => sum + stage.tickets.length, 0),
      totalEmployees: data.employees.length,
      stagesCount: data.stages.length,
      lastUpdated: data.metadata?.lastUpdated || new Date().toISOString()
    };
  }

  async validateSectorAccess(user) {
    // Проверка прав доступа к сектору
    return this.sectorConfig.accessValidator ?
           this.sectorConfig.accessValidator(user) :
           true; // По умолчанию доступ открыт
  }

  // Метод для получения конфигурации сектора
  getSectorConfig() {
    return { ...this.sectorConfig };
  }
}

// Кастомные ошибки
export class GraphStateError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'GraphStateError';
    this.originalError = originalError;
  }
}
```

#### 4. **SectorGraphAdapter** - базовый адаптер
```javascript
// SectorGraphAdapter.js
export class SectorGraphAdapter {
  constructor(sectorConfig) {
    this.sectorConfig = sectorConfig;
    this.stageMappings = this.createStageMappings(sectorConfig);
    this.metricMappings = this.createMetricMappings(sectorConfig);
  }

  // Основной метод адаптации данных
  adaptSectorData(sectorData) {
    return {
      stages: this.adaptStages(sectorData.stages || []),
      employees: this.adaptEmployees(sectorData.employees || []),
      zeroPointTickets: this.adaptTickets(sectorData.zeroPointTickets || []),
      metrics: this.calculateMetrics(sectorData),
      metadata: this.createMetadata(sectorData)
    };
  }

  // Адаптация стадий
  adaptStages(stages) {
    return stages.map(stage => {
      const mappedStage = this.stageMappings[stage.id] || {};

      return {
        id: stage.id,
        name: mappedStage.name || stage.name || stage.id,
        color: mappedStage.color || stage.color || '#666',
        order: mappedStage.order || 0,
        tickets: this.adaptTickets(stage.tickets || []),
        employees: this.adaptEmployees(stage.employees || []),
        metrics: this.calculateStageMetrics(stage)
      };
    }).sort((a, b) => a.order - b.order);
  }

  // Адаптация сотрудников
  adaptEmployees(employees) {
    return employees.map(employee => ({
      id: employee.id || employee.ID,
      name: employee.name || employee.NAME ||
           `${employee.LAST_NAME || ''} ${employee.NAME || ''}`.trim() || `Employee ${employee.id}`,
      department: employee.department || this.sectorConfig.defaultDepartment || 'Unknown',
      load: employee.load || 0,
      avatar: employee.avatar || null,
      status: employee.status || 'active'
    }));
  }

  // Адаптация тикетов
  adaptTickets(tickets) {
    return tickets.map(ticket => ({
      id: ticket.id || ticket.ID,
      title: ticket.title || ticket.TITLE || `Ticket ${ticket.id}`,
      status: ticket.status || ticket.STATUS_ID,
      priority: ticket.priority || ticket.PRIORITY,
      assignedTo: ticket.assignedTo || ticket.ASSIGNED_BY_ID,
      createdAt: ticket.createdAt || ticket.CREATED_DATE,
      updatedAt: ticket.updatedAt || ticket.UPDATED_DATE
    }));
  }

  // Расчет метрик
  calculateMetrics(data) {
    const baseMetrics = {
      totalTickets: (data.zeroPointTickets?.length || 0) +
                   (data.stages || []).reduce((sum, stage) => sum + (stage.tickets?.length || 0), 0),
      totalEmployees: data.employees?.length || 0,
      activeStages: (data.stages || []).filter(stage => stage.tickets?.length > 0).length
    };

    // Добавляем специфичные для сектора метрики
    return {
      ...baseMetrics,
      ...this.calculateCustomMetrics(data)
    };
  }

  // Нормализация данных для слепка
  normalizeForSnapshot(data, type) {
    return {
      meta: {
        type,
        created_at: new Date().toISOString(),
        version: '2.0',
        source: `sector_${this.sectorConfig.id}`,
        sectorId: this.sectorConfig.id
      },
      data: {
        stages: data.stages,
        employees: data.employees,
        zeroPointTickets: data.zeroPointTickets,
        metrics: data.metrics
      }
    };
  }

  // Создание маппингов стадий
  createStageMappings(config) {
    const mappings = {};

    if (config.stages) {
      config.stages.forEach((stage, index) => {
        mappings[stage.id] = {
          name: stage.name,
          color: stage.color,
          order: stage.order || index
        };
      });
    }

    return mappings;
  }

  // Создание маппингов метрик
  createMetricMappings(config) {
    return config.metrics || {};
  }

  // Абстрактные методы для переопределения
  calculateCustomMetrics(data) {
    return {}; // По умолчанию пустой объект
  }

  calculateStageMetrics(stage) {
    return {
      ticketCount: stage.tickets?.length || 0,
      employeeCount: stage.employees?.length || 0,
      averageLoad: stage.employees?.length > 0 ?
                  (stage.tickets?.length || 0) / stage.employees.length : 0
    };
  }

  createMetadata(data) {
    return {
      sectorId: this.sectorConfig.id,
      lastUpdated: new Date().toISOString(),
      dataVersion: '1.0'
    };
  }

  // Геттеры конфигурации
  getStagesConfig() {
    return Object.values(this.stageMappings);
  }

  getMetricsConfig() {
    return this.metricMappings;
  }
}
```

### 🧪 Модульные тесты

#### Тесты для BaseGraphStateService
```javascript
// BaseGraphStateService.test.js
import { BaseGraphStateService } from '../BaseGraphStateService.js';

describe('BaseGraphStateService', () => {
  let service;
  let mockConfig;

  beforeEach(() => {
    mockConfig = { id: 'test', name: 'Test Sector' };
    service = new BaseGraphStateService(mockConfig);
  });

  test('should throw error when instantiated directly', () => {
    expect(() => new BaseGraphStateService(mockConfig)).toThrow();
  });

  test('should initialize with config', () => {
    expect(service.sectorConfig).toBe(mockConfig);
    expect(service.sectorId).toBe('test');
  });

  test('should throw error for abstract methods', async () => {
    await expect(service.getSectorData()).rejects.toThrow('getSectorData must be implemented');
    await expect(service.createSnapshot()).rejects.toThrow('createSnapshot must be implemented');
    expect(() => service.getStagesConfig()).toThrow('getStagesConfig must be implemented');
  });

  test('should generate cache keys correctly', () => {
    const key = service._getCacheKey('test', { param: 'value' });
    expect(key).toBe('test:test:{"param":"value"}');
  });
});
```

#### Тесты для UniversalGraphStateService
```javascript
// UniversalGraphStateService.test.js
import { UniversalGraphStateService } from '../UniversalGraphStateService.js';

describe('UniversalGraphStateService', () => {
  let service;

  beforeEach(() => {
    // Мокаем конфигурацию сектора
    jest.mock('../config/SectorConfigFactory.js', () => ({
      getConfig: jest.fn(() => ({
        id: '1c',
        name: 'Сектор 1С',
        stages: [],
        metrics: {}
      }))
    }));

    service = new UniversalGraphStateService('1c');
  });

  test('should initialize with valid sector', () => {
    expect(service.sectorId).toBe('1c');
    expect(service.initialized).toBe(true);
  });

  test('should throw error for unknown sector', () => {
    expect(() => new UniversalGraphStateService('unknown')).toThrow();
  });

  test('should create snapshot with metadata', async () => {
    const mockSnapshot = { id: '123', meta: {}, data: {} };
    service._getSnapshotService = jest.fn().mockReturnValue({
      createSnapshot: jest.fn().mockResolvedValue(mockSnapshot)
    });
    service.getSectorData = jest.fn().mockResolvedValue({ stages: [], employees: [] });

    const result = await service.createSnapshot('week_start', {
      createdBy: { id: 1, name: 'Test' }
    });

    expect(result).toBe(mockSnapshot);
  });
});
```

---

## 🔗 Зависимости и интеграции

### ✅ Выполненные зависимости
- [x] **TASK-091-02-01**: Анализ архитектуры и зависимостей модуля "График состояния"
  - ✅ Детальная карта зависимостей
  - ✅ API контракты документированы
  - ✅ Критические точки интеграции идентифицированы

### 🔄 Текущие зависимости
- [ ] **TASK-091-01**: Анализ DashboardSector1C (для понимания структуры данных)
  - Требуется для точной спецификации адаптеров данных

### 🔜 Предстоящие зависимости
- [ ] **TASK-091**: Система секторов (конфигурации секторов)
- [ ] **SectorConfigFactory**: Фабрика конфигураций секторов
- [ ] **SectorDataService**: Универсальный сервис получения данных секторов

---

## 📋 План реализации

### Неделя 1: Проектирование интерфейсов
- [ ] Создание TypeScript интерфейсов (IGraphStateService, ISectorDataAdapter)
- [ ] Проектирование контрактов между компонентами
- [ ] Спецификация ошибок и исключений

### Неделя 2: Базовые абстракции
- [ ] Реализация BaseGraphStateService
- [ ] Создание базовых адаптеров
- [ ] Unit тесты для абстракций

### Неделя 3: Универсальный сервис
- [ ] Реализация UniversalGraphStateService
- [ ] Интеграция с SectorConfigFactory
- [ ] Тестирование с mock-данными

### Неделя 4: Интеграция и оптимизация
- [ ] Интеграция с реальными данными секторов
- [ ] Оптимизация производительности
- [ ] Финальное тестирование

---

## ✅ Критерии приёмки

### Функциональные требования
- [ ] Интерфейсы корректно описывают контракты
- [ ] Базовые классы реализованы и протестированы
- [ ] Универсальный сервис работает с mock-данными
- [ ] Адаптеры правильно трансформируют данные

### Технические требования
- [ ] TypeScript интерфейсы документированы
- [ ] Абстрактные классы не могут быть инстанцированы напрямую
- [ ] Все публичные методы имеют JSDoc комментарии
- [ ] Обработка ошибок соответствует спецификации

### Качественные требования
- [ ] Код соответствует принципам SOLID
- [ ] Модульное тестирование покрывает > 90% кода
- [ ] Производительность соответствует требованиям
- [ ] Документация API актуальна и понятна