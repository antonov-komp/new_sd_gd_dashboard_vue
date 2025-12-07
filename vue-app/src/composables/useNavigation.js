import { useRouter, useRoute } from 'vue-router';

/**
 * Композабл для навигации в приложении
 * 
 * Предоставляет методы для программной навигации:
 * - goBack() - возврат на предыдущую страницу
 * - goTo(path) - переход на указанный путь
 * - goHome() - переход на главную страницу
 * - isCurrentRoute(path) - проверка текущего маршрута
 * 
 * @returns {object} Объект с методами навигации
 * 
 * @example
 * const { goBack, goHome, isCurrentRoute } = useNavigation();
 * 
 * // Переход на главную
 * goHome();
 * 
 * // Возврат с fallback
 * goBack('/fallback-path');
 * 
 * // Проверка текущего маршрута
 * if (isCurrentRoute('/dashboard/sector-1c')) {
 *   // Логика для дашборда
 * }
 */
export function useNavigation() {
  const router = useRouter();
  const route = useRoute();
  
  /**
   * Возврат на предыдущую страницу или на главную
   * 
   * Если есть история навигации, возвращается на предыдущую страницу.
   * Если истории нет, переходит на главную страницу (/).
   * 
   * @param {string} fallbackPath - Путь для возврата, если нет истории (по умолчанию '/')
   * 
   * @example
   * goBack(); // Возврат на предыдущую или на '/'
   * goBack('/dashboard'); // Возврат на предыдущую или на '/dashboard'
   */
  const goBack = (fallbackPath = '/') => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackPath);
    }
  };
  
  /**
   * Переход на указанный путь
   * 
   * @param {string} path - Путь для перехода
   * @param {object} options - Опции навигации (query, params, etc.)
   * 
   * @example
   * goTo('/dashboard/sector-1c');
   * goTo('/dashboard', { query: { id: 123 } });
   */
  const goTo = (path, options = {}) => {
    router.push({ path, ...options });
  };
  
  /**
   * Переход на главную страницу
   * 
   * @param {object} options - Опции навигации
   * 
   * @example
   * goHome();
   * goHome({ query: { tab: 'dashboard' } });
   */
  const goHome = (options = {}) => {
    router.push({ path: '/', ...options });
  };
  
  /**
   * Проверка, является ли текущий маршрут указанным
   * 
   * @param {string} path - Путь для проверки
   * @returns {boolean} true, если текущий маршрут совпадает
   * 
   * @example
   * if (isCurrentRoute('/dashboard/sector-1c')) {
   *   console.log('На странице дашборда');
   * }
   */
  const isCurrentRoute = (path) => {
    return route.path === path;
  };
  
  return {
    goBack,
    goTo,
    goHome,
    isCurrentRoute,
    router,
    route
  };
}


