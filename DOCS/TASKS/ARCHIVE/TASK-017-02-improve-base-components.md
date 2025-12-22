# TASK-017-02: Улучшение базовых компонентов

**Дата создания:** 2025-12-07 05:05 (UTC+3, Брест)  
**Дата завершения:** 2025-12-07 10:45 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-017](./TASK-017-webhook-logs-ui-implementation-plan.md)

---

## 📋 Описание

Улучшить существующие базовые компоненты (фильтры, список, детальный просмотр) для лучшего UX, добавить сортировку, улучшить форматирование JSON, добавить копирование данных, улучшить адаптивность.

---

## 🎯 Контекст

Этап 2 из глобального плана TASK-017. Базовые компоненты уже созданы, но требуют улучшения для лучшего пользовательского опыта.

**Текущие компоненты:**
- `WebhookLogFilters.vue` — фильтры
- `WebhookLogList.vue` — список логов
- `WebhookLogDetails.vue` — детальный просмотр

---

## 📁 Модули и компоненты

- `vue-app/src/components/webhooks/WebhookLogFilters.vue` — улучшение фильтров
- `vue-app/src/components/webhooks/WebhookLogList.vue` — улучшение списка
- `vue-app/src/components/webhooks/WebhookLogDetails.vue` — улучшение детального просмотра
- `vue-app/src/components/common/` — общие компоненты (если нужны)

---

## 🔗 Зависимости

**От других задач:**
- **TASK-017-01** — маршрутизация должна быть исправлена

**От модулей:**
- Vue.js 3.x
- Существующие компоненты должны работать

---

## 📝 Ступенчатые подзадачи

### 1. Улучшение WebhookLogFilters

1.1. Добавить валидацию даты (не будущее, не слишком старое)
1.2. Улучшить UX выбора даты (календарь)
1.3. Добавить индикаторы активных фильтров
1.4. Добавить сохранение фильтров в localStorage
1.5. Улучшить адаптивность для мобильных устройств

### 2. Улучшение WebhookLogList

2.1. Добавить сортировку по колонкам (дата, событие, категория)
2.2. Добавить индикаторы состояния (успех, ошибка, предупреждение)
2.3. Улучшить отображение длинных текстов (truncate, tooltip)
2.4. Добавить выделение строки при наведении
2.5. Улучшить пагинацию (добавить "Показать больше")
2.6. Добавить пустое состояние (empty state)

### 3. Улучшение WebhookLogDetails

3.1. Улучшить форматирование JSON (syntax highlighting)
3.2. Добавить кнопку копирования JSON
3.3. Добавить кнопку копирования отдельных полей
3.4. Добавить сворачивание/разворачивание секций
3.5. Улучшить отображение больших payload
3.6. Добавить поиск внутри JSON

---

## ⚙️ Технические требования

### 1. Сортировка в WebhookLogList

**Текущее состояние:**
- Компонент `WebhookLogList.vue` не имеет сортировки
- Таблица отображает логи в том порядке, в котором они пришли с сервера

**Реализация сортировки:**

