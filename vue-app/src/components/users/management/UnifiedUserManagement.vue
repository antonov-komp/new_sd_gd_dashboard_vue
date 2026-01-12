<template>
  <div
    class="unified-user-management"
    :class="{
      'loading': isLoading,
      'error': hasError,
      'compact-view': viewOptions.compactView
    }"
    role="main"
    aria-label="Единый интерфейс управления пользователями"
  >
    <!-- Загрузка -->
    <div v-if="isLoading" class="loading-overlay" aria-live="polite">
      <div class="loading-spinner" aria-hidden="true"></div>
      <div class="loading-message">{{ loadingMessage }}</div>
    </div>

    <!-- Ошибка -->
    <div v-else-if="hasError" class="error-state">
      <div class="error-content">
        <div class="error-icon" aria-hidden="true">⚠️</div>
        <h3 class="error-title">Ошибка загрузки</h3>
        <p class="error-message">{{ errorMessage }}</p>
        <button
          class="error-retry-btn"
          @click="retryLoading"
          :aria-label="`Повторить загрузку: ${errorMessage}`"
        >
          Повторить
        </button>
      </div>
    </div>

    <!-- Основной интерфейс -->
    <div v-else class="management-container">
      <!-- Drill-down навигация -->
      <DrillDownNavigation
        ref="drilldownNav"
        :breadcrumbs="breadcrumbs"
        :is-loading="isNavigating"
        :additional-actions="getAdditionalActions()"
        @navigate="handleBreadcrumbNavigate"
        @back="handleGoBack"
        @action="handleAdditionalAction"
      />

      <!-- Основная сетка интерфейса -->
      <div class="management-grid">
        <!-- Контекстная боковая панель -->
        <ContextSidebar
          :context="currentContext"
          :selected-user="selectedUser"
          :selected-users="selectedUsers"
          :global-metrics="globalMetrics"
          :user-stats="selectedUserStats"
          :user-filters="userFilters"
          :filter-presets="filterPresets"
          :active-preset="activePreset"
          :recent-activity="recentActivity"
          :audit-log="auditLog"
          :activity-types="activityTypes"
          :is-loading="isLoading"
          :can-edit-permissions="canEditPermissions"
          @toggle-collapse="handleSidebarToggle"
          @metric-click="handleMetricClick"
          @filter-preset-apply="handleFilterPresetApply"
          @activity-click="handleActivityClick"
          @filter-change="handleUserFilterChange"
          @view-profile="handleViewProfile"
          @export-data="handleExportData"
          @edit-permissions="handleEditPermissions"
          @bulk-action="handleBulkAction"
        />

        <!-- Основная область контента -->
        <div class="main-content-area">
          <!-- Панель списка пользователей (глобальный контекст) -->
          <UserListPanel
            v-if="isContextGlobal"
            :users="filteredUsers"
            :loading="isLoading"
            :pagination="pagination"
            :filters="filters"
            :view-options="viewOptions"
            :can-edit-permissions="canEditPermissions"
            :can-delete="canDeleteUsers"
            @user-select="handleUserSelect"
            @user-select-multiple="handleUserSelectMultiple"
            @filters-change="handleFiltersChange"
            @pagination-change="handlePaginationChange"
            @view-options-change="handleViewOptionsChange"
            @user-action="handleUserAction"
          />

          <!-- Панель анализа пользователя -->
          <AnalysisPanel
            v-else-if="isContextUser"
            :user="selectedUser"
            :activity-data="userActivityData"
            :filters="userFilters"
            :time-range="filters.time_range"
            :is-loading="isLoading"
            @back="handleGoBack"
            @filter-change="handleUserFilterChange"
            @export="handleExportUserData"
            @view-detailed="handleViewDetailedAnalysis"
          />

          <!-- Панель управления правами -->
          <ManagementPanel
            v-else-if="isContextManagement"
            :selected-users="selectedUsers"
            :all-users="filteredUsers"
            :departments="departments"
            :audit-log="auditLog"
            :is-loading="isLoading"
            :can-edit-permissions="canEditPermissions"
            @permissions-change="handlePermissionsChange"
            @bulk-update="handleBulkUpdate"
            @back="handleGoBack"
          />
        </div>
      </div>

      <!-- Глобальные действия -->
      <div class="global-actions">
        <button
          class="action-btn refresh"
          @click="handleRefresh"
          :disabled="isLoading"
          :aria-label="'Обновить данные'"
          title="Обновить данные (F5)"
        >
          <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          Обновить
        </button>

        <button
          class="action-btn export"
          @click="handleGlobalExport"
          :disabled="isLoading || filteredUsers.length === 0"
          :aria-label="'Экспортировать данные'"
          title="Экспортировать данные"
        >
          <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
          </svg>
          Экспорт
        </button>

        <button
          class="action-btn settings"
          @click="handleSettings"
          :aria-label="'Настройки интерфейса'"
          title="Настройки интерфейса"
        >
          <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
          </svg>
          Настройки
        </button>
      </div>
    </div>

    <!-- Модальные окна -->
    <UserProfileModal
      v-if="showUserProfileModal"
      :user="modalUser"
      :activity-data="modalActivityData"
      @close="closeUserProfileModal"
      @save="handleUserProfileSave"
    />

    <BulkActionsModal
      v-if="showBulkActionsModal"
      :selected-users="selectedUsers"
      :available-actions="bulkActions"
      @close="closeBulkActionsModal"
      @execute="handleBulkActionExecute"
    />

    <ExportModal
      v-if="showExportModal"
      :data-type="exportDataType"
      :filters="filters"
      :selected-users="selectedUsers"
      @close="closeExportModal"
      @export="handleExportExecute"
    />

    <!-- Тост уведомления -->
    <div v-if="notification" class="notification-toast" :class="notification.type">
      <div class="notification-content">
        <div class="notification-icon" aria-hidden="true">
          {{ notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️' }}
        </div>
        <div class="notification-message">{{ notification.message }}</div>
        <button
          class="notification-close"
          @click="closeNotification"
          :aria-label="'Закрыть уведомление'"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useUnifiedUserManagement } from '../../../composables/useUnifiedUserManagement.js';
import { useContextNavigation } from '../../../composables/useContextNavigation.js';

// Импорт компонентов
import DrillDownNavigation from '../shared/DrillDownNavigation.vue';
import ContextSidebar from '../shared/ContextSidebar.vue';
import UnifiedUserCard from '../shared/UnifiedUserCard.vue';

// Асинхронная загрузка тяжелых компонентов
const UserListPanel = () => import('./UserListPanel.vue');
const AnalysisPanel = () => import('./AnalysisPanel.vue');
const ManagementPanel = () => import('./ManagementPanel.vue');
const UserProfileModal = () => import('../shared/UserProfileModal.vue');
const BulkActionsModal = () => import('../shared/BulkActionsModal.vue');
const ExportModal = () => import('../shared/ExportModal.vue');

/**
 * UnifiedUserManagement - главный компонент единого интерфейса управления пользователями
 *
 * Объединяет все функциональные области в cohesive пользовательском опыте:
 * - управление пользователями
 * - анализ активности
 * - drill-down навигация
 * - контекстная боковая панель
 *
 * @version 1.0.0
 * @since TASK-089
 */
export default {
  name: 'UnifiedUserManagement',

  components: {
    DrillDownNavigation,
    ContextSidebar,
    UserListPanel,
    AnalysisPanel,
    ManagementPanel,
    UserProfileModal,
    BulkActionsModal,
    ExportModal
  },

  props: {
    /**
     * Начальные пользователи (для SSR или предзагрузки)
     */
    initialUsers: {
      type: Array,
      default: () => []
    },

    /**
     * Начальные фильтры
     */
    initialFilters: {
      type: Object,
      default: () => ({})
    },

    /**
     * Начальный выбранный пользователь
     */
    initialSelectedUser: {
      type: Object,
      default: null
    },

    /**
     * Конфигурация компонента
     */
    config: {
      type: Object,
      default: () => ({
        enablePersistence: true,
        enableKeyboardShortcuts: true,
        defaultView: 'global'
      })
    }
  },

  emits: [
    'user-selected',
    'context-changed',
    'data-exported',
    'permissions-updated',
    'bulk-action-completed'
  ],

  setup(props, { emit }) {
    // Инициализация composables
    const {
      state,
      hasSelectedUsers,
      selectedUserStats,
      canEditPermissions,
      canDeleteUsers,
      contextTitle,
      isContextGlobal,
      isContextUser,
      isContextManagement,
      loadUsers,
      loadGlobalMetrics,
      selectUser,
      deselectUser,
      switchToGlobal,
      switchToManagement,
      updateFilters,
      resetFilters,
      saveFilterPreset,
      loadFilterPreset,
      updateBreadcrumbs,
      goBack,
      updateUserPermissions,
      toggleUserVisibility,
      performBulkAction,
      refreshData,
      emitNotification
    } = useUnifiedUserManagement({
      enablePersistence: props.config.enablePersistence,
      defaultContext: props.config.defaultView
    });

    const {
      canGoBack,
      canGoForward,
      currentCrumb,
      previousCrumb,
      isAtRoot,
      navigationPath,
      navigateToContext,
      goBack: navGoBack,
      navigateToCrumb,
      goToRoot,
      addCustomCrumb,
      removeLastCrumb,
      clearNavigation,
      getNavigationHistory,
      clearNavigationHistory
    } = useContextNavigation({
      enablePersistence: props.config.enablePersistence
    });

    // Локальное реактивное состояние
    const showUserProfileModal = ref(false);
    const showBulkActionsModal = ref(false);
    const showExportModal = ref(false);
    const modalUser = ref(null);
    const modalActivityData = ref(null);
    const exportDataType = ref('users');
    const notification = ref(null);
    const notificationTimeout = ref(null);

    // Вычисляемые свойства
    const isLoading = computed(() => state.loading);
    const loadingMessage = computed(() => state.loadingMessage);
    const hasError = computed(() => !!state.error);
    const errorMessage = computed(() => state.error);
    const currentContext = computed(() => state.currentContext);
    const selectedUser = computed(() => state.selectedUser);
    const selectedUsers = computed(() => state.selectedUsers);
    const breadcrumbs = computed(() => state.breadcrumbs);
    const filters = computed(() => state.filters);
    const userFilters = computed(() => state.filters);
    const filteredUsers = computed(() => state.filteredUsers);
    const pagination = computed(() => state.pagination);
    const globalMetrics = computed(() => state.globalMetrics);
    const viewOptions = computed(() => state.viewOptions);
    const departments = computed(() => state.departments || []);
    const activityTypes = computed(() => state.activityTypes || []);
    const filterPresets = computed(() => state.filterPresets || []);
    const activePreset = computed(() => state.activePreset);
    const recentActivity = computed(() => state.recentActivity || []);
    const auditLog = computed(() => state.auditLog || []);
    const isNavigating = computed(() => state.isNavigating);

    // Моковые данные для демонстрации
    const bulkActions = computed(() => [
      { id: 'change_department', label: 'Изменить отдел', icon: 'BuildingIcon' },
      { id: 'toggle_admin', label: 'Изменить права администратора', icon: 'ShieldIcon' },
      { id: 'export', label: 'Экспорт данных', icon: 'DownloadIcon' },
      { id: 'hide_users', label: 'Скрыть пользователей', icon: 'EyeOffIcon' }
    ]);

    const userActivityData = computed(() => {
      if (!selectedUser.value) return {};

      // Моковые данные активности (будут заменены на реальные API)
      return {
        timeline: [],
        sessions: [],
        stats: selectedUserStats.value,
        trends: {}
      };
    });

    // Методы обработки событий

    /**
     * Обработчик выбора пользователя
     */
    const handleUserSelect = async (user) => {
      try {
        await selectUser(user);
        emit('user-selected', user);
      } catch (error) {
        showNotification('Ошибка выбора пользователя', 'error');
      }
    };

    /**
     * Обработчик множественного выбора пользователей
     */
    const handleUserSelectMultiple = (users) => {
      state.selectedUsers = users;
    };

    /**
     * Обработчик изменения фильтров
     */
    const handleFiltersChange = (newFilters) => {
      updateFilters(newFilters);
    };

    /**
     * Обработчик изменения пагинации
     */
    const handlePaginationChange = async (newPage) => {
      await loadUsers({ page: newPage });
    };

    /**
     * Обработчик изменения опций отображения
     */
    const handleViewOptionsChange = (newOptions) => {
      Object.assign(state.viewOptions, newOptions);
      // Сохранение в localStorage
      localStorage.setItem('um-view-options', JSON.stringify(state.viewOptions));
    };

    /**
     * Обработчик действий с пользователем
     */
    const handleUserAction = async (action, user) => {
      try {
        switch (action) {
          case 'view-profile':
            await handleViewProfile(user);
            break;
          case 'edit-permissions':
            await handleEditPermissions(user);
            break;
          case 'toggle-visibility':
            await toggleUserVisibility(user.id);
            break;
          case 'delete':
            if (confirm(`Вы уверены, что хотите удалить пользователя ${user.name}?`)) {
              await performBulkAction('delete', [user.id]);
            }
            break;
          default:
            console.warn('[UnifiedUserManagement] Unknown user action:', action);
        }
      } catch (error) {
        showNotification(`Ошибка выполнения действия: ${error.message}`, 'error');
      }
    };

    /**
     * Обработчик breadcrumb навигации
     */
    const handleBreadcrumbNavigate = async (crumb) => {
      try {
        if (crumb.action) {
          await crumb.action();
        } else {
          await navigateToContext(crumb.context, crumb.data);
        }
      } catch (error) {
        showNotification('Ошибка навигации', 'error');
      }
    };

    /**
     * Обработчик возврата назад
     */
    const handleGoBack = async () => {
      try {
        const success = await goBack();
        if (!success) {
          await switchToGlobal();
        }
      } catch (error) {
        showNotification('Ошибка возврата', 'error');
      }
    };

    /**
     * Обработчик дополнительных действий
     */
    const handleAdditionalAction = (action) => {
      switch (action.id) {
        case 'refresh':
          handleRefresh();
          break;
        case 'export':
          handleGlobalExport();
          break;
        case 'settings':
          handleSettings();
          break;
        default:
          console.warn('[UnifiedUserManagement] Unknown additional action:', action);
      }
    };

    /**
     * Получение дополнительных действий для breadcrumb
     */
    const getAdditionalActions = () => {
      return [
        {
          id: 'refresh',
          text: 'Обновить',
          icon: 'RefreshCwIcon',
          class: 'refresh'
        },
        {
          id: 'export',
          text: 'Экспорт',
          icon: 'DownloadIcon',
          class: 'export'
        },
        {
          id: 'settings',
          text: 'Настройки',
          icon: 'SettingsIcon',
          class: 'settings'
        }
      ];
    };

    // Методы модальных окон и действий

    /**
     * Просмотр профиля пользователя
     */
    const handleViewProfile = async (user) => {
      modalUser.value = user;
      modalActivityData.value = await loadUserActivityData(user.id);
      showUserProfileModal.value = true;
    };

    /**
     * Редактирование прав пользователя
     */
    const handleEditPermissions = async (user) => {
      await switchToManagement({ selectedUsers: [user] });
    };

    /**
     * Экспорт данных пользователя
     */
    const handleExportData = (user) => {
      exportDataType.value = 'user';
      state.selectedUsers = [user];
      showExportModal.value = true;
    };

    /**
     * Экспорт пользовательских данных
     */
    const handleExportUserData = () => {
      handleExportData(selectedUser.value);
    };

    /**
     * Детальный анализ пользователя
     */
    const handleViewDetailedAnalysis = () => {
      // Переход к детальному анализу (можно добавить новый контекст)
      addCustomCrumb({
        id: 'detailed-analysis',
        label: 'Детальный анализ',
        icon: 'BarChartIcon',
        action: () => removeLastCrumb()
      });
    };

    /**
     * Изменение прав доступа
     */
    const handlePermissionsChange = async (userId, permissions) => {
      try {
        await updateUserPermissions(userId, permissions);
        showNotification('Права доступа обновлены', 'success');
        emit('permissions-updated', { userId, permissions });
      } catch (error) {
        showNotification('Ошибка обновления прав', 'error');
      }
    };

    /**
     * Массовое обновление
     */
    const handleBulkUpdate = async (action, data) => {
      try {
        await performBulkAction(action, state.selectedUsers.map(u => u.id), data);
        showNotification(`Массовое действие "${action}" выполнено`, 'success');
        emit('bulk-action-completed', { action, data });
      } catch (error) {
        showNotification(`Ошибка выполнения действия "${action}"`, 'error');
      }
    };

    /**
     * Обновление данных
     */
    const handleRefresh = async () => {
      try {
        await refreshData();
        showNotification('Данные обновлены', 'success');
      } catch (error) {
        showNotification('Ошибка обновления данных', 'error');
      }
    };

    /**
     * Глобальный экспорт
     */
    const handleGlobalExport = () => {
      exportDataType.value = 'users';
      showExportModal.value = true;
    };

    /**
     * Настройки интерфейса
     */
    const handleSettings = () => {
      // Открытие модального окна настроек (пока заглушка)
      showNotification('Настройки интерфейса - функционал в разработке', 'info');
    };

    // Методы модальных окон

    /**
     * Закрытие модального окна профиля
     */
    const closeUserProfileModal = () => {
      showUserProfileModal.value = false;
      modalUser.value = null;
      modalActivityData.value = null;
    };

    /**
     * Сохранение профиля пользователя
     */
    const handleUserProfileSave = async (updatedUser) => {
      try {
        // Имитация сохранения (будет заменено на API)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Обновление локального состояния
        const userIndex = state.users.findIndex(u => u.id === updatedUser.id);
        if (userIndex !== -1) {
          state.users[userIndex] = { ...state.users[userIndex], ...updatedUser };
        }

        showNotification('Профиль сохранен', 'success');
        closeUserProfileModal();
      } catch (error) {
        showNotification('Ошибка сохранения профиля', 'error');
      }
    };

    /**
     * Закрытие модального окна массовых действий
     */
    const closeBulkActionsModal = () => {
      showBulkActionsModal.value = false;
    };

    /**
     * Выполнение массового действия
     */
    const handleBulkActionExecute = async (action) => {
      await handleBulkUpdate(action.id, action.data);
      closeBulkActionsModal();
    };

    /**
     * Закрытие модального окна экспорта
     */
    const closeExportModal = () => {
      showExportModal.value = false;
      exportDataType.value = 'users';
    };

    /**
     * Выполнение экспорта
     */
    const handleExportExecute = async (exportConfig) => {
      try {
        // Имитация экспорта (будет заменено на реальную логику)
        await new Promise(resolve => setTimeout(resolve, 1000));

        showNotification('Экспорт завершен', 'success');
        closeExportModal();
        emit('data-exported', exportConfig);
      } catch (error) {
        showNotification('Ошибка экспорта', 'error');
      }
    };

    // Методы контекстной боковой панели

    /**
     * Переключение сворачивания боковой панели
     */
    const handleSidebarToggle = (collapsed) => {
      // Сохранение состояния в localStorage
      localStorage.setItem('um-sidebar-collapsed', collapsed);
    };

    /**
     * Клик на метрику
     */
    const handleMetricClick = (metric) => {
      // Применение фильтра на основе метрики
      switch (metric.id) {
        case 'active_users':
          updateFilters({ activity_filter: 'active' });
          break;
        case 'new_users_today':
          updateFilters({ time_range: 'today', activity_filter: 'new' });
          break;
        // Другие метрики...
      }
    };

    /**
     * Применение предустановки фильтра
     */
    const handleFilterPresetApply = (preset) => {
      loadFilterPreset(preset.id);
      showNotification(`Применен фильтр "${preset.label}"`, 'success');
    };

    /**
     * Клик на действие
     */
    const handleActivityClick = (activity) => {
      // Обработка клика на недавнее действие
      console.log('Activity clicked:', activity);
    };

    /**
     * Изменение фильтра пользователя
     */
    const handleUserFilterChange = (newFilters) => {
      updateFilters(newFilters);
    };

    /**
     * Выполнение массового действия из боковой панели
     */
    const handleBulkAction = async (bulkAction) => {
      await handleBulkUpdate(bulkAction.action, bulkAction.users.map(u => u.id));
    };

    // Вспомогательные методы

    /**
     * Загрузка данных активности пользователя
     */
    const loadUserActivityData = async (userId) => {
      // Имитация загрузки (будет заменено на API)
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        timeline: [],
        sessions: [],
        stats: selectedUserStats.value
      };
    };

    /**
     * Повторная попытка загрузки
     */
    const retryLoading = async () => {
      state.error = null;
      try {
        await refreshData();
      } catch (error) {
        state.error = error.message;
      }
    };

    /**
     * Показ уведомления
     */
    const showNotification = (message, type = 'info') => {
      notification.value = { message, type };

      // Автоматическое скрытие
      if (notificationTimeout.value) {
        clearTimeout(notificationTimeout.value);
      }

      notificationTimeout.value = setTimeout(() => {
        closeNotification();
      }, 5000);

      // Отправка в emitNotification для совместимости
      emitNotification(message, type);
    };

    /**
     * Закрытие уведомления
     */
    const closeNotification = () => {
      notification.value = null;
      if (notificationTimeout.value) {
        clearTimeout(notificationTimeout.value);
        notificationTimeout.value = null;
      }
    };

    // Настройка клавиатурных сокращений
    const setupKeyboardShortcuts = () => {
      const handleKeydown = (event) => {
        // Ctrl/Cmd + R - обновить
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
          event.preventDefault();
          handleRefresh();
        }

        // Ctrl/Cmd + E - экспорт
        if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
          event.preventDefault();
          handleGlobalExport();
        }

        // Escape - закрыть модальные окна
        if (event.key === 'Escape') {
          if (showUserProfileModal.value) {
            closeUserProfileModal();
          } else if (showBulkActionsModal.value) {
            closeBulkActionsModal();
          } else if (showExportModal.value) {
            closeExportModal();
          }
        }
      };

      document.addEventListener('keydown', handleKeydown);

      return () => {
        document.removeEventListener('keydown', handleKeydown);
      };
    };

    // Инициализация
    let cleanupKeyboardShortcuts;

    onMounted(async () => {
      // Настройка клавиатурных сокращений
      if (props.config.enableKeyboardShortcuts) {
        cleanupKeyboardShortcuts = setupKeyboardShortcuts();
      }

      // Загрузка начальных данных
      try {
        if (props.initialUsers.length > 0) {
          state.users = props.initialUsers;
        }

        if (props.initialSelectedUser) {
          await selectUser(props.initialSelectedUser);
        }

        await nextTick();
      } catch (error) {
        console.error('[UnifiedUserManagement] Initialization error:', error);
        state.error = error.message;
      }
    });

    onUnmounted(() => {
      // Очистка
      if (cleanupKeyboardShortcuts) {
        cleanupKeyboardShortcuts();
      }

      if (notificationTimeout.value) {
        clearTimeout(notificationTimeout.value);
      }
    });

    // Экспорт интерфейса
    return {
      // Реактивное состояние
      showUserProfileModal,
      showBulkActionsModal,
      showExportModal,
      modalUser,
      modalActivityData,
      exportDataType,
      notification,

      // Вычисляемые свойства
      isLoading,
      loadingMessage,
      hasError,
      errorMessage,
      currentContext,
      selectedUser,
      selectedUsers,
      breadcrumbs,
      filters,
      userFilters,
      filteredUsers,
      pagination,
      globalMetrics,
      viewOptions,
      departments,
      activityTypes,
      filterPresets,
      activePreset,
      recentActivity,
      auditLog,
      isNavigating,
      bulkActions,
      userActivityData,

      // Методы
      handleUserSelect,
      handleUserSelectMultiple,
      handleFiltersChange,
      handlePaginationChange,
      handleViewOptionsChange,
      handleUserAction,
      handleBreadcrumbNavigate,
      handleGoBack,
      handleAdditionalAction,
      getAdditionalActions,
      handleViewProfile,
      handleEditPermissions,
      handleExportData,
      handleExportUserData,
      handleViewDetailedAnalysis,
      handlePermissionsChange,
      handleBulkUpdate,
      handleRefresh,
      handleGlobalExport,
      handleSettings,
      closeUserProfileModal,
      handleUserProfileSave,
      closeBulkActionsModal,
      handleBulkActionExecute,
      closeExportModal,
      handleExportExecute,
      handleSidebarToggle,
      handleMetricClick,
      handleFilterPresetApply,
      handleActivityClick,
      handleUserFilterChange,
      handleBulkAction,
      loadUserActivityData,
      retryLoading,
      showNotification,
      closeNotification
    };
  }
};
</script>

