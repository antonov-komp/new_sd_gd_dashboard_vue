/**
 * Composable для группировки и агрегации логов вебхуков
 * 
 * Расположение: vue-app/src/composables/useLogsGrouping.js
 * 
 * Поддерживает группировку по различным критериям и агрегацию данных
 */

import { computed } from 'vue';
import { groupLogsByDate } from '@/utils/webhook-component-helpers.js';
import { isValidWebhookLogEntry } from '@/types/webhook-logs.js';

/**
 * Composable для группировки логов
 * 
 * @param {import('vue').Ref<Array>|Array} logs Массив логов
 * @param {Object} options Опции
 * @param {string} options.groupBy Критерий группировки (date, category, event)
 * @returns {Object} API для группировки
 */
export function useLogsGrouping(logs, options = {}) {
  const { groupBy = 'date' } = options;

  // Получение реактивного массива логов
  const logsRef = logs && typeof logs === 'object' && 'value' in logs 
    ? logs 
    : { value: logs };

  // Вычисляемые свойства
  const groupedLogs = computed(() => {
    if (!Array.isArray(logsRef.value) || logsRef.value.length === 0) {
      return {};
    }

    const validLogs = logsRef.value.filter(log => isValidWebhookLogEntry(log));

    switch (groupBy) {
      case 'date':
        return groupLogsByDate(validLogs);
      
      case 'category':
        return groupByCategory(validLogs);
      
      case 'event':
        return groupByEvent(validLogs);
      
      default:
        return { 'Все': validLogs };
    }
  });

  const statistics = computed(() => {
    if (!Array.isArray(logsRef.value) || logsRef.value.length === 0) {
      return {
        total: 0,
        byCategory: {},
        byEvent: {},
        byDate: {}
      };
    }

    const validLogs = logsRef.value.filter(log => isValidWebhookLogEntry(log));

    const stats = {
      total: validLogs.length,
      byCategory: {},
      byEvent: {},
      byDate: {}
    };

    validLogs.forEach(log => {
      // По категориям
      if (!stats.byCategory[log.category]) {
        stats.byCategory[log.category] = 0;
      }
      stats.byCategory[log.category]++;

      // По типам событий
      if (!stats.byEvent[log.event]) {
        stats.byEvent[log.event] = 0;
      }
      stats.byEvent[log.event]++;

      // По датам
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      if (!stats.byDate[date]) {
        stats.byDate[date] = 0;
      }
      stats.byDate[date]++;
    });

    return stats;
  });

  // Группировка по категориям
  const groupByCategory = (logs) => {
    const grouped = {};
    
    logs.forEach(log => {
      const category = log.category || 'unknown';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(log);
    });
    
    return grouped;
  };

  // Группировка по типам событий
  const groupByEvent = (logs) => {
    const grouped = {};
    
    logs.forEach(log => {
      const event = log.event || 'unknown';
      if (!grouped[event]) {
        grouped[event] = [];
      }
      grouped[event].push(log);
    });
    
    return grouped;
  };

  return {
    groupedLogs,
    statistics
  };
}