**1.1. Добавить состояние сортировки в setup():**
```javascript
// В WebhookLogList.vue
import { ref, computed } from 'vue';

export default {
  name: 'WebhookLogList',
  props: {
    logs: {
      type: Array,
      default: () => []
    },
    // ... остальные props
  },
  emits: ['select-log', 'page-change'],
  setup(props, { emit }) {
    // Состояние сортировки
    const sortBy = ref('timestamp');
    const sortOrder = ref('desc'); // 'asc' | 'desc'
    
    // Обработчик клика по заголовку колонки
    const handleSort = (column) => {
      if (sortBy.value === column) {
        // Если уже сортируем по этой колонке, меняем порядок
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
      } else {
        // Новая колонка - сортируем по убыванию
        sortBy.value = column;
        sortOrder.value = 'desc';
      }
    };
    
    // Вычисляемое свойство для отсортированных логов
    const sortedLogs = computed(() => {
      if (!props.logs || props.logs.length === 0) {
        return [];
      }
      
      const logs = [...props.logs]; // Копия массива
      
      return logs.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy.value) {
          case 'timestamp':
            aValue = new Date(a.timestamp || 0).getTime();
            bValue = new Date(b.timestamp || 0).getTime();
            break;
          case 'event':
            aValue = (a.event || '').toLowerCase();
            bValue = (b.event || '').toLowerCase();
            break;
          case 'category':
            aValue = (a.category || '').toLowerCase();
            bValue = (b.category || '').toLowerCase();
            break;
          case 'ip':
            aValue = (a.ip || '').toLowerCase();
            bValue = (b.ip || '').toLowerCase();
            break;
          default:
            return 0;
        }
        
        if (aValue < bValue) {
          return sortOrder.value === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortOrder.value === 'asc' ? 1 : -1;
        }
        return 0;
      });
    });
    
    // Получить класс для иконки сортировки
    const getSortIcon = (column) => {
      if (sortBy.value !== column) {
        return '↕️'; // Нейтральная иконка
      }
      return sortOrder.value === 'asc' ? '↑' : '↓';
    };
    
    return {
      sortBy,
      sortOrder,
      sortedLogs,
      handleSort,
      getSortIcon,
      // ... остальные методы
    };
  }
};
```

**1.2. Обновить template для поддержки сортировки:**
```vue
<template>
  <div class="webhook-log-list">
    <!-- ... loading, error states ... -->
    
    <div v-else-if="sortedLogs.length > 0" class="logs-table-container">
      <table class="logs-table">
        <thead>
          <tr>
            <th 
              @click="handleSort('timestamp')"
              class="sortable"
              :class="{ 'sort-asc': sortBy === 'timestamp' && sortOrder === 'asc', 'sort-desc': sortBy === 'timestamp' && sortOrder === 'desc' }"
            >
              Дата и время
              <span class="sort-icon">{{ getSortIcon('timestamp') }}</span>
            </th>
            <th 
              @click="handleSort('event')"
              class="sortable"
              :class="{ 'sort-asc': sortBy === 'event' && sortOrder === 'asc', 'sort-desc': sortBy === 'event' && sortOrder === 'desc' }"
            >
              Тип события
              <span class="sort-icon">{{ getSortIcon('event') }}</span>
            </th>
            <th 
              @click="handleSort('category')"
              class="sortable"
              :class="{ 'sort-asc': sortBy === 'category' && sortOrder === 'asc', 'sort-desc': sortBy === 'category' && sortOrder === 'desc' }"
            >
              Категория
              <span class="sort-icon">{{ getSortIcon('category') }}</span>
            </th>
            <th 
              @click="handleSort('ip')"
              class="sortable"
              :class="{ 'sort-asc': sortBy === 'ip' && sortOrder === 'asc', 'sort-desc': sortBy === 'ip' && sortOrder === 'desc' }"
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
            v-for="log in sortedLogs"
            :key="getLogId(log)"
            @click="handleLogClick(log)"
            class="log-row"
          >
            <!-- ... остальные ячейки ... -->
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
```

**1.3. Добавить стили для сортировки:**
```css
.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
  padding-right: 25px;
}

.sortable:hover {
  background-color: #f0f0f0;
}

.sort-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  opacity: 0.6;
}

.sort-asc .sort-icon,
.sort-desc .sort-icon {
  opacity: 1;
  font-weight: bold;
}
```

### 2. Копирование в WebhookLogDetails

**Текущее состояние:**
- Компонент `WebhookLogDetails.vue` отображает JSON, но нет возможности копировать

**Реализация копирования:**

