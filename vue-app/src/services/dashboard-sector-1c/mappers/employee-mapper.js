/**
 * Маппер для преобразования данных сотрудников из Bitrix24 в внутренний формат
 */

import { getEmployeeSectorId } from '../utils/sector-helper.js';

/**
 * Маппинг сотрудника из Bitrix24 в внутренний формат
 * 
 * @param {object} bitrixUser - Пользователь из Bitrix24
 * @returns {object} Сотрудник во внутреннем формате
 */
export function mapEmployee(bitrixUser) {
  const sectorId = getEmployeeSectorId(bitrixUser);
  
  // Логирование для отладки определения сектора
  if (process.env.NODE_ENV === 'development') {
    console.log(`[EmployeeMapper] Employee ${bitrixUser.ID}:`, {
      name: `${bitrixUser.NAME || ''} ${bitrixUser.LAST_NAME || ''}`.trim(),
      UF_DEPARTMENT: bitrixUser.UF_DEPARTMENT,
      sectorId: sectorId,
      isFromSector1C: sectorId === 366
    });
  }
  
  return {
    id: parseInt(bitrixUser.ID || bitrixUser.id || 0),
    name: `${bitrixUser.NAME || bitrixUser.name || ''} ${bitrixUser.LAST_NAME || bitrixUser.lastName || ''}`.trim() || bitrixUser.EMAIL || bitrixUser.email || 'Неизвестный',
    position: bitrixUser.WORK_POSITION || bitrixUser.workPosition || 'Сотрудник',
    email: bitrixUser.EMAIL || bitrixUser.email || '',
    sectorId: sectorId, // ID сектора сотрудника (366 = сектор 1С)
    departmentId: bitrixUser.UF_DEPARTMENT || null, // Исходные данные отдела (для отладки)
    tickets: []
  };
}

/**
 * Маппинг массива сотрудников
 * 
 * @param {Array<object>} bitrixUsers - Массив пользователей из Bitrix24
 * @returns {Array<object>} Массив сотрудников во внутреннем формате
 */
export function mapEmployees(bitrixUsers) {
  if (!Array.isArray(bitrixUsers)) {
    return [];
  }

  return bitrixUsers.map(user => mapEmployee(user));
}