<style scoped>
.unified-user-management {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--um-bg-primary, #ffffff);
  overflow: hidden;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--um-border-color, #e0e0e0);
  border-top: 3px solid var(--um-primary, #2196f3);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-message {
  color: var(--um-text-secondary, #757575);
  font-size: 14px;
  text-align: center;
}

.error-state {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--um-bg-primary, #ffffff);
}

.error-content {
  text-align: center;
  max-width: 400px;
  padding: 32px;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-title {
  margin: 0 0 8px 0;
  color: var(--um-text-primary, #212121);
  font-size: 20px;
  font-weight: 600;
}

.error-message {
  margin: 0 0 24px 0;
  color: var(--um-text-secondary, #757575);
  line-height: 1.5;
}

.error-retry-btn {
  padding: 10px 20px;
  border: 1px solid var(--um-primary, #2196f3);
  border-radius: 6px;
  background: var(--um-primary, #2196f3);
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.error-retry-btn:hover {
  background: #1976d2;
}

.management-container {
  flex: 1;
  display: flex;
  flex-direction: column;
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

.global-actions {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  gap: 8px;
  z-index: 50;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 8px;
  background: var(--um-bg-primary, #ffffff);
  color: var(--um-text-primary, #212121);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.action-btn:hover:not(:disabled) {
  border-color: var(--um-primary, #2196f3);
  background: var(--um-hover, rgba(33, 150, 243, 0.1));
  color: var(--um-primary, #2196f3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.action-btn.refresh:hover {
  border-color: var(--um-success, #4caf50);
  background: rgba(76, 175, 80, 0.1);
  color: var(--um-success, #4caf50);
}

.action-btn.export:hover {
  border-color: var(--um-info, #00bcd4);
  background: rgba(0, 188, 212, 0.1);
  color: var(--um-info, #00bcd4);
}

.action-btn.settings:hover {
  border-color: var(--um-secondary, #757575);
  background: rgba(117, 117, 117, 0.1);
  color: var(--um-secondary, #757575);
}

.action-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.notification-toast {
  position: fixed;
  top: 24px;
  right: 24px;
  max-width: 400px;
  z-index: 1000;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: var(--um-bg-primary, #ffffff);
  border-left: 4px solid var(--um-primary, #2196f3);
}

.notification-toast.success .notification-content {
  border-left-color: var(--um-success, #4caf50);
}

.notification-toast.error .notification-content {
  border-left-color: var(--um-danger, #f44336);
}

.notification-icon {
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 2px;
}

.notification-message {
  flex: 1;
  color: var(--um-text-primary, #212121);
  line-height: 1.4;
}

.notification-close {
  background: none;
  border: none;
  color: var(--um-text-secondary, #757575);
  cursor: pointer;
  font-size: 18px;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.notification-close:hover {
  background: var(--um-hover, rgba(33, 150, 243, 0.1));
  color: var(--um-text-primary, #212121);
}

/* Адаптивность */
@media (max-width: 1024px) {
  .management-grid {
    grid-template-columns: 280px 1fr;
  }
}

@media (max-width: 768px) {
  .unified-user-management {
    height: auto;
  }

  .management-grid {
    display: flex;
    flex-direction: column;
  }

  .main-content-area {
    padding: 16px;
  }

  .global-actions {
    position: static;
    margin-top: 16px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .notification-toast {
    left: 16px;
    right: 16px;
    max-width: none;
  }
}

@media (max-width: 480px) {
  .main-content-area {
    padding: 12px;
  }

  .action-btn {
    padding: 8px 12px;
    font-size: 13px;
  }

  .global-actions {
    gap: 4px;
  }
}

/* Темная тема */
@media (prefers-color-scheme: dark) {
  .unified-user-management {
    background: var(--um-bg-dark-primary, #1e1e1e);
  }

  .loading-overlay {
    background: rgba(30, 30, 30, 0.9);
  }

  .error-state {
    background: var(--um-bg-dark-primary, #1e1e1e);
  }

  .error-title {
    color: var(--um-text-dark-primary, #ffffff);
  }

  .error-message {
    color: var(--um-text-dark-secondary, #b0b0b0);
  }

  .main-content-area {
    background: var(--um-bg-dark-primary, #1e1e1e);
  }

  .action-btn {
    background: var(--um-bg-dark-primary, #2d2d2d);
    border-color: var(--um-border-dark-color, #424242);
    color: var(--um-text-dark-primary, #ffffff);
  }

  .notification-content {
    background: var(--um-bg-dark-primary, #2d2d2d);
    border-left-color: var(--um-primary, #2196f3);
  }

  .notification-message {
    color: var(--um-text-dark-primary, #ffffff);
  }

  .notification-close {
    color: var(--um-text-dark-secondary, #b0b0b0);
  }
}

/* Высокий контраст */
@media (prefers-contrast: high) {
  .action-btn {
    border-width: 2px;
  }

  .notification-content {
    border-width: 2px;
  }

  .error-retry-btn {
    border-width: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
  }

  .action-btn {
    transition: none;
  }

  .notification-toast {
    animation: none;
  }
}
</style>