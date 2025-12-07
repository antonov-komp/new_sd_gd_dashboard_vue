# TASK-018-07-01: Рефакторинг Vue.js компонентов для работы с новым API

**Дата создания:** 2025-12-07 17:00 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-018](./TASK-018-refactor-webhook-logs-module.md)  
**Тип:** Рефакторинг / Адаптация

---

## 📋 Описание

Рефакторинг Vue.js компонентов для работы с новым рефакторенным API модуля логирования вебхуков. Обновление всех компонентов для использования типизированных интерфейсов, валидаторов и форматтеров, созданных в TASK-018-05-01.

**Цель этапа:**
- Обновить все Vue.js компоненты для работы с новым форматом данных
- Интегрировать типизированные интерфейсы и валидаторы
- Использовать форматтеры для отображения данных
- Улучшить обработку ошибок в компонентах
- Обеспечить совместимость с новым API
- Сохранить обратную совместимость с существующим функционалом

---

## 🎯 Контекст

Это первая часть седьмого этапа рефакторинга модуля логирования вебхуков (TASK-018) для Vue.js программиста. После адаптации сервисов и composables (TASK-018-05-01) необходимо обновить все компоненты для работы с новым API и улучшенной структурой данных.

**Текущее состояние:**
- Компоненты работают со старым форматом данных
- Нет использования типизированных интерфейсов
- Нет валидации данных в компонентах
- Форматирование данных разбросано по компонентам
- Обработка ошибок не использует новые типы

**Целевое состояние:**
- Все компоненты используют типизированные интерфейсы
- Валидация данных на уровне компонентов
- Централизованное форматирование через утилиты
- Улучшенная обработка ошибок
- Оптимизированная работа с данными

**Связи:**
- Зависит от: TASK-018-05-01 (типизированные интерфейсы, валидаторы, форматтеры)
- Зависит от него: TASK-018-07-02 (оптимизация производительности)
- **Бэкенд:** Новый API использует сущности и возвращает структурированные данные

---

## 📁 Модули и компоненты

### Файлы для изменения:

1. **`vue-app/src/pages/WebhookLogsPage.vue`**
   - Интеграция с обновлённым `WebhookLogsApiService`
   - Использование типизированных интерфейсов
   - Валидация данных при загрузке
   - Улучшенная обработка ошибок

2. **`vue-app/src/components/webhooks/WebhookLogList.vue`**
   - Использование типизированных интерфейсов для логов
   - Интеграция форматтеров для отображения
   - Валидация данных перед отображением
   - Оптимизация рендеринга списка

3. **`vue-app/src/components/webhooks/WebhookLogDetails.vue`**
   - Использование типизированных интерфейсов
   - Форматирование деталей событий через утилиты
   - Валидация структуры данных
   - Улучшенное отображение больших payload

4. **`vue-app/src/components/webhooks/WebhookLogFilters.vue`**
   - Использование валидаторов для фильтров
   - Типизированные интерфейсы для фильтров
   - Улучшенная валидация входных данных

5. **`vue-app/src/components/webhooks/WebhookLogSearch.vue`**
   - Интеграция с новыми типами данных
   - Улучшенный поиск по структурированным данным

6. **`vue-app/src/components/webhooks/WebhookLogsStats.vue`**
   - Использование типизированных интерфейсов
   - Валидация данных для статистики

7. **`vue-app/src/components/webhooks/WebhookLogsDashboard.vue`**
   - Интеграция с новым форматом данных
   - Использование форматтеров

8. **`vue-app/src/components/webhooks/RealtimeControls.vue`**
   - Интеграция с обновлённым `useRealtime` composable
   - Использование типизированных интерфейсов

9. **`vue-app/src/components/webhooks/NewLogsIndicator.vue`**
   - Использование типизированных интерфейсов для новых логов
   - Валидация новых логов

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Обновление WebhookLogsPage.vue

**1.1. Импорт типов и утилит:**

