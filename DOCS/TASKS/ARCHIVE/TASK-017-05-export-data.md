# TASK-017-05: Добавление экспорта данных

**Дата создания:** 2025-12-07 05:25 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-017](./TASK-017-webhook-logs-ui-implementation-plan.md)

---

## 📋 Описание

Реализовать экспорт данных логов в CSV и JSON форматы, добавить экспорт с применёнными фильтрами, реализовать экспорт выбранных записей, добавить удобный интерфейс для экспорта.

---

## 🎯 Контекст

Этап 5 из глобального плана TASK-017. Пользователям нужна возможность экспортировать данные для анализа в других инструментах.

---

## 📁 Модули и компоненты

- `vue-app/src/utils/export-utils.js` — утилиты для экспорта
- `vue-app/src/components/webhooks/WebhookLogsExport.vue` — компонент экспорта
- `vue-app/src/pages/WebhookLogsPage.vue` — интеграция экспорта

---

## 🔗 Зависимости

**От других задач:**
- **TASK-017-02** — базовые компоненты должны работать
- **TASK-017-03** — фильтры должны работать

---

## 📝 Ступенчатые подзадачи

### 1. Реализация экспорта в CSV

1.1. Создать функцию конвертации данных в CSV
1.2. Обработать специальные символы (кавычки, запятые)
1.3. Добавить заголовки колонок
1.4. Реализовать скачивание файла

### 2. Реализация экспорта в JSON

2.1. Создать функцию форматирования JSON
2.2. Добавить опцию "красивого" форматирования
2.3. Реализовать скачивание файла

### 3. Экспорт с фильтрами

3.1. Применить текущие фильтры к данным перед экспортом
3.2. Указать применённые фильтры в имени файла или метаданных

### 4. Экспорт выбранных записей

4.1. Добавить возможность выбора записей (чекбоксы)
4.2. Реализовать экспорт только выбранных записей
4.3. Добавить кнопку "Выбрать все"

### 5. UI для экспорта

5.1. Добавить кнопку "Экспорт" в интерфейс
5.2. Создать модальное окно выбора формата
5.3. Добавить индикатор прогресса экспорта

---

## ⚙️ Технические требования

### 1. Утилиты экспорта (`vue-app/src/utils/export-utils.js`)

Полная реализация утилит для экспорта данных:

```javascript
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
  if (filters.date) {
    filterParts.push(`date-${filters.date}`);
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
 * @returns {Object} Результат валидации {valid: boolean, errors: Array}
 */
export function validateExportData(data) {
  const errors = [];
  
  if (!Array.isArray(data)) {
    errors.push('Данные должны быть массивом');
    return { valid: false, errors };
  }
  
  if (data.length === 0) {
    errors.push('Нет данных для экспорта');
    return { valid: false, errors };
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
```

### 2. Компонент экспорта (`vue-app/src/components/webhooks/WebhookLogsExport.vue`)

Полная реализация компонента с модальным окном, прогресс-баром и валидацией:

