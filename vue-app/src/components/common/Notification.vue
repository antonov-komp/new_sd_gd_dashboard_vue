<template>
  <div 
    :class="['notification', `notification-${notification.type}`]"
    @click="handleClick"
  >
    <div class="notification-content">
      <span class="notification-icon">{{ icon }}</span>
      <span class="notification-message">{{ notification.message }}</span>
    </div>
    <button @click.stop="close" class="notification-close">✕</button>
    <div v-if="showProgress" class="notification-progress">
      <div 
        class="progress-bar" 
        :style="{ width: `${progress}%` }"
      ></div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';

export default {
  name: 'Notification',
  props: {
    notification: {
      type: Object,
      required: true
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const progress = ref(100);
    const showProgress = computed(() => props.notification.duration > 0);
    let progressInterval = null;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const icon = computed(() => icons[props.notification.type] || 'ℹ️');

    const close = () => {
      emit('close');
    };

    const handleClick = () => {
      // При клике можно закрыть уведомление или выполнить действие
      if (props.notification.onClick) {
        props.notification.onClick();
      }
    };

    onMounted(() => {
      if (showProgress.value && props.notification.duration > 0) {
        const startTime = Date.now();
        const duration = props.notification.duration;
        
        progressInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          progress.value = Math.max(0, 100 - (elapsed / duration) * 100);
          
          if (progress.value <= 0) {
            clearInterval(progressInterval);
            close();
          }
        }, 50);
      }
    });

    onUnmounted(() => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    });

    return {
      icon,
      progress,
      showProgress,
      close,
      handleClick
    };
  }
};
</script>

<style scoped>
.notification {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 300px;
  max-width: 400px;
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  border-left: 4px solid;
  transition: all 0.3s;
}

.notification:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.notification-success {
  border-left-color: #28a745;
}

.notification-error {
  border-left-color: #dc3545;
}

.notification-warning {
  border-left-color: #ffc107;
}

.notification-info {
  border-left-color: #2196F3;
}

.notification-content {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.notification-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.notification-message {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
}

.notification-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 4px;
  transition: all 0.2s;
}

.notification-close:hover {
  background: #f5f5f5;
  color: #666;
}

.notification-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(0, 0, 0, 0.1);
}

.progress-bar {
  height: 100%;
  background: currentColor;
  transition: width 0.1s linear;
}

.notification-success .progress-bar {
  background: #28a745;
}

.notification-error .progress-bar {
  background: #dc3545;
}

.notification-warning .progress-bar {
  background: #ffc107;
}

.notification-info .progress-bar {
  background: #2196F3;
}
</style>

