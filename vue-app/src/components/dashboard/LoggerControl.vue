<template>
  <div class="logger-control" v-if="showControl">
    <div class="logger-control-header">
      <h3 class="logger-control-title">Управление логированием</h3>
      <button 
        class="logger-control-toggle"
        @click="toggleVisibility"
        :aria-label="isExpanded ? 'Свернуть' : 'Развернуть'"
      >
        {{ isExpanded ? '▼' : '▶' }}
      </button>
    </div>
    
    <div v-if="isExpanded" class="logger-control-content">
      <div class="logger-control-section">
        <label class="logger-control-label">
          <input 
            type="checkbox" 
            v-model="enabled"
            @change="handleToggle"
            class="logger-control-checkbox"
          />
          <span class="logger-control-label-text">Включить логирование</span>
        </label>
      </div>
      
      <div v-if="enabled" class="logger-control-section">
        <label class="logger-control-label">
          <span class="logger-control-label-text">Уровень логирования:</span>
          <select 
            v-model="level"
            @change="handleLevelChange"
            class="logger-control-select"
          >
            <option value="NONE">Отключено</option>
            <option value="ERROR">Только ошибки</option>
            <option value="WARN">Предупреждения и ошибки</option>
            <option value="INFO">Информация, предупреждения и ошибки</option>
            <option value="DEBUG">Все логи (отладка)</option>
          </select>
        </label>
      </div>
      
      <div v-if="enabled" class="logger-control-info">
        <span class="logger-control-info-text">
          Текущий уровень: <strong>{{ getLevelDescription(level) }}</strong>
        </span>
      </div>
      
      <div v-if="enabled" class="logger-control-section">
        <button 
          @click="resetToDefault"
          class="logger-control-reset-btn"
          title="Сбросить к значению по умолчанию"
        >
          Сбросить к умолчанию
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { LoggerConfig } from '@/services/dashboard-sector-1c/utils/logger-config.js';

/**
 * Компонент для управления логированием дашборда сектора 1С
 * 
 * Позволяет:
 * - Включать/отключать логирование
 * - Выбирать уровень логирования (NONE, ERROR, WARN, INFO, DEBUG)
 * - Сохранять настройки в localStorage
 * 
 * По умолчанию скрыт (showControl: false)
 * Можно показывать только в режиме разработки
 */
export default {
  name: 'LoggerControl',
  props: {
    /**
     * Показывать ли компонент управления логированием
     * 
     * @type {boolean}
     * @default false
     */
    showControl: {
      type: Boolean,
      default: false
    }
  },
  setup() {
    const enabled = ref(false);
    const level = ref('ERROR');
    const isExpanded = ref(true);
    
    /**
     * Получение описания уровня логирования
     * 
     * @param {string} levelValue - Значение уровня
     * @returns {string} Описание уровня
     */
    const getLevelDescription = (levelValue) => {
      const descriptions = {
        'NONE': 'Отключено',
        'ERROR': 'Только ошибки',
        'WARN': 'Предупреждения и ошибки',
        'INFO': 'Информация, предупреждения и ошибки',
        'DEBUG': 'Все логи (отладка)'
      };
      return descriptions[levelValue] || levelValue;
    };
    
    /**
     * Инициализация компонента
     * Загружает текущий уровень логирования из localStorage
     */
    onMounted(() => {
      const currentLevel = LoggerConfig.getLevel();
      level.value = currentLevel;
      enabled.value = currentLevel !== 'NONE';
    });
    
    /**
     * Обработка переключения включения/отключения логирования
     */
    const handleToggle = () => {
      if (!enabled.value) {
        // Отключаем логирование
        LoggerConfig.setLevel('NONE');
        level.value = 'NONE';
      } else {
        // Включаем логирование с текущим уровнем
        // Если уровень был NONE, устанавливаем ERROR по умолчанию
        if (level.value === 'NONE') {
          level.value = import.meta.env?.MODE === 'production' ? 'ERROR' : 'DEBUG';
        }
        LoggerConfig.setLevel(level.value);
      }
    };
    
    /**
     * Обработка изменения уровня логирования
     */
    const handleLevelChange = () => {
      if (enabled.value) {
        LoggerConfig.setLevel(level.value);
      }
    };
    
    /**
     * Сброс к значению по умолчанию
     */
    const resetToDefault = () => {
      const defaultLevel = import.meta.env?.MODE === 'production' ? 'ERROR' : 'DEBUG';
      level.value = defaultLevel;
      enabled.value = true;
      LoggerConfig.setLevel(defaultLevel);
    };
    
    /**
     * Переключение видимости панели управления
     */
    const toggleVisibility = () => {
      isExpanded.value = !isExpanded.value;
    };
    
    return {
      enabled,
      level,
      isExpanded,
      getLevelDescription,
      handleToggle,
      handleLevelChange,
      resetToDefault,
      toggleVisibility
    };
  }
};
</script>

<style scoped>
.logger-control {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 280px;
  max-width: 350px;
  font-size: 14px;
}

.logger-control-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.logger-control-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.logger-control-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.logger-control-toggle:hover {
  background-color: #f5f5f5;
}

.logger-control-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.logger-control-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.logger-control-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.logger-control-label-text {
  font-size: 14px;
  color: #333;
  user-select: none;
}

.logger-control-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.logger-control-select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.logger-control-select:hover {
  border-color: #007bff;
}

.logger-control-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.logger-control-info {
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #007bff;
}

.logger-control-info-text {
  font-size: 13px;
  color: #666;
}

.logger-control-info-text strong {
  color: #007bff;
  font-weight: 600;
}

.logger-control-reset-btn {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.logger-control-reset-btn:hover {
  background: #5a6268;
}

.logger-control-reset-btn:active {
  background: #545b62;
}

/* Адаптивность для мобильных устройств */
@media (max-width: 768px) {
  .logger-control {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
    min-width: auto;
  }
}
</style>

