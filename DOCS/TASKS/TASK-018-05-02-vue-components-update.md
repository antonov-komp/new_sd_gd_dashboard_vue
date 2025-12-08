# TASK-018-05-02: Обновление Vue.js компонентов для работы с новыми типами данных

**Дата создания:** 2025-12-07 16:00 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-018](./TASK-018-refactor-webhook-logs-module.md)  
**Тип:** Рефакторинг / Обновление

---

## 📋 Описание

Обновить Vue.js компоненты для работы с новыми типами данных и улучшенной структурой вебхуков. Адаптировать компоненты для использования типизированных интерфейсов, валидаторов и форматтеров, созданных в TASK-018-05-01.

**Цель этапа:**
- Обновить компоненты для работы с новыми типами данных
- Интегрировать валидаторы и форматтеры в компоненты
- Улучшить отображение деталей событий
- Оптимизировать работу с большими объёмами данных
- Улучшить UX при работе с новыми типами событий
- Добавить обработку новых полей в деталях событий

---

## 🎯 Контекст

Это вторая часть пятого этапа рефакторинга модуля логирования вебхуков (TASK-018) для Vue.js программиста. После обновления сервисов и composables (TASK-018-05-01) необходимо обновить компоненты для использования новых возможностей.

**Текущее состояние:**
- Компоненты работают со старым форматом данных
- Нет использования валидаторов и форматтеров
- Детали событий отображаются в сыром виде
- Нет оптимизации для больших payload
- Ограниченная поддержка новых типов событий

**Целевое состояние:**
- Компоненты используют типизированные интерфейсы
- Валидаторы и форматтеры интегрированы
- Улучшенное отображение деталей событий
- Оптимизация для больших данных
- Полная поддержка всех типов событий

**Связи:**
- Зависит от: TASK-018-05-01 (обновлённые сервисы, валидаторы, форматтеры)
- Зависит от него: TASK-018-10 (финальная полировка и тестирование)
- **Бэкенд:** Компоненты работают с новым API, который возвращает структурированные данные

---

## 📁 Модули и компоненты

### Файлы для изменения:

1. **`vue-app/src/pages/WebhookLogsPage.vue`**
   - Интеграция обновлённых сервисов
   - Использование валидаторов
   - Улучшенная обработка ошибок

2. **`vue-app/src/components/webhooks/WebhookLogList.vue`**
   - Использование форматтеров для отображения
   - Валидация данных перед отображением
   - Оптимизация рендеринга больших списков

3. **`vue-app/src/components/webhooks/WebhookLogDetails.vue`**
   - Улучшенное отображение деталей событий
   - Использование форматтеров
   - Оптимизация для больших payload

4. **`vue-app/src/components/webhooks/WebhookLogFilters.vue`**
   - Использование валидаторов фильтров
   - Улучшенная валидация ввода

5. **`vue-app/src/components/webhooks/WebhookLogsDashboard.vue`**
   - Использование новых типов данных для статистики
   - Улучшенное отображение метрик

6. **`vue-app/src/components/webhooks/WebhookLogsStats.vue`**
   - Обновление для работы с новой структурой данных
   - Использование форматтеров

### Файлы для создания:

1. **`vue-app/src/components/webhooks/EventDetailsView.vue`**
   - Компонент для отображения деталей событий
   - Поддержка всех типов событий
   - Форматирование данных

2. **`vue-app/src/components/webhooks/EventTypeBadge.vue`**
   - Компонент для отображения типа события
   - Цветовая индикация по категориям

3. **`vue-app/src/components/webhooks/CategoryBadge.vue`**
   - Компонент для отображения категории
   - Иконки и цвета

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Создание компонентов для отображения деталей событий

**1.1. Создать файл `vue-app/src/components/webhooks/EventDetailsView.vue`:**

