/**
 * Сервис для работы с логами вебхуков
 * 
 * Расположение: vue-app/src/services/webhook-logs-api.js
 * 
 * Документация:
 * - https://context7.com/bitrix24/rest/webhook/
 * - https://apidocs.bitrix24.ru/rest_help/general/webhooks/index.php
 */

import { useCache } from '@/composables/useCache.js';

// Инициализация кеша для логов
const { get, set, getCacheKey, invalidate } = useCache({
  ttl: 2 * 60 * 1000, // 2 минуты для логов
  maxSize: 50
});

export class WebhookLogsApiService {
  /**
   * Получение списка логов с кешированием
   * 
   * @param {object} filters Фильтры (category, event, date, hour)
   * @param {number} page Номер страницы
   * @param {number} limit Количество записей на странице
   * @param {boolean} forceRefresh Принудительное обновление (игнорировать кеш)
   * @returns {Promise<object>} Результат с логами и пагинацией
   */
  static async getLogs(filters = {}, page = 1, limit = 50, forceRefresh = false) {
    // Создаём простой объект для кеша (избегаем реактивных объектов Vue)
    const simpleFilters = {
      category: filters.category || null,
      event: filters.event || null,
      date: filters.date || null,
      hour: filters.hour !== undefined ? filters.hour : null,
      dateFrom: filters.dateFrom || null,
      dateTo: filters.dateTo || null,
      ip: filters.ip || null,
      status: filters.status || null
    };
    
    const cacheKey = getCacheKey('/api/webhook-logs.php', { 
      filters: simpleFilters, 
      page, 
      limit 
    });
    
    // Проверка кеша (если не принудительное обновление)
    if (!forceRefresh) {
      const cached = get(cacheKey);
      if (cached) {
        console.log('[Cache] Hit:', cacheKey.substring(0, 50) + '...');
        return cached;
      }
    }
    
    console.log('[Cache] Miss:', cacheKey.substring(0, 50) + '...');
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    // Добавление фильтров
    if (filters.category) {
      params.append('category', filters.category);
    }
    if (filters.event) {
      params.append('event', filters.event);
    }
    if (filters.date) {
      params.append('date', filters.date);
    }
    if (filters.hour !== null && filters.hour !== undefined) {
      params.append('hour', filters.hour.toString());
    }
    if (filters.dateFrom) {
      params.append('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo) {
      params.append('dateTo', filters.dateTo);
    }
    if (filters.ip) {
      params.append('ip', filters.ip);
    }
    if (filters.status) {
      params.append('status', filters.status);
    }
    
    try {
      const response = await fetch(`/api/webhook-logs.php?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log('[WebhookLogsApiService] API response:', {
        success: result.success,
        logsCount: result.logs?.length || 0,
        pagination: result.pagination,
        hasError: !!result.error
      });
      
      if (result.error) {
        throw new Error(result.error_description || result.error);
      }
      
      // Проверка формата ответа
      if (!result.success) {
        console.warn('[WebhookLogsApiService] API returned success=false:', result);
      }
      
      // Сохранение в кеш
      set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Webhook logs API error:', error);
      throw error;
    }
  }
  
  /**
   * Инвалидация кеша при изменении фильтров
   * 
   * @param {object} oldFilters Старые фильтры
   * @param {object} newFilters Новые фильтры
   */
  static invalidateCacheOnFilterChange(oldFilters = {}, newFilters = {}) {
    // Инвалидируем все записи, связанные с логами
    const invalidated = invalidate(/^\/api\/webhook-logs\.php/);
    console.log(`[Cache] Invalidated ${invalidated} entries on filter change`);
  }
  
  /**
   * Очистка всего кеша логов
   */
  static clearCache() {
    const invalidated = invalidate(/^\/api\/webhook-logs\.php/);
    console.log(`[Cache] Cleared ${invalidated} entries`);
  }
  
  /**
   * Получение детальной информации о логе
   * (используется тот же метод getLogs, но с фильтрацией по ID)
   * 
   * @param {string} logId Уникальный ID лога (комбинация timestamp + event)
   * @param {string} date Дата лога
   * @returns {Promise<object|null>} Данные лога или null
   */
  static async getLogDetails(logId, date = null) {
    // Реализация зависит от структуры ID лога
    // Можно использовать комбинацию timestamp + event для поиска
    const filters = {};
    if (date) {
      filters.date = date;
    }
    
    const result = await this.getLogs(filters, 1, 1000);
    
    // Поиск лога по ID (если ID формируется из timestamp + event)
    const log = result.logs.find(l => {
      const logIdCandidate = `${l.timestamp}_${l.event}`;
      return logIdCandidate === logId;
    });
    
    return log || null;
  }
  
  /**
   * Получение ошибок
   * 
   * @param {object} filters Дополнительные фильтры
   * @param {number} page Номер страницы
   * @param {number} limit Количество записей на странице
   * @returns {Promise<object>} Результат с ошибками и пагинацией
   */
  static async getErrors(filters = {}, page = 1, limit = 50) {
    return this.getLogs({ ...filters, category: 'errors' }, page, limit);
  }
}



