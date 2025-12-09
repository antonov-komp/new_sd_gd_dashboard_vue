/**
 * Фильтр для фильтрации тикетов по сектору 1С
 * 
 * Фильтрует тикеты по глобальному тегу сектора 1С
 * Пользовательское поле UF_CRM_7_TYPE_PRODUCT должно содержать значение '1C'
 * 
 * Использует мемоизацию для оптимизации повторных фильтраций
 */

import { getDiagnosticsService, isDiagnosticsEnabled } from '../utils/diagnostics-service.js';

/**
 * Глобальный тег определения сектора 1С
 * Пользовательское поле UF_CRM_7_TYPE_PRODUCT
 */
const SECTOR_TAG = '1C';

/**
 * Кеш для мемоизации результатов фильтрации
 * Ключ: JSON-строка массива тикетов, Значение: отфильтрованный массив
 * @type {Map<string, Array>}
 */
const filterCache = new Map();

/**
 * Максимальный размер кеша фильтрации
 */
const MAX_CACHE_SIZE = 100;

/**
 * Получение тега сектора из тикета
 * 
 * @param {object} ticket - Тикет из Bitrix24
 * @returns {string|Array|object|null} Значение тега или null
 */
function getTicketTagValue(ticket) {
  return ticket.UF_CRM_7_TYPE_PRODUCT ||  // С useOriginalUfNames: 'Y'
         ticket.uf_crm_7_type_product ||   // Без параметра (нижний регистр)
         ticket.ufCrm7TypeProduct ||       // camelCase вариант
         ticket['UF_CRM_7_TYPE_PRODUCT'] ||
         ticket['uf_crm_7_type_product'] ||
         null;
}

/**
 * Проверка, соответствует ли тикет сектору 1С
 * 
 * @param {object} ticket - Тикет из Bitrix24
 * @returns {boolean} true, если тикет принадлежит сектору 1С
 */
function isTicketInSector(ticket) {
  const tagValue = getTicketTagValue(ticket);
  
  if (!tagValue) {
    return false;
  }
  
  // Проверяем точное совпадение или если значение является массивом/объектом
  if (Array.isArray(tagValue)) {
    return tagValue.includes(SECTOR_TAG);
  }
  if (typeof tagValue === 'object' && tagValue !== null) {
    return tagValue.value === SECTOR_TAG || tagValue === SECTOR_TAG;
  }
  
  return tagValue === SECTOR_TAG;
}

/**
 * Генерация ключа кеша для массива тикетов
 * 
 * @param {Array} tickets - Массив тикетов
 * @returns {string} Ключ кеша
 */
function getCacheKey(tickets) {
  // Используем хеш от ID тикетов для быстрого сравнения
  const ids = tickets.map(t => t.id || t.ID || '').sort().join(',');
  return `filter:${ids}`;
}

/**
 * Очистка кеша фильтрации при превышении лимита
 */
function cleanFilterCache() {
  if (filterCache.size > MAX_CACHE_SIZE) {
    // Удаляем первые 20% записей (старейшие)
    const keysToDelete = Array.from(filterCache.keys()).slice(0, Math.floor(MAX_CACHE_SIZE * 0.2));
    keysToDelete.forEach(key => filterCache.delete(key));
  }
}

/**
 * Фильтрация тикетов по тегу сектора 1С
 * 
 * Проверяет поле UF_CRM_7_TYPE_PRODUCT (может быть в разных регистрах)
 * Использует мемоизацию для оптимизации повторных фильтраций
 * 
 * @param {Array} tickets - Массив тикетов из Bitrix24
 * @returns {Array} Отфильтрованный массив тикетов сектора 1С
 */
export function filterBySector(tickets) {
  if (!Array.isArray(tickets)) {
    return [];
  }

  // Проверяем кеш
  const cacheKey = getCacheKey(tickets);
  const cached = filterCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Фильтруем тикеты
  const filtered = tickets.filter(isTicketInSector);
  
  // Логирование диагностики (только если включена)
  try {
    const diagnostics = getDiagnosticsService();
    if (diagnostics && isDiagnosticsEnabled()) {
      // Собираем отфильтрованные тикеты
      const rejected = tickets.filter(t => !isTicketInSector(t));
      
      // Собираем примеры значений тега
      const tagValueExamples = [];
      const seenValues = new Set();
      tickets.forEach(ticket => {
        const tagValue = getTicketTagValue(ticket);
        if (tagValue && !seenValues.has(String(tagValue))) {
          seenValues.add(String(tagValue));
          tagValueExamples.push({
            value: tagValue,
            type: typeof tagValue,
            isArray: Array.isArray(tagValue),
            ticketId: ticket.id || ticket.ID
          });
        }
      });
      
      diagnostics.logFiltering(tickets.length, filtered.length, rejected, tagValueExamples);
    }
  } catch (diagError) {
    // Игнорируем ошибки диагностики, чтобы не ломать основной процесс
    console.warn('Diagnostics logging error in filterBySector:', diagError);
  }

  // Сохраняем в кеш
  filterCache.set(cacheKey, filtered);
  cleanFilterCache();

  return filtered;
}

/**
 * Очистка кеша фильтрации
 */
export function clearFilterCache() {
  filterCache.clear();
}

/**
 * Получение тега сектора
 * 
 * @returns {string} Тег сектора 1С
 */
export function getSectorTag() {
  return SECTOR_TAG;
}

