import { LazyServiceLoader } from '@/utils/lazy-services.js';

/**
 * Базовый класс для всех Bitrix24 фасадов
 * Предоставляет общую функциональность: кеширование, обработку ошибок, метрики
 *
 * TASK-088-02: Решение конфликта импортов Bitrix24 API
 *
 * @class BaseBitrix24Facade
 */
export class BaseBitrix24Facade {
  /**
   * Конструктор базового фасада
   * @param {string} domain - домен фасада (activity, dashboard, user-mgmt)
   * @param {number} cacheTimeout - таймаут кеширования в мс (по умолчанию 5 минут)
   */
  constructor(domain, cacheTimeout = 5 * 60 * 1000) {
    this.domain = domain;
    this.cache = new Map();
    this.cacheTimeout = cacheTimeout;
    this.metrics = {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      avgResponseTime: 0,
      totalResponseTime: 0
    };
  }

  /**
   * Получение экземпляра Bitrix24ApiService с кешированием
   * @returns {Promise<Object>} Экземпляр Bitrix24ApiService
   */
  async getApi() {
    const cacheKey = 'api';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < (cached.timeout || this.cacheTimeout)) {
      this.metrics.cacheHits++;
      return cached.data;
    }

    this.metrics.cacheMisses++;
    const startTime = performance.now();

