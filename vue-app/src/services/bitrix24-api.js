/**
 * Сервис для работы с Bitrix24 REST API через PHP backend
 * 
 * Используется для вызова методов Bitrix24 REST API через PHP endpoint
 * Документация: https://context7.com/bitrix24/rest/
 */
export class Bitrix24ApiService {
  /**
   * Базовый URL для API запросов
   */
  static getApiUrl() {
    // Определяем базовый путь автоматически
    const path = window.location.pathname;
    const basePath = path.substring(0, path.lastIndexOf('/'));
    return basePath + '/api/bitrix24.php';
  }

  /**
   * Вызов метода Bitrix24 REST API
   * 
   * @param {string} method - Метод API (например, 'profile', 'crm.lead.list')
   * @param {object} params - Параметры запроса
   * @returns {Promise<object>} Результат запроса
   */
  static async call(method, params = {}) {
    try {
      const response = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          method,
          params
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error_description || result.error);
      }

      return result;
    } catch (error) {
      console.error('Bitrix24 API error:', error);
      throw error;
    }
  }

  /**
   * Получение профиля приложения
   * 
   * Метод: profile
   * Документация: https://context7.com/bitrix24/rest/profile
   * 
   * @returns {Promise<object>} Профиль приложения
   */
  static async getProfile() {
    return this.call('profile', {});
  }

  /**
   * Получение списка лидов
   * 
   * Метод: crm.lead.list
   * Документация: https://context7.com/bitrix24/rest/crm.lead.list
   * 
   * @param {object} filter - Фильтр для выборки
   * @param {array} select - Поля для выборки
   * @param {object} order - Сортировка
   * @returns {Promise<array>} Массив лидов
   */
  static async getLeads(filter = {}, select = ['ID', 'NAME', 'EMAIL', 'PHONE'], order = { ID: 'DESC' }) {
    const result = await this.call('crm.lead.list', {
      filter,
      select,
      order
    });

    return result.result || [];
  }
}

