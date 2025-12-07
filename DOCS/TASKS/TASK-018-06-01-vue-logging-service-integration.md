# TASK-018-06-01: Адаптация Vue.js к новому сервису логирования вебхуков

**Дата создания:** 2025-12-07 16:30 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-018](./TASK-018-refactor-webhook-logs-module.md)  
**Тип:** Рефакторинг / Адаптация

---

## 📋 Описание

Адаптировать Vue.js интерфейс для работы с новым рефакторенным сервисом логирования вебхуков (`WebhookLoggingService`). Обновить обработку ошибок логирования, работу с улучшенной структурой записей логов и интеграцию с новым API логирования.

**Цель этапа:**
- Адаптировать Vue.js сервисы для работы с новым форматом логов от `WebhookLoggingService`
- Улучшить обработку ошибок логирования на клиенте
- Реализовать обработку новых полей в структуре логов
- Добавить поддержку категоризации событий на клиенте
- Оптимизировать работу с улучшенной структурой записей логов
- Реализовать обработку метаданных логирования

---

## 🎯 Контекст

Это первая часть шестого этапа рефакторинга модуля логирования вебхуков (TASK-018) для Vue.js программиста. После рефакторинга сервиса логирования на бэкенде (TASK-018-06) Vue.js интерфейс должен быть адаптирован для работы с новым форматом данных и улучшенной структурой логов.

**Текущее состояние:**
- Vue.js работает со старой структурой логов
- Ограниченная обработка ошибок логирования
- Нет поддержки новых метаданных логирования
- Категоризация событий не используется на клиенте
- Нет обработки улучшенной структуры записей

**Целевое состояние:**
- Адаптация к новому формату логов от `WebhookLoggingService`
- Улучшенная обработка ошибок логирования
- Поддержка метаданных логирования
- Использование категоризации на клиенте
- Оптимизированная работа с улучшенной структурой

**Связи:**
- Зависит от: TASK-018-06 (рефакторинг `WebhookLoggingService` на бэкенде), TASK-018-05-01 (обновлённые сервисы Vue.js)
- Зависит от него: TASK-018-06-02 (улучшение интерфейса для работы с логированием)
- **Бэкенд:** Новый `WebhookLoggingService` возвращает улучшенную структуру логов с метаданными

---

## 📁 Модули и компоненты

### Файлы для изменения:

1. **`vue-app/src/services/webhook-logs-api.js`**
   - Адаптация к новому формату ответов от API логирования
   - Обработка метаданных логирования
   - Улучшенная обработка ошибок

2. **`vue-app/src/composables/useRealtime.js`**
   - Адаптация к новому формату SSE событий от логирования
   - Обработка метаданных в реальном времени

3. **`vue-app/src/types/webhook-logs.js`**
   - Добавление типов для метаданных логирования
   - Обновление типов для улучшенной структуры логов

### Файлы для создания:

1. **`vue-app/src/services/webhook-logging-client.js`**
   - Клиент для работы с API логирования
   - Методы для получения метаданных логирования
   - Обработка ошибок логирования

2. **`vue-app/src/utils/logging-helpers.js`**
   - Утилиты для работы с логированием
   - Категоризация событий на клиенте
   - Обработка метаданных

3. **`vue-app/src/composables/useLoggingMetadata.js`**
   - Composable для работы с метаданными логирования
   - Кеширование метаданных
   - Обновление метаданных в реальном времени

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Обновление типов для метаданных логирования

**1.1. Обновить файл `vue-app/src/types/webhook-logs.js`:**

