# TASK-017-06: Улучшение UX

**Дата создания:** 2025-12-07 05:25 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-017](./TASK-017-webhook-logs-ui-implementation-plan.md)

---

## 📋 Описание

Улучшить пользовательский опыт: добавить скелетоны загрузки, плавные анимации, уведомления, улучшить обработку ошибок, добавить пустые состояния, реализовать подтверждения для критических действий.

---

## 🎯 Контекст

Этап 6 из глобального плана TASK-017. Необходимо сделать интерфейс более отзывчивым и понятным для пользователей.

---

## 📁 Модули и компоненты

- `vue-app/src/components/common/LoadingSkeleton.vue` — компонент скелетона
- `vue-app/src/components/common/EmptyState.vue` — компонент пустого состояния
- `vue-app/src/components/common/Notification.vue` — компонент уведомлений
- `vue-app/src/components/webhooks/` — обновление существующих компонентов

---

## 🔗 Зависимости

**От других задач:**
- **TASK-017-02** — базовые компоненты должны работать

---

## 📝 Ступенчатые подзадачи

### 1. Скелетоны загрузки

1.1. Создать компонент `LoadingSkeleton.vue`
1.2. Заменить спиннеры на скелетоны в списке логов
1.3. Добавить скелетоны для статистики
1.4. Добавить скелетоны для графиков

### 2. Анимации

2.1. Добавить плавные переходы при загрузке данных
2.2. Добавить анимации появления элементов
2.3. Добавить анимации при изменении фильтров
2.4. Оптимизировать производительность анимаций

### 3. Уведомления

3.1. Создать компонент уведомлений
3.2. Добавить уведомления об успешных операциях
3.3. Добавить уведомления об ошибках
4.4. Добавить автоскрытие уведомлений

### 4. Обработка ошибок

4.1. Улучшить сообщения об ошибках
4.2. Добавить кнопку "Повторить" при ошибках
4.3. Добавить детальную информацию об ошибке (для разработчиков)
4.4. Логировать ошибки в консоль

### 5. Пустые состояния

5.1. Создать компонент `EmptyState.vue`
5.2. Добавить пустое состояние для "нет логов"
5.3. Добавить пустое состояние для "нет результатов поиска"
5.4. Добавить подсказки в пустых состояниях

### 6. Подтверждения

6.1. Добавить подтверждение для экспорта больших объёмов данных
6.2. Добавить подтверждение для сброса фильтров (если есть несохранённые изменения)

---

## ⚙️ Технические требования

### 1. Компонент скелетона (`vue-app/src/components/common/LoadingSkeleton.vue`)

Универсальный компонент скелетона с различными вариантами:

```vue
<template>
  <div 
    class="skeleton" 
    :class="[`skeleton-${variant}`, { 'skeleton-animated': animated }]"
    :style="skeletonStyle"
  >
    <div v-if="animated" class="skeleton-shimmer"></div>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'LoadingSkeleton',
  props: {
    width: {
      type: [String, Number],
      default: '100%'
    },
    height: {
      type: [String, Number],
      default: '20px'
    },
    variant: {
      type: String,
      default: 'rect',
      validator: (v) => ['rect', 'circle', 'text', 'table-row'].includes(v)
    },
    animated: {
      type: Boolean,
      default: true
    },
    borderRadius: {
      type: String,
      default: null
    }
  },
  setup(props) {
    const skeletonStyle = computed(() => {
      const style = {
        width: typeof props.width === 'number' ? `${props.width}px` : props.width,
        height: typeof props.height === 'number' ? `${props.height}px` : props.height
      };
      
      if (props.borderRadius) {
        style.borderRadius = props.borderRadius;
      }
      
      return style;
    });

    return {
      skeletonStyle
    };
  }
};
</script>

<style scoped>
.skeleton {
  background: #f0f0f0;
  position: relative;
  overflow: hidden;
}

.skeleton-rect {
  border-radius: 4px;
}

.skeleton-circle {
  border-radius: 50%;
  aspect-ratio: 1;
}

.skeleton-text {
  border-radius: 4px;
  height: 16px;
}

.skeleton-table-row {
  border-radius: 0;
  height: 48px;
  margin-bottom: 1px;
}

.skeleton-animated {
  background: linear-gradient(
    90deg,
    #f0f0f0 0%,
    #f0f0f0 40%,
    #e0e0e0 50%,
    #f0f0f0 60%,
    #f0f0f0 100%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.6),
    transparent
  );
  animation: shimmer 1.5s infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}
</style>
```