```vue
<template>
  <div class="event-details-view">
    <div v-if="!details || Object.keys(details).length === 0" class="empty-details">
      <span class="empty-text">Детали события отсутствуют</span>
    </div>
    
    <div v-else class="details-content">
      <!-- Детали для событий задач -->
      <div v-if="isTaskEvent" class="task-details">
        <div v-if="details.task_id" class="detail-item">
          <span class="detail-label">ID задачи:</span>
          <span class="detail-value">{{ details.task_id }}</span>
        </div>
        
        <div v-if="details.task_title" class="detail-item">
          <span class="detail-label">Название:</span>
          <span class="detail-value">{{ details.task_title }}</span>
        </div>
        
        <div v-if="details.created_by" class="detail-item">
          <span class="detail-label">Создатель:</span>
          <span class="detail-value">ID {{ details.created_by }}</span>
        </div>
        
        <div v-if="details.responsible_id" class="detail-item">
          <span class="detail-label">Ответственный:</span>
          <span class="detail-value">ID {{ details.responsible_id }}</span>
        </div>
        
        <div v-if="details.status_id" class="detail-item">
          <span class="detail-label">Статус:</span>
          <span class="detail-value">{{ details.status_id }}</span>
        </div>
        
        <div v-if="details.priority" class="detail-item">
          <span class="detail-label">Приоритет:</span>
          <span class="detail-value">{{ formatPriority(details.priority) }}</span>
        </div>
        
        <div v-if="details.deadline" class="detail-item">
          <span class="detail-label">Дедлайн:</span>
          <span class="detail-value">{{ formatTimestamp(details.deadline) }}</span>
        </div>
      </div>
      
      <!-- Детали для событий комментариев -->
      <div v-if="isTaskCommentEvent" class="comment-details">
        <div v-if="details.comment_id" class="detail-item">
          <span class="detail-label">ID комментария:</span>
          <span class="detail-value">{{ details.comment_id }}</span>
        </div>
        
        <div v-if="details.task_id" class="detail-item">
          <span class="detail-label">ID задачи:</span>
          <span class="detail-value">{{ details.task_id }}</span>
        </div>
        
        <div v-if="details.comment_text" class="detail-item">
          <span class="detail-label">Текст комментария:</span>
          <div class="detail-value comment-text">{{ details.comment_text }}</div>
        </div>
        
        <div v-if="details.author_id" class="detail-item">
          <span class="detail-label">Автор:</span>
          <span class="detail-value">ID {{ details.author_id }}</span>
        </div>
        
        <div v-if="details.created_date" class="detail-item">
          <span class="detail-label">Дата создания:</span>
          <span class="detail-value">{{ formatTimestamp(details.created_date) }}</span>
        </div>
      </div>
      
      <!-- Детали для событий смарт-процессов -->
      <div v-if="isSmartProcessEvent" class="smart-process-details">
        <div v-if="details.entity_id" class="detail-item">
          <span class="detail-label">ID сущности:</span>
          <span class="detail-value">{{ details.entity_id }}</span>
        </div>
        
        <div v-if="details.title" class="detail-item">
          <span class="detail-label">Название:</span>
          <span class="detail-value">{{ details.title }}</span>
        </div>
        
        <div v-if="details.entity_type_id" class="detail-item">
          <span class="detail-label">Тип сущности:</span>
          <span class="detail-value">ID {{ details.entity_type_id }}</span>
        </div>
        
        <div v-if="details.created_by" class="detail-item">
          <span class="detail-label">Создатель:</span>
          <span class="detail-value">ID {{ details.created_by }}</span>
        </div>
        
        <div v-if="details.assigned_by" class="detail-item">
          <span class="detail-label">Ответственный:</span>
          <span class="detail-value">ID {{ details.assigned_by }}</span>
        </div>
        
        <div v-if="details.stage_id" class="detail-item">
          <span class="detail-label">Стадия:</span>
          <span class="detail-value">{{ details.stage_id }}</span>
        </div>
      </div>
      
      <!-- Изменённые поля (для UPDATE событий) -->
      <div v-if="details.changed_fields && details.changed_fields.length > 0" class="changed-fields">
        <div class="detail-item">
          <span class="detail-label">Изменённые поля:</span>
          <div class="detail-value">
            <span 
              v-for="field in details.changed_fields" 
              :key="field" 
              class="changed-field-badge"
            >
              {{ field }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Детали изменений полей (для UPDATE событий) -->
      <div v-if="details.field_changes && Object.keys(details.field_changes).length > 0" class="field-changes">
        <div class="detail-item">
          <span class="detail-label">Детали изменений:</span>
          <div class="detail-value">
            <div 
              v-for="(change, fieldName) in details.field_changes" 
              :key="fieldName" 
              class="field-change-item"
            >
              <span class="field-name">{{ fieldName }}:</span>
              <span class="field-old">{{ formatFieldValue(change.old) }}</span>
              <span class="field-arrow">→</span>
              <span class="field-new">{{ formatFieldValue(change.new) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Флаг удаления (для DELETE событий) -->
      <div v-if="details.deleted" class="deleted-flag">
        <span class="deleted-badge">Удалено</span>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { formatTimestamp } from '@/utils/webhook-formatters.js';

export default {
  name: 'EventDetailsView',
  props: {
    details: {
      type: Object,
      default: null
    },
    eventType: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    // Определение типа события
    const isTaskEvent = computed(() => {
      return props.eventType && props.eventType.startsWith('ONTASK') && 
             !props.eventType.startsWith('ONTASKCOMMENT');
    });
    
    const isTaskCommentEvent = computed(() => {
      return props.eventType && props.eventType.startsWith('ONTASKCOMMENT');
    });
    
    const isSmartProcessEvent = computed(() => {
      return props.eventType && props.eventType.startsWith('ONCRMDYNAMIC');
    });
    
    // Форматирование приоритета
    const formatPriority = (priority) => {
      const priorityMap = {
        '1': 'Низкий',
        '2': 'Средний',
        '3': 'Высокий'
      };
      return priorityMap[priority] || priority;
    };
    
    // Форматирование значения поля
    const formatFieldValue = (value) => {
      if (value === null || value === undefined) {
        return '—';
      }
      
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      
      if (typeof value === 'string' && value.length > 50) {
        return value.substring(0, 50) + '...';
      }
      
      return String(value);
    };
    
    return {
      isTaskEvent,
      isTaskCommentEvent,
      isSmartProcessEvent,
      formatTimestamp,
      formatPriority,
      formatFieldValue
    };
  }
};
</script>

<style scoped>
.event-details-view {
  padding: 16px;
}

.empty-details {
  text-align: center;
  padding: 24px;
  color: #999;
}

.details-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.detail-label {
  font-weight: 600;
  color: #666;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  color: #333;
  font-size: 14px;
}

.comment-text {
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}

.changed-fields {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.changed-field-badge {
  display: inline-block;
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-right: 4px;
  margin-bottom: 4px;
}

.field-changes {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.field-change-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f9f9f9;
  border-radius: 4px;
  margin-bottom: 8px;
}

.field-name {
  font-weight: 600;
  color: #666;
  min-width: 120px;
}

.field-old {
  color: #d32f2f;
  text-decoration: line-through;
}

.field-arrow {
  color: #999;
}

.field-new {
  color: #2e7d32;
  font-weight: 600;
}

.deleted-flag {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.deleted-badge {
  display: inline-block;
  background: #ffebee;
  color: #c62828;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}
</style>
```