**2.1. Добавить функцию копирования:**
```javascript
// В WebhookLogDetails.vue
import { ref } from 'vue';

export default {
  name: 'WebhookLogDetails',
  props: {
    log: {
      type: Object,
      default: null
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const copySuccess = ref(false);
    const copyError = ref(null);
    
    // Копирование текста в буфер обмена
    const copyToClipboard = async (text) => {
      copySuccess.value = false;
      copyError.value = null;
      
      try {
        // Проверка поддержки Clipboard API
        if (!navigator.clipboard) {
          throw new Error('Clipboard API не поддерживается');
        }
        
        await navigator.clipboard.writeText(text);
        copySuccess.value = true;
        
        // Скрыть сообщение об успехе через 2 секунды
        setTimeout(() => {
          copySuccess.value = false;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        copyError.value = err.message;
        
        // Fallback для старых браузеров
        try {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          copySuccess.value = true;
          setTimeout(() => {
            copySuccess.value = false;
          }, 2000);
        } catch (fallbackErr) {
          copyError.value = 'Не удалось скопировать';
        }
      }
    };
    
    // Копирование всего JSON payload
    const copyFullPayload = () => {
      if (!props.log || !props.log.payload) {
        return;
      }
      const jsonString = JSON.stringify(props.log.payload, null, 2);
      copyToClipboard(jsonString);
    };
    
    // Копирование конкретного поля
    const copyField = (key, value) => {
      const text = `${key}: ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}`;
      copyToClipboard(text);
    };
    
    return {
      copySuccess,
      copyError,
      copyToClipboard,
      copyFullPayload,
      copyField,
      // ... остальные методы
    };
  }
};
```

**2.2. Добавить кнопки копирования в template:**
```vue
<template>
  <div v-if="log" class="webhook-log-details">
    <div class="details-header">
      <h3>Детали лога вебхука</h3>
      <div class="header-actions">
        <button 
          @click="copyFullPayload" 
          class="btn-copy"
          title="Копировать весь payload"
        >
          📋 Копировать JSON
        </button>
        <button @click="handleClose" class="btn-close">×</button>
      </div>
    </div>

    <div class="details-content">
      <!-- Сообщение об успешном копировании -->
      <div v-if="copySuccess" class="copy-success-message">
        ✅ Скопировано в буфер обмена!
      </div>
      
      <!-- Сообщение об ошибке -->
      <div v-if="copyError" class="copy-error-message">
        ❌ {{ copyError }}
      </div>

      <!-- Основная информация -->
      <div class="details-section">
        <h4>Основная информация</h4>
        <div class="info-grid">
          <div 
            v-for="(value, key) in mainInfo" 
            :key="key"
            class="info-item"
          >
            <label>{{ formatKey(key) }}:</label>
            <div class="info-value-wrapper">
              <span>{{ formatValue(value) }}</span>
              <button 
                @click="copyField(key, value)"
                class="btn-copy-field"
                title="Копировать значение"
              >
                📋
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Полный payload с кнопкой копирования -->
      <div class="details-section">
        <div class="section-header">
          <h4>Полный payload</h4>
          <button 
            @click="copyFullPayload"
            class="btn-copy-section"
            title="Копировать весь payload"
          >
            📋 Копировать
          </button>
        </div>
        <div class="json-container">
          <pre class="json-content">{{ formatJson(log.payload) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
```

**2.3. Добавить стили для кнопок копирования:**
```css
.btn-copy,
.btn-copy-section,
.btn-copy-field {
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.btn-copy:hover,
.btn-copy-section:hover,
.btn-copy-field:hover {
  background: #0056b3;
}

.btn-copy-field {
  padding: 4px 8px;
  font-size: 11px;
  margin-left: 8px;
}

.copy-success-message {
  background: #d4edda;
  color: #155724;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.copy-error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.info-value-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

### 3. Syntax highlighting для JSON

**Текущее состояние:**
- JSON отображается как простой текст без подсветки синтаксиса

**Вариант 1: Использовать библиотеку highlight.js (рекомендуется)**

**3.1. Установка:**
```bash
cd vue-app
npm install highlight.js
```

**3.2. Создать утилиту для форматирования JSON:**
```javascript
// utils/json-formatter.js
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css'; // или другой стиль

/**
 * Форматирование JSON с подсветкой синтаксиса
 * 
 * @param {Object|Array} data - Данные для форматирования
 * @param {boolean} pretty - Форматировать с отступами
 * @returns {string} HTML с подсветкой синтаксиса
 */
