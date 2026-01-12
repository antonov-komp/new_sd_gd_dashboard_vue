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

// Сервис-заглушка для сектора PDM
export class SectorPDMService extends BaseSectorStubService {
  constructor() {
    super('pdm', {
      id: 'pdm',
      name: 'Сектор PDM',
      filterField: 'UF_CRM_7_TYPE_PRODUCT',
      filterValue: 'PDM',
      stages: {
        'design': { name: 'Проектирование', color: '#17a2b8', order: 1 },
        'review': { name: 'Проверка', color: '#ffc107', order: 2 },
        'implementation': { name: 'Внедрение', color: '#28a745', order: 3 }
      }
    });
  }
}

// Сервис-заглушка для сектора Bitrix24
export class SectorBitrix24Service extends BaseSectorStubService {
  constructor() {
    super('bitrix24', {
      id: 'bitrix24',
      name: 'Сектор Битрикс24',
      filterField: 'UF_CRM_7_TYPE_PRODUCT',
      filterValue: 'Bitrix24',
      stages: {
        'analysis': { name: 'Анализ', color: '#007bff', order: 1 },
        'development': { name: 'Разработка', color: '#ffc107', order: 2 },
        'testing': { name: 'Тестирование', color: '#28a745', order: 3 },
        'deployment': { name: 'Внедрение', color: '#6c757d', order: 4 }
      }
    });
  }
}

// Сервис-заглушка для сектора Infrastructure
export class SectorInfrastructureService extends BaseSectorStubService {
  constructor() {
    super('infrastructure', {
      id: 'infrastructure',
      name: 'Сектор Инфраструктура',
      filterField: 'UF_CRM_7_TYPE_PRODUCT',
      filterValues: ['Железо', 'Прочее'],
      stages: {
        'request': { name: 'Заявка', color: '#6c757d', order: 1 },
        'assessment': { name: 'Оценка', color: '#ffc107', order: 2 },
        'procurement': { name: 'Закупка', color: '#17a2b8', order: 3 },
        'deployment': { name: 'Внедрение', color: '#28a745', order: 4 }
      }
    });
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