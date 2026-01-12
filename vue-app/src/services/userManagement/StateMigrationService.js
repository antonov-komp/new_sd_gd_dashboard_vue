/**
 * StateMigrationService - сервис миграции состояния из старого интерфейса управления пользователями
 *
 * Обеспечивает плавный переход пользователей с разделенного интерфейса
 * (список пользователей + дашборд анализа) на единый интерфейс.
 *
 * Выполняет:
 * - Миграцию сохраненных фильтров
 * - Перенос настроек отображения
 * - Конвертацию состояния видимости пользователей
 * - Сохранение пользовательских предпочтений
 *
 * @version 1.0.0
 * @since TASK-089
 */

export class StateMigrationService {
  constructor() {
    this.migrationVersion = '1.0.0';
    this.migrationHistory = [];
  }

  /**
   * Выполнение полной миграции состояния
   * @returns {Promise<Object>} результат миграции
   */
  static async migrateUserManagementState() {
    const migration = new StateMigrationService();
    const results = {
      success: true,
      migrated: [],
      skipped: [],
      errors: [],
      version: migration.migrationVersion
    };

    try {
      console.log('[StateMigration] Starting user management state migration...');

      // Проверка необходимости миграции
      if (migration.isMigrationNeeded()) {
        // Выполнение миграций
        const migrations = [
          { name: 'viewMode', fn: () => migration.migrateViewMode() },
          { name: 'hiddenUsers', fn: () => migration.migrateHiddenUsers() },
          { name: 'filters', fn: () => migration.migrateFilters() },
          { name: 'userPreferences', fn: () => migration.migrateUserPreferences() },
          { name: 'activityFilters', fn: () => migration.migrateActivityFilters() },
          { name: 'uiState', fn: () => migration.migrateUIState() },
          { name: 'bookmarks', fn: () => migration.migrateBookmarks() }
        ];

        for (const { name, fn } of migrations) {
          try {
            const result = await fn();
            if (result) {
              results.migrated.push(name);
              migration.migrationHistory.push({
                name,
                status: 'success',
                timestamp: Date.now()
              });
            } else {
              results.skipped.push(name);
            }
          } catch (error) {
            console.error(`[StateMigration] Migration failed for ${name}:`, error);
            results.errors.push({ name, error: error.message });
            migration.migrationHistory.push({
              name,
              status: 'error',
              error: error.message,
              timestamp: Date.now()
            });
          }
        }

        // Сохранение версии миграции
        migration.saveMigrationVersion();

        // Очистка старых ключей (опционально)
        migration.cleanupOldKeys();

        console.log('[StateMigration] Migration completed:', results);
      } else {
        console.log('[StateMigration] Migration not needed - already migrated');
        results.skipped.push('all');
      }

    } catch (error) {
      console.error('[StateMigration] Critical migration error:', error);
      results.success = false;
      results.errors.push({ name: 'critical', error: error.message });
    }

    // Отправка аналитики
    migration.sendMigrationAnalytics(results);

    return results;
  }

  /**
   * Проверка необходимости миграции
   * @returns {boolean} true если миграция нужна
   */
  isMigrationNeeded() {
    const currentVersion = localStorage.getItem('um-migration-version');
    return !currentVersion || currentVersion !== this.migrationVersion;
  }

  /**
   * Миграция режима отображения
   * @returns {boolean} true если миграция выполнена
   */
  migrateViewMode() {
    const oldViewMode = localStorage.getItem('user-management-view-mode');

    if (!oldViewMode) {
      return false; // Нет данных для миграции
    }

    let newContext = 'global';

    // Конвертация старого режима в новый контекст
    switch (oldViewMode) {
      case 'dashboard':
        newContext = 'user'; // Предполагаем, что дашборд был открыт для анализа
        break;
      case 'list':
      default:
        newContext = 'global';
        break;
    }

    // Сохранение нового состояния
    localStorage.setItem('um-context', newContext);

    console.log(`[StateMigration] Migrated view mode: ${oldViewMode} -> ${newContext}`);
    return true;
  }

