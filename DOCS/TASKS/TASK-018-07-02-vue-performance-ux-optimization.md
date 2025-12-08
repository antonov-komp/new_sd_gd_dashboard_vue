# TASK-018-07-02: Оптимизация производительности и улучшение UX Vue.js интерфейса

**Дата создания:** 2025-12-07 17:00 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-018](./TASK-018-refactor-webhook-logs-module.md)  
**Тип:** Оптимизация / Улучшение UX

---

## 📋 Описание

Оптимизация производительности Vue.js интерфейса логирования вебхуков и улучшение пользовательского опыта. Внедрение виртуализации списков, оптимизация рендеринга, улучшение кеширования, добавление анимаций и индикаторов загрузки.

**Цель этапа:**
- Оптимизировать рендеринг больших списков логов
- Улучшить кеширование данных
- Оптимизировать работу с большими payload
- Добавить плавные анимации и переходы
- Улучшить индикаторы загрузки и состояния
- Оптимизировать работу realtime соединения
- Улучшить доступность интерфейса
- Добавить оптимизацию для мобильных устройств

---

## 🎯 Контекст

Это вторая часть седьмого этапа рефакторинга модуля логирования вебхуков (TASK-018) для Vue.js программиста. После рефакторинга компонентов (TASK-018-07-01) необходимо оптимизировать производительность и улучшить пользовательский опыт интерфейса.

**Текущее состояние:**
- Списки логов рендерятся полностью (медленно при большом количестве)
- Нет виртуализации для больших списков
- Кеширование не оптимизировано
- Большие payload загружаются полностью
- Нет плавных анимаций
- Индикаторы загрузки базовые
- Realtime соединение не оптимизировано

**Целевое состояние:**
- Виртуализация списков для больших объёмов данных
- Оптимизированное кеширование
- Ленивая загрузка больших payload
- Плавные анимации и переходы
- Улучшенные индикаторы загрузки
- Оптимизированное realtime соединение
- Улучшенная доступность
- Адаптивность для мобильных устройств

**Связи:**
- Зависит от: TASK-018-07-01 (обновлённые компоненты)
- **Бэкенд:** Оптимизированный API с пагинацией и кешированием

---

## 📁 Модули и компоненты

### Файлы для создания:

1. **`vue-app/src/composables/useVirtualList.js`**
   - Composable для виртуализации списков
   - Оптимизация рендеринга больших списков

2. **`vue-app/src/composables/useLazyLoad.js`**
   - Composable для ленивой загрузки данных
   - Оптимизация загрузки больших payload

3. **`vue-app/src/utils/performance-monitor.js`**
   - Утилита для мониторинга производительности
   - Измерение времени рендеринга

4. **`vue-app/src/utils/memory-manager.js`**
   - Утилита для управления памятью
   - Очистка неиспользуемых данных

### Файлы для изменения:

1. **`vue-app/src/pages/WebhookLogsPage.vue`**
   - Интеграция виртуализации списков
   - Оптимизация кеширования
   - Улучшение индикаторов загрузки

2. **`vue-app/src/components/webhooks/WebhookLogList.vue`**
   - Виртуализация списка логов
   - Оптимизация рендеринга
   - Улучшение производительности сортировки

3. **`vue-app/src/components/webhooks/WebhookLogDetails.vue`**
   - Ленивая загрузка больших payload
   - Оптимизация отображения JSON
   - Улучшение производительности

4. **`vue-app/src/components/webhooks/WebhookLogsDashboard.vue`**
   - Оптимизация рендеринга графиков
   - Ленивая загрузка данных

5. **`vue-app/src/composables/useRealtime.js`**
   - Оптимизация работы SSE соединения
   - Улучшение обработки новых логов

6. **`vue-app/src/services/webhook-logs-api.js`**
   - Оптимизация кеширования
   - Улучшение работы с большими данными

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Создание composable для виртуализации списков

**1.1. Создать файл `vue-app/src/composables/useVirtualList.js`:**

