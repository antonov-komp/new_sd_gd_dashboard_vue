/**
 * Утилиты для определения контекста работы с Bitrix24
 * 
 * Определяет, работает ли приложение внутри Bitrix24 iframe или как standalone
 * 
 * Используется для автоматического выбора метода работы с Bitrix24 API:
 * - BX24.* API (внутри Bitrix24 iframe)
 * - Прокси через Laravel backend (standalone приложение)
 * 
 * Документация:
 * - Bitrix24 BX24 API: https://dev.1c-bitrix.ru/rest_help/js_library/index.php
 * - CORS в браузерах: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
 */

/**
 * Проверка, работает ли приложение внутри Bitrix24 iframe
 * 
 * ВАЖНО: Если BX24 API доступен, это означает, что приложение загружено внутри Bitrix24,
 * даже если CORS блокирует доступ к window.parent. В этом случае нужно использовать
 * BX24 API для определения пользователя интерфейса, а не прокси (который вернёт владельца токена).
 * 
 * Выполняет несколько проверок:
 * 1. Наличие BX24 API (главный индикатор)
 * 2. Проверка, что приложение в iframe (window.self !== window.top)
 * 3. Попытка доступа к window.parent для определения origin (опционально)
 * 
 * @returns {boolean} true, если приложение работает внутри Bitrix24
 */
export function isInsideBitrix24() {
  try {
    // Проверка 1: Наличие BX24 API - это главный индикатор того, что мы внутри Bitrix24
    // Если BX24 доступен, значит скрипт загружен из Bitrix24, даже если CORS блокирует доступ
    if (typeof BX24 !== 'undefined') {
      // Если BX24 доступен, мы точно внутри Bitrix24
      // Дополнительно проверяем, что мы в iframe (но это не критично)
      if (window.self !== window.top) {
        // В iframe - точно внутри Bitrix24
        return true;
      }
      // Если BX24 доступен, но мы не в iframe - возможно standalone режим
      // Но всё равно BX24 API должен работать для определения пользователя интерфейса
      return true;
    }
    
    // Если BX24 недоступен, проверяем другие индикаторы
    // Проверка 2: Наличие window.parent (iframe)
    if (window.self === window.top) {
      // Не в iframe и BX24 недоступен - точно не внутри Bitrix24
      return false;
    }
    
    // Проверка 3: Попытка доступа к window.parent (может быть заблокирован CORS)
    try {
      // Если можем получить доступ к parent, скорее всего мы в iframe
      const parentOrigin = window.parent.location.origin;
      // Проверяем, что parent — это Bitrix24
      return parentOrigin.includes('bitrix24') || parentOrigin.includes('kompo.by');
    } catch (e) {
      // CORS блокирует доступ - не можем определить точно
      // Но если BX24 был доступен выше, мы бы уже вернули true
      return false;
    }
  } catch (error) {
    console.warn('Error checking Bitrix24 context:', error);
    return false;
  }
}

/**
 * Проверка доступности BX24 API
 * 
 * @returns {boolean} true, если BX24 API доступен
 */
export function isBX24Available() {
  return typeof BX24 !== 'undefined';
}

