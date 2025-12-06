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
   * (основной доступ - первая партия)
   * 
   * @type {number[]}
   * 
   * Примеры:
   * - [1] - только отдел с ID 1
   * - [1, 5, 10] - отделы с ID 1, 5 и 10
   * - [] - доступ запрещён всем (не рекомендуется)
   */
  allowedDepartmentIds: [
    369,    // Битрикс24 отдел
    366,    // Сектор 1С
  ],
  
  /**
   * Массив ID отделов, которым разрешён администраторский доступ
   * (администраторский доступ - вторая партия)
   * 
   * Администраторы автоматически имеют основной доступ,
   * плюс дополнительные возможности (кнопка администрирования)
   * 
   * @type {number[]}
   * 
   * Примеры:
   * - [370] - только отдел с ID 370 имеет админ доступ
   * - [370, 371] - отделы с ID 370 и 371 имеют админ доступ
   * - [] - нет администраторов (не рекомендуется)
   */
  adminDepartmentIds: [
    369 // Администраторы ИТ отдела (пример, замените на реальный ID)
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

/**
 * Проверка, является ли пользователь администратором
 * 
 * Проверяет, принадлежит ли пользователь к отделам из adminDepartmentIds
 * 
 * @param {Object} user - Объект пользователя из Bitrix24
 * @param {number[]} user.UF_DEPARTMENT - Массив ID отделов пользователя
 * @returns {boolean} true, если пользователь является администратором
 * 
 * @example
 * const user = { ID: 123, UF_DEPARTMENT: [369, 370] };
 * const admin = isAdmin(user); // true (если 370 в adminDepartmentIds)
 */
export function isAdmin(user) {
  if (!user || !user.UF_DEPARTMENT) {
    return false;
  }
  
  const departmentIds = Array.isArray(user.UF_DEPARTMENT) 
    ? user.UF_DEPARTMENT 
    : [];
  
  if (departmentIds.length === 0) {
    return false;
  }
  
  // Проверяем, есть ли хотя бы один отдел пользователя в списке админских отделов
  return departmentIds.some(deptId => 
    accessConfig.adminDepartmentIds.includes(deptId)
  );
}

/**
 * Получение списка ID отделов администраторов
 * 
 * @returns {number[]} Массив ID отделов администраторов
 */
export function getAdminDepartmentIds() {
  return [...accessConfig.adminDepartmentIds];
}

