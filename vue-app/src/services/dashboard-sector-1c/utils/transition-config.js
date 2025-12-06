/**
 * Конфигурация transitions для дашборда сектора 1С
 * 
 * Содержит тайминги, easing функции и задержки для всех transitions
 * 
 * Текущие значения взяты из реального кода:
 * - DashboardSector1C.vue: CSS transitions (строки 272-300)
 * - useDashboardActions.js: JavaScript тайминги (строки 102-116)
 */

/**
 * Конфигурация transition прелоадера
 * 
 * Соответствует текущей реализации в TASK-011:
 * - fade-out прелоадера: 400мс (строка 273 DashboardSector1C.vue)
 * - fade-in дашборда: 400мс (строка 288 DashboardSector1C.vue)
 * - задержка между fade-out и fade-in: 150мс (строка 289 DashboardSector1C.vue, строка 107 useDashboardActions.js)
 * - показ "Готово!": 800мс (строка 102 useDashboardActions.js)
 */
export const PRELOADER_TRANSITION = {
  /** Длительность fade-out прелоадера (мс) - соответствует 0.4s в CSS */
  fadeOutDuration: 400,
  /** Длительность fade-in дашборда (мс) - соответствует 0.4s в CSS */
  fadeInDuration: 400,
  /** Задержка между началом fade-out и fade-in (мс) - соответствует 0.15s в CSS */
  delayBetween: 150,
  /** Время показа "Готово!" перед началом перехода (мс) - соответствует 800мс в JS */
  readyDisplayTime: 800,
  /** Easing функция для fade-out - соответствует ease-out в CSS */
  fadeOutEasing: 'ease-out',
  /** Easing функция для fade-in - соответствует ease-in в CSS */
  fadeInEasing: 'ease-in',
  /** Transform для fade-out - соответствует scale(0.95) в CSS */
  fadeOutTransform: 'scale(0.95)',
  /** Transform для fade-in - соответствует translateY(10px) в CSS */
  fadeInTransform: 'translateY(10px)'
};

/**
 * Конфигурация transition дашборда
 */
export const DASHBOARD_TRANSITION = {
  /** Длительность fade-in (мс) */
  fadeInDuration: 400,
  /** Easing функция */
  fadeInEasing: 'ease-in',
  /** Transform для fade-in */
  fadeInTransform: 'translateY(10px)'
};

/**
 * Получение CSS transition строки
 * 
 * @param {number} duration - Длительность (мс)
 * @param {string} easing - Easing функция
 * @param {string} properties - Свойства для transition (по умолчанию 'opacity, transform')
 * @returns {string} CSS transition строка
 * 
 * @example
 * getTransitionString(400, 'ease-out'); // 'opacity, transform 400ms ease-out'
 */
export function getTransitionString(duration, easing, properties = 'opacity, transform') {
  return `${properties} ${duration}ms ${easing}`;
}

/**
 * Получение CSS transition для прелоадера fade-out
 * 
 * @returns {string} CSS transition строка
 * 
 * @example
 * const transition = getPreloaderFadeOutTransition();
 * // 'opacity, transform 400ms ease-out'
 */
export function getPreloaderFadeOutTransition() {
  return getTransitionString(
    PRELOADER_TRANSITION.fadeOutDuration,
    PRELOADER_TRANSITION.fadeOutEasing
  );
}

/**
 * Получение CSS transition для дашборда fade-in
 * 
 * @returns {string} CSS transition строка
 * 
 * @example
 * const transition = getDashboardFadeInTransition();
 * // 'opacity, transform 400ms ease-in'
 */
export function getDashboardFadeInTransition() {
  return getTransitionString(
    DASHBOARD_TRANSITION.fadeInDuration,
    DASHBOARD_TRANSITION.fadeInEasing
  );
}

