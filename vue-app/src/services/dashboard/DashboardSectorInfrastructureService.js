/**
 * Сервис дашборда сектора Infrastructure
 *
 * Работает с реальными данными из Bitrix24 API
 * Использует смарт-процесс DT140_12 с фильтром UF_CRM_7_TYPE_PRODUCT IN ('Железо', 'Прочее')
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { DashboardSectorBaseService } from './DashboardSectorBaseServiceSimple.js';
import { Logger } from './utils/logger.js';

export class DashboardSectorInfrastructureService extends DashboardSectorBaseService {
  /**
   * Инициализация сервиса для сектора Infrastructure
   */
  constructor() {
    super('infrastructure', {
      name: 'Infrastructure',
      filterValue: ['Железо', 'Прочее'], // UF_CRM_7_TYPE_PRODUCT IN ('Железо', 'Прочее')
      description: 'Сектор инфраструктуры и оборудования'
    });

    Logger.info('DashboardSectorInfrastructureService initialized', 'DashboardSectorInfrastructureService');
  }

  /**
   * Получение данных сектора Infrastructure
   *
   * Использует универсальную фильтрацию для поддержки множественных фильтров:
   * UF_CRM_7_TYPE_PRODUCT IN ('Железо', 'Прочее')
   */
  async getSectorData(options = {}) {
    Logger.info('Loading Infrastructure sector data', 'DashboardSectorInfrastructureService');

    try {
      // Используем стандартную логику базового класса с универсальной фильтрацией
      const data = await super.getSectorData(options);

      Logger.info('Infrastructure sector data loaded successfully', 'DashboardSectorInfrastructureService', {
        totalTickets: data.metadata.totalTickets,
        totalEmployees: data.metadata.totalEmployees,
        filterValues: this.config.filterValue
      });

      return data;

    } catch (error) {
      Logger.error('Error loading Infrastructure sector data', 'DashboardSectorInfrastructureService', error);
      throw error;
    }
  }

  /**
   * Infrastructure сектор использует стандартную универсальную фильтрацию
   * Множественные фильтры ('Железо', 'Прочее') обрабатываются автоматически
   * в TicketRepository.getAllTicketsByFilter и filterTicketsBySector
   */
}