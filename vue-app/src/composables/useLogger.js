/**
 * Композабл для работы с логированием в компонентах Vue
 * 
 * Обёртка над Logger для удобного использования в компонентах
 * Автоматически определяет контекст из имени компонента
 * 
 * Использование:
 * import { useLogger } from '@/composables/useLogger.js';
 * 
 * export default {
 *   setup() {
 *     const logger = useLogger('ComponentName');
 *     logger.error('Error message', error);
 *     logger.debug('Debug message', data);
 *   }
 * }
 */

import { Logger } from '@/services/dashboard-sector-1c/utils/logger.js';

/**
 * Композабл для логирования
 * 
 * @param {string} context - Контекст логирования (обычно имя компонента)
 * @returns {object} Объект с методами для логирования
 */
export function useLogger(context = '') {
  /**
   * Логирование ошибок
   * 
   * @param {string} message - Сообщение об ошибке
   * @param {*} error - Объект ошибки или дополнительные данные
   */
  const error = (message, error = null) => {
    Logger.error(message, context, error);
  };
  
  /**
   * Логирование предупреждений
   * 
   * @param {string} message - Сообщение-предупреждение
   * @param {*} data - Дополнительные данные
   */
  const warn = (message, data = null) => {
    Logger.warn(message, context, data);
  };
  
  /**
   * Логирование информационных сообщений
   * 
   * @param {string} message - Информационное сообщение
   * @param {*} data - Дополнительные данные
   */
  const info = (message, data = null) => {
    Logger.info(message, context, data);
  };
  
  /**
   * Логирование отладочных сообщений
   * 
   * @param {string} message - Отладочное сообщение
   * @param {*} data - Дополнительные данные
   */
  const debug = (message, data = null) => {
    Logger.debug(message, context, data);
  };
  
  /**
   * Логирование с указанием уровня
   * 
   * @param {string} level - Уровень логирования (ERROR, WARN, INFO, DEBUG)
   * @param {string} message - Сообщение
   * @param {*} data - Дополнительные данные
   */
  const log = (level, message, data = null) => {
    Logger.log(level, message, context, data);
  };
  
  return {
    error,
    warn,
    info,
    debug,
    log
  };
}

