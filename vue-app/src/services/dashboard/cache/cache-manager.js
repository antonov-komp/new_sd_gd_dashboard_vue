/**
 * Менеджер кеширования для дашбордов секторов
 *
 * Управляет кешированием данных и инвалидацией кеша
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { Logger } from '../utils/logger.js';

export class CacheManager {
  constructor(sectorId) {
    this.sectorId = sectorId;
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.defaultTtl = 5 * 60 * 1000; // 5 минут
  }

  /**
   * Получение данных из кеша
   *
   * @param {string} key - Ключ кеша
   * @returns {any} Данные из кеша или null
   */
  get(key) {
    const cacheKey = `${this.sectorId}:${key}`;

    if (!this.cache.has(cacheKey)) {
      return null;
    }

    const timestamp = this.cacheTimestamps.get(cacheKey);
    const now = Date.now();

    // Проверяем TTL
    if (now - timestamp > this.defaultTtl) {
      Logger.debug(`Cache expired for key: ${cacheKey}`, 'CacheManager');
      this.cache.delete(cacheKey);
      this.cacheTimestamps.delete(cacheKey);
      return null;
    }

    Logger.debug(`Cache hit for key: ${cacheKey}`, 'CacheManager');
    return this.cache.get(cacheKey);
  }

  /**
   * Сохранение данных в кеш
   *
   * @param {string} key - Ключ кеша
   * @param {any} data - Данные для кеширования
   * @param {number} ttl - Время жизни в миллисекундах (опционально)
   */
  set(key, data, ttl = this.defaultTtl) {
    const cacheKey = `${this.sectorId}:${key}`;
    const timestamp = Date.now();

    this.cache.set(cacheKey, data);
    this.cacheTimestamps.set(cacheKey, timestamp);

    Logger.debug(`Cache set for key: ${cacheKey}, TTL: ${ttl}ms`, 'CacheManager');
  }

  /**
   * Очистка кеша для сектора
   */
  clear() {
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(`${this.sectorId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
    });

    Logger.info(`Cache cleared for sector: ${this.sectorId}, ${keysToDelete.length} entries`, 'CacheManager');
  }

  /**
   * Очистка всего кеша
   */
  clearAll() {
    const size = this.cache.size;
    this.cache.clear();
    this.cacheTimestamps.clear();

    Logger.info(`All cache cleared, ${size} entries removed`, 'CacheManager');
  }

  /**
   * Получение статистики кеша
   *
   * @returns {object} Статистика кеша
   */
  getStats() {
    const sectorKeys = Array.from(this.cache.keys())
      .filter(key => key.startsWith(`${this.sectorId}:`));

    return {
      totalEntries: this.cache.size,
      sectorEntries: sectorKeys.length,
      otherEntries: this.cache.size - sectorKeys.length
    };
  }
}

export default CacheManager;