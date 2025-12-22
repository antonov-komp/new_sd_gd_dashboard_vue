/**
 * Утилиты для определения сектора сотрудника
 * 
 * Помогает определить, к какому сектору принадлежит сотрудник
 * на основе поля UF_DEPARTMENT из Bitrix24
 */

import {
  SECTOR_IDS,
  ALL_SECTOR_IDS,
  isSectorId
} from './sector-constants.js';
import { Logger } from './logger.js';

/**
 * Кеш для результатов определения сектора
 * Ключ: employee.id, Значение: sectorId (number | null)
 */
const sectorCache = new Map();

/**
 * Очистка кеша секторов
 * 
 * Используется при обновлении данных сотрудников или при необходимости
 * пересчитать секторы заново.
 * 
 * @example
 * clearSectorCache();
 */
export function clearSectorCache() {
  sectorCache.clear();
}

/**
 * Нормализация поля UF_DEPARTMENT
 * 
 * Преобразует поле отдела в единый формат (массив чисел).
 * Обрабатывает случаи: массив, число, undefined, null.
 * 
 * @param {number|Array<number>|undefined|null} department - Поле отдела
 * @returns {Array<number>} Массив ID отделов
 * 
 * @private
 */
function normalizeDepartment(department) {
  if (!department) {
    return [];
  }
  
  if (Array.isArray(department)) {
    return department.filter(id => typeof id === 'number' || !isNaN(parseInt(id)))
      .map(id => typeof id === 'number' ? id : parseInt(id));
  }
  
  if (typeof department === 'number') {
    return [department];
  }
  
  // Попытка преобразовать строку в число
  const parsed = parseInt(department);
  if (!isNaN(parsed)) {
    return [parsed];
  }
  
  return [];
}

/**
 * Получение ID сектора сотрудника
 * 
 * Определяет, к какому сектору принадлежит сотрудник на основе поля UF_DEPARTMENT.
 * UF_DEPARTMENT может быть массивом или числом.
 * 
 * Использует кеширование для оптимизации повторных вызовов.
 * 
 * @param {object} employee - Объект сотрудника из Bitrix24
 * @param {number} employee.id - ID сотрудника (используется для кеширования)
 * @param {number|Array<number>} employee.UF_DEPARTMENT - ID отдела(ов) сотрудника
 * @param {boolean} useCache - Использовать кеш (по умолчанию true)
 * @returns {number|null} ID сектора (366, 368, 369, 367) или null, если сектор не определён
 * 
 * @example
 * const employee = { id: 123, UF_DEPARTMENT: [366] };
 * const sectorId = getEmployeeSectorId(employee); // 366 (вычисляется и кешируется)
 * const sectorId2 = getEmployeeSectorId(employee); // 366 (из кеша)
 * 
 * @example
 * const employee = { id: 456, UF_DEPARTMENT: 368 };
 * const sectorId = getEmployeeSectorId(employee); // 368
 * 
 * @example
 * const employee = { id: 789, UF_DEPARTMENT: [999] };
 * const sectorId = getEmployeeSectorId(employee); // null
 * 
 * @example
 * // Использование без кеша (для тестирования)
 * const sectorId = getEmployeeSectorId(employee, false);
 */
