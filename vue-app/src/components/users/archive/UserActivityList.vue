<template>
  <div class="user-activity-container">
    <!-- Режим: Список активности -->
    <div v-if="viewMode === 'list'" class="user-activity-list">
      <div class="list-header">
        <div class="header-info">
          <h2 class="list-title">📋 Активность пользователей</h2>
          <p class="list-subtitle">
            Анализ действий пользователей в системе
          </p>
        </div>
        <div class="header-actions">
          <button @click="switchToDashboard" class="dashboard-btn">
            📊 Дашборд анализа
          </button>
        </div>
      </div>

      <!-- Управление фильтрами -->
      <div class="filters-section">
        <HiddenUsersManager :filters="filters" />
        <UserActivityFilters
          :filters="filters"
          :users="availableUsers"
          @update-filters="handleFiltersUpdate"
        />
      </div>

      <!-- Статистика -->
      <UserActivityStats :filters="filters" />

      <!-- Список активности -->
      <div v-if="loading" class="loading">
        Загрузка активности...
      </div>

      <div v-else-if="error" class="error">
        {{ error }}
      </div>

      <div v-else-if="activity.length === 0" class="empty">
        Активность не найдена
      </div>

      <div v-else class="activity-items">
        <UserActivityCard
          v-for="entry in activity"
          :key="getEntryKey(entry)"
          :entry="entry"
          @click="handleViewDetails(entry)"
          v-if="entry && typeof entry === 'object' && entry.user_id && entry.timestamp && typeof entry.type === 'string'"
        />
      </div>
    </div>

    <!-- Режим: Дашборд анализа -->
    <div v-else-if="viewMode === 'dashboard'" class="analysis-dashboard">
      <ActivityDashboard
        v-if="!loading"
        :initial-filters="filters"
        @user-profile-request="switchToUserProfile"
      />
      <div v-else class="loading-state">
        Загрузка дашборда анализа...
      </div>
    </div>

    <!-- Режим: Профиль пользователя -->
    <div v-else-if="viewMode === 'profile'" class="user-profile">
      <UserProfileAnalysis
        v-if="selectedUserId && !loading"
        :user-id="selectedUserId"
        :filters="filters"
        @back="switchToDashboard"
        @export="handleProfileExport"
      />
      <div v-else class="loading-state">
        Загрузка профиля пользователя...
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { UserActivityService } from '@/services/user-activity-service.js';
import { filterHiddenUsers } from '@/utils/hidden-users-manager.js';

// Импорт компонентов
import UserActivityCard from './UserActivityCard.vue';
import HiddenUsersManager from './HiddenUsersManager.vue';
import UserActivityFilters from './UserActivityFilters.vue';
import UserActivityStats from './UserActivityStats.vue';
import ActivityDashboard from './analysis/ActivityDashboard.vue';
import UserProfileAnalysis from './analysis/UserProfileAnalysis.vue';