```javascript
/**
 * Composable для виртуализации больших списков
 * 
 * Расположение: vue-app/src/composables/useVirtualList.js
 * 
 * Оптимизирует рендеринг больших списков, отображая только видимые элементы
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';

/**
 * @typedef {Object} VirtualListOptions
 * @property {number} itemHeight - Высота одного элемента (в пикселях)
 * @property {number} overscan - Количество элементов для рендеринга вне видимой области
 * @property {HTMLElement|null} container - Контейнер для скролла (null = window)
 */

/**
 * Composable для виртуализации списка
 * 
 * @param {Array} items - Массив элементов для виртуализации
 * @param {VirtualListOptions} options - Опции виртуализации
 * @returns {Object} API для работы с виртуализированным списком
 */
export function useVirtualList(items, options = {}) {
  const {
    itemHeight = 50,
    overscan = 5,
    container = null
  } = options;

  const scrollTop = ref(0);
  const containerHeight = ref(0);
  const containerRef = ref(null);

  // Вычисление видимых элементов
  const visibleItems = computed(() => {
    if (!items.value || items.value.length === 0) {
      return [];
    }

    const startIndex = Math.max(0, Math.floor(scrollTop.value / itemHeight) - overscan);
    const endIndex = Math.min(
      items.value.length - 1,
      Math.ceil((scrollTop.value + containerHeight.value) / itemHeight) + overscan
    );

    return items.value.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      offset: (startIndex + index) * itemHeight
    }));
  });

  // Общая высота списка
  const totalHeight = computed(() => {
    return (items.value?.length || 0) * itemHeight;
  });

  // Смещение для видимых элементов
  const offsetY = computed(() => {
    if (visibleItems.value.length === 0) {
      return 0;
    }
    return visibleItems.value[0].offset;
  });

  // Обработчик скролла
  const handleScroll = (event) => {
    const target = container || event.target;
    scrollTop.value = target.scrollTop || window.scrollY;
  };

  // Обновление размеров контейнера
  const updateContainerHeight = () => {
    if (containerRef.value) {
      containerHeight.value = containerRef.value.clientHeight;
    } else if (container) {
      containerHeight.value = container.clientHeight;
    } else {
      containerHeight.value = window.innerHeight;
    }
  };

  // Инициализация
  onMounted(() => {
    updateContainerHeight();
    
    const scrollContainer = container || window;
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateContainerHeight, { passive: true });
  });

  // Очистка
  onUnmounted(() => {
    const scrollContainer = container || window;
    scrollContainer.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', updateContainerHeight);
  });

  return {
    visibleItems,
    totalHeight,
    offsetY,
    containerRef,
    updateContainerHeight
  };
}
```

**1.2. Создать оптимизированную версию для таблиц:**

```javascript
/**
 * Composable для виртуализации таблиц
 * 
 * @param {Array} items - Массив элементов
 * @param {Object} options - Опции
 * @returns {Object} API для виртуализированной таблицы
 */
export function useVirtualTable(items, options = {}) {
  const {
    rowHeight = 50,
    headerHeight = 40,
    overscan = 5,
    container = null
  } = options;

  const scrollTop = ref(0);
  const containerHeight = ref(0);
  const containerRef = ref(null);

  // Видимые строки
  const visibleRows = computed(() => {
    if (!items.value || items.value.length === 0) {
      return [];
    }

    const availableHeight = containerHeight.value - headerHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop.value / rowHeight) - overscan);
    const endIndex = Math.min(
      items.value.length - 1,
      Math.ceil((scrollTop.value + availableHeight) / rowHeight) + overscan
    );

    return items.value.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      offset: headerHeight + (startIndex + index) * rowHeight
    }));
  });

  // Общая высота таблицы
  const totalHeight = computed(() => {
    return headerHeight + (items.value?.length || 0) * rowHeight;
  });

  // Смещение для видимых строк
  const offsetY = computed(() => {
    if (visibleRows.value.length === 0) {
      return headerHeight;
    }
    return visibleRows.value[0].offset;
  });

  // Обработчик скролла
  const handleScroll = (event) => {
    const target = container || event.target;
    scrollTop.value = target.scrollTop || window.scrollY;
  };

  // Обновление размеров
  const updateContainerHeight = () => {
    if (containerRef.value) {
      containerHeight.value = containerRef.value.clientHeight;
    } else if (container) {
      containerHeight.value = container.clientHeight;
    } else {
      containerHeight.value = window.innerHeight;
    }
  };

  onMounted(() => {
    updateContainerHeight();
    const scrollContainer = container || window;
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateContainerHeight, { passive: true });
  });

  onUnmounted(() => {
    const scrollContainer = container || window;
    scrollContainer.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', updateContainerHeight);
  });

  return {
    visibleRows,
    totalHeight,
    offsetY,
    containerRef,
    updateContainerHeight,
    headerHeight
  };
}
```

