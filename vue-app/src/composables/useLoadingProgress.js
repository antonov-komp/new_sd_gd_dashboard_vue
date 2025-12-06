/**
 * Композабл для управления прогрессом загрузки данных
 * 
 * Используется для отслеживания этапов загрузки, процента выполнения
 * и обработки ошибок в процессе загрузки данных дашборда.
 * 
 * @returns {object} Объект с реактивными данными и методами для управления прогрессом
 * @returns {import('vue').Ref<string|null>} returns.currentStep - Текущий этап загрузки
 * @returns {import('vue').Ref<number>} returns.progress - Процент выполнения (0-100)
 * @returns {import('vue').Ref<string|null>} returns.error - Сообщение об ошибке (критическая)
 * @returns {import('vue').Ref<string|null>} returns.temporaryError - Временная ошибка из колбэка прогресса
 * @returns {import('vue').ComputedRef<string|null>} returns.displayError - Отображаемая ошибка (критическая или временная)
 * @returns {import('vue').Ref<object>} returns.stepDetails - Детали текущего этапа
 * @returns {Function} returns.updateStep - Обновление текущего этапа
 * @returns {Function} returns.updateProgress - Обновление процента выполнения
 * @returns {Function} returns.setError - Установка критической ошибки
 * @returns {Function} returns.setTemporaryError - Установка временной ошибки
 * @returns {Function} returns.clearTemporaryError - Очистка временной ошибки
 * @returns {Function} returns.reset - Сброс всех значений прогресса
 * 
 * @example
 * const loadingProgress = useLoadingProgress();
 * 
 * // Обновление этапа
 * loadingProgress.updateStep('loading_tickets', {
 *   description: 'Загрузка тикетов...',
 *   count: 50,
 *   total: 100
 * });
 * 
 * // Обновление прогресса
 * loadingProgress.updateProgress(50);
 * 
 * // Обработка ошибки
 * loadingProgress.setError('Ошибка загрузки данных');
 * 
 * // Сброс
 * loadingProgress.reset();
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
   * @param {string} stepName - Название этапа (например, 'loading_tickets', 'filtering', 'grouping')
   * @param {object} [details={}] - Дополнительные детали этапа
   * @param {string} [details.description] - Описание этапа
   * @param {string} [details.stage] - ID стадии
   * @param {string} [details.stageName] - Название стадии
   * @param {number} [details.stageIndex] - Индекс стадии (1-based)
   * @param {number} [details.totalStages] - Общее количество стадий
   * @param {number} [details.count] - Количество загруженных элементов
   * @param {number} [details.total] - Общее количество элементов
   * @param {number} [details.filteredTickets] - Количество отфильтрованных тикетов
   * @param {number} [details.totalTickets] - Общее количество тикетов
   * @param {number} [details.employeeCount] - Количество сотрудников
   * @param {string} [details.warning] - Предупреждение (если есть)
   * 
   * @example
   * updateStep('loading_tickets', {
   *   description: 'Загрузка тикетов...',
   *   count: 50,
   *   total: 100
   * });
   */
  const updateStep = (stepName, details = {}) => {
    currentStep.value = stepName;
    stepDetails.value = details;
  };

  /**
   * Обновление процента выполнения
   * 
   * Автоматически ограничивает значение в диапазоне 0-100.
   * Если передан невалидный тип, устанавливается 0.
   * 
   * @param {number} percent - Процент выполнения (0-100)
   * 
   * @example
   * updateProgress(50); // Устанавливает прогресс 50%
   * updateProgress(150); // Ограничивается до 100%
   * updateProgress(-10); // Ограничивается до 0%
   */
  const updateProgress = (percent) => {
    // Проверяем, что percent - это число
    const numPercent = typeof percent === 'number' && !isNaN(percent) ? percent : 0;
    progress.value = Math.min(100, Math.max(0, numPercent));
  };

  /**
   * Установка критической ошибки (прерывает загрузку)
   * 
   * Критическая ошибка имеет приоритет над временной ошибкой.
   * При установке критической ошибки временная ошибка автоматически очищается.
   * 
   * @param {string} errorMessage - Сообщение об ошибке
   * 
   * @example
   * setError('Ошибка загрузки данных из Bitrix24');
   */
  const setError = (errorMessage) => {
    error.value = errorMessage;
    temporaryError.value = null; // Очищаем временную ошибку
  };

  /**
   * Установка временной ошибки (из колбэка прогресса, может быть очищена)
   * 
   * Временная ошибка отображается только если нет критической ошибки.
   * Может быть автоматически очищена при обновлении прогресса (если загрузка продолжается).
   * 
   * @param {string} errorMessage - Сообщение об ошибке
   * 
   * @example
   * setTemporaryError('Временная ошибка при загрузке батча');
   */
  const setTemporaryError = (errorMessage) => {
    temporaryError.value = errorMessage;
  };

  /**
   * Очистка временной ошибки (если загрузка продолжается успешно)
   * 
   * Используется для очистки временных ошибок, которые могут исчезнуть
   * при успешном продолжении загрузки (например, при обновлении прогресса).
   * 
   * @example
   * clearTemporaryError(); // Очищает временную ошибку
   */
  const clearTemporaryError = () => {
    temporaryError.value = null;
  };

  /**
   * Сброс всех значений прогресса
   * 
   * Сбрасывает все реактивные значения к начальному состоянию:
   * - currentStep → null
   * - progress → 0
   * - error → null
   * - temporaryError → null
   * - stepDetails → {}
   * 
   * Используется при завершении загрузки или при начале новой загрузки.
   * 
   * @example
   * reset(); // Сбрасывает все значения
   */
  const reset = () => {
    currentStep.value = null;
    progress.value = 0;
    error.value = null;
    temporaryError.value = null;
    stepDetails.value = {};
  };

  /**
   * Вычисляемое свойство для отображаемой ошибки
   * 
   * Возвращает критическую ошибку, если она есть, иначе временную ошибку.
   * Если обе ошибки отсутствуют, возвращает null.
   * 
   * @type {import('vue').ComputedRef<string|null>}
   * 
   * @example
   * // В шаблоне Vue
   * <div v-if="displayError">{{ displayError }}</div>
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