  /**
   * Миграция списка скрытых пользователей
   * @returns {boolean} true если миграция выполнена
   */
  migrateHiddenUsers() {
    const hiddenUsersList = localStorage.getItem('hidden-users-list');

    if (!hiddenUsersList) {
      return false;
    }

    try {
      const parsed = JSON.parse(hiddenUsersList);

      if (!Array.isArray(parsed)) {
        console.warn('[StateMigration] Invalid hidden users format');
        return false;
      }

      // Конвертация в новый формат
      const migratedHiddenUsers = parsed.map(user => ({
        id: user.id || user,
        hidden_at: user.hidden_at || Date.now(),
        hidden_by: user.hidden_by || 'migration'
      }));

      localStorage.setItem('um-hidden-users', JSON.stringify(migratedHiddenUsers));

      console.log(`[StateMigration] Migrated ${migratedHiddenUsers.length} hidden users`);
      return true;

    } catch (error) {
      console.error('[StateMigration] Failed to parse hidden users:', error);
      return false;
    }
  }

  /**
   * Миграция фильтров
   * @returns {boolean} true если миграция выполнена
   */
  migrateFilters() {
    const oldFilters = localStorage.getItem('activity-filters');

    if (!oldFilters) {
      return false;
    }

    try {
      const parsed = JSON.parse(oldFilters);

      // Конвертация в новый формат фильтров
      const newFilters = {
        search: parsed.search || '',
        department_ids: parsed.departments || [],
        activity_filter: this.convertActivityFilter(parsed.activityFilter),
        sort_by: parsed.sortBy || 'last_activity',
        sort_order: parsed.sortOrder || 'desc',
        time_range: this.convertTimeRange(parsed.timeRange),
        activity_types: parsed.activityTypes || [],
        user_status: parsed.userStatus || 'all'
      };

      // Валидация фильтров
      if (this.validateFilters(newFilters)) {
        localStorage.setItem('um-filters', JSON.stringify(newFilters));
        console.log('[StateMigration] Migrated filters:', newFilters);
        return true;
      } else {
        console.warn('[StateMigration] Invalid filters, using defaults');
        return false;
      }

    } catch (error) {
      console.error('[StateMigration] Failed to parse filters:', error);
      return false;
    }
  }

  /**
   * Миграция пользовательских предпочтений
   * @returns {boolean} true если миграция выполнена
   */
  migrateUserPreferences() {
    const preferences = {
      theme: localStorage.getItem('user-theme') || 'light',
      language: localStorage.getItem('user-language') || 'ru',
      itemsPerPage: this.parseIntSafe(localStorage.getItem('items-per-page'), 50),
      autoRefresh: localStorage.getItem('auto-refresh') === 'true',
      refreshInterval: this.parseIntSafe(localStorage.getItem('refresh-interval'), 30000),
      compactView: localStorage.getItem('compact-view') === 'true',
      showExtendedMetrics: localStorage.getItem('show-extended-metrics') === 'true'
    };

    localStorage.setItem('um-preferences', JSON.stringify(preferences));

    console.log('[StateMigration] Migrated user preferences');
    return true;
  }

  /**
   * Миграция фильтров активности (расширенные)
   * @returns {boolean} true если миграция выполнена
   */
  migrateActivityFilters() {
    const activityFilters = localStorage.getItem('activity-dashboard-filters');

    if (!activityFilters) {
      return false;
    }

    try {
      const parsed = JSON.parse(activityFilters);

      // Конвертация расширенных фильтров
      const newFilters = {
        dateRange: {
          start: parsed.startDate || null,
          end: parsed.endDate || null,
          preset: this.convertDateRangePreset(parsed.dateRange)
        },
        userSegments: parsed.userSegments || [],
        activityThresholds: {
          minActions: parsed.minActions || 0,
          maxActions: parsed.maxActions || null,
          minScore: parsed.minScore || 0
        },
        deviceFilters: parsed.devices || [],
        locationFilters: parsed.locations || [],
        customConditions: parsed.customFilters || []
      };

      localStorage.setItem('um-activity-filters', JSON.stringify(newFilters));

      console.log('[StateMigration] Migrated activity filters');
      return true;

    } catch (error) {
      console.error('[StateMigration] Failed to parse activity filters:', error);
      return false;
    }
  }

