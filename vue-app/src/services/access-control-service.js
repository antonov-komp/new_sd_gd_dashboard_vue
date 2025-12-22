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
import { isInsideBitrix24 } from '@/utils/bitrix24-context.js';

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
      // Инициализация Bitrix24 API (только если внутри Bitrix24)
      // Добавляем таймаут для инициализации, но не прерываем при ошибке
      if (isInsideBitrix24()) {
        try {
          await Promise.race([
            Bitrix24BxApi.init(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Инициализация Bitrix24 API превысила 5 секунд')), 5000)
            )
          ]);
        } catch (initError) {
          // Если инициализация не удалась, продолжаем - getCurrentUser() сам попробует прокси
          console.warn('BX24.init() failed, will try proxy API:', initError);
        }
      }
      
      // Получение информации о текущем пользователе
      // Автоматически использует правильный метод (BX24 или прокси)
      // Добавляем таймаут для получения пользователя (10 секунд общий)
      let user;
      try {
        user = await Promise.race([
          Bitrix24BxApi.getCurrentUser(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Получение информации о пользователе превысило 10 секунд')), 10000)
          )
        ]);
      } catch (getUserError) {
        // Если BX24 API не работает, пробуем прокси API как fallback
        console.warn('Bitrix24BxApi.getCurrentUser() failed, trying proxy API:', getUserError);
        const { Bitrix24ApiService } = await import('./bitrix24-api.js');
        try {
          user = await Promise.race([
            Bitrix24ApiService.getCurrentUser(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Прокси API превысило 5 секунд')), 5000)
            )
          ]);
          console.log('Got user from proxy API (fallback):', user);
        } catch (proxyError) {
          // Если и прокси не работает, выбрасываем ошибку
          console.error('Both BX24 API and proxy API failed:', proxyError);
          throw new Error('Не удалось определить пользователя. Обратитесь в Поддержку приложения в ИТ отдел.');
        }
      }
      
      // Логируем только ID пользователя для уменьшения шума в консоли
      console.log('AccessControlService.checkAccess - user ID:', user?.ID || 'unknown');
      
      // Проверка, что пользователь определён
      if (!user || !user.ID) {
        console.warn('AccessControlService.checkAccess - user not determined:', user);
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
      
      // Обработка CORS ошибок
      // ВАЖНО: Не используем прокси как fallback, так как он вернёт владельца токена,
      // а не пользователя интерфейса. Это нарушит логику проверки доступа.
      if (error.message && (
        error.message.includes('CORS') || 
        error.message.includes('blocked') ||
        error.message.includes('ERR_FAILED') ||
        error.message.includes('unknown address space') ||
        error.message.includes('интерфейса')
      )) {
        // CORS блокирует доступ к BX24 API
        // НЕ используем прокси, так как он вернёт владельца токена, а не пользователя интерфейса
        console.error('CORS error: Cannot determine interface user. Proxy would return token owner, not interface user.');
        return new AccessCheckResult(
          false,
          AccessErrorCodes.API_ERROR,
          'Ошибка CORS: не удалось определить пользователя интерфейса. Обратитесь в Поддержку приложения в ИТ отдел.'
        );
      }
      
      // Обработка других ошибок API
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
      // Инициализация Bitrix24 API (только если внутри Bitrix24)
      if (isInsideBitrix24()) {
        await Bitrix24BxApi.init();
      }
      return await Bitrix24BxApi.getCurrentUser();
    } catch (error) {
      console.error('AccessControlService.getCurrentUser error:', error);
      return null;
    }
  }
}




