/**
 * Утилиты для определения сектора сотрудника
 * 
 * Помогает определить, к какому сектору принадлежит сотрудник
 * на основе поля UF_DEPARTMENT из Bitrix24
 */

import {
  SECTOR_1C_ID,
  SECTOR_HARDWARE_ID,
  SECTOR_BITRIX24_ID,
  SECTOR_PDM_ID,
  ALL_SECTOR_IDS
} from './sector-constants.js';

/**
 * Получение ID сектора сотрудника
 * 
 * Определяет, к какому сектору принадлежит сотрудник на основе поля UF_DEPARTMENT.
 * UF_DEPARTMENT может быть массивом или числом.
 * 
 * @param {object} employee - Объект сотрудника из Bitrix24
 * @param {number|Array<number>} employee.UF_DEPARTMENT - ID отдела(ов) сотрудника
 * @returns {number|null} ID сектора (366, 368, 369, 367) или null, если сектор не определён
 * 
 * @example
 * const employee = { ID: 123, UF_DEPARTMENT: [366] };
 * const sectorId = getEmployeeSectorId(employee); // 366
 * 
 * @example
 * const employee = { ID: 456, UF_DEPARTMENT: 368 };
 * const sectorId = getEmployeeSectorId(employee); // 368
 * 
 * @example
 * const employee = { ID: 789, UF_DEPARTMENT: [999] };
 * const sectorId = getEmployeeSectorId(employee); // null
 */
export function getEmployeeSectorId(employee) {
  if (!employee || !employee.UF_DEPARTMENT) {
    return null;
  }

  // Обрабатываем массив или число
  const departments = Array.isArray(employee.UF_DEPARTMENT)
    ? employee.UF_DEPARTMENT
    : [employee.UF_DEPARTMENT];

  // Ищем первый отдел, который является сектором
  for (const deptId of departments) {
    const deptIdNum = typeof deptId === 'number' ? deptId : parseInt(deptId);
    
    if (!isNaN(deptIdNum) && ALL_SECTOR_IDS.includes(deptIdNum)) {
      return deptIdNum;
    }
  }

  return null;
}

/**
 * Проверка принадлежности сотрудника к сектору 1С
 * 
 * @param {object} employee - Объект сотрудника из Bitrix24
 * @param {number|Array<number>} employee.UF_DEPARTMENT - ID отдела(ов) сотрудника
 * @returns {boolean} true, если сотрудник принадлежит к сектору 1С (366)
 * 
 * @example
 * const employee = { ID: 123, UF_DEPARTMENT: [366] };
 * const isFrom1C = isEmployeeFromSector1C(employee); // true
 * 
 * @example
 * const employee = { ID: 456, UF_DEPARTMENT: [368] };
 * const isFrom1C = isEmployeeFromSector1C(employee); // false
 */
export function isEmployeeFromSector1C(employee) {
  const sectorId = getEmployeeSectorId(employee);
  return sectorId === SECTOR_1C_ID;
}

/**
 * Проверка принадлежности сотрудника к другому сектору (не 1С и не хранитель)
 * 
 * Проверяет, принадлежит ли сотрудник к сектору Железо (368), Битрикс24 (369) или PDM (367).
 * Хранитель (1051) не считается сотрудником другого сектора.
 * 
 * @param {object} employee - Объект сотрудника из Bitrix24
 * @param {number|Array<number>} employee.UF_DEPARTMENT - ID отдела(ов) сотрудника
 * @returns {boolean} true, если сотрудник принадлежит к другому сектору
 * 
 * @example
 * const employee = { ID: 123, UF_DEPARTMENT: [368] };
 * const isFromOther = isEmployeeFromOtherSector(employee); // true
 * 
 * @example
 * const employee = { ID: 456, UF_DEPARTMENT: [366] };
 * const isFromOther = isEmployeeFromOtherSector(employee); // false
 */
export function isEmployeeFromOtherSector(employee) {
  const sectorId = getEmployeeSectorId(employee);
  return sectorId !== null && 
         sectorId !== SECTOR_1C_ID && 
         (sectorId === SECTOR_HARDWARE_ID || 
          sectorId === SECTOR_BITRIX24_ID || 
          sectorId === SECTOR_PDM_ID);
}

