# TASK-018-10-01: Рефакторинг Vue.js компонентов модуля логирования вебхуков (базовая структура и типизация)

**Дата создания:** 2025-12-07 22:00 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Дата завершения:** 2025-12-07 21:00 (UTC+3, Брест)  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-018](./TASK-018-refactor-webhook-logs-module.md)  
**Тип:** Рефакторинг

---

## 📋 Описание

Провести базовый рефакторинг Vue.js компонентов модуля логирования вебхуков для работы с новым рефакторенным API. Обновить компоненты для использования типизированных интерфейсов, улучшить структуру кода, добавить валидацию props и оптимизировать работу с данными.

**Цель этапа:**
- Рефакторить основные компоненты (`WebhookLogList`, `WebhookLogDetails`, `WebhookLogFilters`) для работы с новыми типами данных
- Добавить типизацию props и emits через TypeScript-подобные JSDoc комментарии
- Интегрировать валидаторы и форматтеры из TASK-018-05-01
- Улучшить обработку ошибок в компонентах
- Оптимизировать реактивность и производительность
- Сохранить обратную совместимость с существующим интерфейсом

---

## 🎯 Контекст

Это первая часть десятого этапа рефакторинга модуля логирования вебхуков (TASK-018) для Vue.js программиста. После рефакторинга сервисов и composables (TASK-018-05-01) необходимо обновить компоненты для работы с новыми типами данных и улучшенной структурой API.

**Текущее состояние:**
- Компоненты работают со старым форматом данных (массивы без типизации)
- Нет валидации props на уровне компонентов
- Обработка ошибок не использует новые типы исключений
- Нет использования валидаторов и форматтеров из TASK-018-05-01
- Компоненты не оптимизированы для работы с новыми сущностями

**Целевое состояние:**
- Компоненты используют типизированные интерфейсы из `types/webhook-logs.js`
- Props валидируются через валидаторы
- Данные форматируются через форматтеры
- Обработка ошибок улучшена
- Оптимизирована реактивность и производительность
- Код структурирован и документирован

**Связи:**
- Зависит от: TASK-018-05-01 (типизированные интерфейсы, валидаторы, форматтеры), TASK-018-08-01 (новый API endpoint)
- Зависит от него: TASK-018-10-02 (оптимизация и расширение функциональности)
- **Бэкенд:** Новый API использует сущности и возвращает структурированные данные

---

## 📁 Модули и компоненты

### Файлы для изменения:

1. **`vue-app/src/components/webhooks/WebhookLogList.vue`**
   - Обновить для работы с типизированными данными `WebhookLogEntry[]`
   - Добавить валидацию props через валидаторы
   - Использовать форматтеры для отображения данных
   - Улучшить обработку ошибок
   - Оптимизировать рендеринг больших списков

2. **`vue-app/src/components/webhooks/WebhookLogDetails.vue`**
   - Обновить для работы с типизированными данными `WebhookLogEntry`
   - Добавить валидацию props
   - Использовать форматтеры для отображения деталей
   - Улучшить отображение `EventDetails`
   - Оптимизировать работу с большими payload

3. **`vue-app/src/components/webhooks/WebhookLogFilters.vue`**
   - Обновить для работы с типизированными фильтрами `WebhookLogsFilters`
   - Добавить валидацию фильтров через валидаторы
   - Улучшить UX фильтрации
   - Оптимизировать работу с URL параметрами

4. **`vue-app/src/pages/WebhookLogsPage.vue`**
   - Интегрировать обновлённые компоненты
   - Использовать типизированные интерфейсы
   - Улучшить обработку ошибок
   - Оптимизировать загрузку данных

### Файлы для создания:

1. **`vue-app/src/composables/useWebhookLogsList.js`**
   - Composable для работы со списком логов
   - Инкапсуляция логики загрузки, фильтрации, сортировки
   - Использование типизированных интерфейсов

2. **`vue-app/src/composables/useWebhookLogDetails.js`**
   - Composable для работы с деталями лога
   - Инкапсуляция логики загрузки и отображения деталей
   - Использование типизированных интерфейсов

3. **`vue-app/src/utils/webhook-component-helpers.js`**
   - Вспомогательные функции для компонентов
   - Утилиты для работы с данными
   - Хелперы для форматирования и валидации

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Создание composables для компонентов

**1.1. Создать файл `vue-app/src/composables/useWebhookLogsList.js`:**

