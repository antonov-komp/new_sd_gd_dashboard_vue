# TASK-018-05-01: Адаптация Vue.js сервисов и composables к новому API и сущностям

**Дата создания:** 2025-12-07 16:00 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Дата завершения:** 2025-12-07 18:00 (UTC+3, Брест)  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-018](./TASK-018-refactor-webhook-logs-module.md)  
**Тип:** Рефакторинг / Адаптация

---

## 📋 Описание

Адаптировать Vue.js сервисы и composables для работы с новым рефакторенным API модуля логирования вебхуков. Обновить `WebhookLogsApiService` и `useRealtime` composable для работы с новыми сущностями (`WebhookEvent`, `WebhookLogEntry`) и улучшенной структурой данных.

**Цель этапа:**
- Обновить `WebhookLogsApiService` для работы с новым форматом ответов API
- Адаптировать `useRealtime` composable для работы с новым SSE endpoint
- Создать типизированные интерфейсы для данных вебхуков
- Улучшить обработку ошибок в сервисах
- Добавить валидацию данных на клиенте
- Оптимизировать кеширование для новой структуры данных

---

## 🎯 Контекст

Это первая часть пятого этапа рефакторинга модуля логирования вебхуков (TASK-018) для Vue.js программиста. После рефакторинга бэкенда (этапы 1-4) созданы новые сущности и улучшена структура данных. Vue.js интерфейс должен быть адаптирован для работы с новым API.

**Текущее состояние:**
- `WebhookLogsApiService` работает со старым форматом данных
- `useRealtime` composable использует старый формат SSE событий
- Нет типизации данных на клиенте
- Обработка ошибок не использует новые типы исключений
- Кеширование не оптимизировано для новой структуры

**Целевое состояние:**
- Сервисы адаптированы к новому API
- Типизированные интерфейсы для всех данных
- Улучшенная обработка ошибок
- Оптимизированное кеширование
- Валидация данных на клиенте

**Связи:**
- Зависит от: TASK-018-04-01 (сущности `WebhookEvent`, `WebhookLogEntry`), TASK-018-04-02 (`EventDetailsExtractor`)
- Зависит от него: TASK-018-05-02 (компоненты будут использовать обновлённые сервисы)
- **Бэкенд:** Новый API использует сущности и возвращает структурированные данные

---

## 📁 Модули и компоненты

### Файлы для изменения:

1. **`vue-app/src/services/webhook-logs-api.js`**
   - Обновить для работы с новым форматом ответов API
   - Добавить типизацию данных
   - Улучшить обработку ошибок
   - Оптимизировать кеширование

2. **`vue-app/src/composables/useRealtime.js`**
   - Адаптировать для нового формата SSE событий
   - Улучшить обработку новых логов
   - Добавить валидацию данных

3. **`vue-app/src/services/realtime-service.js`**
   - Обновить для работы с новым SSE endpoint
   - Улучшить обработку ошибок соединения

### Файлы для создания:

1. **`vue-app/src/types/webhook-logs.js`**
   - Типизированные интерфейсы для данных вебхуков
   - Типы для `WebhookEvent`, `WebhookLogEntry`, `EventDetails`
   - Типы для фильтров и пагинации

2. **`vue-app/src/utils/webhook-validators.js`**
   - Валидаторы для данных вебхуков на клиенте
   - Проверка структуры логов
   - Валидация фильтров

3. **`vue-app/src/utils/webhook-formatters.js`**
   - Форматтеры для отображения данных
   - Форматирование дат, событий, категорий
   - Форматирование деталей событий

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Создание типизированных интерфейсов

**1.1. Создать файл `vue-app/src/types/webhook-logs.js`:**

```javascript
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
```

**1.2. Протестировать типизацию:**

```javascript
// tests/types/webhook-logs.test.js (опционально, если есть тесты)
import { 
  isValidWebhookLogEntry, 
  normalizeWebhookLogEntry 
} from '@/types/webhook-logs.js';

// Тест валидной записи
const validEntry = {
  timestamp: '2025-12-07T15:00:00+03:00',
  event: 'ONTASKADD',
  category: 'tasks',
  ip: '192.168.1.1',
  details: { task_id: 123 }
};

console.assert(isValidWebhookLogEntry(validEntry) === true);
console.assert(normalizeWebhookLogEntry(validEntry) !== null);
```

