# TASK-018-06-02: Улучшение Vue.js интерфейса для работы с логированием

**Дата создания:** 2025-12-07 16:30 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-018](./TASK-018-refactor-webhook-logs-module.md)  
**Тип:** Рефакторинг / Улучшение UI

---

## 📋 Описание

Улучшить Vue.js интерфейс для работы с логированием вебхуков. Добавить визуализацию метаданных логирования, индикаторы статуса логирования, улучшенное отображение ошибок логирования и статистику логирования в реальном времени.

**Цель этапа:**
- Добавить визуализацию метаданных логирования в интерфейсе
- Реализовать индикаторы статуса логирования
- Улучшить отображение ошибок логирования
- Добавить статистику логирования в реальном времени
- Создать компоненты для работы с метаданными логирования
- Оптимизировать отображение улучшенной структуры логов

---

## 🎯 Контекст

Это вторая часть шестого этапа рефакторинга модуля логирования вебхуков (TASK-018) для Vue.js программиста. После адаптации сервисов к новому логированию (TASK-018-06-01) необходимо улучшить интерфейс для работы с метаданными и улучшенной структурой логов.

**Текущее состояние:**
- Интерфейс не отображает метаданные логирования
- Нет индикаторов статуса логирования
- Ограниченное отображение ошибок логирования
- Нет статистики логирования в реальном времени
- Улучшенная структура логов не используется в UI

**Целевое состояние:**
- Визуализация метаданных логирования
- Индикаторы статуса логирования
- Улучшенное отображение ошибок
- Статистика в реальном времени
- Использование улучшенной структуры в UI

**Связи:**
- Зависит от: TASK-018-06-01 (обновлённые сервисы и утилиты для логирования)
- Зависит от него: TASK-018-10 (финальная полировка и тестирование)
- **Бэкенд:** Интерфейс работает с новым `WebhookLoggingService` и улучшенной структурой логов

---

## 📁 Модули и компоненты

### Файлы для создания:

1. **`vue-app/src/components/webhooks/LoggingMetadataPanel.vue`**
   - Панель с метаданными логирования
   - Статистика по категориям и событиям
   - Обновление в реальном времени

2. **`vue-app/src/components/webhooks/LoggingStatusIndicator.vue`**
   - Индикатор статуса логирования
   - Цветовая индикация
   - Иконки статусов

3. **`vue-app/src/components/webhooks/LoggingErrorsPanel.vue`**
   - Панель с ошибками логирования
   - Фильтрация и сортировка ошибок
   - Детальный просмотр ошибок

4. **`vue-app/src/components/webhooks/LoggingStatsWidget.vue`**
   - Виджет со статистикой логирования
   - Графики и метрики
   - Обновление в реальном времени

### Файлы для изменения:

1. **`vue-app/src/pages/WebhookLogsPage.vue`**
   - Интеграция компонентов метаданных
   - Использование `useLoggingMetadata`
   - Отображение статистики

2. **`vue-app/src/components/webhooks/WebhookLogList.vue`**
   - Добавление индикаторов статуса логирования
   - Отображение метаданных в списке
   - Улучшенное отображение ошибок

3. **`vue-app/src/components/webhooks/WebhookLogDetails.vue`**
   - Отображение метаданных логирования
   - Индикатор статуса логирования
   - Детали ошибок логирования

4. **`vue-app/src/components/webhooks/WebhookLogsDashboard.vue`**
   - Интеграция статистики логирования
   - Использование метаданных
   - Обновление в реальном времени

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Создание компонента LoggingStatusIndicator

**1.1. Создать файл `vue-app/src/components/webhooks/LoggingStatusIndicator.vue`:**

