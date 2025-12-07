# TASK-017-07: Оптимизация производительности

**Дата создания:** 2025-12-07 05:25 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-017](./TASK-017-webhook-logs-ui-implementation-plan.md)

---

## 📋 Описание

Оптимизировать производительность интерфейса: реализовать виртуализацию списка, добавить кеширование запросов, оптимизировать рендеринг больших JSON, реализовать ленивую загрузку, добавить debounce, оптимизировать размер бандла.

---

## 🎯 Контекст

Этап 7 из глобального плана TASK-017. При работе с большими объёмами данных необходимо обеспечить быструю работу интерфейса.

---

## 📁 Модули и компоненты

- `vue-app/src/components/webhooks/WebhookLogList.vue` — виртуализация списка
- `vue-app/src/composables/useCache.js` — composable для кеширования
- `vue-app/src/components/webhooks/WebhookLogDetails.vue` — оптимизация JSON рендеринга

---

## 🔗 Зависимости

**От других задач:**
- **TASK-017-02** — базовые компоненты должны работать
- **TASK-017-03** — поиск должен работать

---

## 📝 Ступенчатые подзадачи

### 1. Виртуализация списка

1.1. Установить библиотеку для виртуализации (vue-virtual-scroller)
1.2. Интегрировать виртуализацию в WebhookLogList
1.3. Настроить размер элементов
1.4. Протестировать производительность

### 2. Кеширование запросов

2.1. Создать composable для кеширования
2.2. Реализовать кеширование запросов к API
2.3. Добавить инвалидацию кеша при изменении фильтров
2.4. Настроить TTL для кеша

### 3. Оптимизация рендеринга JSON

3.1. Реализовать ленивый рендеринг больших JSON
3.2. Добавить сворачивание/разворачивание для больших объектов
3.3. Использовать виртуализацию для больших массивов в JSON
3.4. Оптимизировать syntax highlighting

### 4. Ленивая загрузка компонентов

4.1. Использовать динамические импорты для тяжёлых компонентов
4.2. Лениво загружать графики
4.3. Лениво загружать детальный просмотр

### 5. Debounce и throttle

5.1. Убедиться, что поиск использует debounce
5.2. Добавить throttle для скролла
5.3. Оптимизировать обработчики событий

### 6. Оптимизация бандла

6.1. Анализировать размер бандла
6.2. Удалить неиспользуемые зависимости
6.3. Использовать tree-shaking
6.4. Оптимизировать импорты библиотек

---

## ⚙️ Технические требования

### 1. Виртуализация списка

#### Установка библиотеки

```bash
npm install vue-virtual-scroller
```

#### Альтернатива: собственная реализация виртуализации

Если не хотите добавлять зависимость, можно реализовать простую виртуализацию:

```vue
<template>
  <div class="virtual-list" ref="container" @scroll="handleScroll">
    <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
      <div
        :style="{
          transform: `translateY(${offsetY}px)`,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0
        }"
      >
        <div
          v-for="log in visibleLogs"
          :key="getLogId(log)"
          class="log-item"
          :style="{ height: `${itemHeight}px` }"
          @click="handleLogSelect(log)"
        >
          <LogItem :log="log" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';

export default {
  name: 'VirtualizedLogList',
  props: {
    logs: {
      type: Array,
      required: true
    },
    itemHeight: {
      type: Number,
      default: 80
    },
    overscan: {
      type: Number,
      default: 5
    }
  },
  emits: ['select-log'],
  setup(props, { emit }) {
    const container = ref(null);
    const scrollTop = ref(0);
    const containerHeight = ref(0);

    const totalHeight = computed(() => props.logs.length * props.itemHeight);

    const visibleRange = computed(() => {
      const start = Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.overscan);
      const end = Math.min(
        props.logs.length,
        Math.ceil((scrollTop.value + containerHeight.value) / props.itemHeight) + props.overscan
      );
      return { start, end };
    });

    const visibleLogs = computed(() => {
      const { start, end } = visibleRange.value;
      return props.logs.slice(start, end).map((log, index) => ({
        ...log,
        _virtualIndex: start + index
      }));
    });

    const offsetY = computed(() => {
      return visibleRange.value.start * props.itemHeight;
    });

    const handleScroll = (event) => {
      scrollTop.value = event.target.scrollTop;
    };

    const updateContainerHeight = () => {
      if (container.value) {
        containerHeight.value = container.value.clientHeight;
      }
    };

    onMounted(() => {
      updateContainerHeight();
      window.addEventListener('resize', updateContainerHeight);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', updateContainerHeight);
    });

    const getLogId = (log) => {
      return `${log.timestamp}_${log.event}_${log.ip || 'unknown'}`;
    };

    const handleLogSelect = (log) => {
      emit('select-log', log);
    };

    return {
      container,
      totalHeight,
      visibleLogs,
      offsetY,
      handleScroll,
      getLogId,
      handleLogSelect
    };
  }
};
</script>

<style scoped>
.virtual-list {
  height: 600px;
  overflow-y: auto;
  overflow-x: hidden;
}

.log-item {
  border-bottom: 1px solid #eee;
}
</style>
```

