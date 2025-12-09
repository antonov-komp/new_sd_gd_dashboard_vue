/**
 * Форматтеры для отображения данных вебхуков
 * 
 * Расположение: vue-app/src/utils/webhook-formatters.js
 */

/**
 * Форматирование даты для отображения
 * 
 * @param {string} timestamp ISO 8601 timestamp
 * @param {string} format Формат (short, long, relative)
 * @returns {string} Отформатированная дата
 */
export function formatTimestamp(timestamp, format = 'short') {
  if (!timestamp) {
    return '—';
  }
  
  try {
    const date = new Date(timestamp);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    switch (format) {
      case 'short':
        return date.toLocaleString('ru-RU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      
      case 'long':
        return date.toLocaleString('ru-RU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      
      case 'relative':
        return formatRelativeTime(date);
      
      default:
        return date.toLocaleString('ru-RU');
    }
  } catch (e) {
    return 'Invalid date';
  }
}

/**
 * Форматирование относительного времени
 * 
 * @param {Date} date Дата
 * @returns {string} Относительное время
 */
function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) {
    return 'только что';
  }
  
  if (minutes < 60) {
    return `${minutes} ${pluralize(minutes, 'минуту', 'минуты', 'минут')} назад`;
  }
  
  if (hours < 24) {
    return `${hours} ${pluralize(hours, 'час', 'часа', 'часов')} назад`;
  }
  
  if (days < 7) {
    return `${days} ${pluralize(days, 'день', 'дня', 'дней')} назад`;
  }
  
  return formatTimestamp(date.toISOString(), 'short');
}

/**
 * Плюрализация
 */
function pluralize(count, one, few, many) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  
  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return few;
  }
  
  return many;
}

/**
 * Форматирование типа события для отображения
 * 
 * @param {string} eventType Тип события
 * @returns {string} Отформатированный тип
 */
export function formatEventType(eventType) {
  if (!eventType) {
    return '—';
  }
  
  // Удаление префикса ON
  const withoutPrefix = eventType.replace(/^ON/, '');
  
  // Разделение по заглавным буквам
  const words = withoutPrefix.split(/(?=[A-Z])/);
  
  // Преобразование в читаемый формат
  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Форматирование категории для отображения
 * 
 * @param {string} category Категория
 * @returns {string} Отформатированная категория
 */
export function formatCategory(category) {
  const categoryMap = {
    'tasks': 'Задачи',
    'smart-processes': 'Смарт-процессы',
    'errors': 'Ошибки'
  };
  
  return categoryMap[category] || category;
}

/**
 * Форматирование деталей события для отображения
 * 
 * @param {Object} details Детали события
 * @returns {string} Отформатированные детали
 */
export function formatEventDetails(details) {
  if (!details || typeof details !== 'object') {
    return '—';
  }
  
  const parts = [];
  
  // ID задачи или сущности
  if (details.task_id) {
    parts.push(`Задача #${details.task_id}`);
  }
  
  if (details.entity_id) {
    parts.push(`Сущность #${details.entity_id}`);
  }
  
  // Название
  if (details.task_title) {
    parts.push(`"${details.task_title}"`);
  }
  
  if (details.title) {
    parts.push(`"${details.title}"`);
  }
  
  // Комментарий
  if (details.comment_text) {
    const commentPreview = details.comment_text.length > 50
      ? details.comment_text.substring(0, 50) + '...'
      : details.comment_text;
    parts.push(`Комментарий: ${commentPreview}`);
  }
  
  return parts.length > 0 ? parts.join(' • ') : '—';
}

export default {
  formatTimestamp,
  formatEventType,
  formatCategory,
  formatEventDetails
};





