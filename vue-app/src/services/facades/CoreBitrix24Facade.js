import { BaseBitrix24Facade } from './BaseBitrix24Facade.js';

/**
 * Фасад для работы с критически важными методами Bitrix24 API
 *
 * Содержит общие методы, используемые во всех частях приложения:
 * - Информация о текущем пользователе
 * - Системные настройки
 * - Базовые справочники
 * - Методы авторизации и безопасности
 *
 * TASK-088-02: Решение конфликта импортов Bitrix24 API
 *
 * @class CoreBitrix24Facade
 * @extends BaseBitrix24Facade
 */
export class CoreBitrix24Facade extends BaseBitrix24Facade {
  /**
   * Конструктор фасада основных методов
   */
  constructor() {
    super('core', 10 * 60 * 1000); // 10 минут кеширования для основных данных
  }

  /**
   * Получение информации о текущем пользователе
   * @returns {Promise<Object|null>} Информация о текущем пользователе
   */
  async getCurrentUser() {
    try {
      const result = await this.call('user.current', {
        select: [
          'ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'EMAIL',
          'ACTIVE', 'DATE_REGISTER', 'TIMESTAMP_X',
          'PERSONAL_PHONE', 'WORK_PHONE', 'PERSONAL_PHOTO',
          'WORK_POSITION', 'WORK_COMPANY', 'UF_DEPARTMENT',
          'USER_TYPE', 'EXTERNAL_AUTH_ID'
        ]
      });

      const user = result.result || null;

      if (user) {
        user.fullName = [user.NAME, user.SECOND_NAME, user.LAST_NAME]
          .filter(Boolean)
          .join(' ');
        user.isAdmin = user.USER_TYPE === 'employee' && user.ID === '1'; // Примерная логика
      }

      return user;
    } catch (error) {
      console.warn('Failed to get current user:', error.message);
      return null;
    }
  }

  /**
   * Получение основных системных настроек
   * @returns {Promise<Object>} Системные настройки
   */
  async getSystemInfo() {
    try {
      const [
        currentUser,
        departments,
        statusList
      ] = await Promise.all([
        this.getCurrentUser(),
        this.getDepartments({ limit: 100 }),
        this.getStatusList()
      ]);

      return {
        currentUser,
        departments: {
          total: departments.length,
          active: departments.filter(d => d.ACTIVE !== 'N').length
        },
        statuses: statusList,
        timestamp: new Date().toISOString(),
        cache: this.getMetrics()
      };
    } catch (error) {
      console.error('Failed to get system info:', error);
      throw error;
    }
  }

  /**
   * Получение списка отделов
   * @param {Object} options - опции запроса
   * @returns {Promise<Array>} Список отделов
   */
  async getDepartments(options = {}) {
    const { limit = 100, includeInactive = false } = options;

    const params = {
      select: ['ID', 'NAME', 'UF_HEAD', 'PARENT', 'SORT', 'ACTIVE'],
      order: { SORT: 'ASC' },
      start: 0
    };

    const result = await this.call('department.get', params);
    const departments = result.result || [];

    // Фильтруем активные отделы
    const filtered = includeInactive
      ? departments
      : departments.filter(dept => dept.ACTIVE !== 'N');

    return filtered.slice(0, limit);
  }

  /**
   * Получение списка статусов лидов/сделок
   * @param {string} entityType - тип сущности (LEAD, DEAL, etc.)
   * @returns {Promise<Array>} Список статусов
   */
  async getStatusList(entityType = 'LEAD') {
    try {
      const result = await this.call('crm.status.list', {
        filter: { ENTITY_ID: entityType },
        select: ['ID', 'NAME', 'SORT', 'COLOR', 'SEMANTICS']
      });

      return result.result || [];
    } catch (error) {
      console.warn(`Failed to get ${entityType} statuses:`, error.message);
      return [];
    }
  }

  /**
   * Получение списка типов лидов/сделок
   * @returns {Promise<Array>} Список типов
   */
  async getLeadTypes() {
    try {
      const result = await this.call('crm.lead.userfield.list', {
        filter: { FIELD_NAME: 'TYPE_ID' }
      });

      if (result.result && result.result[0]?.LIST) {
        return result.result[0].LIST;
      }

      return [];
    } catch (error) {
      console.warn('Failed to get lead types:', error.message);
      return [];
    }
  }

  /**
   * Получение источников лидов
   * @returns {Promise<Array>} Список источников
   */
  async getLeadSources() {
    try {
      const result = await this.call('crm.lead.userfield.list', {
        filter: { FIELD_NAME: 'SOURCE_ID' }
      });

      if (result.result && result.result[0]?.LIST) {
        return result.result[0].LIST;
      }

      return [];
    } catch (error) {
      console.warn('Failed to get lead sources:', error.message);
      return [];
    }
  }