```vue
<template>
  <span :class="indicatorClass" class="logging-status-indicator" :title="statusTooltip">
    <span class="status-icon">{{ statusIcon }}</span>
    <span v-if="showLabel" class="status-label">{{ statusLabel }}</span>
    <span v-if="showDuration && logEntry.loggingDuration" class="status-duration">
      ({{ formatLoggingDuration(logEntry.loggingDuration) }})
    </span>
  </span>
</template>

<script>
import { computed } from 'vue';
import { 
  getLoggingStatus, 
  getLoggingStatusColor, 
  getLoggingStatusIcon,
  formatLoggingDuration 
} from '@/utils/logging-helpers.js';

export default {
  name: 'LoggingStatusIndicator',
  props: {
    logEntry: {
      type: Object,
      required: true
    },
    showLabel: {
      type: Boolean,
      default: true
    },
    showDuration: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const status = computed(() => {
      return getLoggingStatus(props.logEntry);
    });
    
    const statusIcon = computed(() => {
      return getLoggingStatusIcon(status.value);
    });
    
    const statusColor = computed(() => {
      return getLoggingStatusColor(status.value);
    });
    
    const statusLabel = computed(() => {
      const labelMap = {
        'success': 'Успешно',
        'error': 'Ошибка',
        'warning': 'Предупреждение'
      };
      return labelMap[status.value] || status.value;
    });
    
    const statusTooltip = computed(() => {
      const tooltipMap = {
        'success': 'Событие успешно залогировано',
        'error': 'Ошибка при логировании события',
        'warning': 'Предупреждение при логировании'
      };
      
      let tooltip = tooltipMap[status.value] || 'Неизвестный статус';
      
      if (props.logEntry.loggingId) {
        tooltip += ` (ID: ${props.logEntry.loggingId})`;
      }
      
      if (props.logEntry.loggingDuration) {
        tooltip += ` | Длительность: ${formatLoggingDuration(props.logEntry.loggingDuration)}`;
      }
      
      return tooltip;
    });
    
    const indicatorClass = computed(() => {
      return `logging-status-indicator status-${status.value}`;
    });
    
    return {
      status,
      statusIcon,
      statusColor,
      statusLabel,
      statusTooltip,
      indicatorClass,
      formatLoggingDuration
    };
  }
};
</script>

<style scoped>
.logging-status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: #f5f5f5;
  color: #666;
}

.status-icon {
  font-size: 14px;
}

.status-success {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-error {
  background: #ffebee;
  color: #c62828;
}

.status-warning {
  background: #fff3e0;
  color: #e65100;
}

.status-duration {
  font-size: 11px;
  opacity: 0.7;
  font-family: monospace;
}
</style>
```

**Результат шага 1:**
- Компонент индикатора статуса создан
- Визуализация статусов реализована
- Форматирование длительности добавлено

---

### Шаг 2: Создание компонента LoggingMetadataPanel

**2.1. Создать файл `vue-app/src/components/webhooks/LoggingMetadataPanel.vue`:**