#### Использование vue-virtual-scroller (рекомендуется)

```vue
<template>
  <RecycleScroller
    class="scroller"
    :items="logs"
    :item-size="itemHeight"
    :buffer="200"
    key-field="id"
    v-slot="{ item, index }"
  >
    <LogItem 
      :log="item" 
      :index="index"
      @click="handleLogSelect(item)" 
    />
  </RecycleScroller>
</template>

<script>
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import LogItem from './LogItem.vue';

export default {
  name: 'VirtualizedLogList',
  components: {
    RecycleScroller,
    LogItem
  },
  props: {
    logs: {
      type: Array,
      required: true
    },
    itemHeight: {
      type: Number,
      default: 80
    }
  },
  emits: ['select-log'],
  setup(props, { emit }) {
    const getLogId = (log) => {
      return `${log.timestamp}_${log.event}_${log.ip || 'unknown'}`;
    };

    const handleLogSelect = (log) => {
      emit('select-log', log);
    };

    return {
      getLogId,
      handleLogSelect
    };
  }
};
</script>

<style scoped>
.scroller {
  height: 600px;
}
</style>
```

### 2. Кеширование запросов

#### Полная реализация composable для кеширования

```javascript
// vue-app/src/composables/useCache.js
import { ref, computed } from 'vue';

// Глобальный кеш (можно сделать реактивным для отладки)
const cache = ref(new Map());
const cacheStats = ref({
  hits: 0,
  misses: 0,
  sets: 0,
  invalidations: 0
});

// Конфигурация кеша
const CACHE_CONFIG = {
  defaultTTL: 5 * 60 * 1000, // 5 минут
  maxSize: 100, // Максимальное количество записей
  enableStats: true // Включить статистику
};

/**
 * Composable для кеширования данных
 * 
 * Поддерживает:
 * - TTL (время жизни кеша)
 * - LRU (Least Recently Used) eviction
 * - Статистику использования
 * - Инвалидацию по паттернам
 */
export function useCache(config = {}) {
  const {
    ttl = CACHE_CONFIG.defaultTTL,
    maxSize = CACHE_CONFIG.maxSize,
    enableStats = CACHE_CONFIG.enableStats
  } = config;

  /**
   * Генерация ключа кеша из URL и параметров
   * 
   * @param {string} url URL запроса
   * @param {Object} params Параметры запроса
   * @returns {string} Ключ кеша
   */
  const getCacheKey = (url, params = {}) => {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});
    
    return `${url}_${JSON.stringify(sortedParams)}`;
  };

  /**
   * Получение данных из кеша
   * 
   * @param {string} key Ключ кеша
   * @returns {any|null} Данные или null
   */
  const get = (key) => {
    const cached = cache.value.get(key);
    
    if (!cached) {
      if (enableStats) cacheStats.value.misses++;
      return null;
    }
    
    // Проверка TTL
    const age = Date.now() - cached.timestamp;
    if (age > cached.ttl) {
      cache.value.delete(key);
      if (enableStats) cacheStats.value.misses++;
      return null;
    }
    
    // Обновление времени последнего доступа (для LRU)
    cached.lastAccessed = Date.now();
    
    if (enableStats) cacheStats.value.hits++;
    return cached.data;
  };

  /**
   * Сохранение данных в кеш
   * 
   * @param {string} key Ключ кеша
   * @param {any} data Данные для кеширования
   * @param {number} customTTL Кастомный TTL (опционально)
   */
  const set = (key, data, customTTL = null) => {
    // Проверка размера кеша и удаление старых записей (LRU)
    if (cache.value.size >= maxSize) {
      evictLRU();
    }
    
    cache.value.set(key, {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      ttl: customTTL || ttl
    });
    
    if (enableStats) cacheStats.value.sets++;
  };

  /**
   * Удаление наименее используемой записи (LRU)
   */
  const evictLRU = () => {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, value] of cache.value.entries()) {
      if (value.lastAccessed < oldestTime) {
        oldestTime = value.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      cache.value.delete(oldestKey);
    }
  };

  /**
   * Очистка всего кеша
   */
  const clear = () => {
    cache.value.clear();
    if (enableStats) {
      cacheStats.value = {
        hits: 0,
        misses: 0,
        sets: 0,
        invalidations: 0
      };
    }
  };

  /**
   * Инвалидация кеша по паттерну
   * 
   * @param {string|RegExp} pattern Паттерн для поиска ключей
   */
  const invalidate = (pattern) => {
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern) 
      : pattern;
    
    let invalidated = 0;
    for (const key of cache.value.keys()) {
      if (regex.test(key)) {
        cache.value.delete(key);
        invalidated++;
      }
    }
    
    if (enableStats) cacheStats.value.invalidations += invalidated;
    return invalidated;
  };

  /**
   * Очистка устаревших записей
   */
  const cleanup = () => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of cache.value.entries()) {
      const age = now - value.timestamp;
      if (age > value.ttl) {
        cache.value.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  };

  /**
   * Получение статистики кеша
   */
  const getStats = () => {
    const total = cacheStats.value.hits + cacheStats.value.misses;
    const hitRate = total > 0 
      ? (cacheStats.value.hits / total * 100).toFixed(2) 
      : 0;
    
    return {
      ...cacheStats.value,
      size: cache.value.size,
      hitRate: `${hitRate}%`
    };
  };

  // Автоматическая очистка каждые 5 минут
  let cleanupInterval = null;
  const startAutoCleanup = (interval = 5 * 60 * 1000) => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
    
    cleanupInterval = setInterval(() => {
      cleanup();
    }, interval);
  };

  const stopAutoCleanup = () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  };

  // Запуск автоматической очистки
  startAutoCleanup();

  return {
    get,
    set,
    clear,
    invalidate,
    cleanup,
    getCacheKey,
    getStats,
    startAutoCleanup,
    stopAutoCleanup
  };
}
```

