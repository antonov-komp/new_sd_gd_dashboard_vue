# TASK-017-03: Добавление поиска и расширенных фильтров

**Дата создания:** 2025-12-07 05:25 (UTC+3, Брест)  
**Дата завершения:** 2025-12-07 11:15 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-017](./TASK-017-webhook-logs-ui-implementation-plan.md)

---

## 📋 Описание

Добавить полнотекстовый поиск по содержимому логов, расширенные фильтры (IP-адрес, временной диапазон), сохранение фильтров в URL, быстрые фильтры для популярных периодов, фильтр по статусу обработки.

---

## 🎯 Контекст

Этап 3 из глобального плана TASK-017. Необходимо расширить возможности фильтрации и поиска для удобной работы с большими объёмами логов.

---

## 📁 Модули и компоненты

- `vue-app/src/components/webhooks/WebhookLogFilters.vue` — расширение фильтров
- `vue-app/src/components/webhooks/WebhookLogSearch.vue` — новый компонент поиска
- `vue-app/src/pages/WebhookLogsPage.vue` — интеграция поиска и фильтров
- `vue-app/src/services/webhook-logs-api.js` — расширение API для поиска (если нужен серверный поиск)

---

## 🔗 Зависимости

**От других задач:**
- **TASK-017-02** — базовые компоненты должны быть улучшены

**От модулей:**
- Vue Router для работы с query parameters

---

## 📝 Ступенчатые подзадачи

### 1. Реализация полнотекстового поиска

1.1. Создать компонент `WebhookLogSearch.vue`
1.2. Реализовать поиск по полям: event, payload, details, IP
1.3. Добавить debounce для оптимизации (300-500ms)
1.4. Реализовать подсветку найденных совпадений
1.5. Добавить очистку поиска

### 2. Расширенные фильтры

2.1. Добавить фильтр по IP-адресу
2.2. Добавить фильтр по временному диапазону (от-до)
2.3. Добавить фильтр по статусу (успех, ошибка, предупреждение)
2.4. Добавить фильтр по размеру payload
2.5. Улучшить UI расширенных фильтров (аккордеон или вкладки)

### 3. Быстрые фильтры

3.1. Добавить кнопки: "Сегодня", "Вчера", "Последние 7 дней", "Последние 30 дней"
3.2. Реализовать автоматическую установку дат при выборе
3.3. Добавить визуальное выделение активного быстрого фильтра

### 4. Сохранение фильтров в URL

4.1. Синхронизировать фильтры с query parameters
4.2. При загрузке страницы восстанавливать фильтры из URL
4.3. Обновлять URL при изменении фильтров
4.4. Обеспечить возможность делиться ссылкой с применёнными фильтрами

---

## ⚙️ Технические требования

### 1. Создание утилиты debounce

**Перед созданием компонента поиска необходимо создать утилиту debounce:**

**1.1. Создать файл `vue-app/src/utils/debounce.js`:**
```javascript
/**
 * Утилита для debounce функции
 * 
 * @param {Function} func - Функция для debounce
 * @param {number} wait - Время ожидания в миллисекундах
 * @param {boolean} immediate - Выполнить немедленно при первом вызове
 * @returns {Function} Debounced функция
 */
export function debounce(func, wait = 300, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * Утилита для throttle функции
 * 
 * @param {Function} func - Функция для throttle
 * @param {number} limit - Лимит времени в миллисекундах
 * @returns {Function} Throttled функция
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
```

### 2. Компонент поиска

**2.1. Создать файл `vue-app/src/components/webhooks/WebhookLogSearch.vue`:**