```javascript
/**
 * Типизированные интерфейсы для данных вебхуков
 * 
 * Обновлено для работы с новым WebhookLoggingService
 */

// ... существующие типы ...

/**
 * @typedef {Object} LoggingMetadata
 * @property {number} totalLogs - Общее количество логов
 * @property {number} totalErrors - Общее количество ошибок
 * @property {Object} byCategory - Статистика по категориям
 * @property {Object} byEvent - Статистика по типам событий
 * @property {string} lastLogTimestamp - Временная метка последнего лога
 * @property {string} lastErrorTimestamp - Временная метка последней ошибки
 * @property {number} averageLogsPerHour - Среднее количество логов в час
 */

/**
 * @typedef {Object} EnhancedWebhookLogEntry
 * @property {string} timestamp - Временная метка (ISO 8601)
 * @property {string} event - Тип события
 * @property {string} category - Категория (tasks, smart-processes, errors)
 * @property {string|null} [ip] - IP адрес клиента
 * @property {Object|null} [payload] - Полный payload вебхука
 * @property {EventDetails|null} [details] - Извлечённые детали события
 * @property {LoggingMetadata|null} [metadata] - Метаданные логирования
 * @property {string} [loggingId] - Уникальный ID записи логирования
 * @property {number} [loggingDuration] - Длительность логирования (мс)
 * @property {string} [loggingStatus] - Статус логирования (success, error, warning)
 */

/**
 * @typedef {Object} LoggingError
 * @property {string} error - Тип ошибки
 * @property {string} error_description - Описание ошибки
 * @property {string} timestamp - Временная метка ошибки
 * @property {Object|null} [context] - Контекст ошибки
 * @property {string|null} [loggingId] - ID записи логирования (если есть)
 */

/**
 * @typedef {Object} LoggingApiResponse
 * @property {boolean} success - Успешность операции логирования
 * @property {string|null} [loggingId] - ID созданной записи
 * @property {string|null} [error] - Сообщение об ошибке
 * @property {string|null} [error_description] - Описание ошибки
 * @property {LoggingMetadata|null} [metadata] - Метаданные логирования
 */

/**
 * Валидация метаданных логирования
 * 
 * @param {any} metadata - Данные для валидации
 * @returns {boolean} true если структура валидна
 */
export function isValidLoggingMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return false;
  }
  
  // Проверка обязательных полей
  if (typeof metadata.totalLogs !== 'number' || metadata.totalLogs < 0) {
    return false;
  }
  
  if (typeof metadata.totalErrors !== 'number' || metadata.totalErrors < 0) {
    return false;
  }
  
  return true;
}

/**
 * Валидация улучшенной записи лога
 * 
 * @param {any} entry - Данные для валидации
 * @returns {boolean} true если структура валидна
 */
export function isValidEnhancedWebhookLogEntry(entry) {
  // Базовая валидация
  if (!isValidWebhookLogEntry(entry)) {
    return false;
  }
  
  // Валидация метаданных (если есть)
  if (entry.metadata && !isValidLoggingMetadata(entry.metadata)) {
    return false;
  }
  
  // Валидация статуса логирования (если есть)
  if (entry.loggingStatus) {
    const validStatuses = ['success', 'error', 'warning'];
    if (!validStatuses.includes(entry.loggingStatus)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Нормализация улучшенной записи лога
 * 
 * @param {any} entry - Данные для нормализации
 * @returns {EnhancedWebhookLogEntry|null} Нормализованная запись или null
 */
export function normalizeEnhancedWebhookLogEntry(entry) {
  const normalized = normalizeWebhookLogEntry(entry);
  
  if (!normalized) {
    return null;
  }
  
  // Добавление метаданных (если есть)
  if (entry.metadata && isValidLoggingMetadata(entry.metadata)) {
    normalized.metadata = entry.metadata;
  }
  
  // Добавление ID логирования (если есть)
  if (entry.loggingId && typeof entry.loggingId === 'string') {
    normalized.loggingId = entry.loggingId;
  }
  
  // Добавление длительности логирования (если есть)
  if (entry.loggingDuration !== undefined && typeof entry.loggingDuration === 'number') {
    normalized.loggingDuration = entry.loggingDuration;
  }
  
  // Добавление статуса логирования (если есть)
  if (entry.loggingStatus && typeof entry.loggingStatus === 'string') {
    normalized.loggingStatus = entry.loggingStatus;
  }
  
  return normalized;
}

export default {
  // ... существующие экспорты ...
  isValidLoggingMetadata,
  isValidEnhancedWebhookLogEntry,
  normalizeEnhancedWebhookLogEntry
};
```

