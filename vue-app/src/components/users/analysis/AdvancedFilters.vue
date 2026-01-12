<template>
  <div class="advanced-filters">
    <div class="filters-header">
      <h4 class="filters-title">🔍 Фильтры и группировка</h4>
      <div class="filters-actions">
        <button @click="showPresets = !showPresets" class="presets-btn">
          📋 Шаблоны
        </button>
        <button @click="resetFilters" class="reset-btn">
          🔄 Сброс
        </button>
        <button @click="applyFilters" class="apply-btn">
          ✅ Применить
        </button>
      </div>
    </div>

    <!-- Предустановки фильтров -->
    <div v-if="showPresets" class="presets-panel">
      <div class="presets-grid">
        <button
          v-for="preset in filterPresets"
          :key="preset.key"
          @click="applyPreset(preset)"
          class="preset-btn"
        >
          <div class="preset-icon">{{ preset.icon }}</div>
          <div class="preset-content">
            <div class="preset-name">{{ preset.name }}</div>
            <div class="preset-description">{{ preset.description }}</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Основные фильтры -->
    <div class="filters-content">
      <!-- Временной диапазон -->
      <div class="filter-group time-range">
        <label class="filter-label">📅 Временной диапазон</label>
        <div class="time-range-controls">
          <select v-model="localFilters.timeRange.type" @change="handleTimeRangeTypeChange" class="range-type-select">
            <option value="preset">Предустановка</option>
            <option value="custom">Произвольный</option>
          </select>

          <div v-if="localFilters.timeRange.type === 'preset'" class="preset-options">
            <select v-model="localFilters.timeRange.preset" @change="applyTimePreset" class="time-preset-select">
              <option value="today">Сегодня</option>
              <option value="yesterday">Вчера</option>
              <option value="3days">3 дня</option>
              <option value="week">Неделя</option>
              <option value="month">Месяц</option>
              <option value="quarter">Квартал</option>
              <option value="year">Год</option>
            </select>
          </div>

          <div v-else class="custom-range">
            <input
              type="date"
              v-model="localFilters.timeRange.custom.from"
              class="date-input"
              placeholder="Дата начала"
            />
            <span class="date-separator">—</span>
            <input
              type="date"
              v-model="localFilters.timeRange.custom.to"
              class="date-input"
              placeholder="Дата окончания"
            />
          </div>
        </div>
      </div>

      <!-- Типы активности -->
      <div class="filter-group activity-types">
        <label class="filter-label">🎯 Типы активности</label>
        <div class="checkbox-group">
          <label v-for="type in activityTypeOptions" :key="type.value" class="checkbox-item">
            <input
              type="checkbox"
              :value="type.value"
              v-model="localFilters.activityTypes"
              class="checkbox-input"
            />
            <span class="checkbox-label">
              <span class="type-icon">{{ type.icon }}</span>
              {{ type.label }}
            </span>
          </label>
        </div>
      </div>

      <!-- Отделы пользователей -->
      <div class="filter-group departments">
        <label class="filter-label">🏢 Отделы</label>
        <div class="departments-controls">
          <select v-model="selectedDepartmentMode" class="mode-select">
            <option value="all">Все отделы</option>
            <option value="specific">Выбранные отделы</option>
          </select>

          <div v-if="selectedDepartmentMode === 'specific'" class="departments-list">
            <div class="department-item" v-for="dept in availableDepartments" :key="dept.id">
              <label class="department-checkbox">
                <input
                  type="checkbox"
                  :value="dept.id"
                  v-model="localFilters.departments"
                  class="checkbox-input"
                />
                <span class="checkbox-label">{{ dept.name }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Частота использования -->
      <div class="filter-group usage-frequency">
        <label class="filter-label">📊 Частота использования</label>
        <select v-model="localFilters.userActivity" class="frequency-select">
          <option value="all">Все пользователи</option>
          <option value="new">Новые (первый вход за период)</option>
          <option value="active">Активные (≥5 действий)</option>
          <option value="inactive">Неактивные (<5 действий)</option>
        </select>
      </div>

      <!-- Устройства -->
      <div class="filter-group devices">
        <label class="filter-label">📱 Устройства</label>
        <div class="checkbox-group">
          <label v-for="device in deviceOptions" :key="device.value" class="checkbox-item">
            <input
              type="checkbox"
              :value="device.value"
              v-model="localFilters.devices"
              class="checkbox-input"
            />
            <span class="checkbox-label">
              <span class="device-icon">{{ device.icon }}</span>
              {{ device.label }}
            </span>
          </label>
        </div>
      </div>

      <!-- Браузеры -->
      <div class="filter-group browsers">
        <label class="filter-label">🌐 Браузеры</label>
        <div class="browsers-controls">
          <select v-model="selectedBrowserMode" class="mode-select">
            <option value="all">Все браузеры</option>
            <option value="specific">Выбранные браузеры</option>
          </select>

          <div v-if="selectedBrowserMode === 'specific'" class="browsers-list">
            <div class="browser-item" v-for="browser in browserOptions" :key="browser.value">
              <label class="browser-checkbox">
                <input
                  type="checkbox"
                  :value="browser.value"
                  v-model="localFilters.browsers"
                  class="checkbox-input"
                />
                <span class="checkbox-label">
                  <span class="browser-icon">{{ browser.icon }}</span>
                  {{ browser.label }}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Группировка данных -->
      <div class="filter-group grouping">
        <label class="filter-label">📋 Группировка</label>
        <div class="grouping-controls">
          <div class="group-by-control">
            <label class="sub-label">Группировать по:</label>
            <select v-model="localFilters.groupBy" class="group-by-select">
              <option value="day">Дням</option>
              <option value="week">Неделям</option>
              <option value="month">Месяцам</option>
              <option value="user">Пользователям</option>
              <option value="page">Страницам</option>
              <option value="session">Сессиям</option>
            </select>
          </div>

          <div class="sort-control">
            <label class="sub-label">Сортировка:</label>
            <select v-model="localFilters.sortBy" class="sort-by-select">
              <option value="timestamp">По времени</option>
              <option value="user">По пользователю</option>
              <option value="type">По типу</option>
              <option value="page">По странице</option>
            </select>
            <select v-model="localFilters.sortOrder" class="sort-order-select">
              <option value="desc">Убывание</option>
              <option value="asc">Возрастание</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Сохраненные фильтры -->
    <div class="saved-filters">
      <div class="saved-filters-header">
        <h5 class="saved-title">💾 Сохраненные фильтры</h5>
        <button @click="showSaveDialog = true" class="save-current-btn">
          Сохранить текущий
        </button>
      </div>

      <div v-if="savedFilters.length > 0" class="saved-filters-list">
        <div
          v-for="filter in savedFilters"
          :key="filter.id"
          class="saved-filter-item"
        >
          <div class="filter-info">
            <div class="filter-name">{{ filter.name }}</div>
            <div class="filter-date">Сохранено: {{ formatDate(filter.createdAt) }}</div>
          </div>
          <div class="filter-actions">
            <button @click="loadSavedFilter(filter)" class="load-btn">Загрузить</button>
            <button @click="deleteSavedFilter(filter.id)" class="delete-btn">Удалить</button>
          </div>
        </div>
      </div>

      <div v-else class="no-saved-filters">
        Нет сохраненных фильтров
      </div>
    </div>

    <!-- Диалог сохранения фильтра -->
    <div v-if="showSaveDialog" class="save-dialog-overlay" @click="showSaveDialog = false">
      <div class="save-dialog" @click.stop>
        <h4>Сохранить фильтр</h4>
        <div class="dialog-content">
          <label class="dialog-label">Название фильтра:</label>
          <input
            v-model="saveFilterName"
            type="text"
            class="save-name-input"
            placeholder="Введите название..."
            @keyup.enter="saveCurrentFilter"
          />
        </div>
        <div class="dialog-actions">
          <button @click="showSaveDialog = false" class="cancel-btn">Отмена</button>
          <button @click="saveCurrentFilter" :disabled="!saveFilterName.trim()" class="save-btn">Сохранить</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';

export default {
  name: 'AdvancedFilters',
  props: {
    modelValue: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    // Реактивные данные
    const showPresets = ref(false);
    const showSaveDialog = ref(false);
    const saveFilterName = ref('');
    const selectedDepartmentMode = ref('all');
    const selectedBrowserMode = ref('all');

    // Локальные фильтры
    const localFilters = ref({
      timeRange: {
        type: 'preset',
        preset: 'week',
        custom: { from: null, to: null }
      },
      activityTypes: [],
      departments: [],
      userActivity: 'all',
      devices: [],
      browsers: [],
      groupBy: 'day',
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });

    // Предустановки фильтров
    const filterPresets = [
      {
        key: 'today',
        name: 'Сегодня',
        description: 'Активность за сегодня',
        icon: '📅',
        filters: {
          timeRange: { type: 'preset', preset: 'today' },
          activityTypes: [],
          departments: [],
          userActivity: 'all',
          devices: [],
          browsers: [],
          groupBy: 'hour',
          sortBy: 'timestamp',
          sortOrder: 'desc'
        }
      },
      {
        key: 'active_users',
        name: 'Активные пользователи',
        description: 'Пользователи с высокой активностью',
        icon: '🚀',
        filters: {
          timeRange: { type: 'preset', preset: 'week' },
          activityTypes: ['app_entry', 'page_visit'],
          departments: [],
          userActivity: 'active',
          devices: [],
          browsers: [],
          groupBy: 'user',
          sortBy: 'timestamp',
          sortOrder: 'desc'
        }
      },
      {
        key: 'problem_sessions',
        name: 'Проблемные сессии',
        description: 'Короткие сессии и частые переходы',
        icon: '⚠️',
        filters: {
          timeRange: { type: 'preset', preset: '3days' },
          activityTypes: ['app_entry'],
          departments: [],
          userActivity: 'all',
          devices: [],
          browsers: [],
          groupBy: 'session',
          sortBy: 'timestamp',
          sortOrder: 'desc'
        }
      },
      {
        key: 'new_traffic',
        name: 'Новый трафик',
        description: 'Новые пользователи в системе',
        icon: '🆕',
        filters: {
          timeRange: { type: 'preset', preset: 'month' },
          activityTypes: [],
          departments: [],
          userActivity: 'new',
          devices: [],
          browsers: [],
          groupBy: 'day',
          sortBy: 'timestamp',
          sortOrder: 'desc'
        }
      }
    ];

    // Опции для фильтров
    const activityTypeOptions = [
      { value: 'app_entry', label: 'Открытие приложения', icon: '🚪' },
      { value: 'page_visit', label: 'Переходы по страницам', icon: '📄' }
    ];

    const deviceOptions = [
      { value: 'desktop', label: 'Компьютер', icon: '🖥️' },
      { value: 'mobile', label: 'Телефон', icon: '📱' },
      { value: 'tablet', label: 'Планшет', icon: '📱' }
    ];

    const browserOptions = [
      { value: 'chrome', label: 'Chrome', icon: '🌐' },
      { value: 'firefox', label: 'Firefox', icon: '🦊' },
      { value: 'safari', label: 'Safari', icon: '🧭' },
      { value: 'edge', label: 'Edge', icon: '⚡' },
      { value: 'opera', label: 'Opera', icon: '🎭' }
    ];

    // Имитация доступных отделов (в реальности загрузить из API)
    const availableDepartments = [
      { id: 369, name: 'Битрикс24 отдел' },
      { id: 366, name: 'Сектор 1С' }
    ];

    // Сохраненные фильтры (из localStorage)
    const savedFilters = ref([]);

    // Синхронизация с props
    watch(() => props.modelValue, (newValue) => {
      if (newValue && Object.keys(newValue).length > 0) {
        localFilters.value = { ...newValue };
      }
    }, { deep: true, immediate: true });

    // Загрузка сохраненных фильтров
    const loadSavedFilters = () => {
      try {
        const saved = localStorage.getItem('activity_filter_presets');
        if (saved) {
          savedFilters.value = JSON.parse(saved);
        }
      } catch (error) {
        console.error('[AdvancedFilters] Error loading saved filters:', error);
      }
    };

    // Сохранение фильтров в localStorage
    const saveFiltersToStorage = () => {
      try {
        localStorage.setItem('activity_filter_presets', JSON.stringify(savedFilters.value));
      } catch (error) {
        console.error('[AdvancedFilters] Error saving filters:', error);
      }
    };

    // Методы
    const handleTimeRangeTypeChange = () => {
      if (localFilters.value.timeRange.type === 'preset') {
        localFilters.value.timeRange.preset = 'week';
        applyTimePreset();
      }
    };

    const applyTimePreset = () => {
      const preset = localFilters.value.timeRange.preset;
      const now = new Date();
      let from, to;

      switch (preset) {
        case 'today':
          from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          from = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
          to = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
          break;
        case '3days':
          from = new Date(now);
          from.setDate(from.getDate() - 3);
          to = now;
          break;
        case 'week':
          from = new Date(now);
          from.setDate(from.getDate() - 7);
          to = now;
          break;
        case 'month':
          from = new Date(now);
          from.setMonth(from.getMonth() - 1);
          to = now;
          break;
        case 'quarter':
          from = new Date(now);
          from.setMonth(from.getMonth() - 3);
          to = now;
          break;
        case 'year':
          from = new Date(now);
          from.setFullYear(from.getFullYear() - 1);
          to = now;
          break;
      }

      localFilters.value.timeRange.custom.from = from.toISOString().split('T')[0];
      localFilters.value.timeRange.custom.to = to.toISOString().split('T')[0];
    };

    const applyPreset = (preset) => {
      localFilters.value = { ...preset.filters };
      showPresets.value = false;
      applyFilters();
    };

    const applyFilters = () => {
      const filtersToApply = {
        dateFrom: null,
        dateTo: null,
        userId: null,
        type: localFilters.value.activityTypes.length > 0 ? localFilters.value.activityTypes : null,
        departments: localFilters.value.departments,
        userActivity: localFilters.value.userActivity,
        devices: localFilters.value.devices,
        browsers: localFilters.value.browsers,
        groupBy: localFilters.value.groupBy,
        sortBy: localFilters.value.sortBy,
        sortOrder: localFilters.value.sortOrder
      };

      // Преобразование временного диапазона
      if (localFilters.value.timeRange.type === 'preset') {
        // Временной диапазон уже рассчитан в custom полях
      }

      if (localFilters.value.timeRange.custom.from) {
        filtersToApply.dateFrom = localFilters.value.timeRange.custom.from;
      }

      if (localFilters.value.timeRange.custom.to) {
        filtersToApply.dateTo = localFilters.value.timeRange.custom.to;
      }

      emit('update:modelValue', filtersToApply);
      emit('change', filtersToApply);
    };

    const resetFilters = () => {
      localFilters.value = {
        timeRange: {
          type: 'preset',
          preset: 'week',
          custom: { from: null, to: null }
        },
        activityTypes: [],
        departments: [],
        userActivity: 'all',
        devices: [],
        browsers: [],
        groupBy: 'day',
        sortBy: 'timestamp',
        sortOrder: 'desc'
      };
      selectedDepartmentMode.value = 'all';
      selectedBrowserMode.value = 'all';
      applyFilters();
    };

    const saveCurrentFilter = () => {
      if (!saveFilterName.value.trim()) return;

      const newFilter = {
        id: Date.now().toString(),
        name: saveFilterName.value.trim(),
        filters: { ...localFilters.value },
        createdAt: new Date().toISOString()
      };

      savedFilters.value.push(newFilter);
      saveFiltersToStorage();

      saveFilterName.value = '';
      showSaveDialog.value = false;
    };

    const loadSavedFilter = (filter) => {
      localFilters.value = { ...filter.filters };
      applyFilters();
    };

    const deleteSavedFilter = (filterId) => {
      savedFilters.value = savedFilters.value.filter(f => f.id !== filterId);
      saveFiltersToStorage();
    };

    const formatDate = (dateString) => {
      try {
        return new Date(dateString).toLocaleDateString('ru-RU');
      } catch {
        return dateString;
      }
    };

    // Инициализация
    loadSavedFilters();

    return {
      // Данные
      showPresets,
      showSaveDialog,
      saveFilterName,
      localFilters,
      selectedDepartmentMode,
      selectedBrowserMode,

      // Константы
      filterPresets,
      activityTypeOptions,
      deviceOptions,
      browserOptions,
      availableDepartments,
      savedFilters,

      // Методы
      handleTimeRangeTypeChange,
      applyTimePreset,
      applyPreset,
      applyFilters,
      resetFilters,
      saveCurrentFilter,
      loadSavedFilter,
      deleteSavedFilter,
      formatDate
    };
  }
};
</script>

<style scoped>
.advanced-filters {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filters-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.filters-actions {
  display: flex;
  gap: 8px;
}

.presets-btn,
.reset-btn,
.apply-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.presets-btn {
  background: #f8f9fa;
}

.presets-btn:hover {
  background: #e9ecef;
}

.reset-btn {
  background: #fff3cd;
  border-color: #ffeaa7;
  color: #856404;
}

.reset-btn:hover {
  background: #ffecb5;
}

.apply-btn {
  background: #2196F3;
  color: white;
  border-color: #2196F3;
}

.apply-btn:hover {
  background: #1976D2;
}

.presets-panel {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
}

.preset-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.preset-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: #2196F3;
}

.preset-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.preset-content {
  flex: 1;
}

.preset-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.preset-description {
  font-size: 12px;
  color: #666;
}

.filters-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.sub-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

/* Временной диапазон */
.time-range-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.range-type-select,
.time-preset-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.custom-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.date-separator {
  color: #666;
}

/* Чекбоксы */
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-input {
  margin: 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #555;
}

.type-icon,
.device-icon,
.browser-icon {
  font-size: 16px;
}

/* Режимы выбора */
.mode-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 8px;
}

