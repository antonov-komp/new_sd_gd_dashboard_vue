/**
 * Служба логирования для дашборда сектора 1С
 * 
 * Централизованное логирование с поддержкой уровней детализации
 * 
 * Использование:
 * import { Logger } from './utils/logger.js';
 * Logger.error('Error message', 'ContextName', error);
 * Logger.warn('Warning message', 'ContextName', data);
 * Logger.info('Info message', 'ContextName', data);
 * Logger.debug('Debug message', 'ContextName', data);
 */

import { LoggerConfig } from './logger-config.js';

/**
 * Класс для логирования с поддержкой уровней
 */
export class Logger {
  /**
   * Основной метод логирования
   * 
   * @param {string} level - Уровень логирования (ERROR, WARN, INFO, DEBUG)
   * @param {string} message - Сообщение для логирования
   * @param {string} context - Контекст (имя модуля/компонента)
   * @param {*} data - Дополнительные данные для логирования
   */
  static log(level, message, context = '', data = null) {
    // Проверяем, включено ли логирование для этого уровня
    if (!LoggerConfig.isEnabled(level)) {
      return;
    }
    
    // Форматируем сообщение
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    const formattedMessage = `[${timestamp}] [${level}] ${contextStr} ${message}`;
    
    // Выводим в консоль в зависимости от уровня
    switch (level) {
      case 'ERROR':
        if (data !== null && data !== undefined) {
          console.error(formattedMessage, data);
        } else {
          console.error(formattedMessage);
        }
        break;
        
      case 'WARN':
        if (data !== null && data !== undefined) {
          console.warn(formattedMessage, data);
        } else {
          console.warn(formattedMessage);
        }
        break;
        
      case 'INFO':
        if (data !== null && data !== undefined) {
          console.info(formattedMessage, data);
        } else {
          console.info(formattedMessage);
        }
        break;
        
      case 'DEBUG':
        if (data !== null && data !== undefined) {
          console.log(formattedMessage, data);
        } else {
          console.log(formattedMessage);
        }
        break;
        
      default:
        if (data !== null && data !== undefined) {
          console.log(formattedMessage, data);
        } else {
          console.log(formattedMessage);
        }
    }
  }
  
  /**
   * Логирование ошибок
   * 
   * @param {string} message - Сообщение об ошибке
   * @param {string} context - Контекст (имя модуля/компонента)
   * @param {*} error - Объект ошибки или дополнительные данные
   */
  static error(message, context = '', error = null) {
    this.log('ERROR', message, context, error);
  }
  
  /**
   * Логирование предупреждений
   * 
   * @param {string} message - Сообщение-предупреждение
   * @param {string} context - Контекст (имя модуля/компонента)
   * @param {*} data - Дополнительные данные
   */
  static warn(message, context = '', data = null) {
    this.log('WARN', message, context, data);
  }
  
  /**
   * Логирование информационных сообщений
   * 
   * @param {string} message - Информационное сообщение
   * @param {string} context - Контекст (имя модуля/компонента)
   * @param {*} data - Дополнительные данные
   */
  static info(message, context = '', data = null) {
    this.log('INFO', message, context, data);
  }
  
  /**
   * Логирование отладочных сообщений
   * 
   * @param {string} message - Отладочное сообщение
   * @param {string} context - Контекст (имя модуля/компонента)
   * @param {*} data - Дополнительные данные
   */
  static debug(message, context = '', data = null) {
    this.log('DEBUG', message, context, data);
  }
}

