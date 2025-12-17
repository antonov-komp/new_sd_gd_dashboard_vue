<template>
  <div class="ac-chart">
    <header class="ac-chart__header">
      <div>
        <h2 class="ac-chart__title">График приёма и закрытий сектора 1С</h2>
        <p class="ac-chart__subtitle">
          Неделя {{ meta?.weekNumber ?? '—' }} · 
          {{ meta?.weekStartUtc || '—' }} — {{ meta?.weekEndUtc || '—' }} (UTC)
        </p>
      </div>

      <div class="ac-chart__controls">
        <div class="chart-type-selector">
          <button
            v-for="type in chartTypes"
            :key="type.value"
            :class="['chart-type-btn', { active: chartType === type.value }]"
            @click="chartType = type.value"
          >
            <span class="chart-type-icon">{{ type.icon }}</span>
            <span class="chart-type-label">{{ type.label }}</span>
          </button>
        </div>
      </div>
    </header>

    <section class="ac-chart__summary">
      <!-- TASK-049: Используем data напрямую для summary-карточек (одна неделя) -->
      <div class="summary-card summary-card--new" @click="handleSummaryClick('new')">
        <div class="summary-card__label">Новые за неделю</div>
        <div class="summary-card__value">{{ data.newTickets ?? 0 }}</div>
      </div>
      <!-- TASK-047: Три цифры для закрытых тикетов (компактный вариант) -->
      <div class="summary-card summary-card--closed-breakdown" @click="handleSummaryClick('closed')">
        <div class="summary-card__label">Закрытые за неделю</div>
        <div class="summary-card__value-main">{{ data.closedTickets ?? 0 }}</div>
        <div class="summary-card__breakdown">
          <div class="breakdown-item breakdown-item--this-week">
            <span class="breakdown-item__icon">✓</span>
            <span class="breakdown-item__value">{{ data.closedTicketsCreatedThisWeek ?? 0 }}</span>
            <span class="breakdown-item__label">этой неделей</span>
          </div>
          <div class="breakdown-item breakdown-item--other-week">
            <span class="breakdown-item__icon">↻</span>
            <span class="breakdown-item__value">{{ data.closedTicketsCreatedOtherWeek ?? 0 }}</span>
            <span class="breakdown-item__label">другой неделей</span>
          </div>
        </div>
      </div>
      <!-- TASK-047: Три цифры для переходящих тикетов (компактный вариант) -->
      <div class="summary-card summary-card--carryover-breakdown" @click="handleSummaryClick('carryover')">
        <div class="summary-card__label">Переходящие</div>
        <div class="summary-card__value-main">{{ data.carryoverTickets ?? 0 }}</div>
        <div class="summary-card__breakdown">
          <div class="breakdown-item breakdown-item--this-week">
            <span class="breakdown-item__icon">✓</span>
            <span class="breakdown-item__value">{{ data.carryoverTicketsCreatedThisWeek ?? 0 }}</span>
            <span class="breakdown-item__label">этой недели</span>
          </div>
          <div class="breakdown-item breakdown-item--other-week">
            <span class="breakdown-item__icon">↻</span>
            <span class="breakdown-item__value">{{ data.carryoverTicketsCreatedOtherWeek ?? 0 }}</span>
            <span class="breakdown-item__label">предыдущих</span>
          </div>
        </div>
      </div>
      <div class="summary-card summary-card--stages">
        <div class="summary-card__label">Закрытия по стадиям</div>
        <div class="summary-card__tags">
          <span
            v-for="stage in data.stages || []"
            :key="stage.stageId"
            class="stage-tag"
          >
            {{ stage.stageName || stage.stageId }} — {{ stage.count }}
          </span>
          <span v-if="!data.stages || data.stages.length === 0" class="stage-tag stage-tag--empty">
            Нет данных
          </span>
        </div>
      </div>
    </section>

    <div class="ac-chart__body">
      <component
        :is="chartComponent"
        :data="chartData"
        :options="chartOptions"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { Line, Bar, Doughnut } from 'vue-chartjs';
import { chartColors } from '@/utils/chart-config.js';

const props = defineProps({
  meta: {
    type: Object,
    default: () => ({
      weekNumber: null,
      weekStartUtc: null,
      weekEndUtc: null
    })
  },
  data: {
    type: Object,
    default: () => ({
      newTickets: 0,
      closedTickets: 0,
      closedTicketsCreatedThisWeek: 0, // TASK-047
      closedTicketsCreatedOtherWeek: 0, // TASK-047
      carryoverTickets: 0,
      carryoverTicketsCreatedThisWeek: 0, // TASK-047
      carryoverTicketsCreatedOtherWeek: 0, // TASK-047
      series: { // TASK-049: массивы с одним элементом для выбранной недели
        new: [0],
        closed: [0],
        closedCreatedThisWeek: [0],
        closedCreatedOtherWeek: [0],
        carryover: [0],
        carryoverCreatedThisWeek: [0],
        carryoverCreatedOtherWeek: [0]
      },
      stages: [],
      responsible: []
    })
  }
});