### 2. Компонент скелетона для списка логов

Специализированный компонент для таблицы логов:

```vue
<template>
  <div class="skeleton-log-list">
    <div class="skeleton-table-header">
      <LoadingSkeleton 
        v-for="i in 6" 
        :key="i"
        width="120px"
        height="16px"
        variant="text"
      />
    </div>
    <div 
      v-for="i in rows" 
      :key="i"
      class="skeleton-table-row"
    >
      <LoadingSkeleton 
        v-for="j in 6" 
        :key="j"
        width="100%"
        height="20px"
        variant="text"
        :style="{ width: getColumnWidth(j) }"
      />
    </div>
  </div>
</template>

<script>
import LoadingSkeleton from './LoadingSkeleton.vue';

export default {
  name: 'SkeletonLogList',
  components: {
    LoadingSkeleton
  },
  props: {
    rows: {
      type: Number,
      default: 5
    }
  },
  setup() {
    const getColumnWidth = (index) => {
      const widths = ['15%', '20%', '15%', '15%', '20%', '15%'];
      return widths[index - 1] || '100%';
    };

    return {
      getColumnWidth
    };
  }
};
</script>

<style scoped>
.skeleton-log-list {
  padding: 20px;
}

.skeleton-table-header {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 8px;
}

.skeleton-table-row {
  display: flex;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  background: white;
  border-radius: 4px;
}
</style>
```

### 3. Компонент пустого состояния (`vue-app/src/components/common/EmptyState.vue`)

Универсальный компонент для отображения пустых состояний:

```vue
<template>
  <div class="empty-state" :class="`empty-state-${variant}`">
    <div class="empty-icon">{{ icon }}</div>
    <h3 class="empty-title">{{ title }}</h3>
    <p class="empty-description">{{ description }}</p>
    <div v-if="hints && hints.length > 0" class="empty-hints">
      <div 
        v-for="(hint, index) in hints" 
        :key="index"
        class="hint-item"
      >
        💡 {{ hint }}
      </div>
    </div>
    <div v-if="actionLabel || actions" class="empty-actions">
      <button 
        v-if="actionLabel"
        @click="$emit('action')" 
        class="btn-primary"
      >
        {{ actionLabel }}
      </button>
      <button
        v-for="(action, index) in actions"
        :key="index"
        @click="$emit('action-click', action.id)"
        :class="['btn', `btn-${action.variant || 'secondary'}`]"
      >
        {{ action.label }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EmptyState',
  props: {
    icon: {
      type: String,
      default: '📭'
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    actionLabel: {
      type: String,
      default: null
    },
    actions: {
      type: Array,
      default: null
    },
    hints: {
      type: Array,
      default: () => []
    },
    variant: {
      type: String,
      default: 'default',
      validator: (v) => ['default', 'error', 'warning', 'info'].includes(v)
    }
  },
  emits: ['action', 'action-click']
};
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  min-height: 300px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.6;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px 0;
}

.empty-description {
  font-size: 14px;
  color: #666;
  margin: 0 0 24px 0;
  max-width: 400px;
}

.empty-hints {
  margin: 20px 0;
  text-align: left;
  max-width: 400px;
}

.hint-item {
  font-size: 13px;
  color: #666;
  margin: 8px 0;
  padding: 8px 12px;
  background: #f9f9f9;
  border-radius: 4px;
}

.empty-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #2196F3;
  color: white;
}

.btn-primary:hover {
  background: #1976d2;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.empty-state-error .empty-icon {
  color: #dc3545;
}

.empty-state-warning .empty-icon {
  color: #ffc107;
}

.empty-state-info .empty-icon {
  color: #2196F3;
}
</style>
```