#### Интеграция кеша в API сервис

```javascript
// vue-app/src/services/webhook-logs-api.js
import { useCache } from '@/composables/useCache.js';

const { get, set, getCacheKey, invalidate } = useCache({
  ttl: 2 * 60 * 1000, // 2 минуты для логов
  maxSize: 50
});

export class WebhookLogsApiService {
  /**
   * Получение логов с кешированием
   * 
   * @param {Object} filters Фильтры
   * @param {Object} pagination Пагинация
   * @param {boolean} forceRefresh Принудительное обновление (игнорировать кеш)
   * @returns {Promise<Object>} Результат с логами и пагинацией
   */
  static async getLogs(filters = {}, pagination = { page: 1, limit: 50 }, forceRefresh = false) {
    const cacheKey = getCacheKey('/api/webhook-logs.php', { 
      filters, 
      page: pagination.page, 
      limit: pagination.limit 
    });
    
    // Проверка кеша (если не принудительное обновление)
    if (!forceRefresh) {
      const cached = get(cacheKey);
      if (cached) {
        console.log('[Cache] Hit:', cacheKey);
        return cached;
      }
    }
    
    console.log('[Cache] Miss:', cacheKey);
    
    // Запрос к API
    try {
      const params = new URLSearchParams({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });
      
      const response = await fetch(`/api/webhook-logs.php?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Сохранение в кеш
      set(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error('[API] Error fetching logs:', error);
      throw error;
    }
  }

  /**
   * Инвалидация кеша при изменении фильтров
   * 
   * @param {Object} oldFilters Старые фильтры
   * @param {Object} newFilters Новые фильтры
   */
  static invalidateCacheOnFilterChange(oldFilters, newFilters) {
    // Инвалидируем кеш, если изменились фильтры
    const filtersChanged = JSON.stringify(oldFilters) !== JSON.stringify(newFilters);
    if (filtersChanged) {
      invalidate('/api/webhook-logs.php');
      console.log('[Cache] Invalidated due to filter change');
    }
  }

  /**
   * Получение статистики кеша (для отладки)
   */
  static getCacheStats() {
    const { getStats } = useCache();
    return getStats();
  }
}
```

### 3. Оптимизация рендеринга JSON

#### Компонент для ленивого рендеринга больших JSON

```vue
<template>
  <div class="json-viewer">
    <div class="json-viewer-header">
      <span class="json-size-info">
        {{ totalFields }} полей
        <span v-if="collapsedFields > 0" class="collapsed-info">
          ({{ collapsedFields }} свернуто)
        </span>
      </span>
      <div class="json-viewer-controls">
        <button @click="expandAll" class="btn-control">Развернуть все</button>
        <button @click="collapseAll" class="btn-control">Свернуть все</button>
        <button @click="copyToClipboard" class="btn-control">📋 Копировать</button>
      </div>
    </div>
    
    <div class="json-content">
      <JsonField
        v-for="(field, index) in visibleFields"
        :key="field.key"
        :field-key="field.key"
        :field-value="field.value"
        :depth="0"
        :expanded="field.expanded"
        @toggle="handleToggle(field.key)"
      />
    </div>
    
    <div v-if="hasMore" class="load-more-container">
      <button @click="loadMore" class="btn-load-more">
        Показать ещё {{ Math.min(loadStep, remainingFields) }} полей
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import JsonField from './JsonField.vue';