```vue
<template>
  <div class="webhook-search">
    <div class="search-wrapper">
      <span class="search-icon">🔍</span>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Поиск по содержимому логов (событие, payload, IP, детали)..."
        class="search-input"
        @input="handleSearchInput"
        @keyup.enter="handleSearch"
        @keyup.esc="clearSearch"
      />
      <button
        v-if="searchQuery"
        @click="clearSearch"
        class="clear-button"
        title="Очистить поиск (Esc)"
        aria-label="Очистить поиск"
      >
        ✕
      </button>
    </div>
    
    <!-- Индикатор поиска -->
    <div v-if="isSearching" class="search-indicator">
      <span class="spinner"></span>
      Поиск...
    </div>
    
    <!-- Результаты поиска -->
    <div v-if="searchQuery && searchResultsCount !== null" class="search-results">
      Найдено: {{ searchResultsCount }} {{ getResultsText(searchResultsCount) }}
    </div>
  </div>
</template>

<script>
import { ref, watch, onUnmounted } from 'vue';
import { debounce } from '@/utils/debounce.js';

export default {
  name: 'WebhookLogSearch',
  props: {
    modelValue: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue', 'search'],
  setup(props, { emit }) {
    const searchQuery = ref(props.modelValue || '');
    const isSearching = ref(false);
    const searchResultsCount = ref(null);
    
    // Debounced функция поиска
    const debouncedSearch = debounce((value) => {
      isSearching.value = false;
      emit('search', value);
    }, 400);
    
    // Обработчик ввода
    const handleSearchInput = () => {
      isSearching.value = true;
      emit('update:modelValue', searchQuery.value);
      debouncedSearch(searchQuery.value);
    };
    
    // Немедленный поиск (при нажатии Enter)
    const handleSearch = () => {
      isSearching.value = false;
      emit('search', searchQuery.value);
    };
    
    // Очистка поиска
    const clearSearch = () => {
      searchQuery.value = '';
      isSearching.value = false;
      searchResultsCount.value = null;
      emit('update:modelValue', '');
      emit('search', '');
    };
    
    // Синхронизация с props
    watch(() => props.modelValue, (newValue) => {
      if (newValue !== searchQuery.value) {
        searchQuery.value = newValue;
      }
    });
    
    // Установка количества результатов (извне)
    const setResultsCount = (count) => {
      searchResultsCount.value = count;
    };
    
    // Форматирование текста результатов
    const getResultsText = (count) => {
      const lastDigit = count % 10;
      const lastTwoDigits = count % 100;
      
      if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        return 'записей';
      }
      if (lastDigit === 1) {
        return 'запись';
      }
      if (lastDigit >= 2 && lastDigit <= 4) {
        return 'записи';
      }
      return 'записей';
    };
    
    // Экспорт метода для установки количества результатов
    return {
      searchQuery,
      isSearching,
      searchResultsCount,
      handleSearchInput,
      handleSearch,
      clearSearch,
      getResultsText,
      setResultsCount
    };
  }
};
</script>

<style scoped>
.webhook-search {
  margin-bottom: 20px;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  font-size: 18px;
  color: #6c757d;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 40px 10px 40px;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.clear-button {
  position: absolute;
  right: 8px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.clear-button:hover {
  background: #5a6268;
}

.search-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 13px;
  color: #6c757d;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.search-results {
  margin-top: 8px;
  font-size: 13px;
  color: #28a745;
  font-weight: 500;
}

@media (max-width: 768px) {
  .search-input {
    font-size: 16px; /* Предотвращает zoom на iOS */
  }
}
</style>
```

**2.2. Использование компонента в WebhookLogsPage.vue:**
```vue
<template>
  <div class="webhook-logs-page">
    <!-- ... header ... -->
    
    <div v-else class="page-content">
      <!-- Компонент поиска -->
      <WebhookLogSearch
        v-model="searchQuery"
        @search="handleSearch"
        ref="searchComponent"
      />
      
      <!-- Фильтры -->
      <WebhookLogFilters
        :filters="filters"
        @update:filters="handleFiltersUpdate"
        @reset="handleFiltersReset"
      />
      
      <!-- Список логов (с применённым поиском) -->
      <WebhookLogList
        :logs="filteredLogs"
        :loading="loading"
        :error="error"
        :pagination="pagination"
        @select-log="handleLogSelect"
        @page-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import WebhookLogSearch from '@/components/webhooks/WebhookLogSearch.vue';
// ... остальные импорты ...

export default {
  components: {
    WebhookLogSearch,
    // ... остальные компоненты ...
  },
  setup() {
    const searchQuery = ref('');
    const logs = ref([]);
    
    // Поиск по логам
    const filteredLogs = computed(() => {
      if (!searchQuery.value) {
        return logs.value;
      }
      
      return searchInLogs(logs.value, searchQuery.value);
    });
    
    // Обновление количества результатов
    const searchComponent = ref(null);
    watch(filteredLogs, (newLogs) => {
      if (searchComponent.value && searchQuery.value) {
        searchComponent.value.setResultsCount(newLogs.length);
      }
    });
    
    return {
      searchQuery,
      filteredLogs,
      searchComponent,
      // ... остальные свойства ...
    };
  }
};
</script>
```

### 3. Поиск по содержимому (клиентский)

**3.1. Создать утилиту поиска `vue-app/src/utils/log-search.js`:**

