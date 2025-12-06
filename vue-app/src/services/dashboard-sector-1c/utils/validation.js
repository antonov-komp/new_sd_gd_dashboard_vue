/**
 * Утилиты для валидации данных дашборда сектора 1С
 */

/**
 * Валидация ID тикета
 * 
 * @param {*} ticketId - ID тикета
 * @returns {boolean} true, если ID валиден
 */
export function isValidTicketId(ticketId) {
  return typeof ticketId === 'number' && ticketId > 0 && !isNaN(ticketId);
}

/**
 * Валидация ID сотрудника
 * 
 * @param {*} employeeId - ID сотрудника
 * @returns {boolean} true, если ID валиден
 */
export function isValidEmployeeId(employeeId) {
  return typeof employeeId === 'number' && employeeId > 0 && !isNaN(employeeId);
}

/**
 * Валидация ID стадии
 * 
 * @param {*} stageId - ID стадии
 * @returns {boolean} true, если ID стадии валиден
 */
export function isValidStageId(stageId) {
  const validStages = ['formed', 'review', 'execution'];
  return typeof stageId === 'string' && validStages.includes(stageId);
}

/**
 * Валидация данных тикета
 * 
 * @param {object} ticket - Объект тикета
 * @returns {boolean} true, если тикет валиден
 */
export function isValidTicket(ticket) {
  if (!ticket || typeof ticket !== 'object') {
    return false;
  }

  return isValidTicketId(ticket.id) &&
         typeof ticket.title === 'string' &&
         ticket.title.trim().length > 0;
}

/**
 * Валидация данных сотрудника
 * 
 * @param {object} employee - Объект сотрудника
 * @returns {boolean} true, если сотрудник валиден
 */
export function isValidEmployee(employee) {
  if (!employee || typeof employee !== 'object') {
    return false;
  }

  return isValidEmployeeId(employee.id) &&
         typeof employee.name === 'string' &&
         employee.name.trim().length > 0;
}

/**
 * Валидация возможности перемещения тикета
 * 
 * Проверяет, можно ли переместить тикет на указанного сотрудника и стадию
 * 
 * @param {object} ticket - Тикет
 * @param {number} employeeId - ID сотрудника
 * @param {string} stageId - ID стадии
 * @returns {boolean} true, если перемещение возможно
 */
export function canMoveTicket(ticket, employeeId, stageId) {
  if (!isValidTicket(ticket)) {
    return false;
  }

  if (!isValidEmployeeId(employeeId)) {
    return false;
  }

  if (!isValidStageId(stageId)) {
    return false;
  }

  // Нельзя переместить тикет на того же сотрудника и ту же стадию
  if (ticket.assigneeId === employeeId && ticket.stageId === stageId) {
    return false;
  }

  return true;
}

/**
 * Валидация данных для создания тикета
 * 
 * @param {object} ticketData - Данные тикета
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validateTicketData(ticketData) {
  const errors = [];

  if (!ticketData || typeof ticketData !== 'object') {
    errors.push('Данные тикета должны быть объектом');
    return { valid: false, errors };
  }

  if (!ticketData.title || typeof ticketData.title !== 'string' || ticketData.title.trim().length === 0) {
    errors.push('Название тикета обязательно');
  }

  if (ticketData.stageId && !isValidStageId(ticketData.stageId)) {
    errors.push('Некорректный ID стадии');
  }

  if (ticketData.employeeId && !isValidEmployeeId(ticketData.employeeId)) {
    errors.push('Некорректный ID сотрудника');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}


