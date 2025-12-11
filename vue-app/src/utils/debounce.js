/**
 * Утилита дебаунса
 * 
 * Откладывает выполнение функции до истечения указанного времени
 * после последнего вызова.
 * 
 * @param {Function} func - Функция для дебаунса
 * @param {number} wait - Задержка в миллисекундах (по умолчанию 300ms)
 * @returns {Function} Дебаунсированная функция
 * 
 * @example
 * const debouncedSearch = debounce((query) => {
 *   console.log('Searching for:', query);
 * }, 300);
 * 
 * debouncedSearch('test'); // Вызовется через 300ms после последнего вызова
 */
export function debounce(func, wait = 300) {
  let timeoutId;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeoutId);
      func(...args);
    };
    
    clearTimeout(timeoutId);
    timeoutId = setTimeout(later, wait);
  };
}
