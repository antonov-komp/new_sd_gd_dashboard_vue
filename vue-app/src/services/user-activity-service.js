/**
 * Сервис для работы с активностью пользователей
 *
 * Использует backend API для получения данных об активности
 * API endpoint: /api/user-activity-get.php
 *
 * Расширенная версия с поддержкой аналитики и метрик
 */

import { getApiUrl } from '@/utils/path-utils.js';
import { ActivityAnalyticsService } from './activity-analytics-service.js';

// Кеш для данных
const activityCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

export class UserActivityService {

  /**
   * Валидация и очистка данных активности
   *
   * @param {Array} data - Массив записей активности
   * @returns {Array} Очищенные и валидные данные
   */
  static validateAndCleanActivityData(data) {
    if (!Array.isArray(data)) {
      console.warn('[UserActivityService] Invalid data format: not an array');
      return [];
    }

    return data.filter(entry => {
      // Проверяем, что entry существует и является объектом
      if (!entry || typeof entry !== 'object') {
        console.warn('[UserActivityService] Invalid entry: not an object', entry);
        return false;
      }

      // Проверяем обязательные поля
      if (!entry.user_id) {
        console.warn('[UserActivityService] Invalid entry: missing user_id', entry);
        return false;
      }

      if (!entry.timestamp) {
        console.warn('[UserActivityService] Invalid entry: missing timestamp', entry);
        return false;
      }

      // Проверяем валидность timestamp
      const timestamp = new Date(entry.timestamp);
      if (isNaN(timestamp.getTime())) {
        console.warn('[UserActivityService] Invalid entry: invalid timestamp', entry.timestamp);
        return false;
      }

      return true;
    }).map(entry => ({
      ...entry,
      user_id: Number(entry.user_id),
      timestamp: entry.timestamp,
      type: entry.type || 'unknown',
      route_path: entry.route_path || null,
      route_title: entry.route_title || null,
      route_name: entry.route_name || null,
      user_name: entry.user_name || null,
      user_agent: entry.user_agent || null
    }));
  }

  /**
   * Получение активности пользователя
   * 
   * @param {object} options - Опции запроса
   * @param {number} options.userId - ID пользователя (опционально)
   * @param {string} options.dateFrom - Дата начала (YYYY-MM-DD)
   * @param {string} options.dateTo - Дата окончания (YYYY-MM-DD)
   * @param {string} options.type - Тип активности (app_entry, page_visit)
   * @param {number} options.limit - Лимит записей (по умолчанию 1000)
   * @returns {Promise<Array>} Массив записей активности
   */
  /**
   * Создание ключа для кеша
   */
  static createCacheKey(options) {
    return JSON.stringify({
      userId: options.userId,
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      type: options.type,
      limit: options.limit
    });
  }

  /**
   * Очистка кеша
   */
  static clearCache() {
    activityCache.clear();
  }

  static async getActivity(options = {}) {
    const {
      userId = null,
      dateFrom = null,
      dateTo = null,
      type = null,
      limit = 1000,
      useCache = true
    } = options;

    // Создаем ключ для кеша
    const cacheKey = this.createCacheKey({ userId, dateFrom, dateTo, type, limit });

    // Проверяем кеш
    if (useCache && activityCache.has(cacheKey)) {
      const cached = activityCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      } else {
        // Удаляем устаревший кеш
        activityCache.delete(cacheKey);
      }
    }

    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    if (type) params.append('type', type);
    if (limit) params.append('limit', limit);

