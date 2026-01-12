/**
 * Базовый сервис для дашбордов секторов (упрощенная версия без кеширования)
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { TicketRepository } from './data/ticket-repository.js';
import { EmployeeRepository } from './data/employee-repository.js';
import { ENTITY_TYPE_ID } from './utils/constants.js';
import { getTargetStages } from './mappers/stage-mapper.js';
import { filterTicketsBySector } from './filters/sector-filter.js';
import { groupTicketsByStages, extractUniqueEmployeeIds, getZeroPointTickets } from './groupers/ticket-grouper.js';
import { Logger } from './utils/logger.js';

export class DashboardSectorBaseService {
  /**
   * @param {string} sectorId - ID сектора
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
   */
  async getSectorData(options = {}) {
    Logger.info(`Loading sector data for ${this.sectorId}`, 'DashboardSectorBaseService');

    try {
      // Шаг 1: Получаем тикеты с фильтром по сектору
      const filter = {};
      filter[this.config.filterField] = this.config.filterValue;

      Logger.info(`Getting tickets with filter:`, 'DashboardSectorBaseService', filter);

      const allTickets = await TicketRepository.getTicketsByFilter(filter, {
        entityTypeId: ENTITY_TYPE_ID
      });

      Logger.info(`Found ${allTickets.length} tickets for sector ${this.sectorId}`, 'DashboardSectorBaseService');

      // Применяем дополнительную фильтрацию по сектору
      const sectorTickets = filterTicketsBySector(allTickets, {
        id: this.sectorId,
        name: this.config.name,
        filterValue: this.config.filterValue,
        filterField: this.config.filterField
      });

      Logger.info(`After sector filtering: ${sectorTickets.length} tickets`, 'DashboardSectorBaseService');

      // Шаг 2: Получаем сотрудников
      const employeeIds = extractUniqueEmployeeIds(sectorTickets);
      Logger.info(`Getting employees for IDs:`, 'DashboardSectorBaseService', employeeIds);

      const employees = await EmployeeRepository.getEmployeesByIds(employeeIds);
      Logger.info(`Found ${employees.length} employees`, 'DashboardSectorBaseService');

      // Шаг 3: Группируем тикеты по этапам
      const stages = getTargetStages();
      const ticketsByStages = groupTicketsByStages(sectorTickets);

      // Обновляем этапы с реальными данными
      stages.forEach(stage => {
        const stageTickets = ticketsByStages[stage.id] || [];
        stage.tickets = stageTickets;
        stage.ticketCount = stageTickets.length;
      });

      // Формируем результат
      const result = {
        stages: stages,
        employees: employees,
        zeroPointTickets: getZeroPointTickets(sectorTickets),
        metadata: {
          sectorId: this.sectorId,
          sectorName: this.config.name,
          filterValue: this.config.filterValue,
          totalTickets: sectorTickets.length,
          totalEmployees: employees.length,
          lastUpdated: new Date().toISOString()
        }
      };

      Logger.info(`Sector data loaded successfully for ${this.sectorId}`, 'DashboardSectorBaseService', {
        totalTickets: sectorTickets.length,
        totalEmployees: employees.length,
        stagesCount: stages.length
      });

      return result;

    } catch (error) {
      Logger.error(`Error loading sector data for ${this.sectorId}`, 'DashboardSectorBaseService', error);
      throw error;
    }
  }
}

export default DashboardSectorBaseService;