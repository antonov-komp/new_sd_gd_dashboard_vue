import { BaseBitrix24Facade } from './BaseBitrix24Facade.js';

/**
 * Фасад для работы с Bitrix24 API в контексте анализа активности пользователей
 *
 * Специализирован для компонентов TASK-088-01:
 * - ActivityDashboard.vue - получение пользователей
 * - UserProfileAnalysis.vue - детальная информация о пользователе
 * - AdvancedFilters.vue - фильтрация по отделам
 *
 * TASK-088-02: Решение конфликта импортов Bitrix24 API
 *
 * @class ActivityBitrix24Facade
 * @extends BaseBitrix24Facade
 */
export class ActivityBitrix24Facade extends BaseBitrix24Facade {
  /**
   * Конструктор фасада активности
   */
  constructor() {
    super('activity');
  }

  /**
   * Получение списка пользователей с фильтрами
   * @param {Object} filters - фильтры для поиска пользователей
   * @returns {Promise<Array>} Список пользователей
   */
  async getUsersList(filters = {}) {
    const result = await this.call('user.get', {
      filter: {
        ACTIVE: 'Y', // Только активные пользователи по умолчанию
        ...filters
      },
      select: [
        'ID', 'NAME', 'LAST_NAME', 'EMAIL',
        'UF_DEPARTMENT', 'ACTIVE', 'DATE_REGISTER',
        'PERSONAL_PHOTO', 'WORK_POSITION'
      ]
    });

    return result.result || [];
  }

  /**
   * Получение детальной информации о пользователе
   * @param {number|string} userId - ID пользователя
   * @returns {Promise<Object|null>} Детальная информация о пользователе
   */
  async getUserDetails(userId) {
    if (!userId) throw new Error('User ID is required');

    const result = await this.call('user.get', {
      filter: { ID: parseInt(userId) },
      select: [
        'ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'EMAIL',
        'UF_DEPARTMENT', 'ACTIVE', 'DATE_REGISTER', 'TIMESTAMP_X',
        'PERSONAL_PHONE', 'WORK_PHONE', 'PERSONAL_PHOTO',
        'WORK_POSITION', 'WORK_COMPANY'
      ]
    });

    return result.result?.[0] || null;
  }

  /**
   * Получение списка отделов
   * @returns {Promise<Array>} Список отделов
   */
  async getDepartments() {
    const result = await this.call('department.get', {
      select: ['ID', 'NAME', 'UF_HEAD', 'PARENT', 'SORT']
    });

    return result.result || [];
  }

  /**
   * Получение пользователей конкретного отдела
   * @param {number|string} departmentId - ID отдела
   * @returns {Promise<Array>} Список пользователей отдела
   */
  async getDepartmentUsers(departmentId) {
    if (!departmentId) throw new Error('Department ID is required');

    return this.getUsersList({
      UF_DEPARTMENT: parseInt(departmentId)
    });
  }

  /**
   * Получение статистики по отделам
   * @returns {Promise<Array>} Статистика по отделам с количеством пользователей
   */
  async getDepartmentStats() {
    const [departments, users] = await Promise.all([
      this.getDepartments(),
      this.getUsersList()
    ]);

    // Группировка пользователей по отделам
    const stats = departments.map(dept => {
      const deptUsers = users.filter(user =>
        Array.isArray(user.UF_DEPARTMENT) &&
        user.UF_DEPARTMENT.includes(parseInt(dept.ID))
      );

      return {
        department: dept,
        userCount: deptUsers.length,
        activeUsers: deptUsers.filter(u => u.ACTIVE === 'Y').length
      };
    });

    return stats;
  }

  /**
   * Поиск пользователей
   * @param {string} query - поисковый запрос
   * @param {number} limit - максимальное количество результатов
   * @returns {Promise<Array>} Найденные пользователи
   */
  async searchUsers(query, limit = 20) {
    if (!query || query.length < 2) {
      return [];
    }

    return this.getUsersList({
      '%NAME': query,
      '%LAST_NAME': query,
      '%EMAIL': query
    }).then(users => users.slice(0, limit));
  }

  /**
   * Получение пользователей по списку ID
   * @param {Array<number|string>} userIds - массив ID пользователей
   * @returns {Promise<Array>} Пользователи по ID
   */
  async getUsersByIds(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return [];
    }

