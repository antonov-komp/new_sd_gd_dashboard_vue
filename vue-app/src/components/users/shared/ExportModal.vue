<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Экспорт данных</h3>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>

      <div class="modal-body">
        <div class="export-summary">
          <div v-if="dataType === 'users'" class="summary-item">
            <span class="summary-label">Пользователей для экспорта:</span>
            <span class="summary-value">{{ selectedUsers.length || 'все' }}</span>
          </div>
          <div v-if="dataType === 'user'" class="summary-item">
            <span class="summary-label">Пользователь:</span>
            <span class="summary-value">{{ selectedUsers[0]?.name || 'не выбран' }}</span>
          </div>
        </div>

        <div class="export-options">
          <div class="option-group">
            <label class="option-label">Формат экспорта:</label>
            <div class="format-options">
              <label class="format-option">
                <input
                  type="radio"
                  value="csv"
                  v-model="exportFormat"
                />
                <span class="checkmark"></span>
                CSV (Excel)
              </label>
              <label class="format-option">
                <input
                  type="radio"
                  value="xlsx"
                  v-model="exportFormat"
                />
                <span class="checkmark"></span>
                Excel (.xlsx)
              </label>
              <label class="format-option">
                <input
                  type="radio"
                  value="json"
                  v-model="exportFormat"
                />
                <span class="checkmark"></span>
                JSON
              </label>
            </div>
          </div>

          <div class="option-group">
            <label class="option-label">Что экспортировать:</label>
            <div class="data-options">
              <label class="data-option">
                <input
                  type="checkbox"
                  value="basic"
                  v-model="exportData"
                />
                <span class="checkmark"></span>
                Основная информация
              </label>
              <label class="data-option">
                <input
                  type="checkbox"
                  value="activity"
                  v-model="exportData"
                />
                <span class="checkmark"></span>
                Статистика активности
              </label>
              <label class="data-option">
                <input
                  type="checkbox"
                  value="permissions"
                  v-model="exportData"
                />
                <span class="checkmark"></span>
                Права доступа
              </label>
              <label v-if="dataType === 'users'" class="data-option">
                <input
                  type="checkbox"
                  value="departments"
                  v-model="exportData"
                />
                <span class="checkmark"></span>
                Информация об отделах
              </label>
            </div>
          </div>

          <div v-if="dataType === 'users'" class="option-group">
            <label class="option-label">Фильтры экспорта:</label>
            <div class="filter-summary">
              <div v-for="(value, key) in appliedFilters" :key="key" class="filter-item">
                <span class="filter-key">{{ getFilterLabel(key) }}:</span>
                <span class="filter-value">{{ formatFilterValue(key, value) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="export-estimation">
          <div class="estimation-item">
            <span class="estimation-label">Примерный размер файла:</span>
            <span class="estimation-value">{{ estimatedFileSize }}</span>
          </div>
          <div class="estimation-item">
            <span class="estimation-label">Время подготовки:</span>
            <span class="estimation-value">{{ estimatedTime }}</span>
          </div>
        </div>

        <div class="placeholder-note">
          <strong>Статус:</strong> Функционал экспорта в разработке
        </div>
      </div>

      <div class="modal-footer">
        <button @click="$emit('close')" class="cancel-btn">Отмена</button>
        <button @click="startExport" class="export-btn" :disabled="!canExport">
          Экспортировать
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ExportModal',
  emits: ['close', 'export'],
  props: {
    dataType: {
      type: String,
      default: 'users'
    },
    filters: {
      type: Object,
      default: () => ({})
    },
    selectedUsers: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      exportFormat: 'csv',
      exportData: ['basic', 'activity']
    };
  },
  computed: {
    appliedFilters() {
      return Object.fromEntries(
        Object.entries(this.filters).filter(([key, value]) =>
          value !== '' && value !== null && value !== undefined &&
          (Array.isArray(value) ? value.length > 0 : true)
        )
      );
    },

    canExport() {
      return this.exportData.length > 0;
    },

    estimatedFileSize() {
      const baseSize = this.dataType === 'users' ? this.selectedUsers.length || 100 : 1;
      const dataMultiplier = this.exportData.length;
      const formatMultiplier = this.exportFormat === 'json' ? 1.5 : 1;

      const size = Math.round(baseSize * dataMultiplier * formatMultiplier * 0.1);

      if (size < 1) return '< 1 KB';
      if (size < 1024) return `${size} KB`;
      return `${Math.round(size / 1024)} MB`;
    },

    estimatedTime() {
      const baseTime = this.dataType === 'users' ? (this.selectedUsers.length || 100) * 0.01 : 0.1;
      const dataMultiplier = this.exportData.length;

      const time = baseTime * dataMultiplier;

      if (time < 1) return '< 1 сек';
      if (time < 60) return `${Math.round(time)} сек`;
      return `${Math.round(time / 60)} мин`;
    }
  },
  methods: {
    getFilterLabel(key) {
      const labels = {
        search: 'Поиск',
        department_ids: 'Отделы',
        activity_filter: 'Активность',
        time_range: 'Период',
        sort_by: 'Сортировка',
        sort_order: 'Порядок'
      };
      return labels[key] || key;
    },

    formatFilterValue(key, value) {
      if (Array.isArray(value)) {
        return value.length > 3 ? `${value.length} выбрано` : value.join(', ');
      }

      const formatters = {
        activity_filter: (v) => ({
          'all': 'Все',
          'active': 'Активные',
          'inactive': 'Неактивные',
          'new': 'Новые'
        }[v] || v),
        time_range: (v) => ({
          'today': 'Сегодня',
          'week': 'Неделя',
          'month': 'Месяц',
          'quarter': 'Квартал',
          'year': 'Год'
        }[v] || v),
        sort_order: (v) => v === 'asc' ? 'По возрастанию' : 'По убыванию'
      };

      return formatters[key] ? formatters[key](value) : value;
    },

    startExport() {
      const exportConfig = {
        format: this.exportFormat,
        data: this.exportData,
        filters: this.appliedFilters,
        dataType: this.dataType,
        selectedUsers: this.selectedUsers
      };

      this.$emit('export', exportConfig);
    }
  }
};
</script>