```javascript
/**
 * Поиск по логам вебхуков
 * 
 * @param {Array} logs - Массив логов для поиска
 * @param {string} query - Поисковый запрос
 * @param {Object} options - Опции поиска
 * @returns {Array} Отфильтрованные логи
 */
export function searchInLogs(logs, query, options = {}) {
  if (!query || !query.trim()) {
    return logs;
  }
  
  const {
    caseSensitive = false,
    searchInEvent = true,
    searchInPayload = true,
    searchInDetails = true,
    searchInIp = true,
    searchInTimestamp = false
  } = options;
  
  const searchQuery = caseSensitive ? query.trim() : query.trim().toLowerCase();
  
  return logs.filter(log => {
    // Поиск в event
    if (searchInEvent && log.event) {
      const eventText = caseSensitive ? log.event : log.event.toLowerCase();
      if (eventText.includes(searchQuery)) {
        return true;
      }
    }
    
    // Поиск в payload (JSON stringify)
    if (searchInPayload && log.payload) {
      try {
        const payloadText = JSON.stringify(log.payload);
        const searchText = caseSensitive ? payloadText : payloadText.toLowerCase();
        if (searchText.includes(searchQuery)) {
          return true;
        }
      } catch (error) {
        console.warn('Error searching in payload:', error);
      }
    }
    
    // Поиск в details
    if (searchInDetails && log.details) {
      try {
        const detailsText = JSON.stringify(log.details);
        const searchText = caseSensitive ? detailsText : detailsText.toLowerCase();
        if (searchText.includes(searchQuery)) {
          return true;
        }
      } catch (error) {
        console.warn('Error searching in details:', error);
      }
    }
    
    // Поиск в IP (точное совпадение или частичное)
    if (searchInIp && log.ip) {
      const ipText = caseSensitive ? log.ip : log.ip.toLowerCase();
      if (ipText.includes(searchQuery)) {
        return true;
      }
    }
    
    // Поиск в timestamp
    if (searchInTimestamp && log.timestamp) {
      const timestampText = caseSensitive ? log.timestamp : log.timestamp.toLowerCase();
      if (timestampText.includes(searchQuery)) {
        return true;
      }
    }
    
    return false;
  });
}

/**
 * Подсветка найденных совпадений в тексте
 * 
 * @param {string} text - Текст для подсветки
 * @param {string} query - Поисковый запрос
 * @returns {string} HTML с подсветкой
 */
export function highlightSearchMatches(text, query) {
  if (!query || !text) {
    return text;
  }
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Расширенный поиск с поддержкой операторов
 * 
 * Поддерживаемые операторы:
 * - "текст" - точная фраза
 * - AND, OR, NOT - логические операторы
 * - field:value - поиск в конкретном поле
 * 
 * @param {Array} logs - Массив логов
 * @param {string} query - Поисковый запрос
 * @returns {Array} Отфильтрованные логи
 */
export function advancedSearchInLogs(logs, query) {
  if (!query || !query.trim()) {
    return logs;
  }
  
  // Простой поиск (без операторов)
  if (!query.includes('"') && !query.includes(' AND ') && !query.includes(' OR ') && !query.includes(' NOT ')) {
    return searchInLogs(logs, query);
  }
  
  // Поиск с операторами (упрощённая реализация)
  const parts = query.split(/\s+(AND|OR|NOT)\s+/i);
  const results = [];
  
  for (let i = 0; i < parts.length; i += 2) {
    const searchTerm = parts[i].replace(/"/g, '').trim();
    const operator = parts[i + 1]?.toUpperCase();
    
    if (searchTerm) {
      const found = searchInLogs(logs, searchTerm);
      
      if (i === 0) {
        results.push(...found);
      } else if (operator === 'AND') {
        // Пересечение результатов
        results = results.filter(log => found.includes(log));
      } else if (operator === 'OR') {
        // Объединение результатов
        results.push(...found.filter(log => !results.includes(log)));
      } else if (operator === 'NOT') {
        // Исключение результатов
        results = results.filter(log => !found.includes(log));
      }
    }
  }
  
  return results;
}
```

**3.2. Использование в компоненте:**
```javascript
// В WebhookLogsPage.vue
import { searchInLogs, highlightSearchMatches } from '@/utils/log-search.js';

const filteredLogs = computed(() => {
  if (!searchQuery.value) {
    return logs.value;
  }
  
  return searchInLogs(logs.value, searchQuery.value, {
    caseSensitive: false,
    searchInEvent: true,
    searchInPayload: true,
    searchInDetails: true,
    searchInIp: true
  });
});
```

### 4. Сохранение фильтров в URL

**4.1. Создать composable для работы с URL параметрами:**

```javascript
// composables/useUrlFilters.js
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/**
 * Composable для синхронизации фильтров с URL
 * 
 * @returns {Object} { filters, updateFilters, clearFilters }
 */
export function useUrlFilters() {
  const route = useRoute();
  const router = useRouter();
  
  // Реактивные фильтры
  const filters = ref({
    category: null,
    event: null,
    date: new Date().toISOString().split('T')[0],
    hour: null,
    ip: null,
    search: null,
    dateFrom: null,
    dateTo: null,
    status: null
  });
  
  // Восстановление фильтров из URL при загрузке
  const loadFiltersFromUrl = () => {
    const query = route.query;
    
    filters.value = {
      category: query.category || null,
      event: query.event || null,
      date: query.date || new Date().toISOString().split('T')[0],
      hour: query.hour ? parseInt(query.hour) : null,
      ip: query.ip || null,
      search: query.search || null,
      dateFrom: query.dateFrom || null,
      dateTo: query.dateTo || null,
      status: query.status || null
    };
  };
  
  // Обновление URL при изменении фильтров
  const updateUrl = (newFilters) => {
    const query = {};
    
    Object.keys(newFilters).forEach(key => {
      const value = newFilters[key];
      if (value !== null && value !== '' && value !== undefined) {
        query[key] = value.toString();
      }
    });
    
    // Используем replace для избежания добавления в историю
    router.replace({ 
      path: route.path,
      query 
    });
  };
  
  // Обновление фильтров
  const updateFilters = (newFilters) => {
    filters.value = { ...filters.value, ...newFilters };
    updateUrl(filters.value);
  };
  
  // Очистка фильтров
  const clearFilters = () => {
    filters.value = {
      category: null,
      event: null,
      date: new Date().toISOString().split('T')[0],
      hour: null,
      ip: null,
      search: null,
      dateFrom: null,
      dateTo: null,
      status: null
    };
    updateUrl(filters.value);
  };
  
  // Загрузка при монтировании
  onMounted(() => {
    loadFiltersFromUrl();
  });
  
  // Синхронизация при изменении route.query (например, при использовании браузерной кнопки "Назад")
  watch(() => route.query, () => {
    loadFiltersFromUrl();
  }, { deep: true });
  
  return {
    filters,
    updateFilters,
    clearFilters,
    loadFiltersFromUrl
  };
}
```

