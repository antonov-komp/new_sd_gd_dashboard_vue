/**
 * Сервис для получения полных данных по тикету
 * 
 * Получает все поля тикета из смарт-процесса 140, включая дополнительные
 * пользовательские поля (UF_*). Сервис расширяем для будущих полей.
 * 
 * Используемые методы Bitrix24:
 * - crm.item.get - получение элемента смарт-процесса
 * 
 * Документация:
 * - https://context7.com/bitrix24/rest/crm.item.get
 */

import { TicketRepository } from '../data/ticket-repository.js';
import { Logger } from '../utils/logger.js';
import { processAdditionalFields } from '../utils/ticket-field-processor.js';
import { getPriorityByBitrixValue, getPriorityColors } from '@/config/priority-config.js';

/**
 * ID смарт-процесса сектора 1С
 */
const ENTITY_TYPE_ID = 140;

/**
 * Сервис для получения детальных данных по тикету
 */
export class TicketDetailsService {
  /**
   * Получение полных данных по тикету
   * 
   * Получает все поля тикета, включая дополнительные пользовательские поля (UF_*).
   * Возвращает структурированные данные с разделением на базовые и дополнительные поля.
   * 
   * @param {number} ticketId - ID тикета
   * @param {object} options - Опции получения данных
   * @param {Array<string>} options.select - Список полей для получения (по умолчанию ['*'] - все поля)
   * @param {boolean} options.useOriginalUfNames - Использовать оригинальные имена пользовательских полей (по умолчанию true)
   * @param {boolean} options.useCache - Использовать кеш для обработки полей (по умолчанию true)
   * @returns {Promise<import('../types/ticket-types.js').TicketDetails>} Полные данные тикета
   */
  static async getTicketDetails(ticketId, options = {}) {
    const {
      select = ['*'],
      useOriginalUfNames = true,
      useCache = true
    } = options;

    try {
      // Получаем базовые данные тикета через репозиторий
      const ticketData = await TicketRepository.getTicket(ticketId);

      if (!ticketData) {
        throw new Error(`Тикет с ID ${ticketId} не найден`);
      }

      // Использование оптимизированного процессора с кешированием
      const additionalFields = processAdditionalFields(ticketData, ticketId, useCache);

      const priorityRaw =
        ticketData.UF_CRM_7_UF_PRIORITY ||
        ticketData.uf_crm_7_uf_priority ||
        ticketData.ufCrm7UfPriority ||
        ticketData['UF_CRM_7_UF_PRIORITY'] ||
        ticketData['uf_crm_7_uf_priority'] ||
        ticketData.priority ||
        ticketData.PRIORITY ||
        null;

      const priorityObj = getPriorityByBitrixValue(priorityRaw);
      const priorityColors = getPriorityColors(priorityObj);

      // Формируем структурированный ответ
      return {
        // Базовые поля
        id: ticketData.id || ticketData.ID,
        title: ticketData.title || ticketData.TITLE,
        stageId: ticketData.stageId || ticketData.STAGE_ID,
        assignedById: ticketData.assignedById || ticketData.ASSIGNED_BY_ID,
        createdAt: ticketData.createdTime || ticketData.CREATED_TIME || ticketData.CREATED_DATE,
        updatedAt: ticketData.updatedTime || ticketData.UPDATED_TIME || ticketData.MODIFY_DATE,
        priorityId: priorityObj.id,
        priorityLabel: priorityObj.label,
        priorityColors: priorityColors,
        priority: priorityObj.id, // legacy поле для обратной совместимости
        priorityBitrixValue: priorityObj.bitrixValue || null,
        opportunity: ticketData.opportunity || ticketData.OPPORTUNITY,
        currencyId: ticketData.currencyId || ticketData.CURRENCY_ID,
        comments: ticketData.comments || ticketData.COMMENTS,
        
        // Дополнительные пользовательские поля
        additionalFields: additionalFields,
        
        // Все исходные данные (для расширяемости)
        rawData: ticketData
      };
    } catch (error) {
      Logger.error('Error getting ticket details', 'TicketDetailsService', error);
      throw error;
    }
  }

}

