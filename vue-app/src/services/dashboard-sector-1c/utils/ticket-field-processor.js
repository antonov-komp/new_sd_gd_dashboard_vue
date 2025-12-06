/**
 * Оптимизированная обработка полей тикета
 * 
 * Предоставляет методы для эффективной обработки полей тикета,
 * включая кеширование результатов и оптимизацию извлечения пользовательских полей.
 */

/**
 * Кеш для результатов обработки полей
 * Ключ: ticketId, Значение: { data: processedFields, timestamp: number }
 */
const fieldCache = new Map();

/**
 * TTL для кеша полей тикетов (10 минут)
 */
const FIELD_CACHE_TTL = 10 * 60 * 1000; // 10 минут в миллисекундах

/**
 * Очистка кеша полей
 * 
 * Используется при обновлении данных тикета или при необходимости
 * пересчитать поля заново.
 * 
 * @example
 * clearFieldCache();
 */
export function clearFieldCache() {
  fieldCache.clear();
}

/**
 * Извлечение пользовательских полей (UF_*) из данных тикета
 * 
 * Оптимизированная версия с использованием Object.keys() и фильтрации.
 * 
 * @param {Object} ticketData - Данные тикета из Bitrix24
 * @returns {Object} Объект с пользовательскими полями
 * 
 * @example
 * const ticketData = { ID: 123, UF_CRM_7_TYPE_PRODUCT: '1C', TITLE: 'Test' };
 * const userFields = extractUserFields(ticketData);
 * // { UF_CRM_7_TYPE_PRODUCT: '1C' }
 */
export function extractUserFields(ticketData) {
  if (!ticketData || typeof ticketData !== 'object') {
    return {};
  }
  
  const userFields = {};
  
  // Используем Object.keys() для оптимизации (быстрее, чем for...in)
  const keys = Object.keys(ticketData);
  
  for (const key of keys) {
    // Проверяем, начинается ли ключ с UF_ (регистронезависимо)
    if (key.toUpperCase().startsWith('UF_')) {
      userFields[key] = ticketData[key];
    }
  }
  
  return userFields;
}

/**
 * Обработка дополнительных полей тикета
 * 
 * Извлекает и структурирует дополнительные пользовательские поля (UF_*)
 * из данных тикета с поддержкой разных вариантов именования.
 * 
 * Использует кеширование для оптимизации повторных вызовов.
 * 
 * @param {Object} ticketData - Данные тикета из Bitrix24
 * @param {number} ticketId - ID тикета (для кеширования)
 * @param {boolean} useCache - Использовать кеш (по умолчанию true)
 * @returns {Object} Структурированные дополнительные поля
 * 
 * @example
 * const ticketData = { ID: 123, UF_CRM_7_TYPE_PRODUCT: '1C' };
 * const additionalFields = processAdditionalFields(ticketData, 123);
 * // { typeProduct: '1C', all: { UF_CRM_7_TYPE_PRODUCT: '1C' } }
 */
export function processAdditionalFields(ticketData, ticketId = null, useCache = true) {
  // Проверка кеша с учётом TTL
  if (useCache && ticketId && fieldCache.has(ticketId)) {
    const cached = fieldCache.get(ticketId);
    const now = Date.now();
    
    // Проверяем, не истёк ли TTL
    if (cached.timestamp && (now - cached.timestamp) < FIELD_CACHE_TTL) {
      return cached.data;
    } else {
      // Удаляем устаревшую запись
      fieldCache.delete(ticketId);
    }
  }
  
  const userFields = extractUserFields(ticketData);
  
  // Структурируем дополнительные поля
  const additionalFields = {
    // Поле типа продукта (поддержка разных вариантов именования)
    typeProduct: userFields.UF_CRM_7_TYPE_PRODUCT || 
                 userFields.uf_crm_7_type_product || 
                 userFields.ufCrm7TypeProduct || 
                 null,
    
    // Добавьте здесь другие дополнительные поля по мере необходимости
    // ...
    
    // Все пользовательские поля (для расширяемости)
    all: userFields
  };
  
  // Сохранение в кеш с timestamp
  if (useCache && ticketId) {
    fieldCache.set(ticketId, {
      data: additionalFields,
      timestamp: Date.now()
    });
  }
  
  return additionalFields;
}

/**
 * Нормализация имени поля
 * 
 * Приводит имя поля к стандартному виду (верхний регистр с подчёркиваниями).
 * 
 * @param {string} fieldName - Имя поля
 * @returns {string} Нормализованное имя поля
 * 
 * @example
 * normalizeFieldName('uf_crm_7_type_product'); // 'UF_CRM_7_TYPE_PRODUCT'
 * normalizeFieldName('ufCrm7TypeProduct'); // 'UFCRM7TYPEPRODUCT'
 */
export function normalizeFieldName(fieldName) {
  if (!fieldName || typeof fieldName !== 'string') {
    return '';
  }
  
  return fieldName.toUpperCase().replace(/-/g, '_');
}

