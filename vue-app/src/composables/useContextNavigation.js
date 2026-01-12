/**
 * useContextNavigation - composable для управления drill-down навигацией
 *
 * Предоставляет функциональность для:
 * - управления breadcrumb навигацией
 * - переходов между контекстами
 * - истории навигации
 * - сохранения и восстановления состояния навигации
 *
 * @version 1.0.0
 * @since TASK-089
 */

import { ref, computed, reactive, watch } from 'vue';
import { contextManager } from '../services/userManagement/ContextManager.js';

export function useContextNavigation(options = {}) {
  // Конфигурация
  const config = {
    enablePersistence: options.enablePersistence !== false,
    storagePrefix: options.storagePrefix || 'um-nav',
    maxHistorySize: options.maxHistorySize || 10,
    enableKeyboardNavigation: options.enableKeyboardNavigation !== false,
    ...options
  };

  // Реактивное состояние
  const state = reactive({
    breadcrumbs: [],
    navigationHistory: [],
    currentDepth: 0,
    maxDepth: 0,
    isNavigating: false,
    navigationError: null
  });

  // Refs для управления
  const navigationContainer = ref(null);

  // Вычисляемые свойства
  const canGoBack = computed(() => state.breadcrumbs.length > 1);
  const canGoForward = computed(() => false); // Пока не реализуем forward
  const currentCrumb = computed(() => state.breadcrumbs[state.breadcrumbs.length - 1]);
  const previousCrumb = computed(() => state.breadcrumbs[state.breadcrumbs.length - 2]);
  const isAtRoot = computed(() => state.currentDepth === 0);
  const navigationPath = computed(() =>
    state.breadcrumbs.map(crumb => crumb.label).join(' > ')
  );

  // Методы навигации

  /**
   * Инициализация навигации
   */
  const initialize = () => {
    // Подписка на изменения контекста
    contextManager.addListener(handleContextChange);

    // Восстановление состояния
    if (config.enablePersistence) {
      loadPersistedState();
    }

    // Настройка клавиатурной навигации
    if (config.enableKeyboardNavigation) {
      setupKeyboardNavigation();
    }

    // Инициализация начального состояния
    updateBreadcrumbsFromContext();
  };

  /**
   * Обновление breadcrumbs на основе текущего контекста
   */
  const updateBreadcrumbsFromContext = () => {
    const currentContext = contextManager.getCurrentContext();
    const contextData = contextManager.getCurrentContextData();

    const crumbs = [
      {
        id: 'global',
        label: 'Управление пользователями',
        icon: 'UsersIcon',
        context: 'global',
        action: () => navigateToContext('global'),
        data: {},
        depth: 0
      }
    ];

    // Добавление дополнительных crumbs в зависимости от контекста
    switch (currentContext) {
      case 'user':
        if (contextData.user) {
          crumbs.push({
            id: `user-${contextData.user.id}`,
            label: contextData.user.name,
            icon: 'UserIcon',
            context: 'user',
            action: () => navigateToContext('user', { user: contextData.user }),
            data: { user: contextData.user },
            depth: 1
          });
        }
        break;

      case 'management':
        crumbs.push({
          id: 'management',
          label: 'Управление правами',
          icon: 'SettingsIcon',
          context: 'management',
          action: () => navigateToContext('management', contextData),
          data: contextData,
          depth: 1
        });
        break;
    }

    state.breadcrumbs = crumbs;
    state.currentDepth = crumbs.length - 1;
    state.maxDepth = Math.max(state.maxDepth, state.currentDepth);

    // Сохранение состояния
    if (config.enablePersistence) {
      savePersistedState();
    }
  };

  /**
   * Навигация к определенному контексту
   */
  const navigateToContext = async (contextType, data = {}) => {
    try {
      state.isNavigating = true;
      state.navigationError = null;

      // Определение опций перехода
      const options = {
        source: 'breadcrumb',
        preserveFilters: true
      };

      // Переход через contextManager
      await contextManager.switchContext(contextType, data, options);

      // Добавление в историю навигации
      addToNavigationHistory({
        context: contextType,
        data,
        timestamp: Date.now(),
        source: 'breadcrumb'
      });

      // Анимация перехода
      await animateTransition();

    } catch (error) {
      console.error('[useContextNavigation] Navigation failed:', error);
      state.navigationError = error.message;

      // Отправка уведомления об ошибке
      emitNavigationError(error);

    } finally {
      state.isNavigating = false;
    }
  };

  /**
   * Навигация назад
   */
  const goBack = async () => {
    if (!canGoBack.value) return false;

    try {
      state.isNavigating = true;

      const success = await contextManager.goBack();

      if (success) {
        addToNavigationHistory({
          action: 'back',
          timestamp: Date.now(),
          source: 'navigation'
        });
      }

      return success;

    } catch (error) {
      console.error('[useContextNavigation] Go back failed:', error);
      state.navigationError = error.message;
      return false;

    } finally {
      state.isNavigating = false;
    }
  };

  /**
   * Навигация вперед (заглушка для будущей реализации)
   */
  const goForward = async () => {
    // Пока не реализовано
    return false;
  };

  /**
   * Переход к определенному crumb
   */
  const navigateToCrumb = async (crumb) => {
    if (!crumb.action) return;

    try {
      await crumb.action();

      // Анимация перехода к crumb
      await animateTransition();

    } catch (error) {
      console.error('[useContextNavigation] Navigate to crumb failed:', error);
      state.navigationError = error.message;
    }
  };

  /**
   * Переход на корневой уровень
   */
  const goToRoot = async () => {
    await navigateToContext('global');
  };

  /**
   * Добавление пользовательского crumb
   */
  const addCustomCrumb = (crumb) => {
    if (!crumb.id || !crumb.label) {
      console.warn('[useContextNavigation] Invalid crumb:', crumb);
      return;
    }

    const newCrumb = {
      depth: state.currentDepth + 1,
      ...crumb
    };

    // Обрезка breadcrumbs до текущего уровня и добавление нового
    state.breadcrumbs = state.breadcrumbs.slice(0, state.currentDepth + 1);
    state.breadcrumbs.push(newCrumb);

    state.currentDepth++;
    state.maxDepth = Math.max(state.maxDepth, state.currentDepth);

    // Сохранение состояния
    if (config.enablePersistence) {
      savePersistedState();
    }
  };

  /**
   * Удаление последнего crumb
   */
  const removeLastCrumb = () => {
    if (state.breadcrumbs.length > 1) {
      state.breadcrumbs.pop();
      state.currentDepth--;

      // Сохранение состояния
      if (config.enablePersistence) {
        savePersistedState();
      }
    }
  };

  /**
   * Очистка навигации
   */
  const clearNavigation = () => {
    state.breadcrumbs = [state.breadcrumbs[0]]; // Оставляем только корневой
    state.currentDepth = 0;
    state.navigationHistory = [];

    if (config.enablePersistence) {
      savePersistedState();
    }
  };

  // Методы истории навигации

  /**
   * Добавление записи в историю навигации
   */
  const addToNavigationHistory = (entry) => {
    state.navigationHistory.push({
      id: Date.now().toString(),
      ...entry
    });

    // Ограничение размера истории
    if (state.navigationHistory.length > config.maxHistorySize) {
      state.navigationHistory = state.navigationHistory.slice(-config.maxHistorySize);
    }
  };

  /**
   * Получение истории навигации
   */
  const getNavigationHistory = (limit = config.maxHistorySize) => {
    return state.navigationHistory.slice(-limit);
  };

  /**
   * Очистка истории навигации
   */
  const clearNavigationHistory = () => {
    state.navigationHistory = [];
    if (config.enablePersistence) {
      savePersistedState();
    }
  };

  // Методы работы с состоянием

  /**
   * Загрузка сохраненного состояния
   */
  const loadPersistedState = () => {
    try {
      const persisted = localStorage.getItem(`${config.storagePrefix}-state`);
      if (persisted) {
        const parsed = JSON.parse(persisted);
        Object.assign(state, parsed);
      }
    } catch (error) {
      console.warn('[useContextNavigation] Failed to load persisted state:', error);
    }
  };

  /**
   * Сохранение состояния
   */
  const savePersistedState = () => {
    try {
      const stateToSave = {
        breadcrumbs: state.breadcrumbs,
        navigationHistory: state.navigationHistory,
        currentDepth: state.currentDepth,
        maxDepth: state.maxDepth
      };
      localStorage.setItem(`${config.storagePrefix}-state`, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('[useContextNavigation] Failed to save state:', error);
    }
  };

  // Методы анимации и UX

  /**
   * Анимация перехода
   */
  const animateTransition = async () => {
    if (!navigationContainer.value) return;

    // Добавление класса анимации
    navigationContainer.value.classList.add('navigating');

    // Небольшая задержка для анимации
    await new Promise(resolve => setTimeout(resolve, 150));

    // Удаление класса анимации
    navigationContainer.value.classList.remove('navigating');
  };

  /**
   * Настройка клавиатурной навигации
   */
  const setupKeyboardNavigation = () => {
    const handleKeydown = (event) => {
      // Alt + Left Arrow - назад
      if (event.altKey && event.key === 'ArrowLeft' && canGoBack.value) {
        event.preventDefault();
        goBack();
      }

      // Alt + Home - на корневой уровень
      if (event.altKey && event.key === 'Home') {
        event.preventDefault();
        goToRoot();
      }

      // Escape - отмена текущей навигации
      if (event.key === 'Escape' && state.isNavigating) {
        event.preventDefault();
        state.isNavigating = false;
        state.navigationError = null;
      }
    };

    document.addEventListener('keydown', handleKeydown);

    // Возврат функции очистки
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  };

  // Обработчики событий

  /**
   * Обработчик изменения контекста
   */
  const handleContextChange = (event) => {
    updateBreadcrumbsFromContext();

    // Отправка аналитики
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('navigation_context_changed', {
        from_context: event.previousContext,
        to_context: event.currentContext,
        navigation_source: 'context_manager',
        timestamp: Date.now()
      });
    }
  };

  /**
   * Отправка уведомления об ошибке навигации
   */
  const emitNavigationError = (error) => {
    const message = `Ошибка навигации: ${error.message}`;

    // Отправка в console
    console.error('[useContextNavigation]', message);

    // Отправка уведомления через BX.UI (если доступно)
    if (typeof window !== 'undefined' && window.BX && window.BX.UI && window.BX.UI.Notification) {
      window.BX.UI.Notification.Center.notify({
        content: message,
        type: 'error'
      });
    }
  };

  // Наблюдатели
  watch(() => state.currentDepth, (newDepth, oldDepth) => {
    // Отправка аналитики при изменении глубины
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('navigation_depth_changed', {
        from_depth: oldDepth,
        to_depth: newDepth,
        max_depth: state.maxDepth,
        timestamp: Date.now()
      });
    }
  });

  // Инициализация
  initialize();

  // Экспорт интерфейса
  return {
    // Состояние
    state,
    navigationContainer,

    // Вычисляемые свойства
    canGoBack,
    canGoForward,
    currentCrumb,
    previousCrumb,
    isAtRoot,
    navigationPath,

    // Методы навигации
    navigateToContext,
    goBack,
    goForward,
    navigateToCrumb,
    goToRoot,
    addCustomCrumb,
    removeLastCrumb,
    clearNavigation,

    // Методы истории
    getNavigationHistory,
    clearNavigationHistory,

    // Методы состояния
    savePersistedState,
    loadPersistedState,

    // Утилиты
    animateTransition,
    emitNavigationError
  };
}