**4.2. Использование в WebhookLogsPage.vue:**

```vue
<script>
import { ref, computed, watch } from 'vue';
import { useUrlFilters } from '@/composables/useUrlFilters.js';
import { searchInLogs } from '@/utils/log-search.js';

export default {
  setup() {
    const { filters, updateFilters, clearFilters } = useUrlFilters();
    const logs = ref([]);
    const loading = ref(false);
    
    // Применение фильтров и поиска
    const filteredLogs = computed(() => {
      let result = [...logs.value];
      
      // Поиск
      if (filters.value.search) {
        result = searchInLogs(result, filters.value.search);
      }
      
      // Фильтр по категории
      if (filters.value.category) {
        result = result.filter(log => log.category === filters.value.category);
      }
      
      // Фильтр по событию
      if (filters.value.event) {
        result = result.filter(log => log.event === filters.value.event);
      }
      
      // Фильтр по IP
      if (filters.value.ip) {
        result = result.filter(log => log.ip && log.ip.includes(filters.value.ip));
      }
      
      // Фильтр по статусу
      if (filters.value.status) {
        result = result.filter(log => {
          if (filters.value.status === 'error') {
            return log.category === 'errors';
          }
          if (filters.value.status === 'success') {
            return log.category !== 'errors';
          }
          return true;
        });
      }
      
      return result;
    });
    
    // Обработка обновления фильтров
    const handleFiltersUpdate = (newFilters) => {
      updateFilters(newFilters);
      loadLogs(); // Перезагрузка логов с новыми фильтрами
    };
    
    // Обработка сброса фильтров
    const handleFiltersReset = () => {
      clearFilters();
      loadLogs();
    };
    
    return {
      filters,
      filteredLogs,
      handleFiltersUpdate,
      handleFiltersReset,
      // ... остальные свойства ...
    };
  }
};
</script>
```

### 5. Быстрые фильтры

**5.1. Создать конфигурацию быстрых фильтров:**

```javascript
// config/quick-filters-config.js
/**
 * Конфигурация быстрых фильтров для логов вебхуков
 */
export const quickFiltersConfig = [
  {
    id: 'today',
    label: 'Сегодня',
    icon: '📅',
    getDateRange: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return {
        date: today.toISOString().split('T')[0],
        hour: null,
        dateFrom: null,
        dateTo: null
      };
    }
  },
  {
    id: 'yesterday',
    label: 'Вчера',
    icon: '📆',
    getDateRange: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      return {
        date: yesterday.toISOString().split('T')[0],
        hour: null,
        dateFrom: null,
        dateTo: null
      };
    }
  },
  {
    id: 'last7days',
    label: 'Последние 7 дней',
    icon: '📊',
    getDateRange: () => {
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      today.setHours(23, 59, 59, 999);
      return {
        date: null,
        hour: null,
        dateFrom: weekAgo.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0]
      };
    }
  },
  {
    id: 'last30days',
    label: 'Последние 30 дней',
    icon: '📈',
    getDateRange: () => {
      const today = new Date();
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      monthAgo.setHours(0, 0, 0, 0);
      today.setHours(23, 59, 59, 999);
      return {
        date: null,
        hour: null,
        dateFrom: monthAgo.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0]
      };
    }
  },
  {
    id: 'thisWeek',
    label: 'Эта неделя',
    icon: '🗓️',
    getDateRange: () => {
      const today = new Date();
      const startOfWeek = new Date(today);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Понедельник
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      today.setHours(23, 59, 59, 999);
      return {
        date: null,
        hour: null,
        dateFrom: startOfWeek.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0]
      };
    }
  },
  {
    id: 'thisMonth',
    label: 'Этот месяц',
    icon: '📅',
    getDateRange: () => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      today.setHours(23, 59, 59, 999);
      return {
        date: null,
        hour: null,
        dateFrom: startOfMonth.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0]
      };
    }
  }
];

/**
 * Получение быстрого фильтра по ID
 * 
 * @param {string} id - ID фильтра
 * @returns {Object|null} Объект фильтра или null
 */
export function getQuickFilterById(id) {
  return quickFiltersConfig.find(filter => filter.id === id) || null;
}
```

