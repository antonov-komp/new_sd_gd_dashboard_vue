/**
 * Модуль для нормализации данных сектора в формат слепка версии 1.0
 * 
 * Преобразует данные из формата DashboardSector1CService.getSectorData()
 * в формат слепка согласно структуре версии 1.0 (TASK-019-01-01)
 * 
 * @module snapshot-normalizer
 */

import { STAGE_ID_TO_BITRIX, STAGES } from '@/services/dashboard-sector-1c/utils/constants.js';
import { KEEPER_OBJECTS_ID } from '@/services/dashboard-sector-1c/utils/ticket-utils.js';

/**
 * Константы для маппинга этапов
 */
const STAGE_MAPPING = {
  'formed': {
    bitrixId: STAGE_ID_TO_BITRIX.formed,
    name: STAGES.FORMED.name
  },
  'review': {
    bitrixId: STAGE_ID_TO_BITRIX.review,
    name: STAGES.REVIEW.name
  },
  'execution': {
    bitrixId: STAGE_ID_TO_BITRIX.execution,
    name: STAGES.EXECUTION.name
  }
};

/**
 * ID хранителя объектов (нулевая точка)
 */
const KEEPER_EMPLOYEE_ID = KEEPER_OBJECTS_ID;

/**
 * Нормализовать данные сектора в формат слепка версии 1.0
 * 
 * Преобразует данные из формата DashboardSector1CService.getSectorData()
 * в формат слепка согласно структуре версии 1.0 (TASK-019-01-01)
 * 
 * @param {Object} sectorData - Данные сектора из DashboardSector1CService
 * @param {Array} sectorData.stages - Массив этапов с сотрудниками и тикетами
 * @param {Array} sectorData.employees - Массив всех сотрудников
 * @param {Object} sectorData.zeroPointTickets - Тикеты нулевой точки
 * @returns {Object} Нормализованные данные для слепка: { statistics, ticketIds, tickets }
 * 
 * @example
 * const sectorData = await SectorDataAdapter.getSectorDataForSnapshot();
 * const normalizedData = normalizeSectorDataToSnapshot(sectorData);
 * const snapshot = await SnapshotService.createSnapshot(normalizedData, 'week_start', {...});
 */
export function normalizeSectorDataToSnapshot(sectorData) {
  if (!sectorData || typeof sectorData !== 'object') {
    throw new Error('Invalid sector data: sectorData must be an object');
  }

  if (!sectorData.stages || !Array.isArray(sectorData.stages)) {
    throw new Error('Invalid sector data: stages are required and must be an array');
  }

  // Извлечение статистики по этапам
  const stagesStatistics = extractStagesStatistics(sectorData.stages);

  // Извлечение статистики по сотрудникам
  const employeesStatistics = extractEmployeesStatistics(sectorData.stages);

  // Извлечение статистики нулевой точки
  const zeroPointStatistics = extractZeroPointStatistics(sectorData.zeroPointTickets || {});

  // Извлечение статистики нулевой точки по этапам (для детализации)
  const zeroPointByStage = extractZeroPointByStage(sectorData.zeroPointTickets || {});

  // Извлечение данных о тикетах
  const ticketsData = extractTicketsData(sectorData.stages, sectorData.zeroPointTickets || {});

  // Формирование структуры статистики
  const statistics = {
    stages: stagesStatistics,
    employees: employeesStatistics,
    zeroPoint: zeroPointStatistics,
    zeroPointByStage: zeroPointByStage // Добавляем детализацию по этапам
  };

  return {
    statistics,
    ticketIds: ticketsData.ticketIds,
    tickets: ticketsData.tickets
  };
}

/**
 * Извлечь статистику по этапам
 * 
 * @param {Array} stages - Массив этапов
 * @returns {Object} Статистика по этапам: { formed: {...}, review: {...}, execution: {...}, total: number }
 * @private
 */
function extractStagesStatistics(stages) {
  const result = {
    formed: { count: 0, stageId: STAGE_MAPPING.formed.bitrixId, stageName: STAGE_MAPPING.formed.name },
    review: { count: 0, stageId: STAGE_MAPPING.review.bitrixId, stageName: STAGE_MAPPING.review.name },
    execution: { count: 0, stageId: STAGE_MAPPING.execution.bitrixId, stageName: STAGE_MAPPING.execution.name },
    total: 0
  };

  stages.forEach(stage => {
    if (!STAGE_MAPPING[stage.id]) {
      console.warn(`Unknown stage ID: ${stage.id}`);
      return;
    }

    // Подсчитать количество тикетов на этапе
    let stageTicketCount = 0;
    if (stage.employees && Array.isArray(stage.employees)) {
      stage.employees.forEach(employee => {
        if (employee.tickets && Array.isArray(employee.tickets)) {
          stageTicketCount += employee.tickets.length;
        }
      });
    }

    result[stage.id].count = stageTicketCount;
    result.total += stageTicketCount;
  });

  return result;
}

/**
 * Извлечь статистику по сотрудникам
 * 
 * @param {Array} stages - Массив этапов
 * @returns {Array} Массив статистики по сотрудникам
 * @private
 */
