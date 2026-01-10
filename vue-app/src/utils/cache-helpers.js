/**
 * Утилиты для работы с кешем модулей
 *
 * Предоставляет функции форматирования, валидации и работы с кешем
 */

/**
 * Форматирование размера кеша в человеко-читаемый вид
 * @param {number} bytes - Размер в байтах
 * @returns {string} Отформатированный размер
 */
export function formatCacheSize(bytes) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Форматирование TTL в человеко-читаемый вид
 * @param {number} seconds - TTL в секундах
 * @returns {string} Отформатированный TTL
 */
export function formatTTL(seconds) {
  if (seconds < 60) return `${seconds} сек`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч`;
  return `${Math.floor(seconds / 86400)} д`;
}

/**
 * Определение класса важности модуля
 * @param {Object} module - Модуль кеша
 * @returns {string} CSS класс важности
 */
export function getImportanceClass(module) {
  if (module.priority <= 2) return 'critical';
  if (module.priority <= 4) return 'high';
  if (module.priority <= 7) return 'medium';
  return 'low';
}

/**
 * Проверка истечения кеша в ближайшее время
 * @param {number} expiresAt - Время истечения (timestamp)
 * @param {number} thresholdHours - Порог в часах
 * @returns {boolean} Истекает ли скоро
 */
export function isExpiringSoon(expiresAt, thresholdHours = 24) {
  if (!expiresAt) return false;
  const expires = new Date(expiresAt * 1000);
  const now = new Date();
  const hoursLeft = (expires - now) / (1000 * 60 * 60);
  return hoursLeft > 0 && hoursLeft <= thresholdHours;
}

/**
 * Получение цвета статуса кеша
 * @param {string} status - Статус кеша
 * @returns {string} Цвет в формате hex
 */
export function getStatusColor(status) {
  const colors = {
    active: '#28a745',
    expired: '#dc3545',
    empty: '#6c757d',
    expiring: '#ffc107'
  };
  return colors[status] || colors.empty;
}

/**
 * Группировка модулей по категориям
 * @param {Array} modules - Массив модулей
 * @returns {Object} Сгруппированные модули
 */
export function groupModulesByCategory(modules) {
  return modules.reduce((groups, module) => {
    const category = module.category || 'other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(module);
    return groups;
  }, {});
}

/**
 * Валидация структуры модуля
 * @param {Object} module - Модуль для валидации
 * @throws {Error} Если структура некорректна
 */
export function validateModule(module) {
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
 * Получение иконки для типа группы модулей
 * @param {string} groupType - Тип группы
 * @returns {string} Иконка (emoji)
 */
export function getGroupIcon(groupType) {
  const icons = {
    users: '👥',
    activity: '📊',
    webhooks: '🔗',
    timeTracking: '⏱️',
    graphs: '📈',
    dashboards: '📊',
    other: '🔧'
  };
  return icons[groupType] || icons.other;
}

/**
 * Получение описания типа группы модулей
 * @param {string} groupType - Тип группы
 * @returns {string} Описание группы
 */
export function getGroupDescription(groupType) {
  const descriptions = {
    users: 'Модули для управления пользователями и отделами',
    activity: 'Мониторинг активности пользователей системы',
    webhooks: 'Логирование и мониторинг входящих вебхуков',
    timeTracking: 'Отслеживание времени работы с задачами',
    graphs: 'Графические представления данных',
    dashboards: 'Сводные панели с ключевыми метриками',
    other: 'Дополнительные модули системы'
  };
  return descriptions[groupType] || descriptions.other;
}

/**
 * Сортировка групп побочных модулей
 * @param {Object} groups - Объект с группами модулей
 * @returns {Array} Отсортированный массив групп
 */
export function sortModuleGroups(groups) {
  const groupOrder = ['users', 'activity', 'webhooks', 'timeTracking', 'graphs', 'dashboards', 'other'];

  return Object.entries(groups)
    .sort(([typeA], [typeB]) => {
      const indexA = groupOrder.indexOf(typeA);
      const indexB = groupOrder.indexOf(typeB);

      const finalIndexA = indexA === -1 ? 999 : indexA;
      const finalIndexB = indexB === -1 ? 999 : indexB;

      return finalIndexA - finalIndexB;
    })
    .map(([type, modules]) => ({
      type,
      modules: modules.sort((a, b) => a.name.localeCompare(b.name))
    }));
}

/**
 * Получение информации о частоте использования модуля
 * @param {number} priority - Приоритет модуля (1-7 для основных)
 * @returns {Object} Информация о частоте
 */
export function getUsageFrequency(priority) {
  const frequencies = {
    1: { text: 'Очень часто', description: 'Используется ежедневно для оперативного анализа' },
    2: { text: 'Часто', description: 'Используется несколько раз в день' },
    3: { text: 'Регулярно', description: 'Используется ежедневно для планирования' },
    4: { text: 'Периодически', description: 'Используется несколько раз в неделю' },
    5: { text: 'По необходимости', description: 'Используется при необходимости анализа' },
    6: { text: 'Редко', description: 'Используется для детального анализа' },
    7: { text: 'Очень редко', description: 'Используется для специальных отчетов' }
  };

  return frequencies[priority] || { text: 'Не определено', description: 'Частота использования неизвестна' };
}

/**
 * Проверка, является ли модуль основным
 * @param {string} moduleId - ID модуля
 * @returns {boolean} Является ли основным
 */
export function isPrimaryModule(moduleId) {
  const primaryIds = [
    'dashboard-sector-1c',
    'graph-state',
    'graph-admission-closure-weeks',
    'graph-admission-closure-months',
    'time-tracking-default',
    'time-tracking-detailed',
    'time-tracking-summary'
  ];

  return primaryIds.includes(moduleId);
}

/**
 * Получение приоритета основного модуля
 * @param {string} moduleId - ID модуля
 * @returns {number} Приоритет (1-7) или 999 для неосновных
 */
export function getModulePriority(moduleId) {
  const priorities = {
    'dashboard-sector-1c': 1,
    'graph-state': 2,
    'graph-admission-closure-weeks': 3,
    'graph-admission-closure-months': 4,
    'time-tracking-default': 5,
    'time-tracking-detailed': 6,
    'time-tracking-summary': 7
  };

  return priorities[moduleId] || 999;
}

/**
 * Получение класса приоритета для стилизации
 * @param {number} priority - Приоритет модуля
 * @returns {string} CSS класс
 */
export function getPriorityClass(priority) {
  if (priority <= 2) return 'priority-critical';
  if (priority <= 4) return 'priority-high';
  if (priority <= 7) return 'priority-medium';
  return 'priority-low';
}

/**
 * Форматирование даты создания кеша
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Отформатированная дата
 */
export function formatCacheCreatedAt(timestamp) {
  if (!timestamp) return '—';

  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now - date;

  // Если меньше минуты назад
  if (diff < 60000) {
    return 'Только что';
  }

  // Если меньше часа назад
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} ${minutes === 1 ? 'минуту' : minutes < 5 ? 'минуты' : 'минут'} назад`;
  }

  // Если сегодня
  if (date.toDateString() === now.toDateString()) {
    return `Сегодня в ${date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  }

  // Если вчера
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Вчера в ${date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  }

  // Иначе полная дата
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Форматирование даты истечения кеша
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Отформатированная дата с информацией об истечении
 */
export function formatCacheExpiresAt(timestamp) {
  if (!timestamp) return '—';

  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = date - now;

  if (diff < 0) {
    return `Просрочен (${date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })})`;
  }

  // Показываем относительное время до истечения
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours} ч ${minutes % 60} мин`;
  } else if (minutes > 0) {
    return `${minutes} мин`;
  } else {
    return 'Менее минуты';
  }
}