**5.2. Добавить компонент быстрых фильтров в WebhookLogFilters.vue:**

```vue
<template>
  <div class="webhook-log-filters">
    <!-- Быстрые фильтры -->
    <div class="quick-filters-section">
      <label class="quick-filters-label">Быстрые фильтры:</label>
      <div class="quick-filters-buttons">
        <button
          v-for="quickFilter in quickFilters"
          :key="quickFilter.id"
          @click="applyQuickFilter(quickFilter)"
          class="quick-filter-btn"
          :class="{ active: isQuickFilterActive(quickFilter.id) }"
          :title="quickFilter.label"
        >
          <span class="quick-filter-icon">{{ quickFilter.icon }}</span>
          <span class="quick-filter-label">{{ quickFilter.label }}</span>
        </button>
      </div>
    </div>
    
    <!-- Расширенные фильтры (аккордеон) -->
    <div class="advanced-filters-section">
      <button
        @click="showAdvancedFilters = !showAdvancedFilters"
        class="advanced-filters-toggle"
      >
        <span>{{ showAdvancedFilters ? '▼' : '▶' }}</span>
        Расширенные фильтры
      </button>
      
      <div v-if="showAdvancedFilters" class="advanced-filters-content">
        <!-- ... существующие фильтры ... -->
        
        <!-- Новые расширенные фильтры -->
        <div class="filter-group">
          <label for="ip-filter">IP-адрес:</label>
          <input
            id="ip-filter"
            v-model="localFilters.ip"
            type="text"
            placeholder="192.168.1.1"
            class="filter-input"
            @input="handleFilterChange"
          />
        </div>
        
        <div class="filter-group">
          <label for="date-from-filter">Дата от:</label>
          <input
            id="date-from-filter"
            v-model="localFilters.dateFrom"
            type="date"
            class="filter-input"
            @change="handleFilterChange"
          />
        </div>
        
        <div class="filter-group">
          <label for="date-to-filter">Дата до:</label>
          <input
            id="date-to-filter"
            v-model="localFilters.dateTo"
            type="date"
            class="filter-input"
            @change="handleFilterChange"
          />
        </div>
        
        <div class="filter-group">
          <label for="status-filter">Статус:</label>
          <select
            id="status-filter"
            v-model="localFilters.status"
            @change="handleFilterChange"
            class="filter-select"
          >
            <option :value="null">Все статусы</option>
            <option value="success">Успешно</option>
            <option value="error">Ошибка</option>
          </select>
        </div>
      </div>
    </div>
    
    <!-- ... остальные фильтры ... -->
  </div>
</template>

<script>
import { ref } from 'vue';
import { quickFiltersConfig } from '@/config/quick-filters-config.js';

export default {
  setup(props, { emit }) {
    const showAdvancedFilters = ref(false);
    const activeQuickFilter = ref(null);
    const quickFilters = quickFiltersConfig;
    
    // Применение быстрого фильтра
    const applyQuickFilter = (quickFilter) => {
      const dateRange = quickFilter.getDateRange();
      activeQuickFilter.value = quickFilter.id;
      
      emit('update:filters', {
        ...props.filters,
        ...dateRange
      });
    };
    
    // Проверка активности быстрого фильтра
    const isQuickFilterActive = (filterId) => {
      return activeQuickFilter.value === filterId;
    };
    
    return {
      showAdvancedFilters,
      quickFilters,
      activeQuickFilter,
      applyQuickFilter,
      isQuickFilterActive,
      // ... остальные методы ...
    };
  }
};
</script>

<style scoped>
.quick-filters-section {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.quick-filters-label {
  display: block;
  margin-bottom: 10px;
  font-weight: 500;
  font-size: 14px;
  color: #333;
}

.quick-filters-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.quick-filter-btn:hover {
  background: #e9ecef;
  border-color: #007bff;
}

.quick-filter-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.quick-filter-icon {
  font-size: 16px;
}

.advanced-filters-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  width: 100%;
  margin-bottom: 15px;
}

.advanced-filters-toggle:hover {
  background: #e9ecef;
}

.advanced-filters-content {
  padding: 15px;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}
</style>
```

---

## ✅ Критерии приёмки

- [ ] Полнотекстовый поиск работает по всем полям
- [ ] Debounce реализован (300-500ms)
- [ ] Подсветка найденных совпадений работает
- [ ] Фильтр по IP-адресу работает
- [ ] Фильтр по временному диапазону работает
- [ ] Фильтр по статусу работает
- [ ] Быстрые фильтры работают корректно
- [ ] Фильтры сохраняются в URL
- [ ] Фильтры восстанавливаются из URL при загрузке
- [ ] Можно делиться ссылкой с применёнными фильтрами
- [ ] Поиск работает быстро даже с большим количеством логов
- [ ] UI интуитивен и понятен

---

### 6. Подсветка найденных совпадений

**6.1. Обновить WebhookLogList для подсветки:**

