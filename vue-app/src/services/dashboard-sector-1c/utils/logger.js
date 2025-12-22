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
   * Получение цвета для уровня логирования
   * 
   * @param {string} level - Уровень логирования
   * @returns {string} Цвет в формате CSS
   * @private
   */
  static getLevelColor(level) {
    const colors = {
      ERROR: '#dc3545',
      WARN: '#ffc107',
      INFO: '#17a2b8',
      DEBUG: '#6c757d'
    };
    
    return colors[level] || '#6c757d';
  }

  /**
   * Форматирование сообщения с улучшенным выводом для DevTools
   * 
   * @param {string} level - Уровень логирования
   * @param {string} message - Сообщение
   * @param {string} context - Контекст
   * @returns {object} Объект с отформатированным сообщением и стилями
   * @private
   */
  static formatMessage(level, message, context = '') {
    const timestamp = new Date().toISOString();
    const levelColor = this.getLevelColor(level);
    
    // Форматирование для DevTools с цветами
    const formatted = `%c[${timestamp}] %c[${level}] %c[${context || 'Unknown'}] %c${message}`;
    const styles = [
      'color: #6c757d; font-weight: normal', // timestamp
      `color: ${levelColor}; font-weight: bold`, // level
      'color: #007bff; font-weight: normal', // context
      'color: #212529; font-weight: normal' // message
    ];
    
    return { formatted, styles };
  }

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
    
    // Форматируем сообщение с улучшенным выводом
    const formatted = this.formatMessage(level, message, context);
    
    // Выводим в консоль в зависимости от уровня
    const args = [formatted.formatted, ...formatted.styles];
    if (data !== null && data !== undefined) {
      args.push(data);
    }
    
    switch (level) {
      case 'ERROR':
        console.error(...args);
        break;
        
      case 'WARN':
        console.warn(...args);
        break;
        
      case 'INFO':
        console.info(...args);
        break;
        
      case 'DEBUG':
        console.log(...args);
        break;
        
      default:
        console.log(...args);
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