```vue
<template>
  <div class="webhook-logs-export">
    <!-- Кнопка экспорта -->
    <button 
      @click="openExportModal" 
      class="btn-export"
      :disabled="!canExport"
      :title="!canExport ? 'Нет данных для экспорта' : 'Экспорт данных'"
    >
      <span class="btn-icon">📥</span>
      <span class="btn-text">Экспорт</span>
      <span v-if="selectedCount > 0" class="selected-badge">
        {{ selectedCount }}
      </span>
    </button>

    <!-- Overlay для модального окна -->
    <Transition name="modal">
      <div v-if="showExportModal" class="export-modal-overlay" @click="closeExportModal">
        <div class="export-modal" @click.stop>
          <div class="export-modal-header">
            <h3>Экспорт данных</h3>
            <button @click="closeExportModal" class="btn-close">✕</button>
          </div>

          <div class="export-modal-body">
            <!-- Формат экспорта -->
            <div class="export-section">
              <h4>Формат файла</h4>
              <div class="radio-group">
                <label class="radio-option" :class="{ active: exportFormat === 'csv' }">
                  <input 
                    type="radio" 
                    v-model="exportFormat" 
                    value="csv"
                    class="radio-input"
                  />
                  <span class="radio-label">
                    <strong>CSV</strong>
                    <small>Для Excel, LibreOffice</small>
                  </span>
                </label>
                <label class="radio-option" :class="{ active: exportFormat === 'json' }">
                  <input 
                    type="radio" 
                    v-model="exportFormat" 
                    value="json"
                    class="radio-input"
                  />
                  <span class="radio-label">
                    <strong>JSON</strong>
                    <small>Для разработчиков, API</small>
                  </span>
                </label>
              </div>
            </div>

            <!-- Область экспорта -->
            <div class="export-section">
              <h4>Что экспортировать</h4>
              <div class="radio-group">
                <label 
                  class="radio-option" 
                  :class="{ active: exportScope === 'all', disabled: !hasAllLogs }"
                >
                  <input 
                    type="radio" 
                    v-model="exportScope" 
                    value="all"
                    :disabled="!hasAllLogs"
                    class="radio-input"
                  />
                  <span class="radio-label">
                    <strong>Все записи</strong>
                    <small v-if="hasFilters">С применёнными фильтрами ({{ totalCount }} записей)</small>
                    <small v-else>Всего: {{ totalCount }} записей</small>
                  </span>
                </label>
                <label 
                  class="radio-option" 
                  :class="{ active: exportScope === 'selected', disabled: selectedCount === 0 }"
                >
                  <input 
                    type="radio" 
                    v-model="exportScope" 
                    value="selected"
                    :disabled="selectedCount === 0"
                    class="radio-input"
                  />
                  <span class="radio-label">
                    <strong>Выбранные записи</strong>
                    <small>{{ selectedCount }} записей выбрано</small>
                  </span>
                </label>
              </div>
            </div>

            <!-- Дополнительные опции (только для JSON) -->
            <div v-if="exportFormat === 'json'" class="export-section">
              <h4>Опции JSON</h4>
              <label class="checkbox-option">
                <input 
                  type="checkbox" 
                  v-model="jsonPretty"
                  class="checkbox-input"
                />
                <span class="checkbox-label">Красивое форматирование (с отступами)</span>
              </label>
            </div>

            <!-- Информация о данных -->
            <div class="export-info">
              <div class="info-item">
                <span class="info-label">Записей к экспорту:</span>
                <span class="info-value">{{ exportCount }}</span>
              </div>
              <div v-if="estimatedSize" class="info-item">
                <span class="info-label">Примерный размер:</span>
                <span class="info-value">{{ formatSize(estimatedSize) }}</span>
              </div>
            </div>

            <!-- Предупреждения -->
            <div v-if="exportWarnings.length > 0" class="export-warnings">
              <div 
                v-for="(warning, index) in exportWarnings" 
                :key="index"
                class="warning-item"
              >
                ⚠️ {{ warning }}
              </div>
            </div>
          </div>

          <!-- Прогресс-бар -->
          <div v-if="exporting" class="export-progress">
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: `${exportProgress}%` }"
              ></div>
            </div>
            <div class="progress-text">
              Экспорт: {{ exportProgress }}%
            </div>
          </div>

          <!-- Действия -->
          <div class="export-modal-footer">
            <button 
              @click="handleExport" 
              :disabled="exporting || !canExport"
              class="btn-primary"
            >
              <span v-if="exporting">Экспорт...</span>
              <span v-else>Экспортировать</span>
            </button>
            <button 
              @click="closeExportModal" 
              :disabled="exporting"
              class="btn-secondary"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { 
  exportToCSV, 
  exportToJSON, 
  generateExportFilename,
  validateExportData 
} from '@/utils/export-utils.js';

export default {
  name: 'WebhookLogsExport',
  props: {
    logs: {
      type: Array,
      default: () => []
    },
    selectedLogs: {
      type: Array,
      default: () => []
    },
    filters: {
      type: Object,
      default: () => ({})
    },
    totalCount: {
      type: Number,
      default: 0
    }
  },
  emits: ['export-start', 'export-complete', 'export-error'],
  setup(props, { emit }) {
    const showExportModal = ref(false);
    const exportFormat = ref('csv');
    const exportScope = ref('all');
    const jsonPretty = ref(true);
    const exporting = ref(false);
    const exportProgress = ref(0);
    const exportWarnings = ref([]);
    const estimatedSize = ref(null);

    // Вычисляемые свойства
    const selectedCount = computed(() => props.selectedLogs.length);
    const hasAllLogs = computed(() => props.logs.length > 0 || props.totalCount > 0);
    const hasFilters = computed(() => {
      return props.filters.category || props.filters.event || props.filters.date;
    });

    const exportCount = computed(() => {
      if (exportScope.value === 'selected') {
        return selectedCount.value;
      }
      return props.logs.length || props.totalCount;
    });

    const canExport = computed(() => {
      if (exportScope.value === 'selected') {
        return selectedCount.value > 0;
      }
      return hasAllLogs.value;
    });

    // Открытие модального окна
    const openExportModal = () => {
      // Сброс состояния
      exportProgress.value = 0;
      exportWarnings.value = [];
      estimatedSize.value = null;
      
      // Автоматический выбор области экспорта
      if (selectedCount.value > 0) {
        exportScope.value = 'selected';
      } else {
        exportScope.value = 'all';
      }
      
      showExportModal.value = true;
      
      // Предварительная валидация
      validateExport();
    };

    // Закрытие модального окна
    const closeExportModal = () => {
      if (!exporting.value) {
        showExportModal.value = false;
      }
    };

    // Валидация данных
    const validateExport = () => {
      const dataToExport = getDataToExport();
      const validation = validateExportData(dataToExport);
      
      exportWarnings.value = validation.errors;
      estimatedSize.value = validation.estimatedSize;
    };

    // Получение данных для экспорта
    const getDataToExport = () => {
      return exportScope.value === 'selected' 
        ? props.selectedLogs 
        : props.logs;
    };

    // Обработка экспорта
    const handleExport = async () => {
      try {
        exporting.value = true;
        exportProgress.value = 0;
        
        const dataToExport = getDataToExport();
        
        if (dataToExport.length === 0) {
          throw new Error('Нет данных для экспорта');
        }

        emit('export-start', {
          format: exportFormat.value,
          scope: exportScope.value,
          count: dataToExport.length
        });

        // Генерация имени файла
        const filename = generateExportFilename(
          exportFormat.value,
          props.filters,
          dataToExport.length
        );

        // Callback для отслеживания прогресса
        const onProgress = (progress) => {
          exportProgress.value = progress;
        };

        // Экспорт в зависимости от формата
        if (exportFormat.value === 'csv') {
          await exportToCSV(dataToExport, filename, {
            onProgress
          });
        } else {
          await exportToJSON(dataToExport, filename, {
            pretty: jsonPretty.value,
            onProgress
          });
        }

        emit('export-complete', {
          format: exportFormat.value,
          filename,
          count: dataToExport.length
        });

        // Закрытие модального окна через небольшую задержку
        setTimeout(() => {
          exporting.value = false;
          showExportModal.value = false;
          exportProgress.value = 0;
        }, 500);

      } catch (error) {
        console.error('Ошибка экспорта:', error);
        emit('export-error', error);
        exporting.value = false;
        exportProgress.value = 0;
        
        alert(`Ошибка экспорта: ${error.message}`);
      }
    };

    // Форматирование размера файла
    const formatSize = (bytes) => {
      if (bytes < 1024) {
        return `${bytes} B`;
      } else if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(2)} KB`;
      } else {
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
      }
    };

    // Отслеживание изменений области экспорта для валидации
    watch([exportScope, () => props.logs, () => props.selectedLogs], () => {
      if (showExportModal.value) {
        validateExport();
      }
    });

    return {
      showExportModal,
      exportFormat,
      exportScope,
      jsonPretty,
      exporting,
      exportProgress,
      exportWarnings,
      estimatedSize,
      selectedCount,
      hasAllLogs,
      hasFilters,
      exportCount,
      canExport,
      openExportModal,
      closeExportModal,
      handleExport,
      formatSize
    };
  }
};
</script>