**Результат шага 1:**
- Composable для виртуализации списков создан
- Composable для виртуализации таблиц создан
- Оптимизация рендеринга реализована

---

### Шаг 2: Интеграция виртуализации в WebhookLogList.vue

**2.1. Обновить `WebhookLogList.vue` для использования виртуализации:**

```vue
<script setup>
import { ref, computed } from 'vue';
import { useVirtualTable } from '@/composables/useVirtualList.js';
import { formatTimestamp, formatEventType, formatCategory } from '@/utils/webhook-formatters.js';
import { isValidWebhookLogEntry } from '@/types/webhook-logs.js';

const props = defineProps({
  logs: {
    type: Array,
    required: true,
    validator: (value) => {
      return Array.isArray(value) && value.every(log => isValidWebhookLogEntry(log));
    }
  },
  // ... остальные props
});

// Виртуализация таблицы
const logsRef = computed(() => props.logs);

const {
  visibleRows,
  totalHeight,
  offsetY,
  containerRef,
  updateContainerHeight,
  headerHeight
} = useVirtualTable(logsRef, {
  rowHeight: 60, // Высота строки таблицы
  headerHeight: 50, // Высота заголовка
  overscan: 3 // Количество строк вне видимой области
});

// Обновление размеров при изменении контейнера
watch(() => props.logs.length, () => {
  updateContainerHeight();
});
</script>

<template>
  <div class="webhook-log-list" ref="containerRef">
    <div 
      class="virtual-table-container"
      :style="{ height: `${totalHeight}px`, position: 'relative' }"
    >
      <!-- Заголовок таблицы (фиксированный) -->
      <div 
        class="table-header"
        :style="{ height: `${headerHeight}px`, position: 'sticky', top: 0, zIndex: 10 }"
      >
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
                />
              </th>
              <th @click="handleSort('timestamp')" class="sortable">
                Дата и время
                <span class="sort-icon">{{ getSortIcon('timestamp') }}</span>
              </th>
              <th @click="handleSort('event')" class="sortable">
                Тип события
                <span class="sort-icon">{{ getSortIcon('event') }}</span>
              </th>
              <th @click="handleSort('category')" class="sortable">
                Категория
                <span class="sort-icon">{{ getSortIcon('category') }}</span>
              </th>
              <th @click="handleSort('ip')" class="sortable">
                IP
                <span class="sort-icon">{{ getSortIcon('ip') }}</span>
              </th>
              <th>Детали</th>
              <th>Действия</th>
            </tr>
          </thead>
        </table>
      </div>

      <!-- Виртуализированное тело таблицы -->
      <div 
        class="table-body"
        :style="{ transform: `translateY(${offsetY}px)` }"
      >
        <table class="logs-table">
          <tbody>
            <tr
              v-for="row in visibleRows"
              :key="getLogId(row.item)"
              @click="handleLogClick(row.item)"
              class="log-row"
              :class="{ 'row-selected': isSelected(row.item) }"
              :style="{ height: '60px' }"
            >
              <td @click.stop>
                <input
                  type="checkbox"
                  :checked="isSelected(row.item)"
                  @change="handleSelectLog(row.item, $event)"
                  class="checkbox-input"
                />
              </td>
              <td>{{ formatTimestamp(row.item.timestamp) }}</td>
              <td>
                <span class="event-badge" :class="getEventClass(row.item.event)">
                  {{ formatEventType(row.item.event) }}
                </span>
              </td>
              <td>
                <span class="category-badge" :class="getCategoryClass(row.item.category)">
                  {{ formatCategory(row.item.category) }}
                </span>
              </td>
              <td>{{ row.item.ip || 'N/A' }}</td>
              <td>
                <div class="details-preview">
                  {{ formatDetailsPreview(row.item) }}
                </div>
              </td>
              <td>
                <button
                  @click.stop="handleLogClick(row.item)"
                  class="btn-view"
                >
                  Просмотр
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.webhook-log-list {
  height: 100%;
  overflow-y: auto;
  position: relative;
}

.virtual-table-container {
  position: relative;
}

.table-header {
  background: white;
  border-bottom: 2px solid #e0e0e0;
}

.table-body {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
}

.log-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.log-row:hover {
  background-color: #f5f5f5;
}

.log-row.row-selected {
  background-color: #e3f2fd;
}
</style>
```

