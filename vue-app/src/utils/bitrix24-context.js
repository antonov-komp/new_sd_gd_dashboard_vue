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
    // ВАЖНО: При прямом открытии в браузере (не в iframe) мы НЕ внутри Bitrix24
    // Основной индикатор - это window.self === window.top (не в iframe)
    
    // Проверка 1: Если мы не в iframe (window.self === window.top), то мы НЕ внутри Bitrix24
    // Это главная проверка для определения прямого доступа
    if (window.self === window.top) {
      // Не в iframe - точно не внутри Bitrix24 (прямой доступ)
      return false;
    }
    
    // Если мы в iframe, проверяем дополнительные индикаторы
    // Проверка 2: Наличие BX24 API - это индикатор того, что мы внутри Bitrix24
    if (typeof BX24 !== 'undefined') {
      // BX24 доступен и мы в iframe - точно внутри Bitrix24
      return true;
    }
    
    // Проверка 3: Попытка доступа к window.parent (может быть заблокирован CORS)
    try {
      // Если можем получить доступ к parent, скорее всего мы в iframe
      const parentOrigin = window.parent.location.origin;
      // Проверяем, что parent — это Bitrix24
      return parentOrigin.includes('bitrix24') || parentOrigin.includes('kompo.by');
    } catch (e) {
      // CORS блокирует доступ - не можем определить точно
      // Но так как мы в iframe (window.self !== window.top), вероятно внутри Bitrix24
      // Однако без BX24 API это может быть проблемой
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

