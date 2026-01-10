/**
 * Сервис управления кешем с иерархической сортировкой
 *
 * Обеспечивает:
 * - Категоризацию модулей по важности
 * - Сортировку в рамках категорий
 * - Группировку побочных модулей
 * - Кеширование результатов категоризации
 *
 * API endpoints:
 * - /api/admin/cache-status.php - получение статуса
 * - /api/admin/cache-clear.php - очистка кеша
 * - /api/admin/cache-stats.php - статистика кеша
 */

import { getApiUrl } from '@/utils/path-utils.js';

export class CacheManagementService {
  // Основные модули кеша (высокий приоритет)
  static PRIMARY_MODULE_IDS = [
    'dashboard-sector-1c',        // 1. Дашборд сектора 1С
    'graph-state',                // 2. График состояния
    'graph-admission-closure-weeks',  // 3. График приема-закрытия (4 недели)
    'graph-admission-closure-months', // 4. График приема-закрытия (3 месяца)
    'time-tracking-default',      // 5. Трудозатраты на тикеты сектора 1С (по умолчанию)
    'time-tracking-detailed',     // 6. Трудозатраты на тикеты сектора 1С (детальный)
    'time-tracking-summary'       // 7. Трудозатраты на тикеты сектора 1С (сводный)
  ];

  // Приоритеты основных модулей (для индикации)
  static PRIMARY_MODULE_PRIORITIES = {
    'dashboard-sector-1c': 1,
    'graph-state': 2,
    'graph-admission-closure-weeks': 3,
    'graph-admission-closure-months': 4,
    'time-tracking-default': 5,    // Трудозатраты - группа из 3 режимов
    'time-tracking-detailed': 6,   // Все имеют одинаковый базовый приоритет 5
    'time-tracking-summary': 7     // Но разные под-приоритеты для сортировки
  };

  // Типы побочных модулей для группировки
  static SECONDARY_MODULE_TYPES = {
    users: {
      prefix: 'users-management',
      title: '👥 Управление пользователями',
      description: 'Модули для управления пользователями и отделами'
    },
    activity: {
      prefix: 'user-activity',
      title: '📊 Отслеживание активности',
      description: 'Мониторинг активности пользователей'
    },
    webhooks: {
      prefix: 'webhook-logs',
      title: '🔗 Логи вебхуков',
      description: 'Логирование и мониторинг вебхуков'
    }
  };

  // Кеш результатов категоризации (для производительности)
  static categorizationCache = new Map();
  static CACHE_TTL = 30000; // 30 секунд

