# TASK-091-02-04: Реализация адаптеров данных для разных секторов

**Дата создания:** 2026-01-12 19:15 (UTC+3, Брест)
**Оценка трудозатрат:** 10 часов

---

## 🎯 Цель задачи

Создать нормализаторы и трансформеры для унификации данных различных секторов под нужды визуализации графиков состояния.

---

## 📋 Адаптеры для секторов

- [ ] `SectorDataNormalizer.js` - базовый нормализатор
- [ ] `Sector1CAdapter.js` - адаптер для сектора 1С
- [ ] `SectorPDMAdapter.js` - адаптер для сектора PDM
- [ ] `SectorBitrix24Adapter.js` - адаптер для сектора Битрикс24
- [ ] `SectorInfrastructureAdapter.js` - адаптер для сектора Инфраструктура

### 🎯 Спецификация адаптеров данных

#### Базовый нормализатор данных

**SectorDataNormalizer.js** - универсальный нормализатор (80 строк)
```javascript
/**
 * Универсальный нормализатор данных секторов
 * Преобразует данные любого сектора в унифицированный формат
 */
export class SectorDataNormalizer {
  static STAGE_COLORS = [
    '#007bff', // Синий - новые
    '#ffc107', // Желтый - в работе
    '#28a745', // Зеленый - завершено
    '#dc3545', // Красный - проблемы
    '#6c757d', // Серый - другие
    '#17a2b8', // Голубой - дополнительные
    '#e83e8c', // Розовый - специальные
    '#fd7e14'  // Оранжевый - предупреждения
  ];

  /**
   * Нормализация полных данных сектора
   */
  static normalizeSectorData(sectorData, sectorConfig) {
    return {
      stages: this.normalizeStages(sectorData.stages || [], sectorConfig),
      employees: this.normalizeEmployees(sectorData.employees || [], sectorConfig),
      zeroPointTickets: this.normalizeTickets(sectorData.zeroPointTickets || [], sectorConfig),
      metrics: this.calculateMetrics(sectorData, sectorConfig),
      metadata: this.createMetadata(sectorData, sectorConfig)
    };
  }

  /**
   * Нормализация стадий
   */
  static normalizeStages(stages, sectorConfig) {
    return stages.map((stage, index) => {
      const config = sectorConfig.stages?.[stage.id];
      const colorIndex = index % this.STAGE_COLORS.length;

      return {
        id: stage.id,
        name: config?.name || stage.name || stage.id,
        color: config?.color || this.STAGE_COLORS[colorIndex],
        order: config?.order || index,
        tickets: this.normalizeTickets(stage.tickets || [], sectorConfig),
        employees: this.normalizeEmployees(stage.employees || [], sectorConfig),
        metrics: this.calculateStageMetrics(stage, sectorConfig)
      };
    }).sort((a, b) => a.order - b.order);
  }

  /**
   * Нормализация сотрудников
   */
  static normalizeEmployees(employees, sectorConfig) {
    return employees.map(employee => ({
      id: employee.id || employee.ID,
      name: this.normalizeEmployeeName(employee),
      department: employee.department || sectorConfig.defaultDepartment || 'Unknown',
      load: employee.load || 0,
      avatar: employee.avatar || null,
      status: employee.status || 'active',
      color: this.assignEmployeeColor(employee, sectorConfig)
    }));
  }

  /**
   * Нормализация тикетов
   */
  static normalizeTickets(tickets, sectorConfig) {
    return tickets.map(ticket => ({
      id: ticket.id || ticket.ID,
      title: this.normalizeTicketTitle(ticket),
      status: ticket.status || ticket.STATUS_ID,
      priority: this.normalizePriority(ticket),
      assignedTo: ticket.assignedTo || ticket.ASSIGNED_BY_ID,
      createdAt: this.normalizeDate(ticket.createdAt || ticket.CREATED_DATE),
      updatedAt: this.normalizeDate(ticket.updatedAt || ticket.UPDATED_DATE),
      deadline: this.normalizeDate(ticket.deadline || ticket.DEADLINE),
      tags: this.extractTags(ticket, sectorConfig)
    }));
  }

  // Вспомогательные методы
  static normalizeEmployeeName(employee) {
    const lastName = employee.LAST_NAME || employee.lastName || '';
    const firstName = employee.NAME || employee.firstName || '';
    const fullName = `${lastName} ${firstName}`.trim();

    return fullName || employee.name || employee.login || `Employee ${employee.id}`;
  }

  static normalizeTicketTitle(ticket) {
    return ticket.title || ticket.TITLE || ticket.name || ticket.NAME ||
           `Ticket ${ticket.id || ticket.ID}`;
  }

  static normalizePriority(ticket) {
    const priority = ticket.priority || ticket.PRIORITY;

    if (typeof priority === 'number') return priority;

    const priorityMap = { 'low': 1, 'normal': 2, 'high': 3, 'urgent': 4 };
    return priorityMap[priority?.toLowerCase()] || 2;
  }

  static normalizeDate(dateValue) {
    if (!dateValue) return null;
    try {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
      return null;
    }
  }

  static extractTags(ticket, sectorConfig) {
    const tags = [];
    if (ticket.tags) {
      tags.push(...(Array.isArray(ticket.tags) ? ticket.tags : [ticket.tags]));
    }
    if (ticket.UF_CRM_7_TYPE_PRODUCT) {
      tags.push(ticket.UF_CRM_7_TYPE_PRODUCT);
    }
    return [...new Set(tags)]; // Удаление дубликатов
  }

  static assignEmployeeColor(employee, sectorConfig) {
    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6c757d'];
    if (employee.department) {
      const deptHash = employee.department.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      return colors[Math.abs(deptHash) % colors.length];
    }
    return colors[Math.abs(employee.id) % colors.length];
  }

  static calculateMetrics(data, sectorConfig) {
    const totalTickets = (data.zeroPointTickets?.length || 0) +
      (data.stages || []).reduce((sum, stage) => sum + (stage.tickets?.length || 0), 0);

    return {
      totalTickets,
      totalEmployees: data.employees?.length || 0,
      activeStages: (data.stages || []).filter(stage => stage.tickets?.length > 0).length,
      averageTicketsPerEmployee: data.employees?.length > 0 ? totalTickets / data.employees.length : 0
    };
  }

  static calculateStageMetrics(stage, sectorConfig) {
    const tickets = stage.tickets || [];
    const employees = stage.employees || [];

    return {
      ticketCount: tickets.length,
      employeeCount: employees.length,
      averageLoad: employees.length > 0 ? tickets.length / employees.length : 0
    };
  }

  static createMetadata(data, sectorConfig) {
    return {
      sectorId: sectorConfig.id,
      lastUpdated: new Date().toISOString(),
      dataVersion: '1.0'
    };
  }
}
```

