/**
 * Асинхронные функции конфигурации доступа
 *
 * Содержит функции, которые могут загружаться lazily для оптимизации бандла.
 *
 * TASK-085: Оптимизация системы сборки Vue.js приложения
 */

import { accessConfig } from './access-config.js';

/**
 * Асинхронная версия получения списка разрешённых ID отделов
 *
 * @returns {Promise<number[]>} Массив ID отделов
 */
export async function getAllowedDepartmentIds() {
  // Имитируем асинхронную операцию для демонстрации lazy loading
  // В реальности может содержать асинхронные проверки или загрузку из API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...accessConfig.allowedDepartmentIds]);
    }, 0);
  });
}

/**
 * Асинхронная версия получения списка ID отделов администраторов
 *
 * @returns {Promise<number[]>} Массив ID отделов администраторов
 */
export async function getAdminDepartmentIds() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...accessConfig.adminDepartmentIds]);
    }, 0);
  });
}

/**
 * Асинхронная проверка разрешений с дополнительной логикой
 *
 * @param {number} departmentId - ID отдела
 * @param {Object} options - Дополнительные опции проверки
 * @returns {Promise<boolean>} true, если доступ разрешён
 */
export async function checkDepartmentAccessAsync(departmentId, options = {}) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!departmentId || typeof departmentId !== 'number') {
        resolve(false);
        return;
      }

      // Дополнительная логика проверки (например, проверка времени, внешних условий)
      const isAllowed = accessConfig.allowedDepartmentIds.includes(departmentId);

      if (options.checkTimeRestrictions) {
        // Пример: проверка временных ограничений
        const now = new Date();
        const hour = now.getHours();
        if (hour < 9 || hour > 18) {
          resolve(false);
          return;
        }
      }

      resolve(isAllowed);
    }, 0);
  });
}