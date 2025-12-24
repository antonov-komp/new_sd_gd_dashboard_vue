/**
 * Сервис для управления кешем модулей
 * 
 * Использует backend API для получения статуса и очистки кеша
 * API endpoints:
 * - /api/admin/cache-status.php - получение статуса
 * - /api/admin/cache-clear.php - очистка кеша
 * - /api/admin/cache-stats.php - статистика кеша
 */

import { getApiUrl } from '@/utils/path-utils.js';

export class CacheManagementService {
  /**
   * Получение статуса кеша всех модулей
   * 
   * @returns {Promise<Array>} Массив модулей с информацией о кеше
   */
  static async getCacheStatus() {
    try {
      const apiUrl = getApiUrl('/api/admin/cache-status.php');
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return result.modules || [];
      } else {
        throw new Error(result.error || 'Failed to get cache status');
      }
    } catch (error) {
      console.error('[CacheManagementService] Error getting cache status:', error);
      throw error;
    }
  }
  
  /**
   * Очистка кеша модуля
   * 
   * @param {string} moduleId - ID модуля или 'all' для очистки всего кеша
   * @returns {Promise<boolean>} true если успешно
   */
  static async clearCache(moduleId) {
    try {
      const apiUrl = getApiUrl('/api/admin/cache-clear.php');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          module_id: moduleId,
          confirm: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return true;
      } else {
        throw new Error(result.error || 'Failed to clear cache');
      }
    } catch (error) {
      console.error('[CacheManagementService] Error clearing cache:', error);
      throw error;
    }
  }
  
  /**
   * Получение статистики кеша
   * 
   * @returns {Promise<object>} Статистика кеша
   */
  static async getCacheStats() {
    try {
      const apiUrl = getApiUrl('/api/admin/cache-stats.php');
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return result.stats || {};
      } else {
        throw new Error(result.error || 'Failed to get cache stats');
      }
    } catch (error) {
      console.error('[CacheManagementService] Error getting cache stats:', error);
      throw error;
    }
  }
  
  /**
   * Форматирование размера кеша в читаемый формат
   * 
   * @param {number} bytes - Размер в байтах
   * @returns {string} Отформатированный размер
   */
  static formatCacheSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  /**
   * Форматирование TTL в читаемый формат
   * 
   * @param {number} seconds - TTL в секундах
   * @returns {string} Отформатированный TTL
   */
  static formatTTL(seconds) {
    if (seconds < 60) {
      return `${seconds} сек`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} мин`;
    } else {
      return `${Math.floor(seconds / 3600)} ч`;
    }
  }
}