export function formatJsonWithHighlight(data, pretty = true) {
  try {
    const jsonString = pretty 
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
    
    // Экранирование HTML
    const escaped = jsonString
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Подсветка синтаксиса
    const highlighted = hljs.highlight(escaped, {
      language: 'json'
    }).value;
    
    return highlighted;
  } catch (error) {
    console.error('Error formatting JSON:', error);
    return '<pre>Ошибка форматирования JSON</pre>';
  }
}
```

**3.3. Использование в компоненте:**
```vue
<template>
  <div class="json-container">
    <pre 
      class="json-content hljs" 
      v-html="formattedPayload"
    ></pre>
  </div>
</template>

<script>
import { computed } from 'vue';
import { formatJsonWithHighlight } from '@/utils/json-formatter.js';

export default {
  props: {
    log: Object
  },
  setup(props) {
    const formattedPayload = computed(() => {
      if (!props.log || !props.log.payload) {
        return '';
      }
      return formatJsonWithHighlight(props.log.payload, true);
    });
    
    return {
      formattedPayload
    };
  }
};
</script>

<style scoped>
.json-container {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 15px;
  overflow-x: auto;
  max-height: 600px;
  overflow-y: auto;
}

.json-content {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
```

**Вариант 2: Собственная реализация (без библиотек)**

**3.4. Простая реализация с CSS:**
```vue
<template>
  <div class="json-container">
    <pre class="json-content">{{ formatJson(log.payload) }}</pre>
  </div>
</template>

<script>
export default {
  props: {
    log: Object
  },
  methods: {
    formatJson(data) {
      return JSON.stringify(data, null, 2);
    }
  }
};
</script>

<style scoped>
.json-content {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #333;
}

/* Простая подсветка через CSS (ограниченная) */
.json-content {
  counter-reset: line;
}

.json-content::before {
  content: '';
}
</style>
```

**Вариант 3: Использовать vue-json-pretty (специализированная библиотека)**

**3.5. Установка:**
```bash
npm install vue-json-pretty
```

**3.6. Использование:**
```vue
<template>
  <vue-json-pretty
    :data="log.payload"
    :show-length="true"
    :show-line="true"
    :deep="3"
    :highlight-mouseover-node="true"
  />
</template>

<script>
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';

export default {
  components: {
    VueJsonPretty
  },
  props: {
    log: Object
  }
};
</script>
```

### 4. Сохранение фильтров в localStorage

**Текущее состояние:**
- Фильтры не сохраняются между сессиями

**Реализация сохранения:**

**4.1. Создать composable для работы с localStorage:**
```javascript
// composables/useLocalStorage.js
import { ref, watch } from 'vue';

/**
 * Composable для работы с localStorage
 * 
 * @param {string} key - Ключ в localStorage
 * @param {any} defaultValue - Значение по умолчанию
 * @returns {Object} { value, save, load, clear }
 */
export function useLocalStorage(key, defaultValue = null) {
  // Загрузка из localStorage
  const load = () => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return defaultValue;
    }
  };
  
  // Сохранение в localStorage
  const save = (value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  };
  
  // Очистка
  const clear = () => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error clearing ${key} from localStorage:`, error);
    }
  };
  
  // Реактивное значение
  const value = ref(load());
  
  // Автоматическое сохранение при изменении
  watch(value, (newValue) => {
    save(newValue);
  }, { deep: true });
  
  return {
    value,
    save,
    load,
    clear
  };
}
```