const emit = defineEmits(['open-responsible', 'open-stages', 'open-carryover']);

const chartTypes = [
  { value: 'line', label: 'Линейный', icon: '📈' },
  { value: 'bar', label: 'Столбчатый', icon: '📊' },
  { value: 'doughnut', label: 'Круговая', icon: '🍩' }
];

const chartType = ref('line');

const weekLabel = computed(() => props.meta?.weekNumber ?? '—');

const lineBarData = computed(() => {
  // TASK-049: Получаем метаданные о выбранной неделе
  const weekNumber = props.meta?.weekNumber;
  const weekLabel = weekNumber ? `Неделя ${weekNumber}` : 'Неделя';
  const labels = [weekLabel];
  
  // TASK-049: Получаем серии данных для одной недели (массивы с одним элементом)
  const newSeries = [props.data.series?.new?.[0] ?? props.data.newTickets ?? 0];
  const closedSeries = [props.data.series?.closed?.[0] ?? props.data.closedTickets ?? 0];
  const closedCreatedThisWeekSeries = [props.data.series?.closedCreatedThisWeek?.[0] ?? props.data.closedTicketsCreatedThisWeek ?? 0];
  const closedCreatedOtherWeekSeries = [props.data.series?.closedCreatedOtherWeek?.[0] ?? props.data.closedTicketsCreatedOtherWeek ?? 0];
  const carryoverSeries = [props.data.series?.carryover?.[0] ?? props.data.carryoverTickets ?? 0];
  const carryoverCreatedThisWeekSeries = [props.data.series?.carryoverCreatedThisWeek?.[0] ?? props.data.carryoverTicketsCreatedThisWeek ?? 0];
  const carryoverCreatedOtherWeekSeries = [props.data.series?.carryoverCreatedOtherWeek?.[0] ?? props.data.carryoverTicketsCreatedOtherWeek ?? 0];

  return {
    labels,
    datasets: [
      {
        label: 'Новые',
        data: newSeries,
        backgroundColor: chartColors.primary,
        borderColor: chartColors.primary,
        tension: 0.3,
        fill: false
      },
      {
        label: 'Закрытые (все)',
        data: closedSeries,
        backgroundColor: chartColors.success,
        borderColor: chartColors.success,
        tension: 0.3,
        fill: false
      },
      {
        label: 'Закрытые (созданы этой неделей)',
        data: closedCreatedThisWeekSeries,
        backgroundColor: chartColors.successLight,
        borderColor: chartColors.successLight,
        tension: 0.3,
        fill: false,
        borderDash: [5, 5] // Пунктирная линия
      },
      {
        label: 'Закрытые (созданы другой неделей)',
        data: closedCreatedOtherWeekSeries,
        backgroundColor: chartColors.warning,
        borderColor: chartColors.warning,
        tension: 0.3,
        fill: false,
        borderDash: [5, 5] // Пунктирная линия
      },
      {
        label: 'Переходящие (все)',
        data: carryoverSeries,
        backgroundColor: chartColors.carryover,
        borderColor: chartColors.carryover,
        tension: 0.3,
        fill: false
      },
      {
        label: 'Переходящие (созданы этой неделей)',
        data: carryoverCreatedThisWeekSeries,
        backgroundColor: chartColors.carryoverLight,
        borderColor: chartColors.carryoverLight,
        tension: 0.3,
        fill: false,
        borderDash: [5, 5] // Пунктирная линия
      },
      {
        label: 'Переходящие (созданы другой неделей)',
        data: carryoverCreatedOtherWeekSeries,
        backgroundColor: chartColors.carryoverDark,
        borderColor: chartColors.carryoverDark,
        tension: 0.3,
        fill: false,
        borderDash: [5, 5] // Пунктирная линия
      }
    ]
  };
});

const doughnutData = computed(() => {
  // TASK-049: Используем data напрямую для круговой диаграммы (одна неделя)
  return {
    labels: ['Новые', 'Закрытые', 'Переходящие'],
    datasets: [
      {
        data: [
          props.data.newTickets ?? 0,
          props.data.closedTickets ?? 0,
          props.data.carryoverTickets ?? 0
        ],
        backgroundColor: [chartColors.primary, chartColors.success, chartColors.carryover],
        borderWidth: 1
      }
    ]
  };
});

const chartComponent = computed(() => {
  switch (chartType.value) {
    case 'line':
      return Line;
    case 'bar':
      return Bar;
    case 'doughnut':
      return Doughnut;
    default:
      return Line;
  }
});

const chartData = computed(() => (chartType.value === 'doughnut' ? doughnutData.value : lineBarData.value));

