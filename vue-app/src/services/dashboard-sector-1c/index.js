/**
 * Публичный API сервиса дашборда сектора 1С
 * 
 * Объединяет все модули (репозитории, мапперы, фильтры, групперы)
 * в единый интерфейс для работы с дашбордом
 * 
 * Используемые методы Bitrix24 REST API:
 * - crm.item.list - получение списка элементов смарт-процесса
 * - crm.item.get - получение детальной информации об элементе
 * - crm.item.update - обновление элемента
 * - crm.item.add - создание элемента
 * - user.get - получение данных сотрудников
 * - crm.timeline.comment.add - добавление комментария
 * 
 * Документация:
 * - https://context7.com/bitrix24/rest/crm.item.list
 * - https://context7.com/bitrix24/rest/crm.item.update
 * - https://context7.com/bitrix24/rest/user.get
 */

import { TicketRepository } from './data/ticket-repository.js';
import { EmployeeRepository } from './data/employee-repository.js';
import { mapTicket } from './mappers/ticket-mapper.js';
import { mapEmployees } from './mappers/employee-mapper.js';
import { mapStageIdToBitrix } from './mappers/stage-mapper.js';
import { getTargetStages } from './mappers/stage-mapper.js';
import { filterBySector } from './filters/sector-filter.js';
import { groupTicketsByStages, getZeroPointTickets, extractUniqueEmployeeIds } from './groupers/ticket-grouper.js';
import { ApiClient } from './data/api-client.js';
import { CacheManager } from './cache/cache-manager.js';
import { ENTITY_TYPE_ID } from './utils/constants.js';

/**
 * Сервис для работы с дашбордом сектора 1С
 */
export class DashboardSector1CService {
  /**
   * Получение данных сектора 1С
   * 
   * Логика:
   * 1. Проверяем кеш данных сектора
   * 2. Если кеш есть - возвращаем из кеша
   * 3. Если кеша нет:
   *    - Получаем все тикеты смарт-процесса 140 (с пагинацией, с кешированием)
   *    - Фильтруем тикеты по тегу сектора 1С
   *    - Из тикетов извлекаем уникальных сотрудников (assignedById)
   *    - Получаем данные только этих сотрудников (с кешированием)
   *    - Раскладываем тикеты по этапам и сотрудникам
   *    - Сохраняем результат в кеш
   * 
   * @param {boolean} useCache - Использовать кеш (по умолчанию true)
   * @returns {Promise<object>} Данные сектора (stages, employees, zeroPointTickets)
   */
  static async getSectorData(useCache = true) {
    // Проверяем кеш
    if (useCache) {
      const cacheKey = CacheManager.getSectorDataCacheKey();
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) {
        console.log('Cache hit for sector data');
        return cached;
      }
    }

    try {
      // Шаг 1: Получаем все тикеты с пагинацией (с кешированием)
      const targetStages = getTargetStages();
      const allTickets = await TicketRepository.getAllTickets(targetStages);
      console.log('Total tickets loaded:', allTickets.length);

      // Шаг 2: Фильтруем тикеты по тегу сектора 1С
      const filteredTickets = filterBySector(allTickets);
      console.log(`Filtered ${filteredTickets.length} tickets from ${allTickets.length} (sector tag: 1C)`);

      // Шаг 3: Извлекаем уникальных сотрудников из тикетов
      const uniqueEmployeeIds = extractUniqueEmployeeIds(filteredTickets);
      console.log('Unique employee IDs:', uniqueEmployeeIds);

      // Шаг 4: Получаем данные только этих сотрудников (с кешированием)
      const bitrixUsers = await EmployeeRepository.getEmployeesByIds(uniqueEmployeeIds);
      const employees = mapEmployees(bitrixUsers);
      console.log('Loaded employees:', employees.length);

      // Шаг 5: Группируем тикеты по этапам и сотрудникам
      const stages = groupTicketsByStages(filteredTickets, employees);

      const result = {
        stages,
        employees: employees,
        zeroPointTickets: getZeroPointTickets(filteredTickets)
      };

      // Сохраняем в кеш
      if (useCache) {
        const cacheKey = CacheManager.getSectorDataCacheKey();
        CacheManager.set(cacheKey, result, CacheManager.TICKETS_TTL);
      }

      return result;
    } catch (error) {
      console.error('Error getting sector data:', error);
      throw error;
    }
  }

  /**
   * Назначение тикета сотруднику
   * 
   * Метод: crm.item.update
   * Документация: https://context7.com/bitrix24/rest/crm.item.update
   * 
   * @param {number} ticketId - ID тикета
   * @param {number} employeeId - ID сотрудника
   * @param {string} stageId - ID этапа (внутренний формат: formed, review, execution)
   * @returns {Promise<boolean>} Успешность операции
   */
  static async assignTicket(ticketId, employeeId, stageId) {
    try {
      const bitrixStageId = mapStageIdToBitrix(stageId);
      const result = await TicketRepository.assignTicket(ticketId, employeeId, bitrixStageId);
      
      // Инвалидируем кеш данных сектора после назначения
      if (result) {
        CacheManager.invalidateTicketsCache();
      }
      
      return result;
    } catch (error) {
      console.error('Error assigning ticket:', error);
      throw error;
    }
  }

  /**
   * Создание нового тикета
   * 
   * Метод: crm.item.add
   * Документация: https://context7.com/bitrix24/rest/crm.item.add
   * 
   * @param {object} ticketData - Данные тикета
   * @param {string} ticketData.title - Название тикета
   * @param {number} ticketData.employeeId - ID сотрудника (опционально)
   * @param {string} ticketData.stageId - ID этапа (внутренний формат: formed, review, execution)
   * @returns {Promise<number>} ID созданного тикета
   */
  static async createTicket(ticketData) {
    try {
      const bitrixStageId = mapStageIdToBitrix(ticketData.stageId || 'formed');
      
      const fields = {
        title: ticketData.title,
        stageId: bitrixStageId
      };

      if (ticketData.employeeId) {
        fields.assignedById = ticketData.employeeId;
      }

      const ticketId = await TicketRepository.createTicket(fields);
      
      // Инвалидируем кеш данных сектора после создания
      if (ticketId > 0) {
        CacheManager.invalidateTicketsCache();
      }
      
      return ticketId;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

  /**
   * Получение детальной информации о тикете
   * 
   * Метод: crm.item.get
   * Документация: https://context7.com/bitrix24/rest/crm.item.get
   * 
   * @param {number} ticketId - ID тикета
   * @returns {Promise<object>} Данные тикета во внутреннем формате
   */
  static async getTicket(ticketId) {
    try {
      const bitrixTicket = await TicketRepository.getTicket(ticketId);
      return mapTicket(bitrixTicket);
    } catch (error) {
      console.error('Error getting ticket:', error);
      throw error;
    }
  }

  /**
   * Добавление комментария к тикету
   * 
   * Метод: crm.timeline.comment.add
   * Документация: https://context7.com/bitrix24/rest/crm.timeline.comment.add
   * 
   * @param {number} ticketId - ID тикета
   * @param {string} comment - Текст комментария
   * @returns {Promise<boolean>} Успешность операции
   */
  static async addComment(ticketId, comment) {
    try {
      const result = await ApiClient.call('crm.timeline.comment.add', {
        fields: {
          entityId: ticketId,
          entityType: 'DYNAMIC_' + ENTITY_TYPE_ID, // Для смарт-процессов используется префикс DYNAMIC_
          comment: comment
        }
      });

      return result.result !== undefined;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }
}