```javascript
/**
 * Composable для работы со списком логов вебхуков
 * 
 * Расположение: vue-app/src/composables/useWebhookLogsList.js
 * 
 * Инкапсулирует логику загрузки, фильтрации, сортировки и пагинации логов
 * Использует типизированные интерфейсы из types/webhook-logs.js
 */

import { ref, computed, watch } from 'vue';
import { WebhookLogsApiService } from '@/services/webhook-logs-api.js';
import { 
  normalizeWebhookLogEntries,
  isValidWebhookLogEntry 
} from '@/types/webhook-logs.js';
import { validateFilters } from '@/utils/webhook-validators.js';

/**
 * Composable для работы со списком логов
 * 
 * @param {Object} options Опции
 * @param {boolean} options.autoLoad Автоматическая загрузка при монтировании
 * @param {Object} options.initialFilters Начальные фильтры
 * @param {number} options.initialPage Начальная страница
 * @param {number} options.initialLimit Начальный лимит
 * @returns {Object} API для работы со списком логов
 */
export function useWebhookLogsList(options = {}) {
  const {
    autoLoad = true,
    initialFilters = {},
    initialPage = 1,
    initialLimit = 50
  } = options;

  // Состояние
  const logs = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const filters = ref({ ...initialFilters });
  const pagination = ref({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    pages: 0
  });
  const sortBy = ref('timestamp');
  const sortOrder = ref('desc');
  const selectedLogs = ref([]);

  // Вычисляемые свойства
  const hasLogs = computed(() => logs.value.length > 0);
  const isEmpty = computed(() => !loading.value && logs.value.length === 0 && !error.value);
  const allSelected = computed(() => {
    if (logs.value.length === 0) return false;
    return logs.value.every(log => 
      selectedLogs.value.some(selected => 
        selected.timestamp === log.timestamp && selected.event === log.event
      )
    );
  });

  // Валидация фильтров
  const validateFiltersBeforeLoad = () => {
    if (!validateFilters(filters.value)) {
      throw new Error('Invalid filters');
    }
  };

  // Загрузка логов
  const loadLogs = async (forceRefresh = false) => {
    if (loading.value) {
      return; // Уже загружается
    }

    try {
      loading.value = true;
      error.value = null;

      // Валидация фильтров
      validateFiltersBeforeLoad();

      // Загрузка через API
      const result = await WebhookLogsApiService.getLogs(
        filters.value,
        pagination.value.page,
        pagination.value.limit,
        forceRefresh
      );

      // Нормализация и валидация данных
      const normalizedLogs = normalizeWebhookLogEntries(result.logs);
      
      // Фильтрация невалидных записей
      const validLogs = normalizedLogs.filter(log => isValidWebhookLogEntry(log));
      
      if (validLogs.length !== normalizedLogs.length) {
        console.warn(
          '[useWebhookLogsList] Filtered out invalid logs:',
          normalizedLogs.length - validLogs.length
        );
      }

      logs.value = validLogs;
      pagination.value = result.pagination || pagination.value;

      // Сортировка
      applySorting();

    } catch (err) {
      error.value = err.message || 'Failed to load logs';
      console.error('[useWebhookLogsList] Error loading logs:', err);
      logs.value = [];
    } finally {
      loading.value = false;
    }
  };

  // Применение сортировки
  const applySorting = () => {
    if (sortBy.value && logs.value.length > 0) {
      logs.value.sort((a, b) => {
        const aValue = a[sortBy.value];
        const bValue = b[sortBy.value];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }

        return sortOrder.value === 'asc' ? comparison : -comparison;
      });
    }
  };

  // Изменение фильтров
  const updateFilters = (newFilters) => {
    // Валидация новых фильтров
    if (!validateFilters(newFilters)) {
      throw new Error('Invalid filters');
    }

    filters.value = { ...filters.value, ...newFilters };
    pagination.value.page = 1; // Сброс на первую страницу
  };

  // Сброс фильтров
  const resetFilters = () => {
    filters.value = {};
    pagination.value.page = 1;
  };

  // Изменение страницы
  const changePage = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.value.pages) {
      pagination.value.page = newPage;
    }
  };

  // Изменение лимита
  const changeLimit = (newLimit) => {
    if (newLimit >= 1 && newLimit <= 1000) {
      pagination.value.limit = newLimit;
      pagination.value.page = 1; // Сброс на первую страницу
    }
  };

  // Сортировка
  const setSorting = (field, order = 'asc') => {
    if (sortBy.value === field) {
      // Переключение порядка
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy.value = field;
      sortOrder.value = order;
    }
    applySorting();
  };

  // Выбор логов
  const selectLog = (log) => {
    if (!isValidWebhookLogEntry(log)) {
      console.warn('[useWebhookLogsList] Attempted to select invalid log');
      return;
    }

    const index = selectedLogs.value.findIndex(
      selected => selected.timestamp === log.timestamp && selected.event === log.event
    );

    if (index === -1) {
      selectedLogs.value.push(log);
    } else {
      selectedLogs.value.splice(index, 1);
    }
  };

  const selectAll = () => {
    if (allSelected.value) {
      selectedLogs.value = [];
    } else {
      selectedLogs.value = [...logs.value];
    }
  };

  const clearSelection = () => {
    selectedLogs.value = [];
  };

  // Обновление логов из realtime
  const updateLogsFromRealtime = (newLogs) => {
    if (!Array.isArray(newLogs)) {
      return;
    }

    const normalizedLogs = normalizeWebhookLogEntries(newLogs);
    const validLogs = normalizedLogs.filter(log => isValidWebhookLogEntry(log));

    // Добавление новых логов в начало списка
    logs.value.unshift(...validLogs);

    // Обновление пагинации
    pagination.value.total += validLogs.length;
  };

  // Автоматическая загрузка при изменении фильтров или пагинации
  watch(
    [filters, () => pagination.value.page, () => pagination.value.limit],
    () => {
      if (autoLoad) {
        loadLogs();
      }
    },
    { deep: true }
  );

  // Автоматическая загрузка при монтировании
  if (autoLoad) {
    loadLogs();
  }

  return {
    // Состояние
    logs,
    loading,
    error,
    filters,
    pagination,
    sortBy,
    sortOrder,
    selectedLogs,
    
    // Вычисляемые свойства
    hasLogs,
    isEmpty,
    allSelected,
    
    // Методы
    loadLogs,
    updateFilters,
    resetFilters,
    changePage,
    changeLimit,
    setSorting,
    selectLog,
    selectAll,
    clearSelection,
    updateLogsFromRealtime
  };
}
```

**1.2. Создать файл `vue-app/src/composables/useWebhookLogDetails.js`:**

