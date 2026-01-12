/**
 * Заглушки сервисов для секторов в разработке
 * Эти сервисы возвращают пустые данные до реализации реальной логики
 */

import { SectorDataNormalizer } from '../SectorDataNormalizer.js';

// Базовый класс для заглушек секторов
export class BaseSectorStubService {
  constructor(sectorId, sectorConfig) {
    this.sectorId = sectorId;
    this.sectorConfig = sectorConfig;
  }

  async getSectorData(options = {}) {
    // Возвращаем пустые нормализованные данные
    return SectorDataNormalizer.getEmptySectorData({
      id: this.sectorId,
      name: this.sectorConfig.name || this.sectorId,
      defaultDepartment: 'Unknown'
    });
  }

  async updateTicketAssignment(ticketId, stageId, employeeId) {
    // Заглушка - ничего не делает
    console.log(`[Stub:${this.sectorId}] updateTicketAssignment called:`, { ticketId, stageId, employeeId });
    return { success: true, message: 'Stub implementation - no real action taken' };
  }

  async createTicket(ticketData) {
    // Заглушка - возвращает фейковый тикет
    console.log(`[Stub:${this.sectorId}] createTicket called:`, ticketData);
    return {
      id: `stub_${Date.now()}`,
      title: ticketData.title || 'Stub ticket',
      status: 'new',
      createdAt: new Date().toISOString()
    };
  }
}


import { UNIFIED_DT140_STAGES, SECTOR_FILTERS } from '../constants.js';

// Сервис-заглушка для сектора PDM (использует единые стадии DT140_12)
export class SectorPDMService extends BaseSectorStubService {
  constructor() {
    super('pdm', {
      id: 'pdm',
      name: 'Сектор PDM',
      filterField: 'UF_CRM_7_TYPE_PRODUCT',
      filterValue: SECTOR_FILTERS.pdm,
      stages: UNIFIED_DT140_STAGES
    });
  }

  async getSectorData(options = {}) {
    console.log('[SectorPDMService] getSectorData called with options:', options);

    // Создаем тестовые данные для сектора PDM: 0/27/3 (30 тикетов total)
    const testData = {
      stages: [
        {
          id: 'DT140_12:UC_0VHWE2',
          name: 'Сформировано обращение',
          color: '#007bff',
          tickets: [], // 0 тикетов в стадии formed
          employees: []
        },
        {
          id: 'DT140_12:PREPARATION',
          name: 'Рассмотрение ТЗ',
          color: '#ffc107',
          tickets: Array.from({length: 27}, (_, i) => ({
            id: `pdm-review-${i + 1}`,
            title: `Анализ PDM проекта ${i + 1}`,
            status: i % 3 === 0 ? 'completed' : 'in_progress',
            assignedTo: `user${(i % 5) + 1}`
          })), // 27 тикетов в стадии review
          employees: Array.from({length: 5}, (_, i) => ({
            id: `user${i + 1}`,
            name: `PDM Специалист ${i + 1}`,
            department: 'PDM'
          }))
        },
        {
          id: 'DT140_12:CLIENT',
          name: 'Исполнение',
          color: '#28a745',
          tickets: Array.from({length: 3}, (_, i) => ({
            id: `pdm-exec-${i + 1}`,
            title: `Внедрение PDM решения ${i + 1}`,
            status: 'in_progress',
            assignedTo: `user${(i % 2) + 1}`
          })), // 3 тикета в стадии execution
          employees: [
            { id: 'user1', name: 'PDM Специалист 1', department: 'PDM' },
            { id: 'user2', name: 'PDM Специалист 2', department: 'PDM' }
          ]
        }
      ],
      employees: Array.from({length: 7}, (_, i) => ({
        id: `user${i + 1}`,
        name: `PDM Специалист ${i + 1}`,
        department: 'PDM'
      })),
      zeroPointTickets: [],
      metadata: {
        sectorId: 'pdm',
        totalTickets: 30, // 0 + 27 + 3
        totalEmployees: 7,
        filterValue: 'PDM', // UF_CRM_7_TYPE_PRODUCT = 'PDM'
        lastUpdated: new Date().toISOString()
      }
    };

    console.log('[SectorPDMService] Returning test data:', {
      stages: testData.stages?.length || 0,
      employees: testData.employees?.length || 0,
      totalTickets: testData.stages?.reduce((sum, stage) => sum + (stage.tickets?.length || 0), 0) || 0
    });

    return testData;
  }
}

// Сервис-заглушка для сектора Bitrix24 (использует те же стадии DT140_12 что и 1С)
export class SectorBitrix24Service {
  constructor() {
    this.sectorId = 'bitrix24';
    this.sectorConfig = {
      id: 'bitrix24',
      name: 'Сектор Битрикс24',
      filterField: 'UF_CRM_7_TYPE_PRODUCT',
      filterValue: 'Bitrix24', // UF_CRM_7_TYPE_PRODUCT = 'Bitrix24'
      stages: UNIFIED_DT140_STAGES
    };
  }

  async updateTicketAssignment(ticketId, stageId, employeeId) {
    // Заглушка - ничего не делает
    console.log(`[SectorBitrix24Service] updateTicketAssignment called:`, { ticketId, stageId, employeeId });
    return { success: true, message: 'Stub implementation - no real action taken' };
  }