// TASK-049: Форматирование даты для tooltip
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
};

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      enabled: true,
      callbacks: {
        title: (items) => {
          // TASK-049: Показываем информацию о выбранной неделе в tooltip
          const weekNumber = props.meta?.weekNumber;
          const weekStartUtc = props.meta?.weekStartUtc;
          const weekEndUtc = props.meta?.weekEndUtc;
          if (weekNumber && weekStartUtc && weekEndUtc) {
            return `Неделя ${weekNumber} (${formatDate(weekStartUtc)} — ${formatDate(weekEndUtc)})`;
          }
          return items[0]?.label || '';
        }
      }
    },
    legend: { position: 'top' }
  },
  // TASK-049: Убран onClick обработчик - клики на точки графика не открывают попапы (как в TASK-048)
  scales: chartType.value === 'doughnut'
    ? {}
    : {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        }
      }
}));

// Обработчик клика на summary-карточки
// TASK-049: Используем data напрямую для проверки наличия данных (одна неделя)
const handleSummaryClick = (type) => {
  const newTickets = props.data?.newTickets ?? 0;
  const closedTickets = props.data?.closedTickets ?? 0;
  const carryoverTickets = props.data?.carryoverTickets ?? 0;
  
  if (type === 'new' && newTickets > 0) {
    emit('open-stages');
  } else if (type === 'closed' && closedTickets > 0) {
    if ((props.data?.responsible || []).length > 0) {
      emit('open-responsible');
    }
  } else if (type === 'carryover' && carryoverTickets > 0) {
    emit('open-carryover');
  }
};
</script>

<style scoped>
.ac-chart {
  padding: var(--spacing-lg, 20px);
  background: var(--b24-bg-white, #fff);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-md, 0 6px 20px rgba(0, 0, 0, 0.08));
}

.ac-chart__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.ac-chart__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--b24-text-primary, #111827);
}

.ac-chart__subtitle {
  margin: 4px 0 0;
  color: var(--b24-text-secondary, #6b7280);
  font-size: 14px;
}

.ac-chart__controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chart-type-selector {
  display: inline-flex;
  gap: 6px;
}

.chart-type-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--b24-border-light, #e5e7eb);
  background: var(--b24-bg, #f9fafb);
  cursor: pointer;
  transition: all 0.2s ease;
}

.chart-type-btn.active {
  background: var(--b24-primary, #007bff);
  color: var(--b24-text-inverse, #fff);
  border-color: var(--b24-primary, #007bff);
}

.chart-type-icon {
  font-size: 16px;
}

.ac-chart__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  border: 1px solid var(--b24-border-light, #e5e7eb);
  border-radius: var(--radius-md, 10px);
  padding: 12px;
  background: var(--b24-bg, #f9fafb);
  cursor: pointer;
  transition: all 0.2s ease;
}

.summary-card:hover {
  border-color: var(--b24-primary, #007bff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

.summary-card__label {
  color: var(--b24-text-secondary, #6b7280);
  font-size: 13px;
  margin-bottom: 6px;
}

.summary-card__value {
  font-size: 24px;
  font-weight: 700;
  color: var(--b24-text-primary, #111827);
}

.summary-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stage-tag {
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--b24-bg-white, #fff);
  border: 1px solid var(--b24-border-light, #e5e7eb);
  font-size: 12px;
}

.stage-tag--empty {
  color: var(--b24-text-secondary, #6b7280);
}

.ac-chart__body {
  min-height: 320px;
}

/* TASK-047: Компактная карточка с разбивкой закрытых тикетов */
.summary-card--closed-breakdown {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* TASK-047: Компактная карточка с разбивкой переходящих тикетов */
.summary-card--carryover-breakdown {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-card__value-main {
  font-size: 24px;
  font-weight: 700;
  color: var(--b24-primary, #007bff);
  line-height: 1.2;
  margin-bottom: 4px;
}

/* Компактный контейнер для разбивки */
.summary-card__breakdown {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

/* Компактный элемент разбивки */
.breakdown-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--b24-bg, #f9fafb);
}

.breakdown-item__icon {
  font-size: 14px;
  line-height: 1;
}

.breakdown-item--this-week .breakdown-item__icon {
  color: var(--b24-success, #28a745);
}

.breakdown-item--other-week .breakdown-item__icon {
  color: var(--b24-warning, #ffc107);
}

.breakdown-item__value {
  font-size: 13px;
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
}

.breakdown-item--this-week .breakdown-item__value {
  color: var(--b24-success, #28a745);
}

.breakdown-item--other-week .breakdown-item__value {
  color: var(--b24-warning, #ffc107);
}

.breakdown-item__label {
  font-size: 11px;
  color: var(--b24-text-secondary, #6b7280);
}

/* Адаптивность для мобильных устройств */
@media (max-width: 768px) {
  .summary-card__breakdown {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  
  .summary-card__value-main {
    font-size: 20px;
  }
}
</style>