  /**
   * Миграция состояния UI
   * @returns {boolean} true если миграция выполнена
   */
  migrateUIState() {
    const uiState = {
      sidebarCollapsed: localStorage.getItem('sidebar-collapsed') === 'true',
      lastSelectedUser: localStorage.getItem('last-selected-user') || null,
      lastContext: localStorage.getItem('last-context') || 'global',
      navigationHistory: this.parseJsonSafe(localStorage.getItem('navigation-history'), []),
      bookmarkedUsers: this.parseJsonSafe(localStorage.getItem('bookmarked-users'), []),
      quickActions: this.parseJsonSafe(localStorage.getItem('quick-actions'), [])
    };

    localStorage.setItem('um-ui-state', JSON.stringify(uiState));

    console.log('[StateMigration] Migrated UI state');
    return true;
  }

  /**
   * Миграция закладок
   * @returns {boolean} true если миграция выполнена
   */
  migrateBookmarks() {
    const bookmarks = localStorage.getItem('user-bookmarks');

    if (!bookmarks) {
      return false;
    }

    try {
      const parsed = JSON.parse(bookmarks);

      // Конвертация закладок в новый формат
      const newBookmarks = parsed.map(bookmark => ({
        id: bookmark.id || `bookmark-${Date.now()}`,
        name: bookmark.name || 'Без названия',
        type: bookmark.type || 'user',
        data: bookmark.data || {},
        created_at: bookmark.created_at || Date.now(),
        color: bookmark.color || '#2196f3'
      }));

      localStorage.setItem('um-bookmarks', JSON.stringify(newBookmarks));

      console.log(`[StateMigration] Migrated ${newBookmarks.length} bookmarks`);
      return true;

    } catch (error) {
      console.error('[StateMigration] Failed to parse bookmarks:', error);
      return false;
    }
  }

  // Вспомогательные методы конвертации

  /**
   * Конвертация фильтра активности
   * @param {string} oldFilter - старый фильтр
   * @returns {string} новый фильтр
   */
  convertActivityFilter(oldFilter) {
    const mapping = {
      'active': 'active',
      'inactive': 'inactive',
      'new': 'new',
      'all': 'all'
    };
    return mapping[oldFilter] || 'all';
  }

  /**
   * Конвертация временного диапазона
   * @param {string} oldRange - старый диапазон
   * @returns {string} новый диапазон
   */
  convertTimeRange(oldRange) {
    const mapping = {
      'today': 'today',
      'yesterday': 'yesterday',
      'week': 'week',
      'month': 'month',
      'quarter': 'quarter',
      'year': 'year',
      'custom': 'custom'
    };
    return mapping[oldRange] || 'week';
  }

  /**
   * Конвертация предустановки диапазона дат
   * @param {string} oldPreset - старая предустановка
   * @returns {string} новая предустановка
   */
  convertDateRangePreset(oldPreset) {
    const mapping = {
      'last7days': 'week',
      'last30days': 'month',
      'last90days': 'quarter',
      'last365days': 'year',
      'custom': 'custom'
    };
    return mapping[oldPreset] || 'week';
  }

  // Вспомогательные методы валидации