export default {
  name: 'OptimizedJsonViewer',
  components: {
    JsonField
  },
  props: {
    json: {
      type: Object,
      required: true
    },
    initialLimit: {
      type: Number,
      default: 20
    },
    loadStep: {
      type: Number,
      default: 20
    },
    maxDepth: {
      type: Number,
      default: 5
    }
  },
  emits: ['copy'],
  setup(props, { emit }) {
    const visibleLimit = ref(props.initialLimit);
    const expandedKeys = ref(new Set());
    const collapsedKeys = ref(new Set());

    // Подсчёт общего количества полей
    const countFields = (obj, depth = 0) => {
      if (depth > props.maxDepth) return 0;
      if (typeof obj !== 'object' || obj === null) return 1;
      
      let count = 0;
      for (const key in obj) {
        count++;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          count += countFields(obj[key], depth + 1);
        }
      }
      return count;
    };

    const totalFields = computed(() => countFields(props.json));

    // Преобразование JSON в плоский список полей с информацией о вложенности
    const flattenJson = (obj, prefix = '', depth = 0) => {
      if (depth > props.maxDepth) {
        return [{
          key: prefix,
          value: '[Max depth reached]',
          type: 'truncated',
          depth
        }];
      }

      const fields = [];
      
      if (typeof obj !== 'object' || obj === null) {
        return [{
          key: prefix,
          value: obj,
          type: typeof obj,
          depth
        }];
      }

      if (Array.isArray(obj)) {
        if (obj.length > 100) {
          // Для больших массивов показываем только первые элементы
          return [
            {
              key: prefix,
              value: `[Array with ${obj.length} items]`,
              type: 'array-preview',
              depth,
              fullValue: obj
            }
          ];
        }
        
        obj.forEach((item, index) => {
          fields.push(...flattenJson(item, `${prefix}[${index}]`, depth + 1));
        });
      } else {
        for (const key in obj) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          const value = obj[key];
          
          if (typeof value === 'object' && value !== null) {
            const isExpanded = expandedKeys.value.has(fullKey);
            const isCollapsed = collapsedKeys.value.has(fullKey);
            
            fields.push({
              key: fullKey,
              value: isExpanded ? value : `{${Object.keys(value).length} properties}`,
              type: Array.isArray(value) ? 'array' : 'object',
              depth,
              isExpandable: true,
              expanded: isExpanded && !isCollapsed,
              childCount: typeof value === 'object' ? Object.keys(value).length : 0
            });
            
            if (isExpanded && !isCollapsed) {
              fields.push(...flattenJson(value, fullKey, depth + 1));
            }
          } else {
            fields.push({
              key: fullKey,
              value,
              type: typeof value,
              depth
            });
          }
        }
      }
      
      return fields;
    };

    const allFields = computed(() => flattenJson(props.json));
    
    const visibleFields = computed(() => {
      return allFields.value.slice(0, visibleLimit.value);
    });

    const remainingFields = computed(() => {
      return Math.max(0, allFields.value.length - visibleLimit.value);
    });

    const hasMore = computed(() => remainingFields.value > 0);

    const collapsedFields = computed(() => {
      return collapsedKeys.value.size;
    });

    const handleToggle = (key) => {
      if (expandedKeys.value.has(key)) {
        expandedKeys.value.delete(key);
        collapsedKeys.value.add(key);
      } else {
        expandedKeys.value.add(key);
        collapsedKeys.value.delete(key);
      }
    };

    const expandAll = () => {
      allFields.value.forEach(field => {
        if (field.isExpandable) {
          expandedKeys.value.add(field.key);
          collapsedKeys.value.delete(field.key);
        }
      });
    };

    const collapseAll = () => {
      allFields.value.forEach(field => {
        if (field.isExpandable) {
          expandedKeys.value.delete(field.key);
          collapsedKeys.value.add(field.key);
        }
      });
    };

    const loadMore = () => {
      visibleLimit.value += props.loadStep;
    };

    const copyToClipboard = async () => {
      try {
        const jsonString = JSON.stringify(props.json, null, 2);
        await navigator.clipboard.writeText(jsonString);
        emit('copy', 'JSON скопирован в буфер обмена');
      } catch (error) {
        console.error('Failed to copy:', error);
        emit('copy', 'Ошибка копирования');
      }
    };

    return {
      totalFields,
      visibleFields,
      remainingFields,
      hasMore,
      collapsedFields,
      loadStep: props.loadStep,
      handleToggle,
      expandAll,
      collapseAll,
      loadMore,
      copyToClipboard
    };
  }
};
</script>

<style scoped>
.json-viewer {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
}

.json-viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ddd;
}

.json-size-info {
  font-size: 14px;
  color: #666;
}

.collapsed-info {
  color: #999;
  font-size: 12px;
}

.json-viewer-controls {
  display: flex;
  gap: 8px;
}

