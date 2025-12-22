/**
 * Сервис для работы с логами вебхуков
 * 
 * Расположение: vue-app/src/services/webhook-logs-api.js
 * 
 * Обновлён для работы с новым рефакторенным API
 * Использует типизированные интерфейсы и валидацию данных
 * 
 * Документация:
 * - https://context7.com/bitrix24/rest/webhook/
 * - https://apidocs.bitrix24.ru/rest_help/general/webhooks/index.php
 */

import { useCache } from '@/composables/useCache.js';
import { 
  normalizeWebhookLogEntries,
  isValidWebhookLogEntry 
} from '@/types/webhook-logs.js';

// Инициализация кеша для логов
const { get, set, getCacheKey, invalidate } = useCache({
  ttl: 2 * 60 * 1000, // 2 минуты для логов
  maxSize: 50
});

export class WebhookLogsApiService {
  /**
   * Получить базовый URL API
   * Определяется автоматически на основе текущего пути
   * 
   * @returns {string} Базовый URL для API запросов
   */
  static getBaseUrl() {
    // Определяем базовый путь автоматически
    const path = window.location.pathname;
    const basePath = path.substring(0, path.lastIndexOf('/'));
    return basePath + '/api/webhook-logs.php';
  }
  
  /**
   * Базовый URL API (для обратной совместимости)
   * 
   * @type {string}
   * @deprecated Используйте getBaseUrl() вместо этого
   */
  static get BASE_URL() {
    return this.getBaseUrl();
  }
  