**Результат шага 1:**
- Типы для метаданных логирования добавлены
- Типы для улучшенной структуры логов добавлены
- Валидаторы обновлены

---

### Шаг 2: Создание клиента для работы с API логирования

**2.1. Создать файл `vue-app/src/services/webhook-logging-client.js`:**

```javascript
/**
 * Клиент для работы с API логирования вебхуков
 * 
 * Расположение: vue-app/src/services/webhook-logging-client.js
 * 
 * Работает с новым WebhookLoggingService на бэкенде
 */

import { 
  normalizeEnhancedWebhookLogEntry,
  isValidLoggingMetadata 
} from '@/types/webhook-logs.js';

/**
 * Класс для работы с API логирования
 */
export class WebhookLoggingClient {
  /**
   * Базовый URL API логирования
   * 
   * @type {string}
   */
  static BASE_URL = '/api/webhook-handler.php';
  
  /**
   * Получение метаданных логирования
   * 
   * @param {Object} filters Фильтры для метаданных
   * @returns {Promise<LoggingMetadata>} Метаданные логирования
   * @throws {Error} При ошибке API
   */
  static async getLoggingMetadata(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Добавление фильтров
      if (filters.category) {
        params.append('category', filters.category);
      }
      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo);
      }
      
      // Добавление параметра для получения метаданных
      params.append('metadata', '1');
      
      const response = await fetch(`${this.BASE_URL}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error_description || result.error);
      }
      
      // Валидация метаданных
      if (!result.metadata || !isValidLoggingMetadata(result.metadata)) {
        throw new Error('Invalid metadata format');
      }
      
      return result.metadata;
    } catch (error) {
      console.error('[WebhookLoggingClient] Error getting metadata:', error);
      throw error;
    }
  }
  
  /**
   * Получение статистики логирования
   * 
   * @param {Object} filters Фильтры для статистики
   * @returns {Promise<Object>} Статистика логирования
   * @throws {Error} При ошибке API
   */
  static async getLoggingStats(filters = {}) {
    try {
      const metadata = await this.getLoggingMetadata(filters);
      
      return {
        total: metadata.totalLogs,
        errors: metadata.totalErrors,
        byCategory: metadata.byCategory || {},
        byEvent: metadata.byEvent || {},
        averagePerHour: metadata.averageLogsPerHour || 0,
        lastLogTime: metadata.lastLogTimestamp,
        lastErrorTime: metadata.lastErrorTimestamp
      };
    } catch (error) {
      console.error('[WebhookLoggingClient] Error getting stats:', error);
      throw error;
    }
  }
  
  /**
   * Проверка статуса логирования
   * 
   * @returns {Promise<Object>} Статус логирования
   * @throws {Error} При ошибке API
   */
  static async getLoggingStatus() {
    try {
      const response = await fetch(`${this.BASE_URL}?status=1`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error_description || result.error);
      }
      
      return {
        enabled: result.enabled !== false,
        lastLogTime: result.lastLogTime || null,
        totalLogs: result.totalLogs || 0,
        totalErrors: result.totalErrors || 0
      };
    } catch (error) {
      console.error('[WebhookLoggingClient] Error getting status:', error);
      throw error;
    }
  }
  
  /**
   * Получение ошибок логирования
   * 
   * @param {Object} filters Фильтры для ошибок
   * @param {number} limit Лимит ошибок
   * @returns {Promise<LoggingError[]>} Массив ошибок
   * @throws {Error} При ошибке API
   */
  static async getLoggingErrors(filters = {}, limit = 50) {
    try {
      const params = new URLSearchParams({
        errors: '1',
        limit: limit.toString()
      });
      
      // Добавление фильтров
      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo);
      }
      
      const response = await fetch(`${this.BASE_URL}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error_description || result.error);
      }
      
      return result.errors || [];
    } catch (error) {
      console.error('[WebhookLoggingClient] Error getting errors:', error);
      throw error;
    }
  }
}
```

**Результат шага 2:**
- Клиент для работы с API логирования создан
- Методы для получения метаданных реализованы
- Обработка ошибок добавлена

---

### Шаг 3: Создание утилит для работы с логированием

**3.1. Создать файл `vue-app/src/utils/logging-helpers.js`:**

```javascript
/**
 * Утилиты для работы с логированием вебхуков
 * 
 * Расположение: vue-app/src/utils/logging-helpers.js
 */

/**
 * Категоризация события на клиенте
 * 
 * @param {string} eventType Тип события
 * @returns {string|null} Категория или null
 */
export function categorizeEvent(eventType) {
  if (!eventType || typeof eventType !== 'string') {
    return null;
  }
  
  if (eventType.startsWith('ONCRMDYNAMIC')) {
    return 'smart-processes';
  }
  
  if (eventType.startsWith('ONTASK')) {
    return 'tasks';
  }
  
  // Ошибки определяются по другим признакам
  return null;
}

/**
 * Определение статуса логирования по записи
 * 
 * @param {Object} logEntry Запись лога
 * @returns {string} Статус (success, error, warning)
 */
export function getLoggingStatus(logEntry) {
  if (!logEntry) {
    return 'error';
  }
  
  // Если есть явный статус
  if (logEntry.loggingStatus) {
    return logEntry.loggingStatus;
  }
  
  // Определение по категории
  if (logEntry.category === 'errors') {
    return 'error';
  }
  
  // Определение по наличию ошибок в деталях
  if (logEntry.details && logEntry.details.error) {
    return 'error';
  }
  
  return 'success';
}

/**
 * Форматирование длительности логирования
 * 
 * @param {number} duration Длительность в миллисекундах
 * @returns {string} Отформатированная длительность
 */
export function formatLoggingDuration(duration) {
  if (!duration || typeof duration !== 'number') {
    return '—';
  }
  
  if (duration < 1) {
    return '< 1 мс';
  }
  
  if (duration < 1000) {
    return `${Math.round(duration)} мс`;
  }
  
  const seconds = duration / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(2)} с`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes} м ${Math.round(remainingSeconds)} с`;
}

/**
 * Получение цвета для статуса логирования
 * 
 * @param {string} status Статус логирования
 * @returns {string} Цвет (hex)
 */
export function getLoggingStatusColor(status) {
  const colorMap = {
    'success': '#4caf50',
    'error': '#f44336',
    'warning': '#ff9800'
  };
  
  return colorMap[status] || '#9e9e9e';
}

/**
 * Получение иконки для статуса логирования
 * 
 * @param {string} status Статус логирования
 * @returns {string} Иконка (emoji или текст)
 */
export function getLoggingStatusIcon(status) {
  const iconMap = {
    'success': '✅',
    'error': '❌',
    'warning': '⚠️'
  };
  
  return iconMap[status] || '❓';
}

/**
 * Проверка, является ли запись ошибкой
 * 
 * @param {Object} logEntry Запись лога
 * @returns {boolean} true если это ошибка
 */
export function isLoggingError(logEntry) {
  return getLoggingStatus(logEntry) === 'error';
}

/**
 * Проверка, является ли запись предупреждением
 * 
 * @param {Object} logEntry Запись лога
 * @returns {boolean} true если это предупреждение
 */
export function isLoggingWarning(logEntry) {
  return getLoggingStatus(logEntry) === 'warning';
}

/**
 * Получение метаданных из записи лога
 * 
 * @param {Object} logEntry Запись лога
 * @returns {Object|null} Метаданные или null
 */
export function extractLoggingMetadata(logEntry) {
  if (!logEntry || !logEntry.metadata) {
    return null;
  }
  
  return {
    loggingId: logEntry.loggingId || null,
    loggingDuration: logEntry.loggingDuration || null,
    loggingStatus: getLoggingStatus(logEntry),
    timestamp: logEntry.timestamp,
    category: logEntry.category,
    event: logEntry.event
  };
}

export default {
  categorizeEvent,
  getLoggingStatus,
  formatLoggingDuration,
  getLoggingStatusColor,
  getLoggingStatusIcon,
  isLoggingError,
  isLoggingWarning,
  extractLoggingMetadata
};
```

