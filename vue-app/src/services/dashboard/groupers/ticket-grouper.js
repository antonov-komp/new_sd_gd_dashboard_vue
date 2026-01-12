/**
 * Группировщик тикетов для дашбордов секторов
 *
 * Предоставляет функции для группировки и анализа тикетов
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { Logger } from '../utils/logger.js';
import { STAGE_IDS } from '../utils/constants.js';

/**
 * Группировка тикетов по этапам
 *
 * @param {Array} tickets - Массив тикетов
 * @returns {object} Объект с группировкой по этапам
 */
export function groupTicketsByStages(tickets) {
  const grouped = {};

  // Инициализируем этапы
  Object.values(STAGE_IDS).forEach(stageId => {
    grouped[stageId] = [];
  });

  // Группируем тикеты
  tickets.forEach(ticket => {
    const stageId = ticket.STAGE_ID || ticket.stageId || STAGE_IDS.NEW;
    if (grouped[stageId]) {
      grouped[stageId].push(ticket);
    } else {
      grouped[STAGE_IDS.NEW].push(ticket);
    }
  });

  Logger.debug('Tickets grouped by stages', 'TicketGrouper', {
    totalTickets: tickets.length,
    stagesWithTickets: Object.values(grouped).filter(tickets => tickets.length > 0).length
  });

  return grouped;
}

/**
 * Получение тикетов нулевой точки (новые тикеты)
 *
 * @param {Array} tickets - Массив тикетов
 * @param {string} stageId - ID этапа (опционально)
 * @returns {object} Объект с тикетами нулевой точки по этапам
 */
export function getZeroPointTickets(tickets, stageId = null) {
  const zeroPoint = {};

  if (stageId) {
    // Для конкретного этапа
    zeroPoint[stageId] = tickets.filter(ticket =>
      (ticket.STAGE_ID || ticket.stageId) === stageId &&
      !ticket.PREVIOUS_STAGE_ID // Предполагаем, что это новое поле
    );
  } else {
    // Для всех этапов
    Object.values(STAGE_IDS).forEach(stageId => {
      zeroPoint[stageId] = tickets.filter(ticket =>
        (ticket.STAGE_ID || ticket.stageId) === stageId &&
        !ticket.PREVIOUS_STAGE_ID
      );
    });
  }

  return zeroPoint;
}

/**
 * Извлечение уникальных ID сотрудников из тикетов
 *
 * @param {Array} tickets - Массив тикетов
 * @returns {Array} Массив уникальных ID сотрудников
 */
export function extractUniqueEmployeeIds(tickets) {
  const employeeIds = new Set();

  tickets.forEach(ticket => {
    // ASSIGNED_BY_ID - текущий ответственный
    if (ticket.ASSIGNED_BY_ID) {
      employeeIds.add(ticket.ASSIGNED_BY_ID);
    }

    // CREATED_BY_ID - создатель
    if (ticket.CREATED_BY_ID) {
      employeeIds.add(ticket.CREATED_BY_ID);
    }

    // Дополнительные поля сотрудников
    if (ticket.UF_RESPONSIBLE) {
      if (Array.isArray(ticket.UF_RESPONSIBLE)) {
        ticket.UF_RESPONSIBLE.forEach(id => employeeIds.add(id));
      } else {
        employeeIds.add(ticket.UF_RESPONSIBLE);
      }
    }
  });

  return Array.from(employeeIds);
}

/**
 * Группировка тикетов по сотрудникам
 *
 * @param {Array} tickets - Массив тикетов
 * @returns {object} Объект с группировкой по сотрудникам
 */
export function groupTicketsByEmployees(tickets) {
  const grouped = {};

  tickets.forEach(ticket => {
    const employeeId = ticket.ASSIGNED_BY_ID || ticket.CREATED_BY_ID || 'unassigned';

    if (!grouped[employeeId]) {
      grouped[employeeId] = [];
    }

    grouped[employeeId].push(ticket);
  });

  Logger.debug('Tickets grouped by employees', 'TicketGrouper', {
    totalTickets: tickets.length,
    employeesCount: Object.keys(grouped).length
  });

  return grouped;
}

/**
 * Получение статистики тикетов
 *
 * @param {Array} tickets - Массив тикетов
 * @returns {object} Статистика тикетов
 */
export function getTicketStats(tickets) {
  const stats = {
    total: tickets.length,
    byStage: {},
    byEmployee: {},
    byPriority: {},
    averageAge: 0,
    oldestTicket: null,
    newestTicket: null
  };

  // Статистика по этапам
  const groupedByStages = groupTicketsByStages(tickets);
  stats.byStage = Object.fromEntries(
    Object.entries(groupedByStages).map(([stageId, stageTickets]) => [
      stageId,
      {
        count: stageTickets.length,
        percentage: tickets.length > 0 ? (stageTickets.length / tickets.length) * 100 : 0
      }
    ])
  );

  // Статистика по сотрудникам
  const groupedByEmployees = groupTicketsByEmployees(tickets);
  stats.byEmployee = Object.fromEntries(
    Object.entries(groupedByEmployees).map(([employeeId, employeeTickets]) => [
      employeeId,
      employeeTickets.length
    ])
  );

  // Расчет возраста тикетов
  if (tickets.length > 0) {
    const now = new Date();
    const ages = tickets.map(ticket => {
      const created = new Date(ticket.CREATED_TIME || ticket.createdTime);
      return now - created;
    });

    stats.averageAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;

    // Самый старый и новый тикеты
    const sortedByAge = tickets.sort((a, b) =>
      new Date(a.CREATED_TIME || a.createdTime) - new Date(b.CREATED_TIME || b.createdTime)
    );

    stats.oldestTicket = sortedByAge[0];
    stats.newestTicket = sortedByAge[sortedByAge.length - 1];
  }

  return stats;
}

export default {
  groupTicketsByStages,
  getZeroPointTickets,
  extractUniqueEmployeeIds,
  groupTicketsByEmployees,
  getTicketStats
};