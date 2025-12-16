<template>
  <div class="ac-chart">
    <header class="ac-chart__header">
      <div>
        <h2 class="ac-chart__title">График приёма и закрытий сектора 1С</h2>
        <p class="ac-chart__subtitle">
          Неделя {{ weekLabel }} · {{ meta?.weekStartUtc || '—' }} — {{ meta?.weekEndUtc || '—' }} (UTC)
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
      <div class="summary-card summary-card--new">
        <div class="summary-card__label">Новые за неделю</div>
        <div class="summary-card__value">{{ data.newTickets ?? 0 }}</div>
      </div>
      <div class="summary-card summary-card--closed">
        <div class="summary-card__label">Закрытые за неделю</div>
        <div class="summary-card__value">{{ data.closedTickets ?? 0 }}</div>
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
    default: null
  },
  data: {
    type: Object,
    default: () => ({
      newTickets: 0,
      closedTickets: 0,
      series: { new: [0], closed: [0] },
      stages: [],
      responsible: []
    })
  }
});

const emit = defineEmits(['open-responsible', 'open-stages']);

const chartTypes = [
  { value: 'line', label: 'Линейный', icon: '📈' },
  { value: 'bar', label: 'Столбчатый', icon: '📊' },
  { value: 'doughnut', label: 'Круговая', icon: '🍩' }
];

const chartType = ref('line');

const weekLabel = computed(() => props.meta?.weekNumber ?? '—');

const lineBarData = computed(() => {
  const labels = ['Текущая неделя'];
  const newSeries = Array.isArray(props.data.series?.new) ? props.data.series.new : [props.data.newTickets || 0];
  const closedSeries = Array.isArray(props.data.series?.closed) ? props.data.series.closed : [props.data.closedTickets || 0];

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
        label: 'Закрытые',
        data: closedSeries,
        backgroundColor: chartColors.success,
        borderColor: chartColors.success,
        tension: 0.3,
        fill: false
      }
    ]
  };
});

const doughnutData = computed(() => ({
  labels: ['Новые', 'Закрытые'],
  datasets: [
    {
      data: [
        props.data.newTickets || 0,
        props.data.closedTickets || 0
      ],
      backgroundColor: [chartColors.primary, chartColors.success],
      borderWidth: 1
    }
  ]
}));

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

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: { enabled: true },
    legend: { position: 'top' }
  },
  onClick: (event, elements, chart) => {
    if (elements.length === 0) {
      return;
    }
    
    const element = elements[0];
    const datasetIndex = element.datasetIndex;
    const dataset = chart.data.datasets[datasetIndex];
    
    if (!dataset || !dataset.label) {
      return;
    }
    
    // Определяем тип по label
    if (dataset.label === 'Закрытые') {
      // Проверяем, есть ли данные для закрытых
      if ((props.data?.responsible || []).length > 0) {
        emit('open-responsible');
      }
    } else if (dataset.label === 'Новые') {
      // Проверяем, есть ли новые тикеты
      if ((props.data?.newTickets || 0) > 0) {
        emit('open-stages');
      }
    }
  },
  scales: chartType.value === 'doughnut'
    ? {}
    : {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
}));
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
</style>

