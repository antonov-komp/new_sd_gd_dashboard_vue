/**
 * Репозиторий для работы с сотрудниками
 * 
 * Отвечает за загрузку данных сотрудников через Bitrix24 REST API
 * 
 * Используемый метод Bitrix24:
 * - user.get - получение данных пользователей
 * 
 * Документация:
 * - https://context7.com/bitrix24/rest/user.get
 */

import { ApiClient } from './api-client.js';

/**
 * Репозиторий для работы с сотрудниками
 */
export class EmployeeRepository {
  /**
   * Получение данных сотрудников по их ID
   * 
   * Метод: user.get
   * Документация: https://context7.com/bitrix24/rest/user.get
   * 
   * @param {Array<number>} employeeIds - Массив ID сотрудников
   * @returns {Promise<Array>} Массив сотрудников
   */
  static async getEmployeesByIds(employeeIds) {
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return [];
    }

    try {
      const result = await ApiClient.call('user.get', {
        filter: {
          ID: employeeIds
        }
      });

      // Проверяем структуру ответа
      let users = [];
      if (result && result.result) {
        if (Array.isArray(result.result)) {
          users = result.result;
        } else {
          console.warn('Unexpected user.get result format:', result);
        }
      }

      return users;
    } catch (error) {
      console.error('Error getting employees by IDs:', error);
      // Возвращаем пустой массив при ошибке, чтобы не ломать работу дашборда
      return [];
    }
  }
}

