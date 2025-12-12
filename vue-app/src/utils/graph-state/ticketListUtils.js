/**
 * Утилиты для работы со списком тикетов на уровне 4 попапа
 * 
 * Содержит функции для:
 * - Создания контекста перехода на уровень 4 из разных источников
 * - Фильтрации тикетов по контексту
 * - Подготовки тикетов для отображения
 * 
 * Дата создания: 2025-12-12 (UTC+3, Брест)
 * Задача: TASK-034-01, TASK-034-06
 */

import { getDateAccentCategory } from '@/services/dashboard-sector-1c/utils/date-utils.js';
import { DATE_ACCENT_CATEGORIES } from '@/services/dashboard-sector-1c/utils/date-accent-config.js';
import { mapStageId } from '@/services/dashboard-sector-1c/mappers/stage-mapper.js';

/**
 * Контекст перехода на уровень 4 (список тикетов)
 * 
 * @typedef {Object} Level4Context
 * @property {1|2|3} sourceLevel - Уровень, с которого переходим (1, 2, или 3)
 * @property {Number|null} employeeId - ID сотрудника (если есть)
 * @property {String|null} employeeName - Имя сотрудника (если есть)
 * @property {String} stageId - ID стадии ('formed', 'review', 'execution')
 * @property {String} stageName - Название стадии
 * @property {String|null} dateCategory - Ключ категории давности (если есть)
 * @property {String|null} dateCategoryLabel - Название категории давности (если есть)
 * @property {String|null} departmentName - Название заказчика (если есть)
 * @property {Array} tickets - Массив тикетов для отображения
 * @property {Object} snapshot - Слепок с данными
 * @property {Object|null} ticketDetails - Детали тикетов (если загружены)
 */

/**
 * Создать контекст перехода на уровень 4 из уровня 2
 * 
 * @param {Object} level2Data - Данные уровня 2
 * @param {Object} category - Объект категории по времени
 * @returns {Level4Context} Контекст перехода
 */
export function createContextFromLevel2(level2Data, category) {
  return {
    sourceLevel: 2,
    employeeId: level2Data.employeeId,
    employeeName: level2Data.employeeName,
    stageId: level2Data.stageId,
    stageName: level2Data.stageName,
    dateCategory: category.category,
    dateCategoryLabel: category.label,
    departmentName: null,
    tickets: category.tickets || [],
    snapshot: level2Data.snapshot,
    ticketDetails: level2Data.ticketDetails
  };
}

/**
 * Создать контекст перехода на уровень 4 из уровня 3
 * 
 * @param {Object} level3Data - Данные уровня 3
 * @param {Object} department - Объект заказчика
 * @returns {Level4Context} Контекст перехода
 */
export function createContextFromLevel3(level3Data, department) {
  return {
    sourceLevel: 3,
    employeeId: level3Data.employeeId,
    employeeName: level3Data.employeeName,
    stageId: level3Data.stageId,
    stageName: level3Data.stageName,
    dateCategory: level3Data.dateCategory,
    dateCategoryLabel: level3Data.dateCategoryLabel,
    departmentName: department.departmentName,
    tickets: [], // Будет заполнено в функции фильтрации
    snapshot: level3Data.snapshot,
    ticketDetails: level3Data.ticketDetails
  };
}

/**
 * Создать контекст перехода на уровень 4 из уровня 1 (По времени)
 * 
 * @param {Object} level1Data - Данные уровня 1
 * @param {Object} category - Объект категории по времени
 * @returns {Level4Context} Контекст перехода
 */
export function createContextFromLevel1Time(level1Data, category) {
  return {
    sourceLevel: 1,
    employeeId: null,
    employeeName: null,
    stageId: level1Data.stageId,
    stageName: level1Data.stageName,
    dateCategory: category.category,
    dateCategoryLabel: category.label,
    departmentName: null,
    tickets: category.tickets || [],
    snapshot: level1Data.snapshot,
    ticketDetails: level1Data.ticketDetails
  };
}

/**
 * Создать контекст перехода на уровень 4 из уровня 1 (По заказчикам)
 * 
 * @param {Object} level1Data - Данные уровня 1
 * @param {Object} department - Объект заказчика
 * @returns {Level4Context} Контекст перехода
 */
export function createContextFromLevel1Department(level1Data, department) {
  return {
    sourceLevel: 1,
    employeeId: null,
    employeeName: null,
    stageId: level1Data.stageId,
    stageName: level1Data.stageName,
    dateCategory: null,
    dateCategoryLabel: null,
    departmentName: department.departmentName,
    tickets: [], // Будет заполнено в функции фильтрации
    snapshot: level1Data.snapshot,
    ticketDetails: level1Data.ticketDetails
  };
}

/**
 * Фильтровать тикеты по стадии
 * 
 * @param {Array} tickets - Массив тикетов
 * @param {String} stageId - ID стадии ('formed', 'review', 'execution')
 * @returns {Array} Отфильтрованные тикеты
 */
function filterTicketsByStage(tickets, stageId) {
  if (!tickets || tickets.length === 0) {
    return [];
  }

  return tickets.filter(ticket => {
    // Если stageId не определен в тикете, пропускаем его
    if (!ticket.stageId) {
      return false;
    }

    // Преобразовать Bitrix24 stageId во внутренний формат
    const internalStageId = mapStageId(ticket.stageId);
    
    // Сравнить с переданным stageId (уже во внутреннем формате)
    return internalStageId === stageId;
  });
}

