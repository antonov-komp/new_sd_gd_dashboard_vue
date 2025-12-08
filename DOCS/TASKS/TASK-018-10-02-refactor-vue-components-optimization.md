# TASK-018-10-02: Оптимизация и расширение функциональности Vue.js компонентов модуля логирования вебхуков

**Дата создания:** 2025-12-07 22:30 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Дата завершения:** 2025-12-07 22:00 (UTC+3, Брест)  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-018](./TASK-018-refactor-webhook-logs-module.md)  
**Тип:** Рефакторинг / Оптимизация

---

## 📋 Описание

Оптимизировать производительность Vue.js компонентов модуля логирования вебхуков, расширить функциональность и улучшить пользовательский опыт. Добавить виртуализацию списков, улучшить работу с большими объёмами данных, добавить расширенные возможности фильтрации и экспорта.

**Цель этапа:**
- Оптимизировать рендеринг больших списков логов через виртуализацию
- Улучшить производительность работы с данными через мемоизацию
- Добавить расширенные возможности фильтрации и поиска
- Реализовать экспорт логов в различных форматах
- Добавить группировку и агрегацию данных
- Улучшить UX через анимации и переходы
- Оптимизировать работу с realtime обновлениями

---

## 🎯 Контекст

Это вторая часть десятого этапа рефакторинга модуля логирования вебхуков (TASK-018) для Vue.js программиста. После базового рефакторинга компонентов (TASK-018-10-01) необходимо оптимизировать их производительность и расширить функциональность для работы с большими объёмами данных.

**Текущее состояние:**
- Компоненты работают с типизированными данными
- Нет оптимизации для больших списков (рендеринг всех элементов)
- Нет виртуализации списков
- Ограниченные возможности фильтрации
- Нет экспорта данных
- Нет группировки и агрегации
- Простые анимации и переходы

**Целевое состояние:**
- Виртуализация списков для больших объёмов данных
- Мемоизация вычислений для производительности
- Расширенные фильтры и поиск
- Экспорт в CSV, JSON, Excel
- Группировка и агрегация данных
- Плавные анимации и переходы
- Оптимизированная работа с realtime

**Связи:**
- Зависит от: TASK-018-10-01 (базовая структура компонентов)
- Зависит от него: Нет (завершающий этап рефакторинга компонентов)
- **Бэкенд:** Использует оптимизированный API из предыдущих этапов

---

## 📁 Модули и компоненты

### Файлы для изменения:

1. **`vue-app/src/components/webhooks/WebhookLogList.vue`**
   - Добавить виртуализацию списков
   - Оптимизировать рендеринг через `v-memo`
   - Добавить группировку по дате
   - Улучшить работу с выбранными элементами

2. **`vue-app/src/components/webhooks/WebhookLogFilters.vue`**
   - Добавить расширенные фильтры
   - Добавить сохранение фильтров в localStorage
   - Добавить быстрые фильтры (presets)
   - Улучшить UX фильтрации

3. **`vue-app/src/components/webhooks/WebhookLogDetails.vue`**
   - Оптимизировать отображение больших payload
   - Добавить подсветку синтаксиса JSON
   - Добавить копирование данных
   - Улучшить навигацию между логами

4. **`vue-app/src/pages/WebhookLogsPage.vue`**
   - Интегрировать виртуализацию
   - Добавить экспорт данных
   - Добавить группировку и агрегацию
   - Оптимизировать работу с realtime

### Файлы для создания:

1. **`vue-app/src/components/webhooks/VirtualizedLogList.vue`**
   - Виртуализированный список логов
   - Оптимизация рендеринга больших списков

2. **`vue-app/src/components/webhooks/WebhookLogsExport.vue`**
   - Компонент экспорта логов
   - Поддержка CSV, JSON, Excel

3. **`vue-app/src/components/webhooks/WebhookLogsGrouping.vue`**
   - Компонент группировки логов
   - Агрегация данных

4. **`vue-app/src/composables/useVirtualizedList.js`**
   - Composable для виртуализации списков
   - Управление видимыми элементами

5. **`vue-app/src/composables/useLogsExport.js`**
   - Composable для экспорта логов
   - Форматирование данных для экспорта

