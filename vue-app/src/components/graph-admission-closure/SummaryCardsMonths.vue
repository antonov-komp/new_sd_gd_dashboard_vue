<template>
  <div class="summary-cards-months">
    <!-- Карточка "Новые за период" -->
    <div class="summary-card summary-card--new">
      <h3 class="card-title">Новые за период</h3>
      <div class="card-content">
        <div class="card-main-value">
          {{ formattedTotalNewTickets }}
          <span 
            v-if="newTicketsPercentage !== null"
            :class="['percentage-badge', newTicketsPercentage >= 0 ? 'positive' : 'negative']"
            :title="`Изменение относительно предыдущего периода: ${formatPercentage(newTicketsPercentage)}`"
          >
            {{ formatPercentage(newTicketsPercentage) }}
          </span>
        </div>
        <div class="card-month-breakdown">
          <div
            v-for="month in newTicketsByMonth"
            :key="`new-${month.month}`"
            class="month-item"
          >
            <span class="month-name">{{ month.monthName }}:</span>
            <span class="month-value">{{ formatNumber(month.count) }}</span>
          </div>
          <div v-if="newTicketsByMonth.length === 0" class="month-item month-item--empty">
            Нет данных
          </div>
        </div>
      </div>
    </div>

    <!-- Карточка "Закрытые всего" -->
    <div class="summary-card summary-card--closed">
      <h3 class="card-title">Закрытые всего</h3>
      <div class="card-content">
        <div class="card-main-value">
          {{ formatNumber(data.closedTickets || 0) }}
          <span 
            v-if="closedTicketsPercentage !== null"
            :class="['percentage-badge', closedTicketsPercentage >= 0 ? 'positive' : 'negative']"
            :title="`Изменение относительно предыдущего периода: ${formatPercentage(closedTicketsPercentage)}`"
          >
            {{ formatPercentage(closedTicketsPercentage) }}
          </span>
        </div>
        <div class="card-month-breakdown-hierarchical">
          <div
            v-for="month in closedTicketsByMonth"
            :key="`closed-${month.month}`"
            class="month-item-hierarchical"
          >
            <div class="month-header">
              <span class="month-name">{{ month.monthName }}:</span>
              <span class="month-value">{{ formatNumber(month.count || 0) }}</span>
            </div>
            <div class="month-breakdown">
              <div class="breakdown-item breakdown-this-week">
                <span class="breakdown-icon">✓</span>
                <span class="breakdown-label">этой неделей:</span>
                <span class="breakdown-value">{{ formatNumber(month.closedCreatedThisWeek || 0) }}</span>
              </div>
              <div class="breakdown-item breakdown-other-week">
                <span class="breakdown-icon">↻</span>
                <span class="breakdown-label">другой неделей:</span>
                <span class="breakdown-value">{{ formatNumber(month.closedCreatedOtherWeek || 0) }}</span>
              </div>
            </div>
          </div>
          <div v-if="closedTicketsByMonth.length === 0" class="month-item-hierarchical month-item--empty">
            Нет данных
          </div>
        </div>
      </div>
    </div>

    <!-- Карточка "Переходящие всего" -->
    <div class="summary-card summary-card--carryover">
      <h3 class="card-title">Переходящие всего</h3>
      <div class="card-content">
        <div class="card-main-value">
          {{ formatNumber(data.carryoverTickets || 0) }}
          <span 
            v-if="carryoverTicketsPercentage !== null"
            :class="['percentage-badge', carryoverTicketsPercentage >= 0 ? 'positive' : 'negative']"
            :title="`Изменение относительно предыдущего периода: ${formatPercentage(carryoverTicketsPercentage)}`"
          >
            {{ formatPercentage(carryoverTicketsPercentage) }}
          </span>
        </div>
        <div class="card-month-breakdown">
          <div
            v-for="month in carryoverTicketsByMonth"
            :key="`carryover-${month.month}`"
            class="month-item"
          >
            <span class="month-name">{{ month.monthName }}:</span>
            <span class="month-value">{{ formatNumber(month.count || 0) }}</span>
          </div>
          <div v-if="carryoverTicketsByMonth.length === 0" class="month-item month-item--empty">
            Нет данных
          </div>
        </div>
      </div>
    </div>

    <!-- Карточка "Закрытия по стадиям" -->
    <div class="summary-card summary-card--stages">
      <h3 class="card-title">Закрытия по стадиям</h3>
      <div class="card-content">
        <div class="stages-list">
          <div
            v-for="stage in data.stages || []"
            :key="stage.stageId"
            class="stage-item"
            :class="getStageClass(stage.stageId)"
          >
            <span class="stage-icon">{{ getStageIcon(stage.stageId) }}</span>
            <span class="stage-name">{{ stage.stageName || stage.stageId }}:</span>
            <span class="stage-value">{{ formatNumber(stage.count || 0) }}</span>
          </div>
          <div v-if="!data.stages || data.stages.length === 0" class="stage-item stage-item--empty">
            <span class="stage-name">Нет данных</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  data: {
    type: Object,
    required: true,
    default: () => ({
      newTickets: 0,
      newTicketsByMonth: [],
      closedTickets: 0,
      closedTicketsByMonth: [],
      carryoverTickets: 0,
      carryoverTicketsByMonth: [],
      stages: []
    })
  }
});

