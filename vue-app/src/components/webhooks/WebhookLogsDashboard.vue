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
          :logs="logs"
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
            <EventsTimelineChart :logs="logs" />
          </div>

          <!-- Круговая диаграмма -->
          <div class="chart-item">
            <CategoriesChart :logs="logs" />
          </div>

          <!-- Столбчатая диаграмма -->
          <div class="chart-item chart-item-full">
            <EventsBarChart :logs="logs" />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref } from 'vue';
import WebhookLogsStats from './WebhookLogsStats.vue';
import EventsTimelineChart from './charts/EventsTimelineChart.vue';
import CategoriesChart from './charts/CategoriesChart.vue';
import EventsBarChart from './charts/EventsBarChart.vue';

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
  setup() {
    const showStats = ref(true);
    const showCharts = ref(true);
    
    return {
      showStats,
      showCharts
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