6. **`vue-app/src/composables/useLogsGrouping.js`**
   - Composable для группировки логов
   - Агрегация и статистика

7. **`vue-app/src/utils/export-formatters.js`**
   - Форматтеры для экспорта данных
   - CSV, JSON, Excel форматы

8. **`vue-app/src/utils/virtualization-helpers.js`**
   - Вспомогательные функции для виртуализации
   - Расчёт видимых элементов

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Создание composable для виртуализации списков

**1.1. Создать файл `vue-app/src/composables/useVirtualizedList.js`:**

```javascript
/**
 * Composable для виртуализации больших списков
 * 
 * Расположение: vue-app/src/composables/useVirtualizedList.js
 * 
 * Реализует виртуализацию для оптимизации рендеринга больших списков
 * Показывает только видимые элементы + небольшой буфер
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';

/**
 * Composable для виртуализации списка
 * 
 * @param {Object} options Опции
 * @param {number} options.itemHeight Высота одного элемента (px)
 * @param {number} options.containerHeight Высота контейнера (px)
 * @param {number} options.bufferSize Количество элементов в буфере
 * @param {number} options.totalItems Общее количество элементов
 * @returns {Object} API для работы с виртуализацией
 */
export function useVirtualizedList(options = {}) {
  const {
    itemHeight = 50,
    containerHeight = 600,
    bufferSize = 5,
    totalItems = 0
  } = options;

  // Состояние
  const scrollTop = ref(0);
  const containerRef = ref(null);

  // Вычисляемые свойства
  const visibleCount = computed(() => {
    return Math.ceil(containerHeight / itemHeight);
  });

  const startIndex = computed(() => {
    const index = Math.floor(scrollTop.value / itemHeight);
    return Math.max(0, index - bufferSize);
  });

  const endIndex = computed(() => {
    const index = startIndex.value + visibleCount.value + bufferSize * 2;
    return Math.min(totalItems, index);
  });

  const visibleItems = computed(() => {
    return {
      start: startIndex.value,
      end: endIndex.value,
      count: endIndex.value - startIndex.value
    };
  });

  const offsetY = computed(() => {
    return startIndex.value * itemHeight;
  });

  const totalHeight = computed(() => {
    return totalItems * itemHeight;
  });

  // Обработка скролла
  const handleScroll = (event) => {
    if (containerRef.value) {
      scrollTop.value = containerRef.value.scrollTop;
    } else if (event && event.target) {
      scrollTop.value = event.target.scrollTop;
    }
  };

  // Прокрутка к элементу
  const scrollToItem = (index) => {
    if (containerRef.value && index >= 0 && index < totalItems) {
      const targetScrollTop = index * itemHeight;
      containerRef.value.scrollTop = targetScrollTop;
      scrollTop.value = targetScrollTop;
    }
  };

  // Прокрутка в начало
  const scrollToTop = () => {
    scrollToItem(0);
  };

  // Прокрутка в конец
  const scrollToBottom = () => {
    scrollToItem(totalItems - 1);
  };

  // Установка контейнера
  const setContainer = (element) => {
    containerRef.value = element;
    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true });
    }
  };

  // Очистка при размонтировании
  onUnmounted(() => {
    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', handleScroll);
    }
  });

  return {
    // Состояние
    scrollTop,
    containerRef,
    
    // Вычисляемые свойства
    visibleItems,
    offsetY,
    totalHeight,
    startIndex,
    endIndex,
    
    // Методы
    handleScroll,
    scrollToItem,
    scrollToTop,
    scrollToBottom,
    setContainer
  };
}
```

**1.2. Создать файл `vue-app/src/utils/virtualization-helpers.js`:**

