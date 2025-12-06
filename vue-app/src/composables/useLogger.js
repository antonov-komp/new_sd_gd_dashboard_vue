/**
 * Композабл для работы с логированием в компонентах Vue
 * 
 * Обёртка над Logger для удобного использования в компонентах.
 * Автоматически определяет контекст из имени компонента Vue.
 * 
 * Использование:
 * import { useLogger } from '@/composables/useLogger.js';
 * 
 * export default {
 *   name: 'MyComponent',
 *   setup() {
 *     // Автоматическое определение контекста из имени компонента
 *     const logger = useLogger();
 *     logger.error('Error message', error);
 *     logger.debug('Debug message', data);
 *     
 *     // Или с явным указанием контекста
 *     const logger2 = useLogger('CustomContext');
 *   }
 * }
 */

import { getCurrentInstance } from 'vue';
import { Logger } from '@/services/dashboard-sector-1c/utils/logger.js';

/**
 * Композабл для логирования
 * 
 * Автоматически определяет контекст из имени компонента Vue через `getCurrentInstance()`.
 * Если контекст передан явно, используется переданный контекст.
 * 
 * @param {string|null} context - Контекст логирования (опционально, определяется автоматически)
 * @returns {object} Объект с методами для логирования
 */
export function useLogger(context = null) {
  // Автоматическое определение контекста из компонента Vue
  const instance = getCurrentInstance();
  const componentName = instance?.type?.name || instance?.type?.__name || null;
  
  // Использование переданного контекста или автоматического
  const loggerContext = context || componentName || 'Unknown';
  /**
   * Логирование с автоматическим контекстом
   * 
   * @param {string} level - Уровень логирования
   * @param {string} message - Сообщение
   * @param {*} data - Дополнительные данные
   * @private
   */
  const log = (level, message, data = null) => {
    Logger.log(level, message, loggerContext, data);
  };
  
  /**
   * Логирование ошибок
   * 
   * @param {string} message - Сообщение об ошибке
   * @param {*} error - Объект ошибки или дополнительные данные
   */
  const error = (message, error = null) => {
    log('ERROR', message, error);
  };
  
  /**
   * Логирование предупреждений
   * 
   * @param {string} message - Сообщение-предупреждение
   * @param {*} data - Дополнительные данные
   */
  const warn = (message, data = null) => {
    log('WARN', message, data);
  };
  
  /**
   * Логирование информационных сообщений
   * 
   * @param {string} message - Информационное сообщение
   * @param {*} data - Дополнительные данные
   */
  const info = (message, data = null) => {
    log('INFO', message, data);
  };
  
  /**
   * Логирование отладочных сообщений
   * 
   * @param {string} message - Отладочное сообщение
   * @param {*} data - Дополнительные данные
   */
  const debug = (message, data = null) => {
    log('DEBUG', message, data);
  };
  
  return {
    error,
    warn,
    info,
    debug,
    log,
    /** Текущий контекст логирования */
    context: loggerContext
  };
}

