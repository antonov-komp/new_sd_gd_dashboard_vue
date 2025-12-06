/**
 * Базовый клиент для работы с Bitrix24 REST API
 * 
 * Обёртка над Bitrix24ApiService для работы с дашбордом сектора 1С
 * 
 * Документация Bitrix24 REST API:
 * - https://context7.com/bitrix24/rest/
 */

import { Bitrix24ApiService } from '../../bitrix24-api.js';

/**
 * Базовый клиент для API запросов
 */
export class ApiClient {
  /**
   * Вызов метода Bitrix24 REST API
   * 
   * @param {string} method - Метод API (например, 'crm.item.list')
   * @param {object} params - Параметры запроса
   * @returns {Promise<object>} Результат запроса
   */
  static async call(method, params = {}) {
    return await Bitrix24ApiService.call(method, params);
  }
}


