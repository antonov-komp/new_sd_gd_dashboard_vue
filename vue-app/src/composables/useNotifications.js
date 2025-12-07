import { ref } from 'vue';

const notifications = ref([]);
let notificationIdCounter = 0;

/**
 * Composable для управления уведомлениями
 */
export function useNotifications() {
  /**
   * Показать уведомление
   * 
   * @param {string} message Текст уведомления
   * @param {string} type Тип (success, error, warning, info)
   * @param {number} duration Длительность в мс (0 = не скрывать автоматически)
   * @returns {number} ID уведомления
   */
  const showNotification = (message, type = 'info', duration = 3000) => {
    const id = ++notificationIdCounter;
    const notification = {
      id,
      message,
      type,
      duration,
      timestamp: Date.now()
    };

    notifications.value.push(notification);

    // Автоматическое скрытие
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  };

  /**
   * Удалить уведомление
   * 
   * @param {number} id ID уведомления
   */
  const removeNotification = (id) => {
    const index = notifications.value.findIndex(n => n.id === id);
    if (index > -1) {
      notifications.value.splice(index, 1);
    }
  };

  /**
   * Очистить все уведомления
   */
  const clearNotifications = () => {
    notifications.value = [];
  };

  /**
   * Успешное уведомление
   */
  const success = (message, duration = 3000) => {
    return showNotification(message, 'success', duration);
  };

  /**
   * Уведомление об ошибке
   */
  const error = (message, duration = 5000) => {
    return showNotification(message, 'error', duration);
  };

  /**
   * Предупреждение
   */
  const warning = (message, duration = 4000) => {
    return showNotification(message, 'warning', duration);
  };

  /**
   * Информационное уведомление
   */
  const info = (message, duration = 3000) => {
    return showNotification(message, 'info', duration);
  };

  return {
    notifications,
    showNotification,
    removeNotification,
    clearNotifications,
    success,
    error,
    warning,
    info
  };
}
