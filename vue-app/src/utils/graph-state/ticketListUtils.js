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
import { getEmployeeTicketsForStage } from '@/utils/graph-state/popupNavigationUtils.js';
import { getPriorityColors } from '@/config/priority-config.js';
import { getServiceColors, getDefaultService } from '@/config/service-config.js';
import TicketDetailsService from '@/services/graph-state/TicketDetailsService.js';

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
 * Создать контекст перехода на уровень 4 из уровня 2 с сортировкой по заказчикам
 * 
 * Использует тикеты сотрудника на стадии и фильтрует их по выбранному заказчику.
 * 
 * @param {Object} level2Data - Данные уровня 2 (содержат все тикеты сотрудника)
 * @param {Object} department - Объект заказчика из группировки
 * @returns {Level4Context} Контекст перехода
 */
export function createContextFromLevel2Department(level2Data, department) {
  // Без данных или названия заказчика возвращаем пустой контекст
  if (!level2Data || !department) {
    return {
      sourceLevel: 2,
      employeeId: level2Data?.employeeId || null,
      employeeName: level2Data?.employeeName || null,
      stageId: level2Data?.stageId || null,
      stageName: level2Data?.stageName || null,
      dateCategory: null,
      dateCategoryLabel: null,
      departmentName: department?.departmentName || null,
      tickets: [],
      snapshot: level2Data?.snapshot || null,
      ticketDetails: level2Data?.ticketDetails || null
    };
  }

  // Фильтруем тикеты сотрудника по выбранному заказчику
  const departmentTickets = filterTicketsByDepartment(
    level2Data.tickets || [],
    department.departmentName
  );

  return {
    sourceLevel: 2,
    employeeId: level2Data.employeeId,
    employeeName: level2Data.employeeName,
    stageId: level2Data.stageId,
    stageName: level2Data.stageName,
    dateCategory: null,
    dateCategoryLabel: null,
    departmentName: department.departmentName,
    tickets: departmentTickets,
    snapshot: level2Data.snapshot,
    ticketDetails: level2Data.ticketDetails
  };
}

/**
 * Создать контекст перехода на уровень 4 из уровня 3
 * 
 * Получает тикеты сотрудника в выбранной временной градации и фильтрует по заказчику.
 * 
 * @param {Object} level3Data - Данные уровня 3
 * @param {Object} department - Объект заказчика
 * @returns {Promise<Level4Context>} Контекст перехода
 */
