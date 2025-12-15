<template>
  <div class="filters-panel">
    <div class="filters-header">
      <h2>Фильтры</h2>
      <button 
        @click="handleReset" 
        class="btn-reset-filters"
        :disabled="!hasActiveFilters"
      >
        Сбросить фильтры
      </button>
    </div>
    
    <div class="filters-content">
      <!-- Секция: Этапы -->
      <div
        v-if="!hideStages"
        class="filter-section"
      >
        <h3 class="section-title">
          <span class="section-icon">📊</span>
          Этапы
        </h3>
        <div class="section-content">
          <StageSelect
            :selected="stages"
            :stages="stageOptions"
            placeholder="Выберите этапы"
            @update:selected="handleStagesUpdate"
            @change="handleStageChange"
          />
        </div>
      </div>
      
      <!-- Секция: Сотрудники -->
      <div class="filter-section">
        <h3 class="section-title">
          <span class="section-icon">👥</span>
          Сотрудники сектора 1С
        </h3>
        <div class="section-content">
          <EmployeeSelect
            :selected="employees"
            @update:selected="handleEmployeesChange"
          />
        </div>
      </div>
      
      <!-- Секция: Период -->
      <div class="filter-section">
        <!-- Выбор недели (барабан прокрутки) -->
        <div v-if="weekPickerMode" class="section-content">
          <WeekPicker
            :selectedWeek="selectedWeek"
            :weeksCount="weeksCount"
            @update:selectedWeek="handleWeekChange"
            @change="handleWeekChange"
          />
        </div>
        
        <!-- Обычный выбор периода -->
        <template v-else>
          <h3 class="section-title">
            <span class="section-icon">📅</span>
            Период
          </h3>
          <div class="section-content">
            <select
              :value="dateRange"
              @change="handleDateRangeChange($event.target.value)"
              class="date-range-select"
            >
              <option value="last-week">Последняя неделя</option>
              <option value="last-2-weeks">Последние 2 недели</option>
              <option value="last-month">Последний месяц</option>
              <option value="custom">Произвольный период</option>
            </select>
            
            <!-- Календарь для произвольного периода -->
            <div v-if="dateRange === 'custom'" class="custom-date-range">
              <div class="date-range-inputs">
                <div class="date-input-group">
                  <label>С:</label>
                  <input
                    type="date"
                    :value="customDateRange.startDate"
                    @change="handleCustomDateChange('startDate', $event.target.value)"
                    :max="customDateRange.endDate || maxDate"
                    class="date-input"
                  />
                </div>
                <div class="date-input-group">
                  <label>По:</label>
                  <input
                    type="date"
                    :value="customDateRange.endDate"
                    @change="handleCustomDateChange('endDate', $event.target.value)"
                    :min="customDateRange.startDate || minDate"
                    :max="maxDate"
                    class="date-input"
                  />
                </div>
              </div>
              <small v-if="dateRangeError" class="filter-error">{{ dateRangeError }}</small>
              <small v-else class="filter-hint">
                Выберите начальную и конечную дату для отображения данных
              </small>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Компонент панели фильтров
 * 
 * Группировка и структурирование фильтров с визуальными секциями
 */

import { computed, ref } from 'vue';
import EmployeeSelect from './EmployeeSelect.vue';
import StageSelect from './StageSelect.vue';
import WeekPicker from './WeekPicker.vue';

const props = defineProps({
  /**
   * Фильтр по этапам
   */
  stages: {
    type: Object,
    required: true,
    default: () => ({
      formed: true,
      review: true,
      execution: true
    })
  },
  /**
   * Фильтр по сотрудникам
   */
  employees: {
    type: Array,
    default: () => ['all']
  },
  /**
   * Фильтр по датам
   */
  dateRange: {
    type: String,
    default: 'last-week'
  },
  /**
   * Произвольный период
   */
  customDateRange: {
    type: Object,
    default: () => ({
      startDate: null,
      endDate: null
    })
  },
  /**
   * Есть ли активные фильтры
   */
  hasActiveFilters: {
    type: Boolean,
    default: false
  },
  /**
   * Скрыть выбор этапов (для модулей, где все стадии всегда отображаются)
   */
  hideStages: {
    type: Boolean,
    default: false
  },
  /**
   * Режим выбора недели (барабан прокрутки вместо обычного выбора периода)
   */
  weekPickerMode: {
    type: Boolean,
    default: false
  },
  /**
   * Выбранная неделя (объект с weekNumber, startUtc, endUtc)
   */
  selectedWeek: {
    type: Object,
    default: null
  },
  /**
   * Количество недель для отображения в барабане
   */
  weeksCount: {
    type: Number,
    default: 52
  }
});

