<template>
  <aside
    class="context-sidebar"
    :class="{
      collapsed: isCollapsed,
      'context-global': context === 'global',
      'context-user': context === 'user',
      'context-management': context === 'management'
    }"
    role="complementary"
    :aria-label="getAriaLabel()"
  >
    <!-- Кнопка сворачивания -->
    <button
      class="collapse-toggle"
      @click="toggleCollapse"
      @keydown.enter="toggleCollapse"
      @keydown.space="toggleCollapse"
      :aria-label="isCollapsed ? 'Развернуть боковую панель' : 'Свернуть боковую панель'"
      :title="isCollapsed ? 'Развернуть боковую панель' : 'Свернуть боковую панель'"
    >
      <svg
        class="collapse-icon"
        :class="{ rotated: isCollapsed }"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/>
      </svg>
    </button>

    <!-- Заголовок контекста -->
    <header class="sidebar-header">
      <h3 class="context-title">{{ getContextTitle() }}</h3>
      <div v-if="context === 'user' && selectedUser" class="user-indicator">
        <div class="user-avatar">
          <img
            v-if="selectedUser.avatar"
            :src="selectedUser.avatar"
            :alt="`Аватар ${selectedUser.name}`"
          />
          <div v-else class="avatar-placeholder">
            {{ userInitials }}
          </div>
        </div>
        <div class="user-info">
          <div class="user-name">{{ selectedUser.name }}</div>
          <div class="user-status" :class="selectedUser.status">
            {{ getStatusText(selectedUser.status) }}
          </div>
        </div>
      </div>
    </header>

    <!-- Содержимое боковой панели -->
    <div class="sidebar-content" :class="{ 'content-collapsed': isCollapsed }">
      <!-- Глобальный контекст -->
      <div v-if="context === 'global'" class="global-context-content">
        <!-- Глобальные метрики -->
        <section class="metrics-section">
          <h4 class="section-title">Общая статистика</h4>
          <div class="metrics-grid">
            <MetricCard
              v-for="metric in globalMetrics"
              :key="metric.id"
              :metric="metric"
              size="compact"
              @click="handleMetricClick"
            />
          </div>
        </section>

        <!-- Быстрые фильтры -->
        <section class="filters-section">
          <h4 class="section-title">Быстрые фильтры</h4>
          <div class="filter-presets">
            <button
              v-for="preset in filterPresets"
              :key="preset.id"
              class="filter-preset"
              :class="{ active: activePreset === preset.id }"
              @click="applyFilterPreset(preset)"
              :aria-label="`Применить фильтр: ${preset.label}`"
            >
              <component :is="preset.icon" class="preset-icon" />
              <span class="preset-label">{{ preset.label }}</span>
              <span v-if="preset.count !== undefined" class="preset-count">
                {{ preset.count }}
              </span>
            </button>
          </div>
        </section>

        <!-- Недавние действия -->
        <section class="recent-activity-section">
          <h4 class="section-title">Недавние действия</h4>
          <div class="recent-activity-list">
            <div
              v-for="activity in recentActivity"
              :key="activity.id"
              class="activity-item"
              @click="handleActivityClick(activity)"
            >
              <div class="activity-icon" :class="activity.type">
                <component :is="activity.icon" />
              </div>
              <div class="activity-content">
                <div class="activity-text">{{ activity.text }}</div>
                <div class="activity-time">{{ formatTime(activity.timestamp) }}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Контекст пользователя -->
      <div v-else-if="context === 'user'" class="user-context-content">
        <!-- Статистика пользователя -->
        <section class="user-stats-section">
          <h4 class="section-title">Статистика пользователя</h4>
          <div class="user-stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ userStats.total_actions || 0 }}</div>
              <div class="stat-label">действий</div>
              <div
                v-if="userStats.actions_change !== 0"
                class="stat-change"
                :class="{ positive: userStats.actions_change > 0, negative: userStats.actions_change < 0 }"
              >
                {{ userStats.actions_change > 0 ? '+' : '' }}{{ userStats.actions_change }}%
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ formatDuration(userStats.avg_session_duration || 0) }}</div>
              <div class="stat-label">средняя сессия</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ userStats.total_sessions || 0 }}</div>
              <div class="stat-label">сессий</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ userStats.activity_score || 0 }}/100</div>
              <div class="stat-label">активность</div>
            </div>
          </div>
        </section>

        <!-- Фильтры анализа -->
        <section class="analysis-filters-section">
          <h4 class="section-title">Фильтры анализа</h4>
          <div class="filter-controls">
            <div class="filter-group">
              <label class="filter-label">Период:</label>
              <select
                v-model="userFilters.timeRange"
                class="filter-select"
                @change="handleFilterChange"
              >
                <option value="today">Сегодня</option>
                <option value="week">Неделя</option>
                <option value="month">Месяц</option>
                <option value="quarter">Квартал</option>
                <option value="year">Год</option>
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label">Типы действий:</label>
              <div class="checkbox-group">
                <label
                  v-for="type in activityTypes"
                  :key="type.id"
                  class="checkbox-label"
                >
                  <input
                    type="checkbox"
                    :value="type.id"
                    v-model="userFilters.activity_types"
                    @change="handleFilterChange"
                  />
                  <span class="checkmark"></span>
                  {{ type.label }}
                </label>
              </div>
            </div>
          </div>
        </section>

        <!-- Быстрые действия -->
        <section class="user-actions-section">
          <h4 class="section-title">Действия</h4>
          <div class="action-buttons">
            <button
              class="action-button primary"
              @click="viewDetailedProfile"
              :aria-label="`Просмотреть детальный профиль ${selectedUser?.name}`"
            >
              <svg class="action-icon" viewBox="0 0 24 24">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L19 6.6C18.8 6 18.5 5.4 18.1 4.9L19 3L17 1L15.4 1.9C14.9 1.5 14.3 1.2 13.7 1L13 0V2C12.4 2 11.8 2.2 11.3 2.6L10.6 1.9L8.6 3L9.5 4.9C9.1 5.4 8.8 6 8.6 6.6L7 7V9L8.6 8.4C8.8 9 9.1 9.6 9.5 10.1L8.6 12L10.6 13.9L11.3 13.2C11.8 13.6 12.4 13.8 13 14V16H11V18H13V20H11V22H13V20H15V18H13V16H15V14C15.6 14 16.2 13.6 16.7 13.2L17.4 13.9L19.4 12L18.5 10.1C18.9 9.6 19.2 9 19.4 8.4L21 9ZM12 8C10.9 8 10 7.1 10 6C10 4.9 10.9 4 12 4C13.1 4 14 4.9 14 6C14 7.1 13.1 8 12 8Z"/>
              </svg>
              Детальный профиль
            </button>
            <button
              class="action-button secondary"
              @click="exportUserData"
              :aria-label="`Экспортировать данные ${selectedUser?.name}`"
            >
              <svg class="action-icon" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
              Экспорт данных
            </button>
            <button
              v-if="canEditPermissions"
              class="action-button warning"
              @click="editPermissions"
              :aria-label="`Изменить права ${selectedUser?.name}`"
            >
              <svg class="action-icon" viewBox="0 0 24 24">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,6V8H13V6H11M11,10V18H13V10H11Z"/>
              </svg>
              Изменить права
            </button>
          </div>
        </section>
      </div>

      <!-- Контекст управления -->
      <div v-else-if="context === 'management'" class="management-context-content">
        <!-- Выбранные пользователи -->
        <section v-if="selectedUsers.length > 0" class="selected-users-section">
          <h4 class="section-title">Выбрано пользователей: {{ selectedUsers.length }}</h4>
          <div class="selected-users-list">
            <div
              v-for="user in selectedUsers.slice(0, 3)"
              :key="user.id"
              class="selected-user-item"
            >
              <div class="user-avatar small">
                <img v-if="user.avatar" :src="user.avatar" :alt="user.name" />
                <div v-else class="avatar-placeholder small">
                  {{ getUserInitials(user.name) }}
                </div>
              </div>
              <span class="user-name">{{ user.name }}</span>
            </div>
            <div v-if="selectedUsers.length > 3" class="more-users">
              +{{ selectedUsers.length - 3 }} ещё
            </div>
          </div>
        </section>

        <!-- Массовые операции -->
        <section class="bulk-operations-section">
          <h4 class="section-title">Массовые операции</h4>
          <div class="bulk-actions">
            <button
              class="bulk-action-button"
              @click="performBulkAction('change_department')"
              :disabled="selectedUsers.length === 0"
            >
              <svg class="action-icon" viewBox="0 0 24 24">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,6V8H13V6H11M11,10V18H13V10H11Z"/>
              </svg>
              Изменить отдел
            </button>
            <button
              class="bulk-action-button"
              @click="performBulkAction('toggle_admin')"
              :disabled="selectedUsers.length === 0"
            >
              <svg class="action-icon" viewBox="0 0 24 24">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,6V8H13V6H11M11,10V18H13V10H11Z"/>
              </svg>
              Изменить права администратора
            </button>
            <button
              class="bulk-action-button"
              @click="performBulkAction('export')"
              :disabled="selectedUsers.length === 0"
            >
              <svg class="action-icon" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
              Экспорт
            </button>
          </div>
        </section>

        <!-- История изменений -->
        <section class="audit-log-section">
          <h4 class="section-title">Последние изменения</h4>
          <div class="audit-log-list">
            <div
              v-for="entry in auditLog.slice(0, 5)"
              :key="entry.id"
              class="audit-entry"
            >
              <div class="audit-icon" :class="entry.type">
                <component :is="entry.icon" />
              </div>
              <div class="audit-content">
                <div class="audit-text">{{ entry.text }}</div>
                <div class="audit-time">{{ formatTime(entry.timestamp) }}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Индикатор загрузки -->
    <div v-if="isLoading" class="sidebar-loading-overlay">
      <div class="loading-spinner" aria-label="Загрузка данных"></div>
    </div>
  </aside>