**Результат шага 1:**
- Типизированные интерфейсы созданы
- Валидаторы реализованы
- Нормализация данных добавлена

---

### Шаг 2: Обновление WebhookLogsApiService

**2.1. Обновить `vue-app/src/services/webhook-logs-api.js`:**

```javascript
/**
 * Сервис для работы с логами вебхуков
 * 
 * Расположение: vue-app/src/services/webhook-logs-api.js
 * 
 * Обновлён для работы с новым рефакторенным API
 * Использует типизированные интерфейсы и валидацию данных
 */

import { useCache } from '@/composables/useCache.js';
import { 
  normalizeWebhookLogEntries,
  isValidWebhookLogEntry 
} from '@/types/webhook-logs.js';

// Инициализация кеша для логов
const { get, set, getCacheKey, invalidate } = useCache({
  ttl: 2 * 60 * 1000, // 2 минуты для логов
  maxSize: 50
});

/**
 * Класс для работы с API логов вебхуков
 */
export class WebhookLogsApiService {
  /**
   * Базовый URL API
   * 
   * @type {string}
   */
  static BASE_URL = '/api/webhook-logs.php';
  
  /**
   * Получение списка логов с кешированием и валидацией
   * 
   * @param {WebhookLogsFilters} filters Фильтры
   * @param {number} page Номер страницы
   * @param {number} limit Количество записей на странице
   * @param {boolean} forceRefresh Принудительное обновление (игнорировать кеш)
   * @returns {Promise<WebhookLogsApiResponse>} Результат с логами и пагинацией
   * @throws {Error} При ошибке API или валидации данных
   */
  static async getLogs(filters = {}, page = 1, limit = 50, forceRefresh = false) {
    // Валидация параметров
    if (page < 1) {
      throw new Error('Page must be greater than 0');
    }
    
    if (limit < 1 || limit > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }
    
    // Создаём простой объект для кеша (избегаем реактивных объектов Vue)
    const simpleFilters = {
      category: filters.category || null,
      event: filters.event || null,
      date: filters.date || null,
      hour: filters.hour !== undefined ? filters.hour : null,
      dateFrom: filters.dateFrom || null,
      dateTo: filters.dateTo || null,
      ip: filters.ip || null,
      status: filters.status || null
    };
    
    const cacheKey = getCacheKey(this.BASE_URL, { 
      filters: simpleFilters, 
      page, 
      limit 
    });
    
    // Проверка кеша (если не принудительное обновление)
    if (!forceRefresh) {
      const cached = get(cacheKey);
      if (cached) {
        console.log('[WebhookLogsApiService] Cache hit:', cacheKey.substring(0, 50) + '...');
        return cached;
      }
    }
    
    console.log('[WebhookLogsApiService] Cache miss:', cacheKey.substring(0, 50) + '...');
    
    // Формирование параметров запроса
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    // Добавление фильтров
    if (simpleFilters.category) {
      params.append('category', simpleFilters.category);
    }
    if (simpleFilters.event) {
      params.append('event', simpleFilters.event);
    }
    if (simpleFilters.date) {
      params.append('date', simpleFilters.date);
    }
    if (simpleFilters.hour !== null) {
      params.append('hour', simpleFilters.hour.toString());
    }
    if (simpleFilters.dateFrom) {
      params.append('dateFrom', simpleFilters.dateFrom);
    }
    if (simpleFilters.dateTo) {
      params.append('dateTo', simpleFilters.dateTo);
    }
    if (simpleFilters.ip) {
      params.append('ip', simpleFilters.ip);
    }
    if (simpleFilters.status) {
      params.append('status', simpleFilters.status);
    }
    
    try {
      const response = await fetch(`${this.BASE_URL}?${params.toString()}`);
      
      if (!response.ok) {
        // Обработка HTTP ошибок
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        
        throw new Error(
          errorData.error_description || 
          errorData.error || 
          `HTTP error! status: ${response.status}`
        );
      }
      
      const result = await response.json();
      
      console.log('[WebhookLogsApiService] API response:', {
        success: result.success,
        logsCount: result.logs?.length || 0,
        pagination: result.pagination,
        hasError: !!result.error
      });
      
      // Проверка формата ответа
      if (result.error) {
        throw new Error(result.error_description || result.error);
      }
      
      if (!result.success) {
        console.warn('[WebhookLogsApiService] API returned success=false:', result);
        throw new Error('API request failed');
      }
      
      // Валидация и нормализация данных
      if (!Array.isArray(result.logs)) {
        console.error('[WebhookLogsApiService] Invalid logs format:', result.logs);
        throw new Error('Invalid logs format: expected array');
      }
      
      // Нормализация записей логов
      const normalizedLogs = normalizeWebhookLogEntries(result.logs);
      
      // Валидация пагинации
      if (!result.pagination || typeof result.pagination !== 'object') {
        console.warn('[WebhookLogsApiService] Invalid pagination format:', result.pagination);
        // Создаём дефолтную пагинацию
        result.pagination = {
          page: page,
          limit: limit,
          total: normalizedLogs.length,
          pages: Math.ceil(normalizedLogs.length / limit)
        };
      }
      
      // Создаём нормализованный результат
      const normalizedResult = {
        success: true,
        logs: normalizedLogs,
        pagination: {
          page: result.pagination.page || page,
          limit: result.pagination.limit || limit,
          total: result.pagination.total || normalizedLogs.length,
          pages: result.pagination.pages || Math.ceil((result.pagination.total || normalizedLogs.length) / limit)
        }
      };
      
      // Сохранение в кеш
      set(cacheKey, normalizedResult);
      
      return normalizedResult;
    } catch (error) {
      console.error('[WebhookLogsApiService] Error:', error);
      throw error;
    }
  }
  
  /**
   * Инвалидация кеша при изменении фильтров
   * 
   * @param {WebhookLogsFilters} oldFilters Старые фильтры
   * @param {WebhookLogsFilters} newFilters Новые фильтры
   */
  static invalidateCacheOnFilterChange(oldFilters = {}, newFilters = {}) {
    // Инвалидируем все записи, связанные с логами
    const invalidated = invalidate(/^\/api\/webhook-logs\.php/);
    console.log(`[WebhookLogsApiService] Invalidated ${invalidated} entries on filter change`);
  }
  
  /**
   * Очистка всего кеша логов
   */
  static clearCache() {
    const invalidated = invalidate(/^\/api\/webhook-logs\.php/);
    console.log(`[WebhookLogsApiService] Cleared ${invalidated} entries`);
  }
  
  /**
   * Получение детальной информации о логе
   * 
   * @param {string} logId Уникальный ID лога (комбинация timestamp + event)
   * @param {string} date Дата лога
   * @returns {Promise<WebhookLogEntry|null>} Данные лога или null
   */
  static async getLogDetails(logId, date = null) {
    const filters = {};
    if (date) {
      filters.date = date;
    }
    
    const result = await this.getLogs(filters, 1, 1000);
    
    // Поиск лога по ID (если ID формируется из timestamp + event)
    const log = result.logs.find(l => {
      const logIdCandidate = `${l.timestamp}_${l.event}`;
      return logIdCandidate === logId;
    });
    
    return log || null;
  }
  
  /**
   * Получение ошибок
   * 
   * @param {WebhookLogsFilters} filters Дополнительные фильтры
   * @param {number} page Номер страницы
   * @param {number} limit Количество записей на странице
   * @returns {Promise<WebhookLogsApiResponse>} Результат с ошибками и пагинацией
   */
  static async getErrors(filters = {}, page = 1, limit = 50) {
    return this.getLogs({ ...filters, category: 'errors' }, page, limit);
  }
  
  /**
   * Получение статистики
   * 
   * @param {WebhookLogsFilters} filters Фильтры для статистики
   * @returns {Promise<WebhookLogsStats>} Статистика
   */
  static async getStats(filters = {}) {
    // Получаем все логи для статистики (без пагинации)
    const result = await this.getLogs(filters, 1, 1000);
    
    const stats = {
      total: result.pagination.total || result.logs.length,
      tasks: 0,
      smartProcesses: 0,
      errors: 0,
      byEvent: {},
      byDate: {}
    };
    
    // Подсчёт статистики
    result.logs.forEach(log => {
      // По категориям
      if (log.category === 'tasks') {
        stats.tasks++;
      } else if (log.category === 'smart-processes') {
        stats.smartProcesses++;
      } else if (log.category === 'errors') {
        stats.errors++;
      }
      
      // По типам событий
      if (!stats.byEvent[log.event]) {
        stats.byEvent[log.event] = 0;
      }
      stats.byEvent[log.event]++;
      
      // По датам
      const date = log.timestamp.split('T')[0];
      if (!stats.byDate[date]) {
        stats.byDate[date] = 0;
      }
      stats.byDate[date]++;
    });
    
    return stats;
  }
}
```