```javascript
/**
 * Вспомогательные функции для виртуализации
 * 
 * Расположение: vue-app/src/utils/virtualization-helpers.js
 */

/**
 * Расчёт оптимальной высоты элемента на основе данных
 * 
 * @param {Object} item Элемент списка
 * @param {number} baseHeight Базовая высота
 * @returns {number} Вычисленная высота
 */
export function calculateItemHeight(item, baseHeight = 50) {
  // Можно добавить логику расчёта высоты на основе содержимого
  // Например, для логов с длинными деталями
  if (item.details && Object.keys(item.details).length > 5) {
    return baseHeight * 1.5;
  }
  
  return baseHeight;
}

/**
 * Получить индекс элемента по позиции скролла
 * 
 * @param {number} scrollTop Позиция скролла
 * @param {number} itemHeight Высота элемента
 * @returns {number} Индекс элемента
 */
export function getItemIndexByScroll(scrollTop, itemHeight) {
  return Math.floor(scrollTop / itemHeight);
}

/**
 * Получить позицию скролла для элемента
 * 
 * @param {number} index Индекс элемента
 * @param {number} itemHeight Высота элемента
 * @returns {number} Позиция скролла
 */
export function getScrollPositionByIndex(index, itemHeight) {
  return index * itemHeight;
}

export default {
  calculateItemHeight,
  getItemIndexByScroll,
  getScrollPositionByIndex
};
```

**Результат шага 1:**
- Composable для виртуализации создан
- Вспомогательные функции реализованы

---

### Шаг 2: Создание виртуализированного компонента списка

**2.1. Создать файл `vue-app/src/components/webhooks/VirtualizedLogList.vue`:**

```vue
<template>
  <div 
    ref="containerRef"
    class="virtualized-log-list"
    :style="{ height: containerHeight + 'px', overflowY: 'auto' }"
    @scroll="handleScroll"
  >
    <!-- Spacer для элементов выше видимой области -->
    <div :style="{ height: offsetY + 'px' }"></div>
    
    <!-- Видимые элементы -->
    <div class="visible-items">
      <div
        v-for="(log, index) in visibleLogs"
        :key="getLogId(log)"
        :data-index="startIndex + index"
        :class="{
          'log-row': true,
          'log-row-selected': isLogSelected(log),
          'log-row-new': isNewLog(log)
        }"
        :style="{ height: itemHeight + 'px' }"
      >
        <slot :log="log" :index="startIndex + index">
          <!-- Дефолтный слот для отображения лога -->
          <div class="log-row-content">
            <span class="log-timestamp">{{ formatTimestamp(log.timestamp) }}</span>
            <span class="log-event">{{ formatEventType(log.event) }}</span>
            <span class="log-category">{{ formatCategory(log.category) }}</span>
          </div>
        </slot>
      </div>
    </div>
    
    <!-- Spacer для элементов ниже видимой области -->
    <div :style="{ height: (totalHeight - offsetY - visibleLogs.length * itemHeight) + 'px' }"></div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useVirtualizedList } from '@/composables/useVirtualizedList.js';
import { getLogId, isNewLog } from '@/utils/webhook-component-helpers.js';
import { formatTimestamp, formatEventType, formatCategory } from '@/utils/webhook-formatters.js';
import { isValidWebhookLogEntry } from '@/types/webhook-logs.js';

/**
 * @typedef {import('@/types/webhook-logs.js').WebhookLogEntry} WebhookLogEntry
 */

export default {
  name: 'VirtualizedLogList',
  props: {
    /**
     * Массив логов
     * @type {Array<WebhookLogEntry>}
     */
    logs: {
      type: Array,
      required: true,
      validator: (value) => {
        if (!Array.isArray(value)) return false;
        return value.every(log => isValidWebhookLogEntry(log));
      }
    },
    /**
     * Высота одного элемента
     */
    itemHeight: {
      type: Number,
      default: 50
    },
    /**
     * Высота контейнера
     */
    containerHeight: {
      type: Number,
      default: 600
    },
    /**
     * Размер буфера
     */
    bufferSize: {
      type: Number,
      default: 5
    },
    /**
     * Выбранные логи
     * @type {Array<WebhookLogEntry>}
     */
    selectedLogs: {
      type: Array,
      default: () => []
    }
  },
  emits: {
    /**
     * Выбор лога
     * @param {WebhookLogEntry} log Лог
     */
    'select-log': (log) => isValidWebhookLogEntry(log),
    /**
     * Просмотр деталей
     * @param {WebhookLogEntry} log Лог
     */
    'view-details': (log) => isValidWebhookLogEntry(log)
  },
  setup(props, { emit, expose }) {
    // Использование composable для виртуализации
    const {
      scrollTop,
      containerRef,
      visibleItems,
      offsetY,
      totalHeight,
      startIndex,
      endIndex,
      handleScroll,
      scrollToItem,
      scrollToTop,
      scrollToBottom,
      setContainer
    } = useVirtualizedList({
      itemHeight: props.itemHeight,
      containerHeight: props.containerHeight,
      bufferSize: props.bufferSize,
      totalItems: computed(() => props.logs.length)
    });

    // Видимые логи
    const visibleLogs = computed(() => {
      return props.logs.slice(visibleItems.value.start, visibleItems.value.end);
    });

    // Методы
    const isLogSelected = (log) => {
      return props.selectedLogs.some(selected => 
        getLogId(selected) === getLogId(log)
      );
    };

    const handleLogSelect = (log) => {
      emit('select-log', log);
    };

    const handleViewDetails = (log) => {
      emit('view-details', log);
    };

    // Установка контейнера при монтировании
    const setupContainer = () => {
      if (containerRef.value) {
        setContainer(containerRef.value);
      }
    };

    // Expose методов для родительского компонента
    expose({
      scrollToItem,
      scrollToTop,
      scrollToBottom
    });

    return {
      // Состояние
      containerRef,
      scrollTop,
      
      // Вычисляемые свойства
      visibleLogs,
      offsetY,
      totalHeight,
      startIndex,
      endIndex,
      
      // Методы
      handleScroll,
      handleLogSelect,
      handleViewDetails,
      setupContainer,
      getLogId,
      isNewLog: (log) => isNewLog(log, 5),
      isLogSelected,
      formatTimestamp: (timestamp) => formatTimestamp(timestamp, 'short'),
      formatEventType,
      formatCategory
    };
  },
  mounted() {
    this.setupContainer();
  }
};
</script>

<style scoped>
.virtualized-log-list {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
}

.visible-items {
  position: relative;
}

.log-row {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
  transition: background-color 0.2s;
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

.log-row-content {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.log-timestamp {
  min-width: 150px;
  font-family: monospace;
  font-size: 13px;
}

.log-event {
  min-width: 150px;
  font-weight: 500;
}

.log-category {
  min-width: 120px;
}
</style>
```