.btn-control {
  padding: 6px 12px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-control:hover {
  background: #1976d2;
}

.json-content {
  max-height: 600px;
  overflow-y: auto;
}

.load-more-container {
  margin-top: 16px;
  text-align: center;
}

.btn-load-more {
  padding: 10px 20px;
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-load-more:hover {
  background: #e0e0e0;
}
</style>
```

#### Компонент JsonField для отображения отдельного поля

```vue
<template>
  <div 
    class="json-field" 
    :class="[`json-field-${type}`, `json-field-depth-${depth}`]"
    :style="{ paddingLeft: `${depth * 20}px` }"
  >
    <div class="json-field-header" @click="handleToggle">
      <span class="json-field-key">{{ fieldKey }}</span>
      <span class="json-field-type">{{ typeLabel }}</span>
      <span v-if="isExpandable" class="json-field-toggle">
        {{ expanded ? '▼' : '▶' }}
      </span>
    </div>
    <div v-if="!isExpandable || expanded" class="json-field-value">
      <pre v-if="type === 'object' || type === 'array'">{{ formattedValue }}</pre>
      <span v-else>{{ formattedValue }}</span>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'JsonField',
  props: {
    fieldKey: {
      type: String,
      required: true
    },
    fieldValue: {
      type: [String, Number, Boolean, Object, Array],
      required: true
    },
    depth: {
      type: Number,
      default: 0
    },
    expanded: {
      type: Boolean,
      default: false
    }
  },
  emits: ['toggle'],
  setup(props) {
    const type = computed(() => {
      if (Array.isArray(props.fieldValue)) return 'array';
      if (typeof props.fieldValue === 'object' && props.fieldValue !== null) return 'object';
      return typeof props.fieldValue;
    });

    const isExpandable = computed(() => {
      return type.value === 'object' || type.value === 'array';
    });

    const typeLabel = computed(() => {
      const labels = {
        string: 'string',
        number: 'number',
        boolean: 'boolean',
        object: 'object',
        array: 'array',
        null: 'null',
        undefined: 'undefined'
      };
      return labels[type.value] || 'unknown';
    });

    const formattedValue = computed(() => {
      if (typeof props.fieldValue === 'string') {
        return `"${props.fieldValue}"`;
      }
      if (typeof props.fieldValue === 'object' && props.fieldValue !== null) {
        return JSON.stringify(props.fieldValue, null, 2);
      }
      return String(props.fieldValue);
    });

    const handleToggle = () => {
      if (isExpandable.value) {
        emit('toggle');
      }
    };

    return {
      type,
      isExpandable,
      typeLabel,
      formattedValue,
      handleToggle
    };
  }
};
</script>

<style scoped>
.json-field {
  margin-bottom: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.json-field-header {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s;
}

.json-field-header:hover {
  background: #f0f0f0;
}

.json-field-key {
  font-weight: 600;
  color: #1976d2;
}

.json-field-type {
  font-size: 11px;
  color: #999;
  padding: 2px 6px;
  background: #f5f5f5;
  border-radius: 3px;
}

.json-field-toggle {
  color: #666;
  font-size: 10px;
}

.json-field-value {
  margin-top: 4px;
  padding: 8px;
  background: white;
  border-radius: 4px;
  border-left: 2px solid #2196F3;
}

.json-field-value pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
```

### 4. Ленивая загрузка компонентов

#### Настройка роутера для ленивой загрузки

```javascript
// vue-app/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  // ... другие маршруты ...
  {
    path: '/admin/webhook-logs',
    name: 'webhook-logs',
    // Ленивая загрузка страницы
    component: () => import('@/pages/WebhookLogsPage.vue'),
    meta: {
      title: 'Логи вебхуков',
      requiresAuth: true
    }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
```

#### Ленивая загрузка тяжёлых компонентов

```vue
<template>
  <div class="webhook-logs-page">
    <!-- ... основной контент ... -->
    
    <!-- Ленивая загрузка графиков -->
    <Suspense>
      <template #default>
        <WebhookLogsCharts :data="statsData" />
      </template>
      <template #fallback>
        <div class="loading-charts">
          <LoadingSkeleton width="100%" height="300px" />
        </div>
      </template>
    </Suspense>
    
    <!-- Ленивая загрузка детального просмотра -->
    <Suspense v-if="selectedLog">
      <template #default>
        <WebhookLogDetails :log="selectedLog" @close="handleClose" />
      </template>
      <template #fallback>
        <div class="loading-details">
          <LoadingSkeleton width="100%" height="400px" />
        </div>
      </template>
    </Suspense>
  </div>
</template>

<script>
import { defineAsyncComponent, Suspense } from 'vue';
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue';

// Ленивая загрузка тяжёлых компонентов
const WebhookLogsCharts = defineAsyncComponent({
  loader: () => import('@/components/webhooks/WebhookLogsCharts.vue'),
  loadingComponent: LoadingSkeleton,
  errorComponent: () => import('@/components/common/ErrorDisplay.vue'),
  delay: 200, // Задержка перед показом loading компонента
  timeout: 3000 // Таймаут для загрузки
});

const WebhookLogDetails = defineAsyncComponent({
  loader: () => import('@/components/webhooks/WebhookLogDetails.vue'),
  loadingComponent: LoadingSkeleton
});

export default {
  name: 'WebhookLogsPage',
  components: {
    WebhookLogsCharts,
    WebhookLogDetails,
    LoadingSkeleton,
    Suspense
  },
  // ... остальной код ...
};
</script>
```

#### Оптимизация импортов библиотек

```javascript
// ❌ Плохо: импорт всей библиотеки
import _ from 'lodash';
import * as Chart from 'chart.js';

// ✅ Хорошо: импорт только нужных функций
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';
import { Chart, registerables } from 'chart.js';

// Регистрация только нужных компонентов Chart.js
Chart.register(...registerables);
```

### 5. Debounce и Throttle

#### Утилиты для debounce и throttle

```javascript
// vue-app/src/utils/debounce.js

/**
 * Debounce функция
 * 
 * @param {Function} func Функция для debounce
 * @param {number} wait Время ожидания в мс
 * @param {boolean} immediate Выполнить сразу при первом вызове
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
 * Throttle функция
 * 
 * @param {Function} func Функция для throttle
 * @param {number} limit Лимит времени в мс
 * @returns {Function} Throttled функция
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
```

#### Composable для debounce

```javascript
// vue-app/src/composables/useDebounce.js
import { ref, watch } from 'vue';
import { debounce } from '@/utils/debounce.js';

/**
 * Composable для debounce значения
 * 
 * @param {any} initialValue Начальное значение
 * @param {number} delay Задержка в мс
 * @returns {Object} { value, debouncedValue }
 */
export function useDebounce(initialValue, delay = 300) {
  const value = ref(initialValue);
  const debouncedValue = ref(initialValue);
  
  const updateDebounced = debounce((newValue) => {
    debouncedValue.value = newValue;
  }, delay);
  
  watch(value, (newValue) => {
    updateDebounced(newValue);
  });
  
  return {
    value,
    debouncedValue
  };
}
```

#### Использование в компонентах

```vue
<template>
  <input 
    v-model="searchQuery"
    @input="handleSearch"
    placeholder="Поиск..."
  />
</template>

<script>
import { ref } from 'vue';
import { useDebounce } from '@/composables/useDebounce.js';

export default {
  setup() {
    const searchQuery = ref('');
    const { debouncedValue } = useDebounce(searchQuery, 500);
    
    // Поиск будет выполняться только после 500мс бездействия
    watch(debouncedValue, (value) => {
      if (value) {
        performSearch(value);
      }
    });
    
    return {
      searchQuery
    };
  }
};
</script>
```

#### Throttle для скролла

```vue
<template>
  <div class="scrollable-container" @scroll="handleScroll">
    <!-- контент -->
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { throttle } from '@/utils/throttle.js';

export default {
  setup() {
    const scrollTop = ref(0);
    
    const handleScroll = throttle((event) => {
      scrollTop.value = event.target.scrollTop;
      // Выполнение тяжёлых операций при скролле
      updateVisibleItems();
    }, 100); // Максимум раз в 100мс
    
    return {
      scrollTop,
      handleScroll
    };
  }
};
</script>
```

### 6. Оптимизация бандла

#### Анализ размера бандла

```javascript
// vue.config.js или vite.config.js
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    // ... другие плагины ...
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html'
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Разделение на чанки
          'vendor': ['vue', 'vue-router'],
          'charts': ['chart.js', 'vue-chartjs'],
          'utils': ['lodash', 'date-fns']
        }
      }
    }
  }
});
```

#### Tree-shaking оптимизация

```javascript
// package.json
{
  "sideEffects": false, // Включить tree-shaking для всех модулей
  "sideEffects": [
    "*.css", // Исключить CSS файлы
    "./src/polyfills.js"
  ]
}

