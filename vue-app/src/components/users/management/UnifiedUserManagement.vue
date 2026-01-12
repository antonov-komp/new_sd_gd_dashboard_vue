<template>
  <div class="unified-user-management">

    <!-- Drill-down навигация -->
    <DrillDownNavigation
      :breadcrumbs="breadcrumbs"
      :is-loading="loading"
      @navigate="handleBreadcrumbNavigate"
      @back="handleGoBack"
    />

    <!-- Основная сетка интерфейса -->
    <div class="management-grid">
      <!-- Контекстная боковая панель -->
      <ContextSidebar
        :context="currentContext"
        :global-metrics="globalMetrics"
        :selected-user="selectedUser"
        @metric-click="handleMetricClick"
      />

      <!-- Основная область контента -->
      <div class="main-content-area">
        <!-- Панель списка пользователей -->
        <UserListPanel
          v-if="currentContext === 'global'"
          :users="users"
          :loading="loading"
          :pagination="{ current_page: 1, total: users.length, total_pages: 1 }"
          :filters="filters"
          :can-edit-permissions="true"
          :can-delete="false"
          @user-select="handleUserSelect"
        />

        <!-- Панель анализа пользователя -->
        <AnalysisPanel
          v-else-if="currentContext === 'user'"
          :user="selectedUser"
          @back="handleGoBack"
        />

        <!-- Панель управления правами -->
        <ManagementPanel
          v-else-if="currentContext === 'management'"
          @back="handleGoBack"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';

// Импорт компонентов
import DrillDownNavigation from '../shared/DrillDownNavigation.vue';
import ContextSidebar from '../shared/ContextSidebar.vue';
import UserListPanel from './UserListPanel.vue';
import AnalysisPanel from './AnalysisPanel.vue';
import ManagementPanel from './ManagementPanel.vue';

export default {
  name: 'UnifiedUserManagement',

  components: {
    DrillDownNavigation,
    ContextSidebar,
    UserListPanel,
    AnalysisPanel,
    ManagementPanel
  },

  props: {
    config: {
      type: Object,
      default: () => ({
        enablePersistence: true,
        enableKeyboardShortcuts: true,
        defaultView: 'global'
      })
    }
  },

  setup(props) {
    console.log('[UnifiedUserManagement] Component loaded successfully', props.config);

    // Реактивное состояние
    const currentContext = ref('global');
    const selectedUser = ref(null);
    const loading = ref(false);

    // Mock данные для демонстрации
    const users = ref([
      {
        id: 1,
        name: 'Иван Иванов',
        email: 'ivan@example.com',
        departments: [{ id: 369, name: 'Битрикс24 отдел', color: '#2196F3' }],
        is_admin: true,
        activity_stats: {
          total_actions: 156,
          last_activity: new Date().toISOString(),
          activity_score: 85
        },
        status: 'online'
      },
      {
        id: 2,
        name: 'Петр Петров',
        email: 'petr@example.com',
        departments: [{ id: 366, name: 'Сектор 1С', color: '#4CAF50' }],
        is_admin: false,
        activity_stats: {
          total_actions: 89,
          last_activity: new Date(Date.now() - 86400000).toISOString(),
          activity_score: 67
        },
        status: 'away'
      },
      {
        id: 3,
        name: 'Анна Сидорова',
        email: 'anna@example.com',
        departments: [],
        is_admin: false,
        activity_stats: {
          total_actions: 23,
          last_activity: new Date(Date.now() - 604800000).toISOString(),
          activity_score: 35
        },
        status: 'offline'
      }
    ]);

    const filters = ref({
      search: '',
      department_ids: [],
      activity_filter: 'all',
      sort_by: 'last_activity',
      sort_order: 'desc'
    });

    const globalMetrics = ref([
      { id: 'total_users', label: 'Всего пользователей', value: users.value.length, change: 5.2 },
      { id: 'active_users', label: 'Активных сегодня', value: users.value.filter(u => u.status === 'online').length, change: 12.1 },
      { id: 'new_users', label: 'Новых сегодня', value: 1, change: -2.3 }
    ]);

    // Breadcrumbs для навигации
    const breadcrumbs = computed(() => {
      const crumbs = [
        {
          id: 'global',
          label: 'Управление пользователями',
          icon: 'UsersIcon',
          action: () => switchToContext('global')
        }
      ];

      if (currentContext.value === 'user' && selectedUser.value) {
        crumbs.push({
          id: `user-${selectedUser.value.id}`,
          label: selectedUser.value.name,
          icon: 'UserIcon',
          action: () => selectUser(selectedUser.value)
        });
      }

      if (currentContext.value === 'management') {
        crumbs.push({
          id: 'management',
          label: 'Управление правами',
          icon: 'SettingsIcon',
          action: () => switchToContext('management')
        });
      }

      return crumbs;
    });

    // Методы
    const switchToContext = (context, data = {}) => {
      currentContext.value = context;
      if (data.user) {
        selectedUser.value = data.user;
      }
      console.log(`[UnifiedUserManagement] Switched to context: ${context}`, data);
    };

    const selectUser = (user) => {
      selectedUser.value = user;
      switchToContext('user', { user });
    };

    const handleUserSelect = (user) => {
      selectUser(user);
    };

    const handleBreadcrumbNavigate = (crumb) => {
      if (crumb.action) {
        crumb.action();
      }
    };

    const handleGoBack = () => {
      if (currentContext.value === 'user' || currentContext.value === 'management') {
        switchToContext('global');
        selectedUser.value = null;
      }
      console.log(`[UnifiedUserManagement] Returned to global context`);
    };

    const handleMetricClick = (metric) => {
      console.log('Metric clicked:', metric);
      // Здесь можно добавить логику фильтрации по метрике
    };

    return {
      // Состояние
      currentContext,
      selectedUser,
      loading,
      users,
      filters,
      globalMetrics,
      breadcrumbs,

      // Методы
      handleUserSelect,
      handleBreadcrumbNavigate,
      handleGoBack,
      handleMetricClick
    };
  }
};
</script>

<style scoped>
.unified-user-management {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--um-bg-primary, #ffffff);
  overflow: hidden;
}

.management-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 0;
  overflow: hidden;
}

.main-content-area {
  padding: 24px;
  overflow-y: auto;
  background: var(--um-bg-primary, #ffffff);
}

.management-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 0;
  overflow: hidden;
}

.main-content-area {
  padding: 24px;
  overflow-y: auto;
  background: var(--um-bg-primary, #ffffff);
}

/* Адаптивность */
@media (max-width: 1024px) {
  .management-grid {
    grid-template-columns: 280px 1fr;
  }
}

@media (max-width: 768px) {
  .management-grid {
    display: flex;
    flex-direction: column;
  }

  .main-content-area {
    padding: 16px;
  }
}
</style>