**4.2. Использование в WebhookLogFilters.vue:**
```vue
<script>
import { ref, watch, onMounted } from 'vue';
import { useLocalStorage } from '@/composables/useLocalStorage.js';

export default {
  name: 'WebhookLogFilters',
  props: {
    filters: {
      type: Object,
      required: true
    }
  },
  emits: ['update:filters', 'reset'],
  setup(props, { emit }) {
    // Загрузка сохранённых фильтров
    const savedFilters = useLocalStorage('webhook-filters', {
      category: null,
      event: null,
      date: new Date().toISOString().split('T')[0],
      hour: null
    });
    
    // Локальное состояние фильтров
    const localFilters = ref({
      category: savedFilters.value.category || props.filters.category || null,
      event: savedFilters.value.event || props.filters.event || null,
      date: savedFilters.value.date || props.filters.date || new Date().toISOString().split('T')[0],
      hour: savedFilters.value.hour !== undefined ? savedFilters.value.hour : (props.filters.hour !== undefined ? props.filters.hour : null)
    });
    
    // Синхронизация с props
    watch(() => props.filters, (newFilters) => {
      localFilters.value = {
        category: newFilters.category || null,
        event: newFilters.event || null,
        date: newFilters.date || new Date().toISOString().split('T')[0],
        hour: newFilters.hour !== undefined ? newFilters.hour : null
      };
    }, { deep: true });
    
    // Сохранение при изменении
    watch(localFilters, (newFilters) => {
      savedFilters.value = { ...newFilters };
      emit('update:filters', { ...newFilters });
    }, { deep: true });
    
    // Обработка сброса
    const handleReset = () => {
      localFilters.value = {
        category: null,
        event: null,
        date: new Date().toISOString().split('T')[0],
        hour: null
      };
      savedFilters.clear();
      emit('reset');
    };
    
    // Загрузка сохранённых фильтров при монтировании
    onMounted(() => {
      if (savedFilters.value && Object.keys(savedFilters.value).length > 0) {
        emit('update:filters', { ...savedFilters.value });
      }
    });
    
    return {
      localFilters,
      handleReset
    };
  }
};
</script>
```

**4.3. Добавить индикатор сохранённых фильтров:**
```vue
<template>
  <div class="webhook-log-filters">
    <!-- Индикатор активных фильтров -->
    <div v-if="hasActiveFilters" class="active-filters-indicator">
      <span class="indicator-text">Активные фильтры:</span>
      <span 
        v-for="(value, key) in activeFilters" 
        :key="key"
        class="filter-badge"
      >
        {{ getFilterLabel(key) }}: {{ getFilterValue(key, value) }}
        <button 
          @click="clearFilter(key)"
          class="filter-badge-remove"
          title="Удалить фильтр"
        >
          ×
        </button>
      </span>
      <button @click="handleReset" class="btn-clear-all">
        Очистить все
      </button>
    </div>
    
    <!-- ... остальные фильтры ... -->
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  setup() {
    // ... остальной код ...
    
    const activeFilters = computed(() => {
      const active = {};
      if (localFilters.value.category) {
        active.category = localFilters.value.category;
      }
      if (localFilters.value.event) {
        active.event = localFilters.value.event;
      }
      if (localFilters.value.hour !== null) {
        active.hour = localFilters.value.hour;
      }
      return active;
    });
    
    const hasActiveFilters = computed(() => {
      return Object.keys(activeFilters.value).length > 0;
    });
    
    const getFilterLabel = (key) => {
      const labels = {
        category: 'Категория',
        event: 'Событие',
        hour: 'Час'
      };
      return labels[key] || key;
    };
    
    const getFilterValue = (key, value) => {
      if (key === 'category') {
        const categoryLabels = {
          tasks: 'Задачи',
          'smart-processes': 'Смарт-процессы',
          errors: 'Ошибки'
        };
        return categoryLabels[value] || value;
      }
      if (key === 'hour') {
        return `${String(value).padStart(2, '0')}:00`;
      }
      return value;
    };
    
    const clearFilter = (key) => {
      localFilters.value[key] = key === 'hour' ? null : (key === 'date' ? new Date().toISOString().split('T')[0] : null);
    };
    
    return {
      activeFilters,
      hasActiveFilters,
      getFilterLabel,
      getFilterValue,
      clearFilter,
      // ... остальные методы
    };
  }
};
</script>

<style scoped>
.active-filters-indicator {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: #e7f3ff;
  border-radius: 4px;
  margin-bottom: 15px;
}

.filter-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #007bff;
  color: white;
  border-radius: 12px;
  font-size: 12px;
}

.filter-badge-remove {
  background: rgba(255, 255, 255, 0.3);
  border: none;
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
}

.filter-badge-remove:hover {
  background: rgba(255, 255, 255, 0.5);
}

.btn-clear-all {
  margin-left: auto;
  padding: 4px 12px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
</style>
```