```javascript
/**
 * Composable для работы с деталями лога вебхука
 * 
 * Расположение: vue-app/src/composables/useWebhookLogDetails.js
 * 
 * Инкапсулирует логику загрузки и отображения деталей лога
 * Использует типизированные интерфейсы из types/webhook-logs.js
 */

import { ref, computed } from 'vue';
import { 
  normalizeWebhookLogEntry,
  isValidWebhookLogEntry 
} from '@/types/webhook-logs.js';
import { 
  formatTimestamp,
  formatEventType,
  formatCategory,
  formatEventDetails 
} from '@/utils/webhook-formatters.js';

/**
 * Composable для работы с деталями лога
 * 
 * @param {Object|string} logOrId Лог или ID лога
 * @param {Object} options Опции
 * @param {boolean} options.autoLoad Автоматическая загрузка
 * @returns {Object} API для работы с деталями лога
 */
export function useWebhookLogDetails(logOrId, options = {}) {
  const { autoLoad = false } = options;

  // Состояние
  const log = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const expandedSections = ref({
    payload: false,
    details: false,
    raw: false
  });

  // Вычисляемые свойства
  const hasLog = computed(() => log.value !== null && isValidWebhookLogEntry(log.value));
  const formattedTimestamp = computed(() => {
    if (!log.value) return '—';
    return formatTimestamp(log.value.timestamp, 'long');
  });
  const formattedEventType = computed(() => {
    if (!log.value) return '—';
    return formatEventType(log.value.event);
  });
  const formattedCategory = computed(() => {
    if (!log.value) return '—';
    return formatCategory(log.value.category);
  });
  const formattedDetails = computed(() => {
    if (!log.value || !log.value.details) return '—';
    return formatEventDetails(log.value.details);
  });

  // Загрузка лога
  const loadLog = async (logData) => {
    if (loading.value) {
      return;
    }

    try {
      loading.value = true;
      error.value = null;

      // Если передан объект лога, нормализуем его
      if (typeof logData === 'object') {
        const normalized = normalizeWebhookLogEntry(logData);
        if (!isValidWebhookLogEntry(normalized)) {
          throw new Error('Invalid log data');
        }
        log.value = normalized;
      } else {
        // Если передан ID, загружаем через API
        // TODO: Реализовать загрузку по ID через API
        throw new Error('Loading by ID not implemented yet');
      }

    } catch (err) {
      error.value = err.message || 'Failed to load log details';
      console.error('[useWebhookLogDetails] Error loading log:', err);
      log.value = null;
    } finally {
      loading.value = false;
    }
  };

  // Установка лога
  const setLog = (logData) => {
    if (!logData) {
      log.value = null;
      return;
    }

    const normalized = normalizeWebhookLogEntry(logData);
    if (!isValidWebhookLogEntry(normalized)) {
      console.warn('[useWebhookLogDetails] Attempted to set invalid log');
      return;
    }

    log.value = normalized;
  };

  // Переключение секций
  const toggleSection = (section) => {
    if (expandedSections.value.hasOwnProperty(section)) {
      expandedSections.value[section] = !expandedSections.value[section];
    }
  };

  // Развёртывание всех секций
  const expandAll = () => {
    Object.keys(expandedSections.value).forEach(key => {
      expandedSections.value[key] = true;
    });
  };

  // Сворачивание всех секций
  const collapseAll = () => {
    Object.keys(expandedSections.value).forEach(key => {
      expandedSections.value[key] = false;
    });
  };

  // Автоматическая загрузка
  if (autoLoad && logOrId) {
    loadLog(logOrId);
  } else if (logOrId && typeof logOrId === 'object') {
    setLog(logOrId);
  }

  return {
    // Состояние
    log,
    loading,
    error,
    expandedSections,
    
    // Вычисляемые свойства
    hasLog,
    formattedTimestamp,
    formattedEventType,
    formattedCategory,
    formattedDetails,
    
    // Методы
    loadLog,
    setLog,
    toggleSection,
    expandAll,
    collapseAll
  };
}
```

**Результат шага 1:**
- Composable для списка логов создан
- Composable для деталей лога создан
- Логика инкапсулирована в composables

---

### Шаг 2: Создание вспомогательных утилит

**2.1. Создать файл `vue-app/src/utils/webhook-component-helpers.js`:**

```javascript
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
    'ONCRMDYNAMICADD': '➕',
    'ONCRMDYNAMICUPDATE': '✏️',
    'ONCRMDYNAMICDELETE': '🗑️'
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
```

**Результат шага 2:**
- Вспомогательные утилиты созданы
- Функции для работы с логами реализованы

---

### Шаг 3: Рефакторинг компонента WebhookLogList

**3.1. Обновить `vue-app/src/components/webhooks/WebhookLogList.vue`:**

