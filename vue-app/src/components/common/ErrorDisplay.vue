<template>
  <div class="error-display" :class="`error-${severity}`">
    <div class="error-icon">
      {{ severity === 'critical' ? '🚨' : '⚠️' }}
    </div>
    <div class="error-content">
      <h4 class="error-title">{{ title }}</h4>
      <p class="error-message">{{ message }}</p>
      <div v-if="details && showDetails" class="error-details">
        <pre>{{ details }}</pre>
      </div>
      <div class="error-actions">
        <button 
          v-if="retryable"
          @click="$emit('retry')"
          class="btn-retry"
        >
          🔄 Повторить
        </button>
        <button 
          v-if="details"
          @click="showDetails = !showDetails"
          class="btn-details"
        >
          {{ showDetails ? 'Скрыть' : 'Показать' }} детали
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'ErrorDisplay',
  props: {
    title: {
      type: String,
      default: 'Произошла ошибка'
    },
    message: {
      type: String,
      required: true
    },
    details: {
      type: String,
      default: null
    },
    severity: {
      type: String,
      default: 'error',
      validator: (v) => ['error', 'warning', 'critical'].includes(v)
    },
    retryable: {
      type: Boolean,
      default: false
    }
  },
  emits: ['retry'],
  setup() {
    const showDetails = ref(false);
    return { showDetails };
  }
};
</script>

<style scoped>
.error-display {
  padding: 20px;
  border-radius: 8px;
  display: flex;
  gap: 16px;
  margin: 20px 0;
}

.error-error {
  background: #ffebee;
  border-left: 4px solid #dc3545;
}

.error-warning {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
}

.error-critical {
  background: #f8d7da;
  border-left: 4px solid #dc3545;
}

.error-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.error-content {
  flex: 1;
}

.error-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.error-message {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
}

.error-details {
  margin-top: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  overflow-x: auto;
}

.error-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.btn-retry,
.btn-details {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-retry {
  background: #2196F3;
  color: white;
}

.btn-retry:hover {
  background: #1976d2;
}

.btn-details {
  background: #f5f5f5;
  color: #333;
}

.btn-details:hover {
  background: #e0e0e0;
}
</style>

