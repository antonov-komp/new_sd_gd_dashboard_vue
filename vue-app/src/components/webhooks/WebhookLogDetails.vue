<template>
  <div v-if="log" class="webhook-log-details">
    <div class="details-header">
      <h3>Детали лога вебхука</h3>
      <button @click="handleClose" class="btn-close">×</button>
    </div>

    <div class="details-content">
      <!-- Основная информация -->
      <div class="details-section">
        <h4>Основная информация</h4>
        <div class="info-grid">
          <div class="info-item">
            <label>Дата и время:</label>
            <span>{{ formatTimestamp(log.timestamp) }}</span>
          </div>
          <div class="info-item">
            <label>Тип события:</label>
            <span class="event-badge" :class="getEventClass(log.event)">
              {{ log.event }}
            </span>
          </div>
          <div class="info-item">
            <label>Категория:</label>
            <span class="category-badge" :class="getCategoryClass(log.category)">
              {{ getCategoryLabel(log.category) }}
            </span>
          </div>
          <div class="info-item">
            <label>IP адрес:</label>
            <span>{{ log.ip || 'N/A' }}</span>
          </div>
        </div>
      </div>

      <!-- Детали события -->
      <div v-if="log.details && Object.keys(log.details).length > 0" class="details-section">
        <h4>Детали события</h4>
        <div class="info-grid">
          <div
            v-for="(value, key) in log.details"
            :key="key"
            class="info-item"
          >
            <label>{{ formatKey(key) }}:</label>
            <span>{{ formatValue(value) }}</span>
          </div>
        </div>
      </div>

      <!-- Полный payload -->
      <div class="details-section">
        <h4>Полный payload</h4>
        <div class="json-container">
          <pre class="json-content">{{ formatJson(log.payload) }}</pre>
        </div>
      </div>

      <!-- Метаданные (если есть) -->
      <div v-if="log.metadata" class="details-section">
        <h4>Метаданные</h4>
        <div class="json-container">
          <pre class="json-content">{{ formatJson(log.metadata) }}</pre>
        </div>
      </div>
    </div>

    <div class="details-footer">
      <button @click="handleClose" class="btn-close-details">Закрыть</button>
    </div>
  </div>
</template>

<script>
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

    const formatKey = (key) => {
      // Преобразование snake_case в читаемый формат
      return key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    const formatValue = (value) => {
      if (value === null || value === undefined) {
        return 'N/A';
      }
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      }
      return String(value);
    };

    const formatJson = (obj) => {
      if (!obj) return 'N/A';
      try {
        return JSON.stringify(obj, null, 2);
      } catch (e) {
        return String(obj);
      }
    };

    const handleClose = () => {
      emit('close');
    };

    return {
      formatTimestamp,
      getCategoryLabel,
      getCategoryClass,
      getEventClass,
      formatKey,
      formatValue,
      formatJson,
      handleClose
    };
  }
};
</script>

<style scoped>
.webhook-log-details {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #f5f5f5;
  border-radius: 8px 8px 0 0;
}

.details-header h3 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.btn-close {
  background: none;
  border: none;
  font-size: 28px;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-close:hover {
  background: #e0e0e0;
}

.details-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.details-section {
  margin-bottom: 25px;
}

.details-section:last-child {
  margin-bottom: 0;
}

.details-section h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #333;
  border-bottom: 2px solid #2196F3;
  padding-bottom: 5px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-item label {
  font-weight: 600;
  font-size: 13px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-item span {
  font-size: 14px;
  color: #333;
  word-break: break-word;
}

.event-badge,
.category-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
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

.json-container {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 15px;
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
}

.json-content {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #333;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.details-footer {
  padding: 15px 20px;
  border-top: 1px solid #e0e0e0;
  background: #f5f5f5;
  border-radius: 0 0 8px 8px;
  display: flex;
  justify-content: flex-end;
}

.btn-close-details {
  padding: 10px 20px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.btn-close-details:hover {
  background: #1976d2;
}

</style>

