/**
 * Единая система уведомлений для интерфейса управления кешем
 *
 * TASK-090: Улучшение интерфейса и UX модуля "Ручное управление кешем"
 *
 * Поддерживает:
 * - Bitrix24 UI.Notification (при наличии)
 * - Fallback нативные уведомления
 * - Разные типы уведомлений (success, error, warning, info)
 * - Автоматическое скрытие
 * - Ручное закрытие
 */

export class NotificationSystem {
  /**
   * Показать уведомление об успехе
   * @param {string} title - Заголовок уведомления
   * @param {string} message - Текст уведомления
   * @param {Object} options - Дополнительные опции
   */
  static success(title, message, options = {}) {
    this.show('success', title, message, options);
  }

  /**
   * Показать уведомление об ошибке
   * @param {string} title - Заголовок уведомления
   * @param {string} message - Текст уведомления
   * @param {Object} options - Дополнительные опции
   */
  static error(title, message, options = {}) {
    this.show('error', title, message, options);
  }

  /**
   * Показать предупреждение
   * @param {string} title - Заголовок уведомления
   * @param {string} message - Текст уведомления
   * @param {Object} options - Дополнительные опции
   */
  static warning(title, message, options = {}) {
    this.show('warning', title, message, options);
  }

  /**
   * Показать информационное уведомление
   * @param {string} title - Заголовок уведомления
   * @param {string} message - Текст уведомления
   * @param {Object} options - Дополнительные опции
   */
  static info(title, message, options = {}) {
    this.show('info', title, message, options);
  }

  /**
   * Универсальный метод показа уведомления
   * @param {string} type - Тип уведомления (success, error, warning, info)
   * @param {string} title - Заголовок уведомления
   * @param {string} message - Текст уведомления
   * @param {Object} options - Дополнительные опции
   */
  static show(type, title, message, options = {}) {
    const config = {
      autoHideDelay: options.autoHideDelay || 5000, // 5 секунд по умолчанию
      position: options.position || 'top-right',
      ...options
    };

    // Проверяем наличие Bitrix24 UI
    if (this.isBitrix24Available()) {
      this.showBitrix24Notification(type, title, message, config);
    } else {
      this.showFallbackNotification(type, title, message, config);
    }
  }

  /**
   * Проверка доступности Bitrix24 UI
   * @returns {boolean} Доступен ли Bitrix24 UI
   */
  static isBitrix24Available() {
    return typeof window !== 'undefined' &&
           window.BX &&
           window.BX.UI &&
           window.BX.UI.Notification &&
           window.BX.UI.Notification.Center &&
           typeof window.BX.UI.Notification.Center.notify === 'function';
  }