```vue
<template>
  <div class="logging-metadata-panel">
    <div class="panel-header">
      <h3 class="panel-title">Метаданные логирования</h3>
      <button 
        @click="refreshMetadata" 
        :disabled="loading"
        class="btn-refresh"
        title="Обновить метаданные"
      >
        🔄
      </button>
    </div>
    
    <!-- Загрузка -->
    <div v-if="loading" class="loading-state">
      <span>Загрузка метаданных...</span>
    </div>
    
    <!-- Ошибка -->
    <div v-else-if="error" class="error-state">
      <span class="error-text">{{ error }}</span>
      <button @click="refreshMetadata" class="btn-retry">Повторить</button>
    </div>
    
    <!-- Метаданные -->
    <div v-else-if="hasMetadata" class="metadata-content">
      <!-- Общая статистика -->
      <div class="stats-section">
        <div class="stat-item">
          <span class="stat-label">Всего логов:</span>
          <span class="stat-value">{{ totalLogs.toLocaleString() }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Ошибок:</span>
          <span class="stat-value error-value">{{ totalErrors.toLocaleString() }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Среднее в час:</span>
          <span class="stat-value">{{ Math.round(averagePerHour) }}</span>
        </div>
      </div>
      
      <!-- Статистика по категориям -->
      <div v-if="Object.keys(byCategory).length > 0" class="category-stats">
        <h4 class="section-title">По категориям:</h4>
        <div class="category-list">
          <div 
            v-for="(count, category) in byCategory" 
            :key="category"
            class="category-item"
          >
            <CategoryBadge :category="category" />
            <span class="category-count">{{ count.toLocaleString() }}</span>
          </div>
        </div>
      </div>
      
      <!-- Статистика по событиям -->
      <div v-if="Object.keys(byEvent).length > 0" class="event-stats">
        <h4 class="section-title">По событиям:</h4>
        <div class="event-list">
          <div 
            v-for="(count, event) in topEvents" 
            :key="event"
            class="event-item"
          >
            <EventTypeBadge :event-type="event" />
            <span class="event-count">{{ count.toLocaleString() }}</span>
          </div>
        </div>
      </div>
      
      <!-- Временные метки -->
      <div class="timestamps-section">
        <div v-if="lastLogTime" class="timestamp-item">
          <span class="timestamp-label">Последний лог:</span>
          <span class="timestamp-value">{{ formatTimestamp(lastLogTime) }}</span>
        </div>
        <div v-if="lastErrorTime" class="timestamp-item">
          <span class="timestamp-label">Последняя ошибка:</span>
          <span class="timestamp-value error-value">{{ formatTimestamp(lastErrorTime) }}</span>
        </div>
        <div v-if="lastUpdate" class="timestamp-item">
          <span class="timestamp-label">Обновлено:</span>
          <span class="timestamp-value">{{ formatTimestamp(lastUpdate) }}</span>
        </div>
      </div>
    </div>
    
    <!-- Пустое состояние -->
    <div v-else class="empty-state">
      <span>Метаданные недоступны</span>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useLoggingMetadata } from '@/composables/useLoggingMetadata.js';
import { formatTimestamp } from '@/utils/webhook-formatters.js';
import CategoryBadge from './CategoryBadge.vue';
import EventTypeBadge from './EventTypeBadge.vue';

export default {
  name: 'LoggingMetadataPanel',
  components: {
    CategoryBadge,
    EventTypeBadge
  },
  props: {
    filters: {
      type: Object,
      default: () => ({})
    },
    autoRefresh: {
      type: Boolean,
      default: false
    },
    refreshInterval: {
      type: Number,
      default: 60000
    }
  },
  setup(props) {
    const {
      metadata,
      loading,
      error,
      lastUpdate,
      hasMetadata,
      totalLogs,
      totalErrors,
      byCategory,
      byEvent,
      averagePerHour,
      lastLogTime,
      lastErrorTime,
      loadMetadata,
      refreshMetadata,
      startAutoRefresh,
      stopAutoRefresh
    } = useLoggingMetadata({
      autoRefresh: props.autoRefresh,
      refreshInterval: props.refreshInterval,
      filters: props.filters
    });
    
    // Топ событий (первые 10)
    const topEvents = computed(() => {
      const events = Object.entries(byEvent.value)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      return Object.fromEntries(events);
    });
    
    return {
      metadata,
      loading,
      error,
      lastUpdate,
      hasMetadata,
      totalLogs,
      totalErrors,
      byCategory,
      byEvent,
      averagePerHour,
      lastLogTime,
      lastErrorTime,
      topEvents,
      loadMetadata,
      refreshMetadata,
      formatTimestamp
    };
  }
};
</script>

<style scoped>
.logging-metadata-panel {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.btn-refresh {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-refresh:hover:not(:disabled) {
  background: #f5f5f5;
}

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 24px;
  color: #999;
}

.error-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.error-text {
  color: #c62828;
}

.btn-retry {
  padding: 6px 12px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.metadata-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.error-value {
  color: #c62828;
}

.category-stats,
.event-stats {
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #666;
}

.category-list,
.event-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-item,
.event-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f9f9f9;
  border-radius: 4px;
}

.category-count,
.event-count {
  font-weight: 600;
  color: #333;
}

.timestamps-section {
  padding-top: 16px;
  border-top: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timestamp-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.timestamp-label {
  color: #666;
}

.timestamp-value {
  color: #333;
  font-family: monospace;
}
</style>
```

**Результат шага 2:**
- Компонент панели метаданных создан
- Статистика отображается
- Обновление в реальном времени реализовано

---

### Шаг 3: Создание компонента LoggingErrorsPanel

**3.1. Создать файл `vue-app/src/components/webhooks/LoggingErrorsPanel.vue`:**

