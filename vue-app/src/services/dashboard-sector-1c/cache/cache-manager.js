/**
 * Менеджер кеширования для дашборда сектора 1С
 * 
 * Обеспечивает кеширование данных с TTL (Time To Live) и инвалидацию кеша
 * 
 * Использует Map для хранения данных в памяти
 * Поддерживает разные TTL для разных типов данных
 */

/**
 * Запись в кеше
 * @typedef {Object} CacheEntry
 * @property {*} data - Данные
 * @property {number} timestamp - Время создания записи
 * @property {number} ttl - Время жизни в миллисекундах
 */

/**
 * Менеджер кеширования
 */
export class CacheManager {
  /**
   * Хранилище кеша (Map для быстрого доступа)
   * @type {Map<string, CacheEntry>}
   */
  static cache = new Map();

  /**
   * TTL по умолчанию (5 минут)
   */
  static DEFAULT_TTL = 5 * 60 * 1000; // 5 минут

  /**
   * TTL для данных сотрудников (30 минут)
   */
  static EMPLOYEES_TTL = 30 * 60 * 1000; // 30 минут

  /**
   * TTL для данных тикетов (5 минут)
   */
  static TICKETS_TTL = 5 * 60 * 1000; // 5 минут

  /**
   * Получение данных из кеша
   * 
   * @param {string} key - Ключ кеша
   * @returns {*|null} Данные из кеша или null, если кеш истёк или отсутствует
   */
  static get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Проверяем, не истёк ли кеш
    const now = Date.now();
    const age = now - entry.timestamp;
    
    if (age > entry.ttl) {
      // Кеш истёк, удаляем запись
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Сохранение данных в кеш
   * 
   * @param {string} key - Ключ кеша
   * @param {*} data - Данные для кеширования
   * @param {number} ttl - Время жизни в миллисекундах (опционально)
   */
  static set(key, data, ttl = this.DEFAULT_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Удаление записи из кеша
   * 
   * @param {string} key - Ключ кеша
   */
  static delete(key) {
    this.cache.delete(key);
  }

  /**
   * Очистка всего кеша
   */
  static clear() {
    this.cache.clear();
  }

  /**
   * Инвалидация кеша по паттерну ключа
   * 
   * Удаляет все записи, ключи которых начинаются с указанного префикса
   * 
   * @param {string} prefix - Префикс ключа
   */
  static invalidateByPrefix(prefix) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Очистка истёкших записей
   * 
   * Проходит по всем записям и удаляет те, у которых истёк TTL
   */
  static cleanExpired() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Получение статистики кеша
   * 
   * @returns {Object} Статистика (размер, количество истёкших записей)
   */
  static getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let validCount = 0;
    
    for (const entry of this.cache.values()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        expiredCount++;
      } else {
        validCount++;
      }
    }
    
    return {
      total: this.cache.size,
      valid: validCount,
      expired: expiredCount
    };
  }

  /**
   * Генерация ключа кеша для тикетов по стадии
   * 
   * @param {string} stageId - ID стадии
   * @returns {string} Ключ кеша
   */
  static getTicketsCacheKey(stageId) {
    return `tickets:stage:${stageId}`;
  }

  /**
   * Генерация ключа кеша для всех тикетов
   * 
   * @returns {string} Ключ кеша
   */
  static getAllTicketsCacheKey() {
    return 'tickets:all';
  }

  /**
   * Генерация ключа кеша для сотрудников
   * 
   * @param {Array<number>} employeeIds - Массив ID сотрудников
   * @returns {string} Ключ кеша
   */
  static getEmployeesCacheKey(employeeIds) {
    const sortedIds = [...employeeIds].sort((a, b) => a - b).join(',');
    return `employees:ids:${sortedIds}`;
  }

  /**
   * Генерация ключа кеша для данных сектора
   * 
   * @returns {string} Ключ кеша
   */
  static getSectorDataCacheKey() {
    return 'sector:data';
  }

  /**
   * Инвалидация кеша тикетов
   * 
   * Удаляет все записи, связанные с тикетами
   */
  static invalidateTicketsCache() {
    this.invalidateByPrefix('tickets:');
    this.invalidateByPrefix('sector:');
  }

  /**
   * Инвалидация кеша сотрудников
   * 
   * Удаляет все записи, связанные с сотрудниками
   */
  static invalidateEmployeesCache() {
    this.invalidateByPrefix('employees:');
  }
}

// Периодическая очистка истёкших записей (каждые 5 минут)
if (typeof window !== 'undefined') {
  setInterval(() => {
    CacheManager.cleanExpired();
  }, 5 * 60 * 1000);
}