**1.2. Создать файл `vue-app/src/components/webhooks/EventTypeBadge.vue`:**

```vue
<template>
  <span :class="badgeClass" class="event-type-badge">
    {{ formattedEventType }}
  </span>
</template>

<script>
import { computed } from 'vue';
import { formatEventType } from '@/utils/webhook-formatters.js';

export default {
  name: 'EventTypeBadge',
  props: {
    eventType: {
      type: String,
      required: true
    },
    category: {
      type: String,
      default: null
    }
  },
  setup(props) {
    const formattedEventType = computed(() => {
      return formatEventType(props.eventType);
    });
    
    const badgeClass = computed(() => {
      const baseClass = 'event-type-badge';
      const categoryClass = props.category ? `badge-${props.category}` : '';
      return `${baseClass} ${categoryClass}`.trim();
    });
    
    return {
      formattedEventType,
      badgeClass
    };
  }
};
</script>

<style scoped>
.event-type-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #e0e0e0;
  color: #424242;
}

.badge-tasks {
  background: #e3f2fd;
  color: #1976d2;
}

.badge-smart-processes {
  background: #f3e5f5;
  color: #7b1fa2;
}

.badge-errors {
  background: #ffebee;
  color: #c62828;
}
</style>
```

**1.3. Создать файл `vue-app/src/components/webhooks/CategoryBadge.vue`:**