#### Специализированные адаптеры

**Sector1CAdapter.js** - адаптер для сектора 1С (60 строк)
```javascript
/**
 * Адаптер данных для сектора 1С
 * Специфическая логика для структуры данных 1С
 */
export class Sector1CAdapter {
  constructor(sectorConfig) {
    this.sectorConfig = sectorConfig;
    this.finalStages = ['DT140_12:CLIENT'];
  }

  adaptSectorData(rawData) {
    const normalized = SectorDataNormalizer.normalizeSectorData(rawData, {
      ...this.sectorConfig,
      finalStages: this.finalStages,
      dataSource: '1c'
    });

    normalized.metrics.integrationSpecific = {
      syncStatus: this.checkSyncStatus(rawData),
      errorRate: this.calculateErrorRate(rawData),
      performanceScore: this.calculatePerformanceScore(rawData)
    };

    return normalized;
  }

  checkSyncStatus(data) { return 'synced'; }
  calculateErrorRate(data) { return 0; }
  calculatePerformanceScore(data) { return 85; }

  getStagesConfig() {
    return [
      { id: 'DT140_12:UC_0VHWE2', name: 'Сформировано обращение', color: '#007bff', order: 1 },
      { id: 'DT140_12:PREPARATION', name: 'Рассмотрение ТЗ', color: '#ffc107', order: 2 },
      { id: 'DT140_12:CLIENT', name: 'Исполнение', color: '#28a745', order: 3 }
    ];
  }
}
```

**SectorInfrastructureAdapter.js** - адаптер для инфраструктуры (70 строк)
```javascript
/**
 * Адаптер данных для сектора Инфраструктура
 * Обрабатывает множественные теги: 'Железо' OR 'Прочее'
 */
export class SectorInfrastructureAdapter {
  constructor(sectorConfig) {
    this.sectorConfig = sectorConfig;
    this.validTags = ['Железо', 'Прочее', 'Инфраструктура', 'Серверы', 'Сеть'];
    this.finalStages = ['DT140_12:DEPLOYMENT', 'DT140_12:CLOSED'];
  }

  adaptSectorData(rawData) {
    const filteredData = this.filterByInfrastructureTags(rawData);
    const normalized = SectorDataNormalizer.normalizeSectorData(filteredData, {
      ...this.sectorConfig,
      finalStages: this.finalStages,
      dataSource: 'infrastructure'
    });

    normalized.metrics.infrastructureSpecific = {
      hardwareRequests: this.countHardwareRequests(filteredData),
      networkIssues: this.countNetworkIssues(filteredData),
      uptime: this.calculateUptime(filteredData)
    };

    return normalized;
  }

  filterByInfrastructureTags(data) {
    const filterTickets = (tickets) => {
      return tickets.filter(ticket => {
        const tags = SectorDataNormalizer.extractTags(ticket, this.sectorConfig);
        return tags.some(tag => this.validTags.includes(tag));
      });
    };

    return {
      ...data,
      stages: data.stages?.map(stage => ({
        ...stage,
        tickets: filterTickets(stage.tickets || [])
      })),
      zeroPointTickets: filterTickets(data.zeroPointTickets || [])
    };
  }

  getStagesConfig() {
    return [
      { id: 'DT140_12:REQUEST', name: 'Заявка', color: '#6c757d', order: 1 },
      { id: 'DT140_12:ASSESSMENT', name: 'Оценка', color: '#ffc107', order: 2 },
      { id: 'DT140_12:PROCUREMENT', name: 'Закупка', color: '#17a2b8', order: 3 },
      { id: 'DT140_12:DEPLOYMENT', name: 'Внедрение', color: '#28a745', order: 4 }
    ];
  }

  // Методы-заглушки для специфических метрик
  countHardwareRequests() { return 0; }
  countNetworkIssues() { return 0; }
  calculateUptime() { return 99.9; }
}
```

### 🧪 Тестирование адаптеров

**Unit тесты:**
```javascript
describe('SectorInfrastructureAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new SectorInfrastructureAdapter({ id: 'infrastructure' });
  });

  test('should filter tickets by infrastructure tags', () => {
    const rawData = {
      stages: [{
        tickets: [
          { id: 1, UF_CRM_7_TYPE_PRODUCT: 'Железо' },
          { id: 2, UF_CRM_7_TYPE_PRODUCT: 'Программирование' }
        ]
      }]
    };

    const adapted = adapter.adaptSectorData(rawData);
    expect(adapted.stages[0].tickets).toHaveLength(1);
    expect(adapted.stages[0].tickets[0].id).toBe(1);
  });
});
```

---

## 🔗 Зависимости

- [ ] TASK-091-02-02: Универсальный API
- [ ] TASK-091: Конфигурация секторов