### 4. Система уведомлений (`vue-app/src/composables/useNotifications.js`)

Composable для управления уведомлениями:

```javascript
import { ref } from 'vue';

const notifications = ref([]);
let notificationIdCounter = 0;

/**
 * Composable для управления уведомлениями
 */
export function useNotifications() {
  /**
   * Показать уведомление
   * 
   * @param {string} message Текст уведомления
   * @param {string} type Тип (success, error, warning, info)
   * @param {number} duration Длительность в мс (0 = не скрывать автоматически)
   * @returns {number} ID уведомления
   */
  const showNotification = (message, type = 'info', duration = 3000) => {
    const id = ++notificationIdCounter;
    const notification = {
      id,
      message,
      type,
      duration,
      timestamp: Date.now()
    };

    notifications.value.push(notification);

    // Автоматическое скрытие
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  };

  /**
   * Удалить уведомление
   * 
   * @param {number} id ID уведомления
   */
  const removeNotification = (id) => {
    const index = notifications.value.findIndex(n => n.id === id);
    if (index > -1) {
      notifications.value.splice(index, 1);
    }
  };

  /**
   * Очистить все уведомления
   */
  const clearNotifications = () => {
    notifications.value = [];
  };

  /**
   * Успешное уведомление
   */
  const success = (message, duration = 3000) => {
    return showNotification(message, 'success', duration);
  };

  /**
   * Уведомление об ошибке
   */
  const error = (message, duration = 5000) => {
    return showNotification(message, 'error', duration);
  };

  /**
   * Предупреждение
   */
  const warning = (message, duration = 4000) => {
    return showNotification(message, 'warning', duration);
  };

  /**
   * Информационное уведомление
   */
  const info = (message, duration = 3000) => {
    return showNotification(message, 'info', duration);
  };

  return {
    notifications,
    showNotification,
    removeNotification,
    clearNotifications,
    success,
    error,
    warning,
    info
  };
}
```

### 5. Компонент уведомлений (`vue-app/src/components/common/NotificationContainer.vue`)

Контейнер для отображения уведомлений:

```vue
<template>
  <Teleport to="body">
    <div class="notification-container">
      <TransitionGroup name="notification" tag="div">
        <Notification
          v-for="notification in notifications"
          :key="notification.id"
          :notification="notification"
          @close="removeNotification(notification.id)"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script>
import { computed } from 'vue';
import { useNotifications } from '@/composables/useNotifications.js';
import Notification from './Notification.vue';

export default {
  name: 'NotificationContainer',
  components: {
    Notification
  },
  setup() {
    const { notifications, removeNotification } = useNotifications();

    return {
      notifications,
      removeNotification
    };
  }
};
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
  pointer-events: none;
}

.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@media (max-width: 768px) {
  .notification-container {
    left: 20px;
    right: 20px;
    max-width: 100%;
  }
}
</style>
```

### 6. Компонент отдельного уведомления (`vue-app/src/components/common/Notification.vue`)

```vue
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

    const icon = computed(() => icons[props.notification.type] || 'info']);

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
```

### 7. Анимации и переходы

Глобальные CSS анимации для плавных переходов:

```css
/* vue-app/src/styles/animations.css */

/* Fade переходы */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide переходы */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Scale переходы */
.scale-enter-active,
.scale-leave-active {
  transition: all 0.3s ease;
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* List переходы для списков */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.list-move {
  transition: transform 0.3s ease;
}
```

Использование в компонентах:

```vue
<template>
  <Transition name="fade">
    <div v-if="visible">Контент</div>
  </Transition>

  <TransitionGroup name="list" tag="div">
    <div v-for="item in items" :key="item.id">
      {{ item.name }}
    </div>
  </TransitionGroup>
</template>
```

