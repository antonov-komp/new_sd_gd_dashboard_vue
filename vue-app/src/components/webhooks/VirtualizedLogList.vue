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
import { computed, onMounted } from 'vue';
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