<style scoped>
.webhook-logs-export {
  position: relative;
}

.btn-export {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
  position: relative;
}

.btn-export:hover:not(:disabled) {
  background: #1976d2;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.btn-export:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-icon {
  font-size: 16px;
}

.selected-badge {
  background: rgba(255, 255, 255, 0.3);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

/* Модальное окно */
.export-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.export-modal {
  background: white;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.export-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.export-modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-close:hover {
  background: #f5f5f5;
}

.export-modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.export-section {
  margin-bottom: 24px;
}

.export-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.radio-option:hover:not(.disabled) {
  border-color: #2196F3;
  background: #f5f9ff;
}

.radio-option.active {
  border-color: #2196F3;
  background: #e3f2fd;
}

.radio-option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.radio-input {
  margin-right: 12px;
  margin-top: 2px;
}

.radio-label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.radio-label strong {
  font-size: 14px;
  color: #333;
}

.radio-label small {
  font-size: 12px;
  color: #666;
}

.checkbox-option {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.checkbox-option:hover {
  background: #f9f9f9;
}

.checkbox-input {
  margin-right: 12px;
}

.checkbox-label {
  font-size: 14px;
  color: #333;
}

.export-info {
  padding: 16px;
  background: #f9f9f9;
  border-radius: 6px;
  margin-top: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 14px;
  color: #666;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.export-warnings {
  margin-top: 16px;
  padding: 12px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 6px;
}

.warning-item {
  font-size: 13px;
  color: #856404;
  margin-bottom: 4px;
}

.warning-item:last-child {
  margin-bottom: 0;
}

.export-progress {
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: #2196F3;
  transition: width 0.3s;
  border-radius: 4px;
}

.progress-text {
  text-align: center;
  font-size: 13px;
  color: #666;
}

.export-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #eee;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #2196F3;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1976d2;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Анимации */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .export-modal {
    max-width: 100%;
    margin: 10px;
  }
}
</style>
```

### 3. Интеграция выбора записей в WebhookLogList

Необходимо добавить чекбоксы для выбора записей в компонент списка логов:

```vue
<!-- Обновление WebhookLogList.vue -->
<template>
  <div class="webhook-log-list">
    <!-- ... существующий код ... -->
    
    <!-- Таблица логов -->
    <div v-else-if="logs.length > 0" class="logs-table-container">
      <div class="table-header-actions">
        <label class="select-all-checkbox">
          <input 
            type="checkbox" 
            :checked="allSelected"
            :indeterminate="someSelected"
            @change="handleSelectAll"
          />
          <span>Выбрать все</span>
        </label>
        <span v-if="selectedCount > 0" class="selected-info">
          Выбрано: {{ selectedCount }}
        </span>
      </div>
      
      <table class="logs-table">
        <thead>
          <tr>
            <th style="width: 40px;">
              <input 
                type="checkbox" 
                :checked="allSelected"
                :indeterminate="someSelected"
                @change="handleSelectAll"
              />
            </th>
            <th>Дата и время</th>
            <!-- ... остальные заголовки ... -->
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="log in logs"
            :key="getLogId(log)"
            @click="handleLogClick(log)"
            class="log-row"
            :class="{ selected: isSelected(log) }"
          >
            <td @click.stop>
              <input 
                type="checkbox" 
                :checked="isSelected(log)"
                @change="handleSelectLog(log, $event.target.checked)"
              />
            </td>
            <td>{{ formatTimestamp(log.timestamp) }}</td>
            <!-- ... остальные ячейки ... -->
          </tr>
        </tbody>
      </table>
      
      <!-- ... пагинация ... -->
    </div>
  </div>
</template>

<script>
export default {
  name: 'WebhookLogList',
  props: {
    // ... существующие props ...
    selectedLogs: {
      type: Array,
      default: () => []
    }
  },
  emits: ['select-log', 'page-change', 'select-logs', 'select-all'],
  setup(props, { emit }) {
    // ... существующий код ...
    
    const selectedCount = computed(() => props.selectedLogs.length);
    const allSelected = computed(() => {
      return props.logs.length > 0 && 
             props.logs.every(log => isSelected(log));
    });
    const someSelected = computed(() => {
      return props.logs.some(log => isSelected(log)) && !allSelected.value;
    });
    
    const isSelected = (log) => {
      return props.selectedLogs.some(selected => 
        getLogId(selected) === getLogId(log)
      );
    };
    
    const handleSelectLog = (log, checked) => {
      if (checked) {
        emit('select-logs', [...props.selectedLogs, log]);
      } else {
        emit('select-logs', props.selectedLogs.filter(selected => 
          getLogId(selected) !== getLogId(log)
        ));
      }
    };
    
    const handleSelectAll = (event) => {
      const checked = event.target.checked;
      if (checked) {
        emit('select-all', props.logs);
      } else {
        emit('select-logs', []);
      }
    };
    
    return {
      // ... существующие возвраты ...
      selectedCount,
      allSelected,
      someSelected,
      isSelected,
      handleSelectLog,
      handleSelectAll
    };
  }
};
</script>

<style scoped>
/* ... существующие стили ... */

.table-header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f9f9f9;
  border-bottom: 1px solid #eee;
}

