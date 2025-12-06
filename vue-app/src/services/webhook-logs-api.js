/**
 * Сервис для работы с логами вебхуков
 * 
 * Расположение: vue-app/src/services/webhook-logs-api.js
 * 
 * Документация:
 * - https://context7.com/bitrix24/rest/webhook/
 * - https://apidocs.bitrix24.ru/rest_help/general/webhooks/index.php
 */

export class WebhookLogsApiService {
  /**
   * Получение списка логов
   * 
   * @param {object} filters Фильтры (category, event, date, hour)
   * @param {number} page Номер страницы
   * @param {number} limit Количество записей на странице
   * @returns {Promise<object>} Результат с логами и пагинацией
   */
  static async getLogs(filters = {}, page = 1, limit = 50) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    // Добавление фильтров
    if (filters.category) {
      params.append('category', filters.category);
    }
    if (filters.event) {
      params.append('event', filters.event);
    }
    if (filters.date) {
      params.append('date', filters.date);
    }
    if (filters.hour !== null && filters.hour !== undefined) {
      params.append('hour', filters.hour.toString());
    }
    
    try {
      const response = await fetch(`/api/webhook-logs.php?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error_description || result.error);
      }
      
      return result;
    } catch (error) {
      console.error('Webhook logs API error:', error);
      throw error;
    }
  }
  
  /**
   * Получение детальной информации о логе
   * (используется тот же метод getLogs, но с фильтрацией по ID)
   * 
   * @param {string} logId Уникальный ID лога (комбинация timestamp + event)
   * @param {string} date Дата лога
   * @returns {Promise<object|null>} Данные лога или null
   */
  static async getLogDetails(logId, date = null) {
    // Реализация зависит от структуры ID лога
    // Можно использовать комбинацию timestamp + event для поиска
    const filters = {};
    if (date) {
      filters.date = date;
    }
    
    const result = await this.getLogs(filters, 1, 1000);
    
    // Поиск лога по ID (если ID формируется из timestamp + event)
    const log = result.logs.find(l => {
      const logIdCandidate = `${l.timestamp}_${l.event}`;
      return logIdCandidate === logId;
    });
    
    return log || null;
  }
  
  /**
   * Получение ошибок
   * 
   * @param {object} filters Дополнительные фильтры
   * @param {number} page Номер страницы
   * @param {number} limit Количество записей на странице
   * @returns {Promise<object>} Результат с ошибками и пагинацией
   */
  static async getErrors(filters = {}, page = 1, limit = 50) {
    return this.getLogs({ ...filters, category: 'errors' }, page, limit);
  }
}


