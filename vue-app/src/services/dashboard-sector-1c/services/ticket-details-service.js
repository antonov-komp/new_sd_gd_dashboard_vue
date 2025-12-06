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
   * @returns {Promise<object>} Полные данные тикета
   */
  static async getTicketDetails(ticketId, options = {}) {
    const {
      select = ['*'],
      useOriginalUfNames = true
    } = options;

    try {
      // Получаем базовые данные тикета через репозиторий
      const ticketData = await TicketRepository.getTicket(ticketId);

      if (!ticketData) {
        throw new Error(`Тикет с ID ${ticketId} не найден`);
      }

      // Обрабатываем дополнительные поля
      const additionalFields = this.processAdditionalFields(ticketData);

      // Формируем структурированный ответ
      return {
        // Базовые поля
        id: ticketData.id || ticketData.ID,
        title: ticketData.title || ticketData.TITLE,
        stageId: ticketData.stageId || ticketData.STAGE_ID,
        assignedById: ticketData.assignedById || ticketData.ASSIGNED_BY_ID,
        createdAt: ticketData.createdTime || ticketData.CREATED_TIME || ticketData.CREATED_DATE,
        updatedAt: ticketData.updatedTime || ticketData.UPDATED_TIME || ticketData.MODIFY_DATE,
        priority: ticketData.priority || ticketData.PRIORITY,
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

  /**
   * Обработка дополнительных полей тикета
   * 
   * Извлекает и структурирует дополнительные пользовательские поля (UF_*)
   * из данных тикета.
   * 
   * @param {object} ticketData - Данные тикета из Bitrix24
   * @returns {object} Структурированные дополнительные поля
   */
  static processAdditionalFields(ticketData) {
    const userFields = this.extractUserFields(ticketData);
    
    // Структурируем дополнительные поля
    const additionalFields = {
      // Пример: поле типа продукта
      typeProduct: userFields.UF_CRM_7_TYPE_PRODUCT || 
                   userFields.uf_crm_7_type_product || 
                   userFields.ufCrm7TypeProduct || 
                   null,
      
      // Добавьте здесь другие дополнительные поля по мере необходимости
      // ...
      
      // Все пользовательские поля (для расширяемости)
      all: userFields
    };

    return additionalFields;
  }

  /**
   * Получение списка всех дополнительных полей
   * 
   * Извлекает все поля, начинающиеся с UF_ (пользовательские поля).
   * 
   * @param {object} ticketData - Данные тикета из Bitrix24
   * @returns {object} Объект с дополнительными полями
   */
  static extractUserFields(ticketData) {
    const userFields = {};

    // Проходим по всем ключам объекта
    for (const key in ticketData) {
      if (ticketData.hasOwnProperty(key)) {
        // Проверяем, начинается ли ключ с UF_
        const lowerKey = key.toLowerCase();
        if (lowerKey.startsWith('uf_')) {
          userFields[key] = ticketData[key];
        }
      }
    }

    return userFields;
  }
}