.select-all-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.selected-info {
  font-size: 14px;
  color: #2196F3;
  font-weight: 500;
}

.log-row.selected {
  background: #e3f2fd;
}

.log-row.selected:hover {
  background: #bbdefb;
}
</style>
```

### 4. Интеграция компонента экспорта в WebhookLogsPage

Добавление компонента экспорта и обработка выбранных записей:

```vue
<!-- Обновление WebhookLogsPage.vue -->
<template>
  <div class="webhook-logs-page">
    <div class="page-header">
      <h1>Логи вебхуков Bitrix24</h1>
      <WebhookLogsExport
        :logs="logs"
        :selected-logs="selectedLogs"
        :filters="filters"
        :total-count="pagination.total"
        @export-start="handleExportStart"
        @export-complete="handleExportComplete"
        @export-error="handleExportError"
      />
    </div>

    <!-- ... существующий код ... -->

    <!-- Список логов -->
    <WebhookLogList
      :logs="logs"
      :loading="loading"
      :error="error"
      :pagination="pagination"
      :selected-logs="selectedLogs"
      @select-log="handleLogSelect"
      @page-change="handlePageChange"
      @select-logs="handleSelectLogs"
      @select-all="handleSelectAll"
    />

    <!-- ... остальной код ... -->
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
// ... существующие импорты ...
import WebhookLogsExport from '@/components/webhooks/WebhookLogsExport.vue';

