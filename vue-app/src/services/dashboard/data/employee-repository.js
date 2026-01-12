/**
 * Репозиторий для работы с сотрудниками Bitrix24
 *
 * Предоставляет методы для получения информации о сотрудниках
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { ApiClient } from './api-client.js';
import { Logger } from '../utils/logger.js';

export class EmployeeRepository {
  /**
   * Получение всех сотрудников
   *
   * @param {object} options - Опции загрузки
   * @returns {Promise<Array>} Массив сотрудников
   */
  static async getAllEmployees(options = {}) {
    try {
      Logger.info('Loading all employees from Bitrix24', 'EmployeeRepository');

      const employees = await ApiClient.call('user.get', {
        filter: { 'ACTIVE': 'Y' },
        select: ['ID', 'NAME', 'LAST_NAME', 'DEPARTMENT', 'UF_*']
      });

      Logger.info(`Loaded ${employees.length} employees`, 'EmployeeRepository');
      return employees;
    } catch (error) {
      Logger.error('Failed to load employees', 'EmployeeRepository', error);
      throw error;
    }
  }

  /**
   * Получение сотрудника по ID
   *
   * @param {string} employeeId - ID сотрудника
   * @returns {Promise<object>} Сотрудник
   */
  static async getEmployeeById(employeeId) {
    try {
      Logger.info(`Loading employee ${employeeId}`, 'EmployeeRepository');

      const employees = await ApiClient.call('user.get', {
        filter: { 'ID': employeeId },
        select: ['ID', 'NAME', 'LAST_NAME', 'DEPARTMENT', 'UF_*']
      });

      return employees[0] || null;
    } catch (error) {
      Logger.error(`Failed to load employee ${employeeId}`, 'EmployeeRepository', error);
      throw error;
    }
  }

  /**
   * Получение сотрудников по ID
   *
   * @param {Array<string>} employeeIds - Массив ID сотрудников
   * @returns {Promise<Array>} Массив сотрудников
   */
  static async getEmployeesByIds(employeeIds) {
    try {
      Logger.info(`Loading employees by IDs: ${employeeIds.join(', ')}`, 'EmployeeRepository');

      if (!employeeIds || employeeIds.length === 0) {
        return [];
      }

      // Для каждого ID делаем отдельный запрос (в mock режиме это работает)
      const employees = [];
      for (const employeeId of employeeIds) {
        try {
          const employee = await this.getEmployeeById(employeeId);
          if (employee) {
            employees.push(employee);
          }
        } catch (error) {
          Logger.warn(`Failed to load employee ${employeeId}, skipping`, 'EmployeeRepository');
        }
      }

      Logger.info(`Loaded ${employees.length} employees out of ${employeeIds.length} requested`, 'EmployeeRepository');
      return employees;
    } catch (error) {
      Logger.error(`Failed to load employees by IDs`, 'EmployeeRepository', error);
      throw error;
    }
  }

  /**
   * Получение сотрудников по отделу
   *
   * @param {string} departmentId - ID отдела
   * @returns {Promise<Array>} Массив сотрудников
   */
  static async getEmployeesByDepartment(departmentId) {
    try {
      Logger.info(`Loading employees for department ${departmentId}`, 'EmployeeRepository');

      const employees = await ApiClient.call('user.get', {
        filter: {
          'ACTIVE': 'Y',
          'UF_DEPARTMENT': departmentId
        },
        select: ['ID', 'NAME', 'LAST_NAME', 'DEPARTMENT', 'UF_*']
      });

      Logger.info(`Loaded ${employees.length} employees for department ${departmentId}`, 'EmployeeRepository');
      return employees;
    } catch (error) {
      Logger.error(`Failed to load employees for department ${departmentId}`, 'EmployeeRepository', error);
      throw error;
    }
  }
}

export default EmployeeRepository;