**Результат шага 3:**
- Утилиты для работы с логированием созданы
- Категоризация событий реализована
- Форматирование метаданных добавлено

---

### Шаг 4: Создание composable для метаданных логирования

**4.1. Создать файл `vue-app/src/composables/useLoggingMetadata.js`:**

```javascript
/**
 * Composable для работы с метаданными логирования
 * 
 * Расположение: vue-app/src/composables/useLoggingMetadata.js
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { WebhookLoggingClient } from '@/services/webhook-logging-client.js';
import { isValidLoggingMetadata } from '@/types/webhook-logs.js';

/**
 * Composable для работы с метаданными логирования
 * 
 * @param {Object} options Опции
 * @returns {Object} API для работы с метаданными
 */
export function useLoggingMetadata(options = {}) {
  const {
    autoRefresh = false,
    refreshInterval = 60000, // 1 минута
    filters = {}
  } = options;

  const metadata = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const lastUpdate = ref(null);
  let refreshTimer = null;

  // Вычисляемые свойства
  const hasMetadata = computed(() => metadata.value !== null);
  const totalLogs = computed(() => metadata.value?.totalLogs || 0);
  const totalErrors = computed(() => metadata.value?.totalErrors || 0);
  const byCategory = computed(() => metadata.value?.byCategory || {});
  const byEvent = computed(() => metadata.value?.byEvent || {});
  const averagePerHour = computed(() => metadata.value?.averageLogsPerHour || 0);
  const lastLogTime = computed(() => metadata.value?.lastLogTimestamp || null);
  const lastErrorTime = computed(() => metadata.value?.lastErrorTimestamp || null);

  /**
   * Загрузка метаданных
   */
  const loadMetadata = async () => {
    loading.value = true;
    error.value = null;

    try {
      const data = await WebhookLoggingClient.getLoggingMetadata(filters);

      // Валидация метаданных
      if (!isValidLoggingMetadata(data)) {
        throw new Error('Invalid metadata format');
      }

      metadata.value = data;
      lastUpdate.value = new Date().toISOString();
    } catch (err) {
      console.error('[useLoggingMetadata] Error loading metadata:', err);
      error.value = err.message || 'Failed to load metadata';
    } finally {
      loading.value = false;
    }
  };

  /**
   * Обновление метаданных
   */
  const refreshMetadata = async () => {
    await loadMetadata();
  };

  /**
   * Очистка метаданных
   */
  const clearMetadata = () => {
    metadata.value = null;
    lastUpdate.value = null;
    error.value = null;
  };

  /**
   * Запуск автоматического обновления
   */
  const startAutoRefresh = () => {
    if (refreshTimer) {
      return; // Уже запущено
    }

    refreshTimer = setInterval(() => {
      loadMetadata();
    }, refreshInterval);
  };

  /**
   * Остановка автоматического обновления
   */
  const stopAutoRefresh = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  };

  // Автоматическое обновление при монтировании
  if (autoRefresh) {
    onMounted(() => {
      loadMetadata();
      startAutoRefresh();
    });

    onUnmounted(() => {
      stopAutoRefresh();
    });
  }

  return {
    // Состояние
    metadata,
    loading,
    error,
    lastUpdate,
    hasMetadata,

    // Вычисляемые свойства
    totalLogs,
    totalErrors,
    byCategory,
    byEvent,
    averagePerHour,
    lastLogTime,
    lastErrorTime,

    // Методы
    loadMetadata,
    refreshMetadata,
    clearMetadata,
    startAutoRefresh,
    stopAutoRefresh
  };
}
```

