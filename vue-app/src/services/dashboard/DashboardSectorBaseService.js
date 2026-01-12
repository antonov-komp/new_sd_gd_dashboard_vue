/**
 * Базовый сервис для дашбордов секторов
 *
 * Работает с Bitrix24 API и смарт-процессом DT140_12
 * Все секторы используют одни и те же стадии DT140_12
 * Различие только в фильтре UF_CRM_7_TYPE_PRODUCT
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { TicketRepository } from './data/ticket-repository.js';
import { EmployeeRepository } from './data/employee-repository.js';
import { ApiClient } from './data/api-client.js';
import { CacheManager } from './cache/cache-manager.js';
import { ENTITY_TYPE_ID } from './utils/constants.js';
import { getTargetStages } from './mappers/stage-mapper.js';
import { filterTicketsBySector } from './filters/sector-filter.js';
import { getSectorFilterDescription } from './utils/sector-config-helper.js';
import { groupTicketsByStages, getZeroPointTickets, extractUniqueEmployeeIds } from './groupers/ticket-grouper.js';
import { Logger } from './utils/logger.js';
import { clearSectorCache } from './utils/sector-helper.js';
import { getDiagnosticsService, isDiagnosticsEnabled } from './utils/diagnostics-service.js';
import { CacheNotificationService } from '@/services/cache-notification-service.js';

export class DashboardSectorBaseService {
  /**
   * @param {string} sectorId - ID сектора ('1c', 'pdm', 'bitrix24', 'infrastructure')
   * @param {object} config - конфигурация сектора
   */
  constructor(sectorId, config) {
    this.sectorId = sectorId;
    this.config = {
      name: config.name,
      filterField: 'UF_CRM_7_TYPE_PRODUCT',
      filterValue: config.filterValue,
      ...config
    };

    Logger.info(`DashboardSectorBaseService initialized for sector: ${sectorId}`, 'DashboardSectorBaseService');
  }

  /**
   * Получение данных сектора
   *
   * @param {object} options - опции загрузки
   * @returns {Promise<object>} данные сектора
   */
  async getSectorData(options = {}) {
    const useCache = options.useCache !== false; // по умолчанию true
    const useBackendCache = options.useBackendCache || false;
    const onProgress = options.onProgress || null;

    let cacheWasCreated = false;

    // Временно отключаем кеширование для тестирования
    // TODO: Включить кеширование после исправления CacheManager
    /*
    // Проверяем кеш в начале
    if (useCache) {
      const cacheKey = CacheManager.getSectorDataCacheKey(this.sectorId);
      const cachedData = CacheManager.get(cacheKey);

      if (cachedData) {
        Logger.info(`Using cached sector data for ${this.sectorId}`, 'DashboardSectorBaseService');
        return cachedData;
      }
    }
    */

    // Сбрасываем диагностику перед загрузкой
    try {
      if (isDiagnosticsEnabled()) {
        const diagnostics = getDiagnosticsService();
        if (diagnostics) {
          diagnostics.reset();
        }
      }
    } catch (diagError) {
      Logger.warn('Error resetting diagnostics', 'DashboardSectorBaseService', diagError);
    }

    // Начало загрузки
    if (onProgress) {
      onProgress({
        step: 'initialization',
        progress: 0,
        details: { description: `Инициализация загрузки сектора ${this.config.name}...` }
      });
    }

    try {
      // Шаг 1: Получаем все тикеты смарт-процесса с фильтрацией по сектору
      if (onProgress) {
        onProgress({
          step: 'loading_tickets',
          progress: 10,
          details: { description: `Загрузка тикетов сектора ${this.config.name} из Bitrix24...` }
        });
      }

      // Получаем тикеты с фильтром по UF_CRM_7_TYPE_PRODUCT
      const filter = {};
      filter[this.config.filterField || 'UF_CRM_7_TYPE_PRODUCT'] = this.config.filterValue;

      const allTickets = await TicketRepository.getTicketsByFilter(filter, {
        entityTypeId: ENTITY_TYPE_ID
      });

      // Применяем универсальную фильтрацию по сектору (дополнительная проверка)
      const sectorTickets = filterTicketsBySector(allTickets, {
        id: this.sectorId,
        name: this.config.name,
        filterValue: this.config.filterValue,
        filterField: this.config.filterField || 'UF_CRM_7_TYPE_PRODUCT'
      });

      // Логирование результатов фильтрации для диагностики
      Logger.info(`Sector filtering completed for ${this.config.name}`, 'DashboardSectorBaseService', {
        sectorId: this.sectorId,
        totalTickets: allTickets.length,
        filteredTickets: sectorTickets.length,
        filterDescription: getSectorFilterDescription({
          filterValue: this.config.filterValue,
          filterField: this.config.filterField || 'UF_CRM_7_TYPE_PRODUCT'
        })
      });

      // Шаг 2: Извлекаем уникальных сотрудников
      if (onProgress) {
        onProgress({
          step: 'extracting_employees',
          progress: 55,
          details: { description: 'Извлечение данных сотрудников...' }
        });
      }

      const employeeIds = extractUniqueEmployeeIds(sectorTickets);
      const employees = await EmployeeRepository.getEmployeesByIds(employeeIds);

      // Шаг 3: Группируем тикеты по стадиям
      if (onProgress) {
        onProgress({
          step: 'grouping_tickets',
          progress: 85,
          details: { description: 'Группировка тикетов по стадиям...' }
        });
      }

      const targetStages = getTargetStages();
      const { stages, zeroPointTickets } = groupTicketsByStages(sectorTickets, employees, targetStages);

      // Формируем итоговые данные
      const result = {
        stages,
        employees,
        zeroPointTickets,
        metadata: {
          sectorId: this.sectorId,
          sectorName: this.config.name,
          filterValue: this.config.filterValue,
          totalTickets: sectorTickets.length,
          totalEmployees: employees.length,
          lastUpdated: new Date().toISOString()
        }
      };

      // Временно отключаем кеширование для тестирования
      // TODO: Включить кеширование после исправления CacheManager
      /*
      // Кешируем результат
      if (useCache) {
        const cacheKey = CacheManager.getSectorDataCacheKey(this.sectorId);
        CacheManager.set(cacheKey, result);
        Logger.info(`Sector data cached for ${this.sectorId}`, 'DashboardSectorBaseService');
      }
      */

      if (onProgress) {
        onProgress({
          step: 'completed',
          progress: 100,
          details: {
            description: `Загрузка сектора ${this.config.name} завершена`,
            totalTickets: sectorTickets.length,
            totalEmployees: employees.length
          }
        });
      }

      Logger.info(`Sector data loaded successfully for ${this.sectorId}`, 'DashboardSectorBaseService', {
        totalTickets: sectorTickets.length,
        totalEmployees: employees.length,
        stagesCount: stages.length
      });

      return result;

    } catch (error) {
      Logger.error(`Error loading sector data for ${this.sectorId}`, 'DashboardSectorBaseService', error);

      if (onProgress) {
        onProgress({
          step: 'error',
          progress: 0,
          details: { description: `Ошибка загрузки: ${error.message}`, error: true }
        });
      }

      throw error;
    }
  }

  /**
   * Обновление назначения тикета
   */
  async updateTicketAssignment(ticketId, stageId, employeeId) {
    try {
      Logger.info(`Updating ticket assignment: ${ticketId} -> ${stageId} -> ${employeeId}`, 'DashboardSectorBaseService');

      // Используем ApiClient для обновления
      const result = await ApiClient.call('crm.item.update', {
        entityTypeId: ENTITY_TYPE_ID,
        id: ticketId,
        fields: {
          stageId: stageId,
          assignedById: employeeId
        }
      });

      // Очищаем кеш сектора
      clearSectorCache(this.sectorId);

      Logger.info(`Ticket assignment updated successfully: ${ticketId}`, 'DashboardSectorBaseService');
      return result;

    } catch (error) {
      Logger.error(`Error updating ticket assignment: ${ticketId}`, 'DashboardSectorBaseService', error);
      throw error;
    }
  }

  /**
   * Создание нового тикета
   */
  async createTicket(ticketData) {
    try {
      Logger.info('Creating new ticket', 'DashboardSectorBaseService', ticketData);

      const result = await ApiClient.call('crm.item.add', {
        entityTypeId: ENTITY_TYPE_ID,
        fields: {
          ...ticketData,
          [this.config.filterField]: this.config.filterValue // устанавливаем фильтр сектора
        }
      });

      // Очищаем кеш сектора
      clearSectorCache(this.sectorId);

      Logger.info(`Ticket created successfully: ${result.result}`, 'DashboardSectorBaseService');
      return {
        id: result.result,
        ...ticketData
      };

    } catch (error) {
      Logger.error('Error creating ticket', 'DashboardSectorBaseService', error);
      throw error;
    }
  }
}