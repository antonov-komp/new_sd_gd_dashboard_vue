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
                    <small v-if="hasFilters">С применёнными фильтрами ({{ exportCount }} записей)</small>
                    <small v-else>Всего: {{ exportCount }} записей</small>
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
      return props.filters.category || props.filters.event || props.filters.dateFrom || props.filters.dateTo;
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
  opacity: 0.6;
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
    max-height: 100vh;
    border-radius: 0;
  }

  .export-modal-overlay {
    padding: 0;
  }
}
</style>