**Результат шага 2:**
- Виртуализация интегрирована в `WebhookLogList.vue`
- Производительность рендеринга улучшена
- Оптимизация для больших списков реализована

---

### Шаг 3: Создание composable для ленивой загрузки

**3.1. Создать файл `vue-app/src/composables/useLazyLoad.js`:**

```javascript
/**
 * Composable для ленивой загрузки данных
 * 
 * Расположение: vue-app/src/composables/useLazyLoad.js
 * 
 * Оптимизирует загрузку больших данных через ленивую загрузку
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

/**
 * Composable для ленивой загрузки данных
 * 
 * @param {Function} loadFunction - Функция загрузки данных
 * @param {Object} options - Опции
 * @returns {Object} API для ленивой загрузки
 */
export function useLazyLoad(loadFunction, options = {}) {
  const {
    threshold = 100, // Порог в пикселях до конца для начала загрузки
    initialLoad = true, // Загружать ли сразу
    enabled = true // Включена ли ленивая загрузка
  } = options;

  const data = ref([]);
  const loading = ref(false);
  const hasMore = ref(true);
  const error = ref(null);
  const containerRef = ref(null);

  // Загрузка данных
  const load = async (append = false) => {
    if (loading.value || (!hasMore.value && append)) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const result = await loadFunction({
        offset: append ? data.value.length : 0,
        limit: 50
      });

      if (append) {
        data.value.push(...result.items);
      } else {
        data.value = result.items;
      }

      hasMore.value = result.hasMore || false;
    } catch (err) {
      error.value = err.message || 'Ошибка загрузки данных';
      console.error('[useLazyLoad] Ошибка загрузки:', err);
    } finally {
      loading.value = false;
    }
  };

  // Проверка, нужно ли загружать ещё данные
  const checkAndLoad = () => {
    if (!enabled || !hasMore.value || loading.value) {
      return;
    }

    if (!containerRef.value) {
      return;
    }

    const container = containerRef.value;
    const scrollTop = container.scrollTop || window.scrollY;
    const scrollHeight = container.scrollHeight || document.documentElement.scrollHeight;
    const clientHeight = container.clientHeight || window.innerHeight;

    const distanceToBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceToBottom < threshold) {
      load(true); // Загружаем ещё данные
    }
  };

  // Обработчик скролла
  const handleScroll = () => {
    checkAndLoad();
  };

  // Инициализация
  onMounted(() => {
    if (initialLoad) {
      load(false);
    }

    const scrollContainer = containerRef.value || window;
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
  });

  // Очистка
  onUnmounted(() => {
    const scrollContainer = containerRef.value || window;
    scrollContainer.removeEventListener('scroll', handleScroll);
  });

  // Сброс данных
  const reset = () => {
    data.value = [];
    hasMore.value = true;
    error.value = null;
    if (initialLoad) {
      load(false);
    }
  };

  return {
    data,
    loading,
    hasMore,
    error,
    containerRef,
    load,
    reset,
    checkAndLoad
  };
}
```

