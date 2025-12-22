<template>
  <Transition name="slide-down">
    <div v-if="count > 0" class="new-logs-indicator">
      <div class="indicator-content">
        <span class="indicator-icon">🔔</span>
        <span class="indicator-text">
          {{ count }} {{ pluralize(count, 'новое событие', 'новых события', 'новых событий') }}
        </span>
        <div class="indicator-actions">
          <button @click="handleApply" class="btn-apply">
            Применить
          </button>
          <button @click="handleDismiss" class="btn-dismiss">
            ✕
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script>
import { computed } from 'vue';
import { 
  isValidWebhookLogEntry,
  normalizeWebhookLogEntry 
} from '@/types/webhook-logs.js';
import { 
  formatEventType,
  formatCategory 
} from '@/utils/webhook-formatters.js';

export default {
  name: 'NewLogsIndicator',
  props: {
    count: {
      type: Number,
      default: 0
    },
    newLogs: {
      type: Array,
      default: () => []
    }
  },
  emits: ['apply', 'dismiss'],
  setup(props, { emit }) {
    const pluralize = (count, one, few, many) => {
      const mod10 = count % 10;
      const mod100 = count % 100;
      
      if (mod100 >= 11 && mod100 <= 19) {
        return many;
      }
      if (mod10 === 1) {
        return one;
      }
      if (mod10 >= 2 && mod10 <= 4) {
        return few;
      }
      return many;
    };

    // Превью новых логов
    const newLogsPreview = computed(() => {
      if (!props.newLogs || !Array.isArray(props.newLogs) || props.newLogs.length === 0) {
        return [];
      }
      
      // Нормализация и валидация новых логов
      const normalizedLogs = props.newLogs
        .map(log => normalizeWebhookLogEntry(log))
        .filter(log => isValidWebhookLogEntry(log))
        .slice(0, 5); // Показываем только первые 5 для превью
      
      return normalizedLogs.map(log => ({
        ...log,
        formatted: {
          event: formatEventType(log.event),
          category: formatCategory(log.category)
        }
      }));
    });

    const handleApply = () => {
      if (!props.newLogs || props.newLogs.length === 0) {
        return;
      }
      
      // Валидация новых логов перед применением
      const validLogs = props.newLogs
        .map(log => normalizeWebhookLogEntry(log))
        .filter(log => isValidWebhookLogEntry(log));
      
      if (validLogs.length === 0) {
        console.warn('[NewLogsIndicator] No valid logs to apply');
        return;
      }
      
      emit('apply', validLogs);
    };

    const handleDismiss = () => {
      emit('dismiss');
    };

    return {
      pluralize,
      newLogsPreview,
      handleApply,
      handleDismiss
    };
  }
};
</script>

<style scoped>
.new-logs-indicator {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #2196F3;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  min-width: 300px;
  max-width: 400px;
}

.indicator-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.indicator-icon {
  font-size: 20px;
}

.indicator-text {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}

.indicator-actions {
  display: flex;
  gap: 8px;
}

.btn-apply,
.btn-dismiss {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-apply {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.btn-apply:hover {
  background: rgba(255, 255, 255, 0.3);
}

.btn-dismiss {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  padding: 6px 8px;
}

.btn-dismiss:hover {
  background: rgba(255, 255, 255, 0.2);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

@media (max-width: 768px) {
  .new-logs-indicator {
    left: 20px;
    right: 20px;
    min-width: auto;
    max-width: 100%;
  }
}
</style>

