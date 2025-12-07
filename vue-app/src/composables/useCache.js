import { ref } from 'vue';

// Глобальный кеш (можно сделать реактивным для отладки)
const cache = ref(new Map());
const cacheStats = ref({
  hits: 0,
  misses: 0,
  sets: 0,
  invalidations: 0
});

// Конфигурация кеша
const CACHE_CONFIG = {
  defaultTTL: 5 * 60 * 1000, // 5 минут
  maxSize: 100, // Максимальное количество записей
  enableStats: true // Включить статистику
};

/**
 * Composable для кеширования данных
 * 
 * Поддерживает:
 * - TTL (время жизни кеша)
 * - LRU (Least Recently Used) eviction
 * - Статистику использования
 * - Инвалидацию по паттернам
 */
export function useCache(config = {}) {
  const {
    ttl = CACHE_CONFIG.defaultTTL,
    maxSize = CACHE_CONFIG.maxSize,
    enableStats = CACHE_CONFIG.enableStats
  } = config;

  /**
   * Безопасный JSON.stringify с защитой от циклических ссылок
   */
  const safeStringify = (obj) => {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      // Игнорируем функции и undefined
      if (typeof value === 'function' || value === undefined) {
        return null;
      }
      return value;
    });
  };

  /**
   * Генерация ключа кеша из URL и параметров
   * 
   * @param {string} url URL запроса
   * @param {Object} params Параметры запроса
   * @returns {string} Ключ кеша
   */
  const getCacheKey = (url, params = {}) => {
    // Создаём простой объект только с примитивными значениями
    const simpleParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        const value = params[key];
        // Обрабатываем только примитивы и простые объекты
        if (value === null || value === undefined) {
          acc[key] = null;
        } else if (typeof value === 'object') {
          // Для объектов используем безопасный stringify
          try {
            acc[key] = safeStringify(value);
          } catch (e) {
            // Если не удалось сериализовать, используем строковое представление
            acc[key] = String(value);
          }
        } else {
          acc[key] = value;
        }
        return acc;
      }, {});
    
    try {
      return `${url}_${safeStringify(simpleParams)}`;
    } catch (e) {
      // Fallback: используем простую конкатенацию
      const paramStr = Object.keys(simpleParams)
        .sort()
        .map(key => `${key}=${simpleParams[key]}`)
        .join('&');
      return `${url}_${paramStr}`;
    }
  };

  /**
   * Получение данных из кеша
   * 
   * @param {string} key Ключ кеша
   * @returns {any|null} Данные или null
   */
  const get = (key) => {
    const cached = cache.value.get(key);
    
    if (!cached) {
      if (enableStats) cacheStats.value.misses++;
      return null;
    }
    
    // Проверка TTL
    const age = Date.now() - cached.timestamp;
    if (age > cached.ttl) {
      cache.value.delete(key);
      if (enableStats) cacheStats.value.misses++;
      return null;
    }
    
    // Обновление времени последнего доступа (для LRU)
    cached.lastAccessed = Date.now();
    
    if (enableStats) cacheStats.value.hits++;
    return cached.data;
  };

  /**
   * Сохранение данных в кеш
   * 
   * @param {string} key Ключ кеша
   * @param {any} data Данные для кеширования
   * @param {number} customTTL Кастомный TTL (опционально)
   */
  const set = (key, data, customTTL = null) => {
    // Проверка размера кеша и удаление старых записей (LRU)
    if (cache.value.size >= maxSize) {
      evictLRU();
    }
    
    cache.value.set(key, {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      ttl: customTTL || ttl
    });
    
    if (enableStats) cacheStats.value.sets++;
  };

  /**
   * Удаление наименее используемой записи (LRU)
   */
  const evictLRU = () => {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, value] of cache.value.entries()) {
      if (value.lastAccessed < oldestTime) {
        oldestTime = value.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      cache.value.delete(oldestKey);
    }
  };

  /**
   * Очистка всего кеша
   */
  const clear = () => {
    cache.value.clear();
    if (enableStats) {
      cacheStats.value = {
        hits: 0,
        misses: 0,
        sets: 0,
        invalidations: 0
      };
    }
  };

  /**
   * Инвалидация кеша по паттерну
   * 
   * @param {string|RegExp} pattern Паттерн для поиска ключей
   */
  const invalidate = (pattern) => {
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern) 
      : pattern;
    
    let invalidated = 0;
    for (const key of cache.value.keys()) {
      if (regex.test(key)) {
        cache.value.delete(key);
        invalidated++;
      }
    }
    
    if (enableStats) cacheStats.value.invalidations += invalidated;
    return invalidated;
  };

  /**
   * Очистка устаревших записей
   */
  const cleanup = () => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of cache.value.entries()) {
      const age = now - value.timestamp;
      if (age > value.ttl) {
        cache.value.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  };

  /**
   * Получение статистики кеша
   */
  const getStats = () => {
    const total = cacheStats.value.hits + cacheStats.value.misses;
    const hitRate = total > 0 
      ? (cacheStats.value.hits / total * 100).toFixed(2) 
      : 0;
    
    return {
      ...cacheStats.value,
      size: cache.value.size,
      hitRate: `${hitRate}%`
    };
  };

  // Автоматическая очистка каждые 5 минут
  let cleanupInterval = null;
  const startAutoCleanup = (interval = 5 * 60 * 1000) => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
    
    cleanupInterval = setInterval(() => {
      cleanup();
    }, interval);
  };

  const stopAutoCleanup = () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  };

  // Запуск автоматической очистки
  startAutoCleanup();

  return {
    get,
    set,
    clear,
    invalidate,
    cleanup,
    getCacheKey,
    getStats,
    startAutoCleanup,
    stopAutoCleanup
  };
}