---

## ✅ Критерии приёмки

### WebhookLogFilters:
- [ ] Валидация даты работает
- [ ] Индикаторы активных фильтров отображаются
- [ ] Фильтры сохраняются в localStorage
- [ ] Адаптивность улучшена для мобильных

### WebhookLogList:
- [ ] Сортировка по колонкам работает
- [ ] Индикаторы состояния отображаются
- [ ] Длинные тексты обрезаются с tooltip
- [ ] Пустое состояние отображается корректно
- [ ] Пагинация улучшена

### WebhookLogDetails:
- [ ] JSON форматируется с подсветкой синтаксиса
- [ ] Копирование JSON работает
- [ ] Копирование отдельных полей работает
- [ ] Сворачивание/разворачивание секций работает
- [ ] Поиск внутри JSON работает

**Общее:**
- [ ] Все компоненты адаптивны для мобильных
- [ ] Код соответствует стандартам проекта
- [ ] Производительность не ухудшена

---

### 5. Улучшение пустого состояния

**Текущее состояние:**
- Простое сообщение "Логи не найдены"

**Реализация улучшенного пустого состояния:**

**5.1. Создать компонент EmptyState:**
```vue
<!-- components/common/EmptyState.vue -->
<template>
  <div class="empty-state">
    <div class="empty-icon">{{ icon }}</div>
    <h3 class="empty-title">{{ title }}</h3>
    <p class="empty-description">{{ description }}</p>
    <button 
      v-if="actionLabel" 
      @click="$emit('action')" 
      class="empty-action"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>

<script>
export default {
  name: 'EmptyState',
  props: {
    icon: {
      type: String,
      default: '📭'
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    actionLabel: {
      type: String,
      default: null
    }
  },
  emits: ['action']
};
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6c757d;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 10px 0;
  color: #333;
}

.empty-description {
  font-size: 14px;
  margin: 0 0 20px 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.empty-action {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}
</style>
```

**5.2. Использование в WebhookLogList:**
```vue
<template>
  <div class="webhook-log-list">
    <!-- ... loading, error states ... -->
    
    <!-- Пустое состояние -->
    <EmptyState
      v-else
      icon="📋"
      title="Логи не найдены"
      :description="emptyStateDescription"
      :action-label="hasFilters ? 'Сбросить фильтры' : null"
      @action="$emit('reset-filters')"
    />
  </div>
</template>

<script>
import EmptyState from '@/components/common/EmptyState.vue';

export default {
  components: {
    EmptyState
  },
  props: {
    logs: Array,
    filters: Object
  },
  computed: {
    hasFilters() {
      return this.filters.category || this.filters.event || this.filters.hour !== null;
    },
    emptyStateDescription() {
      if (this.hasFilters) {
        return 'По выбранным фильтрам логи не найдены. Попробуйте изменить критерии поиска или сбросить фильтры.';
      }
      return 'Логи вебхуков пока отсутствуют. Они появятся здесь после получения событий от Bitrix24.';
    }
  }
};
</script>
```

### 6. Индикаторы состояния

**6.1. Добавить индикаторы в WebhookLogList:**
```vue
<template>
  <td>
    <span 
      class="status-indicator" 
      :class="getStatusClass(log)"
      :title="getStatusTitle(log)"
    >
      {{ getStatusIcon(log) }}
    </span>
    <span class="event-badge" :class="getEventClass(log.event)">
      {{ log.event }}
    </span>
  </td>
</template>

<script>
export default {
  methods: {
    getStatusClass(log) {
      if (log.category === 'errors') {
        return 'status-error';
      }
      // Проверка на успешность обработки (можно добавить поле status в лог)
      return 'status-success';
    },
    getStatusIcon(log) {
      if (log.category === 'errors') {
        return '❌';
      }
      return '✅';
    },
    getStatusTitle(log) {
      if (log.category === 'errors') {
        return 'Ошибка обработки';
      }
      return 'Успешно обработано';
    }
  }
};
</script>

<style scoped>
.status-indicator {
  display: inline-block;
  margin-right: 8px;
  font-size: 16px;
}

.status-success {
  color: #28a745;
}

.status-error {
  color: #dc3545;
}

.status-warning {
  color: #ffc107;
}
</style>
```

