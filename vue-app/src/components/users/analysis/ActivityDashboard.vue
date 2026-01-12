<template>
  <div class="activity-dashboard">
    <!-- Заголовок дашборда -->
    <div class="dashboard-header">
      <div class="header-content">
        <h1 class="dashboard-title">📊 Дашборд активности пользователей</h1>
        <p class="dashboard-subtitle">
          Анализ активности пользователей за период с {{ formatDateRange }}
        </p>
      </div>
      <div class="header-actions">
        <button @click="refresh" :disabled="loading" class="refresh-btn">
          <span v-if="loading">⏳</span>
          <span v-else>🔄</span>
          {{ loading ? 'Обновление...' : 'Обновить' }}
        </button>
        <button @click="exportData" class="export-btn">
          📥 Экспорт
        </button>
      </div>
    </div>

    <!-- Метрики -->
    <div class="metrics-section">
      <div class="metrics-grid">
        <MetricCard
          v-for="metric in dashboardMetrics"
          :key="metric.id"
          :metric="metric"
          @drill-down="handleMetricDrillDown"
        />
      </div>
    </div>

    <!-- Фильтры и группировка -->
    <div class="filters-section">
      <AdvancedFilters
        v-model="filters"
        @change="handleFiltersChange"
      />
    </div>

    <!-- Графики и диаграммы -->
    <div class="charts-section">
      <div class="chart-row">
        <div class="chart-container time-chart">
          <TimeChart
            :data="activityData"
            :group-by="timeGroupBy"
            :filters="filters"
            title="Активность по времени"
            @time-range-change="handleTimeRangeChange"
          />
        </div>
      </div>

      <div class="chart-row">
        <div class="chart-container distribution-chart">
          <DistributionChart
            :data="activityData"
            :type="distributionType"
            title="Распределение активности"
            @segment-click="handleSegmentClick"
          />
        </div>

        <div class="chart-container user-ranking">
          <UserRanking
            :data="activityData"
            :limit="10"
            title="Топ активных пользователей"
            @user-select="handleUserSelect"
          />
        </div>
      </div>
    </div>

    <!-- Детальная таблица -->
    <div class="data-table-section">
      <ActivityDataTable
        :data="filteredActivityData"
        :loading="loading"
        :filters="filters"
        @sort-change="handleSortChange"
        @export="handleTableExport"
      />
    </div>

    <!-- Модальное окно с деталями -->
    <div v-if="showDetailsModal" class="details-modal-overlay" @click="closeDetailsModal">
      <div class="details-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ detailsModalTitle }}</h3>
          <button @click="closeDetailsModal" class="close-btn">✕</button>
        </div>
        <div class="modal-content">
          <pre>{{ JSON.stringify(detailsModalData, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { UserActivityService } from '@/services/user-activity-service.js';
import { ActivityAnalyticsService } from '@/services/activity-analytics-service.js';

// Импорт компонентов
import MetricCard from './MetricCard.vue';
import AdvancedFilters from './AdvancedFilters.vue';
import TimeChart from './TimeChart.vue';
import DistributionChart from './DistributionChart.vue';
import UserRanking from './UserRanking.vue';
import ActivityDataTable from './ActivityDataTable.vue';

export default {
  name: 'ActivityDashboard',
  components: {
    MetricCard,
    AdvancedFilters,
    TimeChart,
    DistributionChart,
    UserRanking,
    ActivityDataTable
  },
  props: {
    initialFilters: {
      type: Object,
      default: () => ({
        dateFrom: null,
        dateTo: null,
        userId: null,
        type: null
      })
    },
    refreshInterval: {
      type: Number,
      default: 300000 // 5 минут
    }
  },
  emits: ['user-profile-request', 'filters-changed'],
  setup(props, { emit }) {
    // Реактивные данные
    const activityData = ref([]);
    const filteredActivityData = ref([]);
    const dashboardMetrics = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const filters = ref({ ...props.initialFilters });

    // Настройки графиков
    const timeGroupBy = ref('day');
    const distributionType = ref('activity_types');

    // Модальное окно деталей
    const showDetailsModal = ref(false);
    const detailsModalTitle = ref('');
    const detailsModalData = ref(null);

    // Таймер автообновления
    let refreshTimer = null;

    // Вычисляемые свойства
    const formatDateRange = computed(() => {
      const from = filters.value.dateFrom || 'начала';
      const to = filters.value.dateTo || 'сейчас';
      return `${from} по ${to}`;
    });

    // Загрузка данных дашборда
    const loadDashboardData = async () => {
      loading.value = true;
      error.value = null;

      try {
        // Загружаем данные активности
        activityData.value = await UserActivityService.getActivity({
          ...filters.value,
          limit: 10000 // Больше данных для анализа
        });

        // Применяем фильтрацию скрытых пользователей
        filteredActivityData.value = activityData.value; // TODO: добавить фильтрацию

        // Рассчитываем метрики дашборда
        const metrics = ActivityAnalyticsService.calculateDashboardMetrics(
          filteredActivityData.value
        );

        // Форматируем метрики для отображения
        dashboardMetrics.value = formatMetricsForDisplay(metrics);

      } catch (err) {
        error.value = err.message || 'Ошибка загрузки данных дашборда';
        console.error('[ActivityDashboard] Error loading dashboard data:', err);
      } finally {
        loading.value = false;
      }
    };

    // Форматирование метрик для карточек
    const formatMetricsForDisplay = (metrics) => {
      return [
        {
          id: 'total_entries',
          title: 'Всего записей',
          value: metrics.total_entries?.value || 0,
          previousValue: metrics.total_entries?.previousValue || 0,
          change: metrics.total_entries?.change || 0,
          changePercent: metrics.total_entries?.changePercent || 0,
          trend: metrics.total_entries?.trend || 'neutral',
          icon: '📊',
          color: '#2196F3',
          drillDownRoute: 'activity-details'
        },
        {
          id: 'unique_users',
          title: 'Уникальных пользователей',
          value: metrics.unique_users?.value || 0,
          previousValue: metrics.unique_users?.previousValue || 0,
          change: metrics.unique_users?.change || 0,
          changePercent: metrics.unique_users?.changePercent || 0,
          trend: metrics.unique_users?.trend || 'neutral',
          icon: '👥',
          color: '#4CAF50',
          drillDownRoute: 'user-list'
        },
        {
          id: 'total_sessions',
          title: 'Всего сессий',
          value: metrics.total_sessions?.value || 0,
          previousValue: metrics.total_sessions?.previousValue || 0,
          change: metrics.total_sessions?.change || 0,
          changePercent: metrics.total_sessions?.changePercent || 0,
          trend: metrics.total_sessions?.trend || 'neutral',
          icon: '🎯',
          color: '#FF9800',
          drillDownRoute: 'session-analysis'
        },
        {
          id: 'avg_session_duration',
          title: 'Ср. длительность сессии',
          value: formatDuration(metrics.total_sessions?.value || 0),
          previousValue: formatDuration(metrics.total_sessions?.previousValue || 0),
          change: 0, // TODO: рассчитать изменение длительности
          changePercent: 0,
          trend: 'neutral',
          icon: '⏱️',
          color: '#9C27B0',
          drillDownRoute: 'session-details'
        }
      ];
    };

    // Форматирование длительности
    const formatDuration = (seconds) => {
      if (!seconds) return '0с';
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return mins > 0 ? `${mins}м ${secs}с` : `${secs}с`;
    };

    // Обработчики событий
    const handleFiltersChange = (newFilters) => {
      filters.value = { ...newFilters };
      emit('filters-changed', filters.value);
      loadDashboardData();
    };

    const handleMetricDrillDown = (metric) => {
      showDetailsModal.value = true;
      detailsModalTitle.value = `Детали: ${metric.title}`;
      detailsModalData.value = {
        metric: metric,
        filters: filters.value,
        timestamp: new Date().toISOString()
      };
    };

    const handleTimeRangeChange = (data) => {
      console.log('Time range changed:', data);
      // TODO: Обработка изменения временного диапазона
    };

    const handleSegmentClick = (data) => {
      showDetailsModal.value = true;
      detailsModalTitle.value = `Детали сегмента: ${data.label}`;
      detailsModalData.value = data;
    };

    const handleUserSelect = (user) => {
      emit('user-profile-request', user);
    };

    const handleSortChange = (sortData) => {
      console.log('Sort changed:', sortData);
      // TODO: Обработка изменения сортировки
    };

    const handleTableExport = (exportData) => {
      console.log('Table export:', exportData);
      // TODO: Реализация экспорта таблицы
    };

    // Управление модальным окном
    const closeDetailsModal = () => {
      showDetailsModal.value = false;
      detailsModalTitle.value = '';
      detailsModalData.value = null;
    };

    // Обновление данных
    const refresh = () => {
      loadDashboardData();
    };

    // Экспорт данных
    const exportData = () => {
      const exportData = {
        filters: filters.value,
        metrics: dashboardMetrics.value,
        activityCount: filteredActivityData.value.length,
        timestamp: new Date().toISOString()
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `activity-dashboard-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    };

    // Настройка автообновления
    const setupAutoRefresh = () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }

      if (props.refreshInterval > 0) {
        refreshTimer = setInterval(() => {
          if (!loading.value) {
            loadDashboardData();
          }
        }, props.refreshInterval);
      }
    };

    // Жизненный цикл
    onMounted(() => {
      loadDashboardData();
      setupAutoRefresh();
    });

    // Наблюдатели
    watch(() => props.initialFilters, (newFilters) => {
      filters.value = { ...newFilters };
      loadDashboardData();
    }, { deep: true });

    // Очистка таймера при уничтожении компонента
    const cleanup = () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };

    return {
      // Данные
      activityData,
      filteredActivityData,
      dashboardMetrics,
      loading,
      error,
      filters,

      // Настройки
      timeGroupBy,
      distributionType,

      // Модальное окно
      showDetailsModal,
      detailsModalTitle,
      detailsModalData,

      // Вычисляемые
      formatDateRange,

      // Методы
      handleFiltersChange,
      handleMetricDrillDown,
      handleTimeRangeChange,
      handleSegmentClick,
      handleUserSelect,
      handleSortChange,
      handleTableExport,
      closeDetailsModal,
      refresh,
      exportData,

      // Очистка
      cleanup
    };
  },

  beforeUnmount() {
    this.cleanup();
  }
};
</script>

<style scoped>
.activity-dashboard {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.dashboard-header {
  background: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  flex: 1;
}

.dashboard-title {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.dashboard-subtitle {
  margin: 0;
  font-size: 16px;
  color: #666;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.refresh-btn,
.export-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.refresh-btn {
  background: #2196F3;
  color: white;
}

.refresh-btn:hover:not(:disabled) {
  background: #1976D2;
}

.refresh-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.export-btn {
  background: #4CAF50;
  color: white;
}

.export-btn:hover {
  background: #45a049;
}

.metrics-section {
  margin-bottom: 24px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.filters-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.charts-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 24px;
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

.chart-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.time-chart {
  grid-column: 1 / -1;
}

.distribution-chart,
.user-ranking {
  flex: 1;
}

.data-table-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Модальное окно */
.details-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.details-modal {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  max-height: 80vh;
  width: 90%;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #f5f5f5;
}

.modal-content {
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.modal-content pre {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
}

/* Responsive */
@media (max-width: 1024px) {
  .chart-row {
    grid-template-columns: 1fr;
  }

  .distribution-chart,
  .user-ranking {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .activity-dashboard {
    padding: 16px;
  }

  .dashboard-header {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .dashboard-title {
    font-size: 24px;
  }

  .header-actions {
    width: 100%;
    justify-content: stretch;
  }

  .refresh-btn,
  .export-btn {
    flex: 1;
    justify-content: center;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .filters-section {
    padding: 16px;
  }
}
</style>