<template>
  <div class="user-profile-analysis">
    <!-- Заголовок профиля -->
    <div class="profile-header">
      <div class="header-content">
        <button @click="$emit('back')" class="back-btn">← Назад</button>
        <div class="user-info">
          <h1 class="user-name">{{ userProfile?.user?.name || 'Пользователь' }}</h1>
          <p class="user-details">
            ID: {{ userId }}
            <span v-if="userProfile?.user?.email">• {{ userProfile.user.email }}</span>
          </p>
        </div>
      </div>
      <div class="header-actions">
        <button @click="exportProfile" class="export-btn">
          📥 Экспорт профиля
        </button>
      </div>
    </div>

    <!-- Основная информация -->
    <div class="profile-summary" v-if="userProfile">
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-icon">📅</div>
          <div class="card-content">
            <div class="card-value">{{ formatDate(userProfile.analytics?.first_visit) }}</div>
            <div class="card-label">Первый вход</div>
          </div>
        </div>

        <div class="summary-card">
          <div class="card-icon">⏰</div>
          <div class="card-content">
            <div class="card-value">{{ formatDate(userProfile.analytics?.last_visit) }}</div>
            <div class="card-label">Последний вход</div>
          </div>
        </div>

        <div class="summary-card">
          <div class="card-icon">🎯</div>
          <div class="card-content">
            <div class="card-value">{{ userProfile.analytics?.total_sessions || 0 }}</div>
            <div class="card-label">Всего сессий</div>
          </div>
        </div>

        <div class="summary-card">
          <div class="card-icon">📊</div>
          <div class="card-content">
            <div class="card-value">{{ userProfile.analytics?.total_actions || 0 }}</div>
            <div class="card-label">Всего действий</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Статистика пользователя -->
    <div class="profile-stats" v-if="userProfile?.analytics">
      <h2 class="section-title">📈 Статистика активности</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Среднее время сессии</div>
          <div class="stat-value">{{ formatDuration(userProfile.analytics.avg_session_duration) }}</div>
        </div>

        <div class="stat-item">
          <div class="stat-label">Предпочитаемое устройство</div>
          <div class="stat-value">{{ formatDevice(userProfile.analytics.device_preference) }}</div>
        </div>

        <div class="stat-item">
          <div class="stat-label">Любимая страница</div>
          <div class="stat-value">{{ userProfile.analytics.favorite_page || 'Не определена' }}</div>
        </div>

        <div class="stat-item">
          <div class="stat-label">Пиковый час активности</div>
          <div class="stat-value">{{ formatHour(userProfile.analytics.peak_hour) }}</div>
        </div>

        <div class="stat-item">
          <div class="stat-label">Общее время использования</div>
          <div class="stat-value">{{ formatDuration(userProfile.analytics.total_duration) }}</div>
        </div>

        <div class="stat-item">
          <div class="stat-label">Retention (дни)</div>
          <div class="stat-value">{{ userProfile.analytics.retention_days }} дней</div>
        </div>
      </div>
    </div>

    <!-- График активности -->
    <div class="activity-chart-section">
      <h2 class="section-title">📈 График активности</h2>
      <div class="chart-container">
        <TimeChart
          v-if="userActivity.length > 0"
          :data="userActivity"
          :group-by="chartGroupBy"
          title="Активность пользователя по времени"
          @time-range-change="handleTimeRangeChange"
        />
        <div v-else class="no-data">
          Нет данных для отображения графика
        </div>
      </div>
    </div>

    <!-- Сессии пользователя -->
    <div class="sessions-section" v-if="userProfile?.sessions?.length > 0">
      <h2 class="section-title">🎭 Сессии пользователя</h2>
      <div class="sessions-controls">
        <select v-model="sessionViewMode" class="view-mode-select">
          <option value="timeline">Хронология</option>
          <option value="list">Список</option>
        </select>
        <div class="session-stats">
          <span class="stat">Всего сессий: {{ userProfile.sessions.length }}</span>
          <span class="stat">Средняя длительность: {{ formatDuration(avgSessionDuration) }}</span>
        </div>
      </div>

      <!-- Временная линия сессий -->
      <div v-if="sessionViewMode === 'timeline'" class="sessions-timeline">
        <div class="timeline-container">
          <div
            v-for="session in sortedSessions"
            :key="session.id"
            class="timeline-item"
            :class="getSessionClass(session)"
          >
            <div class="timeline-marker" :style="{ backgroundColor: getSessionColor(session) }"></div>
            <div class="timeline-content">
              <div class="session-header">
                <div class="session-time">{{ formatTimestamp(session.startTime) }}</div>
                <div class="session-duration">{{ formatDuration(session.duration) }}</div>
              </div>
              <div class="session-details">
                <div class="session-stats">
                  <span>{{ session.entriesCount }} действий</span>
                  <span>{{ session.pageCount }} страниц</span>
                  <span>{{ session.device || 'Неизвестно' }}</span>
                </div>
                <div class="session-actions" v-if="session.actions">
                  <span
                    v-for="([action, count], index) in Object.entries(session.actions)"
                    :key="action"
                    class="action-badge"
                  >
                    {{ getActionLabel(action) }}: {{ count }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Список сессий -->
      <div v-else class="sessions-list">
        <div class="session-item" v-for="session in sortedSessions" :key="session.id">
          <div class="session-info">
            <div class="session-time-range">
              {{ formatTimestamp(session.startTime) }} — {{ formatTimestamp(session.endTime) }}
            </div>
            <div class="session-meta">
              Длительность: {{ formatDuration(session.duration) }} |
              Действий: {{ session.entriesCount }} |
              Страниц: {{ session.pageCount }}
            </div>
          </div>
          <div class="session-device">
            {{ session.device || 'Неизвестно' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Детальная активность -->
    <div class="detailed-activity-section">
      <h2 class="section-title">📋 Детальная активность</h2>
      <ActivityDataTable
        :data="userActivity"
        :loading="loading"
        @sort-change="handleSortChange"
        @export="handleExport"
      />
    </div>

    <!-- Сравнение периодов -->
    <div class="comparison-section">
      <h2 class="section-title">⚖️ Сравнение периодов</h2>
      <div class="comparison-controls">
        <select v-model="comparisonPeriod" class="period-select">
          <option value="week">Текущая неделя vs предыдущая</option>
          <option value="month">Текущий месяц vs предыдущий</option>
          <option value="quarter">Текущий квартал vs предыдущий</option>
        </select>
      </div>

      <div v-if="comparisonData" class="comparison-results">
        <div class="comparison-metrics">
          <div class="metric-comparison">
            <div class="metric-name">Количество действий</div>
            <div class="metric-values">
              <span class="current">{{ comparisonData.current.actions }}</span>
              <span class="vs">vs</span>
              <span class="previous">{{ comparisonData.previous.actions }}</span>
              <span class="change" :class="getChangeClass(comparisonData.change.actions)">
                {{ formatChange(comparisonData.changePercent.actions) }}
              </span>
            </div>
          </div>

          <div class="metric-comparison">
            <div class="metric-name">Количество сессий</div>
            <div class="metric-values">
              <span class="current">{{ comparisonData.current.sessions }}</span>
              <span class="vs">vs</span>
              <span class="previous">{{ comparisonData.previous.sessions }}</span>
              <span class="change" :class="getChangeClass(comparisonData.change.sessions)">
                {{ formatChange(comparisonData.changePercent.sessions) }}
              </span>
            </div>
          </div>

          <div class="metric-comparison">
            <div class="metric-name">Средняя длительность сессии</div>
            <div class="metric-values">
              <span class="current">{{ formatDuration(comparisonData.current.avgDuration) }}</span>
              <span class="vs">vs</span>
              <span class="previous">{{ formatDuration(comparisonData.previous.avgDuration) }}</span>
              <span class="change" :class="getChangeClass(comparisonData.change.avgDuration)">
                {{ formatChange(comparisonData.changePercent.avgDuration) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Состояние загрузки -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">Загрузка профиля пользователя...</div>
      </div>
    </div>

    <!-- Ошибка -->
    <div v-if="error" class="error-message">
      {{ error }}
      <button @click="loadUserProfile" class="retry-btn">Повторить</button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { UserActivityService } from '@/services/user-activity-service.js';
import { ActivityAnalyticsService } from '@/services/activity-analytics-service.js';
import { VisualizationHelpers } from '@/utils/visualization-helpers.js';

// Импорт компонентов
import TimeChart from './TimeChart.vue';
import ActivityDataTable from './ActivityDataTable.vue';

export default {
  name: 'UserProfileAnalysis',
  components: {
    TimeChart,
    ActivityDataTable
  },
  props: {
    userId: {
      type: Number,
      required: true
    },
    filters: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['back', 'export'],
  setup(props, { emit }) {
    // Реактивные данные
    const userProfile = ref(null);
    const userActivity = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const chartGroupBy = ref('day');
    const sessionViewMode = ref('timeline');
    const comparisonPeriod = ref('week');
    const comparisonData = ref(null);

    // Вычисляемые свойства
    const sortedSessions = computed(() => {
      if (!userProfile.value?.sessions) return [];
      return [...userProfile.value.sessions].sort((a, b) =>
        new Date(b.startTime) - new Date(a.startTime)
      );
    });

    const avgSessionDuration = computed(() => {
      if (!userProfile.value?.sessions?.length) return 0;
      const total = userProfile.value.sessions.reduce((sum, session) => sum + session.duration, 0);
      return total / userProfile.value.sessions.length;
    });

    // Методы
    const loadUserProfile = async () => {
      loading.value = true;
      error.value = null;

      try {
        const profile = await UserActivityService.getUserProfileAnalytics(props.userId, props.filters);
        userProfile.value = profile;
        userActivity.value = profile.activity;

        // Загружаем данные для сравнения периодов
        await loadComparisonData();
      } catch (err) {
        error.value = err.message || 'Ошибка загрузки профиля пользователя';
        console.error('[UserProfileAnalysis] Error loading user profile:', err);
      } finally {
        loading.value = false;
      }
    };

    const loadComparisonData = async () => {
      try {
        // Определяем периоды для сравнения
        const now = new Date();
        let currentStart, currentEnd, previousStart, previousEnd;

        switch (comparisonPeriod.value) {
          case 'week':
            currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            currentEnd = now;
            previousStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            previousEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
            currentEnd = now;
            previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
          case 'quarter':
            const currentQuarter = Math.floor(now.getMonth() / 3);
            currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
            currentEnd = now;
            previousStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
            previousEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);
            break;
        }

        // Получаем данные за текущий и предыдущий периоды
        const currentFilters = {
          ...props.filters,
          dateFrom: currentStart.toISOString().split('T')[0],
          dateTo: currentEnd.toISOString().split('T')[0]
        };

        const previousFilters = {
          ...props.filters,
          dateFrom: previousStart.toISOString().split('T')[0],
          dateTo: previousEnd.toISOString().split('T')[0]
        };

        const [currentActivity, previousActivity] = await Promise.all([
          UserActivityService.getUserActivity(props.userId, currentFilters),
          UserActivityService.getUserActivity(props.userId, previousFilters)
        ]);

        // Рассчитываем метрики
        const currentSessions = ActivityAnalyticsService.analyzeUserSessions(currentActivity);
        const previousSessions = ActivityAnalyticsService.analyzeUserSessions(previousActivity);

        comparisonData.value = {
          current: {
            actions: currentActivity.length,
            sessions: currentSessions.length,
            avgDuration: currentSessions.length > 0 ?
              currentSessions.reduce((sum, s) => sum + s.duration, 0) / currentSessions.length : 0
          },
          previous: {
            actions: previousActivity.length,
            sessions: previousSessions.length,
            avgDuration: previousSessions.length > 0 ?
              previousSessions.reduce((sum, s) => sum + s.duration, 0) / previousSessions.length : 0
          },
          change: {
            actions: currentActivity.length - previousActivity.length,
            sessions: currentSessions.length - previousSessions.length,
            avgDuration: (currentSessions.length > 0 ?
              currentSessions.reduce((sum, s) => sum + s.duration, 0) / currentSessions.length : 0) -
              (previousSessions.length > 0 ?
                previousSessions.reduce((sum, s) => sum + s.duration, 0) / previousSessions.length : 0)
          },
          changePercent: {
            actions: previousActivity.length > 0 ?
              ((currentActivity.length - previousActivity.length) / previousActivity.length) * 100 : 0,
            sessions: previousSessions.length > 0 ?
              ((currentSessions.length - previousSessions.length) / previousSessions.length) * 100 : 0,
            avgDuration: 0 // TODO: рассчитать процентное изменение длительности
          }
        };
      } catch (err) {
        console.error('[UserProfileAnalysis] Error loading comparison data:', err);
      }
    };

    const exportProfile = () => {
      const exportData = {
        userId: props.userId,
        profile: userProfile.value,
        activity: userActivity.value,
        filters: props.filters,
        timestamp: new Date().toISOString()
      };

      emit('export', exportData);
    };

    const handleTimeRangeChange = (data) => {
      console.log('Time range changed:', data);
    };

    const handleSortChange = (sortData) => {
      console.log('Sort changed:', sortData);
    };

    const handleExport = (exportData) => {
      console.log('Export data:', exportData);
    };

    // Вспомогательные методы форматирования
    const formatDate = (dateString) => {
      if (!dateString) return 'Неизвестно';
      try {
        return new Date(dateString).toLocaleDateString('ru-RU');
      } catch {
        return dateString;
      }
    };

    const formatTimestamp = (timestamp) => {
      return VisualizationHelpers.formatTimestamp(timestamp);
    };

    const formatDuration = (durationMs) => {
      return VisualizationHelpers.formatDuration(durationMs);
    };

    const formatDevice = (device) => {
      const deviceNames = {
        desktop: 'Компьютер',
        mobile: 'Мобильный',
        tablet: 'Планшет',
        unknown: 'Неизвестно'
      };
      return deviceNames[device] || device || 'Неизвестно';
    };

    const formatHour = (hour) => {
      if (hour === null || hour === undefined) return 'Не определён';
      return `${hour}:00`;
    };

    const getSessionClass = (session) => {
      const duration = session.duration || 0;
      if (duration < 5 * 60 * 1000) return 'session-short';
      if (duration < 15 * 60 * 1000) return 'session-medium';
      return 'session-long';
    };

    const getSessionColor = (session) => {
      return VisualizationHelpers.getSessionColor(session);
    };

    const getActionLabel = (action) => {
      switch (action) {
        case 'app_entry': return 'Вход';
        case 'page_visit': return 'Переход';
        default: return action;
      }
    };

    const getChangeClass = (change) => {
      if (change > 0) return 'positive';
      if (change < 0) return 'negative';
      return 'neutral';
    };

    const formatChange = (changePercent) => {
      if (changePercent === 0) return '0%';
      const sign = changePercent > 0 ? '+' : '';
      return `${sign}${changePercent.toFixed(1)}%`;
    };

    // Наблюдатели
    watch(() => props.userId, () => {
      loadUserProfile();
    });

    watch(() => props.filters, () => {
      loadUserProfile();
    }, { deep: true });

    watch(comparisonPeriod, () => {
      loadComparisonData();
    });

    // Инициализация
    onMounted(() => {
      loadUserProfile();
    });

    return {
      // Данные
      userProfile,
      userActivity,
      loading,
      error,
      chartGroupBy,
      sessionViewMode,
      comparisonPeriod,
      comparisonData,

      // Вычисляемые
      sortedSessions,
      avgSessionDuration,

      // Методы
      loadUserProfile,
      exportProfile,
      handleTimeRangeChange,
      handleSortChange,
      handleExport,

      // Форматирование
      formatDate,
      formatTimestamp,
      formatDuration,
      formatDevice,
      formatHour,
      getSessionClass,
      getSessionColor,
      getActionLabel,
      getChangeClass,
      formatChange
    };
  }
};
</script>

<style scoped>
.user-profile-analysis {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.profile-header {
  background: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.back-btn {
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  margin-right: 16px;
  transition: background 0.2s;
}

.back-btn:hover {
  background: #e9ecef;
}

.user-name {
  margin: 0 0 4px 0;
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.user-details {
  margin: 0;
  font-size: 16px;
  color: #666;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.export-btn {
  padding: 10px 16px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.export-btn:hover {
  background: #45a049;
}

.profile-summary {
  margin-bottom: 24px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.summary-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
}

.card-value {
  font-size: 24px;
  font-weight: 700;
  color: #2196F3;
  margin-bottom: 4px;
}

.card-label {
  font-size: 14px;
  color: #666;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
}

.profile-stats {
  background: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.activity-chart-section,
.sessions-section,
.detailed-activity-section,
.comparison-section {
  background: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chart-container {
  height: 400px;
  position: relative;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-style: italic;
}

.sessions-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.view-mode-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.session-stats {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #666;
}

.sessions-timeline {
  position: relative;
}

.timeline-container {
  position: relative;
  padding-left: 40px;
}

.timeline-item {
  position: relative;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid transparent;
}

.timeline-item.session-short {
  border-left-color: #4CAF50;
}

.timeline-item.session-medium {
  border-left-color: #FF9800;
}

.timeline-item.session-long {
  border-left-color: #F44336;
}

.timeline-marker {
  position: absolute;
  left: -42px;
  top: 20px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.session-time {
  font-weight: 600;
  color: #333;
}

.session-duration {
  color: #666;
  font-family: monospace;
}

.session-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.session-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #666;
}

.session-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.action-badge {
  background: #e3f2fd;
  color: #1976d2;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 11px;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 6px;
  flex-wrap: wrap;
  gap: 8px;
}

.session-info {
  flex: 1;
}

.session-time-range {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.session-meta {
  font-size: 12px;
  color: #666;
}

.session-device {
  font-size: 14px;
  color: #555;
  font-weight: 500;
}

.comparison-controls {
  margin-bottom: 20px;
}

.period-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.comparison-results {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.comparison-metrics {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metric-comparison {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.metric-comparison:last-child {
  border-bottom: none;
}

.metric-name {
  font-weight: 500;
  color: #333;
  flex: 1;
}

.metric-values {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.current {
  font-weight: 600;
  color: #2196F3;
}

.vs {
  color: #999;
  font-size: 12px;
}

.previous {
  color: #666;
}

.change {
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.change.positive {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
}

.change.negative {
  background: rgba(244, 67, 54, 0.1);
  color: #F44336;
}

.change.neutral {
  background: rgba(158, 158, 158, 0.1);
  color: #9E9E9E;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-content {
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: #666;
  font-size: 14px;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 16px;
  border-radius: 6px;
  margin: 20px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.retry-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.retry-btn:hover {
  background: #c82333;
}

/* Responsive */
@media (max-width: 768px) {
  .user-profile-analysis {
    padding: 16px;
  }

  .profile-header {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .user-name {
    font-size: 24px;
  }

  .summary-cards {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .sessions-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .timeline-container {
    padding-left: 20px;
  }

  .timeline-marker {
    left: -22px;
    width: 10px;
    height: 10px;
  }

  .session-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .metric-comparison {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .metric-values {
    width: 100%;
    justify-content: center;
  }
}
</style>