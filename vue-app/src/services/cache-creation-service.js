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

/**
 * Получение номера недели по ISO 8601
 * @param {Date} date Дата
 * @returns {number} Номер недели
 */
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

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
    // TASK-076: Второй вариант - универсальный кеш для weeks режима
    if (moduleId.includes('graph-admission-closure')) {
      const mode = moduleId.includes('weeks') ? 'weeks' : 'months';

      if (mode === 'weeks') {
        // Для weeks режима используем универсальные параметры, совместимые с интерфейсом
        // Получаем границы текущей недели
        const now = new Date();
        const tz = 'UTC';
        const isoYear = now.getUTCFullYear();
        const isoWeek = getISOWeek(now);

        // Вычисляем начало и конец недели
        const weekStart = new Date(isoYear, 0, 1 + (isoWeek - 1) * 7);
        const dayOfWeek = weekStart.getUTCDay();
        const diff = weekStart.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        weekStart.setUTCDate(diff);
        weekStart.setUTCHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
        weekEnd.setUTCHours(23, 59, 59, 999);

        return {
          product: '1C',
          periodMode: 'weeks',
          weekStartUtc: weekStart.toISOString(),
          weekEndUtc: weekEnd.toISOString(),
          includeTickets: true,                    // Как в интерфейсе
          includeNewTicketsByStages: true,         // Как в интерфейсе
          includeCarryoverTickets: false,          // По умолчанию
          includeCarryoverTicketsByDuration: true  // Как в интерфейсе
        };
      } else {
        // Для months режима используем стандартные параметры
        return {
          product: '1C',
          periodMode: 'months',
          includeTickets: true, // Для months модуль использует true
          includeNewTicketsByStages: false,
          includeCarryoverTickets: true, // Для months по умолчанию true
          includeCarryoverTicketsByDuration: false
        };
      }
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

