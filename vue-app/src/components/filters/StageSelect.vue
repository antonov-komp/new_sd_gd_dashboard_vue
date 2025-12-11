<template>
  <div class="stage-select" ref="selectContainer">
    <!-- Поле для открытия выпадающего списка -->
    <div
      class="stage-select-field"
      @click="toggleDropdown"
      :class="{
        'stage-select-field--open': isDropdownOpen,
        'stage-select-field--disabled': false
      }"
    >
      <span class="stage-select-field-text">
        {{ displayText }}
      </span>
      <span class="stage-select-field-icon" :class="{ 'open': isDropdownOpen }">▼</span>
    </div>
    
    <!-- Выпадающий список -->
    <Transition name="dropdown-fade">
      <div
        v-if="isDropdownOpen"
        class="stage-select-dropdown"
      >
        <!-- Список этапов -->
        <div class="stage-select-list">
          <!-- Опция "Все этапы" -->
          <label
            :class="[
              'stage-select-item',
              {
                'stage-select-item--selected': isAllSelected
              }
            ]"
            @click.stop
          >
            <input
              type="checkbox"
              :checked="isAllSelected"
              @change="handleToggleAll"
            />
            <div class="stage-select-item-content">
              <span class="stage-select-item-name">Все этапы</span>
            </div>
          </label>
          
          <!-- Список этапов -->
          <label
            v-for="stage in stages"
            :key="stage.id"
            :class="[
              'stage-select-item',
              {
                'stage-select-item--selected': selected[stage.id]
              }
            ]"
            @click.stop
          >
            <input
              type="checkbox"
              :checked="selected[stage.id]"
              @change="handleToggle(stage.id, $event.target.checked)"
            />
            <div class="stage-select-item-content">
              <span
                class="stage-select-item-color"
                :style="{ backgroundColor: stage.color }"
              ></span>
              <span class="stage-select-item-name">{{ stage.name }}</span>
            </div>
          </label>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
/**
 * Компонент выбора этапов
 * 
 * Выпадающий список с чекбоксами для выбора этапов
 */

import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps({
  /**
   * Объект выбранных этапов { [stageId]: boolean }
   */
  selected: {
    type: Object,
    required: true,
    default: () => ({
      formed: true,
      review: true,
      execution: true
    })
  },
  /**
   * Список этапов
   */
  stages: {
    type: Array,
    required: true,
    default: () => [
      { id: 'formed', name: 'Сформировано обращение', color: '#007bff' },
      { id: 'review', name: 'Рассмотрение ТЗ', color: '#ffc107' },
      { id: 'execution', name: 'Исполнение', color: '#28a745' }
    ]
  },
  /**
   * Placeholder для поля
   */
  placeholder: {
    type: String,
    default: 'Выберите этапы'
  }
});

const emit = defineEmits(['update:selected', 'change']);

const selectContainer = ref(null);
const isDropdownOpen = ref(false);

/**
 * Проверка, выбраны ли все этапы
 */
const isAllSelected = computed(() => {
  return Object.values(props.selected).every(value => value === true);
});

/**
 * Текст для отображения в поле
 */
const displayText = computed(() => {
  if (isAllSelected.value) {
    return props.placeholder;
  }
  
  const selectedStages = props.stages.filter(stage => props.selected[stage.id]);
  
  if (selectedStages.length === 0) {
    return 'Этапы не выбраны';
  }
  
  if (selectedStages.length === 1) {
    return selectedStages[0].name;
  }
  
  return `Выбрано: ${selectedStages.length} этапа(ов)`;
});

/**
 * Переключение выпадающего списка
 */
function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value;
  
  if (!isDropdownOpen.value) {
    // При закрытии ничего не делаем
  }
}

/**
 * Закрытие выпадающего списка при клике вне компонента
 */
function handleClickOutside(event) {
  if (selectContainer.value && !selectContainer.value.contains(event.target)) {
    isDropdownOpen.value = false;
  }
}

/**
 * Обработка переключения выбора этапа
 */
function handleToggle(stageId, isChecked) {
  const newSelected = { ...props.selected };
  newSelected[stageId] = isChecked;
  emit('update:selected', newSelected);
  emit('change', stageId, isChecked);
}

/**
 * Обработка переключения "Все этапы"
 */
function handleToggleAll() {
  const allSelected = isAllSelected.value;
  const newSelected = {};
  
  // Если все выбраны - снимаем все
  // Если не все выбраны - выбираем все
  props.stages.forEach(stage => {
    newSelected[stage.id] = !allSelected;
  });
  
  emit('update:selected', newSelected);
  emit('change', 'all', !allSelected);
}

// Обработка кликов вне компонента
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.stage-select {
  position: relative;
  width: 100%;
}

.stage-select-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--b24-border-medium);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background-color: var(--b24-bg-white);
  cursor: pointer;
  transition: all var(--transition-base);
  min-height: 40px;
}

.stage-select-field:hover:not(.stage-select-field--disabled) {
  border-color: var(--b24-primary);
}

.stage-select-field--open {
  border-color: var(--b24-primary);
  border-width: 2px;
}

.stage-select-field--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.stage-select-field-text {
  flex: 1;
  color: var(--b24-text-primary);
  text-align: left;
}

.stage-select-field-icon {
  font-size: 12px;
  color: var(--b24-text-secondary);
  transition: transform var(--transition-base);
  margin-left: var(--spacing-xs);
}

.stage-select-field-icon.open {
  transform: rotate(180deg);
}

.stage-select-dropdown {
  position: absolute;
  top: calc(100% + var(--spacing-xs));
  left: 0;
  right: 0;
  background-color: var(--b24-bg-white);
  border: 1px solid var(--b24-border-light);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  overflow: hidden;
}

.stage-select-list {
  max-height: 300px;
  overflow-y: auto;
}

.stage-select-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  min-height: 40px;
  cursor: pointer;
  transition: background-color var(--transition-base);
  border-bottom: 1px solid var(--b24-border-light);
}

.stage-select-item:last-child {
  border-bottom: none;
}

.stage-select-item:hover {
  background-color: var(--b24-bg-light);
}

.stage-select-item--selected {
  background-color: var(--b24-primary-lighter);
  border-left: 3px solid var(--b24-primary);
}

.stage-select-item input[type="checkbox"] {
  cursor: pointer;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.stage-select-item-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex: 1;
}

.stage-select-item-color {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-xs);
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.stage-select-item-name {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--b24-text-primary);
}

/* Анимация выпадающего списка */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity var(--transition-base), transform var(--transition-base);
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Адаптивность */
@media (max-width: 768px) {
  .stage-select-dropdown {
    max-width: 100vw;
  }
  
  .stage-select-list {
    max-height: 200px;
  }
}
</style>