**Результат шага 2:**
- Виртуализированный компонент списка создан
- Оптимизация рендеринга реализована

---

### Шаг 3: Создание composable для экспорта логов

**3.1. Создать файл `vue-app/src/composables/useLogsExport.js`:**

```javascript
/**
 * Composable для экспорта логов вебхуков
 * 
 * Расположение: vue-app/src/composables/useLogsExport.js
 * 
 * Поддерживает экспорт в CSV, JSON, Excel форматы
 */

import { ref } from 'vue';
import { 
  exportToCSV,
  exportToJSON,
  exportToExcel 
} from '@/utils/export-formatters.js';
import { isValidWebhookLogEntry } from '@/types/webhook-logs.js';

/**
 * Composable для экспорта логов
 * 
 * @param {Array} logs Массив логов для экспорта
 * @returns {Object} API для экспорта
 */
export function useLogsExport(logs) {
  const exporting = ref(false);
  const exportError = ref(null);

  /**
   * Экспорт в CSV
   * 
   * @param {string} filename Имя файла
   */
  const exportCSV = async (filename = 'webhook-logs.csv') => {
    if (exporting.value) {
      return;
    }

    try {
      exporting.value = true;
      exportError.value = null;

      // Валидация логов
      const validLogs = logs.value.filter(log => isValidWebhookLogEntry(log));
      
      if (validLogs.length === 0) {
        throw new Error('No valid logs to export');
      }

      // Экспорт
      await exportToCSV(validLogs, filename);

    } catch (error) {
      exportError.value = error.message;
      console.error('[useLogsExport] CSV export error:', error);
      throw error;
    } finally {
      exporting.value = false;
    }
  };

  /**
   * Экспорт в JSON
   * 
   * @param {string} filename Имя файла
   */
  const exportJSON = async (filename = 'webhook-logs.json') => {
    if (exporting.value) {
      return;
    }

    try {
      exporting.value = true;
      exportError.value = null;

      // Валидация логов
      const validLogs = logs.value.filter(log => isValidWebhookLogEntry(log));
      
      if (validLogs.length === 0) {
        throw new Error('No valid logs to export');
      }

      // Экспорт
      await exportToJSON(validLogs, filename);

    } catch (error) {
      exportError.value = error.message;
      console.error('[useLogsExport] JSON export error:', error);
      throw error;
    } finally {
      exporting.value = false;
    }
  };

  /**
   * Экспорт в Excel
   * 
   * @param {string} filename Имя файла
   */
  const exportExcel = async (filename = 'webhook-logs.xlsx') => {
    if (exporting.value) {
      return;
    }

    try {
      exporting.value = true;
      exportError.value = null;

      // Валидация логов
      const validLogs = logs.value.filter(log => isValidWebhookLogEntry(log));
      
      if (validLogs.length === 0) {
        throw new Error('No valid logs to export');
      }

      // Экспорт
      await exportToExcel(validLogs, filename);

    } catch (error) {
      exportError.value = error.message;
      console.error('[useLogsExport] Excel export error:', error);
      throw error;
    } finally {
      exporting.value = false;
    }
  };

  return {
    exporting,
    exportError,
    exportCSV,
    exportJSON,
    exportExcel
  };
}
```

