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
const ALT_SECTOR_TAGS = ['1С']; // Кириллица "С" в некоторых данных

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
 * Нормализация значения тега:
 * - Приводим к строке
 * - Тримим
 * - Переводим в верхний регистр
 * - Заменяем кириллическую "С" на латинскую "C" для варианта "1C"
 */
function normalizeTagString(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim().toUpperCase().replace(/С/g, 'C'); // Кириллица -> латиница
  return str || null;
}

/**
 * Приведение значения UF_CRM_7_TYPE_PRODUCT к массиву нормализованных строк.
 * Поддерживаются:
 * - строки (в т.ч. с разделителями запятая/точка с запятой)
 * - массивы
 * - объекты с полем value
 */
function normalizeTagValue(rawValue) {
  if (!rawValue) return [];

  // Если массив — нормализуем каждый элемент
  if (Array.isArray(rawValue)) {
    return rawValue
      .map(normalizeTagString)
      .filter(Boolean);
  }

  // Если объект с value — берем value
  if (typeof rawValue === 'object' && rawValue.value !== undefined) {
    const normalized = normalizeTagString(rawValue.value);
    return normalized ? [normalized] : [];
  }

  // Строка — разбиваем по запятой/точке с запятой
  const asString = normalizeTagString(rawValue);
  if (!asString) return [];

  return asString
    .split(/[;,]/)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Проверка, соответствует ли тикет сектору 1С
 * 
 * @param {object} ticket - Тикет из Bitrix24
 * @returns {boolean} true, если тикет принадлежит сектору 1С
 */
function isTicketInSector(ticket) {
  const rawValue = getTicketTagValue(ticket);
  const normalizedValues = normalizeTagValue(rawValue);

  if (normalizedValues.length === 0) {
    return false;
  }

  // Совпадение по "1C" или альтернативным вариантам ("1С")
  return normalizedValues.some(val => val === SECTOR_TAG || ALT_SECTOR_TAGS.includes(val));
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
      
      // Собираем примеры значений тега (сырые и нормализованные)
      const tagValueExamples = [];
      const seenValues = new Set();
      tickets.forEach(ticket => {
        const tagValue = getTicketTagValue(ticket);
        const normalized = normalizeTagValue(tagValue);
        const rawString = tagValue === null || tagValue === undefined ? '' : String(tagValue);
        if (tagValue !== undefined && tagValue !== null && !seenValues.has(rawString)) {
          seenValues.add(rawString);
          tagValueExamples.push({
            value: tagValue,
            normalized,
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