```vue
<template>
  <div class="logging-errors-panel">
    <div class="panel-header">
      <h3 class="panel-title">
        Ошибки логирования
        <span v-if="errors.length > 0" class="errors-count">({{ errors.length }})</span>
      </h3>
      <button 
        @click="refreshErrors" 
        :disabled="loading"
        class="btn-refresh"
        title="Обновить список ошибок"
      >
        🔄
      </button>
    </div>
    
    <!-- Загрузка -->
    <div v-if="loading" class="loading-state">
      <span>Загрузка ошибок...</span>
    </div>
    
    <!-- Ошибка -->
    <div v-else-if="error" class="error-state">
      <span class="error-text">{{ error }}</span>
      <button @click="refreshErrors" class="btn-retry">Повторить</button>
    </div>
    
    <!-- Список ошибок -->
    <div v-else-if="errors.length > 0" class="errors-list">
      <div 
        v-for="(errorItem, index) in errors" 
        :key="index"
        class="error-item"
        @click="selectError(errorItem)"
      >
        <div class="error-header">
          <span class="error-type">{{ errorItem.error }}</span>
          <span class="error-time">{{ formatTimestamp(errorItem.timestamp) }}</span>
        </div>
        <div class="error-description">
          {{ errorItem.error_description }}
        </div>
        <div v-if="errorItem.loggingId" class="error-id">
          ID: {{ errorItem.loggingId }}
        </div>
      </div>
    </div>
    
    <!-- Пустое состояние -->
    <div v-else class="empty-state">
      <span>Ошибок логирования не найдено</span>
    </div>
    
    <!-- Детали ошибки (модальное окно) -->
    <div v-if="selectedError" class="error-details-modal" @click.self="closeErrorDetails">
      <div class="modal-content">
        <div class="modal-header">
          <h4>Детали ошибки</h4>
          <button @click="closeErrorDetails" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-item">
            <span class="detail-label">Тип ошибки:</span>
            <span class="detail-value">{{ selectedError.error }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Описание:</span>
            <span class="detail-value">{{ selectedError.error_description }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Время:</span>
            <span class="detail-value">{{ formatTimestamp(selectedError.timestamp, 'long') }}</span>
          </div>
          <div v-if="selectedError.loggingId" class="detail-item">
            <span class="detail-label">ID логирования:</span>
            <span class="detail-value">{{ selectedError.loggingId }}</span>
          </div>
          <div v-if="selectedError.context" class="detail-item">
            <span class="detail-label">Контекст:</span>
            <pre class="detail-value context-value">{{ formatContext(selectedError.context) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { WebhookLoggingClient } from '@/services/webhook-logging-client.js';
import { formatTimestamp } from '@/utils/webhook-formatters.js';

export default {
  name: 'LoggingErrorsPanel',
  props: {
    filters: {
      type: Object,
      default: () => ({})
    },
    limit: {
      type: Number,
      default: 50
    }
  },
  setup(props) {
    const errors = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const selectedError = ref(null);
    
    /**
     * Загрузка ошибок
     */
    const loadErrors = async () => {
      loading.value = true;
      error.value = null;
      
      try {
        const errorList = await WebhookLoggingClient.getLoggingErrors(
          props.filters,
          props.limit
        );
        
        errors.value = errorList;
      } catch (err) {
        console.error('[LoggingErrorsPanel] Error loading errors:', err);
        error.value = err.message || 'Failed to load errors';
      } finally {
        loading.value = false;
      }
    };
    
    /**
     * Обновление списка ошибок
     */
    const refreshErrors = async () => {
      await loadErrors();
    };
    
    /**
     * Выбор ошибки для просмотра деталей
     */
    const selectError = (errorItem) => {
      selectedError.value = errorItem;
    };
    
    /**
     * Закрытие деталей ошибки
     */
    const closeErrorDetails = () => {
      selectedError.value = null;
    };
    
    /**
     * Форматирование контекста ошибки
     */
    const formatContext = (context) => {
      if (!context) {
        return '—';
      }
      
      try {
        return JSON.stringify(context, null, 2);
      } catch (e) {
        return String(context);
      }
    };
    
    // Загрузка при монтировании
    loadErrors();
    
    return {
      errors,
      loading,
      error,
      selectedError,
      loadErrors,
      refreshErrors,
      selectError,
      closeErrorDetails,
      formatTimestamp,
      formatContext
    };
  }
};
</script>

<style scoped>
.logging-errors-panel {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-height: 600px;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.errors-count {
  font-size: 14px;
  color: #c62828;
  font-weight: 600;
}

.btn-refresh {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-refresh:hover:not(:disabled) {
  background: #f5f5f5;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 24px;
  color: #999;
}

.error-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.error-text {
  color: #c62828;
}

.btn-retry {
  padding: 6px 12px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.errors-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-item {
  padding: 12px;
  background: #ffebee;
  border-left: 4px solid #c62828;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.error-item:hover {
  background: #ffcdd2;
}

.error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.error-type {
  font-weight: 600;
  color: #c62828;
  font-size: 14px;
}

.error-time {
  font-size: 12px;
  color: #666;
  font-family: monospace;
}

.error-description {
  font-size: 13px;
  color: #333;
  margin-bottom: 4px;
}

.error-id {
  font-size: 11px;
  color: #999;
  font-family: monospace;
}

.error-details-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 4px 8px;
  border-radius: 4px;
}

.btn-close:hover {
  background: #f5f5f5;
  color: #333;
}

.modal-body {
  padding: 20px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

.detail-label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 14px;
  color: #333;
}

.context-value {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}
</style>
```