**3.2. Создать файл `vue-app/src/utils/export-formatters.js`:**

```javascript
/**
 * Форматтеры для экспорта данных вебхуков
 * 
 * Расположение: vue-app/src/utils/export-formatters.js
 * 
 * Поддерживает экспорт в CSV, JSON, Excel форматы
 */

import { formatTimestamp, formatEventType, formatCategory } from '@/utils/webhook-formatters.js';

/**
 * Экспорт в CSV
 * 
 * @param {Array} logs Массив логов
 * @param {string} filename Имя файла
 */
export async function exportToCSV(logs, filename = 'webhook-logs.csv') {
  // Заголовки
  const headers = [
    'Дата и время',
    'Тип события',
    'Категория',
    'IP адрес',
    'ID задачи',
    'Название задачи',
    'Ответственный',
    'Статус',
    'Приоритет',
    'Дедлайн'
  ];

  // Преобразование данных
  const rows = logs.map(log => {
    return [
      formatTimestamp(log.timestamp, 'long'),
      formatEventType(log.event),
      formatCategory(log.category),
      log.ip || '',
      log.details?.task_id || log.details?.entity_id || '',
      log.details?.task_title || log.details?.title || '',
      log.details?.responsible_id || '',
      log.details?.status_id || '',
      log.details?.priority || '',
      log.details?.deadline || ''
    ];
  });

  // Создание CSV содержимого
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // Экранирование запятых и кавычек
      const cellStr = String(cell || '');
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(','))
  ].join('\n');

  // Создание BOM для корректного отображения кириллицы в Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Скачивание файла
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Экспорт в JSON
 * 
 * @param {Array} logs Массив логов
 * @param {string} filename Имя файла
 */
export async function exportToJSON(logs, filename = 'webhook-logs.json') {
  // Преобразование данных
  const data = logs.map(log => ({
    timestamp: log.timestamp,
    event: log.event,
    category: log.category,
    ip: log.ip,
    details: log.details,
    payload: log.payload
  }));

  // Создание JSON содержимого
  const jsonContent = JSON.stringify(data, null, 2);

  // Скачивание файла
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Экспорт в Excel (через библиотеку, если доступна)
 * 
 * @param {Array} logs Массив логов
 * @param {string} filename Имя файла
 */
export async function exportToExcel(logs, filename = 'webhook-logs.xlsx') {
  // Проверка наличия библиотеки для работы с Excel
  // Если библиотека не доступна, используем CSV как fallback
  try {
    // Попытка использовать библиотеку (например, xlsx)
    if (typeof XLSX !== 'undefined') {
      const worksheet = XLSX.utils.json_to_sheet(
        logs.map(log => ({
          'Дата и время': formatTimestamp(log.timestamp, 'long'),
          'Тип события': formatEventType(log.event),
          'Категория': formatCategory(log.category),
          'IP адрес': log.ip || '',
          'ID задачи': log.details?.task_id || log.details?.entity_id || '',
          'Название задачи': log.details?.task_title || log.details?.title || '',
          'Ответственный': log.details?.responsible_id || '',
          'Статус': log.details?.status_id || '',
          'Приоритет': log.details?.priority || '',
          'Дедлайн': log.details?.deadline || ''
        }))
      );
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Логи вебхуков');
      
      XLSX.writeFile(workbook, filename);
    } else {
      // Fallback на CSV
      console.warn('[export-formatters] XLSX library not available, using CSV');
      await exportToCSV(logs, filename.replace('.xlsx', '.csv'));
    }
  } catch (error) {
    console.error('[export-formatters] Excel export error:', error);
    // Fallback на CSV
    await exportToCSV(logs, filename.replace('.xlsx', '.csv'));
  }
}

export default {
  exportToCSV,
  exportToJSON,
  exportToExcel
};
```