```vue
<template>
  <span :class="badgeClass" class="category-badge">
    <span v-if="icon" class="category-icon">{{ icon }}</span>
    <span class="category-text">{{ formattedCategory }}</span>
  </span>
</template>

<script>
import { computed } from 'vue';
import { formatCategory } from '@/utils/webhook-formatters.js';

export default {
  name: 'CategoryBadge',
  props: {
    category: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const formattedCategory = computed(() => {
      return formatCategory(props.category);
    });
    
    const icon = computed(() => {
      const iconMap = {
        'tasks': '📋',
        'smart-processes': '⚙️',
        'errors': '⚠️'
      };
      return iconMap[props.category] || '';
    });
    
    const badgeClass = computed(() => {
      return `category-badge badge-${props.category}`;
    });
    
    return {
      formattedCategory,
      icon,
      badgeClass
    };
  }
};
</script>

<style scoped>
.category-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: #e0e0e0;
  color: #424242;
}

.category-icon {
  font-size: 14px;
}

.badge-tasks {
  background: #e3f2fd;
  color: #1976d2;
}

.badge-smart-processes {
  background: #f3e5f5;
  color: #7b1fa2;
}

.badge-errors {
  background: #ffebee;
  color: #c62828;
}
</style>
```

**Результат шага 1:**
- Компоненты для отображения деталей созданы
- Компоненты для отображения типов событий и категорий созданы
- Форматирование данных реализовано

---

### Шаг 2: Обновление WebhookLogList компонента

**2.1. Обновить `vue-app/src/components/webhooks/WebhookLogList.vue`:**