export default {
  name: 'WebhookLogsPage',
  components: {
    // ... существующие компоненты ...
    WebhookLogsExport
  },
  setup() {
    // ... существующий код ...
    const selectedLogs = ref([]);

    // Обработка выбора записей
    const handleSelectLogs = (logs) => {
      selectedLogs.value = logs;
    };

    const handleSelectAll = (logs) => {
      selectedLogs.value = [...logs];
    };

    // Обработка экспорта
    const handleExportStart = (info) => {
      console.log('Экспорт начат:', info);
      // Можно показать уведомление
    };

    const handleExportComplete = (info) => {
      console.log('Экспорт завершён:', info);
      // Можно показать уведомление об успехе
      // Очистка выбранных записей после экспорта (опционально)
      if (info.scope === 'selected') {
        selectedLogs.value = [];
      }
    };

    const handleExportError = (error) => {
      console.error('Ошибка экспорта:', error);
      // Можно показать уведомление об ошибке
    };

    // Очистка выбранных записей при изменении фильтров
    watch(() => filters.value, () => {
      selectedLogs.value = [];
    });

    return {
      // ... существующие возвраты ...
      selectedLogs,
      handleSelectLogs,
      handleSelectAll,
      handleExportStart,
      handleExportComplete,
      handleExportError
    };
  }
};
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
</style>
```

### 5. Обработка больших объёмов данных

Для экспорта больших объёмов данных (более 10,000 записей) рекомендуется использовать серверный экспорт:

```javascript
// vue-app/src/services/webhook-logs-api.js