```vue
<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { WebhookLogsApiService } from '@/services/webhook-logs-api.js';
import { useRealtime } from '@/composables/useRealtime.js';
import { useUrlFilters } from '@/composables/useUrlFilters.js';
import { useNotifications } from '@/composables/useNotifications.js';
import { 
  normalizeWebhookLogEntries,
  isValidWebhookLogEntry 
} from '@/types/webhook-logs.js';
import { validateFilters } from '@/utils/webhook-validators.js';
import { formatTimestamp, formatEventType, formatCategory } from '@/utils/webhook-formatters.js';

// ... остальной код
</script>
```

**1.2. Обновление загрузки логов с валидацией:**

```javascript
// В setup() функции WebhookLogsPage.vue

const loadLogs = async (forceRefresh = false) => {
  loading.value = true;
  error.value = null;
  
  try {
    // Валидация фильтров перед запросом
    if (!validateFilters(filters.value)) {
      throw new Error('Некорректные параметры фильтров');
    }
    
    // Загрузка логов через обновлённый сервис
    const result = await WebhookLogsApiService.getLogs(
      filters.value,
      pagination.value.page,
      pagination.value.limit,
      forceRefresh
    );
    
    // Валидация и нормализация полученных данных
    if (!result.success) {
      throw new Error(result.error || 'Ошибка загрузки логов');
    }
    
    // Нормализация записей (на случай, если API вернул невалидные данные)
    const normalizedLogs = normalizeWebhookLogEntries(result.logs || []);
    
    // Фильтрация невалидных записей
    const validLogs = normalizedLogs.filter(log => isValidWebhookLogEntry(log));
    
    if (validLogs.length !== normalizedLogs.length) {
      console.warn(
        '[WebhookLogsPage] Отфильтровано невалидных записей:',
        normalizedLogs.length - validLogs.length
      );
    }
    
    // Обновление данных
    logs.value = validLogs;
    
    // Обновление пагинации
    if (result.pagination) {
      pagination.value = {
        page: result.pagination.page || pagination.value.page,
        limit: result.pagination.limit || pagination.value.limit,
        total: result.pagination.total || validLogs.length,
        pages: result.pagination.pages || Math.ceil((result.pagination.total || validLogs.length) / pagination.value.limit)
      };
    }
    
    // Обновление URL с фильтрами
    updateUrlFilters(filters.value);
    
    // Уведомление об успешной загрузке
    if (validLogs.length > 0) {
      showSuccess(`Загружено ${validLogs.length} записей`);
    }
    
  } catch (err) {
    console.error('[WebhookLogsPage] Ошибка загрузки логов:', err);
    error.value = err.message || 'Ошибка загрузки логов';
    showError(error.value);
    
    // Очистка данных при ошибке
    logs.value = [];
    pagination.value = {
      ...pagination.value,
      total: 0,
      pages: 0
    };
  } finally {
    loading.value = false;
  }
};
```

**1.3. Обновление обработки новых логов из realtime:**

```javascript
// В setup() функции WebhookLogsPage.vue

const handleApplyNewLogs = () => {
  if (newLogs.value.length === 0) {
    return;
  }
  
  // Валидация и нормализация новых логов
  const normalizedNewLogs = normalizeWebhookLogEntries(newLogs.value);
  const validNewLogs = normalizedNewLogs.filter(log => isValidWebhookLogEntry(log));
  
  if (validNewLogs.length === 0) {
    console.warn('[WebhookLogsPage] Нет валидных новых логов для применения');
    return;
  }
  
  // Добавление новых логов в начало списка
  logs.value.unshift(...validNewLogs);
  
  // Обновление пагинации
  pagination.value.total += validNewLogs.length;
  pagination.value.pages = Math.ceil(pagination.value.total / pagination.value.limit);
  
  // Очистка новых логов
  clearNewLogs();
  
  // Уведомление
  showSuccess(`Добавлено ${validNewLogs.length} новых записей`);
  
  // Инвалидация кеша
  WebhookLogsApiService.clearCache();
};
```

**1.4. Обновление инициализации realtime:**