```vue
<template>
  <td>
    <span 
      v-html="highlightText(log.event, searchQuery)"
      class="event-text"
    ></span>
  </td>
  <td>
    <span 
      v-html="highlightText(log.ip || 'N/A', searchQuery)"
      class="ip-text"
    ></span>
  </td>
</template>

<script>
import { highlightSearchMatches } from '@/utils/log-search.js';

export default {
  props: {
    logs: Array,
    searchQuery: String
  },
  methods: {
    highlightText(text, query) {
      if (!query || !text) {
        return text;
      }
      return highlightSearchMatches(String(text), query);
    }
  }
};
</script>

<style scoped>
.event-text,
.ip-text {
  display: inline-block;
}

::v-deep mark {
  background: #ffeb3b;
  color: #333;
  padding: 2px 4px;
  border-radius: 2px;
  font-weight: 600;
}
</style>
```

### 7. Полная интеграция в WebhookLogsPage

**7.1. Обновлённый WebhookLogsPage.vue с полной интеграцией:**

```vue
<template>
  <div class="webhook-logs-page">
    <div class="page-header">
      <div class="page-header-top">
        <button @click="goBack" class="back-button">← Назад</button>
      </div>
      <h1>Логи вебхуков Bitrix24</h1>
    </div>

    <div v-if="!hasAccess" class="access-denied">
      <p>У вас нет доступа к просмотру логов вебхуков.</p>
    </div>

    <div v-else class="page-content">
      <!-- Поиск -->
      <WebhookLogSearch
        v-model="searchQuery"
        @search="handleSearch"
        ref="searchComponent"
      />

      <!-- Быстрые фильтры и расширенные фильтры -->
      <WebhookLogFilters
        :filters="filters"
        @update:filters="handleFiltersUpdate"
        @reset="handleFiltersReset"
      />

      <!-- Список логов -->
      <WebhookLogList
        :logs="filteredAndSearchedLogs"
        :loading="loading"
        :error="error"
        :pagination="pagination"
        :search-query="searchQuery"
        @select-log="handleLogSelect"
        @page-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUrlFilters } from '@/composables/useUrlFilters.js';
import { searchInLogs } from '@/utils/log-search.js';
import WebhookLogSearch from '@/components/webhooks/WebhookLogSearch.vue';
import WebhookLogFilters from '@/components/webhooks/WebhookLogFilters.vue';
import WebhookLogList from '@/components/webhooks/WebhookLogList.vue';
import WebhookLogDetails from '@/components/webhooks/WebhookLogDetails.vue';
import { WebhookLogsApiService } from '@/services/webhook-logs-api.js';

export default {
  name: 'WebhookLogsPage',
  components: {
    WebhookLogSearch,
    WebhookLogFilters,
    WebhookLogList,
    WebhookLogDetails
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const { filters, updateFilters, clearFilters } = useUrlFilters();
    
    const searchQuery = ref(route.query.search || '');
    const logs = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const selectedLog = ref(null);
    const searchComponent = ref(null);
    
    const pagination = ref({
      page: 1,
      limit: 50,
      total: 0,
      pages: 0
    });

    // Применение всех фильтров и поиска
    const filteredAndSearchedLogs = computed(() => {
      let result = [...logs.value];
      
      // Поиск
      if (searchQuery.value) {
        result = searchInLogs(result, searchQuery.value);
      }
      
      // Фильтры
      if (filters.value.category) {
        result = result.filter(log => log.category === filters.value.category);
      }
      if (filters.value.event) {
        result = result.filter(log => log.event === filters.value.event);
      }
      if (filters.value.ip) {
        result = result.filter(log => log.ip && log.ip.includes(filters.value.ip));
      }
      if (filters.value.status) {
        result = result.filter(log => {
          if (filters.value.status === 'error') return log.category === 'errors';
          if (filters.value.status === 'success') return log.category !== 'errors';
          return true;
        });
      }
      
      // Фильтр по дате/диапазону
      if (filters.value.dateFrom || filters.value.dateTo) {
        result = result.filter(log => {
          const logDate = new Date(log.timestamp);
          if (filters.value.dateFrom) {
            const fromDate = new Date(filters.value.dateFrom);
            if (logDate < fromDate) return false;
          }
          if (filters.value.dateTo) {
            const toDate = new Date(filters.value.dateTo);
            toDate.setHours(23, 59, 59, 999);
            if (logDate > toDate) return false;
          }
          return true;
        });
      }
      
      return result;
    });

    // Обновление количества результатов поиска
    watch(filteredAndSearchedLogs, (newLogs) => {
      if (searchComponent.value && searchQuery.value) {
        searchComponent.value.setResultsCount(newLogs.length);
      }
    });

    // Обработка поиска
    const handleSearch = (query) => {
      searchQuery.value = query;
      updateFilters({ ...filters.value, search: query });
      pagination.value.page = 1;
    };

    // Обработка обновления фильтров
    const handleFiltersUpdate = (newFilters) => {
      updateFilters({ ...newFilters, search: searchQuery.value });
      pagination.value.page = 1;
      loadLogs();
    };

    // Обработка сброса фильтров
    const handleFiltersReset = () => {
      searchQuery.value = '';
      clearFilters();
      pagination.value.page = 1;
      loadLogs();
    };

    // Загрузка логов
    const loadLogs = async () => {
      loading.value = true;
      error.value = null;
      
      try {
        const result = await WebhookLogsApiService.getLogs(
          filters.value,
          pagination.value.page,
          pagination.value.limit
        );
        
        logs.value = result.logs || [];
        pagination.value = result.pagination || pagination.value;
      } catch (err) {
        error.value = err.message || 'Ошибка загрузки логов';
      } finally {
        loading.value = false;
      }
    };

    // Синхронизация searchQuery с URL
    watch(searchQuery, (newValue) => {
      updateFilters({ ...filters.value, search: newValue });
    });

    // Восстановление searchQuery из URL при загрузке
    onMounted(() => {
      if (route.query.search) {
        searchQuery.value = route.query.search;
      }
      loadLogs();
    });

    return {
      searchQuery,
      filters,
      logs,
      filteredAndSearchedLogs,
      loading,
      error,
      selectedLog,
      pagination,
      searchComponent,
      handleSearch,
      handleFiltersUpdate,
      handleFiltersReset,
      loadLogs,
      // ... остальные методы ...
    };
  }
};
</script>
```