**Результат шага 3:**
- Composable для ленивой загрузки создан
- Оптимизация загрузки данных реализована

---

### Шаг 4: Оптимизация WebhookLogDetails.vue для больших payload

**4.1. Обновить `WebhookLogDetails.vue` для ленивой загрузки payload:**

```vue
<script setup>
import { ref, computed, watch } from 'vue';
import { formatTimestamp, formatEventType, formatCategory } from '@/utils/webhook-formatters.js';
import { isValidWebhookLogEntry } from '@/types/webhook-logs.js';

const props = defineProps({
  log: {
    type: Object,
    required: true,
    validator: (value) => {
      return isValidWebhookLogEntry(value);
    }
  }
});

const MAX_DISPLAY_SIZE = 100 * 1024; // 100 КБ
const showFullPayload = ref(false);
const payloadExpanded = ref(false);

// Размер payload
const payloadSize = computed(() => {
  if (!props.log.payload) {
    return 0;
  }
  
  try {
    const jsonString = JSON.stringify(props.log.payload);
    return new Blob([jsonString]).size;
  } catch (e) {
    return 0;
  }
});

// Нужно ли лениво загружать payload
const shouldLazyLoadPayload = computed(() => {
  return payloadSize.value > MAX_DISPLAY_SIZE;
});

// Отображаемый payload (обрезанный или полный)
const displayPayload = computed(() => {
  if (!props.log.payload) {
    return null;
  }

  if (!shouldLazyLoadPayload.value || showFullPayload.value) {
    return props.log.payload;
  }

  // Для больших payload показываем только структуру
  return getPayloadStructure(props.log.payload);
});

// Получение структуры payload (без данных)
const getPayloadStructure = (payload) => {
  if (typeof payload !== 'object' || payload === null) {
    return payload;
  }

  if (Array.isArray(payload)) {
    return {
      _type: 'array',
      _length: payload.length,
      _preview: payload.slice(0, 3).map(item => getPayloadStructure(item))
    };
  }

  const structure = {
    _type: 'object',
    _keys: Object.keys(payload).slice(0, 10) // Первые 10 ключей
  };

  // Добавляем превью значений для первых ключей
  for (const key of structure._keys.slice(0, 3)) {
    const value = payload[key];
    if (typeof value === 'object' && value !== null) {
      structure[key] = getPayloadStructure(value);
    } else {
      structure[key] = value;
    }
  }

  return structure;
};

// Форматирование JSON с обработкой больших данных
const formatJSON = (data) => {
  if (!data) {
    return 'null';
  }

  try {
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return String(data);
  }
};
</script>

<template>
  <div v-if="log" class="webhook-log-details">
    <!-- ... остальной контент ... -->
    
    <!-- Полный payload с ленивой загрузкой -->
    <div v-if="log.payload" class="details-section">
      <div class="section-header">
        <h4>Полный payload</h4>
        <div class="section-actions">
          <span v-if="shouldLazyLoadPayload && !showFullPayload" class="size-warning">
            Большой JSON ({{ formatBytes(payloadSize) }})
          </span>
          <button 
            v-if="shouldLazyLoadPayload && !showFullPayload"
            @click="showFullPayload = true"
            class="btn-show-more"
          >
            Показать полностью
          </button>
          <button 
            @click="copyFullPayload"
            class="btn-copy-section"
          >
            📋 Копировать
          </button>
        </div>
      </div>
      
      <div class="payload-container">
        <pre 
          v-if="displayPayload"
          class="json-viewer"
          :class="{ 'json-compact': !payloadExpanded && shouldLazyLoadPayload && !showFullPayload }"
        >
          {{ formatJSON(displayPayload) }}
        </pre>
        <div v-else class="payload-loading">
          Загрузка payload...
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.payload-container {
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px;
  background: #f9f9f9;
}

.json-viewer {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.json-compact {
  opacity: 0.7;
}

.size-warning {
  color: #ff9800;
  font-size: 12px;
  margin-right: 10px;
}
</style>
```