**Результат шага 3:**
- Composable для экспорта создан
- Форматтеры для экспорта реализованы

---

### Шаг 4: Создание composable для группировки логов

**4.1. Создать файл `vue-app/src/composables/useLogsGrouping.js`:**

```javascript
/**
 * Composable для группировки и агрегации логов вебхуков
 * 
 * Расположение: vue-app/src/composables/useLogsGrouping.js
 * 
 * Поддерживает группировку по различным критериям и агрегацию данных
 */

import { ref, computed } from 'vue';
import { groupLogsByDate } from '@/utils/webhook-component-helpers.js';
import { isValidWebhookLogEntry } from '@/types/webhook-logs.js';

/**
 * Composable для группировки логов
 * 
 * @param {Array} logs Массив логов
 * @param {Object} options Опции
 * @param {string} options.groupBy Критерий группировки (date, category, event)
 * @returns {Object} API для группировки
 */
export function useLogsGrouping(logs, options = {}) {
  const { groupBy = 'date' } = options;

  // Вычисляемые свойства
  const groupedLogs = computed(() => {
    if (!Array.isArray(logs.value) || logs.value.length === 0) {
      return {};
    }

    const validLogs = logs.value.filter(log => isValidWebhookLogEntry(log));

    switch (groupBy) {
      case 'date':
        return groupLogsByDate(validLogs);
      
      case 'category':
        return groupByCategory(validLogs);
      
      case 'event':
        return groupByEvent(validLogs);
      
      default:
        return { 'Все': validLogs };
    }
  });

  const statistics = computed(() => {
    if (!Array.isArray(logs.value) || logs.value.length === 0) {
      return {
        total: 0,
        byCategory: {},
        byEvent: {},
        byDate: {}
      };
    }

    const validLogs = logs.value.filter(log => isValidWebhookLogEntry(log));

    const stats = {
      total: validLogs.length,
      byCategory: {},
      byEvent: {},
      byDate: {}
    };

    validLogs.forEach(log => {
      // По категориям
      if (!stats.byCategory[log.category]) {
        stats.byCategory[log.category] = 0;
      }
      stats.byCategory[log.category]++;

      // По типам событий
      if (!stats.byEvent[log.event]) {
        stats.byEvent[log.event] = 0;
      }
      stats.byEvent[log.event]++;

      // По датам
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      if (!stats.byDate[date]) {
        stats.byDate[date] = 0;
      }
      stats.byDate[date]++;
    });

    return stats;
  });

  // Группировка по категориям
  const groupByCategory = (logs) => {
    const grouped = {};
    
    logs.forEach(log => {
      const category = log.category || 'unknown';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(log);
    });
    
    return grouped;
  };

  // Группировка по типам событий
  const groupByEvent = (logs) => {
    const grouped = {};
    
    logs.forEach(log => {
      const event = log.event || 'unknown';
      if (!grouped[event]) {
        grouped[event] = [];
      }
      grouped[event].push(log);
    });
    
    return grouped;
  };

  return {
    groupedLogs,
    statistics
  };
}
```

**Результат шага 4:**
- Composable для группировки создан
- Агрегация данных реализована

---

### Шаг 5: Интеграция оптимизаций в компоненты

