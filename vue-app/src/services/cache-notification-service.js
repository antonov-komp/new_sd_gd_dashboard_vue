/**
 * Сервис для управления уведомлениями о кеше
 * 
 * TASK-076: Ручное создание кешей с уведомлениями
 * 
 * Использует Bitrix24 UI для отображения уведомлений
 */

export class CacheNotificationService {
  /**
   * Показать уведомление о начале создания кеша
   * 
   * @param {string} moduleName - Название модуля
   */
  static notifyCacheCreationStarted(moduleName) {
    this.showNotification({
      content: `Начато создание кеша для модуля "${moduleName}"...`,
      type: 'info',
      autoHideDelay: 3000
    });
  }
  
  /**
   * Показать уведомление об успешном создании кеша
   * 
   * @param {string} moduleName - Название модуля
   */
  static notifyCacheCreationSuccess(moduleName) {
    this.showNotification({
      content: `✅ Кеш для модуля "${moduleName}" успешно создан`,
      type: 'success',
      autoHideDelay: 5000
    });
  }
  
  /**
   * Показать уведомление об ошибке создания кеша
   * 
   * @param {string} moduleName - Название модуля
   * @param {string} error - Сообщение об ошибке
   */
  static notifyCacheCreationError(moduleName, error) {
    this.showNotification({
      content: `❌ Ошибка создания кеша для модуля "${moduleName}": ${error}`,
      type: 'error',
      autoHideDelay: 7000
    });
  }
  
  /**
   * Показать уведомление об обновлении кеша
   * 
   * @param {string} moduleName - Название модуля
   * @param {string} reason - Причина обновления (auto, manual)
   */
  static notifyCacheUpdated(moduleName, reason = 'auto') {
    const reasonText = reason === 'manual' ? 'вручную' : 'автоматически';
    this.showNotification({
      content: `🔄 Кеш для модуля "${moduleName}" обновлён ${reasonText}`,
      type: 'info',
      autoHideDelay: 4000
    });
  }
  
  /**
   * Показать уведомление об использовании кеша
   * 
   * @param {string} moduleName - Название модуля
   */
  static notifyCacheUsed(moduleName) {
    this.showNotification({
      content: `⚡ Использован кеш для модуля "${moduleName}"`,
      type: 'success',
      autoHideDelay: 3000
    });
  }
  
  /**
   * Показать уведомление
   * 
   * @param {object} options - Опции уведомления
   */
  static showNotification(options) {
    if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
      BX.UI.Notification.Center.notify({
        content: options.content,
        autoHideDelay: options.autoHideDelay || 3000
      });
    } else {
      // Fallback для консоли
      console.log('[CacheNotification]', options.content);
    }
  }
}