  /**
   * Проверка доступности API
   * @returns {Promise<Object>} Статус доступности API
   */
  async checkApiAvailability() {
    const startTime = performance.now();

    try {
      await this.call('user.current', {
        select: ['ID']
      });

      const responseTime = performance.now() - startTime;

      return {
        available: true,
        responseTime: Math.round(responseTime),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;

      return {
        available: false,
        error: error.message,
        responseTime: Math.round(responseTime),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Получение списка пользователей по роли/типу
   * @param {string} userType - тип пользователя (employee, external, etc.)
   * @param {Object} options - дополнительные опции
   * @returns {Promise<Array>} Список пользователей
   */
  async getUsersByType(userType = 'employee', options = {}) {
    const { limit = 100, activeOnly = true } = options;

    const filters = {
      USER_TYPE: userType,
      ...(activeOnly && { ACTIVE: 'Y' })
    };

    const result = await this.call('user.get', {
      filter: filters,
      select: [
        'ID', 'NAME', 'LAST_NAME', 'EMAIL', 'ACTIVE',
        'WORK_POSITION', 'UF_DEPARTMENT', 'USER_TYPE'
      ],
      order: { NAME: 'ASC' },
      start: 0
    });

    const users = result.result || [];
    return users.slice(0, limit);
  }

  /**
   * Получение списка администраторов системы
   * @returns {Promise<Array>} Список администраторов
   */
  async getAdministrators() {
    // В Bitrix24 администраторы обычно имеют ID=1 или специальную роль
    // Это упрощенная логика, может потребоваться уточнение
    try {
      const users = await this.getUsersByType('employee', { limit: 10 });

      // Фильтруем пользователей с правами администратора
      // В реальном Bitrix24 это может быть сложнее определить
      const admins = users.filter(user =>
        user.ID === '1' || // Главный администратор
        user.WORK_POSITION?.toLowerCase().includes('админ') ||
        user.WORK_POSITION?.toLowerCase().includes('admin')
      );

      return admins;
    } catch (error) {
      console.warn('Failed to get administrators:', error.message);
      return [];
    }
  }

  /**
   * Получение настроек приложения из Bitrix24
   * @returns {Promise<Object>} Настройки приложения
   */
  async getAppSettings() {
    try {
      // Получаем настройки из пользовательских полей или отдельного хранилища
      // Это может быть реализовано через пользовательские поля приложения
      const result = await this.call('app.option.get', {
        // Параметры для получения настроек
      });

      return result.result || {};
    } catch (error) {
      console.warn('Failed to get app settings:', error.message);
      return {};
    }
  }

  /**
   * Получение списка доступных методов API
   * @returns {Promise<Array>} Список методов
   */
  async getAvailableMethods() {
    try {
      const result = await this.call('methods', {});

      return result.result || [];
    } catch (error) {
      // Метод methods может быть недоступен в некоторых версиях
      console.warn('Methods list not available:', error.message);
      return [];
    }
  }

  /**
   * Получение информации о лицензии Bitrix24
   * @returns {Promise<Object>} Информация о лицензии
   */
  async getLicenseInfo() {
    try {
      const result = await this.call('app.info', {});

      return result.result || {};
    } catch (error) {
      console.warn('License info not available:', error.message);
      return {};
    }
  }

  /**
   * Очистка всего кеша ядра
   */
  clearCoreCache() {
    // Очищаем кеш основных методов
    const coreMethods = [
      'user.current',
      'department.get',
      'crm.status.list',
      'user.get'
    ];

    coreMethods.forEach(method => {
      super.clearCache(method);
    });
  }

  /**
   * Получение полной системной информации для диагностики
   * @returns {Promise<Object>} Полная системная информация
   */
  async getFullSystemDiagnostics() {
    try {
      const [
        apiAvailability,
        currentUser,
        systemInfo,
        licenseInfo
      ] = await Promise.all([
        this.checkApiAvailability(),
        this.getCurrentUser(),
        this.getSystemInfo(),
        this.getLicenseInfo()
      ]);

      return {
        api: apiAvailability,
        user: currentUser,
        system: systemInfo,
        license: licenseInfo,
        diagnostics: {
          timestamp: new Date().toISOString(),
          facadeMetrics: this.getMetrics(),
          cacheSize: this.cache.size,
          uptime: performance.now()
        }
      };
    } catch (error) {
      console.error('Failed to get full system diagnostics:', error);
      throw error;
    }
  }
}