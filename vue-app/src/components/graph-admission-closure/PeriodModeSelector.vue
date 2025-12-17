<template>
  <div class="period-mode-selector">
    <h3 class="selector-title">
      <span class="selector-icon">📅</span>
      Режим отображения
    </h3>
    <div class="selector-options">
      <label 
        class="option-label"
        :class="{ 'option-selected': modelValue === 'weeks' }"
      >
        <input
          type="radio"
          :value="'weeks'"
          :checked="modelValue === 'weeks'"
          @change="handleChange('weeks')"
          class="option-input"
          aria-label="4 последние недели"
        />
        <span class="option-text">
          <span class="option-icon">📅</span>
          4 последние недели
        </span>
      </label>
      
      <label 
        class="option-label"
        :class="{ 'option-selected': modelValue === 'months' }"
      >
        <input
          type="radio"
          :value="'months'"
          :checked="modelValue === 'months'"
          @change="handleChange('months')"
          class="option-input"
          aria-label="3 последних месяца"
        />
        <span class="option-text">
          <span class="option-icon">📊</span>
          3 последних месяца
        </span>
      </label>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
    validator: (value) => {
      if (!['weeks', 'months'].includes(value)) {
        console.warn(`[PeriodModeSelector] Invalid modelValue: ${value}. Using default 'weeks'.`);
        return false;
      }
      return true;
    }
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const STORAGE_KEY = 'graph-admission-closure-period-mode';

/**
 * Обработка изменения режима
 * 
 * @param {string} value - Новое значение режима ('weeks' | 'months')
 */
function handleChange(value) {
  // Валидация значения
  if (!['weeks', 'months'].includes(value)) {
    console.warn(`[PeriodModeSelector] Invalid value: ${value}. Ignoring change.`);
    return;
  }
  
  try {
    // Сохранение в localStorage
    localStorage.setItem(STORAGE_KEY, value);
    
    // Эмит событий
    emit('update:modelValue', value);
    emit('change', value);
  } catch (error) {
    // Обработка ошибок localStorage (например, в приватном режиме)
    console.warn('[PeriodModeSelector] Failed to save to localStorage:', error);
    // Всё равно эмитим события, но без сохранения
    emit('update:modelValue', value);
    emit('change', value);
  }
}

/**
 * Обработка изменения localStorage в других вкладках
 */
function handleStorageChange(event) {
  if (event.key === STORAGE_KEY && event.newValue) {
    if (event.newValue === 'weeks' || event.newValue === 'months') {
      if (event.newValue !== props.modelValue) {
        emit('update:modelValue', event.newValue);
      }
    }
  }
}

// Загрузка из localStorage при монтировании
onMounted(() => {
  try {
    const savedMode = localStorage.getItem(STORAGE_KEY);
    if (savedMode === 'weeks' || savedMode === 'months') {
      if (savedMode !== props.modelValue) {
        emit('update:modelValue', savedMode);
      }
    }
  } catch (error) {
    console.warn('[PeriodModeSelector] Failed to read from localStorage:', error);
  }
  
  // Синхронизация между вкладками
  window.addEventListener('storage', handleStorageChange);
});

// Очистка при размонтировании
onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange);
});
</script>

<style scoped>
.period-mode-selector {
  padding: var(--spacing-md, 16px);
  background-color: var(--b24-bg-light, #f9fafb);
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--b24-border-light, #e5e7eb);
  margin-bottom: var(--spacing-md, 16px);
}

.selector-title {
  margin: 0 0 var(--spacing-md, 16px) 0;
  font-size: var(--font-size-lg, 16px);
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
}

.selector-icon {
  font-size: 20px;
}

.selector-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
}

.option-label {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  border: 2px solid var(--b24-border-light, #e5e7eb);
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  transition: all var(--transition-base, 0.2s);
  background-color: var(--b24-bg-white, #ffffff);
}

.option-label:hover {
  border-color: var(--b24-primary, #007bff);
  background-color: var(--b24-bg-light, #f5f7fb);
}

.option-label:focus-within {
  outline: 2px solid var(--b24-primary, #007bff);
  outline-offset: 2px;
}

.option-label.option-selected {
  border-color: var(--b24-primary, #007bff);
  background-color: var(--b24-primary-light, #e7f3ff);
}

.option-input {
  margin-right: var(--spacing-sm, 8px);
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.option-text {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  font-size: var(--font-size-base, 14px);
  color: var(--b24-text-primary, #111827);
  flex: 1;
}

.option-icon {
  font-size: 18px;
}

/* Адаптивность */
@media (min-width: 768px) {
  .selector-options {
    flex-direction: row;
    gap: var(--spacing-md, 16px);
  }
  
  .option-label {
    flex: 1;
  }
}

@media (max-width: 767px) {
  .selector-options {
    gap: var(--spacing-xs, 4px);
  }
  
  .option-label {
    padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
  }
}
</style>