/**
 * Форматирование числа с разделителями
 */
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  
  if (num >= 1000) {
    return num.toLocaleString('ru-RU');
  }
  
  return num.toString();
}

/**
 * Форматирует процент для отображения
 * TASK-058-02: Функция для форматирования процентов
 * 
 * @param {number|null} value - Процент изменения
 * @returns {string} Отформатированный процент или пустая строка
 */
function formatPercentage(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Вычисляет процент изменения
 * TASK-058-02: Функция для расчета процентов с обработкой граничных случаев
 * 
 * @param {number} current - Текущее значение
 * @param {number|null|undefined} previous - Предыдущее значение
 * @returns {number|null} Процент изменения или null, если нельзя рассчитать
 */
function calculatePercentage(current, previous) {
  // Валидация входных данных
  if (typeof current !== 'number' || isNaN(current)) {
    return null;
  }
  
  if (previous === null || previous === undefined) {
    return null;
  }
  
  if (typeof previous !== 'number' || isNaN(previous)) {
    return null;
  }
  
  // Деление на ноль
  if (previous === 0) {
    return null;
  }
  
  // Нет изменения
  if (current === previous) {
    return 0;
  }
  
  // Расчет процента
  const percentage = ((current - previous) / previous) * 100;
  
  // Проверка на бесконечность или NaN
  if (!isFinite(percentage) || isNaN(percentage)) {
    return null;
  }
  
  return percentage;
}

const totalNewTickets = computed(() => {
  return props.data?.newTickets || 0;
});

const formattedTotalNewTickets = computed(() => {
  return formatNumber(totalNewTickets.value);
});

const newTicketsByMonth = computed(() => {
  return props.data?.newTicketsByMonth || [];
});

const closedTicketsByMonth = computed(() => {
  return props.data?.closedTicketsByMonth || [];
});

const carryoverTicketsByMonth = computed(() => {
  return props.data?.carryoverTicketsByMonth || [];
});

// TASK-058-02: Computed-свойства для расчета процентов
const newTicketsPercentage = computed(() => {
  // Безопасное получение текущего значения
  const current = typeof props.data?.newTickets === 'number' 
    ? props.data.newTickets 
    : (parseInt(props.data?.newTickets) || 0);
  
  // Безопасное получение предыдущего значения
  const previous = props.data?.previousPeriodData?.newTickets;
  
  return calculatePercentage(current, previous);
});

const closedTicketsPercentage = computed(() => {
  const current = typeof props.data?.closedTickets === 'number' 
    ? props.data.closedTickets 
    : (parseInt(props.data?.closedTickets) || 0);
  
  const previous = props.data?.previousPeriodData?.closedTickets;
  
  return calculatePercentage(current, previous);
});

const carryoverTicketsPercentage = computed(() => {
  const current = typeof props.data?.carryoverTickets === 'number' 
    ? props.data.carryoverTickets 
    : (parseInt(props.data?.carryoverTickets) || 0);
  
  const previous = props.data?.previousPeriodData?.carryoverTickets;
  
  return calculatePercentage(current, previous);
});

/**
 * Получить класс для стадии
 */
function getStageClass(stageId) {
  const classes = {
    'DT140_12:SUCCESS': 'stage-success',
    'DT140_12:FAIL': 'stage-fail',
    'DT140_12:UC_0GBU8Z': 'stage-other'
  };
  return classes[stageId] || '';
}

/**
 * Получить иконку для стадии
 */
function getStageIcon(stageId) {
  const icons = {
    'DT140_12:SUCCESS': '✓',
    'DT140_12:FAIL': '✗',
    'DT140_12:UC_0GBU8Z': '⚠'
  };
  return icons[stageId] || '•';
}
</script>

<style scoped>
.summary-cards-months {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg, 20px);
  margin-bottom: var(--spacing-xl, 24px);
}