**Результат шага 4:**
- Ленивая загрузка payload реализована
- Оптимизация для больших данных добавлена
- Производительность улучшена

---

### Шаг 5: Оптимизация кеширования в WebhookLogsApiService

**5.1. Улучшить кеширование в `webhook-logs-api.js`:**

```javascript
// В WebhookLogsApiService

// Улучшенное кеширование с приоритетами
const { get, set, getCacheKey, invalidate } = useCache({
  ttl: 2 * 60 * 1000, // 2 минуты
  maxSize: 100, // Увеличено до 100 записей
  strategy: 'lru' // Стратегия LRU (Least Recently Used)
});

// Кеширование с индексацией
const cacheIndex = new Map(); // Индекс для быстрого поиска в кеше

/**
 * Получение логов с улучшенным кешированием
 */
static async getLogs(filters = {}, page = 1, limit = 50, forceRefresh = false) {
  // ... валидация параметров ...
  
  const cacheKey = getCacheKey(this.BASE_URL, { 
    filters: simpleFilters, 
    page, 
    limit 
  });
  
  // Проверка кеша с приоритетом
  if (!forceRefresh) {
    const cached = get(cacheKey);
    if (cached) {
      // Обновление индекса использования
      cacheIndex.set(cacheKey, Date.now());
      return cached;
    }
    
    // Попытка найти похожий запрос в кеше (для оптимизации)
    const similarCache = this.findSimilarCache(simpleFilters, page, limit);
    if (similarCache) {
      console.log('[WebhookLogsApiService] Using similar cache');
      return similarCache;
    }
  }
  
  // ... загрузка данных ...
  
  // Сохранение в кеш с приоритетом
  set(cacheKey, normalizedResult);
  cacheIndex.set(cacheKey, Date.now());
  
  return normalizedResult;
}

/**
 * Поиск похожего запроса в кеше
 */
static findSimilarCache(filters, page, limit) {
  // Поиск кеша с теми же фильтрами, но другой страницей
  for (const [key, timestamp] of cacheIndex.entries()) {
    if (Date.now() - timestamp < 60000) { // Кеш не старше минуты
      const cached = get(key);
      if (cached && this.isSimilarRequest(cached.filters, filters)) {
        return cached;
      }
    }
  }
  return null;
}

/**
 * Проверка, похожи ли запросы
 */
static isSimilarRequest(filters1, filters2) {
  const keys = ['category', 'event', 'date', 'ip'];
  for (const key of keys) {
    if (filters1[key] !== filters2[key]) {
      return false;
    }
  }
  return true;
}
```

**Результат шага 5:**
- Кеширование оптимизировано
- Стратегия LRU реализована
- Поиск похожих запросов добавлен

---

### Шаг 6: Улучшение анимаций и переходов

**6.1. Создать файл `vue-app/src/utils/animations.js`:**

```javascript
/**
 * Утилиты для анимаций и переходов
 * 
 * Расположение: vue-app/src/utils/animations.js
 */

/**
 * Плавное появление элемента
 */
export function fadeIn(element, duration = 300) {
  element.style.opacity = '0';
  element.style.transition = `opacity ${duration}ms ease-in-out`;
  
  requestAnimationFrame(() => {
    element.style.opacity = '1';
  });
}

/**
 * Плавное исчезновение элемента
 */
export function fadeOut(element, duration = 300) {
  return new Promise((resolve) => {
    element.style.transition = `opacity ${duration}ms ease-in-out`;
    element.style.opacity = '0';
    
    setTimeout(() => {
      resolve();
    }, duration);
  });
}

/**
 * Анимация появления списка (stagger)
 */
export function staggerIn(elements, delay = 50) {
  elements.forEach((element, index) => {
    setTimeout(() => {
      fadeIn(element, 200);
    }, index * delay);
  });
}

/**
 * Плавная прокрутка к элементу
 */
export function smoothScrollTo(element, offset = 0) {
  const elementPosition = element.getBoundingClientRect().top + window.scrollY;
  const offsetPosition = elementPosition - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
}
```

**6.2. Добавить CSS переходы в компоненты:**

