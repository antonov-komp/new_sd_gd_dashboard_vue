/**
 * Сервис дашборда сектора PDM
 *
 * Работает с реальными данными из Bitrix24 API
 * Использует смарт-процесс DT140_12 с фильтром UF_CRM_7_TYPE_PRODUCT = 'PDM'
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { DashboardSectorBaseService } from './DashboardSectorBaseServiceSimple.js';
import { Logger } from './utils/logger.js';

export class DashboardSectorPDMService extends DashboardSectorBaseService {
  /**
   * Инициализация сервиса для сектора PDM
   */
  constructor() {
    super('pdm', {
      name: 'PDM',
      filterValue: 'PDM', // UF_CRM_7_TYPE_PRODUCT = 'PDM'
      description: 'Сектор управления данными о продукции (PDM)'
    });

    Logger.info('DashboardSectorPDMService initialized', 'DashboardSectorPDMService');
  }

  /**
   * Получение данных сектора PDM
   * Переопределяем для специфической логики PDM-проектов
   */
  async getSectorData(options = {}) {
    Logger.info('Loading PDM sector data', 'DashboardSectorPDMService');

    try {
      // Используем базовую логику
      const data = await super.getSectorData(options);

      // Дополнительная обработка специфичная для PDM
      // Например, фильтрация по типам проектов или категориям

      Logger.info('PDM sector data loaded successfully', 'DashboardSectorPDMService', {
        totalTickets: data.metadata.totalTickets,
        totalEmployees: data.metadata.totalEmployees
      });

      return data;

    } catch (error) {
      Logger.error('Error loading PDM sector data', 'DashboardSectorPDMService', error);
      throw error;
    }
  }
}