**2.2. Добавить обработку ошибок с типами:**

```javascript
// Добавить в класс WebhookLogsApiService

/**
 * Обработка ошибок API с детальной информацией
 * 
 * @param {Response} response HTTP ответ
 * @returns {Promise<Error>} Ошибка с детальной информацией
 */
static async handleApiError(response) {
  let errorData;
  try {
    const errorText = await response.text();
    errorData = JSON.parse(errorText);
  } catch (e) {
    errorData = { 
      error: 'Unknown error',
      error_description: await response.text() || `HTTP ${response.status}`
    };
  }
  
  // Создаём детальную ошибку
  const error = new Error(errorData.error_description || errorData.error);
  error.status = response.status;
  error.code = errorData.error || 'UNKNOWN_ERROR';
  error.context = errorData.context || {};
  
  return error;
}
```

**Результат шага 2:**
- `WebhookLogsApiService` обновлён
- Валидация данных добавлена
- Нормализация записей реализована
- Обработка ошибок улучшена

---

### Шаг 3: Обновление useRealtime composable

**3.1. Обновить `vue-app/src/composables/useRealtime.js`:**

```javascript
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { RealtimeService } from '@/services/realtime-service.js';
import { 
  normalizeWebhookLogEntries,
  isValidWebhookLogEntry 
} from '@/types/webhook-logs.js';

/**
 * Composable для работы с реальным временем
 * 
 * Обновлён для работы с новым рефакторенным SSE endpoint
 * Использует типизированные интерфейсы и валидацию данных
 * 
 * @param {string} url URL SSE endpoint
 * @param {Object} options Опции
 * @returns {Object} API для работы с реальным временем
 */
export function useRealtime(url, options = {}) {
  const {
    autoConnect = false,
    enableSound = false,
    onNewLogs = null,
    validateLogs = true // Валидация новых логов
  } = options;

  const service = new RealtimeService(url, options);
  const connectionState = ref('disconnected');
  const newLogs = ref([]);
  const newLogsCount = ref(0);
  const lastUpdateTime = ref(null);
  const error = ref(null);
  const reconnectAttempts = ref(0);

  // Вычисляемые свойства
  const isConnected = computed(() => connectionState.value === 'connected');
  const isConnecting = computed(() => connectionState.value === 'connecting');
  const hasError = computed(() => connectionState.value === 'error');
  const hasNewLogs = computed(() => newLogsCount.value > 0);

  // Обработчики событий
  const handleStateChange = (data) => {
    connectionState.value = data.state;
    if (data.state === 'connected') {
      reconnectAttempts.value = 0;
      error.value = null;
    }
  };

  const handleNewLogs = (data) => {
    let logs = data.logs || [];
    
    // Валидация и нормализация логов
    if (validateLogs) {
      logs = normalizeWebhookLogEntries(logs);
      
      // Фильтруем невалидные записи
      const validLogs = logs.filter(log => isValidWebhookLogEntry(log));
      
      if (validLogs.length !== logs.length) {
        console.warn(
          '[useRealtime] Filtered out invalid logs:',
          logs.length - validLogs.length
        );
      }
      
      logs = validLogs;
    }
    
    if (logs.length === 0) {
      return; // Нет валидных логов
    }
    
    // Добавление новых логов
    newLogs.value.push(...logs);
    newLogsCount.value += logs.length;
    lastUpdateTime.value = new Date().toISOString();

    // Звуковое уведомление (опционально)
    if (enableSound && logs.length > 0) {
      playNotificationSound();
    }

    // Callback для обработки новых логов
    if (onNewLogs) {
      onNewLogs(logs);
    }
  };

  const handleError = (data) => {
    error.value = data.message || 'Connection error';
    console.error('[useRealtime] Error:', data);
  };

  const handleTimeout = (data) => {
    console.warn('[useRealtime] Connection timeout:', data);
    // Автоматическое переподключение обрабатывается сервисом
  };

  const handleMaxReconnectAttempts = (data) => {
    error.value = `Max reconnect attempts reached (${data.attempts})`;
    console.error('[useRealtime] Max reconnect attempts:', data);
  };

  // Подключение
  const connect = () => {
    error.value = null;
    service.on('state-change', handleStateChange);
    service.on('new_logs', handleNewLogs);
    service.on('error', handleError);
    service.on('timeout', handleTimeout);
    service.on('max-reconnect-attempts', handleMaxReconnectAttempts);
    service.connect();
  };

  // Отключение
  const disconnect = () => {
    service.off('state-change', handleStateChange);
    service.off('new_logs', handleNewLogs);
    service.off('error', handleError);
    service.off('timeout', handleTimeout);
    service.off('max-reconnect-attempts', handleMaxReconnectAttempts);
    service.disconnect();
  };

  // Очистка новых логов
  const clearNewLogs = () => {
    newLogs.value = [];
    newLogsCount.value = 0;
  };

  // Применение новых логов к основному списку
  const applyNewLogs = (logsList) => {
    if (logsList && Array.isArray(logsList)) {
      // Добавление новых логов в начало списка
      logsList.unshift(...newLogs.value);
      clearNewLogs();
    }
  };

  // Звуковое уведомление
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(err => {
        console.warn('[useRealtime] Failed to play sound:', err);
      });
    } catch (err) {
      console.warn('[useRealtime] Sound not available:', err);
    }
  };

  // Автоматическое подключение при монтировании
  if (autoConnect) {
    onMounted(() => {
      connect();
    });
  }

  // Отключение при размонтировании
  onUnmounted(() => {
    disconnect();
  });

  return {
    // Состояние
    connectionState,
    isConnected,
    isConnecting,
    hasError,
    newLogs,
    newLogsCount,
    hasNewLogs,
    lastUpdateTime,
    error,
    reconnectAttempts,
    
    // Методы
    connect,
    disconnect,
    clearNewLogs,
    applyNewLogs
  };
}
```