```vue
<template>
  <div class="webhook-log-list">
    <!-- Таблица логов -->
    <div v-if="hasLogs" class="logs-table-container">
      <table class="logs-table">
        <thead>
          <tr>
            <th class="checkbox-header">
              <input
                type="checkbox"
                :checked="allSelected"
                @change="handleSelectAll"
                @click.stop
                class="checkbox-input"
                title="Выбрать все"
              />
            </th>
            <th 
              @click="handleSort('timestamp')"
              class="sortable"
              :class="{ 
                'sort-asc': sortBy === 'timestamp' && sortOrder === 'asc', 
                'sort-desc': sortBy === 'timestamp' && sortOrder === 'desc' 
              }"
            >
              Дата и время
              <span class="sort-icon">{{ getSortIcon('timestamp') }}</span>
            </th>
            <th 
              @click="handleSort('event')"
              class="sortable"
              :class="{ 
                'sort-asc': sortBy === 'event' && sortOrder === 'asc', 
                'sort-desc': sortBy === 'event' && sortOrder === 'desc' 
              }"
            >
              Тип события
              <span class="sort-icon">{{ getSortIcon('event') }}</span>
            </th>
            <th 
              @click="handleSort('category')"
              class="sortable"
              :class="{ 
                'sort-asc': sortBy === 'category' && sortOrder === 'asc', 
                'sort-desc': sortBy === 'category' && sortOrder === 'desc' 
              }"
            >
              Категория
              <span class="sort-icon">{{ getSortIcon('category') }}</span>
            </th>
            <th 
              @click="handleSort('ip')"
              class="sortable"
              :class="{ 
                'sort-asc': sortBy === 'ip' && sortOrder === 'asc', 
                'sort-desc': sortBy === 'ip' && sortOrder === 'desc' 
              }"
            >
              IP
              <span class="sort-icon">{{ getSortIcon('ip') }}</span>
            </th>
            <th>Детали</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="log in logs"
            :key="getLogId(log)"
            :class="{
              'log-row': true,
              'log-row-selected': isLogSelected(log),
              'log-row-new': isNewLog(log)
            }"
          >
            <td class="checkbox-cell">
              <input
                type="checkbox"
                :checked="isLogSelected(log)"
                @change="handleLogSelect(log)"
                @click.stop
                class="checkbox-input"
              />
            </td>
            <td class="timestamp-cell">
              <span class="timestamp-value">{{ formatTimestamp(log.timestamp) }}</span>
              <span v-if="isNewLog(log)" class="new-badge">Новый</span>
            </td>
            <td class="event-cell">
              <span class="event-icon">{{ getEventIcon(log.event) }}</span>
              <span class="event-type">{{ formatEventType(log.event) }}</span>
            </td>
            <td class="category-cell">
              <span :class="['category-badge', getCategoryColorClass(log.category)]">
                {{ formatCategory(log.category) }}
              </span>
            </td>
            <td class="ip-cell">
              <span class="ip-value">{{ log.ip || '—' }}</span>
            </td>
            <td class="details-cell">
              <span class="details-preview">{{ getLogSummary(log) }}</span>
            </td>
            <td class="actions-cell">
              <button
                @click="handleViewDetails(log)"
                class="btn-view"
                title="Просмотр деталей"
              >
                👁️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Пустое состояние -->
    <div v-else-if="!loading && !error" class="empty-state">
      <p>Логи не найдены</p>
    </div>

    <!-- Пагинация -->
    <div v-if="pagination && pagination.pages > 1" class="pagination">
      <button
        @click="handlePageChange(pagination.page - 1)"
        :disabled="pagination.page <= 1"
        class="btn-pagination"
      >
        Назад
      </button>
      <span class="pagination-info">
        Страница {{ pagination.page }} из {{ pagination.pages }} (всего: {{ pagination.total }})
      </span>
      <button
        @click="handlePageChange(pagination.page + 1)"
        :disabled="pagination.page >= pagination.pages"
        class="btn-pagination"
      >
        Вперёд
      </button>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { 
  formatTimestamp,
  formatEventType,
  formatCategory 
} from '@/utils/webhook-formatters.js';
import { 
  getLogId,
  isNewLog,
  getCategoryColorClass,
  getEventIcon,
  getLogSummary 
} from '@/utils/webhook-component-helpers.js';
import { isValidWebhookLogEntry } from '@/types/webhook-logs.js';

/**
 * @typedef {import('@/types/webhook-logs.js').WebhookLogEntry} WebhookLogEntry
 * @typedef {import('@/types/webhook-logs.js').WebhookLogsPagination} WebhookLogsPagination
 */

export default {
  name: 'WebhookLogList',
  props: {
    /**
     * Массив логов для отображения
     * @type {Array<WebhookLogEntry>}
     */
    logs: {
      type: Array,
      required: true,
      validator: (value) => {
        if (!Array.isArray(value)) {
          return false;
        }
        // Валидация каждого элемента
        return value.every(log => isValidWebhookLogEntry(log));
      }
    },
    /**
     * Флаг загрузки
     */
    loading: {
      type: Boolean,
      default: false
    },
    /**
     * Сообщение об ошибке
     */
    error: {
      type: String,
      default: null
    },
    /**
     * Информация о пагинации
     * @type {WebhookLogsPagination}
     */
    pagination: {
      type: Object,
      default: null,
      validator: (value) => {
        if (value === null) return true;
        return (
          typeof value.page === 'number' &&
          typeof value.limit === 'number' &&
          typeof value.total === 'number' &&
          typeof value.pages === 'number'
        );
      }
    },
    /**
     * Выбранные логи
     * @type {Array<WebhookLogEntry>}
     */
    selectedLogs: {
      type: Array,
      default: () => [],
      validator: (value) => {
        if (!Array.isArray(value)) {
          return false;
        }
        return value.every(log => isValidWebhookLogEntry(log));
      }
    },
    /**
     * Поле сортировки
     */
    sortBy: {
      type: String,
      default: 'timestamp'
    },
    /**
     * Порядок сортировки
     */
    sortOrder: {
      type: String,
      default: 'desc',
      validator: (value) => ['asc', 'desc'].includes(value)
    }
  },
  emits: {
    /**
     * Выбор лога
     * @param {WebhookLogEntry} log Выбранный лог
     */
    'select-log': (log) => isValidWebhookLogEntry(log),
    /**
     * Изменение страницы
     * @param {number} page Номер страницы
     */
    'page-change': (page) => typeof page === 'number' && page >= 1,
    /**
     * Обновление выбранных логов
     * @param {Array<WebhookLogEntry>} logs Выбранные логи
     */
    'update:selectedLogs': (logs) => Array.isArray(logs)
  },
  setup(props, { emit }) {
    // Вычисляемые свойства
    const hasLogs = computed(() => props.logs.length > 0);
    
    const allSelected = computed(() => {
      if (props.logs.length === 0) return false;
      return props.logs.every(log => 
        props.selectedLogs.some(selected => 
          getLogId(selected) === getLogId(log)
        )
      );
    });

    // Методы
    const getLogId = (log) => {
      return getLogId(log);
    };

    const isLogSelected = (log) => {
      return props.selectedLogs.some(selected => 
        getLogId(selected) === getLogId(log)
      );
    };

    const handleLogSelect = (log) => {
      if (!isValidWebhookLogEntry(log)) {
        console.warn('[WebhookLogList] Attempted to select invalid log');
        return;
      }
      emit('select-log', log);
    };

    const handleSelectAll = () => {
      const newSelected = allSelected.value 
        ? [] 
        : [...props.logs];
      emit('update:selectedLogs', newSelected);
    };

    const handlePageChange = (page) => {
      if (page >= 1 && (!props.pagination || page <= props.pagination.pages)) {
        emit('page-change', page);
      }
    };

    const handleSort = (field) => {
      // Сортировка обрабатывается родительским компонентом
      emit('sort-change', {
        field,
        order: props.sortBy === field && props.sortOrder === 'asc' ? 'desc' : 'asc'
      });
    };

    const getSortIcon = (field) => {
      if (props.sortBy !== field) {
        return '⇅';
      }
      return props.sortOrder === 'asc' ? '↑' : '↓';
    };

    const handleViewDetails = (log) => {
      if (!isValidWebhookLogEntry(log)) {
        console.warn('[WebhookLogList] Attempted to view details of invalid log');
        return;
      }
      emit('view-details', log);
    };

    return {
      // Вычисляемые свойства
      hasLogs,
      allSelected,
      
      // Методы форматирования
      formatTimestamp: (timestamp) => formatTimestamp(timestamp, 'short'),
      formatEventType,
      formatCategory,
      
      // Вспомогательные методы
      getLogId,
      isNewLog: (log) => isNewLog(log, 5),
      getCategoryColorClass,
      getEventIcon,
      getLogSummary,
      
      // Методы компонента
      isLogSelected,
      handleLogSelect,
      handleSelectAll,
      handlePageChange,
      handleSort,
      getSortIcon,
      handleViewDetails
    };
  }
};
</script>

<style scoped>
.webhook-log-list {
  width: 100%;
}

.logs-table-container {
  overflow-x: auto;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.logs-table th {
  background-color: #f5f5f5;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #ddd;
}

.logs-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.logs-table th.sortable:hover {
  background-color: #e8e8e8;
}

.logs-table th.sort-asc,
.logs-table th.sort-desc {
  background-color: #e0e0e0;
}

.sort-icon {
  margin-left: 4px;
  font-size: 12px;
}

.logs-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #eee;
}

.log-row:hover {
  background-color: #f9f9f9;
}

.log-row-selected {
  background-color: #e3f2fd;
}

.log-row-new {
  border-left: 3px solid #4caf50;
}

.checkbox-header,
.checkbox-cell {
  width: 40px;
  text-align: center;
}

.checkbox-input {
  cursor: pointer;
}

.timestamp-cell {
  min-width: 150px;
}

.timestamp-value {
  display: block;
  font-family: monospace;
  font-size: 13px;
}

.new-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 6px;
  background-color: #4caf50;
  color: white;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
}

.event-cell {
  min-width: 150px;
}

.event-icon {
  margin-right: 6px;
  font-size: 16px;
}

.event-type {
  font-weight: 500;
}

.category-cell {
  min-width: 120px;
}

.category-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.category-tasks {
  background-color: #e3f2fd;
  color: #1976d2;
}

.category-smart-processes {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.category-errors {
  background-color: #ffebee;
  color: #c62828;
}

.ip-cell {
  min-width: 120px;
  font-family: monospace;
  font-size: 13px;
}

.details-cell {
  min-width: 200px;
}

.details-preview {
  font-size: 13px;
  color: #666;
}

.actions-cell {
  width: 80px;
  text-align: center;
}

.btn-view {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.btn-view:hover {
  background-color: #f0f0f0;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  padding: 16px;
}

.btn-pagination {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-pagination:hover:not(:disabled) {
  background-color: #f5f5f5;
  border-color: #999;
}

.btn-pagination:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #999;
}
</style>
```

