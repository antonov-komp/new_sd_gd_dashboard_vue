import { BaseBitrix24Facade } from './BaseBitrix24Facade.js';

/**
 * Фасад для работы с Bitrix24 API в контексте дашбордов
 *
 * Специализирован для компонентов дашбордов:
 * - DashboardSector1C.vue - основной дашборд
 * - GraphStateDashboard.vue - графики состояний
 * - TicketsTimeTrackingDashboard.vue - отслеживание времени
 *
 * TASK-088-02: Решение конфликта импортов Bitrix24 API
 *
 * @class DashboardBitrix24Facade
 * @extends BaseBitrix24Facade
 */
export class DashboardBitrix24Facade extends BaseBitrix24Facade {
  /**
   * Конструктор фасада дашбордов
   */
  constructor() {
    super('dashboard', 3 * 60 * 1000); // 3 минуты кеширования для дашбордов
  }

  /**
   * Получение списка отделов для дашбордов
   * @param {Object} options - опции запроса
   * @returns {Promise<Array>} Список отделов
   */
  async getDepartmentsForDashboard(options = {}) {
    const {
      includeHead = true,
      activeOnly = true,
      sort = 'SORT'
    } = options;

    const params = {
      select: ['ID', 'NAME', 'SORT'],
      order: { [sort]: 'ASC' }
    };

    if (includeHead) {
      params.select.push('UF_HEAD');
    }

    if (activeOnly) {
      // Получаем все отделы, фильтрация активных происходит на клиенте
      // TODO: Определить логику активности отделов
    }

    const result = await this.call('department.get', params);
    return result.result || [];
  }

  /**
   * Получение пользователей для дашборда с расширенной информацией
   * @param {Object} options - опции запроса
   * @returns {Promise<Array>} Пользователи с информацией для дашбордов
   */
  async getUsersForDashboard(options = {}) {
    const {
      departmentId,
      activeOnly = true,
      includeProfiles = false,
      limit = 100
    } = options;

    const filters = {};
    if (activeOnly) {
      filters.ACTIVE = 'Y';
    }
    if (departmentId) {
      filters.UF_DEPARTMENT = parseInt(departmentId);
    }

    const users = await this.getUsersList(filters);
    const limitedUsers = users.slice(0, limit);

    // Добавляем вычисляемые поля для дашбордов
    return limitedUsers.map(user => ({
      ...user,
      fullName: `${user.NAME || ''} ${user.LAST_NAME || ''}`.trim(),
      hasPhoto: !!(user.PERSONAL_PHOTO && user.PERSONAL_PHOTO.showUrl),
      departmentName: '', // Будет заполнено при необходимости
      isOnline: false, // TODO: Определить логику онлайн статуса
      lastActivity: user.TIMESTAMP_X || user.DATE_REGISTER
    }));
  }

  /**
   * Получение статистики пользователей для дашборда
   * @param {Object} options - опции запроса
   * @returns {Promise<Object>} Статистика пользователей
   */
  async getUserStatsForDashboard(options = {}) {
    const {
      departmentId,
      includeInactive = false
    } = options;

    const users = await this.getUsersList({
      ...(departmentId && { UF_DEPARTMENT: parseInt(departmentId) }),
      ...(!includeInactive && { ACTIVE: 'Y' })
    });

    const stats = {
      total: users.length,
      active: users.filter(u => u.ACTIVE === 'Y').length,
      inactive: users.filter(u => u.ACTIVE !== 'Y').length,
      withPhoto: users.filter(u => u.PERSONAL_PHOTO).length,
      byPosition: {},
      recentRegistrations: users.filter(u => this.isRecentUser(u.DATE_REGISTER)).length
    };

    // Группировка по должностям
    users.forEach(user => {
      const position = user.WORK_POSITION || 'Не указана';
      stats.byPosition[position] = (stats.byPosition[position] || 0) + 1;
    });

    return stats;
  }

  /**
   * Получение данных для графиков активности
   * @param {Object} options - опции запроса
   * @returns {Promise<Array>} Данные для графиков
   */
  async getActivityChartData(options = {}) {
    const {
      departmentId,
      period = 'month', // day, week, month, year
      limit = 30
    } = options;

    // Получаем пользователей отдела
    const users = await this.getUsersForDashboard({
      departmentId,
      limit: 200 // Больше лимит для анализа активности
    });

    // Группируем по дате регистрации или последней активности
    const groupedData = {};
    const now = new Date();

    users.forEach(user => {
      const date = user.TIMESTAMP_X || user.DATE_REGISTER;
      if (!date) return;

      const activityDate = new Date(date);
      const key = this.getGroupKey(activityDate, period, now);

      if (!groupedData[key]) {
        groupedData[key] = {
          date: key,
          count: 0,
          activeUsers: 0
        };
      }

      groupedData[key].count++;
      if (user.ACTIVE === 'Y') {
        groupedData[key].activeUsers++;
      }
    });

    // Преобразуем в массив и сортируем
    return Object.values(groupedData)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-limit);
  }

  /**
   * Получение ключей группировки для графиков
   * @param {Date} date - дата для группировки
   * @param {string} period - период группировки
   * @param {Date} now - текущая дата
   * @returns {string} Ключ группировки
   */
  getGroupKey(date, period, now) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (period) {
      case 'day':
        return `${year}-${month}-${day}`;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
      case 'month':
        return `${year}-${month}`;
      case 'year':
        return year.toString();
      default:
        return `${year}-${month}-${day}`;
    }
  }

  /**
   * Проверка, является ли пользователь недавно зарегистрированным
   * @param {string} registrationDate - дата регистрации
   * @returns {boolean} Является ли недавно зарегистрированным
   */
  isRecentUser(registrationDate) {
    if (!registrationDate) return false;

    const regDate = new Date(registrationDate);
    const now = new Date();
    const diffTime = Math.abs(now - regDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays <= 30; // 30 дней считаем "недавно"
  }

  /**
   * Получение сводных метрик дашборда
   * @returns {Promise<Object>} Сводные метрики
   */
  async getDashboardSummary() {
    const [
      departments,
      users,
      userStats
    ] = await Promise.all([
      this.getDepartmentsForDashboard(),
      this.getUsersForDashboard({ limit: 500 }),
      this.getUserStatsForDashboard()
    ]);

    return {
      departments: {
        total: departments.length,
        withHead: departments.filter(d => d.UF_HEAD).length
      },
      users: userStats,
      system: {
        cacheEfficiency: this.getMetrics().cache.efficiency,
        avgResponseTime: Math.round(this.getMetrics().api.avgResponseTime),
        totalApiCalls: this.getMetrics().api.totalCalls
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Очистка кеша для дашборда
   * @param {string} pattern - паттерн очистки
   */
  clearDashboardCache(pattern = null) {
    // Очищаем кеш методов, связанных с дашбордами
    const dashboardPatterns = [
      'user.get',
      'department.get',
      'crm.status.list'
    ];

    if (pattern) {
      dashboardPatterns.forEach(p => {
        if (p.includes(pattern)) {
          super.clearCache(p);
        }
      });
    } else {
      dashboardPatterns.forEach(p => super.clearCache(p));
    }
  }
}