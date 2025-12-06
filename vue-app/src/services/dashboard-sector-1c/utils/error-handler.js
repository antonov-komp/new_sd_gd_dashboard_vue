/**
 * Утилиты для обработки ошибок дашборда сектора 1С
 */

/**
 * Обработка ошибок API
 * 
 * @param {Error} error - Ошибка
 * @param {string} context - Контекст ошибки (например, 'loading tickets')
 * @returns {string} Сообщение об ошибке для пользователя
 */
export function handleApiError(error, context = '') {
  console.error(`API Error ${context ? `(${context})` : ''}:`, error);

  // Определяем тип ошибки и возвращаем понятное сообщение
  if (error.message) {
    if (error.message.includes('HTTP error')) {
      return 'Ошибка соединения с сервером. Проверьте подключение к интернету.';
    }
    if (error.message.includes('timeout')) {
      return 'Превышено время ожидания ответа. Попробуйте позже.';
    }
    if (error.message.includes('403') || error.message.includes('401')) {
      return 'Ошибка доступа. Проверьте права доступа.';
    }
    if (error.message.includes('500')) {
      return 'Ошибка на сервере. Обратитесь к администратору.';
    }
  }

  return error.message || 'Произошла неизвестная ошибка';
}

/**
 * Обработка ошибок валидации
 * 
 * @param {Array<string>} errors - Массив ошибок валидации
 * @returns {string} Сообщение об ошибках
 */
export function handleValidationError(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return 'Ошибка валидации данных';
  }

  return errors.join(', ');
}

/**
 * Логирование ошибки с контекстом
 * 
 * @param {Error} error - Ошибка
 * @param {string} context - Контекст ошибки
 * @param {object} additionalData - Дополнительные данные
 */
export function logError(error, context = '', additionalData = {}) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    context,
    ...additionalData,
    timestamp: new Date().toISOString()
  };

  console.error('Error logged:', errorInfo);

  // Здесь можно добавить отправку ошибок на сервер для мониторинга
  // Например, через специальный API endpoint
}

/**
 * Обработка ошибки с показом уведомления
 * 
 * @param {Error} error - Ошибка
 * @param {string} context - Контекст ошибки
 * @param {Function} showNotification - Функция для показа уведомления
 */
export function handleErrorWithNotification(error, context = '', showNotification = null) {
  const message = handleApiError(error, context);
  
  logError(error, context);

  if (showNotification && typeof showNotification === 'function') {
    showNotification(message, 'error');
  } else if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
    BX.UI.Notification.Center.notify({
      content: message,
      autoHideDelay: 5000
    });
  }
}