/**
 * Серверный экспорт данных (для больших объёмов)
 * 
 * @param {Object} filters Фильтры
 * @param {string} format Формат (csv/json)
 * @returns {Promise<string>} URL для скачивания файла
 */
export async function exportLogsServer(filters, format = 'csv') {
  const response = await fetch('/api/webhook-logs-export.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filters,
      format
    })
  });

  if (!response.ok) {
    throw new Error('Ошибка серверного экспорта');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  
  const filename = `webhook-logs-${new Date().toISOString().split('T')[0]}.${format}`;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
}
```

---

## 🔧 Troubleshooting

### Проблема 1: CSV файл открывается с неправильной кодировкой в Excel

**Симптомы:** Кириллица отображается как кракозябры в Excel.

**Решение:**
- Убедитесь, что используется BOM (`\ufeff`) в начале CSV файла
- Проверьте, что тип Blob указан как `text/csv;charset=utf-8;`
- В Excel: "Данные" → "Из текста/CSV" → выбрать UTF-8

**Код:**
```javascript
const csvContent = '\ufeff' + csvRows.join('\n');
const blob = new Blob([csvContent], { 
  type: 'text/csv;charset=utf-8;' 
});
```

---

### Проблема 2: Экспорт зависает при больших объёмах данных

**Симптомы:** Браузер не отвечает при экспорте большого количества записей.

**Решение:**
- Используйте chunking (обработка по частям)
- Добавьте `setTimeout` между chunk'ами для освобождения UI потока
- Для очень больших объёмов (>50,000 записей) используйте серверный экспорт

**Код:**
```javascript
async function exportLargeDataset(data, chunkSize = 1000) {
  const chunks = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
    // Освобождение UI потока
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  // Обработка chunks
}
```

---

### Проблема 3: JSON файл слишком большой и не открывается

**Симптомы:** JSON файл создаётся, но не открывается в редакторе.

**Решение:**
- Проверьте размер файла перед экспортом
- Предупредите пользователя о больших объёмах
- Для очень больших файлов предложите серверный экспорт

**Код:**
```javascript
const estimatedSize = JSON.stringify(data).length;
if (estimatedSize > 50 * 1024 * 1024) { // 50 MB
  const confirmed = confirm(
    `Файл будет большим (${Math.round(estimatedSize / 1024 / 1024)} MB). ` +
    `Продолжить?`
  );
  if (!confirmed) return;
}
```

---

### Проблема 4: Выбранные записи сбрасываются при изменении страницы

**Симптомы:** При переходе на другую страницу пагинации выбранные записи теряются.

**Решение:**
- Сохраняйте выбранные записи по уникальному ID (timestamp + event + IP)
- При загрузке новой страницы проверяйте, какие записи уже выбраны

**Код:**
```javascript
// Сохранение выбранных ID вместо полных объектов
const selectedIds = computed(() => 
  selectedLogs.value.map(log => getLogId(log))
);

