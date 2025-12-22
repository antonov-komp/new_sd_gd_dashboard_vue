/**
 * Сервис для работы с Bitrix24 BX24.* API
 * 
 * Обёртка для работы с BX24.* API (BX24.init, BX24.callMethod, BX24.installFinish)
 * Документация: https://dev.1c-bitrix.ru/rest_help/js_library/index.php
 * 
 * Поддерживает автоматический fallback на прокси API через Laravel backend
 * при работе вне Bitrix24 iframe или при ошибках CORS
 */
import { isInsideBitrix24, isBX24Available } from '@/utils/bitrix24-context.js';
import { Bitrix24ApiService } from './bitrix24-api.js';

export class Bitrix24BxApi {
  /**
   * Инициализация Bitrix24 API
   * 
   * Если приложение работает вне Bitrix24 iframe, пропускает инициализацию
   * для избежания ошибок CORS
   * 
   * @param {function} callback - Функция обратного вызова после инициализации
   * @returns {Promise<void>}
   */
  static init(callback) {
    return new Promise((resolve, reject) => {
      // Если мы не внутри Bitrix24, не пытаемся инициализировать BX24
      if (!isInsideBitrix24()) {
        console.log('Not inside Bitrix24, skipping BX24.init()');
        if (callback) {
          callback();
        }
        resolve();
        return;
      }

      if (typeof BX24 === 'undefined') {
        // Если BX24 недоступен, но мы думаем что внутри Bitrix24 — это ошибка
        reject(new Error('Bitrix24 API not loaded. Make sure script is included: //api.bitrix24.com/api/v1/'));
        return;
      }

      // Таймаут для инициализации (5 секунд)
      const timeout = setTimeout(() => {
        reject(new Error('BX24.init() timeout: инициализация Bitrix24 API превысила 5 секунд'));
      }, 5000);

      try {
        BX24.init(() => {
          clearTimeout(timeout);
          if (callback) {
            callback();
          }
          resolve();
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Завершение установки приложения
   * 
   * Документация: https://dev.1c-bitrix.ru/rest_help/js_library/bx24_installfinish.php
   * 
   * @returns {Promise<void>}
   */
  static installFinish() {
    return new Promise((resolve, reject) => {
      if (typeof BX24 === 'undefined') {
        reject(new Error('Bitrix24 API not loaded'));
        return;
      }

      try {
        BX24.installFinish();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Вызов метода Bitrix24 через BX24.callMethod
   * 
   * Документация: https://dev.1c-bitrix.ru/rest_help/js_library/bx24_callmethod.php
   * 
   * @param {string} method - Метод API (например, 'user.current')
   * @param {object} params - Параметры запроса
   * @returns {Promise<object>} Результат запроса
   */
  static callMethod(method, params = {}) {
    return new Promise((resolve, reject) => {
      if (typeof BX24 === 'undefined') {
        reject(new Error('Bitrix24 API not loaded'));
        return;
      }

      // Таймаут для вызова метода (10 секунд)
      const timeout = setTimeout(() => {
        reject(new Error(`BX24.callMethod(${method}) timeout: запрос превысил 10 секунд`));
      }, 10000);

      try {
        BX24.callMethod(method, params, (result) => {
          clearTimeout(timeout);
          if (result.error()) {
            const error = result.error();
            reject(new Error(error.error_description || error.error || 'Unknown error'));
          } else {
            resolve(result.data());
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Получение информации о текущем пользователе
   * 
   * Метод: user.current
   * Документация: https://context7.com/bitrix24/rest/user.current
   * 
   * Использует BX24.callMethod если доступен, иначе прокси через Bitrix24ApiService
   * 
   * @returns {Promise<object>} Информация о пользователе
   */
  static async getCurrentUser() {
    // ВАЖНО: Приоритет BX24 API для определения пользователя интерфейса
    // BX24 API определяет пользователя, который открыл приложение в интерфейсе
    // Прокси через CRest определяет владельца токена установки приложения
    
    // Проверяем, можем ли использовать BX24 API
    if (isInsideBitrix24() && isBX24Available()) {
      // Сначала пытаемся использовать BX24.getUser() - это синхронный метод,
      // который получает данные из контекста Bitrix24, не делая HTTP запросы
      // Поэтому он может работать даже при CORS ошибках
      try {
        const user = await this.getUser();
        if (user && user.ID) {
          console.log('Got user from BX24.getUser() (interface user):', user);
          return user;
        }
      } catch (getUserError) {
        console.warn('BX24.getUser() failed:', getUserError);
      }
      
      // Если getUser() не сработал, пытаемся использовать getAuth()
      // getAuth() тоже синхронный и может работать при CORS
      try {
        const auth = await this.getAuth();
        if (auth && auth.user_id) {
          // Если getAuth() вернул user_id, можем использовать его для получения полной информации
          // Но для этого нужен callMethod, который может не работать из-за CORS
          console.log('Got auth from BX24.getAuth():', auth);
          // Пока просто логируем, что получили auth
        }
      } catch (getAuthError) {
        console.warn('BX24.getAuth() failed:', getAuthError);
      }
      
      // Пытаемся использовать callMethod (может не работать из-за CORS в Chrome)
      try {
        const user = await Promise.race([
          this.callMethod('user.current', {}),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 10000)
          )
        ]);
        console.log('Got user from BX24.callMethod() (interface user):', user);
        return user;
      } catch (callMethodError) {
        // Если callMethod не работает из-за CORS или таймаута, это проблема
        // НЕ используем прокси, так как он вернёт владельца токена, а не пользователя интерфейса
        console.error('BX24.callMethod() failed:', callMethodError);
        if (callMethodError.message && callMethodError.message.includes('timeout')) {
          throw new Error('Таймаут при определении пользователя. Bitrix24 API не отвечает.');
        }
        throw new Error('Не удалось определить пользователя интерфейса. CORS блокирует доступ к Bitrix24 API в Chrome.');
      }
    } else {
      // Если мы не внутри Bitrix24 (standalone режим), 
      // то прокси - единственный способ, но он вернёт владельца токена
      console.warn('Not inside Bitrix24, using proxy API (will return token owner, not interface user)');
      return await Bitrix24ApiService.getCurrentUser();
    }
  }

  /**
   * Получение информации о пользователе через BX24.getUser
   * 
   * @returns {Promise<object>} Информация о пользователе
   */
  static getUser() {
    return new Promise((resolve, reject) => {
      if (typeof BX24 === 'undefined') {
        reject(new Error('Bitrix24 API not loaded'));
        return;
      }

      if (typeof BX24.getUser !== 'function') {
        reject(new Error('BX24.getUser is not available'));
        return;
      }

      BX24.getUser((user) => {
        resolve(user);
      });
    });
  }

  /**
   * Получение информации об авторизации через BX24.getAuth
   * 
   * @returns {Promise<object>} Информация об авторизации
   */
  static getAuth() {
    return new Promise((resolve, reject) => {
      if (typeof BX24 === 'undefined') {
        reject(new Error('Bitrix24 API not loaded'));
        return;
      }

      BX24.getAuth((auth) => {
        resolve(auth);
      });
    });
  }
}