## 🧪 Тестирование

### Тестирование поиска:
1. **Базовый поиск:**
   - Ввести текст в поле поиска (например, "ONTASKADD")
   - Проверить, что результаты фильтруются
   - Проверить индикатор "Найдено: X записей"
   - Проверить подсветку совпадений в результатах

2. **Debounce:**
   - Быстро вводить текст в поле поиска
   - Открыть DevTools → Network
   - Проверить, что запросы не отправляются при каждом символе
   - Проверить задержку ~400ms

3. **Очистка поиска:**
   - Ввести текст
   - Нажать кнопку "✕" или клавишу Esc
   - Проверить, что поиск очищен и все логи отображаются

4. **Поиск в разных полях:**
   - Поиск по событию: "ONTASKADD"
   - Поиск по IP: "195.208"
   - Поиск по содержимому payload: "TASK_ID"
   - Проверить, что все варианты работают

### Тестирование URL:
1. **Сохранение фильтров:**
   - Применить фильтры (категория, событие, дата)
   - Ввести поисковый запрос
   - Скопировать URL из адресной строки
   - Проверить наличие всех параметров в URL

2. **Восстановление фильтров:**
   - Открыть скопированный URL в новой вкладке
   - Проверить, что все фильтры восстановились
   - Проверить, что поисковый запрос восстановился
   - Проверить, что логи отфильтрованы корректно

3. **Навигация браузера:**
   - Применить фильтры
   - Нажать "Назад" в браузере
   - Проверить, что фильтры изменились соответственно
   - Нажать "Вперёд"
   - Проверить восстановление фильтров

### Тестирование быстрых фильтров:
1. **Сегодня:**
   - Нажать "Сегодня"
   - Проверить, что дата установлена на сегодня
   - Проверить, что кнопка выделена (active)
   - Проверить фильтрацию логов

2. **Вчера:**
   - Нажать "Вчера"
   - Проверить, что дата установлена на вчера
   - Проверить, что предыдущий фильтр сброшен

3. **Последние 7 дней:**
   - Нажать "Последние 7 дней"
   - Проверить установку dateFrom и dateTo
   - Проверить фильтрацию по диапазону

4. **Переключение между фильтрами:**
   - Применить "Сегодня"
   - Применить "Вчера"
   - Проверить, что активный фильтр меняется визуально

### Тестирование расширенных фильтров:
1. **Фильтр по IP:**
   - Ввести IP-адрес (например, "195.208")
   - Проверить фильтрацию логов
   - Проверить частичное совпадение

2. **Временной диапазон:**
   - Установить "Дата от" и "Дата до"
   - Проверить фильтрацию по диапазону
   - Проверить граничные значения

3. **Фильтр по статусу:**
   - Выбрать "Успешно"
   - Проверить, что показываются только не-ошибки
   - Выбрать "Ошибка"
   - Проверить, что показываются только ошибки

### Тестирование комбинаций:
1. **Поиск + фильтры:**
   - Применить фильтр по категории
   - Ввести поисковый запрос
   - Проверить, что применяются оба условия

2. **Быстрый фильтр + расширенные фильтры:**
   - Применить "Сегодня"
   - Добавить фильтр по событию
   - Проверить комбинацию фильтров

## 🐛 Troubleshooting

### Проблема 1: Поиск не работает

**Симптомы:**
- Ввод текста не фильтрует результаты

**Решение:**
1. Проверить, что функция `searchInLogs` импортирована
2. Проверить, что `filteredAndSearchedLogs` используется в `v-for`
3. Проверить консоль на ошибки
4. Убедиться, что `searchQuery` реактивен (ref)

### Проблема 2: Debounce не работает

**Симптомы:**
- Поиск выполняется при каждом символе

