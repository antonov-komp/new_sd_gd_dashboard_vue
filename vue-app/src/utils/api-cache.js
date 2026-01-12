/**
 * Простой кеш для API запросов
 *
 * Реализует клиентское кеширование для предотвращения повторных
 * тяжелых запросов к API.
 *
 * TASK-PERF-OPTIMIZATION: Решение проблемы медленной загрузки попапов
 */

const API_CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

/**
 * Ключ для кеширования запроса
 */
function getCacheKey(endpoint, params) {
  return `${endpoint}:${JSON.stringify(params)}`;
}

/**
 * Проверяет, валиден ли кеш
 */
function isCacheValid(cachedItem) {
  return Date.now() - cachedItem.timestamp < CACHE_TTL;
}

/**
 * Сохраняет результат в кеш
 */
function setCache(key, data) {
  API_CACHE.set(key, {
    data,
    timestamp: Date.now()
  });

  // Ограничиваем размер кеша
  if (API_CACHE.size > 20) {
    const firstKey = API_CACHE.keys().next().value;
    API_CACHE.delete(firstKey);
  }
}

/**
 * Получает данные из кеша
 */
function getCache(key) {
  const cached = API_CACHE.get(key);
  if (cached && isCacheValid(cached)) {
    console.log('[API-CACHE] Cache hit for key:', key);
    return cached.data;
  }

  if (cached && !isCacheValid(cached)) {
    console.log('[API-CACHE] Cache expired for key:', key);
    API_CACHE.delete(key);
  }

  return null;
}

/**
 * Очищает кеш для конкретного endpoint
 */
export function clearApiCache(endpoint = null) {
  if (endpoint) {
    // Очищаем кеш для конкретного endpoint
    for (const [key] of API_CACHE) {
      if (key.startsWith(endpoint)) {
        API_CACHE.delete(key);
      }
    }
  } else {
    // Очищаем весь кеш
    API_CACHE.clear();
  }
  console.log('[API-CACHE] Cache cleared');
}

/**
 * Cached версия fetchAdmissionClosureStats
 */
export async function cachedFetchAdmissionClosureStats(params = {}) {
  const endpoint = '/api/graph-1c-admission-closure.php';
  const cacheKey = getCacheKey(endpoint, params);

  // Проверяем кеш
  const cachedData = getCache(endpoint, params);
  if (cachedData) {
    return cachedData;
  }

  // Если в кеше нет, делаем запрос
  console.log('[API-CACHE] Cache miss, making API request for:', cacheKey);

  const { LazyServiceLoader } = await import('@/utils/lazy-services.js');
  const { fetchAdmissionClosureStats } = await LazyServiceLoader.loadAdmissionClosureService();
  const result = await fetchAdmissionClosureStats(params);

  // Сохраняем в кеш
  setCache(cacheKey, result);

  return result;
}

/**
 * Cached версия для CarryoverDurationModal
 */
export async function cachedFetchCarryoverData(weekStartUtc, weekEndUtc) {
  const params = {
    product: '1C',
    weekStartUtc,
    weekEndUtc,
    includeCarryoverTickets: true,
    includeCarryoverTicketsByDuration: true,
    includeTickets: true
  };

  return cachedFetchAdmissionClosureStats(params);
}

/**
 * Статистика кеша
 */
export function getCacheStats() {
  const stats = {
    size: API_CACHE.size,
    entries: []
  };

  for (const [key, value] of API_CACHE) {
    stats.entries.push({
      key,
      age: Date.now() - value.timestamp,
      isValid: isCacheValid(value)
    });
  }

  return stats;
}