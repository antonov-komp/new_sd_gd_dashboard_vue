/**
 * ContextManager - система управления контекстами единого интерфейса управления пользователями
 *
 * Управляет переключением между контекстами:
 * - global: общий обзор всех пользователей
 * - user: детальный анализ конкретного пользователя
 * - management: управление правами и настройками
 *
 * @version 1.0.0
 * @since TASK-089
 */

export class ContextManager {
  constructor() {
    this.currentContext = 'global';
    this.contexts = {
      global: new GlobalContext(),
      user: new UserContext(),
      management: new ManagementContext()
    };
    this.listeners = new Set();
    this.history = [];
    this.maxHistorySize = 10;

    // Инициализация контекстов
    this.initializeContexts();
  }

  /**
   * Инициализация всех контекстов
   */
  initializeContexts() {
    Object.values(this.contexts).forEach(context => {
      if (context.initialize) {
        context.initialize();
      }
    });
  }

  /**
   * Переключение на новый контекст
   * @param {string} contextType - тип контекста (global, user, management)
   * @param {Object} data - данные для контекста
   * @param {Object} options - опции переключения
   */
  async switchContext(contextType, data = {}, options = {}) {
    const previousContext = this.currentContext;

    try {
      // Валидация контекста
      if (!this.contexts[contextType]) {
        throw new Error(`Unknown context type: ${contextType}`);
      }

      // Подготовка к переключению
      await this.beforeContextSwitch(previousContext, contextType, data);

      // Переключение контекста
      const context = this.contexts[contextType];
      await context.activate(data, options);

      this.currentContext = contextType;

      // Добавление в историю
      this.addToHistory({
        from: previousContext,
        to: contextType,
        data,
        timestamp: Date.now(),
        options
      });

      // Уведомление слушателей
      this.notifyListeners('context-changed', {
        previousContext,
        currentContext: contextType,
        data,
        options
      });

      // Пост-обработка
      await this.afterContextSwitch(previousContext, contextType, data);

    } catch (error) {
      console.error('[ContextManager] Context switch failed:', error);

      // Уведомление об ошибке
      this.notifyListeners('context-switch-error', {
        error,
        attemptedContext: contextType,
        data
      });

      throw error;
    }
  }

  /**
   * Получение текущего контекста
   * @returns {string} тип текущего контекста
   */
  getCurrentContext() {
    return this.currentContext;
  }

  /**
   * Получение текущего контекстного объекта
   * @returns {Object} текущий контекст
   */
  getCurrentContextObject() {
    return this.contexts[this.currentContext];
  }

  /**
   * Получение данных текущего контекста
   * @returns {Object} данные текущего контекста
   */
  getCurrentContextData() {
    return this.getCurrentContextObject().getData();
  }

  /**
   * Получение фильтров текущего контекста
   * @returns {Object} фильтры текущего контекста
   */
  getCurrentFilters() {
    return this.getCurrentContextObject().getFilters();
  }

  /**
   * Получение метрик текущего контекста
   * @returns {Object} метрики текущего контекста
   */
  getCurrentMetrics() {
    return this.getCurrentContextObject().getMetrics();
  }

  /**
   * Получение разрешений текущего контекста
   * @returns {Object} разрешения текущего контекста
   */
  getCurrentPermissions() {
    return this.getCurrentContextObject().getPermissions();
  }

  /**
   * Проверка возможности выполнения действия в текущем контексте
   * @param {string} action - действие для проверки
   * @returns {boolean} возможность выполнения действия
   */
  canPerformAction(action) {
    const permissions = this.getCurrentPermissions();
    return permissions && permissions[action] === true;
  }

  /**
   * Возврат к предыдущему контексту
   * @returns {Promise<boolean>} успех возврата
   */
  async goBack() {
    if (this.history.length === 0) {
      return false;
    }

    const previousEntry = this.history[this.history.length - 1];
    await this.switchContext(previousEntry.from, previousEntry.data, {
      ...previousEntry.options,
      isBackNavigation: true
    });

    return true;
  }

