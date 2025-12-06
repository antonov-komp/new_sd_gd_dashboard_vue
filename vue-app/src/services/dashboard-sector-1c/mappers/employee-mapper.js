/**
 * Маппер для преобразования данных сотрудников из Bitrix24 в внутренний формат
 */

/**
 * Маппинг сотрудника из Bitrix24 в внутренний формат
 * 
 * @param {object} bitrixUser - Пользователь из Bitrix24
 * @returns {object} Сотрудник во внутреннем формате
 */
export function mapEmployee(bitrixUser) {
  return {
    id: parseInt(bitrixUser.ID || bitrixUser.id || 0),
    name: `${bitrixUser.NAME || bitrixUser.name || ''} ${bitrixUser.LAST_NAME || bitrixUser.lastName || ''}`.trim() || bitrixUser.EMAIL || bitrixUser.email || 'Неизвестный',
    position: bitrixUser.WORK_POSITION || bitrixUser.workPosition || 'Сотрудник',
    email: bitrixUser.EMAIL || bitrixUser.email || '',
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