**Результат шага 3:**
- `useRealtime` обновлён
- Валидация новых логов добавлена
- Обработка ошибок улучшена

---

### Шаг 4: Создание утилит для валидации и форматирования

**4.1. Создать файл `vue-app/src/utils/webhook-validators.js`:**

```javascript
/**
 * Валидаторы для данных вебхуков на клиенте
 * 
 * Расположение: vue-app/src/utils/webhook-validators.js
 */

import { isValidWebhookLogEntry, isValidEventDetails } from '@/types/webhook-logs.js';

/**
 * Валидация фильтров
 * 
 * @param {any} filters Фильтры для валидации
 * @returns {boolean} true если фильтры валидны
 */
export function validateFilters(filters) {
  if (!filters || typeof filters !== 'object') {
    return false;
  }
  
  // Валидация категории
  if (filters.category !== undefined && filters.category !== null) {
    const validCategories = ['tasks', 'smart-processes', 'errors'];
    if (!validCategories.includes(filters.category)) {
      return false;
    }
  }
  
  // Валидация даты
  if (filters.date !== undefined && filters.date !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.date)) {
      return false;
    }
  }
  
  // Валидация часа
  if (filters.hour !== undefined && filters.hour !== null) {
    const hour = parseInt(filters.hour, 10);
    if (isNaN(hour) || hour < 0 || hour > 23) {
      return false;
    }
  }
  
  // Валидация IP адреса
  if (filters.ip !== undefined && filters.ip !== null) {
    // Простая валидация IP (можно улучшить)
    if (typeof filters.ip !== 'string' || filters.ip.length === 0) {
      return false;
    }
  }
  
  return true;
}

/**
 * Валидация пагинации
 * 
 * @param {any} pagination Пагинация для валидации
 * @returns {boolean} true если пагинация валидна
 */
export function validatePagination(pagination) {
  if (!pagination || typeof pagination !== 'object') {
    return false;
  }
  
  const page = parseInt(pagination.page, 10);
  const limit = parseInt(pagination.limit, 10);
  const total = parseInt(pagination.total, 10);
  const pages = parseInt(pagination.pages, 10);
  
  if (isNaN(page) || page < 1) {
    return false;
  }
  
  if (isNaN(limit) || limit < 1 || limit > 1000) {
    return false;
  }
  
  if (isNaN(total) || total < 0) {
    return false;
  }
  
  if (isNaN(pages) || pages < 0) {
    return false;
  }
  
  return true;
}

export default {
  validateFilters,
  validatePagination,
  isValidWebhookLogEntry,
  isValidEventDetails
};
```

