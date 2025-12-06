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
import { CacheManager } from '../cache/cache-manager.js';
import { Logger } from '../utils/logger.js';

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
   * Использует кеширование для оптимизации
   * 
   * @param {Array<number>} employeeIds - Массив ID сотрудников
   * @param {boolean} useCache - Использовать кеш (по умолчанию true)
   * @returns {Promise<Array>} Массив сотрудников
   */
  static async getEmployeesByIds(employeeIds, useCache = true) {
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return [];
    }

    // Проверяем кеш
    if (useCache) {
      const cacheKey = CacheManager.getEmployeesCacheKey(employeeIds);
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) {
        Logger.debug(`Cache hit for employees: ${employeeIds.length} employees`, 'EmployeeRepository');
        return cached;
      }
    }

    try {
      const result = await ApiClient.call('user.get', {
        filter: {
          ID: employeeIds
        },
        select: [
          'ID',
          'NAME',
          'LAST_NAME',
          'EMAIL',
          'WORK_POSITION',
          'UF_DEPARTMENT' // Важно: поле отдела для определения сектора
        ]
      });

      // Проверяем структуру ответа
      let users = [];
      if (result && result.result) {
        if (Array.isArray(result.result)) {
          users = result.result;
          
          // Логирование для отладки (только в development)
          if (import.meta.env?.MODE !== 'production') {
            console.log('[EmployeeRepository] Loaded employees:', users.length);
            // Логируем первого сотрудника для проверки формата данных
            if (users.length > 0) {
              const firstUser = users[0];
              console.log('[EmployeeRepository] First employee sample:', {
                ID: firstUser.ID,
                NAME: firstUser.NAME,
                LAST_NAME: firstUser.LAST_NAME,
                UF_DEPARTMENT: firstUser.UF_DEPARTMENT,
                UF_DEPARTMENT_type: typeof firstUser.UF_DEPARTMENT,
                UF_DEPARTMENT_isArray: Array.isArray(firstUser.UF_DEPARTMENT)
              });
            }
          }
        } else {
          Logger.warn('Unexpected user.get result format', 'EmployeeRepository', result);
        }
      }

      // Сохраняем в кеш
      if (useCache) {
        const cacheKey = CacheManager.getEmployeesCacheKey(employeeIds);
        CacheManager.set(cacheKey, users, CacheManager.EMPLOYEES_TTL);
      }

      return users;
    } catch (error) {
      Logger.error('Error getting employees by IDs', 'EmployeeRepository', error);
      // Возвращаем пустой массив при ошибке, чтобы не ломать работу дашборда
      return [];
    }
  }
}

