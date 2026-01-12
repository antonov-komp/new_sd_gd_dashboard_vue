/**
 * useUnifiedUserManagement - главный composable для управления единым интерфейсом пользователей
 *
 * Предоставляет централизованное управление состоянием для:
 * - списка пользователей
 * - выбранного пользователя
 * - текущего контекста (глобальный/пользователь/управление)
 * - фильтров и поиска
 * - breadcrumb навигации
 * - глобальных метрик
 *
 * @version 1.0.0
 * @since TASK-089
 */

import { ref, computed, reactive, watch, nextTick } from 'vue';
import { contextManager } from '../services/userManagement/ContextManager.js';
import { StateMigrationService } from '../services/userManagement/StateMigrationService.js';

export function useUnifiedUserManagement(options = {}) {
  // Конфигурация
  const config = {
    enablePersistence: options.enablePersistence !== false,
    storagePrefix: options.storagePrefix || 'um',
    maxHistorySize: options.maxHistorySize || 10,
    defaultContext: options.defaultContext || 'global',
    ...options
  };

  // Основное реактивное состояние
  const state = reactive({
    // Данные пользователей
    users: [],
    filteredUsers: [],
    selectedUser: null,
    selectedUsers: [], // Для массовых операций

    // Контекст и навигация
    currentContext: config.defaultContext,
    breadcrumbs: [],
    navigationHistory: [],

    // Фильтры и поиск
    filters: {
      search: '',
      department_ids: [],
      activity_filter: 'all',
      sort_by: 'last_activity',
      sort_order: 'desc',
      time_range: 'week',
      activity_types: [],
      user_status: 'all'
    },

    // Глобальные метрики
    globalMetrics: [],
    summaryStats: {
      total_users: 0,
      active_users: 0,
      new_users_today: 0,
      total_sessions_today: 0,
      avg_session_duration: 0,
      retention_7d: 0,
      retention_30d: 0
    },

    // UI состояние
    loading: false,
    loadingMessage: '',
    error: null,
    pagination: {
      current_page: 1,
      per_page: 50,
      total: 0,
      total_pages: 0
    },

    // Настройки отображения
    viewOptions: {
      compactView: false,
      showExtendedMetrics: false,
      itemsPerPage: 50,
      autoRefresh: false,
      refreshInterval: 30000 // 30 секунд
    }
  });

  // Вычисляемые свойства
  const hasSelectedUsers = computed(() => state.selectedUsers.length > 0);

  const selectedUserStats = computed(() => {
    if (!state.selectedUser?.activity_stats) return {};
    return state.selectedUser.activity_stats;
  });

  const canEditPermissions = computed(() => {
    // Логика проверки прав на редактирование
    return true; // Заглушка - будет реализована через систему прав
  });

  const canDeleteUsers = computed(() => {
    // Логика проверки прав на удаление
    return true; // Заглушка - будет реализована через систему прав
  });

  const contextTitle = computed(() => {
    switch (state.currentContext) {
      case 'global': return 'Управление пользователями';
      case 'user': return `Анализ: ${state.selectedUser?.name || 'Пользователь'}`;
      case 'management': return 'Управление правами доступа';
      default: return 'Управление пользователями';
    }
  });

  const isContextGlobal = computed(() => state.currentContext === 'global');
  const isContextUser = computed(() => state.currentContext === 'user');
  const isContextManagement = computed(() => state.currentContext === 'management');

  // Методы управления состоянием

  /**
   * Инициализация composable
   */
  const initialize = async () => {
    try {
      state.loading = true;
      state.loadingMessage = 'Загрузка данных...';

      // Миграция состояния из старого интерфейса
      if (config.enablePersistence) {
        try {
          state.loadingMessage = 'Обновление интерфейса...';
          const migrationResult = await StateMigrationService.migrateUserManagementState();
          if (migrationResult.success && migrationResult.migrated.length > 0) {
            console.log('[useUnifiedUserManagement] State migration completed:', migrationResult);
          }
        } catch (migrationError) {
          console.warn('[useUnifiedUserManagement] State migration failed, continuing with defaults:', migrationError);
        }
      }

      // Восстановление состояния из localStorage
      if (config.enablePersistence) {
        await loadPersistedState();
      }

      // Загрузка начальных данных
      await loadInitialData();

      // Настройка контекст-менеджера
      setupContextManager();

      // Настройка автообновления
      if (state.viewOptions.autoRefresh) {
        setupAutoRefresh();
      }

    } catch (error) {
      console.error('[useUnifiedUserManagement] Initialization failed:', error);
      state.error = error.message;
    } finally {
      state.loading = false;
      state.loadingMessage = '';
    }
  };

  /**
   * Загрузка сохраненного состояния
   */
  const loadPersistedState = async () => {
    try {
      const persisted = localStorage.getItem(`${config.storagePrefix}-state`);
      if (persisted) {
        const parsed = JSON.parse(persisted);
        Object.assign(state, parsed);
      }
    } catch (error) {
      console.warn('[useUnifiedUserManagement] Failed to load persisted state:', error);
    }
  };

  /**
   * Сохранение состояния в localStorage
   */
  const savePersistedState = () => {
    if (!config.enablePersistence) return;

    try {
      const stateToSave = {
        filters: state.filters,
        viewOptions: state.viewOptions,
        currentContext: state.currentContext,
        selectedUser: state.selectedUser?.id || null
      };
      localStorage.setItem(`${config.storagePrefix}-state`, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('[useUnifiedUserManagement] Failed to save state:', error);
    }
  };

  /**
   * Загрузка начальных данных
   */
  const loadInitialData = async () => {
    // Загрузка списка пользователей
    await loadUsers();

    // Загрузка глобальных метрик
    await loadGlobalMetrics();

    // Загрузка фильтров и предустановок
    await loadFiltersData();
  };

  /**
   * Настройка контекст-менеджера
   */
  const setupContextManager = () => {
    // Подписка на изменения контекста
    contextManager.addListener(handleContextChange);

    // Синхронизация начального состояния
    state.currentContext = contextManager.getCurrentContext();
    updateBreadcrumbs();
  };

  /**
   * Настройка автообновления
   */
  const setupAutoRefresh = () => {
    const interval = setInterval(async () => {
      if (!state.loading) {
        await refreshData();
      }
    }, state.viewOptions.refreshInterval);

    // Очистка интервала при уничтожении
    return () => clearInterval(interval);
  };

  // Методы работы с пользователями

  /**
   * Загрузка списка пользователей
   */
  const loadUsers = async (params = {}) => {
    try {
      state.loading = true;
      state.loadingMessage = 'Загрузка пользователей...';

      const queryParams = {
        page: params.page || state.pagination.current_page,
        per_page: params.per_page || state.viewOptions.itemsPerPage,
        ...state.filters,
        ...params
      };

      // Имитация API вызова (будет заменено на реальный)
      const response = await mockApiCall('/api/admin/users/unified', queryParams);

      state.users = response.data.users || [];
      state.pagination = response.data.pagination || state.pagination;
      state.summaryStats = response.data.summary || state.summaryStats;

      // Применение фильтров
      applyFilters();

    } catch (error) {
      console.error('[useUnifiedUserManagement] Failed to load users:', error);
      state.error = 'Ошибка загрузки пользователей';
      throw error;
    } finally {
      state.loading = false;
      state.loadingMessage = '';
    }
  };

  /**
   * Загрузка глобальных метрик
   */
  const loadGlobalMetrics = async () => {
    try {
      const response = await mockApiCall('/api/admin/analytics/global', {
        period: state.filters.time_range
      });

      state.globalMetrics = response.data.metrics || [];
      Object.assign(state.summaryStats, response.data.metrics);

    } catch (error) {
      console.error('[useUnifiedUserManagement] Failed to load global metrics:', error);
    }
  };

  /**
   * Загрузка данных фильтров
   */
  const loadFiltersData = async () => {
    try {
      // Загрузка отделов, типов активности и т.д.
      const [departmentsRes, activityTypesRes] = await Promise.all([
        mockApiCall('/api/admin/departments'),
        mockApiCall('/api/admin/activity-types')
      ]);

      state.departments = departmentsRes.data || [];
      state.activityTypes = activityTypesRes.data || [];

    } catch (error) {
      console.error('[useUnifiedUserManagement] Failed to load filters data:', error);
    }
  };

  /**
   * Выбор пользователя
   */
  const selectUser = async (user) => {
    try {
      state.selectedUser = user;
      state.selectedUsers = [user]; // Сбрасываем множественный выбор

      // Переход в контекст пользователя
      await contextManager.switchContext('user', { user });

    } catch (error) {
      console.error('[useUnifiedUserManagement] Failed to select user:', error);
      state.error = 'Ошибка выбора пользователя';
    }
  };

  /**
   * Снятие выбора пользователя
   */
  const deselectUser = () => {
    state.selectedUser = null;
    state.selectedUsers = [];
  };

  /**
   * Переключение в глобальный контекст
   */
  const switchToGlobal = async () => {
    try {
      await contextManager.switchContext('global');
    } catch (error) {
      console.error('[useUnifiedUserManagement] Failed to switch to global:', error);
    }
  };

  /**
   * Переключение в контекст управления
   */
  const switchToManagement = async (data = {}) => {
    try {
      await contextManager.switchContext('management', data);
    } catch (error) {
      console.error('[useUnifiedUserManagement] Failed to switch to management:', error);
    }
  };

  // Методы фильтрации и поиска

  /**
   * Применение фильтров
   */
  const applyFilters = () => {
    let filtered = [...state.users];

    // Поиск по имени/email
    if (state.filters.search) {
      const search = state.filters.search.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      );
    }

    // Фильтр по отделам
    if (state.filters.department_ids.length > 0) {
      filtered = filtered.filter(user =>
        user.departments?.some(dept => state.filters.department_ids.includes(dept.id))
      );
    }

    // Фильтр по активности
    if (state.filters.activity_filter !== 'all') {
      filtered = filtered.filter(user => {
        const score = user.activity_stats?.activity_score || 0;
        switch (state.filters.activity_filter) {
          case 'active': return score >= 70;
          case 'inactive': return score < 30;
          case 'moderate': return score >= 30 && score < 70;
          default: return true;
        }
      });
    }

    // Сортировка
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (state.filters.sort_by) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'email':
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case 'last_activity':
          aVal = new Date(a.activity_stats?.last_activity || 0);
          bVal = new Date(b.activity_stats?.last_activity || 0);
          break;
        case 'total_actions':
          aVal = a.activity_stats?.total_actions || 0;
          bVal = b.activity_stats?.total_actions || 0;
          break;
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
      }

      if (state.filters.sort_order === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    state.filteredUsers = filtered;
  };

  /**
   * Обновление фильтров
   */
  const updateFilters = (newFilters) => {
    Object.assign(state.filters, newFilters);
    applyFilters();
    savePersistedState();
  };

  /**
   * Сброс фильтров
   */
  const resetFilters = () => {
    state.filters = {
      search: '',
      department_ids: [],
      activity_filter: 'all',
      sort_by: 'last_activity',
      sort_order: 'desc',
      time_range: 'week',
      activity_types: [],
      user_status: 'all'
    };
    applyFilters();
    savePersistedState();
  };

  /**
   * Сохранение предустановки фильтров
   */
  const saveFilterPreset = (name, filters) => {
    const presets = JSON.parse(localStorage.getItem(`${config.storagePrefix}-presets`) || '[]');
    presets.push({
      id: Date.now().toString(),
      name,
      filters: { ...filters },
      created_at: new Date().toISOString()
    });
    localStorage.setItem(`${config.storagePrefix}-presets`, JSON.stringify(presets));
  };

  /**
   * Загрузка предустановки фильтров
   */
  const loadFilterPreset = (presetId) => {
    const presets = JSON.parse(localStorage.getItem(`${config.storagePrefix}-presets`) || '[]');
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      updateFilters(preset.filters);
    }
  };

  // Методы навигации

  /**
   * Обновление breadcrumb навигации
   */
  const updateBreadcrumbs = () => {
    const crumbs = [
      {
        id: 'global',
        label: 'Управление пользователями',
        icon: 'UsersIcon',
        action: switchToGlobal
      }
    ];

    if (state.currentContext === 'user' && state.selectedUser) {
      crumbs.push({
        id: 'user',
        label: state.selectedUser.name,
        icon: 'UserIcon',
        action: () => selectUser(state.selectedUser)
      });
    }

    if (state.currentContext === 'management') {
      crumbs.push({
        id: 'management',
        label: 'Управление правами',
        icon: 'SettingsIcon',
        action: switchToManagement
      });
    }

    state.breadcrumbs = crumbs;
  };

  /**
   * Возврат назад по breadcrumb
   */
  const goBack = async () => {
    const success = await contextManager.goBack();
    if (!success && state.breadcrumbs.length > 1) {
      // Fallback: возвращаемся к предыдущему crumb
      const prevCrumb = state.breadcrumbs[state.breadcrumbs.length - 2];
      if (prevCrumb?.action) {
        await prevCrumb.action();
      }
    }
  };

  // Методы управления пользователями

  /**
   * Обновление прав пользователя
   */
  const updateUserPermissions = async (userId, permissions) => {
    try {
      state.loading = true;
      state.loadingMessage = 'Обновление прав доступа...';

      await mockApiCall(`/api/admin/users/${userId}/permissions`, {
        method: 'PUT',
        body: permissions
      });

      // Обновление локального состояния
      const userIndex = state.users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        state.users[userIndex] = { ...state.users[userIndex], ...permissions };
        applyFilters();
      }

      // Уведомление об успехе
      emitNotification('Права доступа обновлены', 'success');

    } catch (error) {
      console.error('[useUnifiedUserManagement] Failed to update permissions:', error);
      emitNotification('Ошибка обновления прав доступа', 'error');
      throw error;
    } finally {
      state.loading = false;
      state.loadingMessage = '';
    }
  };

  /**
   * Скрытие/показ пользователя
   */
  const toggleUserVisibility = async (userId) => {
    try {
      const user = state.users.find(u => u.id === userId);
      if (!user) return;

      const newHiddenState = !user.is_hidden;

      await mockApiCall(`/api/admin/users/${userId}/visibility`, {
        method: 'PUT',
        body: { is_hidden: newHiddenState }
      });

      // Обновление локального состояния
      user.is_hidden = newHiddenState;
      applyFilters();

    } catch (error) {
      console.error('[useUnifiedUserManagement] Failed to toggle visibility:', error);
      throw error;
    }
  };

  /**
   * Массовые операции
   */
  const performBulkAction = async (action, userIds, data = {}) => {
    try {
      state.loading = true;
      state.loadingMessage = `Выполнение операции: ${action}...`;

      await mockApiCall('/api/admin/users/bulk-update', {
        method: 'POST',
        body: {
          user_ids: userIds,
          action,
          data
        }
      });

      // Обновление локального состояния
      await refreshData();

      emitNotification(`Операция "${action}" выполнена для ${userIds.length} пользователей`, 'success');

    } catch (error) {
      console.error('[useUnifiedUserManagement] Bulk action failed:', error);
      emitNotification(`Ошибка выполнения операции "${action}"`, 'error');
      throw error;
    } finally {
      state.loading = false;
      state.loadingMessage = '';
    }
  };

  // Вспомогательные методы

  /**
   * Обновление данных
   */
  const refreshData = async () => {
    await Promise.all([
      loadUsers(),
      loadGlobalMetrics()
    ]);
  };

  /**
   * Обработчик изменения контекста
   */
  const handleContextChange = (event) => {
    state.currentContext = event.currentContext;

    if (event.data?.user) {
      state.selectedUser = event.data.user;
    }

    updateBreadcrumbs();
    savePersistedState();
  };

  /**
   * Имитация API вызова (для разработки)
   */
  const mockApiCall = async (endpoint, params = {}) => {
    // Имитация задержки API
    await new Promise(resolve => setTimeout(resolve, 300));

    // Mock данные (будут заменены на реальные API вызовы)
    switch (endpoint) {
      case '/api/admin/users/unified':
        return {
          data: {
            users: generateMockUsers(params.per_page || 50),
            pagination: {
              current_page: params.page || 1,
              per_page: params.per_page || 50,
              total: 234,
              total_pages: Math.ceil(234 / (params.per_page || 50))
            },
            summary: {
              total_users: 234,
              active_users: 189,
              new_users_today: 12,
              total_sessions_today: 145,
              avg_session_duration: 780,
              retention_7d: 78.5,
              retention_30d: 65.2
            }
          }
        };

      case '/api/admin/analytics/global':
        return {
          data: {
            metrics: [
              { id: 'total_users', label: 'Всего пользователей', value: 234, change: 5.2 },
              { id: 'active_users', label: 'Активных сегодня', value: 189, change: 12.1 },
              { id: 'new_users', label: 'Новых сегодня', value: 12, change: -2.3 },
              { id: 'avg_session', label: 'Средняя сессия', value: '13:00', change: 8.7 }
            ]
          }
        };

      default:
        return { data: {} };
    }
  };

  /**
   * Генерация mock пользователей
   */
  const generateMockUsers = (count) => {
    const users = [];
    for (let i = 1; i <= count; i++) {
      users.push({
        id: i,
        name: `Пользователь ${i}`,
        email: `user${i}@example.com`,
        departments: [
          { id: 369, name: 'Битрикс24 отдел', color: '#2196F3' },
          { id: 366, name: 'Сектор 1С', color: '#4CAF50' }
        ].slice(0, Math.floor(Math.random() * 3)),
        is_admin: Math.random() > 0.9,
        is_hidden: Math.random() > 0.95,
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: ['online', 'away', 'offline'][Math.floor(Math.random() * 3)],
        activity_stats: {
          total_actions: Math.floor(Math.random() * 1000),
          total_sessions: Math.floor(Math.random() * 50),
          avg_session_duration: Math.floor(Math.random() * 1800),
          last_activity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          activity_score: Math.floor(Math.random() * 100),
          actions_change_percent: (Math.random() - 0.5) * 50
        }
      });
    }
    return users;
  };

  /**
   * Отправка уведомлений
   */
  const emitNotification = (message, type = 'info') => {
    // Имитация отправки уведомления (будет интегрировано с BX.UI.Notification)
    console.log(`[${type.toUpperCase()}] ${message}`);

    if (typeof window !== 'undefined' && window.BX && window.BX.UI && window.BX.UI.Notification) {
      window.BX.UI.Notification.Center.notify({
        content: message,
        type: type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'
      });
    }
  };

  // Наблюдатели
  watch(() => state.filters, applyFilters, { deep: true });
  watch(() => state.users, applyFilters);
  watch(() => state.currentContext, updateBreadcrumbs);

  // Инициализация
  nextTick(() => {
    initialize();
  });

  // Экспорт интерфейса
  return {
    // Состояние
    state,

    // Вычисляемые свойства
    hasSelectedUsers,
    selectedUserStats,
    canEditPermissions,
    canDeleteUsers,
    contextTitle,
    isContextGlobal,
    isContextUser,
    isContextManagement,

    // Методы
    initialize,
    loadUsers,
    loadGlobalMetrics,
    selectUser,
    deselectUser,
    switchToGlobal,
    switchToManagement,
    applyFilters,
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

    // Утилиты
    emitNotification
  };
}