**Решение:**
1. Проверить, что утилита `debounce` создана
2. Проверить импорт: `import { debounce } from '@/utils/debounce.js'`
3. Проверить задержку (должна быть 300-500ms)
4. Убедиться, что функция правильно обёрнута

### Проблема 3: Фильтры не сохраняются в URL

**Симптомы:**
- URL не обновляется при изменении фильтров

**Решение:**
1. Проверить, что `useUrlFilters` используется
2. Проверить, что `updateFilters` вызывается
3. Проверить, что router инициализирован
4. Проверить консоль на ошибки
5. Убедиться, что используется `router.replace`, а не `router.push`

### Проблема 4: Фильтры не восстанавливаются из URL

**Симптомы:**
- При загрузке страницы фильтры не применяются

**Решение:**
1. Проверить, что `loadFiltersFromUrl` вызывается в `onMounted`
2. Проверить, что `route.query` содержит параметры
3. Проверить формат параметров в URL
4. Убедиться, что фильтры применяются к данным

### Проблема 5: Быстрые фильтры не работают

**Симптомы:**
- Клик по быстрому фильтру не меняет даты

**Решение:**
1. Проверить, что `quickFiltersConfig` импортирован
2. Проверить функцию `getDateRange` в конфигурации
3. Проверить, что `applyQuickFilter` вызывается
4. Проверить, что emit отправляет правильные данные

### Проблема 6: Подсветка совпадений не работает

**Симптомы:**
- Найденный текст не выделяется

**Решение:**
1. Проверить, что используется `v-html` (не `{{ }}`)
2. Проверить функцию `highlightSearchMatches`
3. Проверить экранирование HTML в функции
4. Убедиться, что стили для `mark` добавлены

---

## 📚 Дополнительные ресурсы

- [Vue Router Query Parameters](https://router.vuejs.org/guide/essentials/navigation.html)
- [Debounce Function](https://lodash.com/docs/4.17.15#debounce)

---

## 📋 Чек-лист выполнения задачи

### Поиск:
- [ ] Компонент WebhookLogSearch создан
- [ ] Утилита debounce создана и работает
- [ ] Поиск работает по всем полям (event, payload, details, IP)
- [ ] Debounce реализован (300-500ms)
- [ ] Подсветка найденных совпадений работает
- [ ] Кнопка очистки поиска работает
- [ ] Индикатор результатов поиска отображается
- [ ] Поиск работает быстро даже с большим количеством логов

### Расширенные фильтры:
- [ ] Фильтр по IP-адресу добавлен
- [ ] Фильтр по временному диапазону (от-до) добавлен
- [ ] Фильтр по статусу добавлен
- [ ] UI расширенных фильтров реализован (аккордеон)
- [ ] Все фильтры работают корректно
- [ ] Комбинация фильтров работает

### Быстрые фильтры:
- [ ] Конфигурация быстрых фильтров создана
- [ ] Кнопки быстрых фильтров добавлены
- [ ] Автоматическая установка дат работает
- [ ] Визуальное выделение активного фильтра работает
- [ ] Все быстрые фильтры работают корректно

### Сохранение в URL:
- [ ] Composable useUrlFilters создан
- [ ] Фильтры синхронизируются с query parameters
- [ ] Фильтры восстанавливаются из URL при загрузке
- [ ] URL обновляется при изменении фильтров
- [ ] Можно делиться ссылкой с применёнными фильтрами
- [ ] Работает навигация браузера (Назад/Вперёд)

### Интеграция:
- [ ] Поиск интегрирован в WebhookLogsPage
- [ ] Расширенные фильтры интегрированы
- [ ] Быстрые фильтры интегрированы
- [ ] Все компоненты работают вместе
- [ ] UI интуитивен и понятен
- [ ] Адаптивность для мобильных устройств

## 📝 История правок

- **2025-12-07 05:25 (UTC+3, Брест):** Создана задача TASK-017-03
- **2025-12-07 05:40 (UTC+3, Брест):** Добавлены детальные примеры кода, утилиты (debounce, поиск), composables (useUrlFilters), быстрые фильтры, расширенные фильтры, подсветка совпадений, полная интеграция и troubleshooting
- **2025-12-07 11:15 (UTC+3, Брест):** Задача завершена. Созданы утилиты debounce.js и log-search.js, компонент WebhookLogSearch.vue, расширены фильтры (IP, временной диапазон, статус), добавлены быстрые фильтры, создан composable useUrlFilters для сохранения фильтров в URL, интегрированы поиск и фильтры в WebhookLogsPage. Все изменения протестированы, линтер не выявил ошибок.

---

## 🔗 Связанные задачи

- **Родительская:** [TASK-017: Глобальный план](./TASK-017-webhook-logs-ui-implementation-plan.md)
- **Предыдущая:** [TASK-017-02: Улучшение базовых компонентов](./TASK-017-02-improve-base-components.md)
- **Следующая:** [TASK-017-04: Статистика и визуализация](./TASK-017-04-statistics-visualization.md)

