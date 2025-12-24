/**
 * Сервис для логирования активности пользователей
 * 
 * Логирует:
 * - Первый вход пользователя в приложение (app_entry)
 * - Переходы по маршрутам (page_visit)
 * 
 * Формат логов: logs/webhooks/user-activity/YYYY-MM-DD-HH.json
 * 
 * Использует backend API: /api/user-activity-log.php
 */

import { getApiUrl } from '@/utils/path-utils.js';

export class ActivityLoggingService {
  
  /**
   * Логирование первого входа пользователя
   * 
   * @param {object} user - Объект пользователя из Bitrix24
   * @param {string} ip - IP адрес пользователя (опционально)
   * @returns {Promise<boolean>} true если успешно
   */
  static async logAppEntry(user, ip = null) {
    if (!user || !user.ID) {
      console.warn('[ActivityLoggingService] Invalid user object for app entry logging');
      return false;
    }
    
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'app_entry',
      user_id: user.ID,
      user_name: this.getUserName(user),
      user_email: user.EMAIL || null,
      ip: ip || this.getClientIp(),
      user_agent: navigator.userAgent,
      session_id: this.getSessionId()
    };
    
    return await this.saveLog(entry);
  }
  
  /**
   * Логирование перехода по маршруту
   * 
   * @param {object} route - Объект маршрута из Vue Router
   * @param {object} user - Объект пользователя из Bitrix24
   * @param {object} fromRoute - Предыдущий маршрут (опционально)
   * @returns {Promise<boolean>} true если успешно
   */
  static async logPageVisit(route, user, fromRoute = null) {
    if (!user || !user.ID) {
      console.warn('[ActivityLoggingService] Invalid user object for page visit logging');
      return false;
    }
    
    if (!route || !route.path) {
      console.warn('[ActivityLoggingService] Invalid route object for page visit logging');
      return false;
    }
    
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'page_visit',
      user_id: user.ID,
      user_name: this.getUserName(user),
      route_path: route.path,
      route_name: route.name || null,
      route_title: route.meta?.title || null,
      from_path: fromRoute?.path || null,
      from_name: fromRoute?.name || null,
      session_id: this.getSessionId()
    };
    
    return await this.saveLog(entry);
  }
  
  /**
   * Сохранение записи в лог-файл через backend API
   * 
   * @param {object} entry - Запись для логирования
   * @returns {Promise<boolean>} true если успешно
   */
  static async saveLog(entry) {
    try {
      const apiUrl = getApiUrl('/api/user-activity-log.php');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(entry),
        // Не ждём долго ответа, чтобы не блокировать UI
        signal: AbortSignal.timeout(5000) // 5 секунд таймаут
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ActivityLoggingService] Failed to save log:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        return false;
      }
      
      const result = await response.json();
      
      if (result.success) {
        return true;
      } else {
        console.error('[ActivityLoggingService] API returned error:', result.error);
        return false;
      }
    } catch (error) {
      // Не прерываем работу приложения при ошибке логирования
      if (error.name === 'AbortError') {
        console.warn('[ActivityLoggingService] Request timeout (activity logging skipped)');
      } else {
        console.error('[ActivityLoggingService] Error saving log:', error);
      }
      return false;
    }
  }
  
  /**
   * Получение ID сессии
   * 
   * @returns {string} ID сессии
   */
  static getSessionId() {
    const storageKey = 'activity_session_id';
    
    // Проверяем sessionStorage
    if (sessionStorage.getItem(storageKey)) {
      return sessionStorage.getItem(storageKey);
    }
    
    // Генерируем новый ID сессии
    const sessionId = this.generateSessionId();
    sessionStorage.setItem(storageKey, sessionId);
    
    return sessionId;
  }
  
  /**
   * Генерация уникального ID сессии
   * 
   * @returns {string} Уникальный ID сессии
   */
  static generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `${timestamp}-${random}`;
  }
  
  /**
   * Получение имени пользователя из объекта пользователя
   * 
   * @param {object} user - Объект пользователя
   * @returns {string} Имя пользователя
   */
  static getUserName(user) {
    const name = user.NAME || '';
    const lastName = user.LAST_NAME || '';
    const fullName = `${name} ${lastName}`.trim();
    
    return fullName || user.EMAIL || `User #${user.ID}`;
  }
  
  /**
   * Получение IP адреса клиента (если доступно)
   * 
   * @returns {string|null} IP адрес или null
   */
  static getClientIp() {
    // IP адрес определяется на backend, но можем попытаться получить из заголовков
    // В реальности IP будет определяться на сервере
    return null;
  }
  
  /**
   * Проверка, был ли уже залогирован вход в приложение в этой сессии
   * 
   * @returns {boolean} true если вход уже залогирован
   */
  static isAppEntryLogged() {
    return sessionStorage.getItem('app_entry_logged') === 'true';
  }
  
  /**
   * Отметить, что вход в приложение был залогирован
   */
  static markAppEntryLogged() {
    sessionStorage.setItem('app_entry_logged', 'true');
  }
}

