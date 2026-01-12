import { BaseBitrix24Facade } from './BaseBitrix24Facade.js';

/**
 * Фасад для работы с Bitrix24 API в контексте управления пользователями
 *
 * Специализирован для компонентов управления пользователями:
 * - UsersManagementPage.vue - страница управления пользователями
 * - UserProfileAnalysis.vue - анализ профиля пользователя
 * - AdvancedFilters.vue - расширенные фильтры
 *
 * TASK-088-02: Решение конфликта импортов Bitrix24 API
 *
 * @class UserManagementFacade
 * @extends BaseBitrix24Facade
 */
export class UserManagementFacade extends BaseBitrix24Facade {
  /**
   * Конструктор фасада управления пользователями
   */
  constructor() {
    super('user-management', 2 * 60 * 1000); // 2 минуты кеширования
  }

  /**
   * Получение списка пользователей с расширенными фильтрами
   * @param {Object} filters - фильтры для поиска
   * @param {Object} options - дополнительные опции
   * @returns {Promise<Array>} Список пользователей
   */
  async getUsersList(filters = {}, options = {}) {
    const {
      includeInactive = false,
      includeDepartments = true,
      sort = 'NAME',
      order = 'ASC',
      limit = 50,
      offset = 0
    } = options;

    const params = {
      filter: {
        ...filters,
        ...(includeInactive ? {} : { ACTIVE: 'Y' })
      },
      select: [
        'ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'EMAIL',
        'ACTIVE', 'DATE_REGISTER', 'TIMESTAMP_X',
        'PERSONAL_PHONE', 'WORK_PHONE', 'PERSONAL_PHOTO',
        'WORK_POSITION', 'WORK_COMPANY'
      ],
      order: { [sort]: order },
      start: offset
    };

    if (includeDepartments) {
      params.select.push('UF_DEPARTMENT');
    }

    const result = await this.call('user.get', params);
    const users = result.result || [];

    // Ограничиваем количество результатов
    return users.slice(0, limit);
  }

  /**
   * Поиск пользователей по различным критериям
   * @param {string} query - поисковый запрос
   * @param {Object} options - опции поиска
   * @returns {Promise<Array>} Найденные пользователи
   */
  async searchUsers(query, options = {}) {
    if (!query || query.length < 2) {
      return [];
    }

    const {
      searchIn = ['NAME', 'LAST_NAME', 'EMAIL', 'WORK_POSITION'],
      limit = 20,
      departmentId = null
    } = options;

    // Создаем фильтр для поиска
    const searchFilter = {};
    searchIn.forEach(field => {
      searchFilter[`%${field}`] = query;
    });

    if (departmentId) {
      searchFilter.UF_DEPARTMENT = parseInt(departmentId);
    }

    return this.getUsersList(searchFilter, { limit });
  }

  /**
   * Получение детальной информации о пользователе
   * @param {number|string} userId - ID пользователя
   * @returns {Promise<Object|null>} Детальная информация о пользователе
   */
  async getUserDetails(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const result = await this.call('user.get', {
      filter: { ID: parseInt(userId) },
      select: [
        'ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'LOGIN', 'EMAIL',
        'ACTIVE', 'DATE_REGISTER', 'TIMESTAMP_X', 'PERSONAL_BIRTHDAY',
        'PERSONAL_PHONE', 'WORK_PHONE', 'PERSONAL_PHOTO', 'PERSONAL_GENDER',
        'WORK_POSITION', 'WORK_COMPANY', 'WORK_DEPARTMENT',
        'UF_DEPARTMENT', 'UF_PHONE_INNER', 'UF_SKYPE', 'UF_WEB_SITES',
        'USER_TYPE', 'EXTERNAL_AUTH_ID'
      ]
    });

    const user = result.result?.[0] || null;

    if (user) {
      // Добавляем вычисляемые поля
      user.fullName = [user.NAME, user.SECOND_NAME, user.LAST_NAME]
        .filter(Boolean)
        .join(' ');

      user.registrationAge = this.calculateRegistrationAge(user.DATE_REGISTER);
      user.isRecentUser = user.registrationAge <= 30;
      user.hasCompleteProfile = this.checkProfileCompleteness(user);
    }

    return user;
  }

  /**
   * Получение пользователей по списку ID
   * @param {Array<number|string>} userIds - массив ID пользователей
   * @returns {Promise<Array>} Пользователи
   */
  async getUsersByIds(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return [];
    }

    const result = await this.call('user.get', {
      filter: { ID: userIds.map(id => parseInt(id)) },
      select: [
        'ID', 'NAME', 'LAST_NAME', 'EMAIL', 'ACTIVE',
        'WORK_POSITION', 'UF_DEPARTMENT', 'PERSONAL_PHOTO'
      ]
    });