.summary-card {
  background-color: var(--b24-bg-white, #ffffff);
  border: 1px solid var(--b24-border-light, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  padding: var(--spacing-lg, 20px);
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
  transition: all var(--transition-base, 0.2s);
}

.summary-card:hover {
  border-color: var(--b24-primary, #007bff);
  box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
}

.summary-card--new:hover {
  border-color: var(--b24-primary, #007bff);
}

.summary-card--closed:hover {
  border-color: var(--b24-success, #28a745);
}

.summary-card--carryover:hover {
  border-color: #ff9800;
}

.summary-card--stages:hover {
  border-color: var(--b24-warning, #ffc107);
}

.card-title {
  margin: 0 0 var(--spacing-md, 16px) 0;
  font-size: var(--font-size-lg, 16px);
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md, 16px);
}

.card-main-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--b24-primary, #007bff);
  line-height: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

/* TASK-058-02: Стили для процентных бейджей */
.percentage-badge {
  font-size: 16px;
  font-weight: 600;
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  cursor: help;
}

.percentage-badge:hover {
  background-color: rgba(0, 0, 0, 0.1);
  transform: scale(1.05);
}

.percentage-badge.positive {
  color: var(--b24-success, #28a745);
}

.percentage-badge.negative {
  color: var(--b24-danger, #dc3545);
}

.card-month-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs, 4px);
}

.month-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  font-size: var(--font-size-sm, 14px);
  color: var(--b24-text-secondary, #6b7280);
}

.month-item--empty {
  color: var(--b24-text-secondary, #6b7280);
  font-style: italic;
}

.month-name {
  font-weight: 500;
}

.month-value {
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
}

.card-month-breakdown-hierarchical {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md, 16px);
}

.month-item-hierarchical {
  padding-left: var(--spacing-md, 16px);
  border-left: 2px solid var(--b24-border-light, #e5e7eb);
}

.month-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  margin-bottom: var(--spacing-xs, 4px);
  font-size: var(--font-size-base, 14px);
}

.month-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs, 4px);
  margin-top: var(--spacing-xs, 4px);
  padding-left: var(--spacing-md, 16px);
}

.breakdown-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 4px);
  font-size: var(--font-size-sm, 14px);
}

.breakdown-icon {
  font-size: 16px;
  font-weight: 600;
}

.breakdown-this-week {
  color: var(--b24-success, #28a745);
}

.breakdown-other-week {
  color: var(--b24-warning, #ffc107);
}

.breakdown-label {
  color: var(--b24-text-secondary, #6b7280);
}

.breakdown-value {
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
}

.stages-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
}

.stage-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  font-size: var(--font-size-base, 14px);
  padding: var(--spacing-sm, 8px);
  border-radius: var(--radius-sm, 4px);
  background-color: var(--b24-bg-light, #f9fafb);
}

.stage-item--empty {
  color: var(--b24-text-secondary, #6b7280);
  font-style: italic;
}

.stage-icon {
  font-size: 18px;
  font-weight: 600;
}

.stage-name {
  flex: 1;
  color: var(--b24-text-primary, #111827);
}

.stage-value {
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
}

.stage-success {
  border-left: 3px solid var(--b24-success, #28a745);
}

.stage-fail {
  border-left: 3px solid var(--b24-danger, #dc3545);
}

.stage-other {
  border-left: 3px solid var(--b24-warning, #ffc107);
}

/* Адаптивность */
@media (max-width: 768px) {
  .summary-cards-months {
    grid-template-columns: 1fr;
  }
  
  .card-main-value {
    font-size: 28px;
    flex-wrap: wrap;
  }
  
  .percentage-badge {
    font-size: 14px;
    margin-left: 4px;
    padding: 1px 4px;
  }
  
  .month-item-hierarchical {
    padding-left: var(--spacing-sm, 8px);
  }
  
  .month-breakdown {
    padding-left: var(--spacing-sm, 8px);
  }
}
</style>

