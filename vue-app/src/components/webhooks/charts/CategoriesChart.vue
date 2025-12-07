<template>
  <div class="chart-container">
    <div class="chart-header">
      <h4>Распределение по категориям</h4>
    </div>
    <div class="chart-wrapper">
      <Doughnut 
        v-if="chartData"
        :data="chartData" 
        :options="chartOptions"
        :height="300"
      />
      <div v-else class="chart-empty">
        <p>Нет данных для отображения</p>
      </div>
    </div>
    <div v-if="legendData.length > 0" class="chart-legend">
      <div
        v-for="(item, index) in legendData"
        :key="index"
        class="legend-item"
      >
        <span 
          class="legend-color" 
          :style="{ backgroundColor: item.color }"
        ></span>
        <span class="legend-label">{{ item.label }}</span>
        <span class="legend-value">{{ item.value }} ({{ item.percentage }}%)</span>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { Doughnut } from 'vue-chartjs';
import { chartColors } from '@/utils/chart-config.js';

export default {
  name: 'CategoriesChart',
  components: {
    Doughnut
  },
  props: {
    logs: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  setup(props) {
    const categoryLabels = {
      tasks: 'Задачи',
      'smart-processes': 'Смарт-процессы',
      errors: 'Ошибки'
    };
    
    const categoryColors = {
      tasks: chartColors.primary,
      'smart-processes': chartColors.success,
      errors: chartColors.danger
    };
    
    // Подсчёт по категориям
    const categoryCounts = computed(() => {
      const counts = {
        tasks: 0,
        'smart-processes': 0,
        errors: 0
      };
      
      props.logs.forEach(log => {
        if (log.category && counts.hasOwnProperty(log.category)) {
          counts[log.category]++;
        }
      });
      
      return counts;
    });
    
    const total = computed(() => {
      return Object.values(categoryCounts.value).reduce((sum, count) => sum + count, 0);
    });
    
    // Данные для графика
    const chartData = computed(() => {
      if (total.value === 0) {
        return null;
      }
      
      const labels = [];
      const data = [];
      const backgroundColor = [];
      
      Object.keys(categoryCounts.value).forEach(category => {
        if (categoryCounts.value[category] > 0) {
          labels.push(categoryLabels[category]);
          data.push(categoryCounts.value[category]);
          backgroundColor.push(categoryColors[category]);
        }
      });
      
      return {
        labels,
        datasets: [{
          data,
          backgroundColor,
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 4
        }]
      };
    });
    
    // Данные для легенды
    const legendData = computed(() => {
      return Object.keys(categoryCounts.value)
        .filter(category => categoryCounts.value[category] > 0)
        .map(category => ({
          label: categoryLabels[category],
          value: categoryCounts.value[category],
          percentage: total.value > 0 
            ? Math.round((categoryCounts.value[category] / total.value) * 100)
            : 0,
          color: categoryColors[category]
        }));
    });
    
    // Опции графика
    const chartOptions = computed(() => {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false // Используем кастомную легенду
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      };
    });
    
    return {
      chartData,
      chartOptions,
      legendData
    };
  }
};
</script>

<style scoped>
.chart-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.chart-header {
  margin-bottom: 20px;
}

.chart-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.chart-wrapper {
  height: 300px;
  position: relative;
  margin-bottom: 20px;
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6c757d;
}

.chart-legend {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
}

.legend-label {
  flex: 1;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.legend-value {
  font-size: 14px;
  color: #6c757d;
  font-weight: 600;
}

@media (max-width: 768px) {
  .chart-wrapper {
    height: 250px;
  }
}
</style>

