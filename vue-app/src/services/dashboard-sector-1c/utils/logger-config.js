/**
 * Конфигурация уровней логирования для дашборда сектора 1С
 * 
 * Управляет уровнями логирования через localStorage
 * 
 * Использование:
 * import { LoggerConfig } from './logger-config.js';
 * const level = LoggerConfig.getLevel();
 * LoggerConfig.setLevel('DEBUG');
 */

const STORAGE_KEY = 'dashboard-sector-1c-logger-level';

/**
 * Уровни логирования с приоритетами
 * 
 * NONE: 0 - логирование отключено
 * ERROR: 1 - только ошибки
 * WARN: 2 - предупреждения и ошибки
 * INFO: 3 - информация, предупреждения и ошибки
 * DEBUG: 4 - все логи (полная отладка)
 */
const LEVELS = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4
};

/**
 * Класс для управления конфигурацией логирования
 */
export class LoggerConfig {
  /**
   * Получение текущего уровня логирования
   * 
   * Приоритет:
   * 1. Значение из localStorage (если установлено)
   * 2. ERROR для production, DEBUG для development
   * 
   * @returns {string} Текущий уровень логирования
   */
  static getLevel() {
    // Проверяем localStorage (работает только в браузере)
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && LEVELS[stored] !== undefined) {
        return stored;
      }
    }
    
    // По умолчанию: ERROR для production, DEBUG для разработки
    // В Vite используется import.meta.env вместо process.env
    const isProduction = import.meta.env?.MODE === 'production' || 
                         import.meta.env?.PROD === true;
    
    return isProduction ? 'ERROR' : 'DEBUG';
  }
  
  /**
   * Установка уровня логирования
   * 
   * @param {string} level - Уровень логирования (NONE, ERROR, WARN, INFO, DEBUG)
   * @returns {boolean} true если уровень установлен, false если невалидный
   */
  static setLevel(level) {
    if (LEVELS[level] !== undefined) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, level);
      }
      return true;
    }
    return false;
  }
  
  /**
   * Проверка, включено ли логирование для указанного уровня
   * 
   * @param {string} level - Уровень логирования для проверки
   * @param {string|null} currentLevel - Текущий уровень (если не указан, берётся из getLevel())
   * @returns {boolean} true если логирование включено для этого уровня
   */
  static isEnabled(level, currentLevel = null) {
    const current = currentLevel || this.getLevel();
    
    // Если текущий уровень NONE, логирование отключено
    if (current === 'NONE') {
      return false;
    }
    
    // Проверяем, что уровень логирования не выше текущего
    const levelValue = LEVELS[level] || 0;
    const currentValue = LEVELS[current] || 0;
    
    return levelValue <= currentValue;
  }
  
  /**
   * Получение всех доступных уровней
   * 
   * @returns {Object} Объект с уровнями и их значениями
   */
  static getLevels() {
    return { ...LEVELS };
  }
  
  /**
   * Сброс уровня логирования к значению по умолчанию
   */
  static reset() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

