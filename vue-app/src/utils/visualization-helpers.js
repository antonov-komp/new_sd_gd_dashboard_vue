/**
 * Утилиты для визуализации данных активности пользователей
 *
 * Предоставляет методы для:
 * - Подготовки данных для различных типов графиков
 * - Форматирования данных для отображения
 * - Генерации цветовых схем
 * - Определения устройств и браузеров
 *
 * Используется компонентами визуализации для подготовки данных Chart.js
 */

export class VisualizationHelpers {

  /**
   * Подготовка данных для линейного графика по времени
   *
   * @param {Array} activity - Массив записей активности
   * @param {string} groupBy - Группировка ('hour', 'day', 'week', 'month')
   * @param {Object} options - Дополнительные опции
   * @returns {Object} Данные для Chart.js
   */
  static prepareTimeChartData(activity, groupBy = 'day', options = {}) {
    if (!Array.isArray(activity)) {
      return this.getEmptyTimeChartData();
    }

    const { ActivityAnalyticsService } = options;

    // Используем ActivityAnalyticsService для группировки
    const grouped = ActivityAnalyticsService ?
      ActivityAnalyticsService.groupActivity(activity, groupBy) :
      this.fallbackGroupByTime(activity, groupBy);

    return {
      labels: grouped.map(group => this.formatGroupLabel(group.key, groupBy)),
      datasets: [{
        label: 'Активность',
        data: grouped.map(group => group.count),
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#2196F3',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };
  }

  /**
   * Подготовка данных для круговой/столбчатой диаграммы распределения
   *
   * @param {Array} activity - Массив записей активности
   * @param {string} type - Тип распределения ('activity_types', 'devices', 'browsers', 'departments', 'pages')
   * @param {string} chartType - Тип графика ('doughnut', 'bar', 'pie')
   * @returns {Object} Данные для Chart.js
   */
  static prepareDistributionChartData(activity, type, chartType = 'doughnut') {
    try {
      if (!Array.isArray(activity)) {
        console.warn('[VisualizationHelpers] prepareDistributionChartData: activity is not an array');
        return this.getEmptyDistributionData();
      }

      if (activity.length === 0) {
        return this.getEmptyDistributionData();
      }

      // Проверяем, что все элементы массива - объекты
      if (!activity.every(item => typeof item === 'object' && item !== null)) {
        console.warn('[VisualizationHelpers] prepareDistributionChartData: some items are not objects');
        return this.getEmptyDistributionData();
      }

    const distribution = this.calculateDistribution(activity, type);
    const colors = this.generateColors(Object.keys(distribution).length);

    const data = {
      labels: Object.keys(distribution),
      datasets: [{
        data: Object.values(distribution),
        backgroundColor: colors,
        borderColor: colors.map(color => this.adjustColorBrightness(color, -20)),
        borderWidth: chartType === 'doughnut' ? 2 : 1,
        hoverBorderWidth: chartType === 'doughnut' ? 3 : 2
      }]
    };

    // Для столбчатых диаграмм добавляем дополнительные настройки
    if (chartType === 'bar') {
      data.datasets[0].borderRadius = 4;
      data.datasets[0].borderSkipped = false;
    }

    return data;
    } catch (error) {
      console.error('[VisualizationHelpers] prepareDistributionChartData error:', error);
      return this.getEmptyDistributionData();
    }
  }

  /**
   * Подготовка данных для рейтинга пользователей
   *
   * @param {Array} activity - Массив записей активности
   * @param {number} limit - Максимальное количество пользователей
   * @returns {Array} Отсортированный массив пользователей с статистикой
   */
  static prepareUserRankingData(activity, limit = 10) {
    if (!Array.isArray(activity)) {
      return [];
    }

    const userStats = new Map();

    activity.forEach(entry => {
      // Проверяем, что entry существует
      if (!entry || typeof entry !== 'object') return;

      const userId = entry.user_id;
      if (!userId) return;

      if (!userStats.has(userId)) {
        userStats.set(userId, {
          id: userId,
          name: entry.user_name || `User #${userId}`,
          count: 0,
          app_entries: 0,
          page_visits: 0,
          last_activity: entry.timestamp
        });
      }

      const stats = userStats.get(userId);
      stats.count++;

      if (entry.type === 'app_entry') {
        stats.app_entries++;
      } else if (entry.type === 'page_visit') {
        stats.page_visits++;
      }

      // Обновляем время последней активности
      if (entry.timestamp && (!stats.last_activity || entry.timestamp > stats.last_activity)) {
        stats.last_activity = entry.timestamp;
      }
    });

    return Array.from(userStats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((user, index) => ({
        ...user,
        rank: index + 1,
        lastActivityFormatted: this.formatTimestamp(user.last_activity)
      }));
  }

  /**
   * Подготовка данных для временной линии сессий
   *
   * @param {Array} sessions - Массив сессий пользователя
   * @returns {Array} Данные для временной линии
   */
  static prepareSessionTimelineData(sessions) {
    if (!Array.isArray(sessions)) {
      return [];
    }

    return sessions.map(session => ({
      id: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      pageCount: session.pageCount,
      entriesCount: session.entriesCount,
      actions: session.actions,
      device: session.device,
      formattedStartTime: this.formatTimestamp(new Date(session.startTime)),
      formattedDuration: this.formatDuration(session.duration),
      color: this.getSessionColor(session)
    }));
  }

  /**
   * Форматирование данных активности для отображения
   *
   * @param {Array} activity - Массив записей активности
   * @returns {Array} Отформатированные данные
   */
  static formatActivityData(activity) {
    if (!Array.isArray(activity)) {
      return [];
    }

    return activity.map(entry => ({
      ...entry,
      formattedTimestamp: this.formatTimestamp(entry.timestamp),
      formattedDuration: entry.duration ? this.formatDuration(entry.duration) : null,
      userDisplayName: entry.user_name || `User #${entry.user_id}`,
      pageDisplayName: this.formatPageName(entry),
      deviceInfo: this.parseUserAgent(entry.user_agent),
      actionIcon: this.getActionIcon(entry.type),
      actionColor: this.getActionColor(entry.type)
    }));
  }

  /**
   * Подготовка данных для сравнения периодов
   *
   * @param {Array} currentActivity - Активность текущего периода
   * @param {Array} previousActivity - Активность предыдущего периода
   * @param {string} groupBy - Группировка
   * @returns {Object} Данные для сравнительного графика
   */
  static prepareComparisonChartData(currentActivity, previousActivity, groupBy = 'day') {
    const currentData = this.prepareTimeChartData(currentActivity, groupBy);
    const previousData = this.prepareTimeChartData(previousActivity, groupBy);

    // Объединяем метки из обоих периодов
    const allLabels = new Set([...currentData.labels, ...previousData.labels]);
    const labels = Array.from(allLabels).sort();

    // Создаем карту данных для быстрого доступа
    const currentMap = new Map(currentData.labels.map((label, index) => [label, currentData.datasets[0].data[index]]));
    const previousMap = new Map(previousData.labels.map((label, index) => [label, previousData.datasets[0].data[index]]));

    return {
      labels,
      datasets: [
        {
          label: 'Текущий период',
          data: labels.map(label => currentMap.get(label) || 0),
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Предыдущий период',
          data: labels.map(label => previousMap.get(label) || 0),
          borderColor: '#FF9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  }

  // ============ Вспомогательные методы ============

  /**
   * Расчёт распределения данных
   */
  static calculateDistribution(activity, type) {
    if (!Array.isArray(activity)) {
      console.warn('[VisualizationHelpers] calculateDistribution: activity is not an array', activity);
      return {};
    }

    const distribution = {};

    activity.forEach(entry => {
      // Проверяем, что entry существует и является объектом
      if (!entry || typeof entry !== 'object') {
        console.warn('[VisualizationHelpers] calculateDistribution: invalid entry', entry);
        return;
      }

      let key;
      switch (type) {
        case 'activity_types':
          key = entry.type || 'unknown';
          break;
        case 'devices':
          key = this.detectDevice(entry.user_agent);
          break;
        case 'browsers':
          key = this.detectBrowser(entry.user_agent);
          break;
        case 'departments':
          key = entry.user_department || 'Не указан';
          break;
        case 'pages':
          key = entry.route_path || entry.route_title || entry.route_name || 'unknown';
          break;
        default:
          key = 'Другое';
      }

      distribution[key] = (distribution[key] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Fallback метод группировки по времени (если нет ActivityAnalyticsService)
   */
  static fallbackGroupByTime(activity, groupBy) {
    if (!Array.isArray(activity)) {
      return [];
    }

    const groups = new Map();

    activity.forEach(entry => {
      // Проверяем, что entry существует и имеет timestamp
      if (!entry || !entry.timestamp) return;

      let key;
      const date = new Date(entry.timestamp);

      switch (groupBy) {
        case 'hour':
          key = date.getHours();
          break;
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = date.toISOString().substring(0, 7);
          break;
        default:
          key = 'all';
      }

      if (!groups.has(key)) {
        groups.set(key, { key, entries: [], count: 0 });
      }

      groups.get(key).entries.push(entry);
      groups.get(key).count++;
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (['day', 'week', 'month'].includes(groupBy)) {
        return new Date(b.key) - new Date(a.key);
      }
      return b.count - a.count;
    });
  }

  /**
   * Форматирование метки группы
   */
  static formatGroupLabel(key, groupBy) {
    switch (groupBy) {
      case 'hour':
        return `${key}:00`;
      case 'day':
        return this.formatDate(key);
      case 'week':
        return `Неделя ${key}`;
      case 'month':
        return this.formatMonth(key);
      default:
        return key;
    }
  }

  /**
   * Определение устройства по User Agent
   */
  static detectDevice(userAgent) {
    if (!userAgent) return 'Неизвестно';

    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'Mobile';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'Tablet';
    }
    return 'Desktop';
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
   * Парсинг User Agent строки
   */
  static parseUserAgent(userAgent) {
    if (!userAgent) {
      return { device: 'Неизвестно', browser: 'Неизвестно', os: 'Неизвестно' };
    }

    return {
      device: this.detectDevice(userAgent),
      browser: this.detectBrowser(userAgent),
      os: this.detectOS(userAgent)
    };
  }

  /**
   * Определение ОС по User Agent
   */
  static detectOS(userAgent) {
    if (!userAgent) return 'Неизвестно';

    const ua = userAgent.toLowerCase();
    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('macintosh') || ua.includes('mac os x')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
    return 'Другое';
  }

  /**
   * Генерация цветов для диаграмм
   */
  static generateColors(count) {
    const baseColors = [
      '#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0',
      '#00BCD4', '#8BC34A', '#FFC107', '#795548', '#607D8B'
    ];

    if (count <= baseColors.length) {
      return baseColors.slice(0, count);
    }

    // Генерация дополнительных цветов
    const additional = [];
    for (let i = baseColors.length; i < count; i++) {
      additional.push(this.generateRandomColor());
    }

    return [...baseColors, ...additional];
  }

  /**
   * Генерация случайного цвета
   */
  static generateRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 50%)`;
  }

  /**
   * Корректировка яркости цвета
   */
  static adjustColorBrightness(color, amount) {
    // Простая корректировка для hex цветов
    if (color.startsWith('#')) {
      const usePound = color[0] === '#';
      const col = usePound ? color.slice(1) : color;

      const num = parseInt(col, 16);
      let r = (num >> 16) + amount;
      let g = (num >> 8 & 0x00FF) + amount;
      let b = (num & 0x0000FF) + amount;

      r = r > 255 ? 255 : r < 0 ? 0 : r;
      g = g > 255 ? 255 : g < 0 ? 0 : g;
      b = b > 255 ? 255 : b < 0 ? 0 : b;

      return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16);
    }

    return color;
  }

  // ============ Форматирование ============

  /**
   * Форматирование даты
   */
  static formatDate(dateString) {
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
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

  /**
   * Форматирование времени
   */
  static formatTimestamp(timestamp) {
    if (!timestamp) return 'Неизвестно';

    try {
      const date = new Date(timestamp);
      return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  }

  /**
   * Форматирование длительности
   */
  static formatDuration(durationMs) {
    if (!durationMs || durationMs < 0) return '0с';

    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}ч ${minutes % 60}м`;
    } else if (minutes > 0) {
      return `${minutes}м ${seconds % 60}с`;
    } else {
      return `${seconds}с`;
    }
  }

  /**
   * Форматирование названия страницы
   */
  static formatPageName(entry) {
    if (!entry) return 'Неизвестная страница';

    return entry.route_title ||
           entry.route_path ||
           entry.route_name ||
           'Неизвестная страница';
  }

  /**
   * Получение иконки для типа действия
   */
  static getActionIcon(type) {
    switch (type) {
      case 'app_entry': return '🚪';
      case 'page_visit': return '📄';
      default: return '❓';
    }
  }

  /**
   * Получение цвета для типа действия
   */
  static getActionColor(type) {
    switch (type) {
      case 'app_entry': return '#4CAF50';
      case 'page_visit': return '#2196F3';
      default: return '#9E9E9E';
    }
  }

  /**
   * Получение цвета для сессии
   */
  static getSessionColor(session) {
    const duration = session.duration || 0;
    if (duration < 5 * 60 * 1000) return '#4CAF50'; // < 5 мин - зеленый
    if (duration < 15 * 60 * 1000) return '#FF9800'; // 5-15 мин - оранжевый
    return '#F44336'; // > 15 мин - красный
  }

  // ============ Пустые структуры ============

  static getEmptyTimeChartData() {
    return {
      labels: [],
      datasets: [{
        label: 'Активность',
        data: [],
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };
  }

  static getEmptyDistributionData() {
    return {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 2
      }]
    };
  }
}