/**
 * LazyServiceLoader - централизованная система lazy loading для сервисов
 *
 * Решает конфликты между статическими и динамическими импортами,
 * обеспечивая эффективное кеширование и загрузку модулей по требованию.
 *
 * TASK-085: Оптимизация системы сборки Vue.js приложения
 */

export class LazyServiceLoader {
  static cache = new Map();

  /**
   * Загружает admissionClosureService
   * @returns {Promise<Module>} Модуль admissionClosureService
   */
  static async loadAdmissionClosureService() {
    if (!this.cache.has('admissionClosure')) {
      const module = await import('@/services/graph-admission-closure/admissionClosureService.js');
      this.cache.set('admissionClosure', module);
    }
    return this.cache.get('admissionClosure');
  }

  /**
   * Загружает bitrix24-api сервис
   * @returns {Promise<Module>} Модуль Bitrix24ApiService
   */
  static async loadBitrix24Api() {
    if (!this.cache.has('bitrix24Api')) {
      const module = await import('@/services/bitrix24-api.js');
      this.cache.set('bitrix24Api', module);
    }
    return this.cache.get('bitrix24Api');
  }

  /**
   * Загружает access-config (асинхронные функции)
   * @returns {Promise<Module>} Модуль с асинхронными функциями access-config
   */
  static async loadAccessConfigAsync() {
    if (!this.cache.has('accessConfigAsync')) {
      const module = await import('@/config/access-config-async.js');
      this.cache.set('accessConfigAsync', module);
    }
    return this.cache.get('accessConfigAsync');
  }

  /**
   * Загружает ticketListUtils для работы с тикетами
   * @returns {Promise<Module>} Модуль ticketListUtils
   */
  static async loadTicketListUtils() {
    if (!this.cache.has('ticketListUtils')) {
      const module = await import('@/utils/graph-state/ticketListUtils.js');
      this.cache.set('ticketListUtils', module);
    }
    return this.cache.get('ticketListUtils');
  }

  /**
   * Очищает кеш загрузчика
   * @param {string} serviceName - имя сервиса для очистки (опционально)
   */
  static clearCache(serviceName = null) {
    if (serviceName) {
      this.cache.delete(serviceName);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Получает статистику кеша
   * @returns {Object} Статистика использования кеша
   */
  static getCacheStats() {
    return {
      size: this.cache.size,
      services: Array.from(this.cache.keys()),
      memoryUsage: JSON.stringify(this.cache).length // приблизительная оценка
    };
  }
}