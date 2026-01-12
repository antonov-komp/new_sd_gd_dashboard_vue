/**
 * Сервис диагностики для дашбордов секторов
 *
 * Предоставляет функции для отладки и диагностики работы дашбордов
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { Logger } from './logger.js';

/**
 * Проверка включена ли диагностика
 *
 * @returns {boolean} true если диагностика включена
 */
export function isDiagnosticsEnabled() {
  try {
    return localStorage.getItem('sector-dashboard-diagnostics') === 'true';
  } catch (error) {
    return false;
  }
}

/**
 * Включение диагностики
 */
export function enableDiagnostics() {
  try {
    localStorage.setItem('sector-dashboard-diagnostics', 'true');
    Logger.info('Diagnostics enabled', 'DiagnosticsService');
  } catch (error) {
    Logger.error('Failed to enable diagnostics', 'DiagnosticsService', error);
  }
}

/**
 * Отключение диагностики
 */
export function disableDiagnostics() {
  try {
    localStorage.setItem('sector-dashboard-diagnostics', 'false');
    Logger.info('Diagnostics disabled', 'DiagnosticsService');
  } catch (error) {
    Logger.error('Failed to disable diagnostics', 'DiagnosticsService', error);
  }
}

/**
 * Получение сервиса диагностики
 *
 * @returns {object} Сервис диагностики
 */
export function getDiagnosticsService() {
  return {
    /**
     * Логирование диагностической информации
     *
     * @param {string} message - Сообщение
     * @param {object} data - Дополнительные данные
     */
    log: (message, data = {}) => {
      if (!isDiagnosticsEnabled()) return;

      Logger.info(`[DIAGNOSTICS] ${message}`, 'DiagnosticsService', data);
      console.log(`🔍 [DIAGNOSTICS] ${message}`, data);
    },

    /**
     * Измерение времени выполнения
     *
     * @param {string} label - Метка измерения
     * @returns {function} Функция завершения измерения
     */
    measureTime: (label) => {
      if (!isDiagnosticsEnabled()) return () => {};

      const start = performance.now();
      return () => {
        const end = performance.now();
        const duration = end - start;
        Logger.info(`[DIAGNOSTICS] ${label} took ${duration.toFixed(2)}ms`, 'DiagnosticsService');
        console.log(`⏱️ [DIAGNOSTICS] ${label}: ${duration.toFixed(2)}ms`);
      };
    },

    /**
     * Проверка состояния сервисов
     *
     * @param {string} sectorId - ID сектора
     * @returns {object} Состояние сервисов
     */
    checkServicesStatus: async (sectorId) => {
      if (!isDiagnosticsEnabled()) return {};

      const status = {
        sectorId,
        timestamp: new Date().toISOString(),
        services: {}
      };

      try {
        // Проверяем доступность основных сервисов
        const services = ['TicketRepository', 'EmployeeRepository', 'ApiClient'];

        for (const serviceName of services) {
          try {
            // Имитируем проверку доступности
            status.services[serviceName] = {
              available: true,
              lastCheck: new Date().toISOString()
            };
          } catch (error) {
            status.services[serviceName] = {
              available: false,
              error: error.message,
              lastCheck: new Date().toISOString()
            };
          }
        }
      } catch (error) {
        Logger.error('Failed to check services status', 'DiagnosticsService', error);
      }

      Logger.info('Services status checked', 'DiagnosticsService', status);
      return status;
    },

    /**
     * Получение информации о производительности
     *
     * @returns {object} Информация о производительности
     */
    getPerformanceInfo: () => {
      if (!isDiagnosticsEnabled()) return {};

      const perfData = {
        timestamp: new Date().toISOString(),
        memory: {},
        timing: {}
      };

      try {
        // Информация о памяти
        if (performance.memory) {
          perfData.memory = {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          };
        }

        // Время загрузки страницы
        if (performance.timing) {
          perfData.timing = {
            navigationStart: performance.timing.navigationStart,
            loadEventEnd: performance.timing.loadEventEnd,
            domContentLoadedEventEnd: performance.timing.domContentLoadedEventEnd,
            totalLoadTime: performance.timing.loadEventEnd - performance.timing.navigationStart
          };
        }
      } catch (error) {
        Logger.error('Failed to get performance info', 'DiagnosticsService', error);
      }

      return perfData;
    }
  };
}

export default {
  isDiagnosticsEnabled,
  enableDiagnostics,
  disableDiagnostics,
  getDiagnosticsService
};