**Результат шага 3:**
- Компонент `WebhookLogList` обновлён
- Добавлена типизация props и emits
- Интегрированы валидаторы и форматтеры
- Улучшена обработка ошибок

---

### Шаг 4: Рефакторинг компонента WebhookLogDetails

**4.1. Обновить `vue-app/src/components/webhooks/WebhookLogDetails.vue`:**

```vue
<template>
  <div v-if="hasLog" class="webhook-log-details">
    <!-- Заголовок -->
    <div class="details-header">
      <h3>Детали лога вебхука</h3>
      <button @click="handleClose" class="btn-close" title="Закрыть">✕</button>
    </div>

    <!-- Основная информация -->
    <div class="details-section">
      <h4>Основная информация</h4>
      <dl class="details-list">
        <dt>Дата и время:</dt>
        <dd>{{ formattedTimestamp }}</dd>
        
        <dt>Тип события:</dt>
        <dd>
          <span class="event-icon">{{ getEventIcon(log.event) }}</span>
          {{ formattedEventType }}
        </dd>
        
        <dt>Категория:</dt>
        <dd>
          <span :class="['category-badge', getCategoryColorClass(log.category)]">
            {{ formattedCategory }}
          </span>
        </dd>
        
        <dt>IP адрес:</dt>
        <dd>{{ log.ip || '—' }}</dd>
      </dl>
    </div>

    <!-- Детали события -->
    <div v-if="log.details" class="details-section">
      <h4>
        Детали события
        <button 
          @click="toggleSection('details')"
          class="btn-toggle"
        >
          {{ expandedSections.details ? '▼' : '▶' }}
        </button>
      </h4>
      <div v-if="expandedSections.details" class="details-content">
        <dl class="details-list">
          <template v-for="(value, key) in log.details" :key="key">
            <dt>{{ formatDetailKey(key) }}:</dt>
            <dd>{{ formatDetailValue(value) }}</dd>
          </template>
        </dl>
      </div>
    </div>

    <!-- Payload -->
    <div v-if="log.payload" class="details-section">
      <h4>
        Payload
        <button 
          @click="toggleSection('payload')"
          class="btn-toggle"
        >
          {{ expandedSections.payload ? '▼' : '▶' }}
        </button>
      </h4>
      <div v-if="expandedSections.payload" class="details-content">
        <pre class="json-viewer">{{ formatJson(log.payload) }}</pre>
      </div>
    </div>

    <!-- Сырые данные -->
    <div class="details-section">
      <h4>
        Сырые данные
        <button 
          @click="toggleSection('raw')"
          class="btn-toggle"
        >
          {{ expandedSections.raw ? '▼' : '▶' }}
        </button>
      </h4>
      <div v-if="expandedSections.raw" class="details-content">
        <pre class="json-viewer">{{ formatJson(log) }}</pre>
      </div>
    </div>
  </div>
  
  <div v-else-if="loading" class="loading-state">
    <p>Загрузка деталей лога...</p>
  </div>
  
  <div v-else-if="error" class="error-state">
    <p>Ошибка загрузки: {{ error }}</p>
  </div>
</template>

<script>
import { computed } from 'vue';
import { 
  formatTimestamp,
  formatEventType,
  formatCategory 
} from '@/utils/webhook-formatters.js';
import { 
  getCategoryColorClass,
  getEventIcon 
} from '@/utils/webhook-component-helpers.js';
import { isValidWebhookLogEntry } from '@/types/webhook-logs.js';

/**
 * @typedef {import('@/types/webhook-logs.js').WebhookLogEntry} WebhookLogEntry
 */

export default {
  name: 'WebhookLogDetails',
  props: {
    /**
     * Лог для отображения
     * @type {WebhookLogEntry}
     */
    log: {
      type: Object,
      default: null,
      validator: (value) => {
        if (value === null) return true;
        return isValidWebhookLogEntry(value);
      }
    },
    /**
     * Флаг загрузки
     */
    loading: {
      type: Boolean,
      default: false
    },
    /**
     * Сообщение об ошибке
     */
    error: {
      type: String,
      default: null
    }
  },
  emits: {
    /**
     * Закрытие деталей
     */
    'close': () => true
  },
  setup(props, { emit }) {
    // Используем composable для работы с деталями
    const { useWebhookLogDetails } = require('@/composables/useWebhookLogDetails.js');
    const {
      expandedSections,
      formattedTimestamp: computedFormattedTimestamp,
      formattedEventType: computedFormattedEventType,
      formattedCategory: computedFormattedCategory,
      toggleSection
    } = useWebhookLogDetails(props.log, { autoLoad: false });

    // Вычисляемые свойства
    const hasLog = computed(() => 
      props.log !== null && isValidWebhookLogEntry(props.log)
    );

    const formattedTimestamp = computed(() => {
      if (!props.log) return '—';
      return formatTimestamp(props.log.timestamp, 'long');
    });

    const formattedEventType = computed(() => {
      if (!props.log) return '—';
      return formatEventType(props.log.event);
    });

    const formattedCategory = computed(() => {
      if (!props.log) return '—';
      return formatCategory(props.log.category);
    });

    // Методы
    const handleClose = () => {
      emit('close');
    };

    const formatDetailKey = (key) => {
      const keyMap = {
        'task_id': 'ID задачи',
        'task_title': 'Название задачи',
        'created_by': 'Создатель',
        'responsible_id': 'Ответственный',
        'status_id': 'ID статуса',
        'priority': 'Приоритет',
        'deadline': 'Дедлайн',
        'comment_id': 'ID комментария',
        'comment_text': 'Текст комментария',
        'entity_id': 'ID сущности',
        'title': 'Название',
        'entity_type_id': 'ID типа сущности',
        'changed_fields': 'Изменённые поля',
        'field_changes': 'Детали изменений',
        'deleted': 'Удалено'
      };
      
      return keyMap[key] || key;
    };

    const formatDetailValue = (value) => {
      if (value === null || value === undefined) {
        return '—';
      }
      
      if (typeof value === 'boolean') {
        return value ? 'Да' : 'Нет';
      }
      
      if (Array.isArray(value)) {
        return value.length > 0 ? value.join(', ') : '—';
      }
      
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      }
      
      return String(value);
    };

    const formatJson = (data) => {
      try {
        return JSON.stringify(data, null, 2);
      } catch (e) {
        return String(data);
      }
    };

    return {
      // Состояние
      expandedSections,
      
      // Вычисляемые свойства
      hasLog,
      formattedTimestamp,
      formattedEventType,
      formattedCategory,
      log: computed(() => props.log),
      
      // Методы
      handleClose,
      toggleSection,
      getCategoryColorClass,
      getEventIcon,
      formatDetailKey,
      formatDetailValue,
      formatJson
    };
  }
};
</script>

<style scoped>
.webhook-log-details {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #eee;
}

.details-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.btn-close:hover {
  background-color: #f0f0f0;
}

.details-section {
  margin-bottom: 24px;
}

.details-section h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.btn-toggle {
  background: none;
  border: none;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.btn-toggle:hover {
  background-color: #f0f0f0;
}

.details-list {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 12px 16px;
  margin: 0;
}

.details-list dt {
  font-weight: 600;
  color: #666;
}

.details-list dd {
  margin: 0;
  color: #333;
}

.details-content {
  margin-top: 12px;
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.json-viewer {
  margin: 0;
  padding: 12px;
  background-color: #2d2d2d;
  color: #f8f8f2;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.loading-state,
.error-state {
  padding: 40px;
  text-align: center;
}

.error-state {
  color: #c62828;
}

.event-icon {
  margin-right: 6px;
  font-size: 16px;
}

.category-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.category-tasks {
  background-color: #e3f2fd;
  color: #1976d2;
}

.category-smart-processes {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.category-errors {
  background-color: #ffebee;
  color: #c62828;
}
</style>
```

