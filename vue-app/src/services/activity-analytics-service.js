/**
 * Сервис для аналитики активности пользователей
 *
 * Предоставляет методы для:
 * - Анализа паттернов использования
 * - Группировки активности по различным критериям
 * - Расчёта метрик дашборда
 * - Анализа сессий пользователей
 *
 * Используется компонентами анализа активности для обработки и агрегации данных.
 */

export class ActivityAnalyticsService {

  /**
   * Анализ паттернов использования
   *
   * @param {Array} activity - Массив записей активности
   * @returns {Object} Анализ паттернов использования
   */
  static analyzeUsagePatterns(activity) {
    if (!Array.isArray(activity) || activity.length === 0) {
      return this.getEmptyPatterns();
    }

    return {
      peakHours: this.calculatePeakHours(activity),
      sessionDuration: this.calculateAverageSession(activity),
      userRetention: this.calculateRetention(activity),
      popularPaths: this.findPopularPaths(activity),
      deviceBreakdown: this.analyzeDevices(activity),
      browserStats: this.analyzeBrowsers(activity)
    };
  }

  /**
   * Группировка активности
   *
   * @param {Array} activity - Массив записей активности
   * @param {string} groupBy - Критерий группировки ('hour', 'day', 'week', 'month', 'user', 'page', 'session')
   * @returns {Array} Сгруппированные данные
   */
  static groupActivity(activity, groupBy) {
    if (!Array.isArray(activity)) {
      return [];
    }

    const groups = new Map();

    activity.forEach(entry => {
      let key;
      switch (groupBy) {
        case 'hour':
          key = entry.timestamp ? new Date(entry.timestamp).getHours() : 'unknown';
          break;
        case 'day':
          key = entry.timestamp ? new Date(entry.timestamp).toISOString().split('T')[0] : 'unknown';
          break;
        case 'week':
          const date = entry.timestamp ? new Date(entry.timestamp) : new Date();
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = entry.timestamp ? new Date(entry.timestamp).toISOString().substring(0, 7) : 'unknown';
          break;
        case 'user':
          key = entry.user_id || 'unknown';
          break;
        case 'page':
          key = entry.route_path || entry.route_title || entry.route_name || 'unknown';
          break;
        case 'session':
          key = this.calculateSessionId(entry);
          break;
        default:
          key = 'all';
      }

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          entries: [],
          count: 0,
          metadata: this.getGroupMetadata(key, groupBy)
        });
      }

