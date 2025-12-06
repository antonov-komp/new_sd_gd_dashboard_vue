/**
 * Утилита для батч-загрузки данных
 * 
 * Оптимизирует загрузку данных, группируя запросы в батчи
 * и используя debounce для предотвращения множественных запросов
 */

/**
 * Debounce функция
 * 
 * Откладывает выполнение функции до тех пор, пока не пройдёт указанное время
 * без новых вызовов
 * 
 * @param {Function} func - Функция для выполнения
 * @param {number} wait - Время ожидания в миллисекундах
 * @returns {Function} Debounced функция
 */
export function debounce(func, wait = 300) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Группировка массива на батчи заданного размера
 * 
 * @param {Array} array - Массив для группировки
 * @param {number} batchSize - Размер батча
 * @returns {Array<Array>} Массив батчей
 */
export function batchArray(array, batchSize = 50) {
  const batches = [];
  
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  
  return batches;
}

/**
 * Последовательное выполнение промисов с задержкой
 * 
 * Выполняет промисы последовательно с указанной задержкой между ними
 * 
 * @param {Array<Function>} promiseFactories - Массив функций, возвращающих промисы
 * @param {number} delay - Задержка между промисами в миллисекундах
 * @returns {Promise<Array>} Массив результатов
 */
export async function executeSequentially(promiseFactories, delay = 100) {
  const results = [];
  
  for (const factory of promiseFactories) {
    const result = await factory();
    results.push(result);
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
}

/**
 * Параллельное выполнение промисов с ограничением количества одновременных
 * 
 * @param {Array<Function>} promiseFactories - Массив функций, возвращающих промисы
 * @param {number} concurrency - Максимальное количество одновременных промисов
 * @returns {Promise<Array>} Массив результатов
 */
export async function executeWithConcurrency(promiseFactories, concurrency = 5) {
  const results = [];
  const executing = [];
  
  for (const factory of promiseFactories) {
    const promise = factory().then(result => {
      executing.splice(executing.indexOf(promise), 1);
      return result;
    });
    
    results.push(promise);
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
}


