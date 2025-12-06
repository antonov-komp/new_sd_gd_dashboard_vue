<template>
  <div class="webhook-log-list">
    <!-- Состояние загрузки -->
    <div v-if="loading" class="loading-state">
      <p>Загрузка логов...</p>
    </div>

    <!-- Состояние ошибки -->
    <div v-else-if="error" class="error-state">
      <p class="error-message">{{ error }}</p>
    </div>

    <!-- Таблица логов -->
    <div v-else-if="logs.length > 0" class="logs-table-container">
      <table class="logs-table">
        <thead>
          <tr>
            <th>Дата и время</th>
            <th>Тип события</th>
            <th>Категория</th>
            <th>IP</th>
            <th>Детали</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="log in logs"
            :key="getLogId(log)"
            @click="handleLogClick(log)"
            class="log-row"
          >
            <td>{{ formatTimestamp(log.timestamp) }}</td>
            <td>
              <span class="event-badge" :class="getEventClass(log.event)">
                {{ log.event }}
              </span>
            </td>
            <td>
              <span class="category-badge" :class="getCategoryClass(log.category)">
                {{ getCategoryLabel(log.category) }}
              </span>
            </td>
            <td>{{ log.ip || 'N/A' }}</td>
            <td>
              <div class="details-preview">
                <span v-if="log.details?.task_id">Задача #{{ log.details.task_id }}</span>
                <span v-else-if="log.details?.entity_id">Элемент #{{ log.details.entity_id }}</span>
                <span v-else>-</span>
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

    <!-- Пустое состояние -->
    <div v-else class="empty-state">
      <p>Логи не найдены</p>
    </div>
  </div>
</template>

<script>
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
    }
  },
  emits: ['select-log', 'page-change'],
  setup(props, { emit }) {
    const getLogId = (log) => {
      return `${log.timestamp}_${log.event}_${log.ip || 'unknown'}`;
    };

    const formatTimestamp = (timestamp) => {
      if (!timestamp) return 'N/A';
      try {
        const date = new Date(timestamp);
        return date.toLocaleString('ru-RU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } catch (e) {
        return timestamp;
      }
    };

    const getCategoryLabel = (category) => {
      const labels = {
        'tasks': 'Задачи',
        'smart-processes': 'Смарт-процессы',
        'errors': 'Ошибки'
      };
      return labels[category] || category;
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

    return {
      getLogId,
      formatTimestamp,
      getCategoryLabel,
      getCategoryClass,
      getEventClass,
      handleLogClick,
      handlePageChange
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