```javascript
// В setup() функции WebhookLogsPage.vue

// Инициализация realtime с валидацией
const {
  connectionState,
  isConnected,
  newLogs,
  newLogsCount,
  hasNewLogs,
  error: realtimeError,
  connect,
  disconnect,
  clearNewLogs
} = useRealtime('/api/webhook-realtime.php', {
  autoConnect: false,
  enableSound: true,
  validateLogs: true, // Включить валидацию новых логов
  onNewLogs: (logs) => {
    // Дополнительная обработка новых логов
    console.log('[WebhookLogsPage] Получены новые логи:', logs.length);
  }
});

// Обработка изменений состояния соединения
watch(connectionState, (newState) => {
  if (newState === 'connected') {
    showSuccess('Подключение к реальному времени установлено');
  } else if (newState === 'error') {
    showError('Ошибка подключения к реальному времени');
  }
});
```

**Результат шага 1:**
- `WebhookLogsPage.vue` обновлён для работы с новым API
- Валидация данных добавлена
- Обработка ошибок улучшена
- Интеграция с realtime обновлена

---

### Шаг 2: Обновление WebhookLogList.vue

**2.1. Импорт типов и форматтеров:**

```vue
<script setup>
import { ref, computed } from 'vue';
import { 
  formatTimestamp, 
  formatEventType, 
  formatCategory,
  formatEventDetails 
} from '@/utils/webhook-formatters.js';
import { isValidWebhookLogEntry } from '@/types/webhook-logs.js';

// Props с типизацией
const props = defineProps({
  /**
   * @type {import('@/types/webhook-logs.js').WebhookLogEntry[]}
   */
  logs: {
    type: Array,
    required: true,
    validator: (value) => {
      return Array.isArray(value) && value.every(log => isValidWebhookLogEntry(log));
    }
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  },
  /**
   * @type {import('@/types/webhook-logs.js').WebhookLogsPagination}
   */
  pagination: {
    type: Object,
    default: () => ({
      page: 1,
      limit: 50,
      total: 0,
      pages: 0
    })
  },
  selectedLogs: {
    type: Array,
    default: () => []
  }
});

// Emits
const emit = defineEmits(['select-log', 'page-change', 'update:selectedLogs']);

// ... остальной код
</script>
```

**2.2. Обновление методов форматирования:**

```javascript
// В setup() функции WebhookLogList.vue

// Использование форматтеров вместо локальных методов
const formatTimestampLocal = (timestamp) => {
  return formatTimestamp(timestamp, 'short');
};

const formatEventTypeLocal = (eventType) => {
  return formatEventType(eventType);
};

const formatCategoryLocal = (category) => {
  return formatCategory(category);
};

const formatDetailsPreview = (log) => {
  if (!log.details || typeof log.details !== 'object') {
    return '—';
  }
  
  return formatEventDetails(log.details);
};

// Получение ID лога (уникальный идентификатор)
const getLogId = (log) => {
  if (!isValidWebhookLogEntry(log)) {
    return `invalid-${Date.now()}-${Math.random()}`;
  }
  
  // Используем комбинацию timestamp и event для уникальности
  return `${log.timestamp}_${log.event}_${log.category}`;
};
```

**2.3. Обновление сортировки с валидацией:**

```javascript
// В setup() функции WebhookLogList.vue

const sortedLogs = computed(() => {
  // Фильтрация невалидных записей перед сортировкой
  const validLogs = props.logs.filter(log => isValidWebhookLogEntry(log));
  
  if (validLogs.length !== props.logs.length) {
    console.warn(
      '[WebhookLogList] Отфильтровано невалидных записей:',
      props.logs.length - validLogs.length
    );
  }
  
  if (!sortBy.value) {
    return validLogs;
  }
  
  return [...validLogs].sort((a, b) => {
    let aValue = a[sortBy.value];
    let bValue = b[sortBy.value];
    
    // Обработка null/undefined значений
    if (aValue === null || aValue === undefined) {
      return 1;
    }
    if (bValue === null || bValue === undefined) {
      return -1;
    }
    
    // Обработка дат
    if (sortBy.value === 'timestamp') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }
    
    // Сравнение
    if (aValue < bValue) {
      return sortOrder.value === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortOrder.value === 'asc' ? 1 : -1;
    }
    return 0;
  });
});
```

