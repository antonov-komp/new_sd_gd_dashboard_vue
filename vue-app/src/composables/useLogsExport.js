/**
 * Composable для экспорта логов вебхуков
 * 
 * Расположение: vue-app/src/composables/useLogsExport.js
 * 
 * Поддерживает экспорт в CSV, JSON, Excel форматы
 */

import { ref } from 'vue';
import { 
  exportToCSV,
  exportToJSON
} from '@/utils/export-utils.js';
import { isValidWebhookLogEntry } from '@/types/webhook-logs.js';

/**
 * Composable для экспорта логов
 * 
 * @param {import('vue').Ref<Array>|Array} logs Массив логов для экспорта
 * @returns {Object} API для экспорта
 */
export function useLogsExport(logs) {
  const exporting = ref(false);
  const exportError = ref(null);

  // Получение реактивного массива логов
  const logsRef = logs && typeof logs === 'object' && 'value' in logs 
    ? logs 
    : { value: logs };

  /**
   * Экспорт в CSV
   * 
   * @param {string} filename Имя файла
   * @param {Object} options Опции экспорта
   */
  const exportCSV = async (filename = 'webhook-logs.csv', options = {}) => {
    if (exporting.value) {
      return;
    }

    try {
      exporting.value = true;
      exportError.value = null;

      // Валидация логов
      const validLogs = logsRef.value.filter(log => isValidWebhookLogEntry(log));
      
      if (validLogs.length === 0) {
        throw new Error('No valid logs to export');
      }

      // Экспорт
      await exportToCSV(validLogs, filename, options);

    } catch (error) {
      exportError.value = error.message;
      console.error('[useLogsExport] CSV export error:', error);
      throw error;
    } finally {
      exporting.value = false;
    }
  };

  /**
   * Экспорт в JSON
   * 
   * @param {string} filename Имя файла
   * @param {Object} options Опции экспорта
   */
  const exportJSON = async (filename = 'webhook-logs.json', options = {}) => {
    if (exporting.value) {
      return;
    }

    try {
      exporting.value = true;
      exportError.value = null;

      // Валидация логов
      const validLogs = logsRef.value.filter(log => isValidWebhookLogEntry(log));
      
      if (validLogs.length === 0) {
        throw new Error('No valid logs to export');
      }

      // Экспорт
      await exportToJSON(validLogs, filename, options);

    } catch (error) {
      exportError.value = error.message;
      console.error('[useLogsExport] JSON export error:', error);
      throw error;
    } finally {
      exporting.value = false;
    }
  };

  /**
   * Экспорт в Excel (через CSV как fallback)
   * 
   * @param {string} filename Имя файла
   * @param {Object} options Опции экспорта
   */
  const exportExcel = async (filename = 'webhook-logs.xlsx', options = {}) => {
    if (exporting.value) {
      return;
    }

    try {
      exporting.value = true;
      exportError.value = null;

      // Валидация логов
      const validLogs = logsRef.value.filter(log => isValidWebhookLogEntry(log));
      
      if (validLogs.length === 0) {
        throw new Error('No valid logs to export');
      }

      // Проверка наличия библиотеки для работы с Excel
      // Если библиотека не доступна, используем CSV как fallback
      if (typeof XLSX !== 'undefined') {
        // Использование библиотеки XLSX
        const worksheet = XLSX.utils.json_to_sheet(
          validLogs.map(log => ({
            'Дата и время': log.timestamp,
            'Тип события': log.event,
            'Категория': log.category,
            'IP адрес': log.ip || '',
            'ID задачи': log.details?.task_id || log.details?.entity_id || '',
            'Название задачи': log.details?.task_title || log.details?.title || '',
            'Ответственный': log.details?.responsible_id || '',
            'Статус': log.details?.status_id || '',
            'Приоритет': log.details?.priority || '',
            'Дедлайн': log.details?.deadline || ''
          }))
        );
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Логи вебхуков');
        
        XLSX.writeFile(workbook, filename);
      } else {
        // Fallback на CSV
        console.warn('[useLogsExport] XLSX library not available, using CSV');
        await exportCSV(filename.replace('.xlsx', '.csv'), options);
      }

    } catch (error) {
      exportError.value = error.message;
      console.error('[useLogsExport] Excel export error:', error);
      // Fallback на CSV
      try {
        await exportCSV(filename.replace('.xlsx', '.csv'), options);
      } catch (csvError) {
        throw error; // Выбрасываем исходную ошибку
      }
    } finally {
      exporting.value = false;
    }
  };

  return {
    exporting,
    exportError,
    exportCSV,
    exportJSON,
    exportExcel
  };
}