  /**
   * Добавление слушателя событий контекста
   * @param {Function} listener - функция-слушатель
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Удаление слушателя событий контекста
   * @param {Function} listener - функция-слушатель
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Уведомление всех слушателей
   * @param {string} event - тип события
   * @param {Object} data - данные события
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('[ContextManager] Listener error:', error);
      }
    });
  }

  /**
   * Добавление записи в историю
   * @param {Object} entry - запись истории
   */
  addToHistory(entry) {
    this.history.push(entry);

    // Ограничение размера истории
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Получение истории контекстов
   * @param {number} limit - ограничение количества записей
   * @returns {Array} история контекстов
   */
  getHistory(limit = this.maxHistorySize) {
    return this.history.slice(-limit);
  }

  /**
   * Очистка истории
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Предварительная обработка перед переключением контекста
   * @param {string} from - предыдущий контекст
   * @param {string} to - новый контекст
   * @param {Object} data - данные
   */
  async beforeContextSwitch(from, to, data) {
    // Сохранение состояния предыдущего контекста
    const previousContext = this.contexts[from];
    if (previousContext && previousContext.saveState) {
      await previousContext.saveState();
    }

    // Валидация данных для нового контекста
    const newContext = this.contexts[to];
    if (newContext && newContext.validateData) {
      const isValid = await newContext.validateData(data);
      if (!isValid) {
        throw new Error(`Invalid data for context ${to}`);
      }
    }
  }

  /**
   * Пост-обработка после переключения контекста
   * @param {string} from - предыдущий контекст
   * @param {string} to - новый контекст
   * @param {Object} data - данные
   */
  async afterContextSwitch(from, to, data) {
    // Загрузка данных для нового контекста
    const newContext = this.contexts[to];
    if (newContext && newContext.loadData) {
      await newContext.loadData(data);
    }

    // Аналитика переключения контекста
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('context_switched', {
        from_context: from,
        to_context: to,
        data_keys: Object.keys(data || {}),
        timestamp: Date.now()
      });
    }
  }

  /**
   * Сброс всех контекстов
   */
  async reset() {
    this.currentContext = 'global';
    this.clearHistory();

    // Сброс всех контекстов
    for (const context of Object.values(this.contexts)) {
      if (context.reset) {
        await context.reset();
      }
    }

    this.notifyListeners('contexts-reset', {});
  }

  /**
   * Экспорт состояния для сериализации
   * @returns {Object} сериализуемое состояние
   */
  exportState() {
    return {
      currentContext: this.currentContext,
      history: this.history,
      contextsState: Object.fromEntries(
        Object.entries(this.contexts).map(([key, context]) => [
          key,
          context.exportState ? context.exportState() : {}
        ])
      )
    };
  }

  /**
   * Импорт состояния из сериализации
   * @param {Object} state - сериализуемое состояние
   */
  async importState(state) {
    if (state.currentContext) {
      this.currentContext = state.currentContext;
    }

    if (state.history) {
      this.history = state.history;
    }

    // Импорт состояния контекстов
    if (state.contextsState) {
      for (const [key, contextState] of Object.entries(state.contextsState)) {
        const context = this.contexts[key];
        if (context && context.importState) {
          await context.importState(contextState);
        }
      }
    }
  }
}

/**
 * Глобальный контекст - обзор всех пользователей
 */
class GlobalContext {
  constructor() {
    this.data = {
      users: [],
      globalMetrics: {},
      filters: {
        search: '',
        department_ids: [],
        activity_filter: 'all',
        sort_by: 'last_activity',
        sort_order: 'desc'
      }
    };
    this.permissions = {
      view_users: true,
      filter_users: true,
      export_data: true,
      bulk_actions: true
    };
  }

  async activate(data = {}, options = {}) {
    // Загрузка глобальных данных если необходимо
    if (options.forceReload || !this.data.users.length) {
      await this.loadGlobalData();
    }

    // Применение фильтров из параметров
    if (data.filters) {
      this.data.filters = { ...this.data.filters, ...data.filters };
    }
  }

  async loadGlobalData() {
    try {
      // Имитация загрузки данных (будет заменено на реальный API)
      this.data.users = [];
      this.data.globalMetrics = {
        total_users: 0,
        active_users: 0,
        new_users_today: 0
      };
    } catch (error) {
      console.error('[GlobalContext] Failed to load global data:', error);
      throw error;
    }
  }

  getData() {
    return this.data;
  }

  getFilters() {
    return this.data.filters;
  }

  getMetrics() {
    return this.data.globalMetrics;
  }

