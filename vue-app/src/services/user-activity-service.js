/**
 * Сервис для работы с активностью пользователей
 * 
 * Использует backend API для получения данных об активности
 * API endpoint: /api/user-activity-get.php
 */

import { getApiUrl } from '@/utils/path-utils.js';

export class UserActivityService {
  
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
  static async getActivity(options = {}) {
    const {
      userId = null,
      dateFrom = null,
      dateTo = null,
      type = null,
      limit = 1000
    } = options;
    
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
        return result.data || [];
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
}

