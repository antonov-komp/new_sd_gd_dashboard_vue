<template>
  <div class="stages-container">
    <h4 class="stages-title">Этапы для отображения:</h4>
    <div class="stages-chips">
      <label
        v-for="stage in stages"
        :key="stage.id"
        :class="[
          'stage-chip',
          {
            'stage-chip--active': selected[stage.id],
            'stage-chip--disabled': disabled
          }
        ]"
      >
        <input
          type="checkbox"
          :checked="selected[stage.id]"
          :disabled="disabled"
          @change="handleChange(stage.id, $event.target.checked)"
        />
        <span
          class="stage-chip-color"
          :style="{ backgroundColor: stage.color }"
        ></span>
        <span class="stage-chip-label">{{ stage.name }}</span>
      </label>
    </div>
  </div>
</template>

<script setup>
/**
 * Компонент чипов стадий для фильтрации графика
 * 
 * Отображает стадии в визуальном контейнере с состояниями hover/active
 */

const props = defineProps({
  /**
   * Список стадий
   */
  stages: {
    type: Array,
    required: true,
    validator: (value) => {
      return value.every(stage => 
        stage.id && stage.name && stage.color
      );
    }
  },
  /**
   * Объект выбранных стадий { [stageId]: boolean }
   */
  selected: {
    type: Object,
    required: true
  },
  /**
   * Отключить выбор стадий
   */
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:selected', 'change']);

/**
 * Обработка изменения выбора стадии
 */
function handleChange(stageId, isSelected) {
  const newSelected = { ...props.selected };
  newSelected[stageId] = isSelected;
  emit('update:selected', newSelected);
  emit('change', stageId, isSelected);
}
</script>

<style scoped>
.stages-container {
  background-color: var(--b24-bg-light);
  border: 1px solid var(--b24-border-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.stages-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--b24-text-primary);
}

.stages-chips {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.stage-chip {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  min-height: 40px;
  background-color: var(--b24-bg-white);
  border: 1px solid var(--b24-border-medium);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  font-size: var(--font-size-sm);
}

.stage-chip:hover:not(.stage-chip--disabled) {
  background-color: var(--b24-bg-light);
  border-color: var(--b24-primary);
  box-shadow: var(--shadow-sm);
}

.stage-chip--active {
  background-color: var(--b24-primary-lighter);
  border: 2px solid var(--b24-primary);
  color: var(--b24-primary);
  font-weight: 600;
}

.stage-chip--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.stage-chip input[type="checkbox"] {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.stage-chip-color {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-xs);
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.stage-chip-label {
  color: inherit;
  user-select: none;
}

/* Адаптивность */
@media (max-width: 768px) {
  .stages-chips {
    flex-direction: column;
  }
  
  .stage-chip {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>

