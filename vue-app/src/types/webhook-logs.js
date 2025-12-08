/**
 * Типизированные интерфейсы для данных вебхуков
 * 
 * Расположение: vue-app/src/types/webhook-logs.js
 * 
 * Соответствует структуре сущностей бэкенда:
 * - WebhookEvent (src/WebhookLogs/Entity/WebhookEvent.php)
 * - WebhookLogEntry (src/WebhookLogs/Entity/WebhookLogEntry.php)
 * - EventDetails (из EventDetailsExtractor)
 */

/**
 * @typedef {Object} WebhookEventData
 * @property {string} event - Тип события (например, 'ONTASKADD')
 * @property {Object} data - Данные события
 * @property {string} [timestamp] - Временная метка (ISO 8601)
 * @property {string} [client_ip] - IP адрес клиента
 * @property {Object} [payload] - Полный payload вебхука
 * @property {string} [signature] - Подпись вебхука (HMAC)
 */

/**
 * @typedef {Object} EventDetails
 * @property {number|null} [task_id] - ID задачи (для событий задач)
 * @property {string|null} [task_title] - Название задачи
 * @property {number|null} [created_by] - ID создателя
 * @property {number|null} [responsible_id] - ID ответственного
 * @property {number|null} [status_id] - ID статуса
 * @property {string|null} [priority] - Приоритет
 * @property {string|null} [deadline] - Дедлайн
 * @property {number|null} [comment_id] - ID комментария (для событий комментариев)
 * @property {string|null} [comment_text] - Текст комментария
 * @property {number|null} [entity_id] - ID сущности (для смарт-процессов)
 * @property {string|null} [title] - Название сущности
 * @property {number|null} [entity_type_id] - ID типа сущности
 * @property {string[]} [changed_fields] - Изменённые поля (для UPDATE событий)
 * @property {Object} [field_changes] - Детали изменений полей
 * @property {boolean} [deleted] - Флаг удаления (для DELETE событий)
 */

/**
 * @typedef {Object} WebhookLogEntry
 * @property {string} timestamp - Временная метка (ISO 8601)
 * @property {string} event - Тип события
 * @property {string} category - Категория (tasks, smart-processes, errors)
 * @property {string|null} [ip] - IP адрес клиента
 * @property {Object|null} [payload] - Полный payload вебхука
 * @property {EventDetails|null} [details] - Извлечённые детали события
 */

/**
 * @typedef {Object} WebhookLogsFilters
 * @property {string|null} [category] - Категория (tasks, smart-processes, errors)
 * @property {string|null} [event] - Тип события
 * @property {string|null} [date] - Дата в формате YYYY-MM-DD
 * @property {number|null} [hour] - Час (0-23)
 * @property {string|null} [dateFrom] - Начальная дата
 * @property {string|null} [dateTo] - Конечная дата
 * @property {string|null} [ip] - IP адрес
 * @property {string|null} [status] - Статус
 */

/**
 * @typedef {Object} WebhookLogsPagination
 * @property {number} page - Текущая страница
 * @property {number} limit - Количество записей на странице
 * @property {number} total - Общее количество записей
 * @property {number} pages - Общее количество страниц
 */

/**
 * @typedef {Object} WebhookLogsApiResponse
 * @property {boolean} success - Успешность запроса
 * @property {WebhookLogEntry[]} logs - Массив логов
 * @property {WebhookLogsPagination} pagination - Информация о пагинации
 * @property {string|null} [error] - Сообщение об ошибке
 * @property {string|null} [error_description] - Описание ошибки
 */

/**
 * @typedef {Object} RealtimeEvent
 * @property {string} type - Тип события (new_logs, error, timeout, connected)
 * @property {WebhookLogEntry[]} [logs] - Новые логи (для new_logs)
 * @property {string} [message] - Сообщение (для error)
 * @property {string} [timestamp] - Временная метка события
 */

/**
 * @typedef {Object} WebhookLogsStats
 * @property {number} total - Общее количество логов
 * @property {number} tasks - Количество логов задач
 * @property {number} smartProcesses - Количество логов смарт-процессов
 * @property {number} errors - Количество ошибок
 * @property {Object} byEvent - Статистика по типам событий
 * @property {Object} byDate - Статистика по датам
 */

/**
 * Валидация структуры WebhookLogEntry
 * 
 * @param {any} entry - Данные для валидации
 * @returns {boolean} true если структура валидна
 */
export function isValidWebhookLogEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return false;
  }
  
  // Обязательные поля
  if (!entry.timestamp || typeof entry.timestamp !== 'string') {
    return false;
  }
  
  if (!entry.event || typeof entry.event !== 'string') {
    return false;
  }
  
  if (!entry.category || typeof entry.category !== 'string') {
    return false;
  }
  
  // Валидация категории
  const validCategories = ['tasks', 'smart-processes', 'errors'];
  if (!validCategories.includes(entry.category)) {
    return false;
  }
  
  // Валидация формата timestamp (ISO 8601)
  try {
    new Date(entry.timestamp);
  } catch (e) {
    return false;
  }
  
  return true;
}

/**
 * Валидация структуры EventDetails
 * 
 * @param {any} details - Данные для валидации
 * @returns {boolean} true если структура валидна
 */
export function isValidEventDetails(details) {
  if (!details || typeof details !== 'object') {
    return false;
  }
  
  // EventDetails может быть пустым объектом или содержать любые поля
  // Основная валидация - это проверка типов значений
  for (const [key, value] of Object.entries(details)) {
    // Проверка, что значение не является функцией или объектом с циклическими ссылками
    if (typeof value === 'function') {
      return false;
    }
  }
  
  return true;
}

/**
 * Нормализация WebhookLogEntry (приведение к стандартному формату)
 * 
 * @param {any} entry - Данные для нормализации
 * @returns {WebhookLogEntry|null} Нормализованная запись или null
 */
export function normalizeWebhookLogEntry(entry) {
  if (!isValidWebhookLogEntry(entry)) {
    return null;
  }
  
  // Создаём нормализованную запись
  const normalized = {
    timestamp: entry.timestamp,
    event: entry.event,
    category: entry.category
  };
  
  // Опциональные поля
  if (entry.ip && typeof entry.ip === 'string') {
    normalized.ip = entry.ip;
  }
  
  if (entry.payload && typeof entry.payload === 'object') {
    normalized.payload = entry.payload;
  }
  
  if (entry.details && isValidEventDetails(entry.details)) {
    normalized.details = entry.details;
  }
  
  return normalized;
}

/**
 * Нормализация массива WebhookLogEntry
 * 
 * @param {any[]} entries - Массив записей
 * @returns {WebhookLogEntry[]} Нормализованный массив
 */
export function normalizeWebhookLogEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }
  
  return entries
    .map(entry => normalizeWebhookLogEntry(entry))
    .filter(entry => entry !== null);
}

export default {
  isValidWebhookLogEntry,
  isValidEventDetails,
  normalizeWebhookLogEntry,
  normalizeWebhookLogEntries
};


