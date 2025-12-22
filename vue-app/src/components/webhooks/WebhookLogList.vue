<template>
  <div class="webhook-log-list">
    <!-- Таблица логов -->
    <div v-if="logs.length > 0" class="logs-table-container">
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
            :class="{ 'row-selected': isSelected(log) }"
          >
            <td @click.stop>
              <input
                type="checkbox"
                :checked="isSelected(log)"
                @change="handleSelectLog(log, $event)"
                class="checkbox-input"
              />
            </td>
            <td>{{ formatTimestamp(log.timestamp) }}</td>
            <td>
              <span 
                class="status-indicator" 
                :class="getStatusClass(log)"
                :title="getStatusTitle(log)"
              >
                {{ getStatusIcon(log) }}
              </span>
              <span class="event-badge" :class="getEventClass(log.event)">
                {{ formatEvent(log.event) }}
              </span>
            </td>
            <td>
              <span class="category-badge" :class="getCategoryClass(log.category)">
                {{ formatCategoryLabel(log.category) }}
              </span>
            </td>
            <td>{{ log.ip || 'N/A' }}</td>
            <td>
              <div class="details-preview">
                {{ formatDetailsPreview(log.details) }}
              </div>
            </td>
            <td>
              <button
                @click.stop="handleLogClick(log)"
                class="btn-view"
              >
                Просмотр
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

  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { 
  isValidWebhookLogEntry,
  normalizeWebhookLogEntry 
} from '@/types/webhook-logs.js';
import { 
  formatTimestamp as formatTimestampUtil,
  formatEventType,
  formatCategory,
  formatEventDetails 
} from '@/utils/webhook-formatters.js';

export default {
  name: 'WebhookLogList',
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
    // Валидация и нормализация логов при получении props
    const validatedLogs = computed(() => {
      if (!props.logs || !Array.isArray(props.logs)) {
        console.warn('[WebhookLogList] Invalid logs prop:', props.logs);
        return [];
      }
      
      return props.logs
        .map(log => normalizeWebhookLogEntry(log))
        .filter(log => {
          if (!isValidWebhookLogEntry(log)) {
            console.warn('[WebhookLogList] Invalid log entry:', log);
            return false;
          }
          return true;
        });
    });
    
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
      if (!validatedLogs.value || validatedLogs.value.length === 0) {
        return [];
      }
      
      const logs = [...validatedLogs.value]; // Копия массива
      
      return logs.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy.value) {
          case 'timestamp':
            // Используем ISO 8601 формат для сравнения
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
    
    // Получить класс статуса для лога
    const getStatusClass = (log) => {
      if (log.category === 'errors') {
        return 'status-error';
      }
      return 'status-success';
    };
    
    // Получить иконку статуса
    const getStatusIcon = (log) => {
      if (log.category === 'errors') {
        return '❌';
      }
      return '✅';
    };
    
    // Получить title для статуса
    const getStatusTitle = (log) => {
      if (log.category === 'errors') {
        return 'Ошибка обработки';
      }
      return 'Успешно обработано';
    };
    const getLogId = (log) => {
      return `${log.timestamp}_${log.event}_${log.ip || 'unknown'}`;
    };

    // Обновить методы форматирования
    const formatTimestamp = (timestamp) => {
      if (!timestamp) return '—';
      return formatTimestampUtil(timestamp, 'short');
    };

    const formatEvent = (event) => {
      if (!event) return '—';
      return formatEventType(event);
    };

    const formatCategoryLabel = (category) => {
      if (!category) return '—';
      return formatCategory(category);
    };
    
    const formatDetailsPreview = (details) => {
      if (!details || typeof details !== 'object') {
        return '—';
      }
      return formatEventDetails(details);
    };

    const getCategoryClass = (category) => {
      return `category-${category}`;
    };

    const getEventClass = (event) => {
      if (event?.startsWith('ONTASK')) {
        return 'event-task';
      } else if (event?.startsWith('ONCRMDYNAMIC')) {
        return 'event-smart-process';
      } else {
        return 'event-other';
      }
    };

    const handleLogClick = (log) => {
      emit('select-log', log);
    };

    const handlePageChange = (page) => {
      if (page >= 1 && page <= props.pagination.pages) {
        emit('page-change', page);
      }
    };

    // Проверка, выбран ли лог
    const isSelected = (log) => {
      return props.selectedLogs.some(selected => getLogId(selected) === getLogId(log));
    };

    // Обработка выбора/снятия выбора лога
    const handleSelectLog = (log, event) => {
      event.stopPropagation();
      const selected = [...props.selectedLogs];
      const logId = getLogId(log);
      const index = selected.findIndex(l => getLogId(l) === logId);
      
      if (event.target.checked) {
        if (index === -1) {
          selected.push(log);
        }
      } else {
        if (index !== -1) {
          selected.splice(index, 1);
        }
      }
      
      emit('update:selectedLogs', selected);
    };

    // Выбор всех логов
    const handleSelectAll = (event) => {
      if (event.target.checked) {
        emit('update:selectedLogs', [...props.logs]);
      } else {
        emit('update:selectedLogs', []);
      }
    };

    // Проверка, выбраны ли все логи
    const allSelected = computed(() => {
      return validatedLogs.value.length > 0 && validatedLogs.value.every(log => isSelected(log));
    });
    
    // Обработка ошибок валидации
    watch(() => props.logs, (newLogs) => {
      if (newLogs && Array.isArray(newLogs)) {
        const invalidCount = newLogs.filter(log => !isValidWebhookLogEntry(log)).length;
        if (invalidCount > 0) {
          console.warn(
            `[WebhookLogList] Received ${invalidCount} invalid log entries out of ${newLogs.length}`
          );
        }
      }
    }, { immediate: true });

    return {
      validatedLogs,
      sortBy,
      sortOrder,
      sortedLogs,
      handleSort,
      getSortIcon,
      getStatusClass,
      getStatusIcon,
      getStatusTitle,
      getLogId,
      formatTimestamp,
      formatEvent,
      formatCategoryLabel,
      formatDetailsPreview,
      getCategoryClass,
      getEventClass,
      handleLogClick,
      handlePageChange,
      isSelected,
      handleSelectLog,
      handleSelectAll,
      allSelected
    };
  }
};
</script>