export async function createContextFromLevel3(level3Data, department) {
  // Получить тикеты сотрудника на стадии
  const employeeTickets = await getEmployeeTicketsForStage(
    level3Data.employeeId,
    level3Data.stageId,
    level3Data.snapshot,
    level3Data.ticketDetails
  );

  // Фильтруем по временной градации
  const dateCategoryTickets = filterTicketsByDateCategory(
    employeeTickets,
    level3Data.dateCategory
  );

  // Фильтруем по заказчику
  const departmentTickets = filterTicketsByDepartment(
    dateCategoryTickets,
    department.departmentName
  );

  return {
    sourceLevel: 3,
    employeeId: level3Data.employeeId,
    employeeName: level3Data.employeeName,
    stageId: level3Data.stageId,
    stageName: level3Data.stageName,
    dateCategory: level3Data.dateCategory,
    dateCategoryLabel: level3Data.dateCategoryLabel,
    departmentName: department.departmentName,
    tickets: departmentTickets,
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
 * Получает все тикеты стадии и фильтрует по заказчику.
 * 
 * @param {Object} level1Data - Данные уровня 1
 * @param {Object} department - Объект заказчика
 * @returns {Level4Context} Контекст перехода
 */
export function createContextFromLevel1Department(level1Data, department) {
  // Получить все тикеты стадии из snapshot
  const allStageTickets = (level1Data.snapshot?.tickets || []).filter(ticket => {
    if (!ticket.stageId) {
      return false;
    }
    const internalStageId = mapStageId(ticket.stageId);
    return internalStageId === level1Data.stageId;
  });

  // Фильтруем по заказчику
  const departmentTickets = filterTicketsByDepartment(
    allStageTickets,
    department.departmentName
  );

  return {
    sourceLevel: 1,
    employeeId: null,
    employeeName: null,
    stageId: level1Data.stageId,
    stageName: level1Data.stageName,
    dateCategory: null,
    dateCategoryLabel: null,
    departmentName: department.departmentName,
    tickets: departmentTickets,
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
export function filterTicketsByDepartment(tickets, departmentName) {
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
 * Если тикеты уже переданы в контексте (из уровня 2 или уровня 1 По времени),
 * использует их напрямую, но проверяет дополнительные фильтры (например, по заказчику).
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

  // Если тикеты уже переданы в контексте (из уровня 2 или уровня 1 По времени),
  // используем их напрямую, но проверяем дополнительные фильтры
  if (context.tickets && context.tickets.length > 0) {
    let tickets = context.tickets;

    // Если указан заказчик, дополнительно фильтруем по нему
    if (context.departmentName) {
      tickets = filterTicketsByDepartment(tickets, context.departmentName);
    }

    console.log('[ticketListUtils] Using tickets from context:', {
      originalCount: context.tickets.length,
      filteredCount: tickets.length,
      departmentFilter: context.departmentName
    });

    return tickets;
  }

  // Если тикеты не переданы, фильтруем из snapshot
  const { snapshot, stageId, employeeId, dateCategory, departmentName } = context;

  // Получить все тикеты стадии из snapshot
  let tickets = snapshot.tickets || [];
  
  // Применяем фильтры последовательно
  if (stageId) {
    tickets = filterTicketsByStage(tickets, stageId);
  }

  if (employeeId) {
    tickets = filterTicketsByEmployee(tickets, employeeId);
  }

  if (dateCategory) {
    tickets = filterTicketsByDateCategory(tickets, dateCategory);
  }

  if (departmentName) {
    tickets = filterTicketsByDepartment(tickets, departmentName);
  }

  console.log('[ticketListUtils] Filtered tickets from snapshot:', {
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
 * Нейтральные цвета для fallback
 */
const NEUTRAL_COLORS = {
  color: '#ced4da',
  backgroundColor: '#f1f3f5',
  textColor: '#6c757d'
};

const NEUTRAL_SERVICE_COLORS = {
  color: '#ced4da',
  backgroundColor: '#f8f9fa',
  textColor: '#6c757d'
};

/**
 * Маппинг статуса из stageId
 * 
 * @param {String} stageId - ID стадии
 * @returns {String} Статус тикета
 */
function mapStatus(stageId) {
  // Простая логика маппинга (можно расширить)
  if (!stageId) {
    return 'new';
  }
  
  // Если стадия в работе - статус in_progress
  if (stageId === 'review' || stageId === 'execution') {
    return 'in_progress';
  }
  
  // Если стадия завершена - статус done
  if (stageId === 'done' || stageId === 'closed') {
    return 'done';
  }
  
  return 'new';
}

/**
 * Определить, какие тикеты требуют загрузки деталей через API
 * 
 * @param {Array} tickets - Массив тикетов
 * @returns {Array} Массив тикетов, которым нужны детали
 */
function identifyTicketsNeedingDetails(tickets) {
  return tickets.filter(ticket => {
    // Проверяем наличие критических полей
    const needsUfSubject = !ticket.ufSubject || ticket.ufSubject === '';
    const needsActionStr = ticket.actionStr === null || ticket.actionStr === undefined;
    const needsDescription = !ticket.description || ticket.description === '';
    
    // Если хотя бы одно поле отсутствует, нужна загрузка
    return needsUfSubject || needsActionStr || needsDescription;
  });
}

/**
 * Создать Map для быстрого доступа к деталям тикетов
 * 
 * @param {Array|Object|null} ticketDetails - Детали тикетов (массив или объект)
 * @returns {Map} Map с ключом ID тикета и значением деталей
 */
function createDetailsMap(ticketDetails) {
  const detailsMap = new Map();

  if (!ticketDetails) {
    return detailsMap;
  }

  // Если передан массив
  if (Array.isArray(ticketDetails)) {
    ticketDetails.forEach(detail => {
      if (detail && detail.id) {
        detailsMap.set(detail.id, detail);
      }
    });
  }
  // Если передан объект (ключ - ID тикета)
  else if (typeof ticketDetails === 'object') {
    Object.keys(ticketDetails).forEach(key => {
      const detail = ticketDetails[key];
      if (detail && detail.id) {
        detailsMap.set(detail.id, detail);
      }
    });
  }

  return detailsMap;
}

/**
 * Подготовить один тикет для отображения
 * 
 * @param {Object} ticket - Тикет из snapshot или контекста
 * @param {Map} detailsMap - Map с деталями тикетов (из API)
 * @returns {Object} Подготовленный тикет для TicketCard.vue
 */
function prepareSingleTicket(ticket, detailsMap) {
  // Получить детали из Map (если есть)
  const details = detailsMap.get(ticket.id) || null;

  // Базовые поля (всегда есть в snapshot)
  const prepared = {
    id: ticket.id,
    title: ticket.title || 'Без названия',
    createdAt: ticket.createdAt || ticket.createdTime || '',
    updatedAt: ticket.updatedAt || ticket.updatedTime || ticket.modifiedAt || ''
  };

  // ufSubject (приоритетное для отображения)
  prepared.ufSubject = details?.ufSubject || ticket.ufSubject || null;

  // Приоритет
  const priorityId = details?.priorityId || ticket.priorityId || 'unknown';
  const priorityLabel = details?.priorityLabel || ticket.priorityLabel || 'Не указано';
  
  // Получить цвета приоритета из конфигурации
  const priorityColors = getPriorityColors(priorityId);
  
  prepared.priorityId = priorityId;
  prepared.priorityLabel = priorityLabel;
  prepared.priorityColors = priorityColors;
  prepared.priority = priorityId; // legacy поле

  // Сервис
  const service = details?.service || ticket.service || getDefaultService();
  const serviceLabel = details?.serviceLabel || ticket.serviceLabel || service.label || 'Не указано';
  
  // Получить цвета сервиса из конфигурации
  const serviceColors = getServiceColors(service);
  
  prepared.service = service;
  prepared.serviceLabel = serviceLabel;
  prepared.serviceColors = serviceColors;

  // actionStr (UF_ACTION_STR)
  prepared.actionStr = details?.actionStr || ticket.actionStr || ticket.ufActionStr || null;
  prepared.ufActionStr = prepared.actionStr; // для обратной совместимости

  // departmentHead (уже есть в snapshot, но проверяем)
  prepared.departmentHead = details?.departmentHead || ticket.departmentHead || null;
  prepared.departmentHeadFull = details?.departmentHeadFull || ticket.departmentHeadFull || ticket.departmentHead || null;

  // description
  prepared.description = details?.description || ticket.description || ticket.comments || '';

  // assignedTo (для обратной совместимости)
  prepared.assignedTo = ticket.assignedTo || null;
  prepared.assigneeId = ticket.assigneeId || (ticket.assignedTo?.id || null);

  // stageId (для обратной совместимости)
  prepared.stageId = ticket.stageId || null;

  // status (вычисляется из stageId, если нужно)
  if (!prepared.status && prepared.stageId) {
    prepared.status = mapStatus(prepared.stageId);
  } else {
    prepared.status = ticket.status || 'new';
  }

  return prepared;
}

/**
 * Подготовить тикеты для отображения в TicketCard.vue
 * 
 * Объединяет данные из snapshot и загруженных деталей через API,
 * нормализует данные для соответствия структуре TicketCard.vue,
 * обрабатывает отсутствующие поля (fallback значения).
 * 
 * @param {Array} tickets - Массив тикетов из snapshot или контекста
 * @param {Object|null} snapshot - Слепок с данными (для получения дополнительных данных)
 * @param {Object|null} ticketDetails - Детали тикетов (если уже загружены через API)
 * @returns {Promise<Array>} Массив подготовленных тикетов для отображения
 * 
 * @example
 * const preparedTickets = await prepareTicketsForDisplay(tickets, snapshot, null);
 */
export async function prepareTicketsForDisplay(tickets, snapshot = null, ticketDetails = null) {
  // Измерение производительности
  console.time('[Performance] prepareTicketsForDisplay');
  
  if (!tickets || tickets.length === 0) {
    console.timeEnd('[Performance] prepareTicketsForDisplay');
    return [];
  }

  // Определить, какие тикеты нужно загрузить через API
  const ticketsNeedingDetails = identifyTicketsNeedingDetails(tickets);
  
  console.log('[ticketListUtils] Tickets needing details:', {
    total: tickets.length,
    needingDetails: ticketsNeedingDetails.length,
    alreadyHaveDetails: tickets.length - ticketsNeedingDetails.length
  });

  // Загрузить недостающие данные через API (если нужно)
  let loadedDetails = ticketDetails || null;
  if (ticketsNeedingDetails.length > 0 && !ticketDetails) {
    const ticketIds = ticketsNeedingDetails.map(t => t.id).filter(id => id);
    
    if (ticketIds.length > 0) {
      try {
        console.log('[ticketListUtils] Loading ticket details via API:', {
          ticketIdsCount: ticketIds.length,
          ticketIdsSample: ticketIds.slice(0, 5)
        });
        
        loadedDetails = await TicketDetailsService.getTicketsDetails(ticketIds);
        
        console.log('[ticketListUtils] Ticket details loaded:', {
          loadedCount: loadedDetails?.length || 0,
          sampleTicket: loadedDetails?.[0] ? {
            id: loadedDetails[0].id,
            hasUfSubject: !!loadedDetails[0].ufSubject,
            hasActionStr: !!loadedDetails[0].actionStr,
            hasDescription: !!loadedDetails[0].description
          } : null
        });
      } catch (error) {
        console.warn('[ticketListUtils] Failed to load ticket details:', error);
        console.error('[ticketListUtils] Error details:', {
          message: error.message,
          stack: error.stack,
          ticketIdsCount: ticketIds.length
        });
        loadedDetails = null;
      }
    }
  }

  // Создать Map для быстрого доступа к загруженным деталям
  const detailsMap = createDetailsMap(loadedDetails);

  // Подготовить каждый тикет
  const preparedTickets = tickets.map(ticket => {
    return prepareSingleTicket(ticket, detailsMap);
  });

  console.log('[ticketListUtils] Tickets prepared for display:', {
    totalPrepared: preparedTickets.length,
    sampleTicket: preparedTickets[0] ? {
      id: preparedTickets[0].id,
      hasUfSubject: !!preparedTickets[0].ufSubject,
      hasPriorityColors: !!preparedTickets[0].priorityColors,
      hasServiceColors: !!preparedTickets[0].serviceColors
    } : null
  });

  console.timeEnd('[Performance] prepareTicketsForDisplay');
  return preparedTickets;
}