  async createTicket(ticketData) {
    // Заглушка - возвращает фейковый тикет
    console.log(`[SectorBitrix24Service] createTicket called:`, ticketData);
    return {
      id: `b24_stub_${Date.now()}`,
      title: ticketData.title || 'Stub ticket',
      status: 'new',
      createdAt: new Date().toISOString()
    };
  }

  async getSectorData(options = {}) {
    console.log('[SectorBitrix24Service] getSectorData called with options:', options);

    // Создаем тестовые данные для сектора Битрикс24 с теми же стадиями DT140_12
    const testData = {
      stages: [
        {
          id: 'DT140_12:UC_0VHWE2',
          name: 'Сформировано обращение',
          color: '#007bff',
          tickets: [
            { id: 'b24-1', title: 'Заявка на настройку портала', status: 'in_progress', assignedTo: 'user1' }
          ],
          employees: [
            { id: 'user1', name: 'Иван Иванов', department: 'Bitrix24' }
          ]
        },
        {
          id: 'DT140_12:PREPARATION',
          name: 'Рассмотрение ТЗ',
          color: '#ffc107',
          tickets: [],
          employees: []
        },
        {
          id: 'DT140_12:CLIENT',
          name: 'Исполнение',
          color: '#28a745',
          tickets: [],
          employees: []
        }
      ],
      employees: [
        { id: 'user1', name: 'Иван Иванов', department: 'Bitrix24' }
      ],
      zeroPointTickets: [],
      metadata: {
        sectorId: 'bitrix24',
        lastUpdated: new Date().toISOString()
      }
    };

    console.log('[SectorBitrix24Service] Returning test data:', {
      stages: testData.stages?.length || 0,
      employees: testData.employees?.length || 0,
      totalTickets: testData.stages?.reduce((sum, stage) => sum + (stage.tickets?.length || 0), 0) || 0
    });

    return testData;
  }
}

// Сервис-заглушка для сектора Infrastructure (использует единые стадии DT140_12)
export class SectorInfrastructureService extends BaseSectorStubService {
  constructor() {
    super('infrastructure', {
      id: 'infrastructure',
      name: 'Сектор Инфраструктура',
      filterField: 'UF_CRM_7_TYPE_PRODUCT',
      filterValues: ['Железо', 'Прочее'], // UF_CRM_7_TYPE_PRODUCT IN ('Железо', 'Прочее')
      stages: UNIFIED_DT140_STAGES
    });
  }

  async getSectorData(options = {}) {
    console.log('[SectorInfrastructureService] getSectorData called with options:', options);

    // Создаем тестовые данные для сектора Infrastructure: 0/0/1 (1 тикет total)
    const testData = {
      stages: [
        {
          id: 'DT140_12:UC_0VHWE2',
          name: 'Сформировано обращение',
          color: '#007bff',
          tickets: [], // 0 тикетов в стадии formed
          employees: []
        },
        {
          id: 'DT140_12:PREPARATION',
          name: 'Рассмотрение ТЗ',
          color: '#ffc107',
          tickets: [], // 0 тикетов в стадии review
          employees: []
        },
        {
          id: 'DT140_12:CLIENT',
          name: 'Исполнение',
          color: '#28a745',
          tickets: [
            { id: 'infra-1', title: 'Замена серверного оборудования', status: 'in_progress', assignedTo: 'infra-user1' }
          ], // 1 тикет в стадии execution
          employees: [
            { id: 'infra-user1', name: 'Системный администратор', department: 'Infrastructure' }
          ]
        }
      ],
      employees: [
        { id: 'infra-user1', name: 'Системный администратор', department: 'Infrastructure' }
      ],
      zeroPointTickets: [],
      metadata: {
        sectorId: 'infrastructure',
        totalTickets: 1, // 0 + 0 + 1
        totalEmployees: 1,
        filterValues: ['Железо', 'Прочее'], // UF_CRM_7_TYPE_PRODUCT IN ('Железо', 'Прочее')
        lastUpdated: new Date().toISOString()
      }
    };

    console.log('[SectorInfrastructureService] Returning test data:', {
      stages: testData.stages?.length || 0,
      employees: testData.employees?.length || 0,
      totalTickets: testData.stages?.reduce((sum, stage) => sum + (stage.tickets?.length || 0), 0) || 0
    });

    return testData;
  }
}

// Фабрика для создания заглушек
export class SectorStubFactory {
  static create(sectorId) {
    const stubMap = {
      'pdm': () => new SectorPDMService(),
      'bitrix24': () => new SectorBitrix24Service(),
      'infrastructure': () => new SectorInfrastructureService()
    };

    const creator = stubMap[sectorId];
    if (!creator) {
      throw new Error(`No stub service available for sector: ${sectorId}`);
    }

    return creator();
  }

  static isStubAvailable(sectorId) {
    return ['pdm', 'bitrix24', 'infrastructure'].includes(sectorId);
  }
}

export default {
  SectorPDMService,
  SectorBitrix24Service,
  SectorInfrastructureService,
  SectorStubFactory
};