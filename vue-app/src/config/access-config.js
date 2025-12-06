/**
 * Конфигурация доступа к приложению по ID отдела
 * 
 * Определяет, какие отделы имеют доступ к приложению "Аналитика ИТ отдела для Генеральной дирекции"
 * 
 * Использование:
 * import { accessConfig } from '@/config/access-config.js';
 * const isAllowed = accessConfig.allowedDepartmentIds.includes(userDepartmentId);
 * 
 * Обновление:
 * Добавьте или удалите ID отделов в массиве allowedDepartmentIds
 */

export const accessConfig = {
  /**
   * Массив ID отделов, которым разрешён доступ к приложению
   * 
   * @type {number[]}
   * 
   * Примеры:
   * - [1] - только отдел с ID 1
   * - [1, 5, 10] - отделы с ID 1, 5 и 10
   * - [] - доступ запрещён всем (не рекомендуется)
   */
  allowedDepartmentIds: [
    369  // ИТ отдел для Генеральной дирекции
  ]
};

/**
 * Проверка, разрешён ли доступ отделу с указанным ID
 * 
 * @param {number} departmentId - ID отдела
 * @returns {boolean} true, если доступ разрешён
 */
export function isDepartmentAllowed(departmentId) {
  if (!departmentId || typeof departmentId !== 'number') {
    return false;
  }
  
  return accessConfig.allowedDepartmentIds.includes(departmentId);
}

/**
 * Получение списка разрешённых ID отделов
 * 
 * @returns {number[]} Массив ID отделов
 */
export function getAllowedDepartmentIds() {
  return [...accessConfig.allowedDepartmentIds];
}