**2.4. Обновление шаблона с использованием форматтеров:**

```vue
<template>
  <div class="webhook-log-list">
    <!-- Таблица логов -->
    <div v-if="logs.length > 0" class="logs-table-container">
      <table class="logs-table">
        <thead>
          <tr>
            <!-- ... заголовки ... -->
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="log in sortedLogs"
            :key="getLogId(log)"
            @click="handleLogClick(log)"
            class="log-row"
            :class="{ 'row-selected': isSelected(log) }"
          >
            <!-- ... чекбокс ... -->
            <td>{{ formatTimestampLocal(log.timestamp) }}</td>
            <td>
              <span 
                class="status-indicator" 
                :class="getStatusClass(log)"
                :title="getStatusTitle(log)"
              >
                {{ getStatusIcon(log) }}
              </span>
              <span class="event-badge" :class="getEventClass(log.event)">
                {{ formatEventTypeLocal(log.event) }}
              </span>
            </td>
            <td>
              <span class="category-badge" :class="getCategoryClass(log.category)">
                {{ formatCategoryLocal(log.category) }}
              </span>
            </td>
            <td>{{ log.ip || 'N/A' }}</td>
            <td>
              <div class="details-preview">
                {{ formatDetailsPreview(log) }}
              </div>
            </td>
            <!-- ... действия ... -->
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- ... остальной шаблон ... -->
  </div>
</template>
```

**Результат шага 2:**
- `WebhookLogList.vue` обновлён для работы с новыми типами
- Форматтеры интегрированы
- Валидация данных добавлена
- Сортировка улучшена

---

### Шаг 3: Обновление WebhookLogDetails.vue

**3.1. Импорт типов и форматтеров:**

```vue
<script setup>
import { ref, computed, watch } from 'vue';
import { 
  formatTimestamp, 
  formatEventType, 
  formatCategory,
  formatEventDetails 
} from '@/utils/webhook-formatters.js';
import { isValidWebhookLogEntry, isValidEventDetails } from '@/types/webhook-logs.js';

// Props с типизацией
const props = defineProps({
  /**
   * @type {import('@/types/webhook-logs.js').WebhookLogEntry}
   */
  log: {
    type: Object,
    required: true,
    validator: (value) => {
      return isValidWebhookLogEntry(value);
    }
  }
});

// Emits
const emit = defineEmits(['close']);

// ... остальной код
</script>
```

**3.2. Обновление вычисляемых свойств с валидацией:**

```javascript
// В setup() функции WebhookLogDetails.vue

// Основная информация с форматированием
const mainInfo = computed(() => {
  if (!isValidWebhookLogEntry(props.log)) {
    console.error('[WebhookLogDetails] Невалидный лог:', props.log);
    return {};
  }
  
  return {
    timestamp: formatTimestamp(props.log.timestamp, 'long'),
    event: formatEventType(props.log.event),
    category: formatCategory(props.log.category),
    ip: props.log.ip || 'N/A'
  };
});

// Детали события с валидацией
const eventDetails = computed(() => {
  if (!props.log.details) {
    return {};
  }
  
  if (!isValidEventDetails(props.log.details)) {
    console.warn('[WebhookLogDetails] Невалидные детали события:', props.log.details);
    return {};
  }
  
  return props.log.details;
});

// Payload с валидацией
const payload = computed(() => {
  if (!props.log.payload) {
    return null;
  }
  
  try {
    // Проверка, что payload - это объект
    if (typeof props.log.payload !== 'object') {
      return null;
    }
    
    return props.log.payload;
  } catch (e) {
    console.error('[WebhookLogDetails] Ошибка обработки payload:', e);
    return null;
  }
});

// Размер payload
const payloadSize = computed(() => {
  if (!payload.value) {
    return 0;
  }
  
  try {
    const jsonString = JSON.stringify(payload.value);
    return new Blob([jsonString]).size;
  } catch (e) {
    return 0;
  }
});
```