</template>

<script>
import { ref, computed, watch } from 'vue';
import MetricCard from './MetricCard.vue';

/**
 * ContextSidebar - контекстная боковая панель для единого интерфейса управления пользователями
 *
 * Адаптирует содержимое в зависимости от текущего контекста:
 * - global: глобальные метрики и быстрые фильтры
 * - user: статистика пользователя и действия
 * - management: массовые операции и аудит
 *
 * @version 1.0.0
 * @since TASK-089
 */
export default {
  name: 'ContextSidebar',

  components: {
    MetricCard
  },

  props: {
    /**
     * Текущий контекст
     */
    context: {
      type: String,
      default: 'global',
      validator: (value) => ['global', 'user', 'management'].includes(value)
    },

    /**
     * Выбранный пользователь (для контекста user)
     */
    selectedUser: {
      type: Object,
      default: null
    },

    /**
     * Выбранные пользователи (для контекста management)
     */
    selectedUsers: {
      type: Array,
      default: () => []
    },

    /**
     * Глобальные метрики (для контекста global)
     */
    globalMetrics: {
      type: Array,
      default: () => []
    },

    /**
     * Статистика пользователя (для контекста user)
     */
    userStats: {
      type: Object,
      default: () => ({})
    },

    /**
     * Фильтры пользователя (для контекста user)
     */
    userFilters: {
      type: Object,
      default: () => ({
        timeRange: 'week',
        activity_types: []
      })
    },

    /**
     * Предустановки фильтров (для контекста global)
     */
    filterPresets: {
      type: Array,
      default: () => []
    },

    /**
     * Активная предустановка фильтра
     */
    activePreset: {
      type: String,
      default: null
    },

    /**
     * Недавние действия (для контекста global)
     */
    recentActivity: {
      type: Array,
      default: () => []
    },

    /**
     * Записи аудита (для контекста management)
     */
    auditLog: {
      type: Array,
      default: () => []
    },

    /**
     * Типы активности (для фильтров)
     */
    activityTypes: {
      type: Array,
      default: () => []
    },

    /**
     * Состояние загрузки
     */
    isLoading: {
      type: Boolean,
      default: false
    },

    /**
     * Свернута ли панель
     */
    collapsed: {
      type: Boolean,
      default: false
    },

    /**
     * Разрешение на редактирование прав
     */
    canEditPermissions: {
      type: Boolean,
      default: false
    }
  },

  emits: [
    'toggle-collapse',    // Сворачивание/разворачивание панели
    'metric-click',       // Клик на метрику
    'filter-preset-apply', // Применение предустановки фильтра
    'activity-click',     // Клик на действие
    'filter-change',      // Изменение фильтра
    'view-profile',       // Просмотр профиля
    'export-data',        // Экспорт данных
    'edit-permissions',   // Редактирование прав
    'bulk-action',        // Массовое действие
    'user-select'         // Выбор пользователя
  ],

  setup(props, { emit }) {
    // Реактивные данные
    const isCollapsed = ref(props.collapsed);

    // Вычисляемые свойства
    const userInitials = computed(() => {
      if (!props.selectedUser?.name) return '';
      const [first, last] = props.selectedUser.name.split(' ');
      return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
    });

    // Методы
    const toggleCollapse = () => {
      isCollapsed.value = !isCollapsed.value;
      emit('toggle-collapse', isCollapsed.value);
    };

    const getContextTitle = () => {
      switch (props.context) {
        case 'global': return 'Обзор';
        case 'user': return 'Анализ пользователя';
        case 'management': return 'Управление';
        default: return 'Обзор';
      }
    };

    const getAriaLabel = () => {
      const title = getContextTitle();
      return `${title} - боковая панель с дополнительной информацией`;
    };

    const getStatusText = (status) => {
      switch (status) {
        case 'online': return 'Онлайн';
        case 'away': return 'Отошёл';
        case 'offline': return 'Оффлайн';
        default: return 'Неизвестно';
      }
    };

    const getUserInitials = (name) => {
      if (!name) return '';
      const [first, last] = name.split(' ');
      return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
    };

    const formatDuration = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatTime = (timestamp) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'только что';
      if (diffMins < 60) return `${diffMins} мин назад`;
      if (diffHours < 24) return `${diffHours} ч назад`;
      if (diffDays < 7) return `${diffDays} д назад`;
      return date.toLocaleDateString();
    };

    // Обработчики событий
    const handleMetricClick = (metric) => {
      emit('metric-click', metric);
    };

    const applyFilterPreset = (preset) => {
      emit('filter-preset-apply', preset);
    };

    const handleActivityClick = (activity) => {
      emit('activity-click', activity);
    };

    const handleFilterChange = () => {
      emit('filter-change', props.userFilters);
    };

    const viewDetailedProfile = () => {
      emit('view-profile', props.selectedUser);
    };

    const exportUserData = () => {
      emit('export-data', props.selectedUser);
    };

    const editPermissions = () => {
      emit('edit-permissions', props.selectedUser);
    };

    const performBulkAction = (action) => {
      emit('bulk-action', { action, users: props.selectedUsers });
    };

    // Наблюдатели
    watch(() => props.collapsed, (newVal) => {
      isCollapsed.value = newVal;
    });

    return {
      isCollapsed,
      userInitials,
      toggleCollapse,
      getContextTitle,
      getAriaLabel,
      getStatusText,
      getUserInitials,
      formatDuration,
      formatTime,
      handleMetricClick,
      applyFilterPreset,
      handleActivityClick,
      handleFilterChange,
      viewDetailedProfile,
      exportUserData,
      editPermissions,
      performBulkAction
    };
  }
};
</script>