function extractEmployeesStatistics(stages) {
  const employeesMap = new Map();

  stages.forEach(stage => {
    if (!stage.employees || !Array.isArray(stage.employees)) {
      return;
    }

    stage.employees.forEach(employee => {
      if (!employee || !employee.id) {
        return;
      }

      if (!employeesMap.has(employee.id)) {
        employeesMap.set(employee.id, {
          id: employee.id,
          name: employee.name || `Сотрудник #${employee.id}`,
          ticketsByStage: {
            formed: 0,
            review: 0,
            execution: 0
          },
          totalTickets: 0
        });
      }

      const emp = employeesMap.get(employee.id);
      const ticketCount = employee.tickets && Array.isArray(employee.tickets) ? employee.tickets.length : 0;
      
      if (STAGE_MAPPING[stage.id]) {
        emp.ticketsByStage[stage.id] = (emp.ticketsByStage[stage.id] || 0) + ticketCount;
      }
      emp.totalTickets += ticketCount;
    });
  });

  return Array.from(employeesMap.values());
}

/**
 * Извлечь статистику нулевой точки
 * 
 * @param {Object} zeroPointTickets - Тикеты нулевой точки по этапам
 * @returns {Object} Статистика нулевой точки: { unassigned: number, keeper: number, total: number }
 * @private
 */
function extractZeroPointStatistics(zeroPointTickets) {
  let unassigned = 0;
  let keeper = 0;

  if (!zeroPointTickets || typeof zeroPointTickets !== 'object') {
    return { unassigned: 0, keeper: 0, total: 0 };
  }

  Object.values(zeroPointTickets).forEach(tickets => {
    if (!Array.isArray(tickets)) {
      return;
    }

    tickets.forEach(ticket => {
      if (!ticket) {
        return;
      }

      // Проверяем assignedTo (может быть объектом или null)
      const assignedTo = ticket.assignedTo || ticket.assignedById;
      
      if (!assignedTo || assignedTo === null) {
        unassigned++;
      } else {
        // Проверяем, является ли ответственный хранителем объектов
        const assignedToId = typeof assignedTo === 'object' ? assignedTo.id : assignedTo;
        if (assignedToId === KEEPER_EMPLOYEE_ID) {
          keeper++;
        } else {
          // Если есть assignedTo, но это не хранитель, считаем как unassigned
          // (такие тикеты не должны попадать в нулевую точку, но на всякий случай)
          unassigned++;
        }
      }
    });
  });

  return {
    unassigned,
    keeper,
    total: unassigned + keeper
  };
}

/**
 * Извлечь статистику нулевой точки по этапам (для детализации)
 * 
 * @param {Object} zeroPointTickets - Тикеты нулевой точки по этапам
 * @returns {Object} Статистика нулевой точки по этапам: { formed: { keeper: number, unassigned: number }, ... }
 * @private
 */
function extractZeroPointByStage(zeroPointTickets) {
  const result = {
    formed: { keeper: 0, unassigned: 0, total: 0 },
    review: { keeper: 0, unassigned: 0, total: 0 },
    execution: { keeper: 0, unassigned: 0, total: 0 }
  };

  if (!zeroPointTickets || typeof zeroPointTickets !== 'object') {
    return result;
  }

  // Обрабатываем каждый этап
  Object.keys(result).forEach(stageId => {
    const tickets = zeroPointTickets[stageId];
    if (!Array.isArray(tickets)) {
      return;
    }

    tickets.forEach(ticket => {
      if (!ticket) {
        return;
      }

      // Проверяем assignedTo (может быть объектом или null)
      const assignedTo = ticket.assignedTo || ticket.assignedById;
      
      if (!assignedTo || assignedTo === null) {
        result[stageId].unassigned++;
      } else {
        // Проверяем, является ли ответственный хранителем объектов
        const assignedToId = typeof assignedTo === 'object' ? assignedTo.id : assignedTo;
        if (assignedToId === KEEPER_EMPLOYEE_ID) {
          result[stageId].keeper++;
        } else {
          result[stageId].unassigned++;
        }
      }
      result[stageId].total++;
    });
  });

  return result;
}

/**
 * Извлечь данные о тикетах (ID и минимальная информация)
 * 
 * @param {Array} stages - Массив этапов
 * @param {Object} zeroPointTickets - Тикеты нулевой точки
 * @returns {Object} Объект с ticketIds и tickets: { ticketIds: Array<number>, tickets: Array<Object> }
 * @private
 */