const emit = defineEmits([
  'update:stages',
  'update:employees',
  'update:dateRange',
  'update:customDateRange',
  'update:selectedWeek',
  'reset',
  'apply'
]);

// Опции стадий с цветами
const stageOptions = [
  { id: 'formed', name: 'Сформировано обращение', color: 'var(--b24-primary, #007bff)' },
  { id: 'review', name: 'Рассмотрение ТЗ', color: 'var(--b24-warning, #ffc107)' },
  { id: 'execution', name: 'Исполнение', color: 'var(--b24-success, #28a745)' }
];

// Ошибка валидации дат
const dateRangeError = ref(null);

// Минимальная и максимальная даты
const minDate = computed(() => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().split('T')[0];
});

const maxDate = computed(() => {
  return new Date().toISOString().split('T')[0];
});

/**
 * Обработка обновления стадий
 */
function handleStagesUpdate(newStages) {
  emit('update:stages', newStages);
  emit('apply');
}

/**
 * Обработка изменения стадии
 */
function handleStageChange(stageId, isChecked) {
  // Это событие приходит из StageSelect, но обновление уже произошло через handleStagesUpdate
  emit('apply');
}

/**
 * Обработка изменения сотрудников
 */
function handleEmployeesChange(employees) {
  emit('update:employees', employees);
  emit('apply');
}

/**
 * Обработка изменения периода
 */
function handleDateRangeChange(value) {
  emit('update:dateRange', value);
  dateRangeError.value = null;
  emit('apply');
}

/**
 * Обработка изменения произвольного периода
 */
function handleCustomDateChange(field, value) {
  const newRange = { ...props.customDateRange };
  newRange[field] = value;
  
  // Валидация
  if (newRange.startDate && newRange.endDate) {
    const start = new Date(newRange.startDate);
    const end = new Date(newRange.endDate);
    
    if (start > end) {
      dateRangeError.value = 'Начальная дата не может быть больше конечной';
      return;
    }
    
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      dateRangeError.value = 'Период не может превышать 365 дней';
      return;
    }
  }
  
  dateRangeError.value = null;
  emit('update:customDateRange', newRange);
  emit('apply');
}

/**
 * Обработка изменения недели
 */
function handleWeekChange(week) {
  emit('update:selectedWeek', week);
  emit('apply');
}

/**
 * Обработка сброса фильтров
 */
function handleReset() {
  dateRangeError.value = null;
  emit('reset');
}
</script>

<style scoped>
.filters-panel {
  background-color: var(--b24-bg-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  border: 1px solid var(--b24-border-light);
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.filters-header h2 {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--b24-text-primary);
}

.btn-reset-filters {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--b24-danger);
  color: var(--b24-text-inverse);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: background-color var(--transition-base);
}

.btn-reset-filters:hover:not(:disabled) {
  background-color: var(--b24-danger-hover);
}

.btn-reset-filters:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.filters-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-md);
}

.filter-section {
  background-color: var(--b24-bg-white);
  border: 1px solid var(--b24-border-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--b24-text-primary);
}

.section-icon {
  font-size: 16px;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.checkbox-item input[type="checkbox"] {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.date-range-select {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--b24-border-medium);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background-color: var(--b24-bg-white);
}

.custom-date-range {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
}

.date-range-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
}

.date-input-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.date-input-group label {
  font-size: var(--font-size-xs);
  color: var(--b24-text-secondary);
  font-weight: 500;
}

.date-input {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--b24-border-medium);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background-color: var(--b24-bg-white);
}

.filter-error {
  color: var(--b24-danger);
  font-size: var(--font-size-xs);
  display: block;
}

.filter-hint {
  color: var(--b24-text-secondary);
  font-size: var(--font-size-xs);
  display: block;
}

/* Адаптивность */
@media (max-width: 768px) {
  .filters-content {
    grid-template-columns: 1fr;
  }
  
  .date-range-inputs {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 769px) and (max-width: 1023px) {
  .filters-content {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .filters-content {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>