<style scoped>
.context-sidebar {
  position: relative;
  width: 320px;
  min-height: 100%;
  background: var(--um-bg-primary, #ffffff);
  border-left: 1px solid var(--um-border-color, #e0e0e0);
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
}

.context-sidebar.collapsed {
  width: 60px;
}

.collapse-toggle {
  position: absolute;
  top: 16px;
  left: -12px;
  width: 24px;
  height: 24px;
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 50%;
  background: var(--um-bg-primary, #ffffff);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.2s ease;
}

.collapse-toggle:hover {
  background: var(--um-hover, rgba(33, 150, 243, 0.1));
  border-color: var(--um-primary, #2196f3);
}

.collapse-toggle:focus {
  outline: 2px solid var(--um-primary, #2196f3);
  outline-offset: 2px;
}

.collapse-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.3s ease;
}

.collapse-icon.rotated {
  transform: rotate(180deg);
}

.sidebar-header {
  padding: 20px 16px 16px;
  border-bottom: 1px solid var(--um-border-color, #e0e0e0);
}

.context-sidebar.collapsed .sidebar-header {
  padding: 20px 8px 16px;
  text-align: center;
}

.context-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--um-text-primary, #212121);
}

.context-sidebar.collapsed .context-title {
  font-size: 12px;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  margin: 0;
  transform: rotate(180deg);
}

.user-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
}

.context-sidebar.collapsed .user-indicator {
  flex-direction: column;
  gap: 8px;
}

.user-avatar {
  width: 40px;
  height: 40px;
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
  background: var(--um-primary, #2196f3);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.context-sidebar.collapsed .user-avatar {
  width: 32px;
  height: 32px;
}

.context-sidebar.collapsed .avatar-placeholder {
  font-size: 10px;
}

.user-info {
  min-width: 0;
}

.context-sidebar.collapsed .user-info {
  display: none;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--um-text-primary, #212121);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-status {
  font-size: 12px;
  color: var(--um-text-secondary, #757575);
  margin-top: 2px;
}

.user-status.online { color: #4caf50; }
.user-status.away { color: #ff9800; }
.user-status.offline { color: #9e9e9e; }

.sidebar-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.content-collapsed {
  padding: 16px 8px;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--um-text-primary, #212121);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.context-sidebar.collapsed .section-title {
  display: none;
}

/* Глобальный контекст */
.metrics-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.filter-presets {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.filter-preset {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.filter-preset:hover {
  background: var(--um-hover, rgba(33, 150, 243, 0.1));
  border-color: var(--um-primary, #2196f3);
}

.filter-preset.active {
  background: var(--um-bg-accent, #e3f2fd);
  border-color: var(--um-primary, #2196f3);
  color: var(--um-primary, #2196f3);
}

.preset-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.preset-label {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
}

.preset-count {
  font-size: 11px;
  background: var(--um-secondary, #757575);
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
}

.recent-activity-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.activity-item:hover {
  background: var(--um-hover, rgba(33, 150, 243, 0.1));
}

.activity-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-icon svg {
  width: 12px;
  height: 12px;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-text {
  font-size: 12px;
  color: var(--um-text-primary, #212121);
  line-height: 1.4;
  margin-bottom: 2px;
}

.activity-time {
  font-size: 10px;
  color: var(--um-text-secondary, #757575);
}

/* Контекст пользователя */
.user-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background: var(--um-bg-secondary, #f5f5f5);
  border-radius: 8px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--um-text-primary, #212121);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 11px;
  color: var(--um-text-secondary, #757575);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-change {
  font-size: 10px;
  font-weight: 600;
  margin-top: 4px;
}

.stat-change.positive { color: #4caf50; }
.stat-change.negative { color: #f44336; }

.filter-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--um-text-primary, #212121);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-select {
  padding: 6px 8px;
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 13px;
  background: white;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
}

.checkmark {
  width: 14px;
  height: 14px;
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 2px;
  position: relative;
}

.checkbox-label input:checked + .checkmark::after {
  content: '✓';
  position: absolute;
  top: -2px;
  left: 1px;
  font-size: 10px;
  color: var(--um-primary, #2196f3);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  font-weight: 500;
}

.action-button:hover:not(:disabled) {
  border-color: var(--um-primary, #2196f3);
  background: var(--um-hover, rgba(33, 150, 243, 0.1));
}

.action-button.primary {
  background: var(--um-primary, #2196f3);
  color: white;
  border-color: var(--um-primary, #2196f3);
}

.action-button.primary:hover {
  background: #1976d2;
}

.action-button.secondary {
  color: var(--um-primary, #2196f3);
}

.action-button.warning {
  color: #ff9800;
  border-color: #ff9800;
}

.action-button.warning:hover {
  background: rgba(255, 152, 0, 0.1);
}

.action-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* Контекст управления */
.selected-users-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.selected-user-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--um-bg-accent, #e3f2fd);
  border-radius: 16px;
  font-size: 12px;
  color: var(--um-primary, #2196f3);
}

.user-avatar.small {
  width: 20px;
  height: 20px;
}

.avatar-placeholder.small {
  font-size: 8px;
}

.more-users {
  padding: 4px 8px;
  background: var(--um-bg-secondary, #f5f5f5);
  border-radius: 16px;
  font-size: 12px;
  color: var(--um-text-secondary, #757575);
}

.bulk-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.bulk-action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  font-weight: 500;
}

.bulk-action-button:hover:not(:disabled) {
  background: var(--um-hover, rgba(33, 150, 243, 0.1));
  border-color: var(--um-primary, #2196f3);
}

.bulk-action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.audit-log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.audit-entry {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
}

.audit-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.audit-icon svg {
  width: 10px;
  height: 10px;
}

.audit-content {
  flex: 1;
  min-width: 0;
}

.audit-text {
  font-size: 11px;
  color: var(--um-text-primary, #212121);
  line-height: 1.3;
  margin-bottom: 2px;
}

.audit-time {
  font-size: 9px;
  color: var(--um-text-secondary, #757575);
}

/* Загрузка */
.sidebar-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--um-border-color, #e0e0e0);
  border-top: 2px solid var(--um-primary, #2196f3);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Адаптивность */
@media (max-width: 1024px) {
  .context-sidebar {
    width: 280px;
  }

  .context-sidebar.collapsed {
    width: 50px;
  }
}

@media (max-width: 768px) {
  .context-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    width: 320px;
    z-index: 1000;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
    transform: translateX(100%);
    transition: transform 0.3s ease;
  }

  .context-sidebar:not(.collapsed) {
    transform: translateX(0);
  }

  .collapse-toggle {
    display: none;
  }
}

/* Темная тема */
@media (prefers-color-scheme: dark) {
  .context-sidebar {
    background: var(--um-bg-dark-primary, #1e1e1e);
    border-left-color: var(--um-border-dark-color, #424242);
  }

  .collapse-toggle {
    background: var(--um-bg-dark-primary, #1e1e1e);
    border-color: var(--um-border-dark-color, #424242);
  }

  .section-title {
    color: var(--um-text-dark-primary, #ffffff);
  }

  .stat-item {
    background: var(--um-bg-dark-secondary, #2d2d2d);
  }

  .filter-preset,
  .action-button,
  .bulk-action-button {
    background: var(--um-bg-dark-primary, #2d2d2d);
    border-color: var(--um-border-dark-color, #424242);
    color: var(--um-text-dark-primary, #ffffff);
  }

  .sidebar-loading-overlay {
    background: rgba(30, 30, 30, 0.8);
  }
}
</style>