// Использование именованных импортов для tree-shaking
// ❌ Плохо
import _ from 'lodash';
const result = _.debounce(func, 300);

// ✅ Хорошо
import { debounce } from 'lodash-es';
const result = debounce(func, 300);
```

#### Оптимизация изображений и ассетов

```javascript
// Использование динамических импортов для изображений
const loadImage = async (path) => {
  const module = await import(`@/assets/images/${path}`);
  return module.default;
};

// Использование WebP формата с fallback
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Fallback">
</picture>
```

---

## 🔧 Troubleshooting

### Проблема 1: Виртуализация не работает корректно

**Симптомы:** Элементы пропускаются или дублируются при скролле.

**Решение:**
- Убедитесь, что `key-field` уникален для каждого элемента
- Проверьте, что `item-size` соответствует реальной высоте элементов
- Увеличьте `buffer` для более плавного скролла

**Код:**
```vue
<RecycleScroller
  :items="logs"
  :item-size="80"
  :buffer="200"
  key-field="id"
  v-slot="{ item }"
>
  <LogItem :log="item" />
</RecycleScroller>
```

---

### Проблема 2: Кеш не инвалидируется при изменении фильтров

**Симптомы:** Старые данные показываются после изменения фильтров.

**Решение:**
- Убедитесь, что вызывается `invalidateCacheOnFilterChange` при изменении фильтров
- Проверьте, что ключи кеша генерируются правильно
- Используйте `forceRefresh` для принудительного обновления

**Код:**
```javascript
watch(() => filters.value, (newFilters, oldFilters) => {
  WebhookLogsApiService.invalidateCacheOnFilterChange(oldFilters, newFilters);
  loadLogs(true); // forceRefresh = true
});
```

---

### Проблема 3: Большие JSON тормозят интерфейс

**Симптомы:** Интерфейс лагает при открытии детального просмотра с большим JSON.

**Решение:**
- Используйте ленивый рендеринг с ограничением видимых полей
- Реализуйте виртуализацию для больших массивов
- Добавьте сворачивание/разворачивание для вложенных объектов

**Код:**
```vue
<OptimizedJsonViewer 
  :json="log.payload" 
  :initial-limit="20"
  :load-step="20"
  :max-depth="5"