```vue
<template>
  <div class="webhook-log-list">
    <!-- Загрузка -->
    <SkeletonLogList v-if="loading" />
    
    <!-- Ошибка -->
    <ErrorDisplay v-else-if="error" :message="error" />
    
    <!-- Пустой список -->
    <EmptyState 
      v-else-if="!logs || logs.length === 0" 
      message="Логи не найдены"
    />
    
    <!-- Список логов -->
    <div v-else class="logs-container">
      <table class="logs-table">
        <thead>
          <tr>
            <th>
              <input 
                type="checkbox" 
                :checked="allSelected"
                @change="toggleSelectAll"
                class="select-all-checkbox"
              />
            </th>
            <th @click="handleSort('timestamp')" class="sortable">
              Время
              <span v-if="sortField === 'timestamp'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="handleSort('event')" class="sortable">
              Событие
              <span v-if="sortField === 'event'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="handleSort('category')" class="sortable">
              Категория
              <span v-if="sortField === 'category'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th>IP</th>
            <th>Детали</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="log in sortedLogs" 
            :key="getLogId(log)"
            :class="{ 'selected': isSelected(log) }"
            class="log-row"
          >
            <td>
              <input 
                type="checkbox" 
                :checked="isSelected(log)"
                @change="toggleSelect(log)"
                class="log-checkbox"
              />
            </td>
            <td class="timestamp-cell">
              {{ formatTimestamp(log.timestamp) }}
            </td>
            <td class="event-cell">
              <EventTypeBadge 
                :event-type="log.event" 
                :category="log.category"
              />
            </td>
            <td class="category-cell">
              <CategoryBadge :category="log.category" />
            </td>
            <td class="ip-cell">
              {{ log.ip || '—' }}
            </td>
            <td class="details-cell">
              <div v-if="log.details" class="details-preview">
                {{ formatEventDetailsPreview(log.details) }}
              </div>
              <span v-else class="no-details">—</span>
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
          Страница {{ pagination.page }} из {{ pagination.pages }} 
          (всего: {{ pagination.total }})
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
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { formatTimestamp, formatEventDetails } from '@/utils/webhook-formatters.js';
import { isValidWebhookLogEntry } from '@/types/webhook-logs.js';
import EventTypeBadge from './EventTypeBadge.vue';
import CategoryBadge from './CategoryBadge.vue';
import SkeletonLogList from '@/components/common/SkeletonLogList.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ErrorDisplay from '@/components/common/ErrorDisplay.vue';

export default {
  name: 'WebhookLogList',
  components: {
    EventTypeBadge,
    CategoryBadge,
    SkeletonLogList,
    EmptyState,
    ErrorDisplay
  },
  props: {
    logs: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: null
    },
    pagination: {
      type: Object,
      default: null
    },
    selectedLogs: {
      type: Array,
      default: () => []
    }
  },
  emits: ['select-log', 'page-change', 'update:selectedLogs'],
  setup(props, { emit }) {
    // Состояние сортировки
    const sortField = ref('timestamp');
    const sortOrder = ref('desc');
    
    // Валидация и фильтрация логов
    const validLogs = computed(() => {
      return props.logs.filter(log => {
        // Валидация структуры лога
        if (!isValidWebhookLogEntry(log)) {
          console.warn('[WebhookLogList] Invalid log entry:', log);
          return false;
        }
        return true;
      });
    });
    
    // Сортировка логов
    const sortedLogs = computed(() => {
      const logs = [...validLogs.value];
      
      logs.sort((a, b) => {
        let aValue = a[sortField.value];
        let bValue = b[sortField.value];
        
        // Специальная обработка для timestamp
        if (sortField.value === 'timestamp') {
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
      
      return logs;
    });
    
    // Проверка выбора всех
    const allSelected = computed(() => {
      return validLogs.value.length > 0 && 
             validLogs.value.every(log => props.selectedLogs.includes(getLogId(log)));
    });
    
    // Обработчики
    const handleSort = (field) => {
      if (sortField.value === field) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortField.value = field;
        sortOrder.value = 'asc';
      }
    };
    
    const handleViewDetails = (log) => {
      emit('select-log', log);
    };
    
    const handlePageChange = (page) => {
      emit('page-change', page);
    };
    
    const toggleSelect = (log) => {
      const logId = getLogId(log);
      const selected = [...props.selectedLogs];
      const index = selected.indexOf(logId);
      
      if (index > -1) {
        selected.splice(index, 1);
      } else {
        selected.push(logId);
      }
      
      emit('update:selectedLogs', selected);
    };
    
    const toggleSelectAll = () => {
      if (allSelected.value) {
        emit('update:selectedLogs', []);
      } else {
        const allIds = validLogs.value.map(log => getLogId(log));
        emit('update:selectedLogs', allIds);
      }
    };
    
    const isSelected = (log) => {
      return props.selectedLogs.includes(getLogId(log));
    };
    
    const getLogId = (log) => {
      return `${log.timestamp}_${log.event}`;
    };
    
    // Форматирование превью деталей
    const formatEventDetailsPreview = (details) => {
      if (!details || typeof details !== 'object') {
        return '—';
      }
      
      const parts = [];
      
      if (details.task_id) {
        parts.push(`Задача #${details.task_id}`);
      }
      
      if (details.entity_id) {
        parts.push(`Сущность #${details.entity_id}`);
      }
      
      if (details.task_title) {
        const title = details.task_title.length > 30
          ? details.task_title.substring(0, 30) + '...'
          : details.task_title;
        parts.push(`"${title}"`);
      }
      
      if (details.title) {
        const title = details.title.length > 30
          ? details.title.substring(0, 30) + '...'
          : details.title;
        parts.push(`"${title}"`);
      }
      
      return parts.length > 0 ? parts.join(' • ') : '—';
    };
    
    return {
      sortField,
      sortOrder,
      validLogs,
      sortedLogs,
      allSelected,
      handleSort,
      handleViewDetails,
      handlePageChange,
      toggleSelect,
      toggleSelectAll,
      isSelected,
      getLogId,
      formatTimestamp,
      formatEventDetailsPreview
    };
  }
};
</script>

