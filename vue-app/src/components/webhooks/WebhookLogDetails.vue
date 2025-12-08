<template>
  <div v-if="validatedLog" class="webhook-log-details">
    <div class="details-header">
      <h3>Детали лога вебхука</h3>
      <div class="header-actions">
        <button 
          @click="copyFullPayload" 
          class="btn-copy"
          title="Копировать весь payload"
        >
          📋 Копировать JSON
        </button>
        <button @click="handleClose" class="btn-close">×</button>
      </div>
    </div>

    <div class="details-content">
      <!-- Сообщение об успешном копировании -->
      <div v-if="copySuccess" class="copy-success-message">
        ✅ Скопировано в буфер обмена!
      </div>
      
      <!-- Сообщение об ошибке -->
      <div v-if="copyError" class="copy-error-message">
        ❌ {{ copyError }}
      </div>

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
                  {{ getCategoryLabel(value) }}
                </span>
              </span>
              <span v-else-if="key === 'timestamp'">
                {{ formatTimestamp(value) }}
              </span>
              <span v-else>{{ value || 'N/A' }}</span>
              <button 
                @click="copyField(key, value)"
                class="btn-copy-field"
                title="Копировать значение"
              >
                📋
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Детали события -->
      <div v-if="validatedDetails && Object.keys(validatedDetails).length > 0" class="details-section">
        <h4>Детали события</h4>
        <div class="info-grid">
          <div
            v-for="(value, key) in validatedDetails"
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
        <div class="section-header">
          <h4>Полный payload</h4>
          <div class="section-actions">
            <span v-if="payloadSize > MAX_DISPLAY_SIZE" class="size-warning">
              Большой JSON ({{ formatBytes(payloadSize) }})
            </span>
            <button 
              v-if="payloadSize > MAX_DISPLAY_SIZE && !showFullPayload"
              @click="showFullPayload = true"
              class="btn-show-more"
            >
              Показать полностью
            </button>
            <button 
              @click="copyFullPayload"
              class="btn-copy-section"
              title="Копировать весь payload"
            >
              📋 Копировать
            </button>
          </div>
        </div>
        <div class="json-container">
          <pre class="json-content" v-if="!isPayloadTooLarge">{{ formattedPayload }}</pre>
          <div v-else class="payload-too-large">
            <p>⚠️ Payload слишком большой для отображения ({{ formatBytes(payloadSize) }})</p>
            <p>Используйте кнопку "Копировать" для получения данных или экспортируйте логи.</p>
            <button @click="copyFullPayload" class="btn-copy-section">
              📋 Копировать payload
            </button>
          </div>
        </div>
      </div>

      <!-- Метаданные (если есть) -->
      <div v-if="log.metadata" class="details-section">
        <div class="section-header">
          <h4>Метаданные</h4>
          <div class="section-actions">
            <span v-if="metadataSize > MAX_DISPLAY_SIZE" class="size-warning">
              Большой JSON ({{ formatBytes(metadataSize) }})
            </span>
            <button 
              v-if="metadataSize > MAX_DISPLAY_SIZE && !showFullMetadata"
              @click="showFullMetadata = true"
              class="btn-show-more"
            >
              Показать полностью
            </button>
          </div>
        </div>
        <div class="json-container">
          <pre class="json-content" v-if="!isMetadataTooLarge">{{ formattedMetadata }}</pre>
          <div v-else class="payload-too-large">
            <p>⚠️ Metadata слишком большой для отображения ({{ formatBytes(metadataSize) }})</p>
            <p>Используйте экспорт для получения данных.</p>
          </div>
        </div>
      </div>
    </div>

    <div class="details-footer">
      <button @click="handleClose" class="btn-close-details">Закрыть</button>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { 
  isValidWebhookLogEntry,
  isValidEventDetails,
  normalizeWebhookLogEntry 
} from '@/types/webhook-logs.js';
import { 
  formatTimestamp as formatTimestampUtil,
  formatEventType,
  formatCategory,
  formatEventDetails 
} from '@/utils/webhook-formatters.js';

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
    const copySuccess = ref(false);
    const copyError = ref(null);
    const showFullPayload = ref(false);
    const showFullMetadata = ref(false);
    const MAX_DISPLAY_SIZE = 50000; // Максимальный размер для отображения (50KB)
    const MAX_SAFE_SIZE = 200000; // Максимальный безопасный размер (200KB) - больше не рендерим в DOM
    
    // Валидация и нормализация лога
    const validatedLog = computed(() => {
      if (!props.log) {
        return null;
      }
      
      const normalized = normalizeWebhookLogEntry(props.log);
      
      if (!isValidWebhookLogEntry(normalized)) {
        console.error('[WebhookLogDetails] Invalid log entry:', props.log);
        return null;
      }
      
      return normalized;
    });

    // Проверка валидности деталей
    const validatedDetails = computed(() => {
      if (!validatedLog.value || !validatedLog.value.details) {
        return null;
      }
      
      if (!isValidEventDetails(validatedLog.value.details)) {
        console.warn('[WebhookLogDetails] Invalid event details:', validatedLog.value.details);
        return null;
      }
      
      return validatedLog.value.details;
    });
    
    // Проверка, слишком ли большой payload для отображения
    const isPayloadTooLarge = computed(() => {
      return payloadSize.value > MAX_SAFE_SIZE;
    });
    
    // Проверка, слишком ли большой metadata для отображения
    const isMetadataTooLarge = computed(() => {
      return metadataSize.value > MAX_SAFE_SIZE;
    });
    
    // Копирование текста в буфер обмена
    const copyToClipboard = async (text) => {
      copySuccess.value = false;
      copyError.value = null;
      
      try {
        // Проверка поддержки Clipboard API
        if (!navigator.clipboard) {
          throw new Error('Clipboard API не поддерживается');
        }
        
        await navigator.clipboard.writeText(text);
        copySuccess.value = true;
        
        // Скрыть сообщение об успехе через 2 секунды
        setTimeout(() => {
          copySuccess.value = false;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        copyError.value = err.message;
        
        // Fallback для старых браузеров
        try {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          copySuccess.value = true;
          setTimeout(() => {
            copySuccess.value = false;
          }, 2000);
        } catch (fallbackErr) {
          copyError.value = 'Не удалось скопировать';
        }
      }
    };
    
    // Копирование всего JSON payload
    const copyFullPayload = () => {
      if (!validatedLog.value || !validatedLog.value.payload) {
        return;
      }
      try {
        const jsonString = JSON.stringify(validatedLog.value.payload, null, 2);
        copyToClipboard(jsonString);
      } catch (e) {
        console.error('[WebhookLogDetails] Error copying payload:', e);
        copyError.value = 'Ошибка при копировании payload';
      }
    };
    
    // Копирование конкретного поля
    const copyField = (key, value) => {
      try {
        const text = `${key}: ${typeof value === 'object' ? safeStringify(value, 2) : value}`;
        copyToClipboard(text);
      } catch (e) {
        console.error('[WebhookLogDetails] Error copying field:', e);
        copyError.value = 'Ошибка при копировании поля';
      }
    };
    
    // Основная информация для отображения
    const mainInfo = computed(() => {
      if (!validatedLog.value) {
        return {};
      }
      
      const log = validatedLog.value;
      
      return {
        timestamp: log.timestamp,
        event: log.event,
        category: log.category,
        ip: log.ip || 'N/A'
      };
    });
    
    const formatTimestamp = (timestamp) => {
      if (!timestamp) return '—';
      return formatTimestampUtil(timestamp, 'long');
    };

    const getCategoryLabel = (category) => {
      if (!category) return '—';
      return formatCategory(category);
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
      const keyMap = {
        'timestamp': 'Дата и время',
        'event': 'Тип события',
        'category': 'Категория',
        'ip': 'IP адрес',
        'task_id': 'ID задачи',
        'task_title': 'Название задачи',
        'entity_id': 'ID сущности',
        'title': 'Название',
        'comment_text': 'Текст комментария'
      };
      
      return keyMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    };

    const formatValue = (value) => {
      if (value === null || value === undefined) {
        return 'N/A';
      }
      
      if (typeof value === 'boolean') {
        return value ? 'Да' : 'Нет';
      }
      
      if (typeof value === 'object') {
        // Для массивов
        if (Array.isArray(value)) {
          if (value.length === 0) {
            return 'Пусто';
          }
          return value.join(', ');
        }
        
        // Для объектов - форматируем как JSON
        try {
          return safeStringify(value, 2);
        } catch (e) {
          return '[Не удалось сериализовать]';
        }
      }
      
      return String(value);
    };

    // Мемоизация для оптимизации рендеринга (используем WeakMap для избежания утечек памяти)
    const formatJsonMemo = new WeakMap();
    
    // Функция для безопасного JSON.stringify с защитой от циклических ссылок
    const safeStringify = (obj, space = 2) => {
      const seen = new WeakSet();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      }, space);
    };
    
    const formatJson = (obj, maxSize = null, showFull = false) => {
      if (!obj) return 'N/A';
      
      try {
        // Проверка кеша (используем сам объект как ключ через WeakMap)
        if (formatJsonMemo.has(obj) && !showFull) {
          const cached = formatJsonMemo.get(obj);
          if (cached.maxSize === maxSize && cached.showFull === showFull) {
            return cached.result;
          }
        }
        
        // Безопасное преобразование в JSON
        const jsonString = safeStringify(obj, 2);
        const size = new Blob([jsonString]).size;
        
        let result;
        if (maxSize && size > maxSize && !showFull) {
          // Обрезка большого JSON
          const truncated = jsonString.substring(0, maxSize);
          result = truncated + '\n\n... [JSON обрезан, нажмите "Показать полностью" для просмотра]';
        } else {
          result = jsonString;
        }
        
        // Кеширование (только для небольших объектов, чтобы не забивать память)
        if (size < 100000) { // Кешируем только объекты меньше 100KB
          formatJsonMemo.set(obj, {
            result,
            maxSize,
            showFull,
            size
          });
        }
        
        return result;
      } catch (e) {
        console.error('[WebhookLogDetails] Error formatting JSON:', e);
        return `[Ошибка форматирования JSON: ${e.message}]`;
      }
    };
    
    // Размеры JSON (с защитой от ошибок)
    const payloadSize = computed(() => {
      if (!validatedLog.value || !validatedLog.value.payload) {
        return 0;
      }
      
      try {
        const jsonString = JSON.stringify(validatedLog.value.payload);
        return new Blob([jsonString]).size;
      } catch (e) {
        console.error('[WebhookLogDetails] Error calculating payload size:', e);
        return 0;
      }
    });
    
    const metadataSize = computed(() => {
      if (!validatedLog.value?.metadata) return 0;
      try {
        const jsonString = safeStringify(validatedLog.value.metadata);
        return new Blob([jsonString]).size;
      } catch (e) {
        console.warn('[WebhookLogDetails] Error calculating metadata size:', e);
        return 0;
      }
    });
    
    // Форматированные JSON с ограничением размера (ленивое вычисление)
    const formattedPayload = computed(() => {
      if (!validatedLog.value || !validatedLog.value.payload) {
        return '{}';
      }
      
      // Если payload слишком большой, не форматируем его
      if (isPayloadTooLarge.value) {
        return '';
      }
      
      try {
        return JSON.stringify(validatedLog.value.payload, null, 2);
      } catch (e) {
        console.error('[WebhookLogDetails] Error formatting payload:', e);
        return '[Ошибка форматирования]';
      }
    });
    
    const formattedMetadata = computed(() => {
      if (!validatedLog.value?.metadata) return 'N/A';
      
      // Если metadata слишком большой, не форматируем его
      if (isMetadataTooLarge.value) {
        return '';
      }
      
      try {
        return formatJson(
          validatedLog.value.metadata, 
          showFullMetadata.value ? null : MAX_DISPLAY_SIZE,
          showFullMetadata.value
        );
      } catch (e) {
        console.error('[WebhookLogDetails] Error formatting metadata:', e);
        return '[Ошибка форматирования metadata]';
      }
    });
    
    // Форматирование байт
    const formatBytes = (bytes) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    
    // Сброс состояния при смене лога
    watch(() => props.log, (newLog) => {
      showFullPayload.value = false;
      showFullMetadata.value = false;
      
      if (newLog) {
        const normalized = normalizeWebhookLogEntry(newLog);
        if (!isValidWebhookLogEntry(normalized)) {
          console.error('[WebhookLogDetails] Invalid log entry received:', newLog);
          // Можно показать сообщение об ошибке пользователю
        }
      }
      // WeakMap очищается автоматически при удалении ссылок на объекты
    }, { immediate: true });

    const handleClose = () => {
      emit('close');
    };

    return {
      validatedLog,
      validatedDetails,
      copySuccess,
      copyError,
      copyToClipboard,
      copyFullPayload,
      copyField,
      mainInfo,
      formatTimestamp,
      getCategoryLabel,
      getCategoryClass,
      getEventClass,
      formatKey,
      formatValue,
      formatJson,
      formattedPayload,
      formattedMetadata,
      payloadSize,
      metadataSize,
      showFullPayload,
      showFullMetadata,
      MAX_DISPLAY_SIZE,
      isPayloadTooLarge,
      isMetadataTooLarge,
      formatBytes,
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

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
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

.btn-copy,
.btn-copy-section,
.btn-copy-field {
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.btn-copy:hover,
.btn-copy-section:hover,
.btn-copy-field:hover {
  background: #0056b3;
}

.btn-copy-field {
  padding: 4px 8px;
  font-size: 11px;
  margin-left: 8px;
}

.copy-success-message {
  background: #d4edda;
  color: #155724;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.copy-error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.info-value-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.size-warning {
  font-size: 12px;
  color: #ff9800;
  font-weight: 500;
}

.btn-show-more {
  padding: 6px 12px;
  background: #ff9800;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-show-more:hover {
  background: #f57c00;
}

.section-header h4 {
  margin: 0;
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

.payload-too-large {
  padding: 20px;
  text-align: center;
  color: #ff9800;
}

.payload-too-large p {
  margin-bottom: 10px;
}

</style>