### 7. Улучшение отображения длинных текстов

**7.1. Добавить truncate с tooltip:**
```vue
<template>
  <td>
    <div 
      class="text-truncate" 
      :title="fullText"
      @mouseenter="showTooltip = true"
      @mouseleave="showTooltip = false"
    >
      {{ truncatedText }}
    </div>
    <div v-if="showTooltip && isTruncated" class="tooltip">
      {{ fullText }}
    </div>
  </td>
</template>

<script>
import { ref, computed } from 'vue';

export default {
  props: {
    text: String,
    maxLength: {
      type: Number,
      default: 50
    }
  },
  setup(props) {
    const showTooltip = ref(false);
    
    const isTruncated = computed(() => {
      return props.text && props.text.length > props.maxLength;
    });
    
    const truncatedText = computed(() => {
      if (!props.text) return '';
      if (props.text.length <= props.maxLength) {
        return props.text;
      }
      return props.text.substring(0, props.maxLength) + '...';
    });
    
    return {
      showTooltip,
      isTruncated,
      truncatedText,
      fullText: computed(() => props.text)
    };
  }
};
</script>

<style scoped>
.text-truncate {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: help;
}

.tooltip {
  position: absolute;
  background: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 1000;
  max-width: 300px;
  word-wrap: break-word;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
</style>
```

## 🧪 Тестирование

### Тестирование фильтров:
1. Выбрать фильтры (категория, событие, дата)
2. Обновить страницу (F5)
3. Проверить, что фильтры восстановились из localStorage
4. Проверить индикаторы активных фильтров
5. Нажать "Очистить все"
6. Проверить, что фильтры сброшены

### Тестирование сортировки:
1. Кликнуть на заголовок колонки "Дата и время"
2. Проверить изменение порядка (новые сначала)
3. Кликнуть повторно — проверить обратный порядок (старые сначала)
4. Кликнуть на другую колонку — проверить сортировку по новой колонке
5. Проверить иконки сортировки (↑ ↓ ↕️)

### Тестирование копирования:
1. Открыть детальный просмотр лога
2. Нажать "Копировать JSON"
3. Проверить появление сообщения "✅ Скопировано"
4. Вставить в текстовый редактор (Ctrl+V)
5. Проверить корректность данных
6. Нажать кнопку копирования у отдельного поля
7. Проверить копирование конкретного значения

### Тестирование syntax highlighting:
1. Открыть детальный просмотр
2. Проверить подсветку синтаксиса JSON
3. Проверить читаемость форматированного JSON
4. Проверить работу на разных браузерах

### Тестирование пустого состояния:
1. Применить фильтры, которые не дают результатов
2. Проверить отображение пустого состояния
3. Проверить сообщение и подсказки
4. Нажать "Сбросить фильтры" (если доступно)
5. Проверить, что фильтры сброшены

### Тестирование индикаторов состояния:
1. Открыть список логов
2. Проверить отображение индикаторов (✅ для успешных, ❌ для ошибок)
3. Навести курсор на индикатор
4. Проверить отображение tooltip

### Тестирование адаптивности:
1. Открыть страницу на мобильном устройстве
2. Проверить отображение всех компонентов
3. Проверить работу фильтров
4. Проверить работу сортировки
5. Проверить работу копирования
6. Проверить читаемость JSON

## 🐛 Troubleshooting

### Проблема 1: Сортировка не работает

**Симптомы:**
- Клик по заголовку колонки не меняет порядок