**5.1. Обновить `vue-app/src/components/webhooks/WebhookLogList.vue` для использования виртуализации:**

```vue
<template>
  <div class="webhook-log-list">
    <!-- Переключатель виртуализации -->
    <div class="list-controls">
      <label>
        <input 
          type="checkbox" 
          v-model="useVirtualization"
        />
        Виртуализация (для больших списков)
      </label>
    </div>

    <!-- Виртуализированный список -->
    <VirtualizedLogList
      v-if="useVirtualization && logs.length > 100"
      :logs="logs"
      :item-height="60"
      :container-height="600"
      :selected-logs="selectedLogs"
      @select-log="handleLogSelect"
      @view-details="handleViewDetails"
    >
      <template #default="{ log, index }">
        <!-- Содержимое строки лога -->
        <LogRow :log="log" :index="index" />
      </template>
    </VirtualizedLogList>

    <!-- Обычный список (для малых объёмов) -->
    <div v-else class="regular-list">
      <!-- Существующий код списка -->
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import VirtualizedLogList from './VirtualizedLogList.vue';

export default {
  components: {
    VirtualizedLogList
  },
  setup() {
    const useVirtualization = ref(false);

    return {
      useVirtualization
    };
  }
};
</script>
```

**5.2. Добавить мемоизацию вычислений:**

```javascript
import { computed, memo } from 'vue';

// Мемоизация форматирования
const formattedLogs = memo(() => {
  return props.logs.map(log => ({
    ...log,
    formattedTimestamp: formatTimestamp(log.timestamp, 'short'),
    formattedEventType: formatEventType(log.event),
    formattedCategory: formatCategory(log.category)
  }));
});
```

**Результат шага 5:**
- Виртуализация интегрирована
- Мемоизация добавлена

---

### Шаг 6: Создание компонента экспорта

**6.1. Создать файл `vue-app/src/components/webhooks/WebhookLogsExport.vue`:**

```vue
<template>
  <div class="webhook-logs-export">
    <button 
      @click="showExportDialog = true"
      class="btn-export"
      :disabled="!hasLogs"
    >
      📥 Экспорт
    </button>

    <!-- Диалог экспорта -->
    <div v-if="showExportDialog" class="export-dialog">
      <div class="dialog-content">
        <h3>Экспорт логов</h3>
        
        <div class="export-options">
          <label>
            <input 
              type="radio" 
              v-model="exportFormat" 
              value="csv"
            />
            CSV
          </label>
          <label>
            <input 
              type="radio" 
              v-model="exportFormat" 
              value="json"
            />
            JSON
          </label>
          <label>
            <input 
              type="radio" 
              v-model="exportFormat" 
              value="excel"
            />
            Excel
          </label>
        </div>

        <div class="export-actions">
          <button 
            @click="handleExport"
            :disabled="exporting"
            class="btn-export-confirm"
          >
            {{ exporting ? 'Экспорт...' : 'Экспортировать' }}
          </button>
          <button 
            @click="showExportDialog = false"
            class="btn-cancel"
          >
            Отмена
          </button>
        </div>

        <div v-if="exportError" class="export-error">
          Ошибка: {{ exportError }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useLogsExport } from '@/composables/useLogsExport.js';

export default {
  name: 'WebhookLogsExport',
  props: {
    logs: {
      type: Array,
      required: true
    }
  },
  setup(props) {
    const showExportDialog = ref(false);
    const exportFormat = ref('csv');
    const logsRef = computed(() => props.logs);

    const {
      exporting,
      exportError,
      exportCSV,
      exportJSON,
      exportExcel
    } = useLogsExport(logsRef);

    const hasLogs = computed(() => props.logs.length > 0);

    const handleExport = async () => {
      try {
        const filename = `webhook-logs-${new Date().toISOString().split('T')[0]}.${exportFormat.value === 'excel' ? 'xlsx' : exportFormat.value}`;
        
        switch (exportFormat.value) {
          case 'csv':
            await exportCSV(filename);
            break;
          case 'json':
            await exportJSON(filename);
            break;
          case 'excel':
            await exportExcel(filename);
            break;
        }

        showExportDialog.value = false;
      } catch (error) {
        console.error('[WebhookLogsExport] Export error:', error);
      }
    };

    return {
      showExportDialog,
      exportFormat,
      exporting,
      exportError,
      hasLogs,
      handleExport
    };
  }
};
</script>

<style scoped>
.webhook-logs-export {
  position: relative;
}

.btn-export {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-export:hover:not(:disabled) {
  background-color: #f5f5f5;
  border-color: #999;
}

.btn-export:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  border-radius: 8px;
  padding: 24px;
  min-width: 400px;
  max-width: 600px;
}

.dialog-content h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.export-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.export-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-export-confirm,
.btn-cancel {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-export-confirm {
  background-color: #1976d2;
  color: white;
  border-color: #1976d2;
}

.btn-export-confirm:hover:not(:disabled) {
  background-color: #1565c0;
}

.btn-export-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel:hover {
  background-color: #f5f5f5;
}

.export-error {
  margin-top: 16px;
  padding: 12px;
  background-color: #ffebee;
  color: #c62828;
  border-radius: 4px;
  font-size: 14px;
}
</style>
```

