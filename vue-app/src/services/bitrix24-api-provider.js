/**
 * Bitrix24ApiProvider - централизованный провайдер для Bitrix24 API
 *
 * Решает конфликты импортов bitrix24-api.js, обеспечивая единый экземпляр
 * сервиса и lazy loading при необходимости.
 *
 * TASK-085: Оптимизация системы сборки Vue.js приложения
 */

import { LazyServiceLoader } from '@/utils/lazy-services';

class Bitrix24ApiProvider {
  static instance = null;
  static loading = false;

  /**
   * Получает единственный экземпляр Bitrix24ApiService
   * @returns {Promise<Bitrix24ApiService>} Экземпляр сервиса
   */
  static async getInstance() {
    if (this.instance) {
      return this.instance;
    }

    if (this.loading) {
      // Ждем, пока другой запрос загрузит сервис
      return new Promise((resolve, reject) => {
        const checkInstance = () => {
          if (this.instance) {
            resolve(this.instance);
          } else {
            setTimeout(checkInstance, 10);
          }
        };
        checkInstance();
      });
    }

    try {
      this.loading = true;
      const { Bitrix24ApiService } = await LazyServiceLoader.loadBitrix24Api();
      this.instance = new Bitrix24ApiService();
    } catch (error) {
      console.error('Failed to load Bitrix24ApiService:', error);
      throw error;
    } finally {
      this.loading = false;
    }

    return this.instance;
  }

  /**
   * Очищает кешированный экземпляр
   */
  static clearInstance() {
    this.instance = null;
    this.loading = false;
  }

  /**
   * Проверяет, загружен ли экземпляр
   * @returns {boolean} True если экземпляр загружен
   */
  static hasInstance() {
    return this.instance !== null;
  }
}

export { Bitrix24ApiProvider };