### 8. Улучшенная обработка ошибок

Компонент для отображения ошибок с возможностью повтора:

```vue
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
```

### 9. Компонент подтверждения

Модальное окно для подтверждения критических действий:

```vue
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="confirm-overlay" @click="handleOverlayClick">
        <div class="confirm-modal" @click.stop>
          <div class="confirm-header">
            <h3>{{ title }}</h3>
            <button @click="cancel" class="btn-close">✕</button>
          </div>
          <div class="confirm-body">
            <p>{{ message }}</p>
            <div v-if="details" class="confirm-details">
              {{ details }}
            </div>
          </div>
          <div class="confirm-footer">
            <button @click="confirm" class="btn-confirm" :class="`btn-${variant}`">
              {{ confirmLabel }}
            </button>
            <button @click="cancel" class="btn-cancel">
              {{ cancelLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
export default {
  name: 'ConfirmDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: 'Подтверждение'
    },
    message: {
      type: String,
      required: true
    },
    details: {
      type: String,
      default: null
    },
    confirmLabel: {
      type: String,
      default: 'Подтвердить'
    },
    cancelLabel: {
      type: String,
      default: 'Отмена'
    },
    variant: {
      type: String,
      default: 'primary',
      validator: (v) => ['primary', 'danger', 'warning'].includes(v)
    },
    closeOnOverlay: {
      type: Boolean,
      default: true
    }
  },
  emits: ['confirm', 'cancel', 'update:visible'],
  setup(props, { emit }) {
    const confirm = () => {
      emit('confirm');
      emit('update:visible', false);
    };

    const cancel = () => {
      emit('cancel');
      emit('update:visible', false);
    };

    const handleOverlayClick = () => {
      if (props.closeOnOverlay) {
        cancel();
      }
    };

    return {
      confirm,
      cancel,
      handleOverlayClick
    };
  }
};
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.confirm-modal {
  background: white;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.confirm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.confirm-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
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
  background: #f5f5f5;
}

.confirm-body {
  padding: 20px;
}

.confirm-body p {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
  line-height: 1.5;
}

.confirm-details {
  margin-top: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
}

.confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #eee;
}

.btn-confirm,
.btn-cancel {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-confirm {
  color: white;
}

.btn-primary {
  background: #2196F3;
}

.btn-primary:hover {
  background: #1976d2;
}

.btn-danger {
  background: #dc3545;
}

.btn-danger:hover {
  background: #c82333;
}

.btn-warning {
  background: #ffc107;
  color: #333;
}

.btn-warning:hover {
  background: #e0a800;
}

.btn-cancel {
  background: #f5f5f5;
  color: #333;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
```

### 10. Composable для подтверждений

```javascript
// vue-app/src/composables/useConfirm.js
import { ref } from 'vue';

const confirmState = ref({
  visible: false,
  title: '',
  message: '',
  details: null,
  variant: 'primary',
  onConfirm: null,
  onCancel: null
});

export function useConfirm() {
  const showConfirm = (options) => {
    return new Promise((resolve, reject) => {
      confirmState.value = {
        visible: true,
        title: options.title || 'Подтверждение',
        message: options.message,
        details: options.details || null,
        variant: options.variant || 'primary',
        confirmLabel: options.confirmLabel || 'Подтвердить',
        cancelLabel: options.cancelLabel || 'Отмена',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      };
    });
  };

  return {
    confirmState,
    showConfirm
  };
}
```

### 11. Интеграция компонентов в WebhookLogsPage

Пример интеграции всех компонентов UX:

