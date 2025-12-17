<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isVisible"
        class="modal-overlay"
        @click.self="handleClose"
      >
        <div class="modal-container" role="dialog" aria-labelledby="modal-title" aria-modal="true">
          <div class="modal-header">
            <h2 id="modal-title" class="modal-title">
              <span class="modal-icon">ℹ️</span>
              Выбор режима отображения
            </h2>
            <button
              class="modal-close-btn"
              @click="handleClose"
              aria-label="Закрыть"
              type="button"
            >
              ×
            </button>
          </div>
          
          <div class="modal-body">
            <div class="mode-description">
              <div class="mode-item">
                <div class="mode-header">
                  <span class="mode-icon">📅</span>
                  <h3 class="mode-title">4 последние недели</h3>
                </div>
                <p class="mode-text">
                  Отображение данных за последние 4 недели с детализацией по неделям. 
                  Подходит для краткосрочного анализа динамики поступления и закрытия тикетов.
                </p>
              </div>
              
              <div class="mode-item">
                <div class="mode-header">
                  <span class="mode-icon">📊</span>
                  <h3 class="mode-title">3 последних месяца</h3>
                </div>
                <p class="mode-text">
                  Отображение данных за последние 3 месяца с детализацией по месяцам 
                  и неделям внутри месяцев. Подходит для долгосрочного анализа и выявления трендов.
                </p>
              </div>
            </div>
            
            <div class="modal-checkbox">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="dontShowAgain"
                  class="checkbox-input"
                />
                <span class="checkbox-text">Не показывать снова</span>
              </label>
            </div>
          </div>
          
          <div class="modal-footer">
            <button
              ref="closeButtonRef"
              class="btn btn-primary"
              @click="handleClose"
              type="button"
            >
              Понятно
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';

const props = defineProps({
  isVisible: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['close']);

const dontShowAgain = ref(false);
const closeButtonRef = ref(null);
const STORAGE_KEY = 'graph-admission-closure-period-mode-info-shown';

/**
 * Обработка закрытия попапа
 */
function handleClose() {
  // Сохранение флага, если установлен чекбокс
  if (dontShowAgain.value) {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch (error) {
      console.warn('[PeriodModeInfoModal] Failed to save to localStorage:', error);
      // Продолжаем закрытие даже при ошибке localStorage
    }
  }
  
  emit('close');
}

/**
 * Обработка нажатия Escape
 */
function handleEscape(event) {
  if (event.key === 'Escape' && props.isVisible) {
    handleClose();
  }
}

// Обработчик Escape при монтировании
onMounted(() => {
  if (props.isVisible) {
    document.addEventListener('keydown', handleEscape);
    // Фокус на кнопке "Понятно"
    nextTick(() => {
      if (closeButtonRef.value) {
        closeButtonRef.value.focus();
      }
    });
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
});

// Обновление обработчика при изменении видимости
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    document.addEventListener('keydown', handleEscape);
    nextTick(() => {
      if (closeButtonRef.value) {
        closeButtonRef.value.focus();
      }
    });
  } else {
    document.removeEventListener('keydown', handleEscape);
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-lg, 20px);
}

.modal-container {
  background-color: var(--b24-bg-white, #ffffff);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-lg, 0 10px 25px rgba(0, 0, 0, 0.2));
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  transform: scale(1);
  opacity: 1;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg, 20px);
  border-bottom: 1px solid var(--b24-border-light, #e5e7eb);
}

.modal-title {
  margin: 0;
  font-size: var(--font-size-xl, 20px);
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
}

.modal-icon {
  font-size: 24px;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--b24-text-secondary, #6b7280);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm, 4px);
  transition: all var(--transition-base, 0.2s);
}

.modal-close-btn:hover {
  background-color: var(--b24-bg-light, #f5f7fb);
  color: var(--b24-text-primary, #111827);
}

.modal-close-btn:focus {
  outline: 2px solid var(--b24-primary, #007bff);
  outline-offset: 2px;
}

.modal-body {
  padding: var(--spacing-lg, 20px);
  flex: 1;
}

.mode-description {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg, 20px);
  margin-bottom: var(--spacing-lg, 20px);
}

.mode-item {
  padding: var(--spacing-md, 16px);
  background-color: var(--b24-bg-light, #f9fafb);
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--b24-border-light, #e5e7eb);
}

.mode-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  margin-bottom: var(--spacing-sm, 8px);
}

.mode-icon {
  font-size: 24px;
}

.mode-title {
  margin: 0;
  font-size: var(--font-size-lg, 16px);
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
}

.mode-text {
  margin: 0;
  font-size: var(--font-size-base, 14px);
  color: var(--b24-text-secondary, #6b7280);
  line-height: 1.6;
}

.modal-checkbox {
  padding-top: var(--spacing-md, 16px);
  border-top: 1px solid var(--b24-border-light, #e5e7eb);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  cursor: pointer;
  font-size: var(--font-size-base, 14px);
  color: var(--b24-text-primary, #111827);
}

.checkbox-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-text {
  user-select: none;
}

.modal-footer {
  padding: var(--spacing-lg, 20px);
  border-top: 1px solid var(--b24-border-light, #e5e7eb);
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: var(--spacing-sm, 8px) var(--spacing-lg, 20px);
  border: none;
  border-radius: var(--radius-sm, 4px);
  font-size: var(--font-size-base, 14px);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base, 0.2s);
}

.btn-primary {
  background-color: var(--b24-primary, #007bff);
  color: var(--b24-text-inverse, #ffffff);
}

.btn-primary:hover {
  background-color: var(--b24-primary-hover, #0056b3);
}

.btn-primary:focus {
  outline: 2px solid var(--b24-primary, #007bff);
  outline-offset: 2px;
}

/* Анимации */
.modal-fade-enter-active {
  transition: opacity 0.3s ease;
}

.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-active .modal-container {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-fade-leave-active .modal-container {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-fade-enter-from {
  opacity: 0;
}

.modal-fade-enter-from .modal-container {
  transform: scale(0.9);
  opacity: 0;
}

.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-leave-to .modal-container {
  transform: scale(0.9);
  opacity: 0;
}

/* Адаптивность */
@media (max-width: 768px) {
  .modal-overlay {
    padding: var(--spacing-md, 16px);
  }
  
  .modal-container {
    max-width: 100%;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: var(--spacing-md, 16px);
  }
}
</style>

