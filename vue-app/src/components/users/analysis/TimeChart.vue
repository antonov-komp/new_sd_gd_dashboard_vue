<template>
  <div class="time-chart-container">
    <div class="chart-header">
      <h3 class="chart-title">{{ title }}</h3>
      <div class="chart-controls">
        <select v-model="selectedGroupBy" @change="updateChart" class="group-by-select">
          <option value="hour">По часам</option>
          <option value="day">По дням</option>
          <option value="week">По неделям</option>
          <option value="month">По месяцам</option>
        </select>
      </div>
    </div>

    <div class="chart-wrapper" :class="{ 'loading': loading }">
      <div v-if="loading" class="chart-loading">
        Загрузка графика...
      </div>

      <div v-else-if="error" class="chart-error">
        {{ error }}
      </div>

      <div v-else class="chart-canvas-container">
        <canvas ref="chartCanvas"></canvas>
      </div>
    </div>

    <div v-if="showStats && chartData.labels.length > 0" class="chart-stats">
      <div class="stat-item">
        <span class="stat-label">Всего точек:</span>
        <span class="stat-value">{{ chartData.labels.length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Максимум:</span>
        <span class="stat-value">{{ maxValue }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Среднее:</span>
        <span class="stat-value">{{ averageValue.toFixed(1) }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'vue-chartjs';
import { VisualizationHelpers } from '@/utils/visualization-helpers.js';

// Регистрируем компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default {
  name: 'TimeChart',
  props: {
    data: {
      type: Array,
      default: () => []
    },
    filters: {
      type: Object,
      default: () => ({})
    },
    title: {
      type: String,
      default: 'Активность по времени'
    },
    height: {
      type: Number,
      default: 300
    },
    interactive: {
      type: Boolean,
      default: true
    },
    showStats: {
      type: Boolean,
      default: true
    },
    groupBy: {
      type: String,
      default: 'day',
      validator: (value) => ['hour', 'day', 'week', 'month'].includes(value)
    }
  },
  emits: ['time-range-change', 'data-point-click'],
  setup(props, { emit }) {
    const chartCanvas = ref(null);
    const chartInstance = ref(null);
    const loading = ref(false);
    const error = ref(null);
    const selectedGroupBy = ref(props.groupBy);

    // Вычисляемые данные графика
    const chartData = computed(() => {
      if (!props.data || props.data.length === 0) {
        return VisualizationHelpers.getEmptyTimeChartData();
      }

      try {
        return VisualizationHelpers.prepareTimeChartData(
          props.data,
          selectedGroupBy.value,
          { ActivityAnalyticsService: null } // Можно передать если нужно
        );
      } catch (err) {
        console.error('[TimeChart] Error preparing chart data:', err);
        error.value = 'Ошибка подготовки данных графика';
        return VisualizationHelpers.getEmptyTimeChartData();
      }
    });

    // Статистика графика
    const maxValue = computed(() => {
      if (!chartData.value.datasets || chartData.value.datasets.length === 0) return 0;
      return Math.max(...chartData.value.datasets[0].data);
    });

    const averageValue = computed(() => {
      if (!chartData.value.datasets || chartData.value.datasets.length === 0) return 0;
      const data = chartData.value.datasets[0].data;
      return data.length > 0 ? data.reduce((sum, val) => sum + val, 0) / data.length : 0;
    });

    // Создание графика
    const createChart = () => {
      if (!chartCanvas.value || !chartData.value) return;

      destroyChart(); // Уничтожаем предыдущий график

      const ctx = chartCanvas.value.getContext('2d');

      chartInstance.value = new ChartJS(ctx, {
        type: 'line',
        data: chartData.value,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          height: props.height,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              enabled: props.interactive,
              callbacks: {
                label: (context) => {
                  const label = context.dataset.label || '';
                  const value = context.parsed.y;
                  return `${label}: ${value}`;
                },
                title: (contexts) => {
                  if (contexts.length === 0) return '';
                  return contexts[0].label;
                }
              }
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: getXAxisLabel()
              }
            },
            y: {
              display: true,
              beginAtZero: true,
              title: {
                display: true,
                text: 'Количество действий'
              },
              ticks: {
                precision: 0
              }
            }
          },
          onClick: props.interactive ? handleChartClick : null,
          onHover: props.interactive ? handleChartHover : null
        }
      });
    };

    // Обработчик клика по графику
    const handleChartClick = (event, elements) => {
      if (elements.length > 0) {
        const dataIndex = elements[0].index;
        const label = chartData.value.labels[dataIndex];
        const value = chartData.value.datasets[0].data[dataIndex];

        emit('data-point-click', {
          label,
          value,
          groupBy: selectedGroupBy.value,
          index: dataIndex
        });
      }
    };

    // Обработчик наведения на график
    const handleChartHover = (event, elements) => {
      event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    };

    // Получение метки оси X
    const getXAxisLabel = () => {
      switch (selectedGroupBy.value) {
        case 'hour': return 'Часы';
        case 'day': return 'Дни';
        case 'week': return 'Недели';
        case 'month': return 'Месяцы';
        default: return 'Время';
      }
    };

    // Обновление графика
    const updateChart = async () => {
      if (chartInstance.value) {
        loading.value = true;
        error.value = null;

        try {
          await nextTick(); // Ждем обновления данных
          chartInstance.value.data = chartData.value;
          chartInstance.value.options.scales.x.title.text = getXAxisLabel();
          chartInstance.value.update('none'); // Плавное обновление без анимации
        } catch (err) {
          console.error('[TimeChart] Error updating chart:', err);
          error.value = 'Ошибка обновления графика';
        } finally {
          loading.value = false;
        }
      }
    };

    // Уничтожение графика
    const destroyChart = () => {
      if (chartInstance.value) {
        chartInstance.value.destroy();
        chartInstance.value = null;
      }
    };

    // Наблюдатели
    watch(() => props.data, () => {
      updateChart();
    }, { deep: true });

    watch(() => props.groupBy, (newValue) => {
      selectedGroupBy.value = newValue;
    });

    // Жизненный цикл
    onMounted(() => {
      createChart();
    });

    onUnmounted(() => {
      destroyChart();
    });

    return {
      chartCanvas,
      chartData,
      loading,
      error,
      selectedGroupBy,
      maxValue,
      averageValue,
      updateChart
    };
  }
};
</script>

<style scoped>
.time-chart-container {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.chart-controls {
  display: flex;
  gap: 10px;
}

.group-by-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.group-by-select:focus {
  outline: none;
  border-color: #2196F3;
}

.chart-wrapper {
  position: relative;
  height: 300px;
}

.chart-wrapper.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9f9f9;
}

.chart-loading,
.chart-error {
  text-align: center;
  color: #666;
  font-size: 14px;
}

.chart-error {
  color: #dc3545;
}

.chart-canvas-container {
  height: 100%;
  width: 100%;
}

.chart-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #2196F3;
}

/* Responsive */
@media (max-width: 768px) {
  .time-chart-container {
    padding: 15px;
  }

  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .chart-wrapper {
    height: 250px;
  }

  .chart-stats {
    flex-direction: column;
    gap: 10px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    text-align: left;
  }
}
</style>