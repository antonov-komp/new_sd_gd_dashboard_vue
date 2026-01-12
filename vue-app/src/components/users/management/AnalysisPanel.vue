<template>
  <div class="analysis-panel">
    <div class="analysis-header">
      <div class="user-summary">
        <div class="user-avatar">
          <img
            v-if="user.avatar"
            :src="user.avatar"
            :alt="`Аватар ${user.name}`"
          />
          <div v-else class="avatar-placeholder">
            {{ user.name.charAt(0) }}
          </div>
        </div>
        <div class="user-info">
          <h2>{{ user.name }}</h2>
          <p class="user-email">{{ user.email }}</p>
          <div class="user-status">
            <span :class="`status-${user.status}`">{{ getStatusText(user.status) }}</span>
            <span v-if="user.is_admin" class="admin-badge">Администратор</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <button @click="$emit('back')" class="back-btn">← Назад к списку</button>
      </div>
    </div>

    <div class="analysis-content">
      <!-- Статистика активности -->
      <div class="stats-section">
        <h3>📊 Статистика активности</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ user.activity_stats?.total_actions || 0 }}</div>
            <div class="stat-label">Всего действий</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ user.activity_stats?.total_sessions || 0 }}</div>
            <div class="stat-label">Сессий</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ formatDuration(user.activity_stats?.avg_session_duration || 0) }}</div>
            <div class="stat-label">Средняя сессия</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ user.activity_stats?.activity_score || 0 }}/100</div>
            <div class="stat-label">Уровень активности</div>
          </div>
        </div>
      </div>

      <!-- Последняя активность -->
      <div class="activity-section">
        <h3>🕒 Последняя активность</h3>
        <div class="last-activity">
          <p>{{ formatLastActivity(user.activity_stats?.last_activity) }}</p>
        </div>
      </div>

      <!-- Отделы -->
      <div v-if="user.departments && user.departments.length > 0" class="departments-section">
        <h3>🏢 Отделы</h3>
        <div class="departments-list">
          <span
            v-for="dept in user.departments"
            :key="dept.id"
            class="department-tag"
            :style="{ backgroundColor: dept.color }"
          >
            {{ dept.name }}
          </span>
        </div>
      </div>

      <!-- Заглушка для будущей функциональности -->
      <div class="placeholder-note">
        <strong>🚧 Следующие возможности в разработке:</strong>
        <ul>
          <li>График активности по времени</li>
          <li>Анализ паттернов использования</li>
          <li>Сравнение с другими пользователями</li>
          <li>Экспорт детальной статистики</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AnalysisPanel',
  emits: ['back', 'filter-change', 'export'],
  props: {
    user: {
      type: Object,
      default: null
    },
    activityData: {
      type: Object,
      default: () => ({})
    },
    filters: {
      type: Object,
      default: () => ({})
    },
    timeRange: {
      type: String,
      default: 'week'
    },
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    getStatusText(status) {
      switch (status) {
        case 'online': return 'онлайн';
        case 'away': return 'отошёл';
        case 'offline': return 'оффлайн';
        default: return 'неизвестен';
      }
    },

    formatDuration(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    formatLastActivity(lastActivity) {
      if (!lastActivity) return 'Никогда';

      const date = new Date(lastActivity);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'только что';
      if (diffMins < 60) return `${diffMins} мин назад`;
      if (diffHours < 24) return `${diffHours} ч назад`;
      if (diffDays < 7) return `${diffDays} д назад`;
      return date.toLocaleDateString('ru-RU');
    }
  }
};
</script>

<style scoped>
.analysis-panel {
  height: 100%;
  overflow-y: auto;
  background: var(--um-bg-primary, #ffffff);
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid var(--um-border-color, #e9ecef);
  background: var(--um-bg-primary, #ffffff);
}

.user-summary {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: #007bff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
}

.user-info h2 {
  margin: 0 0 4px 0;
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.user-email {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 16px;
}

.user-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-online,
.status-away,
.status-offline {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.status-online {
  background: #d4edda;
  color: #155724;
}

.status-away {
  background: #fff3cd;
  color: #856404;
}

.status-offline {
  background: #f8d7da;
  color: #721c24;
}

.admin-badge {
  background: #dc3545;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.header-actions {
  flex-shrink: 0;
}

.back-btn {
  padding: 10px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.back-btn:hover {
  background: #5a6268;
}

.analysis-content {
  padding: 24px;
}

.stats-section h3,
.activity-section h3,
.departments-section h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #e9ecef;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.last-activity {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.last-activity p {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.departments-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.department-tag {
  padding: 6px 12px;
  border-radius: 16px;
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.placeholder-note {
  background: #fff3cd;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #ffeaa7;
  margin-top: 24px;
}

.placeholder-note strong {
  color: #856404;
  display: block;
  margin-bottom: 8px;
}

.placeholder-note ul {
  margin: 0;
  padding-left: 20px;
}

.placeholder-note li {
  color: #856404;
  margin-bottom: 4px;
}

/* Адаптивность */
@media (max-width: 768px) {
  .analysis-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .user-summary {
    width: 100%;
  }

  .user-info h2 {
    font-size: 20px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .analysis-content {
    padding: 16px;
  }
}
</style>