/**
 * Фабрика для создания сервисов секторов
 *
 * Создает сервисы данных для разных секторов:
 * - Для сектора 1С: использует существующий DashboardSector1CService
 * - Для других секторов: использует заглушки или специализированные сервисы
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { DashboardSector1CService } from '@/services/dashboard-sector-1c/index.js';
import { SectorStubFactory } from '../stubs/index.js';

/**
 * Фабрика сервисов секторов
 */
export class SectorServiceFactory {
  static serviceCache = new Map();

  /**
   * Создает или возвращает из кеша сервис сектора
   *
   * @param {string} sectorId - ID сектора
   * @returns {Promise<object>} Сервис сектора
   */
  static async create(sectorId) {
    // Проверяем кеш
    if (this.serviceCache.has(sectorId)) {
      return this.serviceCache.get(sectorId);
    }

    // Создаем новый сервис
    const service = await this.createServiceInstance(sectorId);

    // Кешируем
    this.serviceCache.set(sectorId, service);

    return service;
  }

  /**
   * Создает экземпляр сервиса для сектора
   *
   * @param {string} sectorId - ID сектора
   * @returns {object} Сервис сектора
   * @private
   */
  static async createServiceInstance(sectorId) {
    switch (sectorId) {
      case '1c':
        // Для сектора 1С используем существующий сервис
        console.log('[SectorServiceFactory] Creating DashboardSector1CService for sector 1c');
        const { DashboardSector1CService } = await import('@/services/dashboard-sector-1c/index.js');
        return new DashboardSector1CService();

      case 'pdm':
        // Для сектора PDM используем реальный сервис
        console.log('[SectorServiceFactory] Creating DashboardSectorPDMService for sector pdm');
        const { DashboardSectorPDMService } = await import('@/services/dashboard/DashboardSectorPDMService.js');
        return new DashboardSectorPDMService();

      case 'bitrix24':
        // Для сектора Bitrix24 используем реальный сервис
        console.log('[SectorServiceFactory] Creating DashboardSectorBitrix24Service for sector bitrix24');
        const { DashboardSectorBitrix24Service } = await import('@/services/dashboard/DashboardSectorBitrix24Service.js');
        return new DashboardSectorBitrix24Service();

      case 'infrastructure':
        // Для сектора Infrastructure используем реальный сервис
        console.log('[SectorServiceFactory] Creating DashboardSectorInfrastructureService for sector infrastructure');
        const { DashboardSectorInfrastructureService } = await import('@/services/dashboard/DashboardSectorInfrastructureService.js');
        return new DashboardSectorInfrastructureService();

      default:
        throw new Error(`Unknown sector: ${sectorId}`);
    }
  }

  /**
   * Проверяет, доступен ли сервис для сектора
   *
   * @param {string} sectorId - ID сектора
   * @returns {boolean} true если сервис доступен
   */
  static isServiceAvailable(sectorId) {
    return ['1c', 'pdm', 'bitrix24', 'infrastructure'].includes(sectorId);
  }

  /**
   * Очищает кеш сервисов
   */
  static clearCache() {
    this.serviceCache.clear();
    console.log('[SectorServiceFactory] Service cache cleared');
  }

  /**
   * Получает информацию о доступных сервисах
   *
   * @returns {object} Информация о сервисах
   */
  static getAvailableServices() {
    return {
      '1c': {
        type: 'full',
        description: 'Полнофункциональный сервис сектора 1С'
      },
      'pdm': {
        type: 'stub',
        description: 'Заглушка сервиса сектора PDM'
      },
      'bitrix24': {
        type: 'stub',
        description: 'Заглушка сервиса сектора Битрикс24'
      },
      'infrastructure': {
        type: 'stub',
        description: 'Заглушка сервиса сектора Инфраструктура'
      }
    };
  }
}

export default SectorServiceFactory;