<template>
  <button
    :class="buttonClasses"
    @click="handleClick"
    :aria-label="ariaLabel"
    :title="title"
  >
    <span v-if="showIcon" class="back-button-icon">←</span>
    <span v-if="variant === 'header'" class="back-button-text">{{ text }}</span>
  </button>
</template>

<script>
import { computed } from 'vue';
import { useNavigation } from '@/composables/useNavigation.js';

/**
 * Переиспользуемый компонент кнопки "НАЗАД"
 * 
 * Поддерживает разные варианты отображения:
 * - В заголовке (header) - для десктопа/планшета
 * - Плавающая (floating) - для мобильных устройств
 * 
 * @component
 */
export default {
  name: 'BackButton',
  props: {
    /**
     * Вариант отображения кнопки
     * @type {'header' | 'floating'}
     */
    variant: {
      type: String,
      default: 'header',
      validator: (value) => ['header', 'floating'].includes(value)
    },
    /**
     * Текст кнопки (отображается только для варианта header)
     */
    text: {
      type: String,
      default: 'НАЗАД'
    },
    /**
     * Путь для возврата (если не указан, используется goBack())
     */
    to: {
      type: String,
      default: null
    },
    /**
     * Показывать иконку
     */
    showIcon: {
      type: Boolean,
      default: true
    },
    /**
     * ARIA label для доступности
     */
    ariaLabel: {
      type: String,
      default: 'Вернуться на главную'
    },
    /**
     * Title для подсказки
     */
    title: {
      type: String,
      default: 'Вернуться на главную'
    }
  },
  setup(props) {
    const { goBack, goHome } = useNavigation();
    
    /**
     * Классы кнопки в зависимости от варианта
     */
    const buttonClasses = computed(() => {
      const baseClass = props.variant === 'header' ? 'back-button' : 'floating-back-button';
      return [baseClass];
    });
    
    /**
     * Обработка клика по кнопке
     */
    const handleClick = () => {
      if (props.to) {
        goHome({ path: props.to });
      } else {
        goBack();
      }
    };
    
    return {
      buttonClasses,
      handleClick
    };
  }
};
</script>

<style scoped>
/* Стили для кнопки в заголовке */
.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.back-button:hover {
  background: #e0e0e0;
  border-color: #bbb;
}

.back-button:active {
  background: #d0d0d0;
}

.back-button-icon {
  font-size: 18px;
  line-height: 1;
}

.back-button-text {
  font-weight: 500;
}

/* Стили для плавающей кнопки */
.floating-back-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #2196F3; /* Акцентный цвет Bitrix24 */
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1000; /* Поверх всего контента */
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  line-height: 1;
}

.floating-back-button:hover {
  background: #1976D2;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.15);
  transform: scale(1.05);
}

.floating-back-button:active {
  background: #1565C0;
  transform: scale(0.95);
}

.floating-back-button .back-button-icon {
  font-size: 28px;
  line-height: 1;
  font-weight: bold;
}

/* Адаптивность */
@media (max-width: 768px) {
  .back-button {
    display: none;
  }
  
  .floating-back-button {
    display: flex;
  }
}

@media (min-width: 769px) {
  .back-button {
    display: flex;
  }
  
  .floating-back-button {
    display: none;
  }
}
</style>