<style scoped>
.modal-overlay {
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
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f8f9fa;
  color: #333;
}

.modal-body {
  padding: 24px;
}

.export-summary {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-label {
  font-weight: 500;
  color: #333;
}

.summary-value {
  font-weight: 600;
  color: #007bff;
}

.export-options {
  margin-bottom: 24px;
}

.option-group {
  margin-bottom: 20px;
}

.option-label {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  font-size: 16px;
}

.format-options,
.data-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.format-option,
.data-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s;
}

.format-option:hover,
.data-option:hover {
  background: #f8f9fa;
}

.format-option input[type="radio"],
.data-option input[type="checkbox"] {
  margin: 0;
}

.checkmark {
  width: 16px;
  height: 16px;
  border: 2px solid #dee2e6;
  border-radius: 50%;
  position: relative;
  background: white;
}

.format-option input[type="radio"]:checked + .checkmark::after,
.data-option input[type="checkbox"]:checked + .checkmark::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 8px;
  height: 8px;
  background: #007bff;
  border-radius: 50%;
}

.filter-summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.filter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.filter-key {
  font-weight: 500;
  color: #666;
}

.filter-value {
  font-weight: 600;
  color: #333;
}

.export-estimation {
  margin-bottom: 24px;
  padding: 16px;
  background: #e3f2fd;
  border-radius: 8px;
}

.estimation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.estimation-item:last-child {
  margin-bottom: 0;
}

.estimation-label {
  font-weight: 500;
  color: #1976d2;
}

.estimation-value {
  font-weight: 600;
  color: #0d47a1;
}

.placeholder-note {
  background: #fff3cd;
  padding: 12px 16px;
  border-radius: 6px;
  color: #856404;
  font-size: 14px;
  text-align: center;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e9ecef;
}

.cancel-btn,
.export-btn {
  padding: 8px 16px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.cancel-btn {
  background: white;
  color: #6c757d;
}

.cancel-btn:hover {
  background: #f8f9fa;
}

.export-btn {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.export-btn:hover:not(:disabled) {
  background: #0056b3;
  border-color: #0056b3;
}

.export-btn:disabled {
  background: #6c757d;
  border-color: #6c757d;
  cursor: not-allowed;
}
</style>