```vue
<style scoped>
/* Плавные переходы для списка */
.log-row {
  transition: all 0.2s ease-in-out;
}

.log-row-enter-active {
  transition: all 0.3s ease-out;
}

.log-row-leave-active {
  transition: all 0.2s ease-in;
}

.log-row-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.log-row-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Анимация загрузки */
.loading-skeleton {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Плавное появление модального окна */
.modal-enter-active {
  transition: all 0.3s ease-out;
}

.modal-leave-active {
  transition: all 0.2s ease-in;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
```

**Результат шага 6:**
- Утилиты для анимаций созданы
- Плавные переходы добавлены
- UX улучшен

---

### Шаг 7: Улучшение индикаторов загрузки

**7.1. Создать улучшенный компонент загрузки:**

```vue
<!-- vue-app/src/components/common/LoadingProgress.vue -->
<template>
  <div class="loading-progress" v-if="loading">
    <div class="progress-bar">
      <div 
        class="progress-fill"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>
    <div class="progress-text">
      {{ message || 'Загрузка...' }}
      <span v-if="showPercentage">({{ progress }}%)</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  progress: {
    type: Number,
    default: 0,
    validator: (value) => {
      return value >= 0 && value <= 100;
    }
  },
  message: {
    type: String,
    default: null
  },
  showPercentage: {
    type: Boolean,
    default: false
  }
});
</script>

<style scoped>
.loading-progress {
  padding: 20px;
  text-align: center;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2196F3, #21CBF3);
  transition: width 0.3s ease-out;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.progress-text {
  font-size: 14px;
  color: #666;
}
</style>
```

**7.2. Интегрировать в WebhookLogsPage.vue:**

```vue
<template>
  <div class="webhook-logs-page">
    <!-- ... остальной контент ... -->
    
    <!-- Улучшенный индикатор загрузки -->
    <LoadingProgress
      v-if="loading"
      :loading="loading"
      :progress="loadProgress"
      :message="loadMessage"
      :show-percentage="false"
    />
    
    <!-- ... остальной контент ... -->
  </div>
</template>

<script setup>
import LoadingProgress from '@/components/common/LoadingProgress.vue';

const loadProgress = ref(0);
const loadMessage = ref('Загрузка логов...');

const loadLogs = async (forceRefresh = false) => {
  loading.value = true;
  loadProgress.value = 0;
  loadMessage.value = 'Загрузка логов...';
  
  try {
    // Симуляция прогресса загрузки
    const progressInterval = setInterval(() => {
      if (loadProgress.value < 90) {
        loadProgress.value += 10;
      }
    }, 100);
    
    // ... загрузка данных ...
    
    clearInterval(progressInterval);
    loadProgress.value = 100;
    loadMessage.value = 'Загрузка завершена';
    
    setTimeout(() => {
      loadProgress.value = 0;
    }, 500);
    
  } catch (err) {
    // ... обработка ошибок ...
  } finally {
    loading.value = false;
  }
};
</script>
```

**Результат шага 7:**
- Улучшенный индикатор загрузки создан
- Прогресс загрузки отображается
- UX улучшен

---

### Шаг 8: Оптимизация realtime соединения

**8.1. Улучшить `useRealtime.js` для оптимизации:**