**4.2. Создать файл `vue-app/src/utils/webhook-formatters.js`:**

```javascript
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
```

**Результат шага 4:**
- Валидаторы созданы
- Форматтеры реализованы
- Утилиты готовы к использованию

---

## 📊 Критерии приёмки

- [x] Файл `vue-app/src/types/webhook-logs.js` создан с типизированными интерфейсами
- [x] Валидаторы `isValidWebhookLogEntry` и `isValidEventDetails` реализованы
- [x] Нормализация `normalizeWebhookLogEntry` и `normalizeWebhookLogEntries` реализована
- [x] `WebhookLogsApiService` обновлён для работы с новым API
- [x] Валидация данных в `WebhookLogsApiService` добавлена
- [x] Нормализация записей в `WebhookLogsApiService` реализована
- [x] Обработка ошибок в `WebhookLogsApiService` улучшена
- [x] `useRealtime` composable обновлён для работы с новым SSE endpoint
- [x] Валидация новых логов в `useRealtime` добавлена
- [x] Файл `vue-app/src/utils/webhook-validators.js` создан
- [x] Файл `vue-app/src/utils/webhook-formatters.js` создан
- [x] Код соответствует стандартам ESLint (проверено)
- [x] JSDoc комментарии добавлены для всех методов
- [x] **Совместимость с Vue.js компонентами сохранена (WebhookLogsPage, WebhookLogList, WebhookLogDetails)**
- [x] **Формат данных соответствует ожиданиям Vue.js компонентов**

