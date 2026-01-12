/**
 * Система popup-подтверждений для интерфейса управления кешем
 *
 * TASK-090: Улучшение интерфейса и UX модуля "Ручное управление кешем"
 *
 * Обеспечивает:
 * - Promise-based API для подтверждений
 * - Поддержку клавиатурной навигации (Enter, Escape)
 * - Доступность (ARIA labels, screen reader support)
 * - Кастомизируемые кнопки и сообщения
 * - Фокус management
 */

let confirmationModalInstance = null;
let currentResolve = null;
let currentReject = null;

/**
 * Класс для управления popup-подтверждениями
 */
export class ConfirmationSystem {
  /**
   * Показать модальное окно подтверждения
   * @param {Object} options - Опции подтверждения
   * @param {string} options.title - Заголовок окна
   * @param {string} options.message - Текст сообщения
   * @param {string} options.type - Тип подтверждения (danger, warning, info)
   * @param {string} options.confirmText - Текст кнопки подтверждения
   * @param {string} options.cancelText - Текст кнопки отмены
   * @param {boolean} options.showCancel - Показывать ли кнопку отмены
   * @returns {Promise<boolean>} Promise, который разрешается true/false
   */
  static show(options = {}) {
    return new Promise((resolve, reject) => {
      // Сохраняем промисы для разрешения
      currentResolve = resolve;
      currentReject = reject;

      // Создаем модальное окно, если его нет
      if (!confirmationModalInstance) {
        confirmationModalInstance = this.createModal();
        document.body.appendChild(confirmationModalInstance);
      }

      // Настраиваем и показываем модальное окно
      this.configureModal(options);
      this.showModal();
    });
  }

  /**
   * Скрыть текущее модальное окно подтверждения
   */
  static hide() {
    if (confirmationModalInstance) {
      this.hideModal();

      // Разрешаем промис с false (отмена)
      if (currentResolve) {
        currentResolve(false);
        currentResolve = null;
        currentReject = null;
      }
    }
  }

  /**
   * Создать элемент модального окна
   * @returns {HTMLElement} Элемент модального окна
   */
  static createModal() {
    const modal = document.createElement('div');
    modal.className = 'cache-confirmation-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'confirmation-title');
    modal.setAttribute('aria-describedby', 'confirmation-message');

    modal.innerHTML = `
      <div class="modal-backdrop" data-action="cancel"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="confirmation-title" class="modal-title"></h3>
          <button
            class="modal-close"
            data-action="cancel"
            aria-label="Закрыть окно подтверждения"
          >
            ×
          </button>
        </div>

        <div class="modal-body">
          <div class="modal-icon">
            <span class="icon-symbol"></span>
          </div>
          <p id="confirmation-message" class="modal-message"></p>
        </div>

        <div class="modal-footer">
          <button class="btn btn-cancel" data-action="cancel"></button>
          <button class="btn btn-confirm" data-action="confirm"></button>
        </div>
      </div>
    `;

    // Добавляем обработчики событий
    this.attachEventListeners(modal);

    // Добавляем стили
    this.addStyles();

    return modal;
  }

  /**
   * Настроить модальное окно с переданными опциями
   * @param {Object} options - Опции конфигурации
   */
  static configureModal(options) {
    const {
      title = 'Подтверждение действия',
      message = 'Вы уверены, что хотите выполнить это действие?',
      type = 'warning',
      confirmText = 'Подтвердить',
      cancelText = 'Отмена',
      showCancel = true
    } = options;

    // Настраиваем заголовок
    const titleElement = confirmationModalInstance.querySelector('.modal-title');
    titleElement.textContent = title;

    // Настраиваем сообщение
    const messageElement = confirmationModalInstance.querySelector('.modal-message');
    messageElement.textContent = message;

    // Настраиваем иконку
    const iconElement = confirmationModalInstance.querySelector('.icon-symbol');
    const iconSymbols = {
      danger: '⚠️',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅'
    };
    iconElement.textContent = iconSymbols[type] || iconSymbols.warning;

    // Настраиваем кнопки
    const cancelBtn = confirmationModalInstance.querySelector('.btn-cancel');
    const confirmBtn = confirmationModalInstance.querySelector('.btn-confirm');

    cancelBtn.textContent = cancelText;
    confirmBtn.textContent = confirmText;

    // Управляем видимостью кнопки отмены
    if (showCancel) {
      cancelBtn.style.display = 'inline-block';
    } else {
      cancelBtn.style.display = 'none';
    }

    // Добавляем CSS классы для типа
    confirmationModalInstance.className = `cache-confirmation-modal modal-${type}`;
  }