function extractTicketsData(stages, zeroPointTickets) {
  const ticketIdsSet = new Set();
  const ticketsMap = new Map();

  // Собрать тикеты из этапов
  if (Array.isArray(stages)) {
    stages.forEach(stage => {
      if (!stage.employees || !Array.isArray(stage.employees)) {
        return;
      }

      stage.employees.forEach(employee => {
        if (!employee.tickets || !Array.isArray(employee.tickets)) {
          return;
        }

        employee.tickets.forEach(ticket => {
          if (!ticket || !ticket.id) {
            console.warn('Ticket without ID found:', ticket);
            return;
          }

          const ticketId = parseInt(ticket.id);
          if (isNaN(ticketId)) {
            console.warn('Invalid ticket ID:', ticket.id);
            return;
          }

          ticketIdsSet.add(ticketId);
          
          // Извлекаем assignedTo из тикета или используем данные сотрудника
          let assignedTo = ticket.assignedTo;
          if (!assignedTo && employee.id) {
            assignedTo = {
              id: employee.id,
              name: employee.name || `Сотрудник #${employee.id}`
            };
          }

          // Сохраняем полные данные о тикете, включая departmentHead и stageId
          ticketsMap.set(ticketId, {
            id: ticketId,
            title: ticket.title || 'Без названия',
            assignedTo: assignedTo || null,
            createdAt: normalizeDate(ticket.createdAt || ticket.createdTime),
            updatedAt: normalizeDate(ticket.updatedAt || ticket.modifiedAt || ticket.updatedTime),
            // ВАЖНО: Сохраняем полные данные для попапа
            stageId: ticket.stageId || stage.id || null, // Bitrix24 stageId или внутренний
            departmentHead: ticket.departmentHead || null,
            departmentHeadFull: ticket.departmentHeadFull || ticket.departmentHead || null,
            priorityId: ticket.priorityId || null,
            priorityLabel: ticket.priorityLabel || null,
            service: ticket.service || null,
            serviceLabel: ticket.serviceLabel || null
          });
        });
      });
    });
  }

  // Собрать тикеты из нулевой точки
  if (zeroPointTickets && typeof zeroPointTickets === 'object') {
    Object.values(zeroPointTickets).forEach(tickets => {
      if (!Array.isArray(tickets)) {
        return;
      }

      tickets.forEach(ticket => {
        if (!ticket || !ticket.id) {
          console.warn('Ticket without ID found in zero point:', ticket);
          return;
        }

        const ticketId = parseInt(ticket.id);
        if (isNaN(ticketId)) {
          console.warn('Invalid ticket ID in zero point:', ticket.id);
          return;
        }

        ticketIdsSet.add(ticketId);
        
        // Для нулевой точки assignedTo может быть null или хранителем
        let assignedTo = ticket.assignedTo;
        if (!assignedTo && ticket.assignedById) {
          const assignedById = typeof ticket.assignedById === 'object' 
            ? ticket.assignedById.id || ticket.assignedById.value
            : ticket.assignedById;
          
          if (assignedById && assignedById !== KEEPER_EMPLOYEE_ID) {
            assignedTo = {
              id: assignedById,
              name: 'Неизвестный'
            };
          } else if (assignedById === KEEPER_EMPLOYEE_ID) {
            assignedTo = {
              id: KEEPER_EMPLOYEE_ID,
              name: 'Хранитель объектов'
            };
          }
        }

        // Сохраняем полные данные о тикете из нулевой точки
        ticketsMap.set(ticketId, {
          id: ticketId,
          title: ticket.title || 'Без названия',
          assignedTo: assignedTo || null,
          createdAt: normalizeDate(ticket.createdAt || ticket.createdTime),
          updatedAt: normalizeDate(ticket.updatedAt || ticket.modifiedAt || ticket.updatedTime),
          // ВАЖНО: Сохраняем полные данные для попапа
          stageId: ticket.stageId || null, // Bitrix24 stageId
          departmentHead: ticket.departmentHead || null,
          departmentHeadFull: ticket.departmentHeadFull || ticket.departmentHead || null,
          priorityId: ticket.priorityId || null,
          priorityLabel: ticket.priorityLabel || null,
          service: ticket.service || null,
          serviceLabel: ticket.serviceLabel || null
        });
      });
    });
  }

  return {
    ticketIds: Array.from(ticketIdsSet).sort((a, b) => a - b),
    tickets: Array.from(ticketsMap.values())
  };
}

/**
 * Нормализовать дату в формат ISO 8601 с часовым поясом
 * 
 * @param {String|Date} date - Дата
 * @returns {String|null} Дата в формате ISO 8601 или null, если дата невалидна
 * @private
 */
function normalizeDate(date) {
  if (!date) {
    return null;
  }

  if (date instanceof Date) {
    return date.toISOString();
  }

  if (typeof date === 'string') {
    // Если дата уже в формате ISO, вернуть как есть
    if (date.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return date;
    }

    // Попытаться распарсить и преобразовать
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  console.warn('Invalid date format:', date);
  return null;
}

/**
 * Маппинг внутреннего ID этапа на Bitrix24 ID
 * 
 * @param {String} stageId - Внутренний ID этапа (formed, review, execution)
 * @returns {String|null} Bitrix24 stage ID или null, если этап не найден
 * 
 * @example
 * const bitrixId = mapStageIdToBitrix('formed');
 * // 'DT140_12:UC_0VHWE2'
 */
export function mapStageIdToBitrix(stageId) {
  return STAGE_MAPPING[stageId]?.bitrixId || null;
}