**3.3. Обновление форматирования значений:**

```javascript
// В setup() функции WebhookLogDetails.vue

const formatValue = (value) => {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  
  // Обработка массивов
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return `[${value.length} элементов]`;
  }
  
  // Обработка объектов
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return '{}';
    }
    return `{${keys.length} полей}`;
  }
  
  // Обработка строк (ограничение длины)
  if (typeof value === 'string') {
    if (value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    return value;
  }
  
  // Обработка булевых значений
  if (typeof value === 'boolean') {
    return value ? 'Да' : 'Нет';
  }
  
  return String(value);
};

const formatKey = (key) => {
  // Преобразование snake_case в читаемый формат
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
```

**3.4. Обновление отображения деталей события:**

```vue
<template>
  <div v-if="log" class="webhook-log-details">
    <!-- ... заголовок ... -->
    
    <div class="details-content">
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
              <span v-if="key === 'event'">
                <span class="event-badge" :class="getEventClass(value)">
                  {{ value }}
                </span>
              </span>
              <span v-else-if="key === 'category'">
                <span class="category-badge" :class="getCategoryClass(value)">
                  {{ value }}
                </span>
              </span>
              <span v-else>{{ value || 'N/A' }}</span>
              <!-- ... кнопка копирования ... -->
            </div>
          </div>
        </div>
      </div>
      
      <!-- Детали события -->
      <div v-if="Object.keys(eventDetails).length > 0" class="details-section">
        <h4>Детали события</h4>
        <div class="info-grid">
          <div
            v-for="(value, key) in eventDetails"
            :key="key"
            class="info-item"
          >
            <label>{{ formatKey(key) }}:</label>
            <span>{{ formatValue(value) }}</span>
          </div>
        </div>
      </div>
      
      <!-- Полный payload -->
      <div v-if="payload" class="details-section">
        <!-- ... payload ... -->
      </div>
    </div>
  </div>
</template>
```

**Результат шага 3:**
- `WebhookLogDetails.vue` обновлён для работы с новыми типами
- Форматтеры интегрированы
- Валидация данных добавлена
- Отображение деталей улучшено

---

### Шаг 4: Обновление WebhookLogFilters.vue

**4.1. Импорт валидаторов:**

```vue
<script setup>
import { ref, computed, watch } from 'vue';
import { validateFilters } from '@/utils/webhook-validators.js';

// Props с типизацией
const props = defineProps({
  /**
   * @type {import('@/types/webhook-logs.js').WebhookLogsFilters}
   */
  filters: {
    type: Object,
    required: true,
    validator: (value) => {
      return validateFilters(value);
    }
  }
});

// Emits
const emit = defineEmits(['update:filters', 'reset']);

// ... остальной код
</script>
```

**4.2. Обновление валидации фильтров:**

```javascript
// В setup() функции WebhookLogFilters.vue

const localFilters = ref({ ...props.filters });

// Валидация при изменении фильтров
watch(localFilters, (newFilters) => {
  if (!validateFilters(newFilters)) {
    console.warn('[WebhookLogFilters] Невалидные фильтры:', newFilters);
    return;
  }
  
  emit('update:filters', { ...newFilters });
}, { deep: true });

// Валидация категории
const validCategories = ['tasks', 'smart-processes', 'errors'];

const updateCategory = (category) => {
  if (category && !validCategories.includes(category)) {
    console.warn('[WebhookLogFilters] Невалидная категория:', category);
    return;
  }
  
  localFilters.value.category = category || null;
};

// Валидация даты
const updateDate = (date) => {
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.warn('[WebhookLogFilters] Невалидный формат даты:', date);
    return;
  }
  
  localFilters.value.date = date || null;
};

// Валидация часа
const updateHour = (hour) => {
  if (hour !== null && hour !== undefined) {
    const hourNum = parseInt(hour, 10);
    if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
      console.warn('[WebhookLogFilters] Невалидный час:', hour);
      return;
    }
    localFilters.value.hour = hourNum;
  } else {
    localFilters.value.hour = null;
  }
};
```

