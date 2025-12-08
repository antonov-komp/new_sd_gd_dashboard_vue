<template>
  <div class="webhook-dashboard">
    <div class="dashboard-header">
      <h2>Дашборд логов вебхуков</h2>
      <div class="dashboard-controls">
        <button
          @click="showStats = !showStats"
          class="toggle-btn"
          :class="{ active: showStats }"
        >
          {{ showStats ? '▼' : '▶' }} Статистика
        </button>
        <button
          @click="showCharts = !showCharts"
          class="toggle-btn"
          :class="{ active: showCharts }"
        >
          {{ showCharts ? '▼' : '▶' }} Графики
        </button>
      </div>
    </div>

    <!-- Статистика -->
    <Transition name="slide-down">
      <div v-if="showStats" class="dashboard-section">
        <WebhookLogsStats
          :logs="normalizedLogs"
          :previous-period-stats="previousPeriodStats"
        />
      </div>
    </Transition>

    <!-- Графики -->
    <Transition name="slide-down">
      <div v-if="showCharts" class="dashboard-section">
        <div class="charts-grid">
          <!-- Линейный график -->
          <div class="chart-item">
            <EventsTimelineChart :logs="normalizedLogs" />
          </div>

          <!-- Круговая диаграмма -->
          <div class="chart-item">
            <CategoriesChart :logs="normalizedLogs" />
          </div>

          <!-- Столбчатая диаграмма -->
          <div class="chart-item chart-item-full">
            <EventsBarChart :logs="normalizedLogs" />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import WebhookLogsStats from './WebhookLogsStats.vue';
import EventsTimelineChart from './charts/EventsTimelineChart.vue';
import CategoriesChart from './charts/CategoriesChart.vue';
import EventsBarChart from './charts/EventsBarChart.vue';
import { 
  isValidWebhookLogEntry,
  normalizeWebhookLogEntry 
} from '@/types/webhook-logs.js';
import { 
  formatCategory,
  formatEventType 
} from '@/utils/webhook-formatters.js';

export default {
  name: 'WebhookLogsDashboard',
  components: {
    WebhookLogsStats,
    EventsTimelineChart,
    CategoriesChart,
    EventsBarChart
  },
  props: {
    logs: {
      type: Array,
      required: true,
      default: () => []
    },
    previousPeriodStats: {
      type: Object,
      default: null
    }
  },
  setup(props) {
    const showStats = ref(true);
    const showCharts = ref(true);
    
    // Нормализованные и валидированные логи
    const normalizedLogs = computed(() => {
      if (!props.logs || !Array.isArray(props.logs)) {
        return [];
      }
      
      return props.logs
        .map(log => normalizeWebhookLogEntry(log))
        .filter(log => isValidWebhookLogEntry(log));
    });
    
    // Вычисление статистики для дашборда
    const currentStats = computed(() => {
      if (!normalizedLogs.value || normalizedLogs.value.length === 0) {
        return getEmptyStats();
      }
      
      return calculateStats(normalizedLogs.value);
    });
    
    const previousStats = computed(() => {
      if (!props.previousPeriodStats) {
        return getEmptyStats();
      }
      
      return props.previousPeriodStats;
    });
    
    const statsComparison = computed(() => {
      const current = currentStats.value;
      const previous = previousStats.value;
      
      return {
        total: calculateChange(current.total, previous.total),
        tasks: calculateChange(current.tasks, previous.tasks),
        smartProcesses: calculateChange(current.smartProcesses, previous.smartProcesses),
        errors: calculateChange(current.errors, previous.errors)
      };
    });
    
    // Функция вычисления статистики
    const calculateStats = (logs) => {
      const stats = {
        total: logs.length,
        tasks: 0,
        smartProcesses: 0,
        errors: 0,
        byEvent: {},
        byDate: {}
      };
      
      logs.forEach(log => {
        // По категориям
        if (log.category === 'tasks') {
          stats.tasks++;
        } else if (log.category === 'smart-processes') {
          stats.smartProcesses++;
        } else if (log.category === 'errors') {
          stats.errors++;
        }
        
        // По типам событий
        if (log.event) {
          stats.byEvent[log.event] = (stats.byEvent[log.event] || 0) + 1;
        }
        
        // По датам
        if (log.timestamp) {
          try {
            const date = new Date(log.timestamp);
            const dateKey = date.toISOString().split('T')[0];
            stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;
          } catch (e) {
            // Игнорируем ошибки парсинга даты
          }
        }
      });
      
      return stats;
    };
    
    // Получение пустой статистики
    const getEmptyStats = () => {
      return {
        total: 0,
        tasks: 0,
        smartProcesses: 0,
        errors: 0,
        byEvent: {},
        byDate: {}
      };
    };
    
    // Вычисление изменения
    const calculateChange = (current, previous) => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return Math.round(((current - previous) / previous) * 100);
    };
    
    return {
      showStats,
      showCharts,
      normalizedLogs,
      currentStats,
      previousStats,
      statsComparison
    };
  }
};
</script>

<style scoped>
.webhook-dashboard {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.dashboard-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.dashboard-controls {
  display: flex;
  gap: 10px;
}

.toggle-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: #f8f9fa;
}

.toggle-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.dashboard-section {
  margin-bottom: 20px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.chart-item {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.chart-item-full {
  grid-column: 1 / -1;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  max-height: 5000px;
  opacity: 1;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>

