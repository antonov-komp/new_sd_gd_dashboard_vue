<template>
  <div class="loading-preloader" :class="{ 'has-error': error }">
    <!-- Подложка (фон) -->
    <div class="preloader-backdrop">
      <!-- Фиксированный контейнер -->
      <div class="preloader-container">
        <!-- Контент с прокруткой -->
        <div class="preloader-content-scrollable">
          <!-- Спиннер -->
          <div class="spinner-container" v-if="!error">
            <div class="spinner"></div>
          </div>
          
          <!-- Контент -->
          <div class="preloader-content">
            <h3 class="step-title">{{ stepTitle }}</h3>
            <p class="step-description" v-if="stepDescription">
              {{ stepDescription }}
            </p>
            
            <!-- Прогресс-бар -->
            <div class="progress-container" v-if="!error">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: displayProgress + '%' }"
                ></div>
              </div>
              <span class="progress-text">{{ displayProgress }}%</span>
            </div>
            
            <!-- Детали этапа -->
            <div class="step-details" v-if="!error">
              <!-- Дополнительное описание этапа (из details.description) -->
              <div v-if="details.description" class="detail-description">
                {{ details.description }}
              </div>
              
              <!-- Информация о загрузке тикетов -->
              <div v-if="details.count !== undefined" class="detail-item">
                <span class="detail-label">Загружено тикетов:</span>
                <span class="detail-value">{{ details.count }}</span>
                <span v-if="details.total !== undefined" class="detail-total"> из {{ details.total }}</span>
              </div>
              
              <!-- Информация о фильтрации -->
              <div v-if="details.filteredTickets !== undefined" class="detail-item">
                <span class="detail-label">Отфильтровано тикетов:</span>
                <span class="detail-value">{{ details.filteredTickets }}</span>
                <span v-if="details.totalTickets !== undefined" class="detail-total"> из {{ details.totalTickets }}</span>
              </div>
              
              <!-- Информация о стадии -->
              <div v-if="details.stage" class="detail-item">
                <span class="detail-label">Стадия:</span>
                <span class="detail-value">{{ getStageDisplayName(details.stage) }}</span>
                <span v-if="details.stageIndex && details.totalStages" class="detail-total">
                  ({{ details.stageIndex }}/{{ details.totalStages }})
                </span>
              </div>
              
              <!-- Информация о сотрудниках -->
              <div v-if="details.employeeCount !== undefined" class="detail-item">
                <span class="detail-label">Сотрудников:</span>
                <span class="detail-value">{{ details.employeeCount }}</span>
              </div>
              
              <!-- Предупреждение (если есть) -->
              <div v-if="details.warning" class="detail-warning">
                <span>⚠️ {{ details.warning }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Ошибка (отдельно, не влияет на размер контейнера) -->
    <div class="error-container" v-if="error">
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <p class="error-message">{{ error }}</p>
        <button @click="handleRetry" class="retry-button">
          Повторить попытку
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';

/**
 * Маппинг этапов на тексты для пользователя
 */
const STEP_TEXTS = {
  cache_check: {
    title: 'Проверка кеша',
    description: 'Поиск сохранённых данных...'
  },
  cache_hit: {
    title: 'Данные загружены',
    description: 'Мгновенная загрузка...'
  },
  loading_tickets: {
    title: 'Загрузка тикетов',
    description: 'Получение данных из Bitrix24...'
  },
  filtering: {
    title: 'Фильтрация тикетов',
    description: 'Отбор тикетов сектора 1С...'
  },
  extracting_employees: {
    title: 'Определение сотрудников',
    description: 'Анализ назначенных сотрудников...'
  },
  loading_employees: {
    title: 'Загрузка данных сотрудников',
    description: 'Получение информации о сотрудниках...'
  },
  grouping: {
    title: 'Группировка данных',
    description: 'Распределение тикетов по этапам...'
  },
  caching: {
    title: 'Сохранение в кеш',
    description: 'Оптимизация для следующих загрузок...'
  },
  complete: {
    title: 'Готово!',
    description: 'Дашборд загружен'
  },
  error: {
    title: 'Ошибка загрузки',
    description: 'Не удалось загрузить данные'
  }
};

/**
 * Компонент анимированного прелоадера для дашборда сектора 1С
 * 
 * Отображает:
 * - Анимацию загрузки (спиннер)
 * - Текущий этап загрузки
 * - Прогресс-бар с процентом выполнения
 * - Детали этапа (количество элементов)
 * - Обработку ошибок с возможностью повтора
 * 
 * @component
 */
export default {
  name: 'LoadingPreloader',
  props: {
    /**
     * Текущий этап загрузки
     */
    currentStep: {
      type: String,
      default: null
    },
    /**
     * Процент выполнения (0-100)
     */
    progress: {
      type: Number,
      default: 0
    },
    /**
     * Детали текущего этапа (количество элементов, название стадии и т.д.)
     */
    stepDetails: {
      type: Object,
      default: () => ({})
    },
    /**
     * Сообщение об ошибке (если есть)
     */
    error: {
      type: String,
      default: null
    }
  },
  emits: ['retry'],
  setup(props, { emit }) {
    
    /**
     * Получение информации об этапе из маппинга
     */
    const stepInfo = computed(() => {
      // Если есть описание в details, используем его
      if (props.stepDetails && typeof props.stepDetails === 'object' && props.stepDetails.description) {
        return {
          title: props.currentStep ? (STEP_TEXTS[props.currentStep]?.title || props.currentStep) : 'Загрузка...',
          description: props.stepDetails.description
        };
      }
      
      if (!props.currentStep) {
        return { title: 'Загрузка...', description: 'Инициализация...' };
      }
      
      // Если этап найден в маппинге, возвращаем его
      if (STEP_TEXTS[props.currentStep]) {
        return STEP_TEXTS[props.currentStep];
      }
      
      // Если этап не найден, пытаемся преобразовать английское название в русское
      const stepName = props.currentStep;
      const fallbackTexts = {
        'loading_tickets': { title: 'Загрузка тикетов', description: 'Получение данных из Bitrix24...' },
        'filtering': { title: 'Фильтрация тикетов', description: 'Отбор тикетов сектора 1С...' },
        'extracting_employees': { title: 'Определение сотрудников', description: 'Анализ назначенных сотрудников...' },
        'loading_employees': { title: 'Загрузка данных сотрудников', description: 'Получение информации о сотрудниках...' },
        'grouping': { title: 'Группировка данных', description: 'Распределение тикетов по этапам...' },
        'caching': { title: 'Сохранение в кеш', description: 'Оптимизация для следующих загрузок...' },
        'cache_check': { title: 'Проверка кеша', description: 'Поиск сохранённых данных...' },
        'cache_hit': { title: 'Данные загружены', description: 'Мгновенная загрузка...' },
        'complete': { title: 'Готово!', description: 'Дашборд загружен' },
        'error': { title: 'Ошибка загрузки', description: 'Не удалось загрузить данные' }
      };
      
      return fallbackTexts[stepName] || { 
        title: 'Загрузка...', 
        description: 'Пожалуйста, подождите...' 
      };
    });
    
    /**
     * Заголовок текущего этапа
     */
    const stepTitle = computed(() => stepInfo.value.title);
    
    /**
     * Описание текущего этапа
     */
    const stepDescription = computed(() => stepInfo.value.description);
    
    /**
     * Детали этапа (для удобства доступа)
     */
    const details = computed(() => props.stepDetails);
    
    /**
     * Отображаемый прогресс (с проверкой на NaN и undefined)
     */
    const displayProgress = computed(() => {
      const progressValue = props.progress;
      if (progressValue === undefined || progressValue === null || isNaN(progressValue)) {
        return 0;
      }
      return Math.round(Math.max(0, Math.min(100, progressValue)));
    });
    
    /**
     * Получение отображаемого названия стадии (перевод на русский)
     * 
     * @param {string} stage - Название стадии (может быть на английском или русском)
     * @returns {string} Отображаемое название стадии
     */
    const getStageDisplayName = (stage) => {
      if (!stage) return '';
      
      // Маппинг английских названий стадий на русские
      const stageNames = {
        'DT140_12:UC_0VHWE2': 'Сформировано обращение',
        'DT140_12:PREPARATION': 'Рассмотрение ТЗ',
        'DT140_12:CLIENT': 'Исполнение',
        'Сформировано обращение': 'Сформировано обращение',
        'Рассмотрение ТЗ': 'Рассмотрение ТЗ',
        'Исполнение': 'Исполнение'
      };
      
      return stageNames[stage] || stage;
    };

    /**
     * Обработка нажатия на кнопку "Повторить попытку"
     */
    const handleRetry = () => {
      // Эмитим событие для родительского компонента
      emit('retry');
    };

    return {
      stepTitle,
      stepDescription,
      details,
      displayProgress,
      getStageDisplayName,
      handleRetry
    };
  }
};
</script>

<style scoped>
.loading-preloader {
  position: relative;
}

/* Подложка (фон) */
.preloader-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

/* Фиксированный контейнер */
.preloader-container {
  width: 550px;
  min-height: 400px;
  max-height: 500px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Прокручиваемый контент */
.preloader-content-scrollable {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0; /* Важно для правильной работы flex с overflow */
}

.spinner-container {
  margin-bottom: 30px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.preloader-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
}

.step-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.step-description {
  font-size: 14px;
  color: #666;
  margin: 0;
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.progress-container {
  margin: 20px 0;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-text {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.step-details {
  margin-top: 10px;
  font-size: 13px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.detail-description {
  color: #666;
  margin-bottom: 10px;
  font-style: italic;
  font-size: 13px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
}

.detail-label {
  color: #666;
  font-weight: 500;
}

.detail-value {
  color: #333;
  font-weight: 600;
}

.detail-total {
  color: #999;
}

.detail-warning {
  margin-top: 10px;
  padding: 8px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  color: #856404;
  font-size: 12px;
}

.error-container {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  text-align: center;
  border: 2px solid #dc3545;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.error-message {
  color: #dc3545;
  font-size: 14px;
  margin: 0 0 15px 0;
  font-weight: 500;
}

.retry-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.retry-button:hover {
  background: #0056b3;
}

.retry-button:active {
  transform: scale(0.98);
}

/* Стилизация скроллбара */
.preloader-content-scrollable::-webkit-scrollbar {
  width: 6px;
}

.preloader-content-scrollable::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.preloader-content-scrollable::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.preloader-content-scrollable::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* Адаптивность для мобильных устройств */
@media (max-width: 768px) {
  .preloader-container {
    width: 90%;
    max-width: 500px;
    min-height: 350px;
    max-height: 450px;
  }
  
  .preloader-content-scrollable {
    padding: 20px;
  }
  
  .step-title {
    font-size: 16px;
  }
  
  .step-description {
    font-size: 13px;
  }
  
  .error-container {
    max-width: 90%;
    padding: 15px;
  }
}
</style>