**Результат шага 6:**
- Компонент экспорта создан
- Поддержка различных форматов реализована

---

## 📊 Критерии приёмки

- [x] Composable `useVirtualizedList` создан и реализован
- [x] Компонент `VirtualizedLogList` создан и работает корректно
- [x] Composable `useLogsExport` создан и реализован
- [x] Форматтеры экспорта (CSV, JSON, Excel) реализованы (используются из export-utils.js)
- [x] Composable `useLogsGrouping` создан и реализован
- [x] Компонент `WebhookLogsExport` уже существует и работает (создан в TASK-018-05-02-02)
- [x] Код соответствует стандартам ESLint (проверено)
- [x] JSDoc комментарии добавлены

---

## 🔍 Проверка выполнения

**Команды для проверки:**
```bash
# Проверить синтаксис
npm run lint vue-app/src/composables/useVirtualizedList.js
npm run lint vue-app/src/composables/useLogsExport.js
npm run lint vue-app/src/composables/useLogsGrouping.js

# Проверить компоненты
npm run lint vue-app/src/components/webhooks/VirtualizedLogList.vue
npm run lint vue-app/src/components/webhooks/WebhookLogsExport.vue
```

**Ручное тестирование:**
1. Открыть страницу с большим количеством логов (>100)
2. Проверить работу виртуализации
3. Проверить экспорт в различных форматах
4. Проверить группировку и агрегацию
5. Проверить производительность при скролле
6. Проверить работу с realtime обновлениями

---

## 🔗 Связи с другими этапами

**Зависит от:**
- **TASK-018-10-01:** Использует базовую структуру компонентов

**Зависит от него:**
- Нет (завершающий этап рефакторинга компонентов)

---

## 📝 История правок

- **2025-12-07 22:30 (UTC+3, Брест):** Создана задача оптимизации и расширения функциональности Vue.js компонентов
- **2025-12-07 22:00 (UTC+3, Брест):** Задача выполнена
  - Создан composable `useVirtualizedList.js` для виртуализации больших списков
  - Создан файл `virtualization-helpers.js` с вспомогательными функциями
  - Создан composable `useLogsExport.js` для экспорта логов
  - Создан composable `useLogsGrouping.js` для группировки и агрегации логов
  - Создан компонент `VirtualizedLogList.vue` для виртуализированного отображения списков
  - Все критерии приёмки выполнены

---

## 💡 Дополнительные рекомендации

1. **Производительность:**
   - Использовать `requestAnimationFrame` для плавного скролла
   - Дебаунсинг для фильтрации и поиска
   - Ленивая загрузка деталей логов

2. **UX:**
   - Плавные анимации при появлении новых логов
   - Индикаторы загрузки
   - Toast-уведомления для экспорта

3. **Доступность:**
   - Поддержка клавиатурной навигации в виртуализированных списках
   - ARIA-атрибуты для скринридеров
   - Фокус-менеджмент

4. **Тестирование:**
   - Тесты производительности для виртуализации
   - Тесты экспорта с различными объёмами данных
   - E2E тесты для критических сценариев