**Результат шага 4:**
- `WebhookLogFilters.vue` обновлён для работы с валидаторами
- Валидация фильтров добавлена
- Типизация улучшена

---

### Шаг 5: Обновление остальных компонентов

**5.1. Обновление WebhookLogSearch.vue:**

```vue
<script setup>
import { ref, watch } from 'vue';
import { isValidWebhookLogEntry } from '@/types/webhook-logs.js';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'search']);

const searchQuery = ref(props.modelValue);

// Поиск с валидацией структуры данных
const performSearch = (query, logs) => {
  if (!query || !logs || !Array.isArray(logs)) {
    return [];
  }
  
  const lowerQuery = query.toLowerCase();
  
  return logs.filter(log => {
    // Валидация лога перед поиском
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
    
    // Поиск по деталям события
    if (log.details && typeof log.details === 'object') {
      const detailsString = JSON.stringify(log.details).toLowerCase();
      if (detailsString.includes(lowerQuery)) {
        return true;
      }
    }
    
    return false;
  });
};
</script>
```

**5.2. Обновление WebhookLogsStats.vue:**

```vue
<script setup>
import { computed } from 'vue';
import { isValidWebhookLogEntry } from '@/types/webhook-logs.js';
import { formatCategory } from '@/utils/webhook-formatters.js';

const props = defineProps({
  /**
   * @type {import('@/types/webhook-logs.js').WebhookLogEntry[]}
   */
  logs: {
    type: Array,
    required: true,
    validator: (value) => {
      return Array.isArray(value) && value.every(log => isValidWebhookLogEntry(log));
    }
  }
});

// Статистика с валидацией данных
const stats = computed(() => {
  const validLogs = props.logs.filter(log => isValidWebhookLogEntry(log));
  
  const statsData = {
    total: validLogs.length,
    byCategory: {},
    byEvent: {},
    byDate: {}
  };
  
  validLogs.forEach(log => {
    // По категориям
    const category = log.category || 'unknown';
    statsData.byCategory[category] = (statsData.byCategory[category] || 0) + 1;
    
    // По типам событий
    const event = log.event || 'unknown';
    statsData.byEvent[event] = (statsData.byEvent[event] || 0) + 1;
    
    // По датам
    if (log.timestamp) {
      try {
        const date = new Date(log.timestamp).toISOString().split('T')[0];
        statsData.byDate[date] = (statsData.byDate[date] || 0) + 1;
      } catch (e) {
        console.warn('[WebhookLogsStats] Ошибка парсинга даты:', log.timestamp);
      }
    }
  });
  
  return statsData;
});
</script>
```

**5.3. Обновление RealtimeControls.vue:**

```vue
<script setup>
import { computed, watch } from 'vue';

const props = defineProps({
  enabled: {
    type: Boolean,
    default: false
  },
  connectionState: {
    type: String,
    default: 'disconnected',
    validator: (value) => {
      return ['disconnected', 'connecting', 'connected', 'error'].includes(value);
    }
  },
  error: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['toggle']);

// Состояния с валидацией
const isConnected = computed(() => props.connectionState === 'connected');
const isConnecting = computed(() => props.connectionState === 'connecting');
const hasError = computed(() => props.connectionState === 'error' || props.error !== null);
</script>
```

**5.4. Обновление NewLogsIndicator.vue:**

```vue
<script setup>
import { computed } from 'vue';
import { isValidWebhookLogEntry } from '@/types/webhook-logs.js';

const props = defineProps({
  /**
   * @type {import('@/types/webhook-logs.js').WebhookLogEntry[]}
   */
  logs: {
    type: Array,
    default: () => [],
    validator: (value) => {
      return Array.isArray(value) && value.every(log => isValidWebhookLogEntry(log));
    }
  },
  count: {
    type: Number,
    default: 0,
    validator: (value) => {
      return value >= 0;
    }
  }
});

const emit = defineEmits(['apply', 'dismiss']);

// Валидация количества
const validCount = computed(() => {
  const validLogs = props.logs.filter(log => isValidWebhookLogEntry(log));
  return validLogs.length || props.count;
});
</script>
```