  getPermissions() {
    return this.permissions;
  }

  async saveState() {
    // Сохранение состояния в localStorage
    localStorage.setItem('um-global-context', JSON.stringify({
      filters: this.data.filters,
      timestamp: Date.now()
    }));
  }

  async validateData(data) {
    // Валидация данных для глобального контекста
    return true; // Глобальный контекст принимает любые данные
  }

  exportState() {
    return {
      data: this.data,
      permissions: this.permissions
    };
  }

  async importState(state) {
    if (state.data) {
      this.data = { ...this.data, ...state.data };
    }
  }
}

/**
 * Контекст пользователя - анализ конкретного пользователя
 */
class UserContext {
  constructor() {
    this.data = {
      user: null,
      userStats: {},
      activityData: [],
      sessionData: [],
      filters: {
        timeRange: 'week',
        activity_types: [],
        devices: []
      }
    };
    this.permissions = {
      view_user_profile: true,
      view_user_activity: true,
      edit_user_permissions: false, // Требуются дополнительные права
      delete_user: false // Требуются дополнительные права
    };
  }

  async activate(data = {}, options = {}) {
    if (!data.user || !data.user.id) {
      throw new Error('User data is required for user context');
    }

    this.data.user = data.user;

    // Загрузка данных пользователя
    await this.loadUserData(data.user.id);
  }

  async loadUserData(userId) {
    try {
      // Имитация загрузки данных пользователя (будет заменено на реальный API)
      this.data.userStats = {
        total_actions: 0,
        total_sessions: 0,
        avg_session_duration: 0,
        activity_score: 0
      };
      this.data.activityData = [];
      this.data.sessionData = [];
    } catch (error) {
      console.error('[UserContext] Failed to load user data:', error);
      throw error;
    }
  }

  getData() {
    return this.data;
  }

  getFilters() {
    return this.data.filters;
  }

  getMetrics() {
    return this.data.userStats;
  }

  getPermissions() {
    return this.permissions;
  }

  async saveState() {
    // Сохранение состояния в localStorage
    localStorage.setItem('um-user-context', JSON.stringify({
      user_id: this.data.user?.id,
      filters: this.data.filters,
      timestamp: Date.now()
    }));
  }

  async validateData(data) {
    return data.user && typeof data.user === 'object' && data.user.id;
  }

  exportState() {
    return {
      data: this.data,
      permissions: this.permissions
    };
  }

  async importState(state) {
    if (state.data) {
      this.data = { ...this.data, ...state.data };
    }
  }
}

/**
 * Контекст управления - управление правами и настройками
 */
class ManagementContext {
  constructor() {
    this.data = {
      selectedUsers: [],
      bulkOperations: [],
      permissions: {},
      departments: [],
      filters: {
        role_filter: 'all',
        department_filter: 'all'
      }
    };
    this.permissions = {
      edit_user_permissions: true,
      manage_departments: true,
      bulk_edit: true,
      view_audit_log: true
    };
  }

  async activate(data = {}, options = {}) {
    // Загрузка данных для управления
    if (data.selectedUsers) {
      this.data.selectedUsers = data.selectedUsers;
    }

    await this.loadManagementData();
  }

  async loadManagementData() {
    try {
      // Имитация загрузки данных управления (будет заменено на реальный API)
      this.data.bulkOperations = [];
      this.data.permissions = {};
      this.data.departments = [];
    } catch (error) {
      console.error('[ManagementContext] Failed to load management data:', error);
      throw error;
    }
  }

  getData() {
    return this.data;
  }

  getFilters() {
    return this.data.filters;
  }

  getMetrics() {
    return {}; // Контекст управления не имеет метрик
  }

  getPermissions() {
    return this.permissions;
  }

  async saveState() {
    // Сохранение состояния в localStorage
    localStorage.setItem('um-management-context', JSON.stringify({
      selected_users: this.data.selectedUsers.map(u => u.id),
      filters: this.data.filters,
      timestamp: Date.now()
    }));
  }

  async validateData(data) {
    return true; // Контекст управления гибкий
  }

  exportState() {
    return {
      data: this.data,
      permissions: this.permissions
    };
  }

  async importState(state) {
    if (state.data) {
      this.data = { ...this.data, ...state.data };
    }
  }
}

// Экспорт singleton instance
export const contextManager = new ContextManager();