  /**
   * Показать модальное окно
   */
  static showModal() {
    // Предотвращаем скролл body
    document.body.style.overflow = 'hidden';

    // Показываем модальное окно
    confirmationModalInstance.style.display = 'flex';
    confirmationModalInstance.classList.add('modal-visible');

    // Устанавливаем фокус на кнопку подтверждения
    setTimeout(() => {
      const confirmBtn = confirmationModalInstance.querySelector('.btn-confirm');
      if (confirmBtn) {
        confirmBtn.focus();
      }
    }, 100);

    // Добавляем обработчик клавиатуры
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Скрыть модальное окно
   */
  static hideModal() {
    // Восстанавливаем скролл body
    document.body.style.overflow = '';

    // Скрываем модальное окно
    confirmationModalInstance.classList.remove('modal-visible');

    // Удаляем обработчик клавиатуры
    document.removeEventListener('keydown', this.handleKeyDown);

    // Полностью скрываем через таймаут (для анимации)
    setTimeout(() => {
      if (confirmationModalInstance) {
        confirmationModalInstance.style.display = 'none';
      }
    }, 300);
  }

  /**
   * Добавить обработчики событий
   * @param {HTMLElement} modal - Элемент модального окна
   */
  static attachEventListeners(modal) {
    // Обработчик кликов
    modal.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.getAttribute('data-action');

      if (action === 'confirm') {
        this.handleConfirm();
      } else if (action === 'cancel') {
        this.handleCancel();
      }
    });
  }

  /**
   * Обработчик клавиатурных событий
   * @param {KeyboardEvent} event - Событие клавиатуры
   */
  static handleKeyDown = (event) => {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.handleConfirm();
        break;
      case 'Escape':
        event.preventDefault();
        this.handleCancel();
        break;
      case 'Tab':
        // Управляем фокусом внутри модального окна
        this.handleTabNavigation(event);
        break;
    }
  };

  /**
   * Обработчик подтверждения
   */
  static handleConfirm() {
    if (currentResolve) {
      currentResolve(true);
      currentResolve = null;
      currentReject = null;
    }
    this.hideModal();
  }

  /**
   * Обработчик отмены
   */
  static handleCancel() {
    if (currentResolve) {
      currentResolve(false);
      currentResolve = null;
      currentReject = null;
    }
    this.hideModal();
  }

  /**
   * Обработчик навигации Tab внутри модального окна
   * @param {KeyboardEvent} event - Событие клавиатуры
   */
  static handleTabNavigation(event) {
    const modal = confirmationModalInstance;
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * Добавить CSS стили для модального окна
   */
  static addStyles() {
    // Проверяем, добавлены ли уже стили
    if (document.getElementById('cache-confirmation-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'cache-confirmation-styles';
    style.textContent = `
      .cache-confirmation-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .cache-confirmation-modal.modal-visible {
        display: flex;
      }

      .modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
      }

      .modal-content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        z-index: 10001;
        animation: modalSlideIn 0.3s ease-out;
      }

      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: scale(0.9) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px 16px;
        border-bottom: 1px solid #e0e0e0;
      }

      .modal-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }

      .modal-close {
        background: none;
        border: none;
        font-size: 24px;
        color: #999;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .modal-close:hover {
        background: #f0f0f0;
        color: #333;
      }

      .modal-body {
        padding: 24px;
        text-align: center;
      }

      .modal-icon {
        margin-bottom: 16px;
      }

      .icon-symbol {
        font-size: 48px;
        display: block;
      }

      .modal-message {
        margin: 0;
        font-size: 16px;
        color: #555;
        line-height: 1.5;
      }

      .modal-footer {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        padding: 16px 24px 24px;
        border-top: 1px solid #e0e0e0;
      }

      .btn {
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: all 0.2s ease;
        min-width: 80px;
      }

      .btn:focus {
        outline: 2px solid #007bff;
        outline-offset: 2px;
      }

      .btn-cancel {
        background: #f8f9fa;
        color: #6c757d;
        border: 1px solid #dee2e6;
      }

      .btn-cancel:hover {
        background: #e9ecef;
        border-color: #adb5bd;
      }

      .btn-confirm {
        background: #007bff;
        color: white;
      }

      .btn-confirm:hover {
        background: #0056b3;
      }

      /* Типы модальных окон */
      .modal-danger .btn-confirm {
        background: #dc3545;
      }

      .modal-danger .btn-confirm:hover {
        background: #c82333;
      }

      .modal-warning .btn-confirm {
        background: #ffc107;
        color: #212529;
      }

      .modal-warning .btn-confirm:hover {
        background: #e0a800;
      }

      .modal-info .btn-confirm {
        background: #17a2b8;
      }

      .modal-info .btn-confirm:hover {
        background: #138496;
      }

      .modal-success .btn-confirm {
        background: #28a745;
      }

      .modal-success .btn-confirm:hover {
        background: #1e7e34;
      }

      /* Адаптивность */
      @media (max-width: 480px) {
        .modal-content {
          margin: 20px;
          width: calc(100% - 40px);
        }

        .modal-header,
        .modal-body,
        .modal-footer {
          padding-left: 20px;
          padding-right: 20px;
        }

        .modal-footer {
          flex-direction: column-reverse;
        }

        .btn {
          width: 100%;
        }
      }

      /* Доступность */
      @media (prefers-reduced-motion: reduce) {
        .modal-content,
        .modal-close,
        .btn {
          animation: none;
          transition: none;
        }
      }

      /* Высокий контраст */
      @media (prefers-contrast: high) {
        .modal-content {
          border: 2px solid #000;
        }

        .btn-cancel {
          border: 2px solid #000;
        }

        .btn-confirm {
          border: 2px solid #000;
        }
      }
    `;

    document.head.appendChild(style);
  }
}

// Экспорт для обратной совместимости
export const showConfirmationModal = ConfirmationSystem.show.bind(ConfirmationSystem);
export const hideConfirmationModal = ConfirmationSystem.hide.bind(ConfirmationSystem);