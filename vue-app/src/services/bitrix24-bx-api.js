/**
 * Сервис для работы с Bitrix24 BX24.* API
 * 
 * Обёртка для работы с BX24.* API (BX24.init, BX24.callMethod, BX24.installFinish)
 * Документация: https://dev.1c-bitrix.ru/rest_help/js_library/index.php
 */
export class Bitrix24BxApi {
  /**
   * Инициализация Bitrix24 API
   * 
   * @param {function} callback - Функция обратного вызова после инициализации
   * @returns {Promise<void>}
   */
  static init(callback) {
    return new Promise((resolve, reject) => {
      if (typeof BX24 === 'undefined') {
        reject(new Error('Bitrix24 API not loaded. Make sure script is included: //api.bitrix24.com/api/v1/'));
        return;
      }

      BX24.init(() => {
        if (callback) {
          callback();
        }
        resolve();
      });
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

      BX24.callMethod(method, params, (result) => {
        if (result.error()) {
          const error = result.error();
          reject(new Error(error.error_description || error.error || 'Unknown error'));
        } else {
          resolve(result.data());
        }
      });
    });
  }

  /**
   * Получение информации о текущем пользователе
   * 
   * Метод: user.current
   * 
   * @returns {Promise<object>} Информация о пользователе
   */
  static async getCurrentUser() {
    return this.callMethod('user.current', {});
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


