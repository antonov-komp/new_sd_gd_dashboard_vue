/**
 * Сервис дашборда сектора Bitrix24
 *
 * Работает с реальными данными из Bitrix24 API
 * Использует смарт-процесс DT140_12 с фильтром UF_CRM_7_TYPE_PRODUCT = 'Bitrix24'
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { DashboardSectorBaseService } from './DashboardSectorBaseService.js';
import { Logger } from './utils/logger.js';

export class DashboardSectorBitrix24Service extends DashboardSectorBaseService {
  /**
   * Инициализация сервиса для сектора Bitrix24
   */
  constructor() {
    super('bitrix24', {
      name: 'Bitrix24',
      filterValue: 'Bitrix24', // UF_CRM_7_TYPE_PRODUCT = 'Bitrix24'
      description: 'Сектор интеграции и настройки Bitrix24'
    });

    Logger.info('DashboardSectorBitrix24Service initialized', 'DashboardSectorBitrix24Service');
  }

  /**
   * Получение данных сектора Bitrix24
   * Переопределяем для специфической логики интеграционных задач
   */
  async getSectorData(options = {}) {
    Logger.info('Loading Bitrix24 sector data', 'DashboardSectorBitrix24Service');

    try {
      // Используем базовую логику
      const data = await super.getSectorData(options);

      // Дополнительная обработка специфичная для Bitrix24
      // Например, фильтрация по типам интеграций или приоритетам

      Logger.info('Bitrix24 sector data loaded successfully', 'DashboardSectorBitrix24Service', {
        totalTickets: data.metadata.totalTickets,
        totalEmployees: data.metadata.totalEmployees
      });

      return data;

    } catch (error) {
      Logger.error('Error loading Bitrix24 sector data', 'DashboardSectorBitrix24Service', error);
      throw error;
    }
  }
}