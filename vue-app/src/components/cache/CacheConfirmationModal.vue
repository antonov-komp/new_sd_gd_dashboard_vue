<template>
  <!--
    CacheConfirmationModal - компонент для подтверждений в модуле управления кешем

    TASK-090: Улучшение интерфейса и UX модуля "Ручное управление кешем"

    Этот компонент служит оберткой над ConfirmationSystem для лучшей интеграции с Vue.
    Основная логика реализована в utils/confirmations.js для переиспользования.
  -->
  <div v-if="isVisible" class="cache-confirmation-modal-overlay">
    <div class="modal-backdrop" @click="handleCancel"></div>
    <div class="modal-content" role="dialog" :aria-labelledby="titleId" :aria-describedby="messageId">
      <div class="modal-header">
        <h3 :id="titleId" class="modal-title">{{ title }}</h3>
        <button
          class="modal-close"
          @click="handleCancel"
          :aria-label="closeLabel"
        >
          ×
        </button>
      </div>

      <div class="modal-body">
        <div class="modal-icon">
          <span class="icon-symbol" :class="iconClass">{{ icon }}</span>
        </div>
        <p :id="messageId" class="modal-message">{{ message }}</p>
      </div>

      <div class="modal-footer">
        <button
          v-if="showCancel"
          class="btn btn-cancel"
          @click="handleCancel"
          :disabled="loading"
          ref="cancelButton"
        >
          {{ cancelText }}
        </button>
        <button
          class="btn btn-confirm"
          @click="handleConfirm"
          :disabled="loading"
          :class="confirmButtonClass"
          ref="confirmButton"
        >
          <span v-if="loading" class="loading-spinner">⏳</span>
          <span v-else>{{ confirmText }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

/**
 * Компонент модального окна подтверждения для операций с кешем
 *
 * Используется как Vue-компонент для лучшей интеграции с экосистемой,
 * но основная логика делегируется ConfirmationSystem.
 */
export default {
  name: 'CacheConfirmationModal',
  props: {
    /**
     * Видимость модального окна
     */
    visible: {
      type: Boolean,
      default: false
    },

    /**
     * Заголовок модального окна
     */
    title: {
      type: String,
      default: 'Подтверждение действия'
    },

    /**
     * Текст сообщения
     */
    message: {
      type: String,
      default: 'Вы уверены, что хотите выполнить это действие?'
    },

    /**
     * Тип подтверждения (влияет на цвет иконки)
     */
    type: {
      type: String,
      default: 'warning',
      validator: (value) => ['danger', 'warning', 'info', 'success'].includes(value)
    },

    /**
     * Текст кнопки подтверждения
     */
    confirmText: {
      type: String,
      default: 'Подтвердить'
    },

    /**
     * Текст кнопки отмены
     */
    cancelText: {
      type: String,
      default: 'Отмена'
    },

    /**
     * Показывать ли кнопку отмены
     */
    showCancel: {
      type: Boolean,
      default: true
    },

    /**
     * Состояние загрузки
     */
    loading: {
      type: Boolean,
      default: false
    }
  },

  emits: ['confirm', 'cancel', 'update:visible'],

  setup(props, { emit }) {
    const isVisible = ref(false);
    const cancelButton = ref(null);
    const confirmButton = ref(null);

    // Генерация уникальных ID для ARIA
    const titleId = `confirmation-title-${Date.now()}`;
    const messageId = `confirmation-message-${Date.now()}`;

    // Метки для доступности
    const closeLabel = 'Закрыть окно подтверждения';

    // Иконки для разных типов
    const iconMap = {
      danger: '⚠️',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅'
    };

    // Классы для кнопок
    const confirmButtonClass = `btn-${props.type}`;

    // Вычисляемые свойства
    const icon = iconMap[props.type] || iconMap.warning;
    const iconClass = `icon-${props.type}`;

    // Синхронизация с props
    const syncVisibility = () => {
      isVisible.value = props.visible;
    };

    onMounted(() => {
      syncVisibility();
    });

    // Обработчики событий
    const handleConfirm = () => {
      if (!props.loading) {
        emit('confirm');
        emit('update:visible', false);
      }
    };

    const handleCancel = () => {
      if (!props.loading) {
        emit('cancel');
        emit('update:visible', false);
      }
    };

    // Обработчик клавиатурных событий
    const handleKeyDown = (event) => {
      if (!isVisible.value) return;

      switch (event.key) {
        case 'Enter':
          event.preventDefault();
          handleConfirm();
          break;
        case 'Escape':
          event.preventDefault();
          handleCancel();
          break;
        case 'Tab':
          handleTabNavigation(event);
          break;
      }
    };

    // Навигация Tab внутри модального окна
    const handleTabNavigation = (event) => {
      const focusableElements = [
        confirmButton.value,
        cancelButton.value
      ].filter(Boolean);

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Управление фокусом при показе/скрытии
    const manageFocus = () => {
      if (isVisible.value) {
        // Предотвращаем скролл body
        document.body.style.overflow = 'hidden';

        // Устанавливаем фокус на кнопку подтверждения
        nextTick(() => {
          if (confirmButton.value) {
            confirmButton.value.focus();
          }
        });

        // Добавляем обработчик клавиатуры
        document.addEventListener('keydown', handleKeyDown);
      } else {
        // Восстанавливаем скролл body
        document.body.style.overflow = '';

        // Удаляем обработчик клавиатуры
        document.removeEventListener('keydown', handleKeyDown);
      }
    };

    // Следим за изменением видимости
    watch(() => props.visible, (newValue) => {
      isVisible.value = newValue;
      manageFocus();
    });

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    });

    return {
      isVisible,
      cancelButton,
      confirmButton,
      titleId,
      messageId,
      closeLabel,
      icon,
      iconClass,
      confirmButtonClass,
      handleConfirm,
      handleCancel
    };
  }
};
</script>

