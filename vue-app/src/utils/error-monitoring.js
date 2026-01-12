/**
 * ErrorMonitoring - мониторинг ошибок загрузки и выполнения
 *
 * Отслеживает ошибки загрузки chunks, необработанные исключения и ошибки сети.
 *
 * TASK-085: Оптимизация системы сборки Vue.js приложения
 */

import { PerformanceMonitor } from './performance-monitor.js';

export class ErrorMonitoring {
  static init() {
    this.initChunkLoadErrorHandling();
    this.initUnhandledErrorHandling();
    this.initNetworkErrorHandling();
  }

  /**
   * Мониторинг ошибок загрузки chunks
   */
  static initChunkLoadErrorHandling() {
    window.addEventListener('error', (event) => {
      // Проверка на ошибки загрузки скриптов (chunks)
      if (event.target.tagName === 'SCRIPT') {
        console.error('❌ Chunk loading error:', event.target.src);
        this.reportError('chunk_load_error', {
          url: event.target.src,
          message: event.message || 'Script load failed'
        });
      }
    });

    // Мониторинг загрузки chunks через PerformanceObserver
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource' && entry.name.includes('.js')) {
              const loadTime = entry.responseEnd - entry.requestStart;
              PerformanceMonitor.trackApiCall(entry.name, loadTime);
            }
          }
        });

        observer.observe({ entryTypes: ['resource'] });
      } catch (e) {
        console.warn('PerformanceObserver not supported');
      }
    }
  }

  /**
   * Мониторинг необработанных ошибок и promise rejection
   */
  static initUnhandledErrorHandling() {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('❌ Unhandled promise rejection:', event.reason);
      this.reportError('unhandled_rejection', {
        reason: event.reason?.message || String(event.reason),
        stack: event.reason?.stack
      });
    });

    // Перехват необработанных ошибок
    window.addEventListener('error', (event) => {
      if (event.error && event.filename) {
        console.error('❌ Unhandled error:', event.error);
        this.reportError('unhandled_error', {
          message: event.error.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error.stack
        });
      }
    });
  }

  /**
   * Мониторинг ошибок сети
   */
  static initNetworkErrorHandling() {
    // Перехват fetch ошибок
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const startTime = performance.now();
      return originalFetch.apply(this, args)
        .then(response => {
          const loadTime = performance.now() - startTime;
          PerformanceMonitor.trackApiCall(args[0], loadTime);

          if (!response.ok) {
            console.warn(`🚨 API error: ${response.status} ${response.statusText} for ${args[0]}`);
          }
          return response;
        })
        .catch(error => {
          const loadTime = performance.now() - startTime;
          console.error(`❌ Network error for ${args[0]}:`, error);
          PerformanceMonitor.trackApiCall(args[0], loadTime);

          this.reportError('network_error', {
            url: args[0],
            message: error.message,
            loadTime
          });

          throw error;
        });
    };
  }

  /**
   * Отправка отчета об ошибке в систему мониторинга
   * @param {string} type - тип ошибки
   * @param {Object} data - данные ошибки
   */
  static reportError(type, data) {
    const errorReport = {
      type,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...data
    };

    // Логирование в консоль для разработки
    console.error('📊 Error report:', errorReport);

    // Отправка в систему мониторинга (например, Sentry)
    if (window.Sentry) {
      window.Sentry.captureException(new Error(`${type}: ${JSON.stringify(data)}`));
    }

    // Отправка в Bitrix24 логи (если доступно)
    if (typeof BX !== 'undefined' && BX.ajax) {
      try {
        BX.ajax({
          url: '/api/log-error.php',
          method: 'POST',
          data: errorReport
        });
      } catch (e) {
        console.error('Failed to send error report to Bitrix24:', e);
      }
    }

    // Отправка в Google Analytics (если доступен)
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: `${type}: ${data.message || 'Unknown error'}`,
        fatal: false
      });
    }
  }

  /**
   * Получение сводки по ошибкам
   * @returns {Object} Статистика ошибок
   */
  static getErrorStats() {
    // В реальной реализации здесь можно хранить статистику ошибок
    return {
      chunkLoadErrors: 0,
      networkErrors: 0,
      unhandledErrors: 0,
      totalErrors: 0
    };
  }
}