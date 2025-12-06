/**
 * Маппер для преобразования данных сотрудников из Bitrix24 в внутренний формат
 */

import { getEmployeeSectorId } from '../utils/sector-helper.js';
import { Logger } from '../utils/logger.js';

/**
 * Маппинг сотрудника из Bitrix24 в внутренний формат
 * 
 * @param {object} bitrixUser - Пользователь из Bitrix24
 * @returns {object} Сотрудник во внутреннем формате
 */
export function mapEmployee(bitrixUser) {
  // Определяем сектор из исходных данных Bitrix24 (до маппинга)
  const sectorId = getEmployeeSectorId(bitrixUser);
  
  // Логирование для отладки определения сектора (всегда, независимо от уровня логирования)
  // Используем console.log для гарантированного вывода
  if (import.meta.env?.MODE !== 'production') {
    const logData = {
      employeeId: bitrixUser.ID,
      name: `${bitrixUser.NAME || ''} ${bitrixUser.LAST_NAME || ''}`.trim(),
      UF_DEPARTMENT: bitrixUser.UF_DEPARTMENT,
      UF_DEPARTMENT_type: typeof bitrixUser.UF_DEPARTMENT,
      UF_DEPARTMENT_isArray: Array.isArray(bitrixUser.UF_DEPARTMENT),
      sectorId: sectorId,
      isFromSector1C: sectorId === 366,
      SECTOR_1C_ID: 366
    };
    
    // Выводим в консоль напрямую для гарантированного отображения
    console.log('[EmployeeMapper] Employee mapped:', logData);
    
    // Также используем Logger для структурированного логирования
    Logger.debug(`Employee ${bitrixUser.ID} mapped`, 'EmployeeMapper', logData);
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