    return result.result || [];
  }

  /**
   * Получение пользователей отдела с дополнительной информацией
   * @param {number|string} departmentId - ID отдела
   * @param {Object} options - дополнительные опции
   * @returns {Promise<Array>} Пользователи отдела
   */
  async getDepartmentUsers(departmentId, options = {}) {
    if (!departmentId) {
      throw new Error('Department ID is required');
    }

    const { includeInactive = false, limit = 100 } = options;

    const filters = {
      UF_DEPARTMENT: parseInt(departmentId),
      ...(includeInactive ? {} : { ACTIVE: 'Y' })
    };

    const users = await this.getUsersList(filters, {
      limit,
      includeDepartments: false // Уже фильтруем по отделу
    });

    // Добавляем информацию об отделе
    return users.map(user => ({
      ...user,
      departmentId: parseInt(departmentId),
      isDepartmentHead: false // TODO: Определить логику руководителя отдела
    }));
  }

  /**
   * Получение статистики пользователей
   * @param {Object} filters - фильтры для статистики
   * @returns {Promise<Object>} Статистика пользователей
   */
  async getUserStatistics(filters = {}) {
    const users = await this.getUsersList(filters, {
      limit: 1000, // Больше лимит для статистики
      includeInactive: true
    });

    const stats = {
      total: users.length,
      active: users.filter(u => u.ACTIVE === 'Y').length,
      inactive: users.filter(u => u.ACTIVE !== 'Y').length,
      recentRegistrations: users.filter(u => this.calculateRegistrationAge(u.DATE_REGISTER) <= 30).length,
      withEmail: users.filter(u => u.EMAIL).length,
      withPhone: users.filter(u => u.PERSONAL_PHONE || u.WORK_PHONE).length,
      withPhoto: users.filter(u => u.PERSONAL_PHOTO).length,
      byDepartment: {},
      byPosition: {},
      registrationTrend: this.calculateRegistrationTrend(users)
    };

    // Группировка по отделам
    users.forEach(user => {
      if (Array.isArray(user.UF_DEPARTMENT)) {
        user.UF_DEPARTMENT.forEach(deptId => {
          const id = parseInt(deptId);
          if (!stats.byDepartment[id]) {
            stats.byDepartment[id] = { active: 0, inactive: 0, total: 0 };
          }
          stats.byDepartment[id].total++;
          if (user.ACTIVE === 'Y') {
            stats.byDepartment[id].active++;
          } else {
            stats.byDepartment[id].inactive++;
          }
        });
      }
    });

    // Группировка по должностям
    users.forEach(user => {
      const position = user.WORK_POSITION || 'Не указана';
      stats.byPosition[position] = (stats.byPosition[position] || 0) + 1;
    });

    return stats;
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
   * Проверка полноты профиля пользователя
   * @param {Object} user - данные пользователя
   * @returns {boolean} Полный ли профиль
   */
  checkProfileCompleteness(user) {
    const requiredFields = [
      'NAME', 'LAST_NAME', 'EMAIL', 'WORK_POSITION'
    ];

    const optionalFields = [
      'PERSONAL_PHONE', 'WORK_PHONE', 'PERSONAL_PHOTO'
    ];

    const requiredComplete = requiredFields.every(field => user[field]);
    const optionalCount = optionalFields.filter(field => user[field]).length;

    return requiredComplete && (optionalCount >= 2);
  }

  /**
   * Расчет тренда регистраций
   * @param {Array} users - список пользователей
   * @returns {Array} Тренд регистраций по месяцам
   */
  calculateRegistrationTrend(users) {
    const trend = {};
    const now = new Date();

    users.forEach(user => {
      if (!user.DATE_REGISTER) return;

      const regDate = new Date(user.DATE_REGISTER);
      const monthsDiff = Math.floor((now - regDate) / (1000 * 60 * 60 * 24 * 30));

      if (monthsDiff <= 12) { // Последние 12 месяцев
        const monthKey = `${regDate.getFullYear()}-${String(regDate.getMonth() + 1).padStart(2, '0')}`;
        trend[monthKey] = (trend[monthKey] || 0) + 1;
      }
    });

    // Преобразуем в отсортированный массив
    return Object.entries(trend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  }

  /**
   * Получение рекомендаций по улучшению профилей пользователей
   * @param {Object} options - опции анализа
   * @returns {Promise<Object>} Рекомендации по улучшению
   */
  async getProfileImprovementSuggestions(options = {}) {
    const { departmentId, limit = 10 } = options;

    const filters = departmentId ? { UF_DEPARTMENT: parseInt(departmentId) } : {};
    const users = await this.getUsersList(filters, {
      limit: 200,
      includeInactive: false
    });

    const incompleteProfiles = users
      .filter(user => !this.checkProfileCompleteness(user))
      .map(user => ({
        ...user,
        completenessScore: this.calculateProfileCompletenessScore(user),
        missingFields: this.getMissingFields(user)
      }))
      .sort((a, b) => a.completenessScore - b.completenessScore)
      .slice(0, limit);

    return {
      totalUsers: users.length,
      incompleteProfiles: incompleteProfiles.length,
      suggestions: incompleteProfiles,
      completionRate: Math.round(((users.length - incompleteProfiles.length) / users.length) * 100)
    };
  }

  /**
   * Расчет оценки полноты профиля
   * @param {Object} user - данные пользователя
   * @returns {number} Оценка от 0 до 100
   */
  calculateProfileCompletenessScore(user) {
    const fields = [
      'NAME', 'LAST_NAME', 'EMAIL', 'WORK_POSITION', // Обязательные (вес 2)
      'PERSONAL_PHONE', 'WORK_PHONE', 'PERSONAL_PHOTO' // Дополнительные (вес 1)
    ];

    let totalScore = 0;
    let maxScore = 0;

    fields.forEach((field, index) => {
      const weight = index < 4 ? 2 : 1;
      maxScore += weight;
      if (user[field]) {
        totalScore += weight;
      }
    });

    return Math.round((totalScore / maxScore) * 100);
  }

  /**
   * Получение списка недостающих полей
   * @param {Object} user - данные пользователя
   * @returns {Array} Список недостающих полей
   */
  getMissingFields(user) {
    const fieldLabels = {
      NAME: 'Имя',
      LAST_NAME: 'Фамилия',
      EMAIL: 'Email',
      WORK_POSITION: 'Должность',
      PERSONAL_PHONE: 'Личный телефон',
      WORK_PHONE: 'Рабочий телефон',
      PERSONAL_PHOTO: 'Фото'
    };

    return Object.entries(fieldLabels)
      .filter(([field]) => !user[field])
      .map(([, label]) => label);
  }
}