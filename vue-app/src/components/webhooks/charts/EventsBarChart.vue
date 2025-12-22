<template>
  <div class="chart-container">
    <div class="chart-header">
      <h4>События по типам</h4>
    </div>
    <div class="chart-wrapper">
      <Bar 
        v-if="chartData"
        :data="chartData" 
        :options="chartOptions"
        :height="300"
      />
      <div v-else class="chart-empty">
        <p>Нет данных для отображения</p>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import { chartColors } from '@/utils/chart-config.js';

export default {
  name: 'EventsBarChart',
  components: {
    Bar
  },
  props: {
    logs: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  setup(props) {
    // Подсчёт событий по типам
    const eventCounts = computed(() => {
      const counts = {};
      
      props.logs.forEach(log => {
        if (log.event) {
          counts[log.event] = (counts[log.event] || 0) + 1;
        }
      });
      
      // Сортировка по количеству (по убыванию)
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {});
    });
    
    // Данные для графика
    const chartData = computed(() => {
      if (Object.keys(eventCounts.value).length === 0) {
        return null;
      }
      
      const labels = Object.keys(eventCounts.value);
      const data = Object.values(eventCounts.value);
      
      // Генерация цветов
      const colors = labels.map((_, index) => {
        const colorPalette = [
          chartColors.primary,
          chartColors.success,
          chartColors.info,
          chartColors.warning,
          chartColors.danger
        ];
        return colorPalette[index % colorPalette.length];
      });
      
      return {
        labels,
        datasets: [{
          label: 'Количество событий',
          data,
          backgroundColor: colors.map(color => color + '80'), // 50% прозрачности
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 4
        }]
      };
    });
    
    // Опции графика
    const chartOptions = computed(() => {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Тип события'
            },
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Количество'
            },
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      };
    });
    
    return {
      chartData,
      chartOptions
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
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6c757d;
}

@media (max-width: 768px) {
  .chart-wrapper {
    height: 250px;
  }
}
</style>