```javascript
// В useRealtime composable

// Батчинг новых логов (группировка для уменьшения обновлений)
const logBatch = ref([]);
const batchTimeout = ref(null);
const BATCH_DELAY = 500; // Задержка для батчинга (мс)

const handleNewLogs = (data) => {
  let logs = data.logs || [];
  
  // Валидация и нормализация
  if (validateLogs) {
    logs = normalizeWebhookLogEntries(logs);
    logs = logs.filter(log => isValidWebhookLogEntry(log));
  }
  
  if (logs.length === 0) {
    return;
  }
  
  // Добавление в батч
  logBatch.value.push(...logs);
  
  // Очистка предыдущего таймера
  if (batchTimeout.value) {
    clearTimeout(batchTimeout.value);
  }
  
  // Установка нового таймера для обработки батча
  batchTimeout.value = setTimeout(() => {
    processLogBatch();
  }, BATCH_DELAY);
};

// Обработка батча логов
const processLogBatch = () => {
  if (logBatch.value.length === 0) {
    return;
  }
  
  // Обработка всех логов в батче
  newLogs.value.push(...logBatch.value);
  newLogsCount.value += logBatch.value.length;
  lastUpdateTime.value = new Date().toISOString();
  
  // Очистка батча
  logBatch.value = [];
  
  // Callback
  if (onNewLogs) {
    onNewLogs(newLogs.value.slice(-logBatch.value.length));
  }
  
  // Звуковое уведомление
  if (enableSound) {
    playNotificationSound();
  }
};

// Очистка при размонтировании
onUnmounted(() => {
  if (batchTimeout.value) {
    clearTimeout(batchTimeout.value);
  }
  disconnect();
});
```

**Результат шага 8:**
- Батчинг новых логов реализован
- Оптимизация realtime соединения добавлена
- Производительность улучшена

---

## 📊 Критерии приёмки

- [ ] Composable `useVirtualList` создан и работает
- [ ] Composable `useVirtualTable` создан и работает
- [ ] Виртуализация интегрирована в `WebhookLogList.vue`
- [ ] Производительность рендеринга списков улучшена
- [ ] Composable `useLazyLoad` создан и работает
- [ ] Ленивая загрузка payload реализована в `WebhookLogDetails.vue`
- [ ] Кеширование оптимизировано в `WebhookLogsApiService`
- [ ] Стратегия LRU для кеша реализована
- [ ] Утилиты для анимаций созданы
- [ ] Плавные переходы добавлены в компоненты
- [ ] Улучшенный индикатор загрузки создан
- [ ] Прогресс загрузки отображается
- [ ] Realtime соединение оптимизировано
- [ ] Батчинг новых логов реализован
- [ ] Производительность интерфейса улучшена
- [ ] UX улучшен (анимации, индикаторы)
- [ ] Код соответствует стандартам ESLint
- [ ] JSDoc комментарии добавлены
- [ ] **Производительность протестирована с большими объёмами данных (1000+ записей)**
- [ ] **Время загрузки страницы < 2 секунд**
- [ ] **Плавность анимаций 60 FPS**
- [ ] **Нет утечек памяти**

---

## 🔍 Проверка выполнения

**Команды для проверки:**
```bash
# Проверить производительность
npm run build
npm run preview

# Проверить размер бандла
npm run analyze

# Проверить работу в браузере
# Открыть DevTools → Performance и проверить:
# 1. Время загрузки
# 2. FPS при скролле
# 3. Использование памяти
# 4. Время рендеринга
```

**Ручное тестирование:**
1. Открыть страницу с большим количеством логов (1000+)
2. Проверить плавность скролла
3. Проверить время загрузки
4. Проверить работу виртуализации
5. Проверить ленивую загрузку payload
6. Проверить работу кеширования
7. Проверить анимации и переходы
8. Проверить индикаторы загрузки
9. Проверить работу realtime
10. Проверить использование памяти (нет утечек)

---

## 🔗 Связи с другими этапами

**Зависит от:**
- **TASK-018-07-01:** Использует обновлённые компоненты

---

## 📝 История правок

- **2025-12-07 17:00 (UTC+3, Брест):** Создана задача оптимизации производительности и улучшения UX Vue.js интерфейса

---

## 💡 Дополнительные рекомендации

1. **Мониторинг производительности:**
   - Использовать Performance API для измерения
   - Логировать медленные операции
   - Алерты при деградации производительности

2. **Оптимизация бандла:**
   - Code splitting для больших компонентов
   - Ленивая загрузка библиотек
   - Tree shaking для удаления неиспользуемого кода

3. **Кеширование:**
   - Service Worker для офлайн-работы
   - IndexedDB для больших объёмов данных
   - Оптимизация стратегий кеширования

4. **Доступность:**
   - ARIA атрибуты для скринридеров
   - Клавиатурная навигация
   - Контрастность цветов


