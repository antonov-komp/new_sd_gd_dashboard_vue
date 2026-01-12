/**
 * PerformanceMonitor - мониторинг производительности загрузки
 *
 * Отслеживает метрики загрузки chunks, компонентов и API вызовов.
 *
 * TASK-085: Оптимизация системы сборки Vue.js приложения
 */

export class PerformanceMonitor {
  static metrics = {
    bundleLoadTime: 0,
    componentLoadTime: new Map(),
    apiResponseTime: new Map(),
    chunkLoadTimes: new Map()
  };

  /**
   * Начинает отсчет времени загрузки bundle
   */
  static startBundleLoad() {
    this.metrics.bundleLoadTime = performance.now();
  }

  /**
   * Завершает отсчет времени загрузки bundle
   * @param {string} chunkName - имя загруженного chunk
   */
  static endBundleLoad(chunkName) {
    const loadTime = performance.now() - this.metrics.bundleLoadTime;
    this.metrics.chunkLoadTimes.set(chunkName, loadTime);

    console.log(`📦 Chunk "${chunkName}" loaded in ${loadTime.toFixed(2)}ms`);

    // Отправка метрики в аналитику (если доступна)
    if (window.gtag) {
      window.gtag('event', 'bundle_load', {
        chunk_name: chunkName,
        load_time: loadTime
      });
    }

    // Логирование медленных загрузок
    if (loadTime > 1000) {
      console.warn(`🐌 Slow chunk load: ${chunkName} took ${loadTime.toFixed(2)}ms`);
    }
  }

  /**
   * Отслеживает время загрузки компонента
   * @param {string} componentName - имя компонента
   * @param {number} startTime - время начала загрузки
   */
  static trackComponentLoad(componentName, startTime) {
    const loadTime = performance.now() - startTime;
    this.metrics.componentLoadTime.set(componentName, loadTime);

    console.log(`🧩 Component "${componentName}" loaded in ${loadTime.toFixed(2)}ms`);

    // Логирование медленных загрузок компонентов
    if (loadTime > 500) {
      console.warn(`🐌 Slow component load: ${componentName} took ${loadTime.toFixed(2)}ms`);
    }
  }

  /**
   * Отслеживает время ответа API
   * @param {string} endpoint - endpoint API
   * @param {number} responseTime - время ответа
   */
  static trackApiCall(endpoint, responseTime) {
    this.metrics.apiResponseTime.set(endpoint, responseTime);

    if (responseTime > 1000) {
      console.warn(`🐌 Slow API call to ${endpoint}: ${responseTime}ms`);
    }
  }

  /**
   * Получает отчет о производительности
   * @returns {Object} Отчет с метриками
   */
  static getReport() {
    const componentTimes = Array.from(this.metrics.componentLoadTime.values());
    const apiTimes = Array.from(this.metrics.apiResponseTime.values());
    const chunkTimes = Array.from(this.metrics.chunkLoadTimes.values());

    return {
      totalChunks: this.metrics.chunkLoadTimes.size,
      totalComponents: this.metrics.componentLoadTime.size,
      totalApiCalls: this.metrics.apiResponseTime.size,

      averageComponentLoadTime: componentTimes.length > 0
        ? componentTimes.reduce((a, b) => a + b, 0) / componentTimes.length
        : 0,

      averageApiResponseTime: apiTimes.length > 0
        ? apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length
        : 0,

      averageChunkLoadTime: chunkTimes.length > 0
        ? chunkTimes.reduce((a, b) => a + b, 0) / chunkTimes.length
        : 0,

      slowestComponents: Array.from(this.metrics.componentLoadTime.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, time]) => ({ name, time })),

      slowestApiCalls: Array.from(this.metrics.apiResponseTime.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([endpoint, time]) => ({ endpoint, time })),

      slowestChunks: Array.from(this.metrics.chunkLoadTimes.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, time]) => ({ name, time }))
    };
  }

  /**
   * Очищает собранные метрики
   */
  static clearMetrics() {
    this.metrics.bundleLoadTime = 0;
    this.metrics.componentLoadTime.clear();
    this.metrics.apiResponseTime.clear();
    this.metrics.chunkLoadTimes.clear();
  }
}