export default {
  name: 'UserActivityList',
  components: {
    UserActivityCard,
    HiddenUsersManager,
    UserActivityFilters,
    UserActivityStats,
    ActivityDashboard,
    UserProfileAnalysis
  },
  props: {
    userId: {
      type: Number,
      default: null
    },
    dateFrom: {
      type: String,
      default: null
    },
    dateTo: {
      type: String,
      default: null
    },
    type: {
      type: String,
      default: null
    }
  },
  emits: ['view-details'],
  setup(props, { emit }) {
    // Режимы отображения
    const viewMode = ref('list'); // 'list' | 'dashboard' | 'profile'
    const selectedUserId = ref(null);

    // Данные активности
    const rawActivity = ref([]);
    const loading = ref(false);
    const error = ref(null);

    // Фильтры
    const filters = ref({
      userId: props.userId,
      dateFrom: props.dateFrom,
      dateTo: props.dateTo,
      type: props.type
    });

    // Список доступных пользователей для фильтров
    const availableUsers = ref([]);

    // Фильтрованная активность (без скрытых пользователей)
    const activity = computed(() => {
      try {
        if (!Array.isArray(rawActivity.value)) {
          return [];
        }

        // Фильтруем только валидные объекты
        const validActivity = rawActivity.value.filter(entry =>
          entry &&
          typeof entry === 'object' &&
          entry !== null &&
          entry.user_id &&
          entry.timestamp &&
          typeof entry.type === 'string'
        );

        return filterHiddenUsers(validActivity);
      } catch (error) {
        console.warn('[UserActivityList] Error filtering activity:', error);
        return [];
      }
    });

    const loadActivity = async () => {
      loading.value = true;
      error.value = null;

      try {
        rawActivity.value = await UserActivityService.getActivity(filters.value);

        // Получаем список уникальных пользователей
        const userMap = new Map();
        rawActivity.value.forEach(entry => {
          if (entry.user_id && !userMap.has(entry.user_id)) {
            userMap.set(entry.user_id, {
              ID: entry.user_id,
              NAME: entry.user_name || '',
              LAST_NAME: '',
              EMAIL: entry.user_email || ''
            });
          }
        });
        availableUsers.value = Array.from(userMap.values());
      } catch (err) {
        error.value = err.message || 'Ошибка загрузки активности';
        console.error('[UserActivityList] Error:', err);
      } finally {
        loading.value = false;
      }
    };

    // Переключение режимов
    const switchToDashboard = () => {
      viewMode.value = 'dashboard';
    };

    const switchToUserProfile = (user) => {
      selectedUserId.value = user.id;
      viewMode.value = 'profile';
    };

    const switchToList = () => {
      viewMode.value = 'list';
    };

    // Обработчики событий
    const handleViewDetails = (entry) => {
      emit('view-details', entry);
    };

    const handleFiltersUpdate = (newFilters) => {
      filters.value = { ...newFilters };
      loadActivity();
    };

    const handleProfileExport = (exportData) => {
      console.log('Export profile:', exportData);
      // TODO: Реализовать экспорт профиля
    };

    const getEntryKey = (entry) => {
      if (!entry) return 'undefined-entry';
      return `${entry.timestamp || 'no-timestamp'}-${entry.user_id || 'no-user'}-${entry.type || 'no-type'}-${entry.route_path || ''}`;
    };

    // Обработчик события изменения скрытых пользователей
    const handleHiddenUsersChange = () => {
      // Перезагружаем активность для применения фильтрации
      loadActivity();
    };

    onMounted(() => {
      loadActivity();

      // Подписываемся на событие изменения скрытых пользователей
      window.addEventListener('hidden-users-changed', handleHiddenUsersChange);
    });

    onUnmounted(() => {
      // Отписываемся от события
      window.removeEventListener('hidden-users-changed', handleHiddenUsersChange);
    });

    // Наблюдатели
    watch(() => [props.userId, props.dateFrom, props.dateTo, props.type], () => {
      filters.value = {
        userId: props.userId,
        dateFrom: props.dateFrom,
        dateTo: props.dateTo,
        type: props.type
      };
      loadActivity();
    }, { deep: true });

    return {
      // Режимы
      viewMode,
      selectedUserId,

      // Данные
      activity,
      loading,
      error,
      filters,
      availableUsers,

      // Методы
      switchToDashboard,
      switchToUserProfile,
      switchToList,
      handleViewDetails,
      handleFiltersUpdate,
      handleProfileExport,
      getEntryKey
    };
  }
};
</script>

<style scoped>
.user-activity-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.user-activity-list {
  padding: 20px;
}

.list-header {
  background: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-info h2 {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.list-subtitle {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.dashboard-btn {
  padding: 10px 16px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.dashboard-btn:hover {
  background: #1976D2;
}

.filters-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.analysis-dashboard,
.user-profile {
  /* Эти компоненты имеют свои собственные стили */
}

.loading,
.error,
.empty {
  padding: 40px 20px;
  text-align: center;
  color: #666;
  font-size: 14px;
}

.error {
  color: #dc3545;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}

.empty {
  color: #999;
  font-style: italic;
}

.activity-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  font-size: 16px;
  color: #666;
}

.analysis-dashboard,
.user-profile {
  /* Эти компоненты имеют свои собственные стили */
}

/* Responsive */
@media (max-width: 768px) {
  .user-activity-container {
    padding: 0;
  }

  .user-activity-list {
    padding: 16px;
  }

  .list-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
    padding: 16px;
  }

  .header-info h2 {
    font-size: 20px;
  }

  .header-actions {
    width: 100%;
    justify-content: center;
  }

  .dashboard-btn {
    width: 100%;
  }

  .filters-section {
    gap: 12px;
  }
}
</style>