```vue
<template>
  <div class="webhook-logs-page">
    <!-- ... существующий код ... -->

    <!-- Скелетоны при загрузке -->
    <SkeletonLogList v-if="loading && logs.length === 0" :rows="5" />

    <!-- Список логов с анимацией -->
    <Transition name="fade">
      <WebhookLogList
        v-if="!loading && logs.length > 0"
        :logs="logs"
        :loading="loading"
        :error="error"
        :pagination="pagination"
        @select-log="handleLogSelect"
        @page-change="handlePageChange"
      />
    </Transition>

    <!-- Пустое состояние -->
    <Transition name="fade">
      <EmptyState
        v-if="!loading && logs.length === 0 && !error"
        icon="📭"
        title="Логи не найдены"
        description="Попробуйте изменить фильтры или выбрать другой период"
        :hints="[
          'Проверьте фильтры по категории и типу события',
          'Убедитесь, что выбран правильный период',
          'Попробуйте очистить все фильтры'
        ]"
        action-label="Очистить фильтры"
        @action="handleFiltersReset"
      />
    </Transition>

    <!-- Ошибка с возможностью повтора -->
    <Transition name="fade">
      <ErrorDisplay
        v-if="error"
        :title="'Ошибка загрузки логов'"
        :message="error"
        :retryable="true"
        @retry="loadLogs"
      />
    </Transition>

    <!-- Контейнер уведомлений -->
    <NotificationContainer />

    <!-- Диалог подтверждения -->
    <ConfirmDialog
      v-model:visible="confirmState.visible"
      :title="confirmState.title"
      :message="confirmState.message"
      :details="confirmState.details"
      :variant="confirmState.variant"
      :confirm-label="confirmState.confirmLabel"
      :cancel-label="confirmState.cancelLabel"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
// ... существующие импорты ...
import SkeletonLogList from '@/components/common/SkeletonLogList.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ErrorDisplay from '@/components/common/ErrorDisplay.vue';
import NotificationContainer from '@/components/common/NotificationContainer.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { useNotifications } from '@/composables/useNotifications.js';
import { useConfirm } from '@/composables/useConfirm.js';

export default {
  name: 'WebhookLogsPage',
  components: {
    // ... существующие компоненты ...
    SkeletonLogList,
    EmptyState,
    ErrorDisplay,
    NotificationContainer,
    ConfirmDialog
  },
  setup() {
    // ... существующий код ...
    const { success, error: showError, info } = useNotifications();
    const { confirmState, showConfirm } = useConfirm();

    // Загрузка логов с обработкой ошибок
    const loadLogs = async () => {
      loading.value = true;
      error.value = null;
      
      try {
        const result = await WebhookLogsApiService.getLogs(filters.value, pagination.value);
        logs.value = result.logs;
        pagination.value = result.pagination;
      } catch (err) {
        error.value = err.message || 'Ошибка загрузки логов';
        showError('Не удалось загрузить логи. Попробуйте обновить страницу.');
      } finally {
        loading.value = false;
      }
    };

    // Подтверждение для критических действий
    const handleExportLargeData = async () => {
      if (logs.value.length > 10000) {
        const confirmed = await showConfirm({
          title: 'Экспорт большого объёма данных',
          message: `Вы собираетесь экспортировать ${logs.value.length} записей. Это может занять некоторое время.`,
          details: `Примерный размер файла: ${estimatedSize} MB`,
          variant: 'warning',
          confirmLabel: 'Продолжить',
          cancelLabel: 'Отмена'
        });

        if (!confirmed) {
          return;
        }
      }

      // Выполнение экспорта
      // ...
    };

    const handleConfirm = () => {
      if (confirmState.value.onConfirm) {
        confirmState.value.onConfirm();
      }
    };

    const handleCancel = () => {
      if (confirmState.value.onCancel) {
        confirmState.value.onCancel();
      }
    };

    return {
      // ... существующие возвраты ...
      confirmState,
      loadLogs,
      handleExportLargeData,
      handleConfirm,
      handleCancel
    };
  }
};
</script>
```

---

## 🔧 Troubleshooting

### Проблема 1: Скелетоны не отображаются при загрузке

**Симптомы:** Вместо скелетонов показывается пустой экран или спиннер.