    try {
      const { Bitrix24ApiService } = await LazyServiceLoader.loadBitrix24Api();

      const loadTime = performance.now() - startTime;
      this.updateAverageResponseTime(loadTime);

      // Кешируем API экземпляр на короткое время (1 минута для API)
      const apiCacheTimeout = 60 * 1000;
      this.cache.set(cacheKey, {
        data: Bitrix24ApiService,
        timestamp: Date.now(),
        timeout: apiCacheTimeout
      });

      return Bitrix24ApiService;
    } catch (error) {
      this.metrics.errors++;
      console.error(`[${this.domain}] Failed to load Bitrix24ApiService:`, error);
      throw error;
    }
  }

  /**
   * Вызов метода Bitrix24 API с обработкой ошибок и кешированием
   * @param {string} method - метод API (например, 'user.get')
   * @param {Object} params - параметры запроса
   * @returns {Promise<Object>} Результат API вызова
   */
  async call(method, params = {}) {
    const startTime = performance.now();
    this.metrics.apiCalls++;

    try {
      // Проверяем кеш для GET методов
      if (this.isCacheableMethod(method)) {
        const cached = this.getCachedResult(method, params);
        if (cached) {
          this.metrics.cacheHits++;
          return cached;
        }
      }

      const api = await this.getApi();
      const result = await api.call(method, params);

      const responseTime = performance.now() - startTime;
      this.updateAverageResponseTime(responseTime);

      // Кешируем результат для GET методов
      if (this.isCacheableMethod(method)) {
        this.setCachedResult(method, params, result);
      }

      return result;

    } catch (error) {
      this.metrics.errors++;
      const responseTime = performance.now() - startTime;

      console.error(`[${this.domain}] API call failed:`, {
        method,
        params,
        error: error.message,
        responseTime: `${responseTime.toFixed(2)}ms`,
        domain: this.domain
      });

      throw this.wrapError(error, method, params);
    }
  }

  /**
   * Проверка, можно ли кешировать метод
   * @param {string} method - метод API
   * @returns {boolean} Можно ли кешировать
   */
  isCacheableMethod(method) {
    const cacheableMethods = [
      'user.get',
      'department.get',
      'crm.status.list',
      'user.current',
      'crm.contact.list',
      'crm.company.list'
    ];
    return cacheableMethods.includes(method);
  }

  /**
   * Получение кешированного результата
   * @param {string} method - метод API
   * @param {Object} params - параметры
   * @returns {Object|null} Кешированный результат или null
   */
  getCachedResult(method, params) {
    const key = this.getCacheKey(method, params);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < (cached.timeout || this.cacheTimeout)) {
      return cached.data;
    }

    return null;
  }

  /**
   * Сохранение результата в кеш
   * @param {string} method - метод API
   * @param {Object} params - параметры
   * @param {Object} data - данные для кеширования
   */
  setCachedResult(method, params, data) {
    const key = this.getCacheKey(method, params);
    this.cache.set(key, {
      data: JSON.parse(JSON.stringify(data)), // Глубокая копия
      timestamp: Date.now(),
      timeout: this.cacheTimeout,
      method,
      params
    });
  }

  /**
   * Генерация ключа кеша
   * @param {string} method - метод API
   * @param {Object} params - параметры
   * @returns {string} Ключ кеша
   */
  getCacheKey(method, params) {
    // Нормализация параметров для консистентного кеширования
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});

    return `${method}_${JSON.stringify(sortedParams)}`;
  }

  /**
   * Обновление среднего времени ответа
   * @param {number} responseTime - время ответа в мс
   */
  updateAverageResponseTime(responseTime) {
    this.metrics.totalResponseTime += responseTime;
    this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.apiCalls;
  }

  /**
   * Очистка кеша
   * @param {string} pattern - паттерн для очистки (опционально)
   */
  clearCache(pattern = null) {
    if (pattern) {
      // Очистка по паттерну (например, 'user.' для всех user методов)
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Получение статистики использования
   * @returns {Object} Статистика использования фасада
   */
  getMetrics() {
    const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const hitRate = totalCacheRequests > 0 ? this.metrics.cacheHits / totalCacheRequests : 0;

    return {
      domain: this.domain,
      cache: {
        size: this.cache.size,
        hitRate: Math.round(hitRate * 100) / 100,
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        efficiency: hitRate > 0.8 ? 'excellent' : hitRate > 0.6 ? 'good' : 'poor'
      },
      api: {
        totalCalls: this.metrics.apiCalls,
        errors: this.metrics.errors,
        errorRate: this.metrics.apiCalls > 0 ? Math.round((this.metrics.errors / this.metrics.apiCalls) * 100) / 100 : 0,
        avgResponseTime: Math.round(this.metrics.avgResponseTime),
        totalResponseTime: Math.round(this.metrics.totalResponseTime),
        performance: this.metrics.avgResponseTime < 500 ? 'fast' : this.metrics.avgResponseTime < 2000 ? 'normal' : 'slow'
      },
      cacheEntries: Array.from(this.cache.keys()).map(key => {
        const entry = this.cache.get(key);
        return {
          key,
          age: Date.now() - entry.timestamp,
          ageFormatted: this.formatAge(Date.now() - entry.timestamp),
          method: entry.method,
          expiresIn: (entry.timeout || this.cacheTimeout) - (Date.now() - entry.timestamp)
        };
      }).sort((a, b) => a.age - b.age) // Сортировка по возрасту
    };
  }

  /**
   * Форматирование возраста кеша
   * @param {number} ageMs - возраст в миллисекундах
   * @returns {string} Форматированный возраст
   */
  formatAge(ageMs) {
    const seconds = Math.floor(ageMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Обёртка ошибок для типизации
   * @param {Error} error - оригинальная ошибка
   * @param {string} method - метод API
   * @param {Object} params - параметры
   * @returns {Bitrix24FacadeError} Обёрнутая ошибка
   */
  wrapError(error, method, params) {
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('fetch')) {
      return new Bitrix24NetworkError(
        `Network error calling ${method}`,
        error,
        method,
        params
      );
    }

    if (error.error && typeof error.error === 'string') {
      return new Bitrix24ApiError(
        error.error_description || error.error,
        error,
        method,
        params
      );
    }

    return new Bitrix24FacadeError(
      error.message || 'Unknown Bitrix24 error',
      error,
      method,
      params
    );
  }
}

// Классы ошибок
export class Bitrix24FacadeError extends Error {
  constructor(message, originalError, method, params) {
    super(message);
    this.name = 'Bitrix24FacadeError';
    this.originalError = originalError;
    this.method = method;
    this.params = params;
    this.timestamp = new Date().toISOString();
    this.domain = 'facade';
  }
}

export class Bitrix24ApiError extends Bitrix24FacadeError {
  constructor(message, originalError, method, params) {
    super(message, originalError, method, params);
    this.name = 'Bitrix24ApiError';
    this.domain = 'api';
  }
}

export class Bitrix24NetworkError extends Bitrix24FacadeError {
  constructor(message, originalError, method, params) {
    super(message, originalError, method, params);
    this.name = 'Bitrix24NetworkError';
    this.domain = 'network';
  }
}