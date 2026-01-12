/**
 * Репозиторий для работы с тикетами Bitrix24
 *
 * Предоставляет методы для получения и фильтрации тикетов
 * из смарт-процесса DT140_12
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { ApiClient } from './api-client.js';
import { Logger } from '../utils/logger.js';

export class TicketRepository {
  /**
   * Получение всех тикетов сектора
   *
   * @param {object} options - Опции загрузки
   * @returns {Promise<Array>} Массив тикетов
   */
  static async getAllTickets(options = {}) {
    try {
      Logger.info('Loading all tickets from Bitrix24', 'TicketRepository');

      const tickets = await ApiClient.getSmartProcessItems({
        entityTypeId: options.entityTypeId || 140,
        select: [
          'ID', 'TITLE', 'CREATED_TIME', 'MOVED_TIME', 'UF_*',
          'ASSIGNED_BY_ID', 'CREATED_BY_ID', 'STAGE_ID'
        ],
        filter: options.filter || {},
        order: { 'CREATED_TIME': 'DESC' }
      });

      Logger.info(`Loaded ${tickets.length} tickets`, 'TicketRepository');
      return tickets;
    } catch (error) {
      Logger.error('Failed to load tickets', 'TicketRepository', error);
      throw error;
    }
  }

  /**
   * Получение тикетов по фильтру
   *
   * @param {object} filter - Фильтр тикетов
   * @param {object} options - Опции загрузки
   * @returns {Promise<Array>} Массив тикетов
   */
  static async getTicketsByFilter(filter, options = {}) {
    try {
      Logger.info('Loading filtered tickets', 'TicketRepository', { filter });

      const tickets = await ApiClient.getSmartProcessItems({
        entityTypeId: options.entityTypeId || 140,
        select: [
          'ID', 'TITLE', 'CREATED_TIME', 'MOVED_TIME', 'UF_*',
          'ASSIGNED_BY_ID', 'CREATED_BY_ID', 'STAGE_ID'
        ],
        filter: filter,
        order: { 'CREATED_TIME': 'DESC' }
      });

      Logger.info(`Loaded ${tickets.length} filtered tickets`, 'TicketRepository');
      return tickets;
    } catch (error) {
      Logger.error('Failed to load filtered tickets', 'TicketRepository', error);
      throw error;
    }
  }

  /**
   * Получение тикета по ID
   *
   * @param {string} ticketId - ID тикета
   * @returns {Promise<object>} Тикет
   */
  static async getTicketById(ticketId) {
    try {
      Logger.info(`Loading ticket ${ticketId}`, 'TicketRepository');

      const ticket = await ApiClient.getSmartProcessItem(ticketId, {
        entityTypeId: 140,
        select: [
          'ID', 'TITLE', 'CREATED_TIME', 'MOVED_TIME', 'UF_*',
          'ASSIGNED_BY_ID', 'CREATED_BY_ID', 'STAGE_ID'
        ]
      });

      return ticket;
    } catch (error) {
      Logger.error(`Failed to load ticket ${ticketId}`, 'TicketRepository', error);
      throw error;
    }
  }
}

export default TicketRepository;