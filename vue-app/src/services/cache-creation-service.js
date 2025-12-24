/**
 * Сервис для создания кешей модулей
 * 
 * TASK-076: Ручное создание кешей с уведомлениями
 * 
 * Использует backend API для создания кешей
 * API endpoints:
 * - /api/admin/cache-create.php - создание кеша
 * - /api/admin/cache-create-status.php - статус создания
 */

import { getApiUrl } from '@/utils/path-utils.js';

export class CacheCreationService {
  /**
   * Создание кеша для модуля
   * 
   * @param {string} moduleId - ID модуля
   * @param {string|null} mode - Режим кеша (если модуль поддерживает режимы)
   * @param {object} params - Параметры для создания кеша
   * @returns {Promise<object>} Результат создания кеша
   */
  static async createCache(moduleId, mode = null, params = {}) {
    try {
      const apiUrl = getApiUrl('/api/admin/cache-create.php');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          module_id: moduleId,
          mode: mode,
          params: params
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return result;
      } else {
        throw new Error(result.error || 'Failed to create cache');
      }
    } catch (error) {
      console.error('[CacheCreationService] Error creating cache:', error);
      throw error;
    }
  }
  
  /**
   * Получение статуса создания кеша
   * 
   * @param {string} taskId - ID задачи создания кеша
   * @returns {Promise<object>} Статус создания кеша
   */
  static async getCreationStatus(taskId) {
    try {
      const apiUrl = getApiUrl(`/api/admin/cache-create-status.php?task_id=${taskId}`);
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
        return result;
      } else {
        throw new Error(result.error || 'Failed to get creation status');
      }
    } catch (error) {
      console.error('[CacheCreationService] Error getting creation status:', error);
      throw error;
    }
  }
  
  /**
   * Получение параметров по умолчанию для модуля
   * 
   * @param {string} moduleId - ID модуля
   * @returns {object} Параметры по умолчанию
   */
  static getDefaultParams(moduleId) {
    // График приёма/закрытий 1С
    // TASK-076: Исправление для совместимости с реальным использованием модуля
    if (moduleId.includes('graph-admission-closure')) {
      const mode = moduleId.includes('weeks') ? 'weeks' : 'months';
      return {
        product: '1C',
        periodMode: mode,
        // Для months режима модуль использует includeTickets: true (см. GraphAdmissionClosureMonthsDashboard.vue)
        includeTickets: mode === 'months' ? true : false,
        includeNewTicketsByStages: false,
        includeCarryoverTickets: mode === 'months' ? true : false,
        includeCarryoverTicketsByDuration: false
      };
    }
    
    // Трудозатраты на Тикеты сектора 1С
    if (moduleId.includes('time-tracking')) {
      const mode = moduleId.includes('detailed') ? 'detailed' : 
                  moduleId.includes('summary') ? 'summary' : 'default';
      return {
        product: '1C',
        includeTaskDetails: mode === 'detailed',
        summary: mode === 'summary'
      };
    }
    
    return {};
  }
}