<style scoped>
.cache-confirmation-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  z-index: 10001;
  /* animation: modalSlideIn 0.3s ease-out; - убрана анимация появления */
}

/* @keyframes modalSlideIn - удалено по требованию пользователя */

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #f0f0f0;
  color: #333;
}

.modal-body {
  padding: 24px;
  text-align: center;
}

.modal-icon {
  margin-bottom: 16px;
}

.icon-symbol {
  font-size: 48px;
  display: block;
}

.icon-danger,
.icon-warning {
  color: #ffc107;
}

.icon-info {
  color: #17a2b8;
}

.icon-success {
  color: #28a745;
}

.modal-message {
  margin: 0;
  font-size: 16px;
  color: #555;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px 24px;
  border-top: 1px solid #e0e0e0;
}

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  min-width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:focus {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  background: #f8f9fa;
  color: #6c757d;
  border: 1px solid #dee2e6;
}

.btn-cancel:hover:not(:disabled) {
  background: #e9ecef;
  border-color: #adb5bd;
}

.btn-confirm {
  background: #007bff;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: #0056b3;
}

/* Типы кнопок подтверждения */
.btn-danger {
  background: #dc3545;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
}

.btn-warning {
  background: #ffc107;
  color: #212529;
}

.btn-warning:hover:not(:disabled) {
  background: #e0a800;
}

.btn-info {
  background: #17a2b8;
}

.btn-info:hover:not(:disabled) {
  background: #138496;
}

.btn-success {
  background: #28a745;
}

.btn-success:hover:not(:disabled) {
  background: #1e7e34;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Адаптивность */
@media (max-width: 480px) {
  .modal-content {
    margin: 20px;
    width: calc(100% - 40px);
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding-left: 20px;
    padding-right: 20px;
  }

  .modal-footer {
    flex-direction: column-reverse;
  }

  .btn {
    width: 100%;
  }
}

/* Доступность */
@media (prefers-reduced-motion: reduce) {
  .modal-content,
  .modal-close,
  .btn {
    animation: none;
    transition: none;
  }
}

/* Высокий контраст */
@media (prefers-contrast: high) {
  .modal-content {
    border: 2px solid #000;
  }

  .btn-cancel {
    border: 2px solid #000;
  }

  .btn-confirm {
    border: 2px solid #000;
  }
}
</style>