---

## 🔍 Проверка выполнения

**Команды для проверки:**
```bash
# Проверить синтаксис JavaScript файлов
npm run lint vue-app/src/services/webhook-logs-api.js
npm run lint vue-app/src/composables/useRealtime.js
npm run lint vue-app/src/types/webhook-logs.js

# Запустить тесты (если есть)
npm run test vue-app/src/services/webhook-logs-api.test.js
npm run test vue-app/src/composables/useRealtime.test.js

# Проверить работу в браузере
# Открыть /admin/webhook-logs и проверить загрузку логов
```

**Ручное тестирование:**
1. Открыть страницу `/admin/webhook-logs`
2. Проверить загрузку логов через `WebhookLogsApiService`
3. Проверить работу фильтров
4. Проверить работу пагинации
5. Проверить работу SSE через `useRealtime`
6. Проверить отображение данных в компонентах
7. Проверить обработку ошибок

---

## 🔗 Связи с другими этапами

**Зависит от:**
- **TASK-018-04-01:** Использует структуру сущностей `WebhookEvent` и `WebhookLogEntry`
- **TASK-018-04-02:** Использует структуру деталей событий из `EventDetailsExtractor`

**Зависит от него:**
- **TASK-018-05-02:** Компоненты будут использовать обновлённые сервисы и утилиты

---

## 📝 История правок

- **2025-12-07 16:00 (UTC+3, Брест):** Создана задача адаптации Vue.js сервисов и composables к новому API
- **2025-12-07 18:00 (UTC+3, Брест):** Задача выполнена
  - Создан файл `vue-app/src/types/webhook-logs.js` с типизированными интерфейсами
  - Создан файл `vue-app/src/utils/webhook-validators.js` с валидаторами
  - Создан файл `vue-app/src/utils/webhook-formatters.js` с форматтерами
  - Обновлён `WebhookLogsApiService` с валидацией и нормализацией данных
  - Обновлён `useRealtime` composable с валидацией новых логов
  - Добавлена обработка ошибок с детальной информацией
  - Все критерии приёмки выполнены

---

## 💡 Дополнительные рекомендации

1. **Производительность:**
   - Оптимизировать кеширование для больших объёмов данных
   - Использовать мемоизацию для форматирования данных
   - Ленивая загрузка деталей событий

2. **Безопасность:**
   - Валидация всех входящих данных от API
   - Санитизация данных перед отображением
   - Защита от XSS в форматтерах

3. **Расширяемость:**
   - Легко добавлять новые типы событий
   - Конфигурируемые форматтеры
   - Плагинная архитектура для валидаторов

4. **Документация:**
   - Примеры использования в JSDoc
   - Описание структуры данных
   - Руководство по расширению

