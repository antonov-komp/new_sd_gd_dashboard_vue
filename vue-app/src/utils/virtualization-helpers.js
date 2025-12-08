/**
 * Вспомогательные функции для виртуализации
 * 
 * Расположение: vue-app/src/utils/virtualization-helpers.js
 */

/**
 * Расчёт оптимальной высоты элемента на основе данных
 * 
 * @param {Object} item Элемент списка
 * @param {number} baseHeight Базовая высота
 * @returns {number} Вычисленная высота
 */
export function calculateItemHeight(item, baseHeight = 50) {
  // Можно добавить логику расчёта высоты на основе содержимого
  // Например, для логов с длинными деталями
  if (item.details && Object.keys(item.details).length > 5) {
    return baseHeight * 1.5;
  }
  
  return baseHeight;
}

/**
 * Получить индекс элемента по позиции скролла
 * 
 * @param {number} scrollTop Позиция скролла
 * @param {number} itemHeight Высота элемента
 * @returns {number} Индекс элемента
 */
export function getItemIndexByScroll(scrollTop, itemHeight) {
  return Math.floor(scrollTop / itemHeight);
}

/**
 * Получить позицию скролла для элемента
 * 
 * @param {number} index Индекс элемента
 * @param {number} itemHeight Высота элемента
 * @returns {number} Позиция скролла
 */
export function getScrollPositionByIndex(index, itemHeight) {
  return index * itemHeight;
}

export default {
  calculateItemHeight,
  getItemIndexByScroll,
  getScrollPositionByIndex
};