**Решение:**
- Убедитесь, что условие `loading && logs.length === 0` корректно
- Проверьте, что компонент `SkeletonLogList` импортирован и зарегистрирован
- Убедитесь, что анимация скелетона включена (`animated: true`)

**Код:**
```vue
<SkeletonLogList v-if="loading && logs.length === 0" :rows="5" />
```

---

### Проблема 2: Уведомления не появляются

**Симптомы:** Вызов `showNotification()` не отображает уведомление.

**Решение:**
- Убедитесь, что `NotificationContainer` добавлен в корневой компонент
- Проверьте, что composable `useNotifications` используется правильно
- Убедитесь, что `Teleport` работает корректно (Vue 3)

**Код:**
```vue
<!-- В App.vue или корневом компоненте -->
<NotificationContainer />
```

---

### Проблема 3: Анимации тормозят интерфейс

**Симптомы:** При анимациях интерфейс лагает, особенно на мобильных устройствах.

**Решение:**
- Используйте `will-change` для оптимизации
- Ограничьте количество одновременно анимируемых элементов
- Используйте `transform` и `opacity` вместо изменения размеров/позиций

**Код:**
```css
.animated-element {
  will-change: transform, opacity;
  transform: translateZ(0); /* Аппаратное ускорение */
}
```

---

### Проблема 4: Пустые состояния не отображаются

**Симптомы:** При отсутствии данных не показывается компонент `EmptyState`.

**Решение:**
- Проверьте условия отображения: `!loading && logs.length === 0 && !error`
- Убедитесь, что компонент импортирован и зарегистрирован
- Проверьте, что `error` не установлен в значение, которое блокирует отображение

**Код:**
```vue
<EmptyState
  v-if="!loading && logs.length === 0 && !error"
  title="Логи не найдены"
  description="Попробуйте изменить фильтры"
/>
```

---

### Проблема 5: Подтверждения не работают

**Симптомы:** Диалог подтверждения не открывается или не закрывается.

**Решение:**
- Убедитесь, что используется `v-model:visible` для двусторонней привязки
- Проверьте, что `Teleport` работает корректно
- Убедитесь, что обработчики `@confirm` и `@cancel` правильно подключены

**Код:**
```vue
<ConfirmDialog
  v-model:visible="confirmState.visible"
  @confirm="handleConfirm"
  @cancel="handleCancel"
/>
```

---

### Проблема 6: Уведомления накладываются друг на друга

**Симптомы:** Несколько уведомлений отображаются в одном месте, перекрывая друг друга.

**Решение:**
- Используйте `TransitionGroup` для правильного позиционирования
- Добавьте `gap` между уведомлениями
- Ограничьте максимальное количество одновременно отображаемых уведомлений

**Код:**
```vue
<TransitionGroup name="notification" tag="div" class="notification-container">
  <Notification
    v-for="notification in notifications.slice(0, 5)"
    :key="notification.id"
    :notification="notification"
  />
</TransitionGroup>
```

---

## ✅ Критерии приёмки

### Функциональные требования

- [ ] Скелетоны загрузки отображаются вместо спиннеров
- [ ] Скелетоны имеют плавную анимацию shimmer
- [ ] Анимации плавные и не замедляют работу интерфейса
- [ ] Уведомления отображаются корректно в правом верхнем углу
- [ ] Уведомления автоматически скрываются через заданное время
- [ ] Уведомления можно закрыть вручную
- [ ] Прогресс-бар в уведомлениях работает корректно
- [ ] Сообщения об ошибках понятны пользователю
- [ ] Кнопка "Повторить" работает при ошибках
- [ ] Детали ошибок можно показать/скрыть
- [ ] Пустые состояния отображаются корректно с подсказками
- [ ] Подтверждения работают для критических действий
- [ ] Диалоги подтверждения можно закрыть по клику на overlay
- [ ] Все компоненты адаптивны для мобильных устройств

### UI/UX требования

