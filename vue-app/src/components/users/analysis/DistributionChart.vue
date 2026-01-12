<template>
  <div class="distribution-chart-container">
    <div class="chart-header">
      <h3 class="chart-title">{{ title }}</h3>
      <div class="chart-controls">
        <select v-model="selectedType" @change="updateChart" class="chart-type-select">
          <option value="activity_types">Типы активности</option>
          <option value="devices">Устройства</option>
          <option value="browsers">Браузеры</option>
          <option value="departments">Отделы</option>
          <option value="pages">Страницы</option>
        </select>

        <select v-model="selectedChartType" @change="updateChart" class="chart-style-select">
          <option value="doughnut">Круговая</option>
          <option value="bar">Столбчатая</option>
          <option value="pie">Секторная</option>
        </select>
      </div>
    </div>

    <div class="chart-wrapper" :class="{ 'loading': loading }">
      <div v-if="loading" class="chart-loading">
        Загрузка диаграммы...
      </div>

      <div v-else-if="error" class="chart-error">
        {{ error }}
      </div>

      <div v-else-if="!hasData" class="chart-empty">
        Нет данных для отображения
      </div>

      <div v-else class="chart-canvas-container">
        <canvas ref="chartCanvas"></canvas>
      </div>
    </div>

    <div v-if="showLegend && legendItems.length > 0" class="chart-legend">
      <div class="legend-item" v-for="item in legendItems" :key="item.label">
        <div class="legend-color" :style="{ backgroundColor: item.color }"></div>
        <span class="legend-label">{{ item.label }}</span>
        <span class="legend-value">{{ item.value }} ({{ item.percentage.toFixed(1) }}%)</span>
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
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut, Bar, Pie } from 'vue-chartjs';
import { VisualizationHelpers } from '@/utils/visualization-helpers.js';

