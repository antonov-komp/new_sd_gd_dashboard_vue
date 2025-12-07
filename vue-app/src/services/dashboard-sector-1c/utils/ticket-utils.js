/**
 * Утилиты для работы с тикетами
 * 
 * Централизованная логика для работы с полями тикетов,
 * особенно для извлечения ID ответственного сотрудника
 */

/**
 * Константа ID ответственного "Хранитель объектов"
 * 
 * Тикеты с этим ответственным попадают в нулевую точку
 */
export const KEEPER_OBJECTS_ID = 1051;

/**
 * Извлечение ID ответственного сотрудника из тикета
 * 
 * Поддерживает различные варианты имени поля:
 * - assignedById (camelCase)
 * - ASSIGNED_BY_ID (UPPER_CASE)
 * - assignedByIdId (альтернативное имя)
 * - Объект с полями id/ID/value
 * 
 * @param {object} ticket - Тикет из Bitrix24
 * @returns {string|number|null} ID ответственного или null
 * 
 * @example
 * const ticket = { assignedById: 123 };
 * const id = getAssignedById(ticket); // 123
 * 
 * @example
 * const ticket = { ASSIGNED_BY_ID: '456' };
 * const id = getAssignedById(ticket); // '456'
 * 
 * @example
 * const ticket = { assignedById: { id: 789 } };
 * const id = getAssignedById(ticket); // 789
 */
export function getAssignedById(ticket) {
  if (!ticket || typeof ticket !== 'object') {
    return null;
  }
  
  // Пробуем разные варианты имени поля
  let assignedById = ticket.assignedById || 
                     ticket.ASSIGNED_BY_ID || 
                     ticket.assignedByIdId ||
                     ticket['assignedById'];
  
  // Если значение — объект, извлекаем id/ID/value
  if (assignedById && typeof assignedById === 'object') {
    assignedById = assignedById.id || assignedById.ID || assignedById.value || null;
  }
  
  return assignedById || null;
}

/**
 * Парсинг ID сотрудника из значения assignedById
 * 
 * Преобразует значение в число, если возможно.
 * Обрабатывает строки, числа и объекты.
 * 
 * @param {string|number|object|null} assignedById - Значение поля assignedById
 * @returns {number|null} ID сотрудника как число или null
 * 
 * @example
 * parseEmployeeId(123); // 123
 * parseEmployeeId('456'); // 456
 * parseEmployeeId({ id: 789 }); // 789
 * parseEmployeeId(null); // null
 * parseEmployeeId('invalid'); // null
 */
export function parseEmployeeId(assignedById) {
  if (assignedById === null || assignedById === undefined) {
    return null;
  }
  
  // Если это объект, извлекаем значение
  if (typeof assignedById === 'object') {
    assignedById = assignedById.id || assignedById.ID || assignedById.value || null;
  }
  
  // Парсим в число
  const employeeId = typeof assignedById === 'number' 
    ? assignedById 
    : parseInt(assignedById);
  
  // Проверяем валидность
  if (isNaN(employeeId) || employeeId <= 0) {
    return null;
  }
  
  return employeeId;
}

/**
 * Проверка, является ли тикет нулевой точкой
 * 
 * Нулевая точка включает:
 * - Тикеты без назначенного сотрудника (assignedById === null)
 * - Тикеты с ответственным KEEPER_OBJECTS_ID (Хранитель объектов)
 * 
 * @param {object} ticket - Тикет из Bitrix24
 * @param {number} keeperId - ID хранителя объектов (по умолчанию KEEPER_OBJECTS_ID)
 * @returns {boolean} true, если тикет является нулевой точкой
 * 
 * @example
 * const ticket1 = { assignedById: null };
 * isZeroPointTicket(ticket1); // true
 * 
 * @example
 * const ticket2 = { assignedById: 1051 };
 * isZeroPointTicket(ticket2); // true
 * 
 * @example
 * const ticket3 = { assignedById: 123 };
 * isZeroPointTicket(ticket3); // false
 */
export function isZeroPointTicket(ticket, keeperId = KEEPER_OBJECTS_ID) {
  const assignedById = getAssignedById(ticket);
  const employeeId = parseEmployeeId(assignedById);
  
  // Нулевая точка: нет ответственного ИЛИ ответственный — хранитель объектов
  return employeeId === null || employeeId === keeperId;
}