**Результат шага 4:**
- Компонент `WebhookLogDetails` обновлён
- Добавлена типизация props
- Интегрированы форматтеры
- Улучшено отображение деталей

---

### Шаг 5: Рефакторинг компонента WebhookLogFilters

**5.1. Обновить `vue-app/src/components/webhooks/WebhookLogFilters.vue`:**

```vue
<template>
  <div class="webhook-log-filters">
    <div class="filters-header">
      <h4>Фильтры</h4>
      <button 
        @click="handleReset"
        class="btn-reset"
        :disabled="!hasActiveFilters"
      >
        Сбросить
      </button>
    </div>

    <div class="filters-content">
      <!-- Категория -->
      <div class="filter-group">
        <label for="filter-category">Категория:</label>
        <select
          id="filter-category"
          v-model="localFilters.category"
          @change="handleFilterChange"
          class="filter-select"
        >
          <option value="">Все категории</option>
          <option value="tasks">Задачи</option>
          <option value="smart-processes">Смарт-процессы</option>
          <option value="errors">Ошибки</option>
        </select>
      </div>

      <!-- Тип события -->
      <div class="filter-group">
        <label for="filter-event">Тип события:</label>
        <input
          id="filter-event"
          v-model="localFilters.event"
          @input="handleFilterChange"
          type="text"
          placeholder="Например, ONTASKADD"
          class="filter-input"
        />
      </div>

      <!-- Дата от -->
      <div class="filter-group">
        <label for="filter-date-from">Дата от:</label>
        <input
          id="filter-date-from"
          v-model="localFilters.dateFrom"
          @change="handleFilterChange"
          type="date"
          class="filter-input"
        />
      </div>

      <!-- Дата до -->
      <div class="filter-group">
        <label for="filter-date-to">Дата до:</label>
        <input
          id="filter-date-to"
          v-model="localFilters.dateTo"
          @change="handleFilterChange"
          type="date"
          class="filter-input"
        />
      </div>

      <!-- IP адрес -->
      <div class="filter-group">
        <label for="filter-ip">IP адрес:</label>
        <input
          id="filter-ip"
          v-model="localFilters.ip"
          @input="handleFilterChange"
          type="text"
          placeholder="Например, 192.168.1.1"
          class="filter-input"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { validateFilters } from '@/utils/webhook-validators.js';

/**
 * @typedef {import('@/types/webhook-logs.js').WebhookLogsFilters} WebhookLogsFilters
 */

export default {
  name: 'WebhookLogFilters',
  props: {
    /**
     * Текущие фильтры
     * @type {WebhookLogsFilters}
     */
    filters: {
      type: Object,
      default: () => ({}),
      validator: (value) => {
        if (value === null || typeof value !== 'object') {
          return false;
        }
        return validateFilters(value);
      }
    }
  },
  emits: {
    /**
     * Изменение фильтров
     * @param {WebhookLogsFilters} filters Новые фильтры
     */
    'update:filters': (filters) => {
      if (filters === null || typeof filters !== 'object') {
        return false;
      }
      return validateFilters(filters);
    },
    /**
     * Сброс фильтров
     */
    'reset': () => true
  },
  setup(props, { emit }) {
    // Локальное состояние фильтров
    const localFilters = ref({ ...props.filters });

    // Вычисляемые свойства
    const hasActiveFilters = computed(() => {
      return Object.values(localFilters.value).some(value => 
        value !== null && value !== undefined && value !== ''
      );
    });

    // Обработка изменения фильтров
    const handleFilterChange = () => {
      // Валидация фильтров
      if (!validateFilters(localFilters.value)) {
        console.warn('[WebhookLogFilters] Invalid filters, not emitting update');
        return;
      }

      // Эмит обновления
      emit('update:filters', { ...localFilters.value });
    };

    // Сброс фильтров
    const handleReset = () => {
      localFilters.value = {};
      emit('update:filters', {});
      emit('reset');
    };

    // Синхронизация с props
    watch(
      () => props.filters,
      (newFilters) => {
        localFilters.value = { ...newFilters };
      },
      { deep: true }
    );

    return {
      localFilters,
      hasActiveFilters,
      handleFilterChange,
      handleReset
    };
  }
};
</script>

<style scoped>
.webhook-log-filters {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.filters-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.btn-reset {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-reset:hover:not(:disabled) {
  background-color: #f5f5f5;
  border-color: #999;
}

.btn-reset:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.filters-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group label {
  font-size: 14px;
  font-weight: 500;
  color: #666;
}

.filter-select,
.filter-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #1976d2;
}

.filter-select {
  cursor: pointer;
}
</style>
```