  /**
   * Показать уведомление через Bitrix24 UI
   * @param {string} type - Тип уведомления
   * @param {string} title - Заголовок
   * @param {string} message - Сообщение
   * @param {Object} config - Конфигурация
   */
  static showBitrix24Notification(type, title, message, config) {
    try {
      // Маппинг типов на Bitrix24
      const bx24TypeMap = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'info'
      };

      const bx24Type = bx24TypeMap[type] || 'info';

      // Формируем полное сообщение
      const fullMessage = title ? `${title}: ${message}` : message;

      window.BX.UI.Notification.Center.notify({
        content: fullMessage,
        autoHideDelay: config.autoHideDelay,
        category: `cache-management-${type}`,
        position: config.position
      });

      console.log(`[NotificationSystem] Bitrix24 notification shown: ${type}`, { title, message, config });
    } catch (error) {
      console.error('[NotificationSystem] Error showing Bitrix24 notification:', error);
      // Fallback на нативное уведомление
      this.showFallbackNotification(type, title, message, config);
    }
  }

  /**
   * Показать уведомление через fallback (нативный alert или кастомный элемент)
   * @param {string} type - Тип уведомления
   * @param {string} title - Заголовок
   * @param {string} message - Сообщение
   * @param {Object} config - Конфигурация
   */
  static showFallbackNotification(type, title, message, config) {
    // Для fallback используем нативный alert или создаем кастомный элемент
    const fullMessage = title ? `${title}: ${message}` : message;

    // Пытаемся использовать нативные уведомления браузера
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title || 'Уведомление', {
          body: message,
          icon: this.getIconForType(type),
          tag: `cache-management-${type}`
        });

        // Автоматическое скрытие
        setTimeout(() => {
          notification.close();
        }, config.autoHideDelay);

        console.log(`[NotificationSystem] Browser notification shown: ${type}`, { title, message });
        return;
      } catch (error) {
        console.warn('[NotificationSystem] Browser notification failed:', error);
      }
    }

    // Fallback на кастомный элемент в DOM
    this.showCustomNotification(type, title, message, config);
  }

  /**
   * Показать кастомное уведомление в DOM
   * @param {string} type - Тип уведомления
   * @param {string} title - Заголовок
   * @param {string} message - Сообщение
   * @param {Object} config - Конфигурация
   */
  static showCustomNotification(type, title, message, config) {
    // Создаем контейнер для уведомлений, если его нет
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      document.body.appendChild(container);

      // Добавляем базовые стили
      const style = document.createElement('style');
      style.textContent = this.getNotificationStyles();
      document.head.appendChild(style);
    }

    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `custom-notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-title">${title || ''}</div>
        <div class="notification-message">${message}</div>
      </div>
      <button class="notification-close" aria-label="Закрыть уведомление">×</button>
    `;

    // Добавляем обработчик закрытия
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.removeCustomNotification(notification);
    });

    // Добавляем в контейнер
    container.appendChild(notification);

    // Автоматическое скрытие
    setTimeout(() => {
      this.removeCustomNotification(notification);
    }, config.autoHideDelay);

    console.log(`[NotificationSystem] Custom notification shown: ${type}`, { title, message });
  }

  /**
   * Удалить кастомное уведомление
   * @param {HTMLElement} notification - Элемент уведомления
   */
  static removeCustomNotification(notification) {
    if (notification && notification.parentNode) {
      notification.classList.add('notification-hiding');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300); // Время анимации скрытия
    }
  }

  /**
   * Получить иконку для типа уведомления
   * @param {string} type - Тип уведомления
   * @returns {string} URL иконки или emoji
   */
  static getIconForType(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  }

  /**
   * Получить CSS стили для кастомных уведомлений
   * @returns {string} CSS стили
   */
  static getNotificationStyles() {
    return `
      .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
      }

      .custom-notification {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        margin-bottom: 10px;
        min-width: 300px;
        max-width: 500px;
        pointer-events: auto;
        opacity: 0;
        transform: translateX(100%);
        animation: notificationSlideIn 0.3s ease forwards;
        border-left: 4px solid;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 16px;
        gap: 12px;
      }

      .custom-notification.notification-success {
        border-left-color: #28a745;
      }

      .custom-notification.notification-error {
        border-left-color: #dc3545;
      }

      .custom-notification.notification-warning {
        border-left-color: #ffc107;
      }

      .custom-notification.notification-info {
        border-left-color: #17a2b8;
      }

      .notification-content {
        flex: 1;
      }

      .notification-title {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 4px;
        color: #333;
      }

      .notification-message {
        font-size: 13px;
        color: #666;
        line-height: 1.4;
      }

      .notification-close {
        background: none;
        border: none;
        font-size: 20px;
        color: #999;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        flex-shrink: 0;
      }

      .notification-close:hover {
        color: #333;
      }

      .notification-hiding {
        animation: notificationSlideOut 0.3s ease forwards;
      }

      @keyframes notificationSlideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes notificationSlideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }

      @media (max-width: 768px) {
        .notification-container {
          left: 10px;
          right: 10px;
          top: 10px;
        }

        .custom-notification {
          min-width: auto;
          max-width: none;
        }
      }
    `;
  }

  /**
   * Очистить все активные уведомления
   */
  static clearAll() {
    // Очистить Bitrix24 уведомления (если возможно)
    try {
      if (this.isBitrix24Available() && window.BX.UI.Notification.Center.clearAll) {
        window.BX.UI.Notification.Center.clearAll();
      }
    } catch (error) {
      console.warn('[NotificationSystem] Error clearing Bitrix24 notifications:', error);
    }

    // Очистить кастомные уведомления
    const container = document.getElementById('notification-container');
    if (container) {
      container.innerHTML = '';
    }

    // Очистить нативные уведомления браузера
    if ('Notification' in window && 'getNotifications' in Notification) {
      try {
        const notifications = Notification.getNotifications();
        notifications.forEach(notification => {
          if (notification.tag && notification.tag.startsWith('cache-management-')) {
            notification.close();
          }
        });
      } catch (error) {
        console.warn('[NotificationSystem] Error clearing browser notifications:', error);
      }
    }
  }
}

// Экспорт для обратной совместимости
export const showNotification = NotificationSystem.show.bind(NotificationSystem);
export const showSuccessNotification = NotificationSystem.success.bind(NotificationSystem);
export const showErrorNotification = NotificationSystem.error.bind(NotificationSystem);
export const showWarningNotification = NotificationSystem.warning.bind(NotificationSystem);
export const showInfoNotification = NotificationSystem.info.bind(NotificationSystem);