.departments-list,
.browsers-list {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
}

.department-item,
.browser-item {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.department-item:last-child,
.browser-item:last-child {
  border-bottom: none;
}

/* Группировка */
.grouping-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-by-control,
.sort-control {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-by-select,
.frequency-select,
.sort-by-select,
.sort-order-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.sort-control {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

/* Сохраненные фильтры */
.saved-filters {
  border-top: 1px solid #eee;
  padding-top: 20px;
}

.saved-filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.saved-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.save-current-btn {
  padding: 6px 12px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.save-current-btn:hover {
  background: #45a049;
}

.saved-filters-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.saved-filter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.filter-info {
  flex: 1;
}

.filter-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.filter-date {
  font-size: 12px;
  color: #666;
}

.filter-actions {
  display: flex;
  gap: 6px;
}

.load-btn,
.delete-btn {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.load-btn {
  background: #2196F3;
  color: white;
}

.load-btn:hover {
  background: #1976D2;
}

.delete-btn {
  background: #dc3545;
  color: white;
}

.delete-btn:hover {
  background: #c82333;
}

.no-saved-filters {
  text-align: center;
  color: #999;
  font-style: italic;
  padding: 20px;
}

/* Диалог сохранения */
.save-dialog-overlay {
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

.save-dialog {
  background: white;
  border-radius: 8px;
  padding: 20px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.save-dialog h4 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.dialog-content {
  margin-bottom: 20px;
}

.dialog-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #555;
}

.save-name-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.save-name-input:focus {
  outline: none;
  border-color: #2196F3;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.cancel-btn,
.save-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: white;
}

.cancel-btn:hover {
  background: #f8f9fa;
}

.save-btn {
  background: #2196F3;
  color: white;
  border-color: #2196F3;
}

.save-btn:hover:not(:disabled) {
  background: #1976D2;
}

.save-btn:disabled {
  background: #ccc;
  border-color: #ccc;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .advanced-filters {
    padding: 16px;
  }

  .filters-header {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }

  .filters-actions {
    width: 100%;
    justify-content: center;
  }

  .presets-grid {
    grid-template-columns: 1fr;
  }

  .filters-content {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .custom-range {
    flex-direction: column;
    align-items: stretch;
  }

  .date-separator {
    display: none;
  }

  .sort-control {
    flex-direction: column;
    align-items: stretch;
  }

  .saved-filter-item {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .filter-actions {
    width: 100%;
    justify-content: stretch;
  }

  .load-btn,
  .delete-btn {
    flex: 1;
  }

  .save-dialog {
    margin: 20px;
    width: calc(100% - 40px);
  }
}
</style>