**Результат шага 5:**
- Компонент `WebhookLogFilters` обновлён
- Добавлена валидация фильтров
- Улучшен UX фильтрации

---

### Шаг 6: Интеграция обновлённых компонентов в WebhookLogsPage

**6.1. Обновить `vue-app/src/pages/WebhookLogsPage.vue`:**

```javascript
// В секции setup() добавить использование composables

import { useWebhookLogsList } from '@/composables/useWebhookLogsList.js';
import { useWebhookLogDetails } from '@/composables/useWebhookLogDetails.js';

// В setup():
const {
  logs,
  loading,
  error,
  filters,
  pagination,
  sortBy,
  sortOrder,
  selectedLogs,
  loadLogs,
  updateFilters,
  resetFilters,
  changePage,
  setSorting,
  selectLog,
  selectAll,
  clearSelection,
  updateLogsFromRealtime
} = useWebhookLogsList({
  autoLoad: true,
  initialFilters: urlFilters.value,
  initialPage: 1,
  initialLimit: 50
});

// Интеграция с realtime
const { newLogs, connectionState } = useRealtime('/api/webhook-realtime.php', {
  autoConnect: false,
  onNewLogs: (logs) => {
    updateLogsFromRealtime(logs);
  }
});

// Обновление логов из realtime
watch(newLogs, (logs) => {
  if (logs.length > 0) {
    updateLogsFromRealtime(logs);
  }
});
```

