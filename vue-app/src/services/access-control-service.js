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
      // ШАГ 1: Проверка контекста (внутри Bitrix24 или нет)
      const isInsideB24 = isInsideBitrix24();
      
      // Логируем для отладки
      console.log('AccessControlService.checkAccess - isInsideBitrix24:', isInsideB24);
      console.log('AccessControlService.checkAccess - window.self === window.top:', window.self === window.top);
      console.log('AccessControlService.checkAccess - typeof BX24:', typeof BX24);
      
      // ШАГ 2: Если НЕ внутри Bitrix24, проверяем конфигурацию прямого доступа
      if (!isInsideB24) {
        console.log('AccessControlService.checkAccess - Not inside Bitrix24, checking direct access config...');
        
        // Динамический импорт для уменьшения размера бандла
        const { isDirectAccessAllowed, getDenyMessage } = await import('@/utils/direct-access-config.js');
        
        // Проверяем, разрешён ли прямой доступ
        const allowDirectAccess = await isDirectAccessAllowed();
        
        console.log('AccessControlService.checkAccess - allowDirectAccess:', allowDirectAccess);
        
        if (!allowDirectAccess) {
          // Прямой доступ запрещён — возвращаем ошибку доступа
          const denyMessage = await getDenyMessage();
          
          console.warn('Direct access denied: Application opened directly in browser, but direct access is disabled in config');
          console.warn('Deny message:', denyMessage);
          
          return new AccessCheckResult(
            false,
            AccessErrorCodes.ACCESS_DENIED,
            denyMessage,
            null // Пользователь не определён
          );
        }
        
        // Прямой доступ разрешён — продолжаем проверку
        // Логируем для отладки
        console.log('Direct access allowed: Using primary administrator token from settings.php');
        
        // Прямой доступ разрешён — используем токен первичного администратора
        // Это будет обработано в getCurrentUser() через прокси API
        // Прокси API использует токен из settings.php (первичный администратор)
      } else {
        console.log('AccessControlService.checkAccess - Inside Bitrix24, skipping direct access check');
      }
      
      // ШАГ 3: Инициализация Bitrix24 API (только если внутри Bitrix24)
      // Добавляем таймаут для инициализации, но не прерываем при ошибке
      if (isInsideB24) {
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
      
      // ШАГ 4: Получение информации о текущем пользователе
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
        // ВАЖНО: При прямом доступе прокси API вернёт владельца токена (первичного администратора)
        console.warn('Bitrix24BxApi.getCurrentUser() failed, trying proxy API:', getUserError);
        const { Bitrix24ApiProvider } = await import('./bitrix24-api-provider.js');
        try {
          const apiService = await Bitrix24ApiProvider.getInstance();
          user = await Promise.race([
            apiService.getCurrentUser(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Прокси API превысило 5 секунд')), 5000)
            )
          ]);
          console.log('Got user from proxy API:', user?.ID || 'unknown');
        } catch (proxyError) {
          // Если и прокси не работает, выбрасываем ошибку
          console.error('Both BX24 API and proxy API failed:', proxyError);
          throw new Error('Не удалось определить пользователя. Обратитесь в Поддержку приложения в ИТ отдел.');
        }
      }
      
      // ШАГ 5: Проверка, что пользователь определён
      
      if (!user || !user.ID) {
        console.warn('AccessControlService.checkAccess - user not determined:', user);
        return new AccessCheckResult(
          false,
          AccessErrorCodes.USER_NOT_DETERMINED,
          'Не удалось определить пользователя. Обратитесь в Поддержку приложения в ИТ отдел.'
        );
      }
      
      console.log('AccessControlService.checkAccess - user determined:', {
        id: user.ID,
        name: user.NAME,
        departments: user.UF_DEPARTMENT
      });
      
      // ШАГ 6: Получение ID отделов пользователя
      const departmentIds = user.UF_DEPARTMENT || [];
      
      console.log('AccessControlService.checkAccess - departmentIds:', departmentIds);
      
      // ШАГ 7: Проверка, что пользователь привязан к отделу
      // ВАЖНО: При прямом доступе пользователь может быть первичным администратором без отделов
      // В этом случае разрешаем доступ, если прямой доступ разрешён
      if (!Array.isArray(departmentIds) || departmentIds.length === 0) {
        console.log('AccessControlService.checkAccess - user has no departments');
        
        // Если прямой доступ разрешён и мы не внутри Bitrix24, разрешаем доступ
        if (!isInsideB24) {
          const { isDirectAccessAllowed } = await import('@/utils/direct-access-config.js');
          const allowDirectAccess = await isDirectAccessAllowed();
          
          if (allowDirectAccess) {
            console.log('AccessControlService.checkAccess - Direct access allowed, granting access despite no departments');
            return new AccessCheckResult(true, null, null, user);
          }
        }
        
        console.warn('AccessControlService.checkAccess - Access denied: user has no departments');
        return new AccessCheckResult(
          false,
          AccessErrorCodes.ACCESS_DENIED,
          'Доступ запрещён. Пользователь не привязан к отделу.'
        );
      }
      
      // ШАГ 8: Проверка доступа по ID отделов
      const hasAccess = departmentIds.some(deptId => isDepartmentAllowed(deptId));
      
      console.log('AccessControlService.checkAccess - hasAccess:', hasAccess);
      
      if (!hasAccess) {
        console.warn('AccessControlService.checkAccess - Access denied: no allowed departments');
        return new AccessCheckResult(
          false,
          AccessErrorCodes.ACCESS_DENIED,
          'Доступ запрещён'
        );
      }
      
      // ШАГ 9: Доступ разрешён
      console.log('AccessControlService.checkAccess - Access granted');
      return new AccessCheckResult(true, null, null, user);
      
    } catch (error) {
      console.error('AccessControlService.checkAccess error:', error);
      
      // Обработка CORS ошибок
      // ВАЖНО: При прямом доступе CORS ошибки не должны блокировать работу,
      // так как мы используем прокси API
      if (error.message && (
        error.message.includes('CORS') || 
        error.message.includes('blocked') ||
        error.message.includes('ERR_FAILED') ||
        error.message.includes('unknown address space')
      )) {
        // CORS блокирует доступ к BX24 API
        // При прямом доступе это нормально, используем прокси
        // Но если мы внутри Bitrix24 и CORS блокирует - это проблема
        if (isInsideBitrix24()) {
          console.error('CORS error inside Bitrix24: Cannot determine interface user.');
          return new AccessCheckResult(
            false,
            AccessErrorCodes.API_ERROR,
            'Ошибка CORS: не удалось определить пользователя интерфейса. Обратитесь в Поддержку приложения в ИТ отдел.'
          );
        }
        // При прямом доступе CORS ошибка не критична, продолжаем через прокси
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




