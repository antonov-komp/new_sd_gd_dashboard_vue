/**
 * Утилита для debounce функции
 * 
 * @param {Function} func - Функция для debounce
 * @param {number} wait - Время ожидания в миллисекундах
 * @param {boolean} immediate - Выполнить немедленно при первом вызове
 * @returns {Function} Debounced функция
 */
export function debounce(func, wait = 300, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * Утилита для throttle функции
 * 
 * @param {Function} func - Функция для throttle
 * @param {number} limit - Лимит времени в миллисекундах
 * @returns {Function} Throttled функция
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

