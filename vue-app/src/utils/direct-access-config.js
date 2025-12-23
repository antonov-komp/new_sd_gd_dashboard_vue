/**
 * Утилита для работы с конфигурацией прямого доступа
 * 
 * Читает настройки прямого доступа из API endpoint
 * 
 * Используется для проверки, разрешён ли прямой доступ к приложению
 * при открытии не в iframe Bitrix24
 * 
 * Дата создания: 2025-12-23 (UTC+3, Брест)
 */

import { getApiUrl } from './path-utils.js';

// Кеш конфигурации (загружается один раз)
let cachedConfig = null;
let configLoadPromise = null; // Promise для предотвращения параллельных запросов

/**
 * Значения по умолчанию (безопасные)
 */
const DEFAULT_CONFIG = {
  allow_direct_access: false,
  message_on_deny: 'Прямой доступ к приложению запрещён. Откройте приложение через интерфейс Bitrix24.'
};

/**
 * Получение конфигурации прямого доступа
 * 
 * Кеширует результат после первой загрузки.
 * При ошибке возвращает безопасные значения по умолчанию.
 * 
 * @returns {Promise<object>} Конфигурация прямого доступа
 */
export async function getDirectAccessConfig() {
  // Если конфиг уже загружен, возвращаем из кеша
  if (cachedConfig) {
    return cachedConfig;
  }
  
  // Если уже идёт загрузка, ждём её завершения
  if (configLoadPromise) {
    return configLoadPromise;
  }
  
  // Начинаем загрузку конфигурации
  configLoadPromise = (async () => {
    try {
      // Создаём AbortController для таймаута (совместимость с браузерами)
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 5000);
      
      const response = await fetch(getApiUrl('/api/direct-access-config.php'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        // Таймаут 5 секунд
        signal: abortController.signal
      });
      
      // Очищаем таймаут, если запрос завершился успешно
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const config = await response.json();
      
      // Валидация конфигурации
      if (!config || typeof config !== 'object') {
        throw new Error('Invalid config format');
      }
      
      // Нормализация значений
      const normalizedConfig = {
        allow_direct_access: config.allow_direct_access === true,
        message_on_deny: config.message_on_deny || DEFAULT_CONFIG.message_on_deny,
        is_ip_whitelisted: config.is_ip_whitelisted === true,  // Для отладки
        client_ip: config.client_ip || 'unknown'  // Для отладки
      };
      
      // Логируем для отладки (только если IP в белом списке)
      if (normalizedConfig.is_ip_whitelisted) {
        console.log('Direct access allowed: IP is whitelisted', {
          ip: normalizedConfig.client_ip,
          allow_direct_access: normalizedConfig.allow_direct_access
        });
      }
      
      // Сохраняем в кеш
      cachedConfig = normalizedConfig;
      
      return normalizedConfig;
    } catch (error) {
      console.error('Error loading direct access config:', error);
      
      // При ошибке возвращаем безопасные значения по умолчанию
      const defaultConfig = { ...DEFAULT_CONFIG };
      cachedConfig = defaultConfig; // Кешируем даже значения по умолчанию
      
      return defaultConfig;
    } finally {
      // Очищаем promise после завершения
      configLoadPromise = null;
    }
  })();
  
  return configLoadPromise;
}

/**
 * Проверка, разрешён ли прямой доступ
 * 
 * @returns {Promise<boolean>} true, если прямой доступ разрешён
 */
export async function isDirectAccessAllowed() {
  const config = await getDirectAccessConfig();
  return config.allow_direct_access === true;
}

/**
 * Получение сообщения об отказе в доступе
 * 
 * @returns {Promise<string>} Сообщение об отказе в доступе
 */
export async function getDenyMessage() {
  const config = await getDirectAccessConfig();
  return config.message_on_deny || DEFAULT_CONFIG.message_on_deny;
}

/**
 * Сброс кеша конфигурации (для тестирования)
 * 
 * @internal
 */
export function resetConfigCache() {
  cachedConfig = null;
  configLoadPromise = null;
}

