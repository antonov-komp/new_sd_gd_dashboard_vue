/**
 * Адаптер для получения данных сектора в формате, пригодном для создания слепков
 * 
 * Использует существующий сервис DashboardSector1CService для получения данных
 * и обеспечивает совместимость с кешированием и системой прогресса
 * 
 * @class SectorDataAdapter
 */

import { DashboardSector1CService } from '@/services/dashboard-sector-1c/index.js';
import { normalizeSectorDataToSnapshot } from './snapshot-normalizer.js';

/**
 * Адаптер для получения данных сектора для создания слепков
 */
class SectorDataAdapter {
  /**
   * Получить данные сектора для создания слепка
   *
   * Использует существующий сервис DashboardSector1CService.getSectorData()
   * и нормализует данные в формат слепка версии 1.0
   *
   * @param {Object} options - Опции получения данных
   * @param {boolean} options.useCache - Использовать in-memory кеш (по умолчанию true)
   * @param {boolean} options.useBackendCache - Использовать backend кеш через API (по умолчанию false)
   * @param {Function|null} options.onProgress - Колбэк для отслеживания прогресса
   * @param {boolean} options.normalize - Нормализовать данные в формат слепка (по умолчанию true)
   * @param {boolean} options.includeTicketDetails - Включать детальную информацию о тикетах (по умолчанию false)
   * @returns {Promise<Object>} Данные сектора в формате для создания слепка
   *
   * @example
   * // Получение данных с backend кешированием
   * const sectorData = await SectorDataAdapter.getSectorDataForSnapshot({
   *   useBackendCache: true,
   *   normalize: true
   * });
   *
   * @example
   * // Получение данных с отслеживанием прогресса
   * const sectorData = await SectorDataAdapter.getSectorDataForSnapshot({
   *   useCache: true,
   *   onProgress: (progressInfo) => {
   *     console.log('Прогресс:', progressInfo.progress, '%');
   *   },
   *   normalize: true
   * });
   *
   * @example
   * // Получение данных без нормализации (сырые данные)
   * const rawData = await SectorDataAdapter.getSectorDataForSnapshot({
   *   normalize: false
   * });
   */
  static async getSectorDataForSnapshot(options = {}) {
    const {
      useCache = true,
      useBackendCache = false,
      onProgress = null,
      normalize = true,
      includeTicketDetails = false
    } = options;

    try {
      // Вызываем существующий сервис для получения данных сектора
      const sectorData = await DashboardSector1CService.getSectorData(
        useCache,
        useBackendCache,
        onProgress
      );

      // Нормализуем данные в формат слепка, если требуется
      if (normalize) {
        return normalizeSectorDataToSnapshot(sectorData);
      }

      // Иначе возвращаем данные как есть
      // Если требуется детальная информация о тикетах, можно добавить дополнительную обработку
      if (includeTicketDetails) {
        // TODO: Реализовать загрузку детальной информации о тикетах (в будущем)
        console.warn('includeTicketDetails пока не реализовано');
      }

      return sectorData;
    } catch (error) {
      console.error('SectorDataAdapter.getSectorDataForSnapshot error:', error);
      throw error;
    }
  }

  /**
   * Проверить доступность данных сектора
   * 
   * Проверяет, доступен ли сервис DashboardSector1CService и может ли он вернуть данные
   * 
   * @returns {Promise<boolean>} true, если данные доступны
   */
  static async isDataAvailable() {
    try {
      // Пробуем получить данные с кешем (быстрая проверка)
      const data = await DashboardSector1CService.getSectorData(true);
      return data !== null && data !== undefined;
    } catch (error) {
      return false;
    }
  }
}

export default SectorDataAdapter;

