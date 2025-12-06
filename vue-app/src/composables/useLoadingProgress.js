/**
 * Композабл для управления прогрессом загрузки данных
 * 
 * Используется для отслеживания этапов загрузки, процента выполнения
 * и обработки ошибок в процессе загрузки данных дашборда
 * 
 * @returns {object} Объект с реактивными данными и методами для управления прогрессом
 */

import { ref, computed } from 'vue';

/**
 * Композабл для управления прогрессом загрузки
 * 
 * @returns {object} Объект с методами и реактивными данными
 */
export function useLoadingProgress() {
  /**
   * Текущий этап загрузки (например, 'loading_tickets', 'filtering')
   * @type {import('vue').Ref<string|null>}
   */
  const currentStep = ref(null);
  
  /**
   * Процент выполнения (0-100)
   * @type {import('vue').Ref<number>}
   */
  const progress = ref(0);
  
  /**
   * Сообщение об ошибке (если есть)
   * @type {import('vue').Ref<string|null>}
   */
  const error = ref(null);
  
  /**
   * Временная ошибка из колбэка прогресса (может быть очищена, если загрузка продолжается)
   * @type {import('vue').Ref<string|null>}
   */
  const temporaryError = ref(null);
  
  /**
   * Детали текущего этапа (количество элементов, описание и т.д.)
   * @type {import('vue').Ref<object>}
   */
  const stepDetails = ref({});

  /**
   * Обновление текущего этапа загрузки
   * 
   * @param {string} stepName - Название этапа
   * @param {object} details - Дополнительные детали этапа (опционально)
   */
  const updateStep = (stepName, details = {}) => {
    console.log('useLoadingProgress.updateStep called:', stepName, details);
    currentStep.value = stepName;
    stepDetails.value = details;
    console.log('useLoadingProgress: currentStep.value =', currentStep.value);
    console.log('useLoadingProgress: stepDetails.value =', stepDetails.value);
  };

  /**
   * Обновление процента выполнения
   * 
   * @param {number} percent - Процент выполнения (0-100)
   */
  const updateProgress = (percent) => {
    console.log('useLoadingProgress.updateProgress called:', percent);
    // Проверяем, что percent - это число
    const numPercent = typeof percent === 'number' && !isNaN(percent) ? percent : 0;
    progress.value = Math.min(100, Math.max(0, numPercent));
    console.log('useLoadingProgress: progress.value =', progress.value);
  };

  /**
   * Установка ошибки (критическая ошибка, которая прерывает загрузку)
   * 
   * @param {string} errorMessage - Сообщение об ошибке
   */
  const setError = (errorMessage) => {
    error.value = errorMessage;
    temporaryError.value = null; // Очищаем временную ошибку
  };

  /**
   * Установка временной ошибки (из колбэка прогресса, может быть очищена)
   * 
   * @param {string} errorMessage - Сообщение об ошибке
   */
  const setTemporaryError = (errorMessage) => {
    temporaryError.value = errorMessage;
  };

  /**
   * Очистка временной ошибки (если загрузка продолжается успешно)
   */
  const clearTemporaryError = () => {
    temporaryError.value = null;
  };

  /**
   * Сброс всех значений прогресса
   */
  const reset = () => {
    currentStep.value = null;
    progress.value = 0;
    error.value = null;
    temporaryError.value = null;
    stepDetails.value = {};
  };

  /**
   * Получение отображаемой ошибки (критическая или временная)
   */
  const displayError = computed(() => {
    return error.value || temporaryError.value;
  });

  return {
    currentStep,
    progress,
    error,
    temporaryError,
    displayError,
    stepDetails,
    updateStep,
    updateProgress,
    setError,
    setTemporaryError,
    clearTemporaryError,
    reset
  };
}

