/**
 * Валидаторы для данных вебхуков на клиенте
 * 
 * Расположение: vue-app/src/utils/webhook-validators.js
 */

import { isValidWebhookLogEntry, isValidEventDetails } from '@/types/webhook-logs.js';

/**
 * Валидация фильтров
 * 
 * @param {any} filters Фильтры для валидации
 * @returns {boolean} true если фильтры валидны
 */
export function validateFilters(filters) {
  if (!filters || typeof filters !== 'object') {
    return false;
  }
  
  // Валидация категории
  if (filters.category !== undefined && filters.category !== null) {
    const validCategories = ['tasks', 'smart-processes', 'errors'];
    if (!validCategories.includes(filters.category)) {
      return false;
    }
  }
  
  // Валидация даты
  if (filters.date !== undefined && filters.date !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.date)) {
      return false;
    }
  }
  
  // Валидация часа
  if (filters.hour !== undefined && filters.hour !== null) {
    const hour = parseInt(filters.hour, 10);
    if (isNaN(hour) || hour < 0 || hour > 23) {
      return false;
    }
  }
  
  // Валидация IP адреса
  if (filters.ip !== undefined && filters.ip !== null) {
    // Простая валидация IP (можно улучшить)
    if (typeof filters.ip !== 'string' || filters.ip.length === 0) {
      return false;
    }
  }
  
  return true;
}

/**
 * Валидация пагинации
 * 
 * @param {any} pagination Пагинация для валидации
 * @returns {boolean} true если пагинация валидна
 */
export function validatePagination(pagination) {
  if (!pagination || typeof pagination !== 'object') {
    return false;
  }
  
  const page = parseInt(pagination.page, 10);
  const limit = parseInt(pagination.limit, 10);
  const total = parseInt(pagination.total, 10);
  const pages = parseInt(pagination.pages, 10);
  
  if (isNaN(page) || page < 1) {
    return false;
  }
  
  if (isNaN(limit) || limit < 1 || limit > 1000) {
    return false;
  }
  
  if (isNaN(total) || total < 0) {
    return false;
  }
  
  if (isNaN(pages) || pages < 0) {
    return false;
  }
  
  return true;
}

export default {
  validateFilters,
  validatePagination,
  isValidWebhookLogEntry,
  isValidEventDetails
};


