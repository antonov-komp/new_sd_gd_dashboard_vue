/**
 * Композабл для работы с уведомлениями Bitrix24
 * 
 * Обёртка над BX.UI.Notification для удобного использования в компонентах
 */

/**
 * Композабл для уведомлений
 * 
 * @returns {object} Объект с методами для показа уведомлений
 */
export function useNotifications() {
  /**
   * Показ уведомления
   * 
   * @param {string} message - Текст уведомления
   * @param {string} type - Тип уведомления ('success', 'error', 'info', 'warning')
   * @param {number} duration - Длительность показа в миллисекундах (по умолчанию 5000)
   */
  const notify = (message, type = 'info', duration = 5000) => {
    if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
      BX.UI.Notification.Center.notify({
        content: message,
        autoHideDelay: duration
      });
    } else {
      // Fallback для окружений без Bitrix24
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  };

  /**
   * Показ уведомления об успехе
   * 
   * @param {string} message - Текст уведомления
   * @param {number} duration - Длительность показа
   */
  const success = (message, duration = 3000) => {
    notify(message, 'success', duration);
  };

  /**
   * Показ уведомления об ошибке
   * 
   * @param {string} message - Текст уведомления
   * @param {number} duration - Длительность показа
   */
  const error = (message, duration = 5000) => {
    notify(message, 'error', duration);
  };

  /**
   * Показ информационного уведомления
   * 
   * @param {string} message - Текст уведомления
   * @param {number} duration - Длительность показа
   */
  const info = (message, duration = 4000) => {
    notify(message, 'info', duration);
  };

  /**
   * Показ предупреждения
   * 
   * @param {string} message - Текст уведомления
   * @param {number} duration - Длительность показа
   */
  const warning = (message, duration = 4000) => {
    notify(message, 'warning', duration);
  };

  return {
    notify,
    success,
    error,
    info,
    warning
  };
}

