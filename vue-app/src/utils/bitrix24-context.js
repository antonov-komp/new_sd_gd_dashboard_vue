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
 * Выполняет несколько проверок:
 * 1. Наличие BX24 API
 * 2. Проверка, что приложение в iframe (window.self !== window.top)
 * 3. Попытка доступа к window.parent для определения origin
 * 
 * @returns {boolean} true, если приложение работает внутри Bitrix24
 */
export function isInsideBitrix24() {
  try {
    // Проверка 1: Наличие BX24 API
    if (typeof BX24 === 'undefined') {
      return false;
    }
    
    // Проверка 2: Наличие window.parent (iframe)
    if (window.self === window.top) {
      // Не в iframe
      return false;
    }
    
    // Проверка 3: Попытка доступа к window.parent (может быть заблокирован CORS)
    try {
      // Если можем получить доступ к parent, скорее всего мы в iframe
      const parentOrigin = window.parent.location.origin;
      // Проверяем, что parent — это Bitrix24
      return parentOrigin.includes('bitrix24') || parentOrigin.includes('kompo.by');
    } catch (e) {
      // CORS блокирует доступ — значит мы не в iframe Bitrix24
      // или родительский фрейм находится на другом домене
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