  /**
   * Валидация фильтров
   * @param {Object} filters - фильтры для валидации
   * @returns {boolean} true если валидны
   */
  validateFilters(filters) {
    try {
      // Проверка типов
      if (typeof filters.search !== 'string') return false;
      if (!Array.isArray(filters.department_ids)) return false;
      if (typeof filters.activity_filter !== 'string') return false;
      if (typeof filters.sort_by !== 'string') return false;
      if (!['asc', 'desc'].includes(filters.sort_order)) return false;

      // Проверка значений
      const validSortBy = ['name', 'email', 'last_activity', 'total_actions'];
      if (!validSortBy.includes(filters.sort_by)) return false;

      const validActivityFilters = ['all', 'active', 'inactive', 'new'];
      if (!validActivityFilters.includes(filters.activity_filter)) return false;

      return true;
    } catch {
      return false;
    }
  }

  // Вспомогательные методы

  /**
   * Безопасный парсинг числа
   * @param {string} value - значение для парсинга
   * @param {number} defaultValue - значение по умолчанию
   * @returns {number} распарсенное число
   */
  parseIntSafe(value, defaultValue) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Безопасный парсинг JSON
   * @param {string} value - JSON строка
   * @param {*} defaultValue - значение по умолчанию
   * @returns {*} распарсенный объект
   */
  parseJsonSafe(value, defaultValue) {
    try {
      return value ? JSON.parse(value) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Сохранение версии миграции
   */
  saveMigrationVersion() {
    localStorage.setItem('um-migration-version', this.migrationVersion);
    localStorage.setItem('um-migration-timestamp', Date.now());
  }

  /**
   * Очистка старых ключей localStorage
   */
  cleanupOldKeys() {
    const oldKeys = [
      'user-management-view-mode',
      'hidden-users-list',
      'activity-filters',
      'activity-dashboard-filters',
      'user-theme',
      'user-language',
      'items-per-page',
      'auto-refresh',
      'refresh-interval',
      'compact-view',
      'show-extended-metrics',
      'sidebar-collapsed',
      'last-selected-user',
      'last-context',
      'navigation-history',
      'bookmarked-users',
      'quick-actions',
      'user-bookmarks'
    ];

    // Опциональная очистка (можно отключить для отладки)
    if (this.shouldCleanupOldKeys()) {
      oldKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('[StateMigration] Cleaned up old keys');
    }
  }

  /**
   * Проверка необходимости очистки старых ключей
   * @returns {boolean} true если нужно очистить
   */
  shouldCleanupOldKeys() {
    // Очищаем только если нет ошибок миграции
    return this.migrationHistory.every(m => m.status === 'success');
  }

  /**
   * Отправка аналитики миграции
   * @param {Object} results - результаты миграции
   */
  sendMigrationAnalytics(results) {
    try {
      if (typeof window !== 'undefined' && window.analytics) {
        window.analytics.track('state_migration_completed', {
          version: results.version,
          success: results.success,
          migrated_count: results.migrated.length,
          skipped_count: results.skipped.length,
          errors_count: results.errors.length,
          duration: Date.now() - (localStorage.getItem('um-migration-start') || Date.now()),
          user_agent: navigator.userAgent
        });
      }
    } catch (error) {
      console.warn('[StateMigration] Failed to send analytics:', error);
    }
  }

  /**
   * Получение статуса миграции
   * @returns {Object} статус миграции
   */
  static getMigrationStatus() {
    return {
      version: localStorage.getItem('um-migration-version'),
      timestamp: localStorage.getItem('um-migration-timestamp'),
      isMigrated: !!localStorage.getItem('um-migration-version')
    };
  }

  /**
   * Сброс миграции (для отладки)
   */
  static resetMigration() {
    const keys = Object.keys(localStorage).filter(key =>
      key.startsWith('um-') || [
        'user-management-view-mode',
        'hidden-users-list',
        'activity-filters'
      ].includes(key)
    );

    keys.forEach(key => localStorage.removeItem(key));

    console.log('[StateMigration] Migration reset completed');
  }
}

// Экспорт статических методов для удобства использования
export const migrateUserManagementState = StateMigrationService.migrateUserManagementState;
export const getMigrationStatus = StateMigrationService.getMigrationStatus;
export const resetMigration = StateMigrationService.resetMigration;