/>
```

---

### Проблема 4: Компоненты загружаются медленно

**Симптомы:** Долгая загрузка страницы из-за больших компонентов.

**Решение:**
- Используйте `defineAsyncComponent` для тяжёлых компонентов
- Разделите бандл на чанки
- Используйте `Suspense` для показа состояния загрузки

**Код:**
```vue
<Suspense>
  <template #default>
    <HeavyComponent />
  </template>
  <template #fallback>
    <LoadingSkeleton />
  </template>
</Suspense>
```

---

### Проблема 5: Поиск выполняется слишком часто

**Симптомы:** Поиск выполняется при каждом вводе символа, что тормозит интерфейс.

**Решение:**
- Используйте `debounce` для поиска (300-500мс)
- Проверьте, что debounce правильно применяется

**Код:**
```javascript
const { debouncedValue } = useDebounce(searchQuery, 500);
watch(debouncedValue, (value) => {
  performSearch(value);
});
```

---

### Проблема 6: Бандл слишком большой

**Симптомы:** Долгая загрузка приложения, большой размер файлов.

**Решение:**
- Используйте bundle analyzer для анализа
- Разделите бандл на чанки (vendor, charts, utils)
- Удалите неиспользуемые зависимости
- Используйте tree-shaking для библиотек

**Код:**
```javascript
// vue.config.js
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor': ['vue', 'vue-router'],
        'charts': ['chart.js']
      }
    }
  }
}
```

---

## ✅ Критерии приёмки

### Функциональные требования

- [ ] Виртуализация списка работает для больших объёмов данных (1000+ записей)
- [ ] Кеширование запросов работает корректно с TTL
- [ ] Кеш инвалидируется при изменении фильтров
- [ ] LRU eviction работает при превышении maxSize
- [ ] Большие JSON рендерятся быстро с ленивой загрузкой
- [ ] Компоненты загружаются лениво (async components)
- [ ] Debounce работает для поиска (300-500мс)
- [ ] Throttle работает для скролла (100мс)
- [ ] Размер бандла оптимизирован (разделение на чанки)
- [ ] Tree-shaking работает для библиотек

### Производительность

- [ ] Время загрузки страницы < 2 секунд
- [ ] Время первого рендера < 1 секунды
- [ ] FPS при скролле > 55
- [ ] Использование памяти стабильно при больших данных
- [ ] Интерфейс остаётся отзывчивым при 10,000+ записей
- [ ] Время отклика на действия пользователя < 100мс

### Технические требования

- [ ] Код соответствует стандартам проекта
- [ ] Нет утечек памяти
- [ ] Все оптимизации задокументированы
- [ ] Метрики производительности измерены и задокументированы

---

## 📋 Чек-лист выполнения

### Этап 1: Виртуализация списка

- [ ] Установить vue-virtual-scroller или реализовать собственную виртуализацию
- [ ] Интегрировать виртуализацию в WebhookLogList
- [ ] Настроить размер элементов (item-size)
- [ ] Настроить buffer для плавного скролла
- [ ] Протестировать с большим объёмом данных (1000+ записей)
- [ ] Измерить производительность (FPS, память)

### Этап 2: Кеширование запросов

- [ ] Создать файл `vue-app/src/composables/useCache.js`
- [ ] Реализовать функции get, set, clear, invalidate
- [ ] Добавить поддержку TTL
- [ ] Реализовать LRU eviction
- [ ] Добавить статистику кеша
- [ ] Интегрировать кеш в WebhookLogsApiService
- [ ] Добавить инвалидацию при изменении фильтров
- [ ] Протестировать кеширование

### Этап 3: Оптимизация рендеринга JSON

- [ ] Создать компонент OptimizedJsonViewer
- [ ] Реализовать ленивый рендеринг с ограничением полей
- [ ] Добавить сворачивание/разворачивание для объектов
- [ ] Реализовать виртуализацию для больших массивов
- [ ] Добавить ограничение глубины вложенности
- [ ] Интегрировать в WebhookLogDetails
- [ ] Протестировать с большими JSON

### Этап 4: Ленивая загрузка компонентов

- [ ] Настроить ленивую загрузку в роутере
- [ ] Использовать defineAsyncComponent для тяжёлых компонентов
- [ ] Добавить Suspense для состояния загрузки
- [ ] Оптимизировать импорты библиотек (tree-shaking)
- [ ] Протестировать загрузку компонентов

### Этап 5: Debounce и Throttle

- [ ] Создать утилиты debounce и throttle
- [ ] Создать composable useDebounce
- [ ] Применить debounce к поиску
- [ ] Применить throttle к скроллу
- [ ] Протестировать оптимизацию событий

### Этап 6: Оптимизация бандла

- [ ] Установить bundle analyzer
- [ ] Проанализировать размер бандла
- [ ] Разделить бандл на чанки (vendor, charts, utils)
- [ ] Удалить неиспользуемые зависимости
- [ ] Оптимизировать импорты (tree-shaking)
- [ ] Измерить размер бандла до и после оптимизации

### Этап 7: Тестирование и измерение

- [ ] Измерить время загрузки страницы
- [ ] Измерить время первого рендера
- [ ] Измерить FPS при скролле
- [ ] Измерить использование памяти
- [ ] Протестировать с различными объёмами данных
- [ ] Проверить отсутствие утечек памяти
- [ ] Задокументировать метрики производительности

---

## 🧪 Тестирование

### Тестирование виртуализации:
1. Загрузить страницу с большим количеством логов (1000+)
2. Проверить плавность скролла
3. Проверить использование памяти

### Тестирование кеширования:
1. Применить фильтры
2. Перезагрузить страницу
3. Проверить, что данные берутся из кеша
4. Изменить фильтры
5. Проверить, что кеш инвалидируется

### Тестирование производительности:
1. Использовать Chrome DevTools Performance
2. Измерить время загрузки
3. Измерить время рендеринга
4. Проверить использование памяти

---

## 📚 Дополнительные ресурсы

- [vue-virtual-scroller](https://github.com/Akryum/vue-virtual-scroller)
- [Vue Performance Optimization](https://vuejs.org/guide/best-practices/performance.html)
- [Webpack Bundle Analyzer](https://www.npmjs.com/package/webpack-bundle-analyzer)

---

## 📝 История правок

- **2025-12-07 05:25 (UTC+3, Брест):** Создана задача TASK-017-07
- **2025-12-07 07:00 (UTC+3, Брест):** Добавлена детальная реализация виртуализации списка (собственная и vue-virtual-scroller)
- **2025-12-07 07:00 (UTC+3, Брест):** Добавлен полный composable useCache с TTL, LRU eviction, статистикой и автоматической очисткой
- **2025-12-07 07:00 (UTC+3, Брест):** Добавлена интеграция кеша в WebhookLogsApiService с инвалидацией при изменении фильтров
- **2025-12-07 06:32 (UTC+3, Брест):** Задача завершена. Реализованы:
  - Composable useCache.js для кеширования запросов с TTL, LRU eviction, статистикой
  - Интеграция кеширования в WebhookLogsApiService с автоматической инвалидацией при изменении фильтров
  - Оптимизация рендеринга JSON в WebhookLogDetails: мемоизация, ограничение размера, ленивая загрузка больших JSON
  - Ленивая загрузка тяжёлых компонентов (WebhookLogsDashboard, WebhookLogDetails) через defineAsyncComponent
  - Debounce для поиска уже был реализован ранее
  - Инвалидация кеша при изменении фильтров в handleFiltersUpdate
  - Все оптимизации протестированы, ошибок линтера нет
- **2025-12-07 07:00 (UTC+3, Брест):** Добавлены компоненты OptimizedJsonViewer и JsonField для ленивого рендеринга больших JSON
- **2025-12-07 07:00 (UTC+3, Брест):** Добавлена ленивая загрузка компонентов с defineAsyncComponent и Suspense
- **2025-12-07 07:00 (UTC+3, Брест):** Добавлены утилиты debounce/throttle и composable useDebounce
- **2025-12-07 07:00 (UTC+3, Брест):** Добавлена оптимизация бандла с разделением на чанки и tree-shaking
- **2025-12-07 07:00 (UTC+3, Брест):** Добавлен раздел Troubleshooting с 6 типичными проблемами и решениями
- **2025-12-07 07:00 (UTC+3, Брест):** Расширены критерии приёмки и добавлен детальный чек-лист выполнения (7 этапов)

---

## 🔗 Связанные задачи

- **Родительская:** [TASK-017: Глобальный план](./TASK-017-webhook-logs-ui-implementation-plan.md)
- **Предыдущая:** [TASK-017-06: Улучшение UX](./TASK-017-06-improve-ux.md)
- **Следующая:** [TASK-017-08: Реальное время](./TASK-017-08-realtime-updates.md)