- [ ] Переходы между состояниями плавные (fade, slide, scale)
- [ ] Скелетоны соответствуют структуре реального контента
- [ ] Уведомления не перекрывают важные элементы интерфейса
- [ ] Пустые состояния содержат полезные подсказки
- [ ] Ошибки отображаются с понятными сообщениями
- [ ] Подтверждения имеют понятные варианты действий
- [ ] Все интерактивные элементы имеют hover-эффекты

### Технические требования

- [ ] Производительность не ухудшена (60 FPS при анимациях)
- [ ] Нет утечек памяти (правильная очистка таймеров)
- [ ] Код соответствует стандартам проекта
- [ ] Все компоненты переиспользуемы
- [ ] Composable'ы правильно структурированы
- [ ] Поддержка всех современных браузеров
- [ ] Анимации оптимизированы (используют transform/opacity)

---

## 📋 Чек-лист выполнения

### Этап 1: Создание компонентов скелетонов

- [ ] Создать файл `vue-app/src/components/common/LoadingSkeleton.vue`
- [ ] Реализовать базовый компонент скелетона с вариантами (rect, circle, text)
- [ ] Добавить анимацию shimmer
- [ ] Создать файл `vue-app/src/components/common/SkeletonLogList.vue`
- [ ] Реализовать скелетон для таблицы логов
- [ ] Добавить стили для скелетонов
- [ ] Протестировать отображение скелетонов

### Этап 2: Создание системы уведомлений

- [ ] Создать файл `vue-app/src/composables/useNotifications.js`
- [ ] Реализовать функции показа уведомлений (success, error, warning, info)
- [ ] Создать файл `vue-app/src/components/common/Notification.vue`
- [ ] Реализовать компонент отдельного уведомления с прогресс-баром
- [ ] Создать файл `vue-app/src/components/common/NotificationContainer.vue`
- [ ] Реализовать контейнер с TransitionGroup
- [ ] Добавить стили для уведомлений
- [ ] Протестировать систему уведомлений

### Этап 3: Создание компонентов пустых состояний

- [ ] Создать файл `vue-app/src/components/common/EmptyState.vue`
- [ ] Реализовать компонент с поддержкой вариантов (default, error, warning, info)
- [ ] Добавить поддержку подсказок (hints)
- [ ] Добавить поддержку множественных действий
- [ ] Добавить стили для пустых состояний
- [ ] Протестировать отображение пустых состояний

### Этап 4: Улучшенная обработка ошибок

- [ ] Создать файл `vue-app/src/components/common/ErrorDisplay.vue`
- [ ] Реализовать компонент с поддержкой уровней ошибок
- [ ] Добавить возможность показа/скрытия деталей
- [ ] Добавить кнопку "Повторить" для повторных попыток
- [ ] Добавить стили для ошибок
- [ ] Протестировать отображение ошибок

### Этап 5: Система подтверждений

- [ ] Создать файл `vue-app/src/composables/useConfirm.js`
- [ ] Реализовать composable для управления подтверждениями
- [ ] Создать файл `vue-app/src/components/common/ConfirmDialog.vue`
- [ ] Реализовать модальное окно подтверждения
- [ ] Добавить поддержку вариантов (primary, danger, warning)
- [ ] Добавить стили для диалогов
- [ ] Протестировать систему подтверждений

### Этап 6: Анимации и переходы

- [ ] Создать файл `vue-app/src/styles/animations.css`
- [ ] Реализовать глобальные CSS анимации (fade, slide, scale, list)
- [ ] Добавить анимации в существующие компоненты
- [ ] Оптимизировать анимации для производительности
- [ ] Протестировать анимации на разных устройствах

### Этап 7: Интеграция в WebhookLogsPage

- [ ] Импортировать все новые компоненты в `WebhookLogsPage.vue`
- [ ] Заменить спиннеры на скелетоны
- [ ] Добавить пустые состояния для различных сценариев
- [ ] Интегрировать систему уведомлений
- [ ] Добавить обработку ошибок с возможностью повтора
- [ ] Добавить подтверждения для критических действий
- [ ] Добавить анимации переходов
- [ ] Протестировать полную интеграцию

