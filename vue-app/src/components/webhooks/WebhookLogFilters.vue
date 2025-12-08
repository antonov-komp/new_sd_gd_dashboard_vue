<template>
  <div class="webhook-log-filters">
    <!-- Индикатор активных фильтров -->
    <div v-if="hasActiveFilters" class="active-filters-indicator">
      <span class="indicator-text">Активные фильтры:</span>
      <span 
        v-for="(value, key) in activeFilters" 
        :key="key"
        class="filter-badge"
      >
        {{ getFilterLabel(key) }}: {{ getFilterValue(key, value) }}
        <button 
          @click="clearFilter(key)"
          class="filter-badge-remove"
          title="Удалить фильтр"
        >
          ×
        </button>
      </span>
      <button @click="handleReset" class="btn-clear-all">
        Очистить все
      </button>
    </div>
    
    <!-- Ошибка валидации -->
    <div v-if="validationError" class="validation-error">
      ⚠️ {{ validationError }}
    </div>
    
    <!-- Быстрые фильтры -->
    <div class="quick-filters">
      <span class="quick-filters-label">Быстрые фильтры:</span>
      <button
        v-for="quickFilter in quickFilters"
        :key="quickFilter.id"
        @click="applyQuickFilter(quickFilter.id)"
        class="quick-filter-btn"
        :class="{ active: activeQuickFilter === quickFilter.id }"
      >
        {{ quickFilter.label }}
      </button>
    </div>
    
    <div class="filters-row">
      <!-- Фильтр по категории -->
      <div class="filter-group">
        <label for="category-filter">Категория:</label>
        <select
          id="category-filter"
          v-model="localFilters.category"
          @change="handleCategoryChange(localFilters.category)"
          class="filter-select"
        >
          <option 
            v-for="option in categoryOptions" 
            :key="option.value" 
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <!-- Фильтр по типу события -->
      <div class="filter-group">
        <label for="event-filter">Тип события:</label>
        <select
          id="event-filter"
          v-model="localFilters.event"
          @change="handleEventChange(localFilters.event)"
          class="filter-select"
        >
          <option 
            v-for="option in eventOptions" 
            :key="option.value" 
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <!-- Фильтр по дате (от) -->
      <div class="filter-group">
        <label for="date-from-filter">Дата от:</label>
        <input
          id="date-from-filter"
          v-model="localFilters.dateFrom"
          type="date"
          @change="handleDateChange(localFilters.dateFrom, 'dateFrom')"
          class="filter-input"
        />
      </div>

      <!-- Фильтр по дате (до) -->
      <div class="filter-group">
        <label for="date-to-filter">Дата до:</label>
        <input
          id="date-to-filter"
          v-model="localFilters.dateTo"
          type="date"
          @change="handleDateChange(localFilters.dateTo, 'dateTo')"
          class="filter-input"
        />
      </div>

      <!-- Фильтр по IP -->
      <div class="filter-group">
        <label for="ip-filter">IP адрес:</label>
        <input
          id="ip-filter"
          v-model="localFilters.ip"
          type="text"
          placeholder="192.168.1.1"
          @input="handleFilterChange"
          class="filter-input"
        />
      </div>

      <!-- Фильтр по статусу -->
      <div class="filter-group">
        <label for="status-filter">Статус:</label>
        <select
          id="status-filter"
          v-model="localFilters.status"
          @change="handleFilterChange"
          class="filter-select"
        >
          <option :value="null">Все статусы</option>
          <option value="success">Успешно</option>
          <option value="error">Ошибка</option>
          <option value="warning">Предупреждение</option>
        </select>
      </div>

      <!-- Кнопка сброса фильтров -->
      <div class="filter-group">
        <button
          @click="handleReset"
          class="btn-reset"
        >
          Сбросить
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, computed, onMounted } from 'vue';
import { useLocalStorage } from '@/composables/useLocalStorage.js';
import { validateFilters } from '@/utils/webhook-validators.js';
import { formatCategory, formatEventType } from '@/utils/webhook-formatters.js';