  /**
   * Получение статуса кеша всех модулей с категоризацией
   *
   * @returns {Promise<Object>} Объект с categorized и metadata
   */
  static async getCacheStatus() {
    try {
      const apiUrl = getApiUrl('/api/admin/cache-status.php');

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        const modules = result.modules || [];

        if (modules.length === 0) {
          return {
            primaryModules: [],
            secondaryModules: [],
            metadata: { totalModules: 0, primaryCount: 0, secondaryCount: 0 }
          };
        }

        return this.categorizeAndSortModules(modules);
      } else {
        throw new Error(result.error || 'Failed to get cache status');
      }
    } catch (error) {
      console.error('[CacheManagementService] Error getting cache status:', error);
      throw error;
    }
  }
  
  /**
   * Очистка кеша модуля
   * 
   * @param {string} moduleId - ID модуля или 'all' для очистки всего кеша
   * @returns {Promise<boolean>} true если успешно
   */
  static async clearCache(moduleId) {
    try {
      const apiUrl = getApiUrl('/api/admin/cache-clear.php');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          module_id: moduleId,
          confirm: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return true;
      } else {
        throw new Error(result.error || 'Failed to clear cache');
      }
    } catch (error) {
      console.error('[CacheManagementService] Error clearing cache:', error);
      throw error;
    }
  }
  
  /**
   * Получение статистики кеша
   * 
   * @returns {Promise<object>} Статистика кеша
   */
  static async getCacheStats() {
    try {
      const apiUrl = getApiUrl('/api/admin/cache-stats.php');
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return result.stats || {};
      } else {
        throw new Error(result.error || 'Failed to get cache stats');
      }
    } catch (error) {
      console.error('[CacheManagementService] Error getting cache stats:', error);
      throw error;
    }
  }
  
  /**
   * Форматирование размера кеша в читаемый формат
   * 
   * @param {number} bytes - Размер в байтах
   * @returns {string} Отформатированный размер
   */
  static formatCacheSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  /**
   * Полная категоризация и сортировка модулей
   * @param {Array} modules - все модули кеша
   * @param {Object} options - опции категоризации
   * @returns {Object} объект с categorized и metadata
   */
  static categorizeAndSortModules(modules, options = {}) {
    const cacheKey = this.generateCacheKey(modules);
    const cached = this.getCachedResult(cacheKey);

    if (cached && !options.forceRefresh) {
      return cached;
    }

    const startTime = performance.now();

    // Основная логика категоризации
    const result = this.performCategorization(modules);

    const endTime = performance.now();

    // Добавляем метаданные
    result.metadata = {
      processingTime: endTime - startTime,
      totalModules: modules.length,
      primaryCount: result.primaryModules.length,
      secondaryCount: result.secondaryModules.length,
      cached: false
    };

    // Кешируем результат
    this.setCachedResult(cacheKey, result);

    return result;
  }

  /**
   * Выполнение категоризации модулей
   */
  static performCategorization(modules) {
    const primaryModules = [];
    const secondaryModules = [];

    modules.forEach(module => {
      this.validateModule(module); // Валидация структуры модуля

      if (this.PRIMARY_MODULE_IDS.includes(module.id)) {
        primaryModules.push({
          ...module,
          category: 'primary',
          priority: this.PRIMARY_MODULE_PRIORITIES[module.id] || 999
        });
      } else {
        secondaryModules.push({
          ...module,
          category: 'secondary',
          groupType: this.getModuleType(module.id)
        });
      }
    });

    return {
      primaryModules: this.sortPrimaryModules(primaryModules),
      secondaryModules: this.sortSecondaryModules(secondaryModules)
    };
  }

  /**
   * Сортировка основных модулей по фиксированному приоритету
   */
  static sortPrimaryModules(modules) {
    return modules.sort((a, b) => {
      const aPriority = this.PRIMARY_MODULE_PRIORITIES[a.id] || 999;
      const bPriority = this.PRIMARY_MODULE_PRIORITIES[b.id] || 999;
      return aPriority - bPriority;
    });
  }

  /**
   * Сортировка побочных модулей по типу и названию
   */
  static sortSecondaryModules(modules) {
    return modules.sort((a, b) => {
      // Сначала по типу группы
      const aType = this.getModuleType(a.id);
      const bType = this.getModuleType(b.id);

      if (aType !== bType) {
        return this.compareModuleTypes(aType, bType);
      }

      // Внутри типа - по названию модуля
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Сравнение типов модулей для сортировки
   */
  static compareModuleTypes(typeA, typeB) {
    const typeOrder = ['users', 'activity', 'webhooks', 'other'];
    const aIndex = typeOrder.indexOf(typeA);
    const bIndex = typeOrder.indexOf(typeB);

    // Неизвестные типы идут в конец
    const aFinalIndex = aIndex === -1 ? 999 : aIndex;
    const bFinalIndex = bIndex === -1 ? 999 : bIndex;

    return aFinalIndex - bFinalIndex;
  }

  /**
   * Определение типа модуля по ID с расширенной логикой
   */
  static getModuleType(moduleId) {
    // Проверяем известные префиксы
    for (const [type, config] of Object.entries(this.SECONDARY_MODULE_TYPES)) {
      if (moduleId.startsWith(config.prefix)) {
        return type;
      }
    }

    // Специальные случаи
    if (moduleId.includes('time-tracking')) return 'time-tracking';
    if (moduleId.includes('graph')) return 'graphs';
    if (moduleId.includes('dashboard')) return 'dashboards';

    return 'other';
  }

  /**
   * Получение конфигурации типа модуля
   */
  static getModuleTypeConfig(type) {
    return this.SECONDARY_MODULE_TYPES[type] || {
      title: '🔧 Прочие модули',
      description: 'Дополнительные модули системы'
    };
  }

  /**
   * Валидация структуры модуля
   */
  static validateModule(module) {
    if (!module || typeof module !== 'object') {
      throw new Error('Module must be an object');
    }

    if (!module.id || typeof module.id !== 'string') {
      throw new Error('Module must have a valid id');
    }

    if (!module.name || typeof module.name !== 'string') {
      throw new Error('Module must have a valid name');
    }

    return true;
  }

  /**
   * Генерация ключа для кеширования
   */
  static generateCacheKey(modules) {
    // Создаем хеш на основе ID модулей и их порядка
    const ids = modules.map(m => m.id).sort().join(',');
    return btoa(ids).substring(0, 16);
  }

  /**
   * Получение кешированного результата
   */
  static getCachedResult(key) {
    const cached = this.categorizationCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.categorizationCache.delete(key);
      return null;
    }

    // Возвращаем данные с пометкой, что они из кеша
    return {
      ...cached.data,
      metadata: {
        ...cached.data.metadata,
        cached: true
      }
    };
  }

  /**
   * Сохранение результата в кеш
   */
  static setCachedResult(key, data) {
    this.categorizationCache.set(key, {
      data: {
        ...data,
        metadata: {
          ...data.metadata,
          cached: false
        }
      },
      timestamp: Date.now()
    });

    // Очистка старых записей при переполнении
    if (this.categorizationCache.size > 10) {
      const oldestKey = this.categorizationCache.keys().next().value;
      this.categorizationCache.delete(oldestKey);
    }
  }

  /**
   * Очистка кеша категоризации
   */
  static clearCategorizationCache() {
    this.categorizationCache.clear();
  }

  /**
   * Получение статистики категоризации
   */
  static getCategorizationStats() {
    return {
      cacheSize: this.categorizationCache.size,
      cacheEntries: Array.from(this.categorizationCache.entries()).map(([key, value]) => ({
        key,
        age: Date.now() - value.timestamp,
        modulesCount: value.data.primaryModules.length + value.data.secondaryModules.length
      }))
    };
  }

  /**
   * Форматирование TTL в читаемый формат
   *
   * @param {number} seconds - TTL в секундах
   * @returns {string} Отформатированный TTL
   */
  static formatTTL(seconds) {
    if (seconds < 60) {
      return `${seconds} сек`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} мин`;
    } else {
      return `${Math.floor(seconds / 3600)} ч`;
    }
  }
}