**Результат шага 4:**
- Composable для метаданных создан
- Автоматическое обновление реализовано
- Кеширование метаданных добавлено

---

### Шаг 5: Обновление WebhookLogsApiService для работы с улучшенной структурой

**5.1. Обновить `vue-app/src/services/webhook-logs-api.js`:**

```javascript
// Добавить импорты
import { 
  normalizeEnhancedWebhookLogEntry,
  isValidEnhancedWebhookLogEntry 
} from '@/types/webhook-logs.js';

// Обновить метод getLogs для работы с улучшенной структурой
static async getLogs(filters = {}, page = 1, limit = 50, forceRefresh = false) {
  // ... существующий код ...
  
  // После получения результата от API:
  
  // Нормализация записей с поддержкой улучшенной структуры
  const normalizedLogs = result.logs
    .map(entry => normalizeEnhancedWebhookLogEntry(entry))
    .filter(entry => entry !== null && isValidEnhancedWebhookLogEntry(entry));
  
  // Создаём нормализованный результат
  const normalizedResult = {
    success: true,
    logs: normalizedLogs,
    pagination: {
      page: result.pagination.page || page,
      limit: result.pagination.limit || limit,
      total: result.pagination.total || normalizedLogs.length,
      pages: result.pagination.pages || Math.ceil((result.pagination.total || normalizedLogs.length) / limit)
    },
    // Добавление метаданных логирования (если есть)
    metadata: result.metadata || null
  };
  
  // Сохранение в кеш
  set(cacheKey, normalizedResult);
  
  return normalizedResult;
}
```