**Результат шага 3:**
- Компонент панели ошибок создан
- Отображение ошибок реализовано
- Детальный просмотр ошибок добавлен

---

### Шаг 4: Обновление существующих компонентов

**4.1. Обновить `WebhookLogList.vue` для отображения статусов:**

```vue
<!-- Добавить в таблицу колонку со статусом -->
<th>Статус</th>

<!-- В строке таблицы -->
<td class="status-cell">
  <LoggingStatusIndicator 
    :log-entry="log"
    :show-duration="false"
  />
</td>
```

**4.2. Обновить `WebhookLogDetails.vue` для отображения метаданных:**

```vue
<!-- Добавить секцию с метаданными логирования -->
<div v-if="log.loggingId || log.loggingDuration" class="section">
  <h3 class="section-title">Метаданные логирования</h3>
  <div class="metadata-grid">
    <div v-if="log.loggingId" class="metadata-item">
      <span class="metadata-label">ID логирования:</span>
      <span class="metadata-value">{{ log.loggingId }}</span>
    </div>
    <div v-if="log.loggingDuration" class="metadata-item">
      <span class="metadata-label">Длительность:</span>
      <span class="metadata-value">{{ formatLoggingDuration(log.loggingDuration) }}</span>
    </div>
    <div class="metadata-item">
      <span class="metadata-label">Статус:</span>
      <LoggingStatusIndicator :log-entry="log" />
    </div>
  </div>
</div>
```

**4.3. Обновить `WebhookLogsPage.vue` для интеграции метаданных:**

```vue
<!-- Добавить компоненты метаданных -->
<LoggingMetadataPanel 
  :filters="filters"
  :auto-refresh="true"
  :refresh-interval="60000"
/>

<LoggingErrorsPanel 
  :filters="filters"
  :limit="20"
/>
```

**Результат шага 4:**
- Существующие компоненты обновлены
- Интеграция метаданных реализована
- Статусы отображаются в интерфейсе

---

## 📊 Критерии приёмки

- [ ] Компонент `LoggingStatusIndicator.vue` создан и реализован
- [ ] Компонент `LoggingMetadataPanel.vue` создан и реализован
- [ ] Компонент `LoggingErrorsPanel.vue` создан и реализован
- [ ] `WebhookLogList.vue` обновлён для отображения статусов
- [ ] `WebhookLogDetails.vue` обновлён для отображения метаданных
- [ ] `WebhookLogsPage.vue` обновлён для интеграции метаданных
- [ ] Все компоненты протестированы с реальными данными
- [ ] Код соответствует стандартам ESLint
- [ ] Стили компонентов соответствуют дизайн-системе
- [ ] **Все компоненты работают корректно с новым WebhookLoggingService**
- [ ] **Метаданные отображаются корректно в интерфейсе**
- [ ] **Статусы логирования визуализируются правильно**

---

## 🔍 Проверка выполнения

**Команды для проверки:**
```bash
# Проверить синтаксис Vue компонентов
npm run lint vue-app/src/components/webhooks/

# Проверить работу в браузере
# Открыть /admin/webhook-logs и проверить:
# 1. Отображение статусов логирования
# 2. Панель метаданных логирования
# 3. Панель ошибок логирования
# 4. Обновление метаданных в реальном времени
```

**Ручное тестирование:**
1. Проверить отображение статусов в списке логов
2. Проверить панель метаданных логирования
3. Проверить панель ошибок логирования
4. Проверить обновление метаданных в реальном времени
5. Проверить отображение метаданных в деталях лога
6. Проверить работу фильтров с метаданными

---

## 🔗 Связи с другими этапами

**Зависит от:**
- **TASK-018-06-01:** Использует обновлённые сервисы и утилиты для логирования

**Зависит от него:**
- **TASK-018-10:** Финальная полировка и тестирование всего интерфейса

---

## 📝 История правок

- **2025-12-07 16:30 (UTC+3, Брест):** Создана задача улучшения Vue.js интерфейса для работы с логированием

---

## 💡 Дополнительные рекомендации

1. **UX:**
   - Анимации при обновлении метаданных
   - Индикаторы загрузки
   - Плавные переходы между состояниями

2. **Производительность:**
   - Виртуализация списков ошибок
   - Ленивая загрузка деталей
   - Оптимизация обновлений в реальном времени

3. **Доступность:**
   - ARIA атрибуты для индикаторов
   - Клавиатурная навигация
   - Поддержка скринридеров

4. **Расширяемость:**
   - Легко добавлять новые метаданные
   - Конфигурируемые компоненты
   - Плагинная архитектура для визуализации




