/**
 * Сервис проверки доступа к приложению
 * 
 * Проверяет, имеет ли текущий пользователь доступ к приложению
 * на основе его принадлежности к разрешённым отделам
 * 
 * Используется метод Bitrix24 REST API: user.current
 * Документация: https://context7.com/bitrix24/rest/user.current
 */

import { isDepartmentAllowed } from '@/config/access-config.js';
import { Bitrix24BxApi } from './bitrix24-bx-api.js';

/**
 * Коды ошибок доступа
 */
export const AccessErrorCodes = {
  USER_NOT_DETERMINED: 'USER_NOT_DETERMINED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  API_ERROR: 'API_ERROR'
};

/**
 * Результат проверки доступа
 */
export class AccessCheckResult {
  constructor(allowed, errorCode = null, errorMessage = null, user = null) {
    this.allowed = allowed;
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
    this.user = user;
  }
}

export class AccessControlService {
  /**
   * Проверка доступа текущего пользователя
   * 
   * @returns {Promise<AccessCheckResult>} Результат проверки доступа
   */
  static async checkAccess() {
    try {
      // Инициализация Bitrix24 API
      await Bitrix24BxApi.init();
      
      // Получение информации о текущем пользователе
      const user = await Bitrix24BxApi.getCurrentUser();
      
      // Проверка, что пользователь определён
      if (!user || !user.ID) {
        return new AccessCheckResult(
          false,
          AccessErrorCodes.USER_NOT_DETERMINED,
          'Не удалось определить пользователя. Обратитесь в Поддержку приложения в ИТ отдел.'
        );
      }
      
      // Получение ID отделов пользователя
      const departmentIds = user.UF_DEPARTMENT || [];
      
      // Проверка, что пользователь привязан к отделу
      if (!Array.isArray(departmentIds) || departmentIds.length === 0) {
        return new AccessCheckResult(
          false,
          AccessErrorCodes.ACCESS_DENIED,
          'Доступ запрещён. Пользователь не привязан к отделу.'
        );
      }
      
      // Проверка доступа по ID отделов
      const hasAccess = departmentIds.some(deptId => isDepartmentAllowed(deptId));
      
      if (!hasAccess) {
        return new AccessCheckResult(
          false,
          AccessErrorCodes.ACCESS_DENIED,
          'Доступ запрещён'
        );
      }
      
      // Доступ разрешён
      return new AccessCheckResult(true, null, null, user);
      
    } catch (error) {
      console.error('AccessControlService.checkAccess error:', error);
      
      // Обработка ошибок API
      if (error.message && error.message.includes('not loaded')) {
        return new AccessCheckResult(
          false,
          AccessErrorCodes.USER_NOT_DETERMINED,
          'Не удалось определить пользователя. Обратитесь в Поддержку приложения в ИТ отдел.'
        );
      }
      
      return new AccessCheckResult(
        false,
        AccessErrorCodes.API_ERROR,
        'Ошибка при проверке доступа. Обратитесь в Поддержку приложения в ИТ отдел.'
      );
    }
  }
  
  /**
   * Получение информации о текущем пользователе
   * 
   * @returns {Promise<object|null>} Информация о пользователе или null
   */
  static async getCurrentUser() {
    try {
      await Bitrix24BxApi.init();
      return await Bitrix24BxApi.getCurrentUser();
    } catch (error) {
      console.error('AccessControlService.getCurrentUser error:', error);
      return null;
    }
  }
}




