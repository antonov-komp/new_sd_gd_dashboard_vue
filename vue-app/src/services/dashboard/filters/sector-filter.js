/**
 * Универсальная система фильтрации тикетов по секторам
 *
 * Реализует унифицированную логику фильтрации тикетов по полю UF_CRM_7_TYPE_PRODUCT
 * для всех секторов (1C, PDM, Bitrix24, Infrastructure).
 *
 * Поддерживает:
 * - Одиночные значения фильтра: '1C', 'PDM', 'Bitrix24'
 * - Множественные значения фильтра: ['Железо', 'Прочее']
 * - Регистронезависимую фильтрацию
 * - Поддержку кириллицы (1С → 1C)
 * - Мемоизацию для производительности
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { Logger } from '../utils/logger.js';

// Кеш для мемоизации результатов фильтрации
const filterCache = new Map();
const MAX_CACHE_SIZE = 100;

/**
 * Универсальная фильтрация тикетов по сектору
 *
 * Фильтрует массив тикетов по конфигурации сектора из SECTORS_CONFIG.
 * Поддерживает одиночные и множественные значения фильтра.
 *
 * @param {Array<Object>} tickets - Массив тикетов из Bitrix24
 * @param {Object} sectorConfig - Конфигурация сектора из SECTORS_CONFIG
 * @param {string} sectorConfig.id - ID сектора ('1c', 'pdm', 'bitrix24', 'infrastructure')
 * @param {string|string[]} sectorConfig.filterValue - Значение(я) фильтра UF_CRM_7_TYPE_PRODUCT
 * @param {string} sectorConfig.name - Название сектора для логирования
 * @param {string} [sectorConfig.filterField='UF_CRM_7_TYPE_PRODUCT'] - Поле для фильтрации
 * @returns {Array<Object>} Отфильтрованные тикеты
 *
 * @example
 * // Сектор 1C (одиночное значение)
 * filterTicketsBySector(tickets, {
 *   id: '1c',
 *   filterValue: '1C',
 *   name: '1C',
 *   filterField: 'UF_CRM_7_TYPE_PRODUCT'
 * })
 *
 * // Сектор Infrastructure (множественное значение)
 * filterTicketsBySector(tickets, {
 *   id: 'infrastructure',
 *   filterValue: ['Железо', 'Прочее'],
 *   name: 'Infrastructure',
 *   filterField: 'UF_CRM_7_TYPE_PRODUCT'
 * })
 */
export function filterTicketsBySector(tickets, sectorConfig) {
  if (!Array.isArray(tickets)) {
    Logger.warn('filterTicketsBySector: tickets is not an array', 'sector-filter');
    return [];
  }

  if (!sectorConfig || !sectorConfig.id) {
    Logger.error('filterTicketsBySector: invalid sectorConfig', 'sector-filter', sectorConfig);
    return [];
  }

  const cacheKey = getCacheKey(tickets, sectorConfig);
  const cached = filterCache.get(cacheKey);

  if (cached !== undefined) {
    Logger.debug(`Filter cache hit for sector ${sectorConfig.id}`, 'sector-filter');
    return cached;
  }

  // Получить нормализованные значения фильтра
  const filterValues = getNormalizedFilterValues(sectorConfig);

  if (filterValues.length === 0) {
    Logger.warn(`No filter values for sector ${sectorConfig.id}`, 'sector-filter');
    return [];
  }

  // Фильтровать тикеты
  const filtered = tickets.filter(ticket =>
    isTicketInSector(ticket, filterValues, sectorConfig)
  );

  // Логирование для диагностики
  Logger.info(`Filtered ${filtered.length}/${tickets.length} tickets for sector ${sectorConfig.id}`, 'sector-filter', {
    sectorId: sectorConfig.id,
    sectorName: sectorConfig.name,
    totalTickets: tickets.length,
    filteredTickets: filtered.length,
    filterValues,
    filterField: sectorConfig.filterField || 'UF_CRM_7_TYPE_PRODUCT'
  });

  // Сохранить в кеш
  filterCache.set(cacheKey, filtered);
  cleanFilterCache();

  return filtered;
}

/**
 * Получить нормализованные значения фильтра для сектора
 *
 * @param {Object} sectorConfig - Конфигурация сектора
 * @returns {string[]} Массив нормализованных значений фильтра
 * @private
 */
function getNormalizedFilterValues(sectorConfig) {
  const { filterValue } = sectorConfig;

  if (!filterValue) {
    return [];
  }

  // Поддержка как filterValue, так и filterValues для совместимости
  const values = Array.isArray(filterValue) ? filterValue :
                Array.isArray(sectorConfig.filterValues) ? sectorConfig.filterValues :
                [filterValue];

  return values
    .filter(value => value !== null && value !== undefined)
    .map(value => normalizeFilterValue(value))
    .filter(Boolean);
}

/**
 * Проверить, принадлежит ли тикет сектору
 *
 * @param {Object} ticket - Тикет из Bitrix24
 * @param {string[]} filterValues - Нормализованные значения фильтра
 * @param {Object} sectorConfig - Конфигурация сектора
 * @returns {boolean} true если тикет принадлежит сектору
 * @private
 */