    const result = await this.call('user.get', {
      filter: {
        ID: userIds.map(id => parseInt(id))
      },
      select: [
        'ID', 'NAME', 'LAST_NAME', 'EMAIL',
        'UF_DEPARTMENT', 'ACTIVE', 'WORK_POSITION'
      ]
    });

    return result.result || [];
  }

  /**
   * Получение пользователей с расширенной информацией для аналитики
   * @param {Object} options - опции запроса
   * @returns {Promise<Array>} Пользователи с дополнительной информацией
   */
  async getUsersForAnalytics(options = {}) {
    const {
      departmentId,
      activeOnly = true,
      includeInactive = false,
      limit = 100
    } = options;

    const filters = {};

    if (activeOnly && !includeInactive) {
      filters.ACTIVE = 'Y';
    }

    if (departmentId) {
      filters.UF_DEPARTMENT = parseInt(departmentId);
    }

    const users = await this.getUsersList(filters);

    // Дополнительная обработка для аналитики
    return users.slice(0, limit).map(user => ({
      ...user,
      // Добавляем вычисляемые поля для аналитики
      fullName: `${user.NAME} ${user.LAST_NAME || ''}`.trim(),
      departmentName: '', // Будет заполнено при необходимости
      registrationAge: this.calculateRegistrationAge(user.DATE_REGISTER),
      isNewUser: this.isNewUser(user.DATE_REGISTER)
    }));
  }

  /**
   * Расчет возраста регистрации пользователя
   * @param {string} registrationDate - дата регистрации
   * @returns {number} Возраст в днях
   */
  calculateRegistrationAge(registrationDate) {
    if (!registrationDate) return 0;

    const regDate = new Date(registrationDate);
    const now = new Date();
    const diffTime = Math.abs(now - regDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Проверка, является ли пользователь новым (менее 30 дней)
   * @param {string} registrationDate - дата регистрации
   * @returns {boolean} Является ли новым
   */
  isNewUser(registrationDate) {
    return this.calculateRegistrationAge(registrationDate) <= 30;
  }

  /**
   * Получение иерархии отделов с пользователями
   * @returns {Promise<Array>} Иерархическая структура отделов с пользователями
   */
  async getDepartmentHierarchy() {
    const [departments, users] = await Promise.all([
      this.getDepartments(),
      this.getUsersList()
    ]);

    // Создаем карту отделов
    const deptMap = new Map();
    departments.forEach(dept => {
      deptMap.set(parseInt(dept.ID), {
        ...dept,
        users: [],
        children: []
      });
    });

    // Распределяем пользователей по отделам
    users.forEach(user => {
      if (Array.isArray(user.UF_DEPARTMENT)) {
        user.UF_DEPARTMENT.forEach(deptId => {
          const dept = deptMap.get(parseInt(deptId));
          if (dept) {
            dept.users.push(user);
          }
        });
      }
    });

    // Строим иерархию
    const hierarchy = [];
    deptMap.forEach(dept => {
      if (dept.PARENT) {
        const parent = deptMap.get(parseInt(dept.PARENT));
        if (parent) {
          parent.children.push(dept);
        }
      } else {
        hierarchy.push(dept);
      }
    });

    return hierarchy;
  }

  /**
   * Получение сводной статистики по пользователям
   * @returns {Promise<Object>} Сводная статистика
   */
  async getUserSummaryStats() {
    const users = await this.getUsersList();

    const stats = {
      total: users.length,
      active: users.filter(u => u.ACTIVE === 'Y').length,
      inactive: users.filter(u => u.ACTIVE !== 'Y').length,
      newUsers: users.filter(u => this.isNewUser(u.DATE_REGISTER)).length,
      departmentsCount: new Set(
        users.flatMap(u => u.UF_DEPARTMENT || [])
      ).size,
      usersByDepartment: {}
    };

    // Группировка по отделам
    users.forEach(user => {
      if (Array.isArray(user.UF_DEPARTMENT)) {
        user.UF_DEPARTMENT.forEach(deptId => {
          const id = parseInt(deptId);
          if (!stats.usersByDepartment[id]) {
            stats.usersByDepartment[id] = {
              active: 0,
              inactive: 0,
              total: 0
            };
          }
          stats.usersByDepartment[id].total++;
          if (user.ACTIVE === 'Y') {
            stats.usersByDepartment[id].active++;
          } else {
            stats.usersByDepartment[id].inactive++;
          }
        });
      }
    });

    return stats;
  }
}