/**
 * API клиент для работы с Bitrix24
 *
 * Предоставляет унифицированный интерфейс для вызовов Bitrix24 REST API
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { Logger } from '../utils/logger.js';

// Глобальный объект BX24 или прокси API
let BX24_API = null;

export class ApiClient {
  /**
   * Инициализация API клиента
   */
  static initialize() {
    // Проверяем, находимся ли мы внутри Bitrix24
    if (typeof window !== 'undefined' && window.BX24) {
      BX24_API = window.BX24;
      Logger.info('Using BX24 API directly', 'ApiClient');
    } else {
      // Используем mock данные для разработки
      // В продакшене должен использоваться реальный API Bitrix24
      BX24_API = {
        call: async (method, params) => {
          Logger.info(`Mock API call: ${method}`, 'ApiClient', params);

          // Имитируем задержку сети
          await new Promise(resolve => setTimeout(resolve, 100));

          // Возвращаем mock данные в зависимости от метода
          switch (method) {
            case 'bizproc.smartprocess.list':
              return {
                result: [
                  {
                    ID: '1',
                    TITLE: 'Test Ticket 1',
                    CREATED_TIME: '2026-01-12T10:00:00Z',
                    STAGE_ID: 'DT140_12:NEW',
                    ASSIGNED_BY_ID: '1013',
                    UF_CRM_7_TYPE_PRODUCT: 'PDM'
                  },
                  {
                    ID: '2',
                    TITLE: 'Test Ticket 2',
                    CREATED_TIME: '2026-01-12T11:00:00Z',
                    STAGE_ID: 'DT140_12:ANALYSIS',
                    ASSIGNED_BY_ID: '1014',
                    UF_CRM_7_TYPE_PRODUCT: 'PDM'
                  }
                ],
                total: 2
              };

            case 'user.get':
              return {
                result: [
                  {
                    ID: '1013',
                    NAME: 'Марк',
                    LAST_NAME: 'Тестов',
                    DEPARTMENT: [369]
                  },
                  {
                    ID: '1014',
                    NAME: 'Иван',
                    LAST_NAME: 'Разработчик',
                    DEPARTMENT: [369]
                  }
                ]
              };

            default:
              Logger.warn(`Unknown method ${method}, returning empty result`, 'ApiClient');
              return { result: [] };
          }
        }
      };
      Logger.info('Using mock API for development', 'ApiClient');
    }
  }

  /**
   * Универсальный вызов API
   *
   * @param {string} method - Метод API
   * @param {object} params - Параметры вызова
   * @returns {Promise<any>} Результат вызова
   */
  static async call(method, params = {}) {
    if (!BX24_API) {
      this.initialize();
    }

    try {
      Logger.debug(`Calling ${method}`, 'ApiClient', { params });

      const result = await BX24_API.call(method, params);

      Logger.debug(`Call ${method} completed`, 'ApiClient');
      return result;
    } catch (error) {
      Logger.error(`Call ${method} failed`, 'ApiClient', error);
      throw error;
    }
  }

  /**
   * Получение элементов смарт-процесса
   *
   * @param {object} options - Опции запроса
   * @returns {Promise<Array>} Массив элементов
   */
  static async getSmartProcessItems(options) {
    const {
      entityTypeId,
      select = ['*'],
      filter = {},
      order = {},
      limit = 50
    } = options;

    const params = {
      entityTypeId,
      select,
      filter,
      order,
      limit
    };

    const result = await this.call('bizproc.smartprocess.list', params);
    return result.items || result.result || [];
  }

  /**
   * Получение элемента смарт-процесса по ID
   *
   * @param {string} itemId - ID элемента
   * @param {object} options - Опции запроса
   * @returns {Promise<object>} Элемент
   */
  static async getSmartProcessItem(itemId, options) {
    const {
      entityTypeId,
      select = ['*']
    } = options;

    const params = {
      entityTypeId,
      id: itemId,
      select
    };

    const result = await this.call('bizproc.smartprocess.get', params);
    return result.item || result.result || null;
  }

  /**
   * Обновление элемента смарт-процесса
   *
   * @param {string} itemId - ID элемента
   * @param {object} fields - Поля для обновления
   * @param {object} options - Опции запроса
   * @returns {Promise<object>} Результат обновления
   */
  static async updateSmartProcessItem(itemId, fields, options = {}) {
    const { entityTypeId } = options;

    const params = {
      entityTypeId,
      id: itemId,
      fields
    };

    return await this.call('bizproc.smartprocess.update', params);
  }
}

// Инициализируем при импорте
ApiClient.initialize();

export default ApiClient;