    try {
      const apiUrl = getApiUrl('/api/user-activity-get.php');
      const response = await fetch(`${apiUrl}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        let data = result.data || [];

        // Валидируем и очищаем данные
        data = this.validateAndCleanActivityData(data);

        // Сохраняем в кеш
        if (useCache) {
          activityCache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
        }

        return data;
      } else {
        throw new Error(result.error || 'Failed to get activity');
      }
    } catch (error) {
      console.error('[UserActivityService] Error getting activity:', error);
      throw error;
    }
  }
  
  /**
   * Получение статистики активности
   * 
   * @param {object} options - Опции запроса
   * @returns {Promise<object>} Статистика активности
   */
  static async getActivityStats(options = {}) {
    const activity = await this.getActivity(options);
    
    const stats = {
      total_entries: activity.length,
      total_app_entries: 0,
      total_page_visits: 0,
      unique_users: new Set(),
      pages_visited: {},
      activity_by_date: {},
      activity_by_hour: {}
    };
    
    activity.forEach(entry => {
      if (entry.type === 'app_entry') {
        stats.total_app_entries++;
        stats.unique_users.add(entry.user_id);
      } else if (entry.type === 'page_visit') {
        stats.total_page_visits++;
        
        // Подсчёт посещений страниц
        const page = entry.route_title || entry.route_path || entry.route_name || 'unknown';
        stats.pages_visited[page] = (stats.pages_visited[page] || 0) + 1;
      }
      
      // Группировка по дате
      if (entry.timestamp) {
        const date = new Date(entry.timestamp).toISOString().split('T')[0];
        stats.activity_by_date[date] = (stats.activity_by_date[date] || 0) + 1;
        
        // Группировка по часу
        const hour = new Date(entry.timestamp).getHours();
        stats.activity_by_hour[hour] = (stats.activity_by_hour[hour] || 0) + 1;
      }
    });
    
    stats.unique_users_count = stats.unique_users.size;
    stats.unique_users = Array.from(stats.unique_users);
    
    return stats;
  }
  
  /**
   * Получение активности конкретного пользователя
   *
   * @param {number} userId - ID пользователя
   * @param {object} options - Дополнительные опции
   * @returns {Promise<Array>} Массив записей активности пользователя
   */
  static async getUserActivity(userId, options = {}) {
    return await this.getActivity({
      ...options,
      userId: userId
    });
  }

  /**
   * Получение метрик для дашборда
   *
   * @param {object} filters - Фильтры для данных
   * @returns {Promise<object>} Метрики дашборда с трендами
   */
  static async getDashboardMetrics(filters = {}) {
    try {
      // Получаем данные активности
      const activity = await this.getActivity({
        ...filters,
        limit: 10000 // Большой лимит для точных расчётов
      });

      // Получаем данные за предыдущий период для сравнения
      const previousFilters = this.getPreviousPeriodFilters(filters);
      const previousActivity = await this.getActivity({
        ...previousFilters,
        limit: 10000
      });

      // Рассчитываем метрики с помощью ActivityAnalyticsService
      return ActivityAnalyticsService.calculateDashboardMetrics(activity, previousActivity);
    } catch (error) {
      console.error('[UserActivityService] Error getting dashboard metrics:', error);
      throw error;
    }
  }

  /**
   * Получение профиля пользователя с аналитикой
   *
   * @param {number} userId - ID пользователя
   * @param {object} filters - Фильтры
   * @returns {Promise<object>} Полный профиль пользователя с аналитикой
   */
  static async getUserProfileAnalytics(userId, filters = {}) {
    try {
      // Получаем данные пользователя (имитация, в реальности через Bitrix24 API)
      const userInfo = await this.getUserInfo(userId);

      // Получаем активность пользователя
      const userActivity = await this.getUserActivity(userId, filters);

      // Рассчитываем аналитику
      const analytics = ActivityAnalyticsService.calculateUserStats(userActivity);
      const sessions = ActivityAnalyticsService.analyzeUserSessions(userActivity);

      return {
        user: userInfo,
        activity: userActivity,
        analytics,
        sessions
      };
    } catch (error) {
      console.error('[UserActivityService] Error getting user profile analytics:', error);
      throw error;
    }
  }

  /**
   * Получение информации о пользователе (заглушка для Bitrix24 API)
   *
   * @param {number} userId - ID пользователя
   * @returns {Promise<object>} Информация о пользователе
   */
  static async getUserInfo(userId) {
    // В реальности здесь был бы вызов Bitrix24 API
    // Для демонстрации возвращаем mock данные
    return {
      id: userId,
      name: `Пользователь ${userId}`,
      email: `user${userId}@example.com`,
      departments: ['Битрикс24 отдел'],
      first_visit: null, // Будет рассчитано из активности
      last_visit: null   // Будет рассчитано из активности
    };
  }

  /**
   * Получение фильтров для предыдущего периода
   *
   * @param {object} currentFilters - Текущие фильтры
   * @returns {object} Фильтры для предыдущего периода
   */
  static getPreviousPeriodFilters(currentFilters) {
    const filters = { ...currentFilters };

    // Определяем период на основе текущих фильтров
    if (filters.dateFrom && filters.dateTo) {
      const fromDate = new Date(filters.dateFrom);
      const toDate = new Date(filters.dateTo);
      const periodLength = toDate - fromDate;

      // Сдвигаем период назад
      const previousFrom = new Date(fromDate.getTime() - periodLength);
      const previousTo = new Date(fromDate.getTime() - 1); // До начала текущего периода

      filters.dateFrom = previousFrom.toISOString().split('T')[0];
      filters.dateTo = previousTo.toISOString().split('T')[0];
    } else {
      // По умолчанию - предыдущая неделя
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      filters.dateFrom = twoWeeksAgo.toISOString().split('T')[0];
      filters.dateTo = weekAgo.toISOString().split('T')[0];
    }

    return filters;
  }

  /**
   * Экспорт данных активности
   *
   * @param {Array} data - Данные для экспорта
   * @param {string} format - Формат экспорта ('csv', 'json')
   * @returns {string} Данные в указанном формате
   */
  static exportData(data, format = 'json') {
    switch (format) {
      case 'csv':
        return this.exportToCSV(data);
      case 'json':
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Экспорт в CSV формат
   *
   * @param {Array} data - Данные для экспорта
   * @returns {string} CSV строка
   */
  static exportToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = [
      'timestamp',
      'user_id',
      'user_name',
      'type',
      'route_path',
      'route_title',
      'user_agent'
    ];

    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header] || '';
        // Экранируем кавычки и переносы строк
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(','))
    ];

    return csvRows.join('\n');
  }
}