// Регистрируем компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default {
  name: 'DistributionChart',
  props: {
    data: {
      type: Array,
      default: () => []
    },
    type: {
      type: String,
      default: 'activity_types',
      validator: (value) => ['activity_types', 'devices', 'browsers', 'departments', 'pages'].includes(value)
    },
    chartType: {
      type: String,
      default: 'doughnut',
      validator: (value) => ['doughnut', 'bar', 'pie'].includes(value)
    },
    title: {
      type: String,
      default: 'Распределение'
    },
    height: {
      type: Number,
      default: 300
    },
    showLegend: {
      type: Boolean,
      default: true
    },
    maxItems: {
      type: Number,
      default: 10
    }
  },
  emits: ['segment-click', 'type-change'],
  setup(props, { emit }) {
    const chartCanvas = ref(null);
    const chartInstance = ref(null);
    const loading = ref(false);
    const error = ref(null);
    const selectedType = ref(props.type);
    const selectedChartType = ref(props.chartType);

    // Вычисляемые данные диаграммы
    const chartData = computed(() => {
      if (!props.data || props.data.length === 0) {
        return VisualizationHelpers.getEmptyDistributionData();
      }

      try {
        return VisualizationHelpers.prepareDistributionChartData(
          props.data,
          selectedType.value,
          selectedChartType.value
        );
      } catch (err) {
        console.error('[DistributionChart] Error preparing chart data:', err);
        error.value = 'Ошибка подготовки данных диаграммы';
        return VisualizationHelpers.getEmptyDistributionData();
      }
    });

    // Проверка наличия данных
    const hasData = computed(() => {
      return chartData.value.datasets &&
             chartData.value.datasets.length > 0 &&
             chartData.value.datasets[0].data &&
             chartData.value.datasets[0].data.length > 0 &&
             chartData.value.datasets[0].data.some(val => val > 0);
    });

    // Элементы легенды с процентами
    const legendItems = computed(() => {
      if (!hasData.value || !chartData.value.labels) return [];

      const labels = chartData.value.labels;
      const data = chartData.value.datasets[0].data;
      const colors = chartData.value.datasets[0].backgroundColor;
      const total = data.reduce((sum, val) => sum + val, 0);

      return labels.map((label, index) => ({
        label: label.length > 20 ? label.substring(0, 20) + '...' : label,
        fullLabel: label,
        value: data[index],
        percentage: total > 0 ? (data[index] / total) * 100 : 0,
        color: colors[index]
      })).sort((a, b) => b.value - a.value);
    });

    // Создание диаграммы
    const createChart = () => {
      if (!chartCanvas.value || !hasData.value) return;

      destroyChart(); // Уничтожаем предыдущую диаграмму

      const ctx = chartCanvas.value.getContext('2d');

      // Проверяем, что контекст canvas доступен
      if (!ctx) {
        console.error('[DistributionChart] Canvas context not available');
        error.value = 'Ошибка инициализации диаграммы';
        return;
      }

      try {
        const ChartComponent = getChartComponent(selectedChartType.value);

        chartInstance.value = new ChartComponent({
          ctx,
          data: chartData.value,
          options: getChartOptions()
        });
      } catch (err) {
        console.error('[DistributionChart] Error creating chart:', err);
        error.value = 'Ошибка создания диаграммы';
        chartInstance.value = null;
      }
    };

    // Получение компонента диаграммы
    const getChartComponent = (type) => {
      switch (type) {
        case 'bar': return Bar;
        case 'pie': return Pie;
        case 'doughnut':
        default: return Doughnut;
      }
    };

    // Получение опций диаграммы
    const getChartOptions = () => {
      const baseOptions = {
        responsive: true,
        devicePixelRatio: 1, // Предотвращает проблемы с высоким DPI
        animation: {
          duration: 300, // Уменьшаем анимацию для производительности
          easing: 'easeOutQuart'
        },
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false // Используем кастомную легенду
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
        onClick: handleChartClick
      };

      // Специфические опции для разных типов диаграмм
      if (selectedChartType.value === 'bar') {
        baseOptions.scales = {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        };
      }

      if (selectedChartType.value === 'doughnut' || selectedChartType.value === 'pie') {
        baseOptions.plugins.tooltip.callbacks.title = (contexts) => {
          return contexts[0]?.label || '';
        };
      }

      return baseOptions;
    };

    // Обработчик клика по сегменту диаграммы
    const handleChartClick = (event, elements) => {
      if (elements.length > 0) {
        const dataIndex = elements[0].index;
        const label = chartData.value.labels[dataIndex];
        const value = chartData.value.datasets[0].data[dataIndex];

        emit('segment-click', {
          type: selectedType.value,
          label,
          value,
          index: dataIndex
        });
      }
    };

    // Обновление диаграммы
    const updateChart = async () => {
      loading.value = true;
      error.value = null;

      try {
        await nextTick(); // Ждем обновления данных
        destroyChart();
        createChart();
      } catch (err) {
        console.error('[DistributionChart] Error updating chart:', err);
        error.value = 'Ошибка обновления диаграммы';
      } finally {
        loading.value = false;
      }
    };

    // Уничтожение диаграммы
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

    watch(() => props.type, (newValue) => {
      selectedType.value = newValue;
    });

    watch(() => props.chartType, (newValue) => {
      selectedChartType.value = newValue;
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
      selectedType,
      selectedChartType,
      hasData,
      legendItems,
      updateChart
    };
  }
};
</script>

<style scoped>
.distribution-chart-container {
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

.chart-type-select,
.chart-style-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.chart-type-select:focus,
.chart-style-select:focus {
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
.chart-error,
.chart-empty {
  text-align: center;
  color: #666;
  font-size: 14px;
}

.chart-error {
  color: #dc3545;
}

.chart-empty {
  color: #999;
  font-style: italic;
}

.chart-canvas-container {
  height: 100%;
  width: 100%;
}

.chart-legend {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #eee;
  max-height: 200px;
  overflow-y: auto;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 4px 0;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-label {
  flex: 1;
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-value {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
  .distribution-chart-container {
    padding: 15px;
  }

  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .chart-controls {
    width: 100%;
    justify-content: space-between;
  }

  .chart-type-select,
  .chart-style-select {
    flex: 1;
  }

  .chart-wrapper {
    height: 250px;
  }

  .legend-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .legend-label {
    width: 100%;
  }
}
</style>