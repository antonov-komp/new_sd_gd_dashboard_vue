<template>
  <div class="realtime-controls">
    <label class="control-toggle">
      <input
        type="checkbox"
        v-model="localEnabled"
        @change="handleToggle"
        :disabled="isConnecting"
      />
      <span class="toggle-label">Автообновление</span>
    </label>
    
    <div class="status-indicator" :class="statusClass">
      <span class="status-dot"></span>
      <span class="status-text">{{ statusText }}</span>
    </div>
    
    <div v-if="hasError" class="error-message">
      ⚠️ {{ error }}
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue';

export default {
  name: 'RealtimeControls',
  props: {
    enabled: {
      type: Boolean,
      default: false
    },
    connectionState: {
      type: String,
      default: 'disconnected'
    },
    error: {
      type: String,
      default: null
    }
  },
  emits: ['toggle'],
  setup(props, { emit }) {
    const localEnabled = ref(props.enabled);
    
    // Синхронизация с props
    watch(() => props.enabled, (newValue) => {
      localEnabled.value = newValue;
    });
    
    const isConnecting = computed(() => props.connectionState === 'connecting');
    const hasError = computed(() => !!props.error);

    const statusClass = computed(() => {
      return {
        'status-connected': props.connectionState === 'connected',
        'status-connecting': props.connectionState === 'connecting',
        'status-disconnected': props.connectionState === 'disconnected',
        'status-error': props.connectionState === 'error'
      };
    });

    const statusText = computed(() => {
      const texts = {
        'connected': 'Подключено',
        'connecting': 'Подключение...',
        'disconnected': 'Отключено',
        'error': 'Ошибка'
      };
      return texts[props.connectionState] || 'Неизвестно';
    });

    const handleToggle = () => {
      emit('toggle', localEnabled.value);
    };

    return {
      localEnabled,
      isConnecting,
      hasError,
      statusClass,
      statusText,
      handleToggle
    };
  }
};
</script>

<style scoped>
.realtime-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  flex-wrap: wrap;
}

.control-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.toggle-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
  transition: background 0.3s;
}

.status-connected .status-dot {
  background: #28a745;
  animation: pulse 2s infinite;
}

.status-connecting .status-dot {
  background: #ffc107;
  animation: pulse 1s infinite;
}

.status-error .status-dot {
  background: #dc3545;
}

.status-text {
  font-size: 13px;
  color: #666;
}

.error-message {
  font-size: 12px;
  color: #dc3545;
  padding: 4px 8px;
  background: #ffebee;
  border-radius: 4px;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>

