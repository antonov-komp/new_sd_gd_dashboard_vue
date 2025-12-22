/**
 * Утилиты для экспорта данных логов вебхуков
 * 
 * Поддерживаемые форматы: CSV, JSON
 * Обработка больших объёмов данных через chunking
 */

/**
 * Экранирование специальных символов для CSV
 * 
 * @param {string} value Значение для экранирования
 * @returns {string} Экранированное значение
 */
function escapeCSVValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // Экранирование кавычек (удвоение)
  const escaped = stringValue.replace(/"/g, '""');
  
  // Если значение содержит запятые, переносы строк или кавычки - оборачиваем в кавычки
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${escaped}"`;
  }
  
  return escaped;
}

/**
 * Конвертация объекта в строку для CSV
 * 
 * @param {any} value Значение для конвертации
 * @returns {string} Строковое представление
 */
function valueToString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
}

/**
 * Экспорт данных в CSV формат
 * 
 * @param {Array} data Массив объектов для экспорта
 * @param {string} filename Имя файла
 * @param {Object} options Опции экспорта
 * @param {Array} options.columns Массив колонок для экспорта (по умолчанию все)
 * @param {Function} options.onProgress Callback для отслеживания прогресса
 * @returns {Promise<void>}
 */
export function exportToCSV(data, filename = 'webhook-logs.csv', options = {}) {
  return new Promise((resolve, reject) => {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Нет данных для экспорта');
      }

      const {
        columns = null,
        onProgress = null
      } = options;

      // Определение колонок для экспорта
      const exportColumns = columns || Object.keys(data[0]);
      
      // Заголовки CSV
      const headers = exportColumns.map(col => escapeCSVValue(col));
      const csvRows = [headers.join(',')];

      // Конвертация данных
      const totalRows = data.length;
      const chunkSize = 1000; // Обработка по 1000 записей за раз
      
      for (let i = 0; i < totalRows; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        
        chunk.forEach(log => {
          const row = exportColumns.map(col => {
            const value = log[col];
            return escapeCSVValue(valueToString(value));
          });
          csvRows.push(row.join(','));
        });

        // Отчёт о прогрессе
        if (onProgress) {
          const progress = Math.min(100, Math.round(((i + chunk.length) / totalRows) * 100));
          onProgress(progress);
        }
      }

      // Создание BOM для корректного отображения кириллицы в Excel
      const csvContent = '\ufeff' + csvRows.join('\n');
      
      // Создание Blob и скачивание
      const blob = new Blob([csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      downloadBlob(blob, filename);
      
      if (onProgress) {
        onProgress(100);
      }
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Экспорт данных в JSON формат
 * 
 * @param {Array} data Массив объектов для экспорта
 * @param {string} filename Имя файла
 * @param {Object} options Опции экспорта
 * @param {boolean} options.pretty Форматированный JSON (по умолчанию true)
 * @param {Function} options.onProgress Callback для отслеживания прогресса
 * @returns {Promise<void>}
 */
export function exportToJSON(data, filename = 'webhook-logs.json', options = {}) {
  return new Promise((resolve, reject) => {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Нет данных для экспорта');
      }

      const {
        pretty = true,
        onProgress = null
      } = options;

      // Форматирование JSON
      const jsonContent = pretty 
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);

      if (onProgress) {
        onProgress(50);
      }

      // Создание Blob и скачивание
      const blob = new Blob([jsonContent], { 
        type: 'application/json;charset=utf-8;' 
      });
      
      downloadBlob(blob, filename);

      if (onProgress) {
        onProgress(100);
      }

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Универсальная функция скачивания Blob
 * 
 * @param {Blob} blob Blob для скачивания
 * @param {string} filename Имя файла
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  
  // Очистка
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Генерация имени файла с метаданными
 * 
 * @param {string} format Формат файла (csv/json)
 * @param {Object} filters Применённые фильтры
 * @param {number} count Количество записей
 * @returns {string} Имя файла
 */
export function generateExportFilename(format, filters = {}, count = 0) {
  const timestamp = new Date().toISOString().split('T')[0];
  const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  
  let filename = `webhook-logs_${timestamp}_${time}`;
  
  // Добавление информации о фильтрах
  const filterParts = [];
  if (filters.category) {
    filterParts.push(`cat-${filters.category}`);
  }
  if (filters.event) {
    filterParts.push(`evt-${filters.event.substring(0, 10)}`);
  }
  if (filters.dateFrom) {
    filterParts.push(`from-${filters.dateFrom}`);
  }
  if (filters.dateTo) {
    filterParts.push(`to-${filters.dateTo}`);
  }
  
  if (filterParts.length > 0) {
    filename += `_${filterParts.join('-')}`;
  }
  
  // Добавление количества записей
  if (count > 0) {
    filename += `_${count}records`;
  }
  
  return `${filename}.${format}`;
}

/**
 * Валидация данных перед экспортом
 * 
 * @param {Array} data Данные для проверки
 * @returns {Object} Результат валидации {valid: boolean, errors: Array, estimatedSize: number}
 */
export function validateExportData(data) {
  const errors = [];
  
  if (!Array.isArray(data)) {
    errors.push('Данные должны быть массивом');
    return { valid: false, errors, estimatedSize: 0 };
  }
  
  if (data.length === 0) {
    errors.push('Нет данных для экспорта');
    return { valid: false, errors, estimatedSize: 0 };
  }
  
  // Проверка размера данных (предупреждение при больших объёмах)
  const estimatedSize = JSON.stringify(data).length;
  const maxSize = 50 * 1024 * 1024; // 50 MB
  
  if (estimatedSize > maxSize) {
    errors.push(`Большой объём данных (${Math.round(estimatedSize / 1024 / 1024)} MB). Экспорт может занять время.`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    estimatedSize
  };
}