<style scoped>
/* Стили компонента */
.webhook-log-list {
  width: 100%;
}

.logs-container {
  overflow-x: auto;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.logs-table th {
  background: #f5f5f5;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  color: #666;
  border-bottom: 2px solid #ddd;
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.sortable:hover {
  background: #eeeeee;
}

.sort-indicator {
  margin-left: 4px;
  font-size: 10px;
}

.log-row {
  border-bottom: 1px solid #eee;
  transition: background 0.2s;
}

.log-row:hover {
  background: #f9f9f9;
}

.log-row.selected {
  background: #e3f2fd;
}

.logs-table td {
  padding: 12px;
  font-size: 14px;
}

.timestamp-cell {
  white-space: nowrap;
  font-family: monospace;
  font-size: 12px;
  color: #666;
}

.event-cell,
.category-cell {
  white-space: nowrap;
}

.details-cell {
  max-width: 300px;
}

.details-preview {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-details {
  color: #999;
  font-style: italic;
}

.actions-cell {
  white-space: nowrap;
}

.btn-view {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-view:hover {
  background: #f0f0f0;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding: 16px;
}

.btn-pagination {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-pagination:hover:not(:disabled) {
  background: #f5f5f5;
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
</style>
```

**Результат шага 2:**
- `WebhookLogList` обновлён
- Валидация данных добавлена
- Форматтеры интегрированы
- Новые компоненты используются

---

### Шаг 3: Обновление WebhookLogDetails компонента

**3.1. Обновить `vue-app/src/components/webhooks/WebhookLogDetails.vue`:**

```vue
<template>
  <div v-if="log" class="webhook-log-details">
    <div class="details-header">
      <h2 class="details-title">Детали события</h2>
      <button @click="handleClose" class="btn-close" title="Закрыть">
        ✕
      </button>
    </div>
    
    <div class="details-content">
      <!-- Основная информация -->
      <div class="section">
        <h3 class="section-title">Основная информация</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Время:</span>
            <span class="info-value">{{ formatTimestamp(log.timestamp, 'long') }}</span>
          </div>
          
          <div class="info-item">
            <span class="info-label">Событие:</span>
            <EventTypeBadge :event-type="log.event" :category="log.category" />
          </div>
          
          <div class="info-item">
            <span class="info-label">Категория:</span>
            <CategoryBadge :category="log.category" />
          </div>
          
          <div v-if="log.ip" class="info-item">
            <span class="info-label">IP адрес:</span>
            <span class="info-value">{{ log.ip }}</span>
          </div>
        </div>
      </div>
      
      <!-- Детали события -->
      <div v-if="log.details" class="section">
        <h3 class="section-title">Детали события</h3>
        <EventDetailsView 
          :details="log.details" 
          :event-type="log.event"
        />
      </div>
      
      <!-- Payload -->
      <div v-if="log.payload" class="section">
        <h3 class="section-title">
          Payload
          <button 
            @click="togglePayloadExpanded" 
            class="btn-toggle"
            :title="payloadExpanded ? 'Свернуть' : 'Развернуть'"
          >
            {{ payloadExpanded ? '▼' : '▶' }}
          </button>
        </h3>
        <div v-if="payloadExpanded" class="payload-container">
          <pre class="payload-content">{{ formatPayload(log.payload) }}</pre>
          <button 
            @click="copyPayload" 
            class="btn-copy"
            title="Копировать в буфер обмена"
          >
            📋 Копировать
          </button>
        </div>
        <div v-else class="payload-collapsed">
          <span class="payload-preview">
            {{ getPayloadPreview(log.payload) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { formatTimestamp } from '@/utils/webhook-formatters.js';
import { isValidWebhookLogEntry } from '@/types/webhook-logs.js';
import EventTypeBadge from './EventTypeBadge.vue';
import CategoryBadge from './CategoryBadge.vue';
import EventDetailsView from './EventDetailsView.vue';

export default {
  name: 'WebhookLogDetails',
  components: {
    EventTypeBadge,
    CategoryBadge,
    EventDetailsView
  },
  props: {
    log: {
      type: Object,
      default: null,
      validator: (value) => {
        if (!value) return true; // null допустим
        return isValidWebhookLogEntry(value);
      }
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const payloadExpanded = ref(false);
    
    // Валидация лога
    const isValidLog = computed(() => {
      if (!props.log) {
        return false;
      }
      return isValidWebhookLogEntry(props.log);
    });
    
    // Обработчики
    const handleClose = () => {
      emit('close');
    };
    
    const togglePayloadExpanded = () => {
      payloadExpanded.value = !payloadExpanded.value;
    };
    
    const formatPayload = (payload) => {
      if (!payload) {
        return '—';
      }
      
      try {
        return JSON.stringify(payload, null, 2);
      } catch (e) {
        return String(payload);
      }
    };
    
    const getPayloadPreview = (payload) => {
      if (!payload) {
        return '—';
      }
      
      try {
        const json = JSON.stringify(payload);
        return json.length > 100 ? json.substring(0, 100) + '...' : json;
      } catch (e) {
        return String(payload).substring(0, 100);
      }
    };
    
    const copyPayload = async () => {
      if (!props.log || !props.log.payload) {
        return;
      }
      
      try {
        const payloadText = formatPayload(props.log.payload);
        await navigator.clipboard.writeText(payloadText);
        // Можно показать уведомление об успешном копировании
        console.log('Payload copied to clipboard');
      } catch (e) {
        console.error('Failed to copy payload:', e);
      }
    };
    
    return {
      payloadExpanded,
      isValidLog,
      handleClose,
      togglePayloadExpanded,
      formatTimestamp,
      formatPayload,
      getPayloadPreview,
      copyPayload
    };
  }
};
</script>

<style scoped>
.webhook-log-details {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.details-title {
  margin: 0;
  font-size: 20px;
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
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f5f5f5;
  color: #333;
}

.details-content {
  padding: 20px;
}

.section {
  margin-bottom: 24px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.btn-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  padding: 2px 4px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 14px;
  color: #333;
}

.payload-container {
  position: relative;
  background: #f5f5f5;
  border-radius: 4px;
  padding: 16px;
}

.payload-content {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #333;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
}

.btn-copy {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.btn-copy:hover {
  background: #f0f0f0;
  border-color: #999;
}

.payload-collapsed {
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
}

.payload-preview {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #666;
}
</style>
```

**Результат шага 3:**
- `WebhookLogDetails` обновлён
- Интеграция с `EventDetailsView` реализована
- Оптимизация для больших payload добавлена

---

### Шаг 4: Обновление остальных компонентов

**4.1. Обновить `vue-app/src/pages/WebhookLogsPage.vue`:**

Добавить использование валидаторов и улучшенную обработку ошибок:

```javascript
// В setup() функции добавить:

import { normalizeWebhookLogEntries } from '@/types/webhook-logs.js';
import { validateFilters } from '@/utils/webhook-validators.js';

// В функции загрузки логов:
const loadLogs = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    // Валидация фильтров перед запросом
    if (!validateFilters(filters.value)) {
      throw new Error('Invalid filters');
    }
    
    const result = await WebhookLogsApiService.getLogs(
      filters.value,
      pagination.value.page,
      pagination.value.limit
    );
    
    // Нормализация данных (на всякий случай)
    logs.value = normalizeWebhookLogEntries(result.logs);
    pagination.value = result.pagination;
    
  } catch (err) {
    console.error('[WebhookLogsPage] Error loading logs:', err);
    error.value = err.message || 'Ошибка загрузки логов';
    showError(error.value);
  } finally {
    loading.value = false;
  }
};
```

**4.2. Обновить `vue-app/src/components/webhooks/WebhookLogFilters.vue`:**

Добавить валидацию фильтров:

```javascript
import { validateFilters } from '@/utils/webhook-validators.js';

// В обработчике изменения фильтров:
const handleFilterChange = (newFilters) => {
  // Валидация фильтров
  if (!validateFilters(newFilters)) {
    console.warn('[WebhookLogFilters] Invalid filters:', newFilters);
    return;
  }
  
  emit('update:filters', newFilters);
};
```

**Результат шага 4:**
- Остальные компоненты обновлены
- Валидация интегрирована
- Обработка ошибок улучшена

---

## 📊 Критерии приёмки

- [ ] Компонент `EventDetailsView.vue` создан и реализован
- [ ] Компонент `EventTypeBadge.vue` создан и реализован
- [ ] Компонент `CategoryBadge.vue` создан и реализован
- [ ] `WebhookLogList.vue` обновлён для использования новых компонентов
- [ ] Валидация данных в `WebhookLogList.vue` добавлена
- [ ] Форматтеры интегрированы в `WebhookLogList.vue`
- [ ] `WebhookLogDetails.vue` обновлён для использования `EventDetailsView`
- [ ] Оптимизация для больших payload в `WebhookLogDetails.vue` реализована
- [ ] `WebhookLogsPage.vue` обновлён для использования валидаторов
- [ ] `WebhookLogFilters.vue` обновлён для валидации фильтров
- [ ] Все компоненты протестированы с реальными данными
- [ ] Код соответствует стандартам ESLint
- [ ] Стили компонентов соответствуют дизайн-системе
- [ ] **Все компоненты работают корректно с новым API**
- [ ] **Отображение данных соответствует ожиданиям пользователей**
- [ ] **Производительность компонентов оптимизирована**

---

## 🔍 Проверка выполнения

**Команды для проверки:**
```bash
# Проверить синтаксис Vue компонентов
npm run lint vue-app/src/components/webhooks/

# Запустить тесты (если есть)
npm run test vue-app/src/components/webhooks/

# Проверить работу в браузере
# Открыть /admin/webhook-logs и проверить:
# 1. Отображение списка логов
# 2. Отображение деталей событий
# 3. Работу фильтров
# 4. Работу пагинации
# 5. Работу SSE реального времени
```

**Ручное тестирование:**
1. Открыть страницу `/admin/webhook-logs`
2. Проверить отображение списка логов с новыми компонентами
3. Проверить отображение типов событий и категорий
4. Открыть детали лога и проверить отображение деталей события
5. Проверить работу фильтров
6. Проверить работу пагинации
7. Проверить работу SSE реального времени
8. Проверить обработку ошибок
9. Проверить производительность при большом количестве логов

---

## 🔗 Связи с другими этапами

**Зависит от:**
- **TASK-018-05-01:** Использует обновлённые сервисы, валидаторы и форматтеры

**Зависит от него:**
- **TASK-018-10:** Финальная полировка и тестирование всего интерфейса

---

## 📝 История правок

- **2025-12-07 16:00 (UTC+3, Брест):** Создана задача обновления Vue.js компонентов для работы с новыми типами данных

---

## 💡 Дополнительные рекомендации

1. **Производительность:**
   - Использовать виртуализацию для больших списков (vue-virtual-scroller)
   - Ленивая загрузка деталей событий
   - Мемоизация форматирования данных

2. **UX:**
   - Анимации при обновлении данных
   - Индикаторы загрузки
   - Плавные переходы между состояниями

3. **Доступность:**
   - ARIA атрибуты для интерактивных элементов
   - Клавиатурная навигация
   - Поддержка скринридеров

4. **Расширяемость:**
   - Легко добавлять новые типы событий
   - Конфигурируемые компоненты
   - Плагинная архитектура для форматтеров