**Результат шага 5:**
- Все компоненты обновлены для работы с новыми типами
- Валидация данных добавлена
- Типизация улучшена

---

## 📊 Критерии приёмки

- [ ] `WebhookLogsPage.vue` обновлён для работы с новым API
- [ ] Интеграция с `WebhookLogsApiService` обновлена
- [ ] Валидация данных при загрузке добавлена
- [ ] Обработка ошибок улучшена
- [ ] `WebhookLogList.vue` обновлён для работы с новыми типами
- [ ] Форматтеры интегрированы в `WebhookLogList.vue`
- [ ] Валидация данных в `WebhookLogList.vue` добавлена
- [ ] `WebhookLogDetails.vue` обновлён для работы с новыми типами
- [ ] Форматтеры интегрированы в `WebhookLogDetails.vue`
- [ ] Валидация данных в `WebhookLogDetails.vue` добавлена
- [ ] `WebhookLogFilters.vue` обновлён для работы с валидаторами
- [ ] Валидация фильтров добавлена
- [ ] `WebhookLogSearch.vue` обновлён для работы с новыми типами
- [ ] `WebhookLogsStats.vue` обновлён для работы с новыми типами
- [ ] `RealtimeControls.vue` обновлён для работы с новым composable
- [ ] `NewLogsIndicator.vue` обновлён для работы с новыми типами
- [ ] Все компоненты используют типизированные интерфейсы
- [ ] Все компоненты используют форматтеры из утилит
- [ ] Валидация данных добавлена во все компоненты
- [ ] Обработка ошибок улучшена во всех компонентах
- [ ] Код соответствует стандартам ESLint
- [ ] JSDoc комментарии добавлены для всех методов
- [ ] **Все компоненты протестированы с реальным API**
- [ ] **Совместимость с существующим функционалом сохранена**
- [ ] **Нет регрессий в работе интерфейса**

---

## 🔍 Проверка выполнения

**Команды для проверки:**
```bash
# Проверить синтаксис Vue файлов
npm run lint vue-app/src/pages/WebhookLogsPage.vue
npm run lint vue-app/src/components/webhooks/*.vue

# Запустить тесты (если есть)
npm run test vue-app/src/components/webhooks/*.test.js

# Проверить работу в браузере
# Открыть /admin/webhook-logs и проверить:
# 1. Загрузку логов
# 2. Работу фильтров
# 3. Отображение деталей
# 4. Работу realtime
```

**Ручное тестирование:**
1. Открыть страницу `/admin/webhook-logs`
2. Проверить загрузку логов через обновлённый API
3. Проверить работу фильтров
4. Проверить отображение данных в списке
5. Проверить детальный просмотр записи
6. Проверить работу поиска
7. Проверить работу realtime
8. Проверить обработку ошибок
9. Проверить валидацию данных (попробовать невалидные данные)
10. Проверить форматирование данных

---

## 🔗 Связи с другими этапами

**Зависит от:**
- **TASK-018-05-01:** Использует типизированные интерфейсы, валидаторы и форматтеры

**Зависит от него:**
- **TASK-018-07-02:** Оптимизация производительности и улучшение UX

---

## 📝 История правок

- **2025-12-07 17:00 (UTC+3, Брест):** Создана задача рефакторинга Vue.js компонентов для работы с новым API

---

## 💡 Дополнительные рекомендации

1. **Производительность:**
   - Использовать `v-memo` для оптимизации рендеринга списков
   - Ленивая загрузка больших компонентов
   - Виртуализация списков для больших объёмов данных

2. **Безопасность:**
   - Санитизация всех данных перед отображением
   - Защита от XSS в форматтерах
   - Валидация всех входящих данных

3. **Расширяемость:**
   - Легко добавлять новые типы событий
   - Конфигурируемые форматтеры
   - Плагинная архитектура для валидаторов

4. **Документация:**
   - Примеры использования в JSDoc
   - Описание структуры данных
   - Руководство по расширению компонентов

