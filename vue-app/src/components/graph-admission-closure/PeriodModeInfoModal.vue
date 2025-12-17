<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isVisible"
        class="modal-overlay"
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
            <p class="modal-description">
              Выберите режим отображения данных для графика приёма и закрытий:
            </p>
            
            <div class="mode-description">
              <button
                class="mode-item mode-item--clickable"
                :class="{ 'mode-item--selected': selectedMode === 'weeks' }"
                @click="handleModeSelect('weeks')"
                type="button"
              >
                <div class="mode-header">
                  <span class="mode-icon">📅</span>
                  <h3 class="mode-title">4 последние недели</h3>
                </div>
                <p class="mode-text">
                  Отображение данных за последние 4 недели с детализацией по неделям. 
                  Подходит для краткосрочного анализа динамики поступления и закрытия тикетов.
                </p>
              </button>
              
              <button
                class="mode-item mode-item--clickable"
                :class="{ 'mode-item--selected': selectedMode === 'months' }"
                @click="handleModeSelect('months')"
                type="button"
              >
                <div class="mode-header">
                  <span class="mode-icon">📊</span>
                  <h3 class="mode-title">3 последних месяца</h3>
                </div>
                <p class="mode-text">
                  Отображение данных за последние 3 месяца с детализацией по месяцам 
                  и неделям внутри месяцев. Подходит для долгосрочного анализа и выявления трендов.
                </p>
              </button>
            </div>
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
  },
  currentMode: {
    type: String,
    default: 'weeks',
    validator: (value) => ['weeks', 'months'].includes(value)
  }
});

const emit = defineEmits(['close', 'start-loading', 'select-mode']);

const selectedMode = ref(props.currentMode);

/**
 * Обработка выбора режима
 */
function handleModeSelect(mode) {
  if (!['weeks', 'months'].includes(mode)) {
    console.warn('[PeriodModeInfoModal] Invalid mode:', mode);
    return;
  }
  
  selectedMode.value = mode;
  
  // Эмитим событие выбора режима
  emit('select-mode', mode);
  
  // Сначала закрываем попап
  emit('close');
  
  // Затем запускаем загрузку (с небольшой задержкой для плавного перехода)
  setTimeout(() => {
    emit('start-loading');
  }, 100);
}

/**
 * Обработка закрытия попапа (через крестик или Escape)
 */
function handleClose() {
  // Если режим не был выбран, используем текущий
  emit('select-mode', selectedMode.value);
  
  // Сначала закрываем попап
  emit('close');
  
  // Затем запускаем загрузку (с небольшой задержкой для плавного перехода)
  setTimeout(() => {
    emit('start-loading');
  }, 100);
}

/**
 * Обработка нажатия Escape
 */
function handleEscape(event) {
  if (event.key === 'Escape' && props.isVisible) {
    handleClose();
  }
}

// Обновление выбранного режима при изменении текущего режима
watch(() => props.currentMode, (newMode) => {
  if (['weeks', 'months'].includes(newMode)) {
    selectedMode.value = newMode;
  }
});

// Обработчик Escape при монтировании
onMounted(() => {
  if (props.isVisible) {
    document.addEventListener('keydown', handleEscape);
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
});

// Обновление обработчика при изменении видимости
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    document.addEventListener('keydown', handleEscape);
    // Обновляем выбранный режим при показе попапа
    selectedMode.value = props.currentMode;
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

.modal-description {
  margin: 0 0 var(--spacing-lg, 20px) 0;
  font-size: var(--font-size-base, 14px);
  color: var(--b24-text-secondary, #6b7280);
  line-height: 1.6;
}

.mode-item {
  padding: var(--spacing-md, 16px);
  background-color: var(--b24-bg-light, #f9fafb);
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--b24-border-light, #e5e7eb);
  text-align: left;
  width: 100%;
}

.mode-item--clickable {
  cursor: pointer;
  transition: all var(--transition-base, 0.2s);
  border: 2px solid var(--b24-border-light, #e5e7eb);
}

.mode-item--clickable:hover {
  background-color: var(--b24-bg-hover, #f3f4f6);
  border-color: var(--b24-primary, #007bff);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
}

.mode-item--clickable:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.1);
}

.mode-item--clickable:focus {
  outline: 2px solid var(--b24-primary, #007bff);
  outline-offset: 2px;
}

.mode-item--selected {
  background-color: var(--b24-primary-light, #e7f3ff);
  border-color: var(--b24-primary, #007bff);
  border-width: 2px;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
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