<style scoped>
.webhook-log-list {
  width: 100%;
}

.loading-state,
.error-state,
.empty-state {
  padding: 40px;
  text-align: center;
  color: #666;
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
  margin: 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
  color: #666;
}

.error-message {
  color: #dc3545;
  font-weight: 500;
}

.logs-table-container {
  overflow-x: auto;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
}

.logs-table thead {
  background: #f5f5f5;
}

.logs-table th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  color: #333;
  border-bottom: 2px solid #ddd;
  position: relative;
}

.checkbox-header {
  width: 40px;
  text-align: center;
}

.checkbox-input {
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.sortable {
  cursor: pointer;
  user-select: none;
  padding-right: 25px;
  transition: background-color 0.2s;
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

.logs-table td {
  padding: 12px;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}

.log-row {
  cursor: pointer;
  transition: background 0.2s;
}

.log-row:hover {
  background: #f9f9f9;
}

.log-row.row-selected {
  background: #e3f2fd;
}

.log-row.row-selected:hover {
  background: #bbdefb;
}

.status-indicator {
  display: inline-block;
  margin-right: 8px;
  font-size: 16px;
  vertical-align: middle;
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

.event-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  font-family: monospace;
}

.event-task {
  background: #e3f2fd;
  color: #1976d2;
}

.event-smart-process {
  background: #f3e5f5;
  color: #7b1fa2;
}

.event-other {
  background: #fff3e0;
  color: #e65100;
}

.category-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.category-tasks {
  background: #e8f5e9;
  color: #2e7d32;
}

.category-smart-processes {
  background: #f3e5f5;
  color: #7b1fa2;
}

.category-errors {
  background: #ffebee;
  color: #c62828;
}

.details-preview {
  font-size: 13px;
  color: #666;
}

.btn-view {
  padding: 6px 12px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.3s;
}

.btn-view:hover {
  background: #1976d2;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  padding: 15px;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}

.btn-pagination {
  padding: 8px 16px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.btn-pagination:hover:not(:disabled) {
  background: #1976d2;
}

.btn-pagination:disabled {
  background: #ccc;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .logs-table-container {
    overflow-x: scroll;
  }

  .logs-table {
    min-width: 800px;
  }
}
</style>