export default {
  name: 'WebhookLogFilters',
  props: {
    filters: {
      type: Object,
      required: true
    }
  },
  emits: ['update:filters', 'reset'],
  setup(props, { emit }) {
    // Состояние для ошибок валидации
    const validationError = ref(null);
    
    // Загрузка сохранённых фильтров
    const savedFilters = useLocalStorage('webhook-filters', {
      category: null,
      event: null,
      dateFrom: null,
      dateTo: null,
      hour: null,
      ip: null,
      status: null
    });
    
    // Валидация и эмит фильтров
    const validateAndEmit = (newFilters) => {
      validationError.value = null;
      
      if (!validateFilters(newFilters)) {
        validationError.value = 'Некорректные параметры фильтрации';
        console.error('[WebhookLogFilters] Validation error:', validationError.value);
        return false;
      }
      
      emit('update:filters', newFilters);
      return true;
    };
    
    // Локальное состояние фильтров
    const today = new Date().toISOString().split('T')[0];
    const localFilters = ref({
      category: savedFilters.value.category || props.filters.category || null,
      event: savedFilters.value.event || props.filters.event || null,
      dateFrom: savedFilters.value.dateFrom || props.filters.dateFrom || (props.filters.date || today),
      dateTo: savedFilters.value.dateTo || props.filters.dateTo || null,
      hour: savedFilters.value.hour !== undefined ? savedFilters.value.hour : (props.filters.hour !== undefined ? props.filters.hour : null),
      ip: savedFilters.value.ip || props.filters.ip || null,
      status: savedFilters.value.status || props.filters.status || null
    });
    
    // Активный быстрый фильтр
    const activeQuickFilter = ref(null);
    
    // Быстрые фильтры
    const quickFilters = [
      { id: 'today', label: 'Сегодня', getDates: () => ({ from: today, to: today }) },
      { id: 'yesterday', label: 'Вчера', getDates: () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        return { from: yesterdayStr, to: yesterdayStr };
      }},
      { id: 'last7days', label: 'Последние 7 дней', getDates: () => {
        const from = new Date();
        from.setDate(from.getDate() - 7);
        return { from: from.toISOString().split('T')[0], to: today };
      }},
      { id: 'last30days', label: 'Последние 30 дней', getDates: () => {
        const from = new Date();
        from.setDate(from.getDate() - 30);
        return { from: from.toISOString().split('T')[0], to: today };
      }}
    ];
    
    // Применить быстрый фильтр
    const applyQuickFilter = (filterId) => {
      const filter = quickFilters.find(f => f.id === filterId);
      if (filter) {
        const dates = filter.getDates();
        localFilters.value.dateFrom = dates.from;
        localFilters.value.dateTo = dates.to;
        activeQuickFilter.value = filterId;
        handleFilterChange();
      }
    };
    
    // Синхронизация с props
    watch(() => props.filters, (newFilters) => {
      localFilters.value = {
        category: newFilters.category || null,
        event: newFilters.event || null,
        dateFrom: newFilters.dateFrom || (newFilters.date || today),
        dateTo: newFilters.dateTo || null,
        hour: newFilters.hour !== undefined ? newFilters.hour : null,
        ip: newFilters.ip || null,
        status: newFilters.status || null
      };
    }, { deep: true });
    
    // Сохранение при изменении
    watch(localFilters, (newFilters) => {
      savedFilters.value = { ...newFilters };
      emit('update:filters', { ...newFilters });
    }, { deep: true });
    
    // Активные фильтры
    const activeFilters = computed(() => {
      const active = {};
      if (localFilters.value.category) {
        active.category = localFilters.value.category;
      }
      if (localFilters.value.event) {
        active.event = localFilters.value.event;
      }
      if (localFilters.value.hour !== null) {
        active.hour = localFilters.value.hour;
      }
      if (localFilters.value.ip) {
        active.ip = localFilters.value.ip;
      }
      if (localFilters.value.status) {
        active.status = localFilters.value.status;
      }
      if (localFilters.value.dateFrom && localFilters.value.dateFrom !== today) {
        active.dateFrom = localFilters.value.dateFrom;
      }
      if (localFilters.value.dateTo) {
        active.dateTo = localFilters.value.dateTo;
      }
      return active;
    });
    
    const hasActiveFilters = computed(() => {
      return Object.keys(activeFilters.value).length > 0;
    });
    
    const getFilterLabel = (key) => {
      const labels = {
        category: 'Категория',
        event: 'Событие',
        hour: 'Час',
        ip: 'IP адрес',
        status: 'Статус',
        dateFrom: 'Дата от',
        dateTo: 'Дата до'
      };
      return labels[key] || key;
    };
    
    const getFilterValue = (key, value) => {
      if (key === 'category') {
        return formatCategory(value) || value;
      }
      if (key === 'hour') {
        return `${String(value).padStart(2, '0')}:00`;
      }
      if (key === 'event') {
        return formatEventType(value) || value;
      }
      if (key === 'status') {
        const statusLabels = {
          success: 'Успешно',
          error: 'Ошибка',
          warning: 'Предупреждение'
        };
        return statusLabels[value] || value;
      }
      return value;
    };
    
    // Обновить computed свойства для опций
    const categoryOptions = computed(() => {
      return [
        { value: null, label: 'Все категории' },
        { value: 'tasks', label: formatCategory('tasks') },
        { value: 'smart-processes', label: formatCategory('smart-processes') },
        { value: 'errors', label: formatCategory('errors') }
      ];
    });
    
    const eventOptions = computed(() => {
      // Можно получать из API или использовать статический список
      const events = [
        'ONTASKADD',
        'ONTASKUPDATE',
        'ONTASKDELETE',
        'ONTASKCOMMENTADD',
        'ONTASKCOMMENTUPDATE',
        'ONTASKCOMMENTDELETE',
        'ONCRMDYNAMICITEMADD',
        'ONCRMDYNAMICITEMUPDATE',
        'ONCRMDYNAMICITEMDELETE'
      ];
      
      return [
        { value: null, label: 'Все события' },
        ...events.map(event => ({
          value: event,
          label: formatEventType(event)
        }))
      ];
    });
    
    const clearFilter = (key) => {
      if (key === 'hour') {
        localFilters.value[key] = null;
      } else if (key === 'dateFrom') {
        localFilters.value[key] = today;
      } else if (key === 'dateTo') {
        localFilters.value[key] = null;
      } else {
        localFilters.value[key] = null;
      }
      activeQuickFilter.value = null;
    };

    // Обработчики изменения фильтров с валидацией
    const handleCategoryChange = (category) => {
      const newFilters = {
        ...localFilters.value,
        category: category || null
      };
      
      if (validateAndEmit(newFilters)) {
        localFilters.value.category = category;
      }
    };
    
    const handleEventChange = (event) => {
      const newFilters = {
        ...localFilters.value,
        event: event || null
      };
      
      if (validateAndEmit(newFilters)) {
        localFilters.value.event = event;
      }
    };
    
    const handleDateChange = (date, type) => {
      // Валидация формата даты
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        console.error('[WebhookLogFilters] Invalid date format:', date);
        validationError.value = 'Некорректный формат даты';
        return;
      }
      
      const newFilters = {
        ...localFilters.value,
        [type]: date || null
      };
      
      if (validateAndEmit(newFilters)) {
        localFilters.value[type] = date;
      }
    };
    
    const handleHourChange = (hour) => {
      // Валидация часа
      if (hour !== null && hour !== undefined) {
        const hourNum = parseInt(hour, 10);
        if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
          console.error('[WebhookLogFilters] Invalid hour:', hour);
          validationError.value = 'Некорректный час (должен быть от 0 до 23)';
          return;
        }
      }
      
      const newFilters = {
        ...localFilters.value,
        hour: hour !== null && hour !== undefined ? parseInt(hour, 10) : null
      };
      
      if (validateAndEmit(newFilters)) {
        localFilters.value.hour = hour !== null && hour !== undefined ? parseInt(hour, 10) : null;
      }
    };
    
    const handleFilterChange = () => {
      validateAndEmit({ ...localFilters.value });
    };

    const handleReset = () => {
      localFilters.value = {
        category: null,
        event: null,
        dateFrom: today,
        dateTo: null,
        hour: null,
        ip: null,
        status: null
      };
      activeQuickFilter.value = null;
      savedFilters.clear();
      emit('reset');
    };
    
    // Загрузка сохранённых фильтров при монтировании
    onMounted(() => {
      if (savedFilters.value && Object.keys(savedFilters.value).length > 0) {
        emit('update:filters', { ...savedFilters.value });
      }
    });

    return {
      localFilters,
      activeFilters,
      hasActiveFilters,
      getFilterLabel,
      getFilterValue,
      clearFilter,
      handleFilterChange,
      handleCategoryChange,
      handleEventChange,
      handleDateChange,
      handleHourChange,
      handleReset,
      quickFilters,
      activeQuickFilter,
      applyQuickFilter,
      categoryOptions,
      eventOptions,
      validationError
    };
  }
};
</script>