/**
 * Фильтровать тикеты по сотруднику
 * 
 * @param {Array} tickets - Массив тикетов
 * @param {Number} employeeId - ID сотрудника
 * @returns {Array} Отфильтрованные тикеты
 */
function filterTicketsByEmployee(tickets, employeeId) {
  if (!tickets || tickets.length === 0) {
    return [];
  }

  return tickets.filter(ticket => {
    const assignedTo = ticket.assignedTo;
    if (!assignedTo) {
      return false;
    }
    
    const assignedToId = typeof assignedTo === 'object' ? assignedTo.id : assignedTo;
    return assignedToId === employeeId;
  });
}

/**
 * Фильтровать тикеты по временной градации
 * 
 * @param {Array} tickets - Массив тикетов
 * @param {String} dateCategory - Ключ категории давности ('today', 'yesterday', ...)
 * @returns {Array} Отфильтрованные тикеты
 */
function filterTicketsByDateCategory(tickets, dateCategory) {
  if (!tickets || tickets.length === 0) {
    return [];
  }

  const currentDate = new Date();

  return tickets.filter(ticket => {
    if (!ticket.createdAt) {
      // Если нет даты создания, относим к категории "БОЛЕЕ ГОДА"
      return dateCategory === DATE_ACCENT_CATEGORIES.MORE_THAN_YEAR;
    }
    
    // Определение категории давности
    const ticketCategory = getDateAccentCategory(ticket.createdAt, currentDate);
    
    return ticketCategory === dateCategory;
  });
}

/**
 * Фильтровать тикеты по заказчику
 * 
 * @param {Array} tickets - Массив тикетов
 * @param {String} departmentName - Название заказчика
 * @returns {Array} Отфильтрованные тикеты
 */
function filterTicketsByDepartment(tickets, departmentName) {
  if (!tickets || tickets.length === 0) {
    return [];
  }

  return tickets.filter(ticket => {
    // Извлечение значения заказчика
    // Используем departmentHeadFull (полное значение) или departmentHead
    let ticketDepartmentName = ticket.departmentHeadFull || ticket.departmentHead;
    
    // Нормализация значения
    if (!ticketDepartmentName) {
      ticketDepartmentName = 'Без заказчика';
    } else {
      ticketDepartmentName = String(ticketDepartmentName).trim();
      if (ticketDepartmentName.length === 0) {
        ticketDepartmentName = 'Без заказчика';
      }
    }
    
    // Сравнение с переданным названием заказчика
    return ticketDepartmentName === departmentName;
  });
}

/**
 * Фильтровать тикеты по контексту перехода на уровень 4
 * 
 * Объединяет данные из snapshot и загруженных деталей, затем фильтрует
 * тикеты по параметрам контекста (сотрудник, стадия, временная градация, заказчик).
 * 
 * @param {Level4Context} context - Контекст перехода
 * @returns {Promise<Array>} Массив отфильтрованных тикетов
 * 
 * @example
 * const context = {
 *   sourceLevel: 2,
 *   employeeId: 456,
 *   stageId: 'formed',
 *   dateCategory: 'today',
 *   departmentName: null,
 *   tickets: [],
 *   snapshot: {...}
 * };
 * const tickets = await filterTicketsByContext(context);
 */
export async function filterTicketsByContext(context) {
  if (!context || !context.snapshot) {
    console.warn('[ticketListUtils] Invalid context or missing snapshot');
    return [];
  }

  // Если тикеты уже переданы в контексте, используем их
  if (context.tickets && context.tickets.length > 0) {
    console.log('[ticketListUtils] Using tickets from context:', context.tickets.length);
    return context.tickets;
  }

  const { snapshot, stageId, employeeId, dateCategory, departmentName } = context;

  // Получить все тикеты стадии из snapshot
  let tickets = snapshot.tickets || [];
  
  // Фильтровать по стадии
  if (stageId) {
    tickets = filterTicketsByStage(tickets, stageId);
  }

  // Фильтровать по сотруднику (если указан)
  if (employeeId) {
    tickets = filterTicketsByEmployee(tickets, employeeId);
  }

  // Фильтровать по временной градации (если указана)
  if (dateCategory) {
    tickets = filterTicketsByDateCategory(tickets, dateCategory);
  }

  // Фильтровать по заказчику (если указан)
  if (departmentName) {
    tickets = filterTicketsByDepartment(tickets, departmentName);
  }

  console.log('[ticketListUtils] Filtered tickets:', {
    totalInSnapshot: snapshot.tickets?.length || 0,
    filteredCount: tickets.length,
    filters: {
      stageId,
      employeeId,
      dateCategory,
      departmentName
    }
  });

  return tickets;
}

/**
 * Подготовить тикеты для отображения на уровне 4
 * 
 * Эта функция будет расширена в следующих этапах для добавления
 * дополнительных полей (ufSubject, priorityColors, serviceColors и т.д.)
 * 
 * @param {Array} tickets - Массив тикетов
 * @param {Object} snapshot - Слепок с данными
 * @param {Object|null} ticketDetails - Детали тикетов (если загружены)
 * @returns {Promise<Array>} Массив подготовленных тикетов
 */
export async function prepareTicketsForDisplay(tickets, snapshot, ticketDetails = null) {
  if (!tickets || tickets.length === 0) {
    return [];
  }

  // Пока просто возвращаем тикеты как есть
  // В следующих этапах добавим обогащение данными
  return tickets;
}