**Результат шага 5:**
- `WebhookLogsApiService` обновлён для работы с улучшенной структурой
- Нормализация улучшенных записей реализована
- Поддержка метаданных добавлена

---

## 📊 Критерии приёмки

- [ ] Типы для метаданных логирования добавлены в `webhook-logs.js`
- [ ] Типы для улучшенной структуры логов добавлены
- [ ] Валидаторы для метаданных реализованы
- [ ] Файл `webhook-logging-client.js` создан
- [ ] Методы для получения метаданных реализованы
- [ ] Файл `logging-helpers.js` создан
- [ ] Утилиты для категоризации и форматирования реализованы
- [ ] Файл `useLoggingMetadata.js` создан
- [ ] Composable для метаданных реализован
- [ ] `WebhookLogsApiService` обновлён для работы с улучшенной структурой
- [ ] Обработка ошибок логирования улучшена
- [ ] Все изменения протестированы с реальным API
- [ ] Код соответствует стандартам ESLint
- [ ] JSDoc комментарии добавлены
- [ ] **Совместимость с Vue.js компонентами сохранена**
- [ ] **Работа с новым WebhookLoggingService на бэкенде корректна**

---

## 🔍 Проверка выполнения

**Команды для проверки:**
```bash
# Проверить синтаксис JavaScript файлов
npm run lint vue-app/src/services/webhook-logging-client.js
npm run lint vue-app/src/utils/logging-helpers.js
npm run lint vue-app/src/composables/useLoggingMetadata.js

# Запустить тесты (если есть)
npm run test vue-app/src/services/webhook-logging-client.test.js
```

**Ручное тестирование:**
1. Проверить получение метаданных логирования
2. Проверить работу с улучшенной структурой логов
3. Проверить обработку ошибок логирования
4. Проверить категоризацию событий на клиенте
5. Проверить работу composable для метаданных

---

## 🔗 Связи с другими этапами

**Зависит от:**
- **TASK-018-06:** Использует новый `WebhookLoggingService` на бэкенде
- **TASK-018-05-01:** Использует обновлённые типы и сервисы

**Зависит от него:**
- **TASK-018-06-02:** Компоненты будут использовать новые утилиты и composables

---

## 📝 История правок

- **2025-12-07 16:30 (UTC+3, Брест):** Создана задача адаптации Vue.js к новому сервису логирования

---

## 💡 Дополнительные рекомендации

1. **Производительность:**
   - Кеширование метаданных на клиенте
   - Ленивая загрузка метаданных
   - Оптимизация обновлений в реальном времени

2. **Надёжность:**
   - Обработка ошибок при получении метаданных
   - Fallback на старые данные при ошибках
   - Валидация всех данных от API

3. **Расширяемость:**
   - Легко добавлять новые метаданные
   - Конфигурируемые интервалы обновления
   - Плагинная архитектура для утилит

