/**
 * Утилиты для работы с путями приложения
 * 
 * Обеспечивает корректную работу с относительными путями после смены сервера
 * Автоматически определяет базовый путь приложения на основе текущего URL
 * 
 * Дата создания: 2025-12-05 (UTC+3, Брест)
 */

/**
 * Получить базовый путь приложения
 * 
 * Определяется автоматически на основе текущего пути страницы.
 * Например, если страница: /rest_api_aps/sd_it_gen_plan/index.php
 * то базовый путь будет: /rest_api_aps/sd_it_gen_plan
 * 
 * @returns {string} Базовый путь приложения (начинается с /, заканчивается без /)
 * 
 * @example
 * getBasePath() // '/rest_api_aps/sd_it_gen_plan'
 */
export function getBasePath() {
  const path = window.location.pathname;
  
  // Если путь заканчивается на index.php или install.php, убираем имя файла
  if (path.endsWith('index.php') || path.endsWith('install.php')) {
    return path.substring(0, path.lastIndexOf('/'));
  }
  
  // Если путь заканчивается на /, убираем последний слэш
  if (path.endsWith('/')) {
    return path.substring(0, path.length - 1);
  }
  
  // Иначе возвращаем путь до последнего слэша
  return path.substring(0, path.lastIndexOf('/'));
}

/**
 * Получить полный URL для API endpoint
 *
 * @param {string} endpoint - Относительный путь к endpoint (например, '/api/bitrix24.php')
 * @returns {string} Полный путь к endpoint
 *
 * @example
 * getApiUrl('/api/bitrix24.php') // '/rest_api_aps/sd_it_gen_plan/api/bitrix24.php'
 */
export function getApiUrl(endpoint) {
  const basePath = getBasePath();

  // Убираем начальный слэш из endpoint, если есть
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;

  return `${basePath}/${cleanEndpoint}`;
}

/**
 * Получить полный URL для страницы
 * 
 * @param {string} page - Относительный путь к странице (например, '/install.php')
 * @returns {string} Полный путь к странице
 * 
 * @example
 * getPageUrl('/install.php') // '/rest_api_aps/sd_it_gen_plan/install.php'
 */
export function getPageUrl(page) {
  const basePath = getBasePath();
  
  // Убираем начальный слэш из page, если есть
  const cleanPage = page.startsWith('/') ? page.substring(1) : page;
  
  return `${basePath}/${cleanPage}`;
}