function isTicketInSector(ticket, filterValues, sectorConfig) {
  if (!ticket || typeof ticket !== 'object') {
    return false;
  }

  const ticketValue = getTicketFieldValue(ticket, sectorConfig.filterField || 'UF_CRM_7_TYPE_PRODUCT');
  const normalizedTicketValue = normalizeFilterValue(ticketValue);

  if (!normalizedTicketValue) {
    return false;
  }

  // Проверяем совпадение с любым из значений фильтра
  return filterValues.some(filterValue => normalizedTicketValue === filterValue);
}

/**
 * Получить значение поля тикета с учетом различных форматов
 *
 * @param {Object} ticket - Тикет из Bitrix24
 * @param {string} fieldName - Имя поля (UF_CRM_7_TYPE_PRODUCT)
 * @returns {string|Array|object|null} Значение поля или null
 * @private
 */
function getTicketFieldValue(ticket, fieldName) {
  // Проверяем различные варианты написания поля
  return ticket[fieldName] ||                          // UF_CRM_7_TYPE_PRODUCT
         ticket[fieldName.toLowerCase()] ||            // uf_crm_7_type_product
         ticket[camelCase(fieldName)] ||              // ufCrm7TypeProduct
         ticket[fieldName.replace(/_/g, '').toLowerCase()] || // ufcrm7typeproduct
         null;
}

/**
 * Нормализация значения фильтра
 *
 * Преобразует значение к верхнему регистру, заменяет кириллицу на латиницу,
 * обрабатывает различные форматы данных.
 *
 * @param {*} value - Значение для нормализации
 * @returns {string|null} Нормализованное значение или null
 * @private
 *
 * @example
 * normalizeFilterValue('1C')     // '1C'
 * normalizeFilterValue('1С')     // '1C' (кириллица)
 * normalizeFilterValue('pdm')    // 'PDM' (верхний регистр)
 * normalizeFilterValue('Железо') // 'ЖЕЛЕЗО'
 * normalizeFilterValue(null)     // null
 * normalizeFilterValue({ value: 'PDM' }) // 'PDM'
 */
function normalizeFilterValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  // Для объектов с полем value (формат Bitrix24)
  if (typeof value === 'object' && value.value !== undefined) {
    value = value.value;
  }

  // Для массивов берем первый элемент (редкий случай)
  if (Array.isArray(value) && value.length > 0) {
    value = value[0];
  }

  // Приведение к строке, trim, uppercase, замена кириллицы
  const str = String(value).trim().toUpperCase()
    .replace(/С/g, 'C')    // Кириллическая "С" → латинская "C"
    .replace(/с/g, 'c');   // Кириллическая "с" → латинская "c"

  return str || null;
}

/**
 * Генерация ключа кеша фильтрации
 *
 * @param {Array} tickets - Массив тикетов
 * @param {Object} sectorConfig - Конфигурация сектора
 * @returns {string} Ключ кеша
 * @private
 */
function getCacheKey(tickets, sectorConfig) {
  // Используем хеш от ID тикетов и конфигурации фильтра
  const ticketIds = tickets.map(t => t.id || t.ID || '').sort().join(',');
  const filterConfig = JSON.stringify({
    id: sectorConfig.id,
    filterValue: sectorConfig.filterValue,
    filterValues: sectorConfig.filterValues,
    filterField: sectorConfig.filterField
  });

  // Создаем уникальный ключ
  const hash = btoa(ticketIds + '|' + filterConfig).slice(0, 50);
  return `filter:${sectorConfig.id}:${hash}`;
}

/**
 * Очистка кеша при превышении лимита
 *
 * @private
 */
function cleanFilterCache() {
  if (filterCache.size > MAX_CACHE_SIZE) {
    const entriesToDelete = Math.floor(MAX_CACHE_SIZE * 0.2);
    const keys = Array.from(filterCache.keys()).slice(0, entriesToDelete);
    keys.forEach(key => filterCache.delete(key));

    Logger.debug(`Cleaned ${entriesToDelete} entries from filter cache`, 'sector-filter');
  }
}

/**
 * Преобразование строки в camelCase
 *
 * @param {string} str - Строка для преобразования
 * @returns {string} Строка в camelCase
 * @private
 */
function camelCase(str) {
  return str.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Очистка кеша фильтрации
 *
 * Используется при изменении данных или для принудительной инвалидации кеша.
 *
 * @export
 */
export function clearSectorFilterCache() {
  filterCache.clear();
  Logger.info('Sector filter cache cleared', 'sector-filter');
}

/**
 * Получение статистики кеша фильтрации
 *
 * @returns {Object} Статистика кеша
 * @export
 */
export function getFilterCacheStats() {
  return {
    size: filterCache.size,
    maxSize: MAX_CACHE_SIZE,
    utilizationPercent: Math.round((filterCache.size / MAX_CACHE_SIZE) * 100)
  };
}