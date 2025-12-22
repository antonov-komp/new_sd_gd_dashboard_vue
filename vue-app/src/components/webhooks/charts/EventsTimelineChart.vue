<template>
  <div class="chart-container">
    <div class="chart-header">
      <h4>События по времени</h4>
      <div class="chart-controls">
        <button
          v-for="period in timePeriods"
          :key="period.value"
          @click="selectedPeriod = period.value"
          :class="['period-btn', { active: selectedPeriod === period.value }]"
        >
          {{ period.label }}
        </button>
      </div>
    </div>
    <div class="chart-wrapper">
      <Line 
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
import { computed, ref } from 'vue';
import { Line } from 'vue-chartjs';
import { chartColors } from '@/utils/chart-config.js';

export default {
  name: 'EventsTimelineChart',
  components: {
    Line
  },
  props: {
    logs: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  setup(props) {
    const selectedPeriod = ref('hour'); // 'hour' | 'day' | 'week'
    
    const timePeriods = [
      { value: 'hour', label: 'По часам' },
      { value: 'day', label: 'По дням' },
      { value: 'week', label: 'По неделям' }
    ];
    
    // Получение номера недели
    const getWeekNumber = (date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };
    
    // Группировка логов по времени
    const groupByTime = (logs, period) => {
      const grouped = {};
      
      logs.forEach(log => {
        if (!log.timestamp) return;
        
        const date = new Date(log.timestamp);
        let key;
        
        switch (period) {
          case 'hour':
            // Группировка по часам: YYYY-MM-DD HH:00
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
            break;
          case 'day':
            // Группировка по дням: YYYY-MM-DD
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            break;
          case 'week':
            // Группировка по неделям: YYYY-WW
            const week = getWeekNumber(date);
            key = `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
            break;
          default:
            key = date.toISOString();
        }
        
        grouped[key] = (grouped[key] || 0) + 1;
      });
      
      return grouped;
    };
    
    // Данные для графика
    const chartData = computed(() => {
      if (!props.logs || props.logs.length === 0) {
        return null;
      }
      
      const grouped = groupByTime(props.logs, selectedPeriod.value);
      const labels = Object.keys(grouped).sort();
      const data = labels.map(label => grouped[label]);
      
      return {
        labels,
        datasets: [{
          label: 'Количество событий',
          data,
          borderColor: chartColors.primary,
          backgroundColor: (ctx) => {
            if (!ctx.chart) return chartColors.primary;
            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(0, 123, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(0, 123, 255, 0.05)');
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: chartColors.primary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2
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
            display: true,
            position: 'top'
          },
          title: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
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
              text: 'Время'
            },
            grid: {
              display: false
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Количество событий'
            },
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      };
    });
    
    return {
      selectedPeriod,
      timePeriods,
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.chart-controls {
  display: flex;
  gap: 8px;
}

.period-btn {
  padding: 6px 12px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.period-btn:hover {
  background: #e9ecef;
}

.period-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
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
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .chart-controls {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .chart-wrapper {
    height: 250px;
  }
}
</style>