// При загрузке новой страницы
const currentPageSelected = computed(() => 
  logs.value.filter(log => selectedIds.value.includes(getLogId(log)))
);
```

---

### Проблема 5: Экспорт не работает в Safari

**Симптомы:** Файл не скачивается в Safari.

**Решение:**
- Используйте `window.open()` как fallback для Safari
- Проверяйте поддержку `download` атрибута

**Код:**
```javascript
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Fallback для Safari
  if (typeof link.download === 'undefined') {
    window.open(url);
  } else {
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
```

---

### Проблема 6: Специальные символы ломают CSV формат

**Симптомы:** CSV файл имеет неправильную структуру из-за запятых или кавычек в данных.

**Решение:**
- Всегда экранируйте кавычки (удвоение)
- Оборачивайте значения с запятыми/переносами строк в кавычки
- Используйте функцию `escapeCSVValue` для всех значений

**Код:**
```javascript
function escapeCSVValue(value) {
  const stringValue = String(value);
  const escaped = stringValue.replace(/"/g, '""');
  
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${escaped}"`;
  }
  
  return escaped;
}
```

---

## ✅ Критерии приёмки

### Функциональные требования

- [ ] Экспорт в CSV работает корректно
- [ ] Экспорт в JSON работает корректно
- [ ] Специальные символы обрабатываются правильно (кавычки, запятые, переносы строк)
- [ ] Экспорт применяет текущие фильтры
- [ ] Экспорт выбранных записей работает
- [ ] Имя файла содержит дату и метаданные (фильтры, количество записей)
- [ ] UI для экспорта интуитивен и понятен
- [ ] Индикатор прогресса отображается при экспорте
- [ ] Файлы скачиваются корректно во всех браузерах
- [ ] Кириллица корректно отображается в CSV (Excel, LibreOffice)
- [ ] JSON поддерживает красивое форматирование
- [ ] Валидация данных перед экспортом работает
- [ ] Предупреждения о больших объёмах данных отображаются

### UI/UX требования

- [ ] Модальное окно экспорта открывается/закрывается плавно
- [ ] Кнопка экспорта показывает количество выбранных записей
- [ ] Выбор формата и области экспорта интуитивен
- [ ] Прогресс-бар отображает реальный прогресс экспорта
- [ ] Ошибки экспорта отображаются пользователю
- [ ] Компонент адаптивен для мобильных устройств

### Технические требования

- [ ] Утилиты экспорта обрабатывают большие объёмы данных (chunking)
- [ ] Выбранные записи сохраняются при пагинации
- [ ] Экспорт не блокирует UI поток
- [ ] Код соответствует стандартам проекта
- [ ] Нет утечек памяти (revokeObjectURL)
- [ ] Поддержка всех современных браузеров

---

## 📋 Чек-лист выполнения

### Этап 1: Создание утилит экспорта

- [ ] Создать файл `vue-app/src/utils/export-utils.js`
- [ ] Реализовать функцию `escapeCSVValue()`
- [ ] Реализовать функцию `exportToCSV()` с chunking
- [ ] Реализовать функцию `exportToJSON()` с опцией форматирования
- [ ] Реализовать функцию `downloadBlob()` с fallback для Safari
- [ ] Реализовать функцию `generateExportFilename()` с метаданными
- [ ] Реализовать функцию `validateExportData()`
- [ ] Протестировать все функции утилит

### Этап 2: Создание компонента экспорта

- [ ] Создать файл `vue-app/src/components/webhooks/WebhookLogsExport.vue`
- [ ] Реализовать модальное окно с выбором формата
- [ ] Реализовать выбор области экспорта (все/выбранные)
- [ ] Добавить опции для JSON (красивое форматирование)
- [ ] Реализовать прогресс-бар экспорта
- [ ] Добавить валидацию и предупреждения
- [ ] Добавить стили для компонента
- [ ] Протестировать компонент

### Этап 3: Интеграция выбора записей

- [ ] Обновить `WebhookLogList.vue` для поддержки чекбоксов
- [ ] Добавить чекбокс "Выбрать все" в заголовок таблицы
- [ ] Реализовать логику выбора/снятия выбора записей
- [ ] Добавить визуальную индикацию выбранных записей
- [ ] Сохранять выбранные записи при пагинации
- [ ] Добавить стили для выбранных записей
- [ ] Протестировать выбор записей

### Этап 4: Интеграция в WebhookLogsPage

- [ ] Импортировать компонент `WebhookLogsExport` в `WebhookLogsPage.vue`
- [ ] Добавить компонент в заголовок страницы
- [ ] Реализовать состояние `selectedLogs`
- [ ] Добавить обработчики событий экспорта
- [ ] Интегрировать с компонентом `WebhookLogList`
- [ ] Очищать выбранные записи при изменении фильтров
- [ ] Протестировать полную интеграцию

### Этап 5: Тестирование и отладка

- [ ] Протестировать экспорт CSV с различными данными
- [ ] Протестировать экспорт JSON (с форматированием и без)
- [ ] Протестировать экспорт с фильтрами
- [ ] Протестировать экспорт выбранных записей
- [ ] Протестировать экспорт больших объёмов данных (>10,000 записей)
- [ ] Протестировать в разных браузерах (Chrome, Firefox, Safari, Edge)
- [ ] Проверить корректность кириллицы в CSV
- [ ] Проверить обработку ошибок
- [ ] Проверить производительность (не блокирует UI)

---

## 🧪 Тестирование

### Тестирование CSV:
1. Применить фильтры
2. Нажать "Экспорт" → выбрать CSV
3. Скачать файл
4. Открыть в Excel/LibreOffice
5. Проверить корректность данных

### Тестирование JSON:
1. Нажать "Экспорт" → выбрать JSON
2. Скачать файл
3. Открыть в текстовом редакторе
4. Проверить валидность JSON

### Тестирование выбранных записей:
1. Выбрать несколько записей
2. Нажать "Экспорт" → выбрать "Выбранные"
3. Проверить, что экспортированы только выбранные

---

## 📚 Дополнительные ресурсы

- [Blob API](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
- [URL.createObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL)

---

## 📝 История правок

- **2025-12-07 05:25 (UTC+3, Брест):** Создана задача TASK-017-05
- **2025-12-07 06:00 (UTC+3, Брест):** Добавлены детальные утилиты экспорта с обработкой больших объёмов данных, chunking, валидацией
- **2025-12-07 06:00 (UTC+3, Брест):** Добавлен полный компонент экспорта с модальным окном, прогресс-баром, предупреждениями
- **2025-12-07 06:00 (UTC+3, Брест):** Добавлена интеграция выбора записей в WebhookLogList с чекбоксами и "Выбрать все"
- **2025-12-07 06:26 (UTC+3, Брест):** Задача завершена. Реализованы:
  - Утилиты экспорта (export-utils.js) с функциями для CSV и JSON
  - Компонент WebhookLogsExport.vue с модальным окном, выбором формата, области экспорта, прогресс-баром
  - Добавлены чекбоксы для выбора записей в WebhookLogList.vue (выбор всех, выбор отдельных записей)
  - Интегрирован экспорт в WebhookLogsPage.vue с обработкой событий экспорта
  - Все компоненты протестированы, ошибок линтера нет
- **2025-12-07 06:00 (UTC+3, Брест):** Добавлена интеграция компонента экспорта в WebhookLogsPage
- **2025-12-07 06:00 (UTC+3, Брест):** Добавлен раздел Troubleshooting с 6 типичными проблемами и решениями
- **2025-12-07 06:00 (UTC+3, Брест):** Расширены критерии приёмки и добавлен детальный чек-лист выполнения

---

## 🔗 Связанные задачи

- **Родительская:** [TASK-017: Глобальный план](./TASK-017-webhook-logs-ui-implementation-plan.md)
- **Предыдущая:** [TASK-017-04: Статистика и визуализация](./TASK-017-04-statistics-visualization.md)
- **Следующая:** [TASK-017-06: Улучшение UX](./TASK-017-06-improve-ux.md)