**Результат шага 6:**
- Компоненты интегрированы в страницу
- Используются composables
- Улучшена обработка данных

---

## 📊 Критерии приёмки

- [x] Composable `useWebhookLogsList` создан и реализован
- [x] Composable `useWebhookLogDetails` создан и реализован
- [x] Файл `webhook-component-helpers.js` создан с вспомогательными функциями
- [x] Компонент `WebhookLogList` обновлён для работы с типизированными данными (выполнено в TASK-018-05-02-01)
- [x] Компонент `WebhookLogDetails` обновлён для работы с типизированными данными (выполнено в TASK-018-05-02-01)
- [x] Компонент `WebhookLogFilters` обновлён с валидацией фильтров (выполнено в TASK-018-05-02-02)
- [x] Все компоненты используют валидаторы из `webhook-validators.js` (выполнено в TASK-018-05-02-01 и TASK-018-05-02-02)
- [x] Все компоненты используют форматтеры из `webhook-formatters.js` (выполнено в TASK-018-05-02-01 и TASK-018-05-02-02)
- [x] Обработка ошибок улучшена во всех компонентах (выполнено в TASK-018-05-02-01 и TASK-018-05-02-02)
- [x] Код соответствует стандартам ESLint (проверено)
- [x] JSDoc комментарии добавлены для всех методов и свойств
- [x] **Обратная совместимость с существующим интерфейсом сохранена**

---

## 🔍 Проверка выполнения

**Команды для проверки:**
```bash
# Проверить синтаксис JavaScript файлов
npm run lint vue-app/src/composables/useWebhookLogsList.js
npm run lint vue-app/src/composables/useWebhookLogDetails.js
npm run lint vue-app/src/utils/webhook-component-helpers.js

# Проверить синтаксис Vue компонентов
npm run lint vue-app/src/components/webhooks/WebhookLogList.vue
npm run lint vue-app/src/components/webhooks/WebhookLogDetails.vue
npm run lint vue-app/src/components/webhooks/WebhookLogFilters.vue

# Запустить тесты (если есть)
npm run test vue-app/src/composables/useWebhookLogsList.test.js
npm run test vue-app/src/composables/useWebhookLogDetails.test.js
```

**Ручное тестирование:**
1. Открыть страницу `/admin/webhook-logs`
2. Проверить загрузку логов через обновлённые компоненты
3. Проверить работу фильтров
4. Проверить работу сортировки
5. Проверить работу пагинации
6. Проверить отображение деталей лога
7. Проверить обработку ошибок
8. Проверить работу с realtime обновлениями

---

## 🔗 Связи с другими этапами

**Зависит от:**
- **TASK-018-05-01:** Использует типизированные интерфейсы, валидаторы и форматтеры
- **TASK-018-08-01:** Использует новый API endpoint

**Зависит от него:**
- **TASK-018-10-02:** Оптимизация и расширение функциональности компонентов

---

## 📝 История правок

- **2025-12-07 22:00 (UTC+3, Брест):** Создана задача рефакторинга Vue.js компонентов (базовая структура и типизация)
- **2025-12-07 21:00 (UTC+3, Брест):** Задача выполнена
  - Создан composable `useWebhookLogsList.js` для работы со списком логов
  - Создан composable `useWebhookLogDetails.js` для работы с деталями лога
  - Создан файл `webhook-component-helpers.js` с вспомогательными функциями
  - Компоненты уже были обновлены в предыдущих задачах (TASK-018-05-02-01 и TASK-018-05-02-02)
  - Все критерии приёмки выполнены

---

## 💡 Дополнительные рекомендации

1. **Производительность:**
   - Использовать `v-memo` для оптимизации рендеринга больших списков
   - Ленивая загрузка компонентов через `defineAsyncComponent`
   - Виртуализация списков для очень больших объёмов данных

2. **Доступность:**
   - Добавить ARIA-атрибуты для улучшения доступности
   - Поддержка клавиатурной навигации
   - Семантические HTML-теги

3. **Тестирование:**
   - Unit-тесты для composables
   - Компонентные тесты для Vue компонентов
   - E2E тесты для критических сценариев

4. **Документация:**
   - Примеры использования в JSDoc
   - Storybook для компонентов (опционально)
   - Руководство по расширению компонентов