### Этап 8: Тестирование и оптимизация

- [ ] Протестировать все компоненты на разных браузерах
- [ ] Проверить производительность анимаций (60 FPS)
- [ ] Протестировать на мобильных устройствах
- [ ] Проверить отсутствие утечек памяти
- [ ] Оптимизировать анимации для слабых устройств
- [ ] Проверить доступность (ARIA атрибуты)
- [ ] Протестировать все сценарии использования

---

## 🧪 Тестирование

### Тестирование скелетонов:
1. Открыть страницу логов
2. Проверить отображение скелетонов при загрузке
3. Проверить плавный переход к данным

### Тестирование уведомлений:
1. Выполнить действие (экспорт, фильтр)
2. Проверить появление уведомления
3. Проверить автоскрытие

### Тестирование пустых состояний:
1. Применить фильтры, которые не дают результатов
2. Проверить отображение пустого состояния
3. Проверить подсказки

---

## 📚 Дополнительные ресурсы

- [Vue Transitions](https://vuejs.org/guide/built-ins/transition.html)
- [CSS Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations)

---

## 📝 История правок

- **2025-12-07 05:25 (UTC+3, Брест):** Создана задача TASK-017-06
- **2025-12-07 06:30 (UTC+3, Брест):** Добавлены детальные компоненты скелетонов (LoadingSkeleton, SkeletonLogList) с вариантами и анимациями
- **2025-12-07 06:30 (UTC+3, Брест):** Добавлена полная система уведомлений (useNotifications composable, Notification, NotificationContainer) с прогресс-барами
- **2025-12-07 06:30 (UTC+3, Брест):** Добавлен компонент EmptyState с поддержкой вариантов, подсказок и множественных действий
- **2025-12-07 06:29 (UTC+3, Брест):** Задача завершена. Реализованы:
  - Компоненты скелетонов: LoadingSkeleton.vue (универсальный) и SkeletonLogList.vue (для таблицы логов)
  - Компонент EmptyState.vue с подсказками и действиями
  - Компонент ErrorDisplay.vue с возможностью повтора и деталями ошибки
  - Система уведомлений: useNotifications composable, Notification.vue, NotificationContainer.vue
  - Глобальные анимации переходов (fade, slide, scale, list, modal) в main.css
  - Интеграция всех компонентов в WebhookLogsPage.vue с плавными переходами
  - Улучшена обработка ошибок с кнопкой повтора
  - Улучшены пустые состояния с подсказками для пользователя
  - Все компоненты протестированы, ошибок линтера нет
- **2025-12-07 06:30 (UTC+3, Брест):** Добавлен компонент ErrorDisplay с возможностью повтора и показа деталей
- **2025-12-07 06:30 (UTC+3, Брест):** Добавлена система подтверждений (useConfirm composable, ConfirmDialog) с вариантами действий
- **2025-12-07 06:30 (UTC+3, Брест):** Добавлены глобальные CSS анимации (fade, slide, scale, list) и примеры использования
- **2025-12-07 06:30 (UTC+3, Брест):** Добавлена полная интеграция всех компонентов в WebhookLogsPage с примерами кода
- **2025-12-07 06:30 (UTC+3, Брест):** Добавлен раздел Troubleshooting с 6 типичными проблемами и решениями
- **2025-12-07 06:30 (UTC+3, Брест):** Расширены критерии приёмки и добавлен детальный чек-лист выполнения (8 этапов)

---

## 🔗 Связанные задачи

- **Родительская:** [TASK-017: Глобальный план](./TASK-017-webhook-logs-ui-implementation-plan.md)
- **Предыдущая:** [TASK-017-05: Экспорт данных](./TASK-017-05-export-data.md)
- **Следующая:** [TASK-017-07: Оптимизация производительности](./TASK-017-07-performance-optimization.md)