      groups.get(key).entries.push(entry);
      groups.get(key).count++;
    });

    // Сортировка результатов
    const sortedGroups = Array.from(groups.values());
    return this.sortGroups(sortedGroups, groupBy);
  }

  /**
   * Расчёт метрик для дашборда
   *
   * @param {Array} activity - Массив записей активности за текущий период
   * @param {Array} previousActivity - Массив записей активности за предыдущий период
   * @returns {Object} Метрики с трендами
   */
  static calculateDashboardMetrics(activity, previousActivity = []) {
    const current = this.calculateMetrics(activity);
    const previous = previousActivity.length > 0 ? this.calculateMetrics(previousActivity) : {};

    // Расчёт изменений
    const metrics = {};
    Object.keys(current).forEach(key => {
      const currentValue = current[key];
      const previousValue = previous[key] || 0;

      metrics[key] = {
        value: currentValue,
        previousValue,
        change: currentValue - previousValue,
        changePercent: previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0,
        trend: currentValue > previousValue ? 'up' : currentValue < previousValue ? 'down' : 'neutral'
      };
    });

    return metrics;
  }

  /**
   * Анализ сессий пользователя
   *
   * @param {Array} userActivity - Активность конкретного пользователя
   * @returns {Array} Массив сессий с метаданными
   */
  static analyzeUserSessions(userActivity) {
    if (!Array.isArray(userActivity) || userActivity.length === 0) {
      return [];
    }

    const sortedActivity = [...userActivity].sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    const sessions = [];
    let currentSession = null;
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 минут

    sortedActivity.forEach(entry => {
      // Проверяем, что entry существует
      if (!entry || typeof entry !== 'object' || !entry.timestamp) return;

      const entryTime = new Date(entry.timestamp).getTime();

      if (!currentSession || (entryTime - currentSession.endTime) > SESSION_TIMEOUT) {
        // Новая сессия
        currentSession = {
          id: `session_${sessions.length + 1}`,
          startTime: entryTime,
          endTime: entryTime,
          entries: [],
          duration: 0,
          pages: new Set(),
          device: entry.user_agent,
          actions: new Map() // тип действия -> количество
        };
        sessions.push(currentSession);
      }

      currentSession.entries.push(entry);
      currentSession.endTime = entryTime;
      if (entry.route_path) currentSession.pages.add(entry.route_path);

      // Подсчёт типов действий
      const actionType = entry.type || 'unknown';
      currentSession.actions.set(actionType, (currentSession.actions.get(actionType) || 0) + 1);
    });

    // Расчёт длительности сессий
    sessions.forEach(session => {
      session.duration = session.endTime - session.startTime;
      session.pageCount = session.pages.size;
      session.entriesCount = session.entries.length;
      session.actions = Object.fromEntries(session.actions);
    });

    return sessions;
  }

  /**
   * Расчёт статистики конкретного пользователя
   *
   * @param {Array} userActivity - Активность пользователя
   * @returns {Object} Статистика пользователя
   */
  static calculateUserStats(userActivity) {
    if (!Array.isArray(userActivity) || userActivity.length === 0) {
      return this.getEmptyUserStats();
    }

    const sessions = this.analyzeUserSessions(userActivity);
    const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);

    // Группировка по дням для анализа паттернов
    const activityByDay = this.groupActivity(userActivity, 'day');
    const favoritePages = this.findFavoritePages(userActivity);

    return {
      total_actions: userActivity.length,
      total_sessions: sessions.length,
      avg_session_duration: sessions.length > 0 ? totalDuration / sessions.length : 0,
      total_duration: totalDuration,
      favorite_page: favoritePages[0]?.page || null,
      peak_hour: this.calculateUserPeakHour(userActivity),
      device_preference: this.calculateDevicePreference(userActivity),
      activity_by_day: activityByDay.map(group => ({
        date: group.key,
        count: group.count,
        sessions: this.analyzeUserSessions(group.entries).length
      })),
      retention_days: this.calculateUserRetention(userActivity)
    };
  }

  // ============ Вспомогательные методы ============

  /**
   * Расчёт пиковых часов активности
   */
  static calculatePeakHours(activity) {
    const hourStats = new Array(24).fill(0);

    activity.forEach(entry => {
      if (entry.timestamp) {
        const hour = new Date(entry.timestamp).getHours();
        hourStats[hour]++;
      }
    });

    return hourStats.map((count, hour) => ({ hour, count }));
  }

  /**
   * Расчёт средней длительности сессии
   */
  static calculateAverageSession(activity) {
    const sessions = this.analyzeUserSessions(activity);
    if (sessions.length === 0) return 0;

    const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);
    return totalDuration / sessions.length;
  }

  /**
   * Расчёт retention rate
   */
  static calculateRetention(activity) {
    if (activity.length === 0) return { '1d': 0, '7d': 0, '30d': 0 };

    const userFirstVisits = new Map();
    const userLastVisits = new Map();

    activity.forEach(entry => {
      const userId = entry.user_id;
      const timestamp = new Date(entry.timestamp).getTime();

      if (!userFirstVisits.has(userId) || timestamp < userFirstVisits.get(userId)) {
        userFirstVisits.set(userId, timestamp);
      }
      if (!userLastVisits.has(userId) || timestamp > userLastVisits.get(userId)) {
        userLastVisits.set(userId, timestamp);
      }
    });

    const now = Date.now();
    let retention1d = 0, retention7d = 0, retention30d = 0;
    const totalUsers = userFirstVisits.size;

    userLastVisits.forEach((lastVisit, userId) => {
      const firstVisit = userFirstVisits.get(userId);
      const daysSinceFirst = (lastVisit - firstVisit) / (1000 * 60 * 60 * 24);

      if (daysSinceFirst >= 1) retention1d++;
      if (daysSinceFirst >= 7) retention7d++;
      if (daysSinceFirst >= 30) retention30d++;
    });

    return {
      '1d': totalUsers > 0 ? (retention1d / totalUsers) * 100 : 0,
      '7d': totalUsers > 0 ? (retention7d / totalUsers) * 100 : 0,
      '30d': totalUsers > 0 ? (retention30d / totalUsers) * 100 : 0
    };
  }

  /**
   * Поиск популярных путей пользователей
   */
  static findPopularPaths(activity) {
    if (!Array.isArray(activity)) return new Map();

    const paths = new Map();

    activity
      .filter(entry => entry && entry.type === 'page_visit')
      .forEach(entry => {
        const path = entry.route_path || entry.route_name || 'unknown';
        paths.set(path, (paths.get(path) || 0) + 1);
      });

    return Array.from(paths.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));
  }

  /**
   * Анализ устройств
   */
  static analyzeDevices(activity) {
    const devices = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };

    activity.forEach(entry => {
      const device = this.detectDevice(entry.user_agent);
      devices[device]++;
    });

    return devices;
  }

  /**
   * Анализ браузеров
   */
  static analyzeBrowsers(activity) {
    const browsers = new Map();

    activity.forEach(entry => {
      const browser = this.detectBrowser(entry.user_agent);
      browsers.set(browser, (browsers.get(browser) || 0) + 1);
    });

    return Object.fromEntries(browsers);
  }

  /**
   * Определение устройства по User Agent
   */
  static detectDevice(userAgent) {
    if (!userAgent) return 'unknown';

    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }
    return 'desktop';
  }

  /**
   * Определение браузера по User Agent
   */
  static detectBrowser(userAgent) {
    if (!userAgent) return 'Неизвестно';

    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('edg')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';
    return 'Другое';
  }

  /**
   * Расчёт ID сессии для группировки
   */
  static calculateSessionId(entry) {
    // Простая логика: группировка по пользователю и дню
    const userId = entry.user_id || 'unknown';
    const date = entry.timestamp ? new Date(entry.timestamp).toISOString().split('T')[0] : 'unknown';
    return `${userId}_${date}`;
  }

  /**
   * Получение метаданных для группы
   */
  static getGroupMetadata(key, groupBy) {
    switch (groupBy) {
      case 'hour':
        return { label: `${key}:00`, type: 'hour' };
      case 'day':
        return { label: this.formatDate(key), type: 'day' };
      case 'week':
        return { label: `Неделя ${key}`, type: 'week' };
      case 'month':
        return { label: this.formatMonth(key), type: 'month' };
      case 'user':
        return { label: `Пользователь ${key}`, type: 'user' };
      case 'page':
        return { label: key, type: 'page' };
      case 'session':
        return { label: `Сессия ${key}`, type: 'session' };
      default:
        return { label: key, type: 'unknown' };
    }
  }

  /**
   * Сортировка групп
   */
  static sortGroups(groups, groupBy) {
    return groups.sort((a, b) => {
      // Для временных группировок сортировка по ключу (новые первыми)
      if (['day', 'week', 'month'].includes(groupBy)) {
        return new Date(b.key) - new Date(a.key);
      }
      // Для других - по количеству (большие первыми)
      return b.count - a.count;
    });
  }

  /**
   * Расчёт базовых метрик
   */
  static calculateMetrics(activity) {
    if (!Array.isArray(activity)) {
      return this.getEmptyMetrics();
    }

    const metrics = {
      total_entries: activity.length,
      unique_users: new Set(activity.map(e => e.user_id).filter(id => id)).size,
      total_app_entries: activity.filter(e => e.type === 'app_entry').length,
      total_page_visits: activity.filter(e => e.type === 'page_visit').length,
      total_sessions: this.analyzeUserSessions(activity).length
    };

    return metrics;
  }

  /**
   * Поиск любимых страниц пользователя
   */
  static findFavoritePages(userActivity) {
    if (!Array.isArray(userActivity)) return [];

    const pageStats = new Map();

    userActivity
      .filter(entry => entry && entry.type === 'page_visit')
      .forEach(entry => {
        const page = entry.route_path || entry.route_title || entry.route_name || 'unknown';
        pageStats.set(page, (pageStats.get(page) || 0) + 1);
      });

    return Array.from(pageStats.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([page, count]) => ({ page, count }));
  }

  /**
   * Расчёт пикового часа активности пользователя
   */
  static calculateUserPeakHour(userActivity) {
    const hourStats = new Array(24).fill(0);

    userActivity.forEach(entry => {
      if (entry.timestamp) {
        const hour = new Date(entry.timestamp).getHours();
        hourStats[hour]++;
      }
    });

    const maxCount = Math.max(...hourStats);
    return maxCount > 0 ? hourStats.indexOf(maxCount) : 0;
  }

  /**
   * Расчёт предпочтения устройства пользователя
   */
  static calculateDevicePreference(userActivity) {
    const deviceStats = { desktop: 0, mobile: 0, tablet: 0 };

    userActivity.forEach(entry => {
      const device = this.detectDevice(entry.user_agent);
      if (deviceStats.hasOwnProperty(device)) {
        deviceStats[device]++;
      }
    });

    const maxDevice = Object.keys(deviceStats).reduce((a, b) =>
      deviceStats[a] > deviceStats[b] ? a : b
    );

    return deviceStats[maxDevice] > 0 ? maxDevice : 'unknown';
  }

  /**
   * Расчёт retention для пользователя
   */
  static calculateUserRetention(userActivity) {
    if (userActivity.length === 0) return 0;

    const timestamps = userActivity
      .map(entry => new Date(entry.timestamp).getTime())
      .sort((a, b) => a - b);

    const firstVisit = timestamps[0];
    const lastVisit = timestamps[timestamps.length - 1];
    const daysDiff = (lastVisit - firstVisit) / (1000 * 60 * 60 * 24);

    return Math.max(0, Math.floor(daysDiff));
  }

  // ============ Форматирование ============

  /**
   * Форматирование даты
   */
  static formatDate(dateString) {
    try {
      return new Date(dateString).toLocaleDateString('ru-RU');
    } catch {
      return dateString;
    }
  }

  /**
   * Форматирование месяца
   */
  static formatMonth(monthString) {
    try {
      const [year, month] = monthString.split('-');
      const date = new Date(year, month - 1, 1);
      return date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' });
    } catch {
      return monthString;
    }
  }

  // ============ Пустые структуры ============

  static getEmptyPatterns() {
    return {
      peakHours: new Array(24).fill(0).map((_, hour) => ({ hour, count: 0 })),
      sessionDuration: 0,
      userRetention: { '1d': 0, '7d': 0, '30d': 0 },
      popularPaths: [],
      deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0, unknown: 0 },
      browserStats: {}
    };
  }

  static getEmptyMetrics() {
    return {
      total_entries: 0,
      unique_users: 0,
      total_app_entries: 0,
      total_page_visits: 0,
      total_sessions: 0
    };
  }

  static getEmptyUserStats() {
    return {
      total_actions: 0,
      total_sessions: 0,
      avg_session_duration: 0,
      total_duration: 0,
      favorite_page: null,
      peak_hour: 0,
      device_preference: 'unknown',
      activity_by_day: [],
      retention_days: 0
    };
  }
}