export function getEmployeeSectorId(employee, useCache = true) {
  // Поддержка как ID (после маппинга), так и ID (из Bitrix24)
  const employeeId = employee.id || employee.ID;
  
  if (!employee || !employeeId) {
    if (import.meta.env?.MODE !== 'production') {
      console.warn('[SectorHelper] Employee or ID is missing:', { employee, employeeId });
    }
    return null;
  }
  
  // Проверка кеша (используем employeeId для ключа)
  if (useCache && sectorCache.has(employeeId)) {
    const cachedSectorId = sectorCache.get(employeeId);
    if (import.meta.env?.MODE !== 'production') {
      console.log(`[SectorHelper] Cache hit for employee ${employeeId}:`, cachedSectorId);
    }
    return cachedSectorId;
  }
  
  // Поддержка как UF_DEPARTMENT (из Bitrix24), так и departmentId (после маппинга)
  // Приоритет: сначала проверяем исходные данные из Bitrix24 (UF_DEPARTMENT),
  // затем departmentId (сохранённые данные после маппинга)
  const departmentField = employee.UF_DEPARTMENT || employee.departmentId;
  const departments = normalizeDepartment(departmentField);
  
  // Логирование для отладки (только в development)
  // Выводим в консоль напрямую для гарантированного отображения
  if (import.meta.env?.MODE !== 'production') {
    const logData = {
      employeeId: employee.id,
      employeeName: employee.name || employee.NAME || 'Unknown',
      UF_DEPARTMENT: employee.UF_DEPARTMENT,
      UF_DEPARTMENT_type: typeof employee.UF_DEPARTMENT,
      departmentId: employee.departmentId,
      departmentField: departmentField,
      departments: departments,
      departments_length: departments.length,
      ALL_SECTOR_IDS: ALL_SECTOR_IDS
    };
    
    console.log('[SectorHelper] Determining sector for employee:', logData);
    Logger.debug(`Determining sector for employee ${employee.id}`, 'SectorHelper', logData);
  }
  
  // Поиск первого совпадения с сектором
  for (const deptId of departments) {
    const isSector = isSectorId(deptId);
    
    // Логирование для отладки (только для важных случаев)
    if (import.meta.env?.MODE !== 'production' && deptId === SECTOR_IDS.SECTOR_1C) {
      console.log('[SectorHelper] Found SECTOR_1C department:', {
        deptId: deptId,
        employeeId: employee.id,
        isSector: isSector
      });
    }
    
    if (isSector) {
      const sectorId = deptId;
      
      // Сохранение в кеш (используем employeeId для ключа)
      if (useCache) {
        sectorCache.set(employeeId, sectorId);
      }
      
      if (import.meta.env?.MODE !== 'production') {
        const result = {
          employeeId: employee.id,
          employeeName: employee.name || employee.NAME || 'Unknown',
          sectorId: sectorId,
          isFromSector1C: sectorId === SECTOR_IDS.SECTOR_1C
        };
        console.log('[SectorHelper] Sector determined:', result);
        Logger.debug(`Sector determined for employee ${employee.id}: ${sectorId}`, 'SectorHelper', result);
      }
      
      return sectorId;
    }
  }
  
  // Сохранение null в кеш (не определён сектор)
  if (useCache) {
    sectorCache.set(employeeId, null);
  }
  
  if (import.meta.env?.MODE !== 'production') {
    console.warn(`[SectorHelper] Sector not found for employee ${employeeId}:`, {
      employeeId: employeeId,
      UF_DEPARTMENT: employee.UF_DEPARTMENT,
      departmentId: employee.departmentId,
      departments: departments
    });
  }
  
  return null;
}

/**
 * Проверка принадлежности сотрудника к сектору 1С
 * 
 * @param {object} employee - Объект сотрудника из Bitrix24
 * @param {number} employee.id - ID сотрудника
 * @param {number|Array<number>} employee.UF_DEPARTMENT - ID отдела(ов) сотрудника
 * @returns {boolean} true, если сотрудник принадлежит к сектору 1С (366)
 * 
 * @example
 * const employee = { id: 123, UF_DEPARTMENT: [366] };
 * const isFrom1C = isEmployeeFromSector1C(employee); // true
 * 
 * @example
 * const employee = { id: 456, UF_DEPARTMENT: [368] };
 * const isFrom1C = isEmployeeFromSector1C(employee); // false
 */
export function isEmployeeFromSector1C(employee) {
  return getEmployeeSectorId(employee) === SECTOR_IDS.SECTOR_1C;
}

/**
 * Проверка принадлежности сотрудника к другому сектору (не 1С и не хранитель)
 * 
 * Проверяет, принадлежит ли сотрудник к сектору Железо (368), Битрикс24 (369) или PDM (367).
 * Хранитель (1051) не считается сотрудником другого сектора.
 * 
 * @param {object} employee - Объект сотрудника из Bitrix24
 * @param {number} employee.id - ID сотрудника
 * @param {number|Array<number>} employee.UF_DEPARTMENT - ID отдела(ов) сотрудника
 * @returns {boolean} true, если сотрудник принадлежит к другому сектору
 * 
 * @example
 * const employee = { id: 123, UF_DEPARTMENT: [368] };
 * const isFromOther = isEmployeeFromOtherSector(employee); // true
 * 
 * @example
 * const employee = { id: 456, UF_DEPARTMENT: [366] };
 * const isFromOther = isEmployeeFromOtherSector(employee); // false
 */
export function isEmployeeFromOtherSector(employee) {
  const sectorId = getEmployeeSectorId(employee);
  
  if (!sectorId) {
    return false;
  }
  
  return sectorId !== SECTOR_IDS.SECTOR_1C && sectorId !== SECTOR_IDS.KEEPER;
}

/**
 * Проверка, является ли сотрудник хранителем
 * 
 * Проверяет, является ли сотрудник хранителем нулевой очереди (ID: 1051).
 * 
 * @param {object} employee - Объект сотрудника из Bitrix24
 * @param {number} employee.id - ID сотрудника
 * @param {number|Array<number>} employee.UF_DEPARTMENT - ID отдела(ов) сотрудника
 * @returns {boolean} true, если сотрудник является хранителем
 * 
 * @example
 * const employee = { id: 1051, UF_DEPARTMENT: [1051] };
 * const isKeeper = isKeeper(employee); // true
 * 
 * @example
 * const employee = { id: 123, UF_DEPARTMENT: [366] };
 * const isKeeper = isKeeper(employee); // false
 */
export function isKeeper(employee) {
  if (!employee || !employee.UF_DEPARTMENT) {
    return false;
  }
  
  const departments = normalizeDepartment(employee.UF_DEPARTMENT);
  return departments.includes(SECTOR_IDS.KEEPER);
}