  /**
   * Получение списка логов с кешированием и валидацией
   * 
   * @param {WebhookLogsFilters} filters Фильтры
   * @param {number} page Номер страницы
   * @param {number} limit Количество записей на странице
   * @param {boolean} forceRefresh Принудительное обновление (игнорировать кеш)
   * @returns {Promise<WebhookLogsApiResponse>} Результат с логами и пагинацией
   * @throws {Error} При ошибке API или валидации данных
   */
  static async getLogs(filters = {}, page = 1, limit = 50, forceRefresh = false) {
    // Валидация параметров
    if (page < 1) {
      throw new Error('Page must be greater than 0');
    }
    
    if (limit < 1 || limit > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }
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
    
    const baseUrl = this.getBaseUrl();
    const cacheKey = getCacheKey(baseUrl, { 
      filters: simpleFilters, 
      page, 
      limit 
    });
    
    // Проверка кеша (если не принудительное обновление)
    if (!forceRefresh) {
      const cached = get(cacheKey);
      if (cached) {
        console.log('[WebhookLogsApiService] Cache hit:', cacheKey.substring(0, 50) + '...');
        return cached;
      }
    }
    
    console.log('[WebhookLogsApiService] Cache miss:', cacheKey.substring(0, 50) + '...');
    
    // Формирование параметров запроса
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    // Добавление фильтров
    if (simpleFilters.category) {
      params.append('category', simpleFilters.category);
    }
    if (simpleFilters.event) {
      params.append('event', simpleFilters.event);
    }
    if (simpleFilters.date) {
      params.append('date', simpleFilters.date);
    }
    if (simpleFilters.hour !== null) {
      params.append('hour', simpleFilters.hour.toString());
    }
    if (simpleFilters.dateFrom) {
      params.append('dateFrom', simpleFilters.dateFrom);
    }
    if (simpleFilters.dateTo) {
      params.append('dateTo', simpleFilters.dateTo);
    }
    if (simpleFilters.ip) {
      params.append('ip', simpleFilters.ip);
    }
    if (simpleFilters.status) {
      params.append('status', simpleFilters.status);
    }
    
    try {
      const baseUrl = this.getBaseUrl();
      const response = await fetch(`${baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        // Обработка HTTP ошибок
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        
        throw new Error(
          errorData.error_description || 
          errorData.error || 
          `HTTP error! status: ${response.status}`
        );
      }
      
      const result = await response.json();
      
      console.log('[WebhookLogsApiService] API response:', {
        success: result.success,
        logsCount: result.logs?.length || 0,
        pagination: result.pagination,
        hasError: !!result.error
      });
      
      // Проверка формата ответа
      if (result.error) {
        throw new Error(result.error_description || result.error);
      }
      
      if (!result.success) {
        console.warn('[WebhookLogsApiService] API returned success=false:', result);
        throw new Error('API request failed');
      }
      
      // Валидация и нормализация данных
      if (!Array.isArray(result.logs)) {
        console.error('[WebhookLogsApiService] Invalid logs format:', result.logs);
        throw new Error('Invalid logs format: expected array');
      }
      
      // Нормализация записей логов
      const normalizedLogs = normalizeWebhookLogEntries(result.logs);
      
      // Валидация пагинации
      if (!result.pagination || typeof result.pagination !== 'object') {
        console.warn('[WebhookLogsApiService] Invalid pagination format:', result.pagination);
        // Создаём дефолтную пагинацию
        result.pagination = {
          page: page,
          limit: limit,
          total: normalizedLogs.length,
          pages: Math.ceil(normalizedLogs.length / limit)
        };
      }
      
      // Создаём нормализованный результат
      const normalizedResult = {
        success: true,
        logs: normalizedLogs,
        pagination: {
          page: result.pagination.page || page,
          limit: result.pagination.limit || limit,
          total: result.pagination.total || normalizedLogs.length,
          pages: result.pagination.pages || Math.ceil((result.pagination.total || normalizedLogs.length) / limit)
        }
      };
      
      // Сохранение в кеш
      set(cacheKey, normalizedResult);
      
      return normalizedResult;
    } catch (error) {
      console.error('[WebhookLogsApiService] Error:', error);
      throw error;
    }
  }
  
  /**
   * Инвалидация кеша при изменении фильтров
   * 
   * @param {WebhookLogsFilters} oldFilters Старые фильтры
   * @param {WebhookLogsFilters} newFilters Новые фильтры
   */
  static invalidateCacheOnFilterChange(oldFilters = {}, newFilters = {}) {
    // Инвалидируем все записи, связанные с логами
    const invalidated = invalidate(/^\/api\/webhook-logs\.php/);
    console.log(`[WebhookLogsApiService] Invalidated ${invalidated} entries on filter change`);
  }
  
  /**
   * Очистка всего кеша логов
   */
  static clearCache() {
    const invalidated = invalidate(/^\/api\/webhook-logs\.php/);
    console.log(`[WebhookLogsApiService] Cleared ${invalidated} entries`);
  }
  
  /**
   * Получение детальной информации о логе
   * 
   * @param {string} logId Уникальный ID лога (комбинация timestamp + event)
   * @param {string} date Дата лога
   * @returns {Promise<WebhookLogEntry|null>} Данные лога или null
   */
  static async getLogDetails(logId, date = null) {
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
   * @param {WebhookLogsFilters} filters Дополнительные фильтры
   * @param {number} page Номер страницы
   * @param {number} limit Количество записей на странице
   * @returns {Promise<WebhookLogsApiResponse>} Результат с ошибками и пагинацией
   */
  static async getErrors(filters = {}, page = 1, limit = 50) {
    return this.getLogs({ ...filters, category: 'errors' }, page, limit);
  }
  
  /**
   * Получение статистики
   * 
   * @param {WebhookLogsFilters} filters Фильтры для статистики
   * @returns {Promise<WebhookLogsStats>} Статистика
   */
  static async getStats(filters = {}) {
    // Получаем все логи для статистики (без пагинации)
    const result = await this.getLogs(filters, 1, 1000);
    
    const stats = {
      total: result.pagination.total || result.logs.length,
      tasks: 0,
      smartProcesses: 0,
      errors: 0,
      byEvent: {},
      byDate: {}
    };
    
    // Подсчёт статистики
    result.logs.forEach(log => {
      // По категориям
      if (log.category === 'tasks') {
        stats.tasks++;
      } else if (log.category === 'smart-processes') {
        stats.smartProcesses++;
      } else if (log.category === 'errors') {
        stats.errors++;
      }
      
      // По типам событий
      if (!stats.byEvent[log.event]) {
        stats.byEvent[log.event] = 0;
      }
      stats.byEvent[log.event]++;
      
      // По датам
      const date = log.timestamp.split('T')[0];
      if (!stats.byDate[date]) {
        stats.byDate[date] = 0;
      }
      stats.byDate[date]++;
    });
    
    return stats;
  }
}



