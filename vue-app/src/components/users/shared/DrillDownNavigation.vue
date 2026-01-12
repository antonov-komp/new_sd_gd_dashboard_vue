<template>
  <nav
    class="drilldown-navigation"
    role="navigation"
    aria-label="Навигация по разделам управления пользователями"
  >
    <ol class="breadcrumb-list">
      <li
        v-for="(crumb, index) in breadcrumbs"
        :key="crumb.id"
        class="breadcrumb-item"
        :class="{
          'breadcrumb-current': index === breadcrumbs.length - 1,
          'breadcrumb-interactive': index < breadcrumbs.length - 1
        }"
      >
        <!-- Разделитель -->
        <span
          v-if="index > 0"
          class="breadcrumb-separator"
          aria-hidden="true"
        >
          {{ separator }}
        </span>

        <!-- Кликабельная крошка -->
        <button
          v-if="index < breadcrumbs.length - 1 && crumb.action"
          class="breadcrumb-link"
          @click="handleNavigate(crumb)"
          @keydown.enter="handleNavigate(crumb)"
          @keydown.space="handleNavigate(crumb)"
          :aria-label="`Перейти к разделу ${crumb.label}`"
          :title="`Вернуться к ${crumb.label}`"
        >
          <component
            v-if="crumb.icon"
            :is="crumb.icon"
            class="breadcrumb-icon"
            aria-hidden="true"
          />
          <span class="breadcrumb-text">{{ crumb.label }}</span>
        </button>

        <!-- Текущая крошка -->
        <span
          v-else
          class="breadcrumb-current-text"
          aria-current="page"
        >
          <component
            v-if="crumb.icon"
            :is="crumb.icon"
            class="breadcrumb-icon"
            aria-hidden="true"
          />
          <span class="breadcrumb-text">{{ crumb.label }}</span>
        </span>

        <!-- Индикатор загрузки для текущей крошки -->
        <div
          v-if="index === breadcrumbs.length - 1 && isLoading"
          class="breadcrumb-loading"
          aria-label="Загрузка данных"
        >
          <div class="loading-spinner" aria-hidden="true"></div>
        </div>
      </li>
    </ol>

    <!-- Кнопка возврата -->
    <button
      v-if="showBackButton && breadcrumbs.length > 1"
      class="back-button"
      @click="handleBack"
      @keydown.enter="handleBack"
      @keydown.space="handleBack"
      :aria-label="`Вернуться к ${breadcrumbs[breadcrumbs.length - 2]?.label || 'предыдущему разделу'}`"
      :title="`Вернуться к ${breadcrumbs[breadcrumbs.length - 2]?.label || 'предыдущему разделу'}`"
    >
      <svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
      </svg>
      <span class="back-text">Назад</span>
    </button>

    <!-- Дополнительные действия -->
    <div v-if="additionalActions.length > 0" class="breadcrumb-actions">
      <button
        v-for="action in additionalActions"
        :key="action.id"
        class="action-button"
        :class="action.class"
        @click="handleAction(action)"
        @keydown.enter="handleAction(action)"
        @keydown.space="handleAction(action)"
        :aria-label="action.label"
        :title="action.title || action.label"
        :disabled="action.disabled"
      >
        <component
          v-if="action.icon"
          :is="action.icon"
          class="action-icon"
          aria-hidden="true"
        />
        <span v-if="action.text" class="action-text">{{ action.text }}</span>
      </button>
    </div>
  </nav>
</template>

<script>
import { ref, computed, watch } from 'vue';

/**
 * DrillDownNavigation - компонент breadcrumb навигации для drill-down интерфейса
 *
 * Предоставляет навигацию по уровням анализа с возможностью быстрого возврата
 * к предыдущим контекстам.
 *
 * @version 1.0.0
 * @since TASK-089
 */
export default {
  name: 'DrillDownNavigation',

  props: {
    /**
     * Массив breadcrumb элементов
     */
    breadcrumbs: {
      type: Array,
      default: () => [],
      validator: (value) => {
        return Array.isArray(value) && value.every(crumb =>
          typeof crumb === 'object' &&
          typeof crumb.id === 'string' &&
          typeof crumb.label === 'string'
        );
      }
    },

    /**
     * Символ разделителя
     */
    separator: {
      type: String,
      default: '>'
    },

    /**
     * Показывать кнопку "Назад"
     */
    showBackButton: {
      type: Boolean,
      default: true
    },

    /**
     * Дополнительные действия в навигации
     */
    additionalActions: {
      type: Array,
      default: () => []
    },

    /**
     * Состояние загрузки для текущего уровня
     */
    isLoading: {
      type: Boolean,
      default: false
    },

    /**
     * Максимальная длина текста в крошках
     */
    maxLabelLength: {
      type: Number,
      default: 30
    }
  },

  emits: [
    'navigate',     // Навигация к определенной крошке
    'back',         // Возврат назад
    'action'        // Выполнение дополнительного действия
  ],

  setup(props, { emit }) {
    // Вычисляемые свойства
    const truncatedBreadcrumbs = computed(() => {
      return props.breadcrumbs.map(crumb => ({
        ...crumb,
        label: truncateLabel(crumb.label, props.maxLabelLength)
      }));
    });

    const visibleBreadcrumbs = computed(() => {
      // Если крошек слишком много, показываем первые, последние и многоточие
      const crumbs = truncatedBreadcrumbs.value;
      if (crumbs.length <= 5) {
        return crumbs;
      }

      return [
        crumbs[0],
        { id: 'ellipsis-start', label: '...', isEllipsis: true },
        ...crumbs.slice(-3) // Последние 3 крошки
      ];
    });

    // Методы
    const truncateLabel = (label, maxLength) => {
      if (label.length <= maxLength) {
        return label;
      }
      return label.substring(0, maxLength - 3) + '...';
    };

    const handleNavigate = (crumb) => {
      if (crumb.action) {
        emit('navigate', crumb);
      }
    };

    const handleBack = () => {
      emit('back');
    };

    const handleAction = (action) => {
      emit('action', action);
    };

    return {
      visibleBreadcrumbs,
      handleNavigate,
      handleBack,
      handleAction
    };
  }
};
</script>

