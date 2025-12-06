import { ref, computed } from 'vue';
import { PRELOADER_TRANSITION } from '@/services/dashboard-sector-1c/utils/transition-config.js';

/**
 * Композабл для управления transitions
 * 
 * Предоставляет методы для управления состоянием transitions:
 * - startTransition() - начать transition
 * - endTransition() - завершить transition
 * - executeTransition() - выполнить transition с таймингами из конфигурации
 * - isTransitioning - реактивное состояние
 * 
 * @returns {object} Объект с методами и состоянием transitions
 * 
 * @example
 * const { isTransitioning, executeTransition } = useTransition();
 * 
 * executeTransition(
 *   () => {
 *     // Начало fade-out
 *   },
 *   () => {
 *     // Начало fade-in
 *   },
 *   PRELOADER_TRANSITION
 * );
 */
export function useTransition() {
  const isTransitioning = ref(false);
  const transitionStartTime = ref(null);
  
  /**
   * Начать transition
   * 
   * @param {Function} callback - Колбэк, вызываемый после начала transition
   */
  const startTransition = (callback) => {
    isTransitioning.value = true;
    transitionStartTime.value = Date.now();
    
    if (callback) {
      callback();
    }
  };
  
  /**
   * Завершить transition
   * 
   * @param {Function} callback - Колбэк, вызываемый после завершения transition
   */
  const endTransition = (callback) => {
    isTransitioning.value = false;
    transitionStartTime.value = null;
    
    if (callback) {
      callback();
    }
  };
  
  /**
   * Выполнить transition с таймингами из конфигурации
   * 
   * Управляет последовательностью анимаций:
   * 1. Начинает fade-out (устанавливает isTransitioning = true)
   * 2. Через delayBetween начинает fade-in (вызывает endCallback)
   * 3. После fadeOutDuration завершает transition (устанавливает isTransitioning = false)
   * 
   * @param {Function} startCallback - Колбэк при начале transition (начало fade-out)
   * @param {Function} endCallback - Колбэк при начале fade-in (через delayBetween)
   * @param {object} config - Конфигурация transition (по умолчанию PRELOADER_TRANSITION)
   * 
   * @example
   * executeTransition(
   *   () => {
   *     // Начало fade-out прелоадера
   *   },
   *   () => {
   *     // Начало fade-in дашборда
   *     state.isLoading.value = false;
   *   },
   *   PRELOADER_TRANSITION
   * );
   */
  const executeTransition = (startCallback, endCallback, config = PRELOADER_TRANSITION) => {
    startTransition(() => {
      if (startCallback) {
        startCallback();
      }
      
      // Задержка между началом fade-out и fade-in
      setTimeout(() => {
        if (endCallback) {
          endCallback();
        }
      }, config.delayBetween);
      
      // Завершение transition после fade-out
      setTimeout(() => {
        endTransition();
      }, config.fadeOutDuration);
    });
  };
  
  /**
   * Длительность transition (мс)
   * 
   * Вычисляет, сколько времени прошло с начала transition
   * 
   * @type {import('vue').ComputedRef<number>}
   */
  const transitionDuration = computed(() => {
    if (!transitionStartTime.value) {
      return 0;
    }
    return Date.now() - transitionStartTime.value;
  });
  
  return {
    /** Реактивное состояние перехода */
    isTransitioning: computed(() => isTransitioning.value),
    /** Начать transition */
    startTransition,
    /** Завершить transition */
    endTransition,
    /** Выполнить transition с таймингами из конфигурации */
    executeTransition,
    /** Длительность transition (мс) */
    transitionDuration
  };
}