<style scoped>
.webhook-log-filters {
  margin-bottom: 20px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.active-filters-indicator {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: #e7f3ff;
  border-radius: 4px;
  margin-bottom: 15px;
}

.indicator-text {
  font-weight: 500;
  font-size: 14px;
  color: #333;
}

.filter-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #007bff;
  color: white;
  border-radius: 12px;
  font-size: 12px;
}

.filter-badge-remove {
  background: rgba(255, 255, 255, 0.3);
  border: none;
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-badge-remove:hover {
  background: rgba(255, 255, 255, 0.5);
}

.btn-clear-all {
  margin-left: auto;
  padding: 4px 12px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.btn-clear-all:hover {
  background: #c82333;
}

.quick-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
  padding: 10px;
  background: #f0f0f0;
  border-radius: 4px;
}

.quick-filters-label {
  font-weight: 500;
  font-size: 14px;
  color: #333;
  margin-right: 8px;
}

.quick-filter-btn {
  padding: 6px 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  color: #333;
}

.quick-filter-btn:hover {
  background: #f8f9fa;
  border-color: #2196F3;
}

.quick-filter-btn.active {
  background: #2196F3;
  color: white;
  border-color: #2196F3;
}

.filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  min-width: 150px;
}

.filter-group label {
  margin-bottom: 5px;
  font-weight: 500;
  font-size: 14px;
  color: #333;
}

.filter-select,
.filter-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.filter-select:hover,
.filter-input:hover {
  border-color: #2196F3;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #2196F3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
}

.btn-reset {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.btn-reset:hover {
  background: #5a6268;
}

.validation-error {
  padding: 10px;
  background: #ffebee;
  color: #c62828;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 14px;
  border-left: 4px solid #dc3545;
}

@media (max-width: 768px) {
  .filters-row {
    flex-direction: column;
  }

  .filter-group {
    width: 100%;
  }
}
</style>