<style scoped>
.drilldown-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--um-bg-primary, #ffffff);
  border-bottom: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 8px 8px 0 0;
  position: relative;
  min-height: 48px;
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  flex: 1;
  min-width: 0;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  position: relative;
}

.breadcrumb-separator {
  margin: 0 8px;
  color: var(--um-text-secondary, #757575);
  font-size: 14px;
  font-weight: 400;
  user-select: none;
}

.breadcrumb-link,
.breadcrumb-current-text {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  text-decoration: none;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 400;
  color: var(--um-text-primary, #212121);
  max-width: 200px;
}

.breadcrumb-link:hover {
  background: var(--um-hover, rgba(33, 150, 243, 0.1));
  color: var(--um-primary, #2196f3);
}

.breadcrumb-link:focus {
  outline: 2px solid var(--um-primary, #2196f3);
  outline-offset: 2px;
}

.breadcrumb-link:active {
  background: var(--um-active, rgba(33, 150, 243, 0.2));
}

.breadcrumb-current-text {
  cursor: default;
  font-weight: 600;
  color: var(--um-text-primary, #212121);
  background: var(--um-bg-accent, #e3f2fd);
}

.breadcrumb-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.breadcrumb-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.breadcrumb-loading {
  display: flex;
  align-items: center;
  margin-left: 8px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--um-border-color, #e0e0e0);
  border-top: 2px solid var(--um-primary, #2196f3);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.back-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 6px;
  background: var(--um-bg-primary, #ffffff);
  color: var(--um-text-primary, #212121);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 16px;
}

.back-button:hover {
  background: var(--um-hover, rgba(33, 150, 243, 0.1));
  border-color: var(--um-primary, #2196f3);
  color: var(--um-primary, #2196f3);
}

.back-button:focus {
  outline: 2px solid var(--um-primary, #2196f3);
  outline-offset: 2px;
}

.back-button:active {
  background: var(--um-active, rgba(33, 150, 243, 0.2));
}

.back-icon {
  width: 18px;
  height: 18px;
}

.back-text {
  display: none;
}

@media (min-width: 768px) {
  .back-text {
    display: inline;
  }
}

.breadcrumb-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 6px;
  background: var(--um-bg-primary, #ffffff);
  color: var(--um-text-primary, #212121);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover:not(:disabled) {
  background: var(--um-hover, rgba(33, 150, 243, 0.1));
  border-color: var(--um-primary, #2196f3);
  color: var(--um-primary, #2196f3);
}

.action-button:focus {
  outline: 2px solid var(--um-primary, #2196f3);
  outline-offset: 2px;
}

.action-button:active:not(:disabled) {
  background: var(--um-active, rgba(33, 150, 243, 0.2));
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-icon {
  width: 16px;
  height: 16px;
}

.action-text {
  font-weight: 500;
}

/* Адаптивность */
@media (max-width: 768px) {
  .drilldown-navigation {
    padding: 8px 12px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .breadcrumb-list {
    order: 2;
    width: 100%;
    justify-content: center;
  }

  .breadcrumb-actions {
    order: 1;
  }

  .back-button {
    order: 3;
    margin-right: 0;
  }

  .breadcrumb-link,
  .breadcrumb-current-text {
    padding: 4px 6px;
    font-size: 13px;
    max-width: 120px;
  }

  .breadcrumb-separator {
    margin: 0 4px;
  }
}

@media (max-width: 480px) {
  .breadcrumb-list {
    gap: 2px;
  }

  .breadcrumb-link,
  .breadcrumb-current-text {
    max-width: 80px;
    font-size: 12px;
  }

  .action-button {
    padding: 6px;
  }

  .action-text {
    display: none;
  }
}

/* Темная тема */
@media (prefers-color-scheme: dark) {
  .drilldown-navigation {
    background: var(--um-bg-dark-primary, #1e1e1e);
    border-bottom-color: var(--um-border-dark-color, #424242);
  }

  .breadcrumb-separator {
    color: var(--um-text-dark-secondary, #b0b0b0);
  }

  .breadcrumb-link,
  .breadcrumb-current-text {
    color: var(--um-text-dark-primary, #ffffff);
  }

  .breadcrumb-current-text {
    background: var(--um-bg-dark-accent, #333333);
  }

  .back-button,
  .action-button {
    background: var(--um-bg-dark-primary, #2d2d2d);
    border-color: var(--um-border-dark-color, #424242);
    color: var(--um-text-dark-primary, #ffffff);
  }
}

/* Высокий контраст */
@media (prefers-contrast: high) {
  .breadcrumb-link:hover,
  .back-button:hover,
  .action-button:hover {
    border-width: 2px;
  }

  .breadcrumb-current-text {
    border: 2px solid var(--um-primary, #2196f3);
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .breadcrumb-link,
  .breadcrumb-current-text,
  .back-button,
  .action-button {
    transition: none;
  }

  .loading-spinner {
    animation: none;
  }
}
</style>