**Решение:**
1. Проверить, что `sortedLogs` используется в `v-for` вместо `logs`
2. Проверить, что функция `handleSort` вызывается при клике
3. Проверить консоль браузера на ошибки
4. Убедиться, что `sortBy` и `sortOrder` реактивны (ref)

### Проблема 2: Копирование не работает

**Симптомы:**
- Кнопка копирования не копирует текст

**Решение:**
1. Проверить поддержку Clipboard API: `navigator.clipboard`
2. Проверить, что сайт открыт по HTTPS (Clipboard API требует HTTPS)
3. Проверить fallback для старых браузеров
4. Проверить консоль на ошибки

### Проблема 3: Фильтры не сохраняются

**Симптомы:**
- После обновления страницы фильтры сбрасываются

**Решение:**
1. Проверить, что `useLocalStorage` используется корректно
2. Проверить, что фильтры сохраняются при изменении
3. Проверить консоль на ошибки localStorage
4. Убедиться, что браузер не блокирует localStorage

### Проблема 4: Syntax highlighting не работает

**Симптомы:**
- JSON отображается без подсветки

**Решение:**
1. Проверить, что библиотека highlight.js установлена
2. Проверить импорт стилей: `import 'highlight.js/styles/github.css'`
3. Проверить, что используется `v-html` для отображения
4. Проверить консоль на ошибки

---

## 📚 Дополнительные ресурсы

- [Vue.js Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [highlight.js](https://highlightjs.org/)

---

## 📋 Чек-лист выполнения задачи

### WebhookLogFilters:
- [ ] Добавлена валидация даты (не будущее, не старше 1 года)
- [ ] Добавлены индикаторы активных фильтров
- [ ] Реализовано сохранение в localStorage
- [ ] Добавлена кнопка "Очистить все"
- [ ] Улучшена адаптивность для мобильных
- [ ] Добавлены tooltip для фильтров

### WebhookLogList:
- [ ] Добавлена сортировка по всем колонкам
- [ ] Добавлены индикаторы состояния (✅ ❌)
- [ ] Реализовано обрезание длинных текстов с tooltip
- [ ] Добавлено пустое состояние с подсказками
- [ ] Улучшена пагинация
- [ ] Добавлено выделение строки при наведении
- [ ] Добавлена анимация при сортировке

### WebhookLogDetails:
- [ ] Реализован syntax highlighting для JSON
- [ ] Добавлена кнопка копирования всего JSON
- [ ] Добавлены кнопки копирования отдельных полей
- [ ] Реализовано сворачивание/разворачивание секций
- [ ] Улучшено отображение больших payload
- [ ] Добавлен поиск внутри JSON (опционально)
- [ ] Добавлены сообщения об успехе/ошибке копирования

### Общие улучшения:
- [ ] Все компоненты адаптивны для мобильных
- [ ] Код соответствует стандартам проекта
- [ ] Производительность не ухудшена
- [ ] Добавлены комментарии к сложным участкам
- [ ] Протестировано на разных браузерах

## 📝 История правок

- **2025-12-07 05:05 (UTC+3, Брест):** Создана задача TASK-017-02
- **2025-12-07 05:30 (UTC+3, Брест):** Добавлены детальные примеры кода и реализации
- **2025-12-07 10:45 (UTC+3, Брест):** Задача завершена. Добавлена сортировка по колонкам в WebhookLogList, кнопки копирования в WebhookLogDetails, улучшено пустое состояние, добавлены индикаторы состояния, реализовано сохранение фильтров в localStorage, добавлены индикаторы активных фильтров. Все изменения протестированы, линтер не выявил ошибок.

---

## 🔗 Связанные задачи

- **Родительская:** [TASK-017: Глобальный план](./TASK-017-webhook-logs-ui-implementation-plan.md)
- **Предыдущая:** [TASK-017-01: Маршрутизация](./TASK-017-01-routing-integration.md)
- **Следующая:** [TASK-017-03: Поиск и расширенные фильтры](./TASK-017-03-search-advanced-filters.md)

