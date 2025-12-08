/**
 * Вспомогательные функции для компонентов вебхуков
 * 
 * Расположение: vue-app/src/utils/webhook-component-helpers.js
 */

import { isValidWebhookLogEntry } from '@/types/webhook-logs.js';
import { formatTimestamp, formatEventType } from '@/utils/webhook-formatters.js';

/**
 * Получить уникальный ID лога
 * 
 * @param {Object} log Запись лога
 * @returns {string} Уникальный ID
 */
export function getLogId(log) {
  if (!isValidWebhookLogEntry(log)) {
    return null;
  }
  
  return `${log.timestamp}_${log.event}_${log.category}`;
}

/**
 * Проверить, является ли лог новым (за последние N минут)
 * 
 * @param {Object} log Запись лога
 * @param {number} minutes Количество минут
 * @returns {boolean} true если лог новый
 */
export function isNewLog(log, minutes = 5) {
  if (!isValidWebhookLogEntry(log) || !log.timestamp) {
    return false;
  }
  
  const logDate = new Date(log.timestamp);
  const now = new Date();
  const diffMinutes = (now - logDate) / (1000 * 60);
  
  return diffMinutes <= minutes;
}

/**
 * Получить цвет категории для отображения
 * 
 * @param {string} category Категория
 * @returns {string} CSS класс цвета
 */
export function getCategoryColorClass(category) {
  const colorMap = {
    'tasks': 'category-tasks',
    'smart-processes': 'category-smart-processes',
    'errors': 'category-errors'
  };
  
  return colorMap[category] || 'category-default';
}

/**
 * Получить иконку для типа события
 * 
 * @param {string} eventType Тип события
 * @returns {string} Имя иконки или emoji
 */
export function getEventIcon(eventType) {
  if (!eventType) return '📋';
  
  const iconMap = {
    'ONTASKADD': '➕',
    'ONTASKUPDATE': '✏️',
    'ONTASKDELETE': '🗑️',
    'ONTASKCOMMENTADD': '💬',
    'ONTASKCOMMENTUPDATE': '💬',
    'ONTASKCOMMENTDELETE': '🗑️',
    'ONCRMDYNAMICITEMADD': '➕',
    'ONCRMDYNAMICITEMUPDATE': '✏️',
    'ONCRMDYNAMICITEMDELETE': '🗑️'
  };
  
  return iconMap[eventType] || '📋';
}

/**
 * Получить краткое описание события
 * 
 * @param {Object} log Запись лога
 * @returns {string} Краткое описание
 */
export function getLogSummary(log) {
  if (!isValidWebhookLogEntry(log)) {
    return 'Неизвестный лог';
  }
  
  const eventType = formatEventType(log.event);
  const timestamp = formatTimestamp(log.timestamp, 'short');
  
  if (log.details) {
    if (log.details.task_title) {
      return `${eventType}: ${log.details.task_title} (${timestamp})`;
    }
    if (log.details.title) {
      return `${eventType}: ${log.details.title} (${timestamp})`;
    }
  }
  
  return `${eventType} (${timestamp})`;
}

/**
 * Группировка логов по дате
 * 
 * @param {Array} logs Массив логов
 * @returns {Object} Группированные логи { 'YYYY-MM-DD': [...] }
 */
export function groupLogsByDate(logs) {
  if (!Array.isArray(logs)) {
    return {};
  }
  
  const grouped = {};
  
  logs.forEach(log => {
    if (!isValidWebhookLogEntry(log) || !log.timestamp) {
      return;
    }
    
    const date = new Date(log.timestamp);
    const dateKey = date.toISOString().split('T')[0];
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    
    grouped[dateKey].push(log);
  });
  
  return grouped;
}

/**
 * Фильтрация логов по поисковому запросу
 * 
 * @param {Array} logs Массив логов
 * @param {string} query Поисковый запрос
 * @returns {Array} Отфильтрованные логи
 */
export function filterLogsByQuery(logs, query) {
  if (!Array.isArray(logs) || !query || query.trim() === '') {
    return logs;
  }
  
  const lowerQuery = query.toLowerCase().trim();
  
  return logs.filter(log => {
    if (!isValidWebhookLogEntry(log)) {
      return false;
    }
    
    // Поиск по типу события
    if (log.event && log.event.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    
    // Поиск по категории
    if (log.category && log.category.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    
    // Поиск по IP
    if (log.ip && log.ip.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    
    // Поиск по деталям
    if (log.details) {
      if (log.details.task_title && log.details.task_title.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      if (log.details.title && log.details.title.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      if (log.details.comment_text && log.details.comment_text.toLowerCase().includes(lowerQuery)) {
        return true;
      }
    }
    
    return false;
  });
}

export default {
  getLogId,
  isNewLog,
  getCategoryColorClass,
  getEventIcon,
  getLogSummary,
  groupLogsByDate,
  filterLogsByQuery
};


