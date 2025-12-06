/**
 * Группер для группировки тикетов по этапам и сотрудникам
 * 
 * Создаёт структуру этапов с сотрудниками и распределяет тикеты
 */

import { mapStageId } from '../mappers/stage-mapper.js';
import { mapTicket } from '../mappers/ticket-mapper.js';
import { mapEmployee } from '../mappers/employee-mapper.js';

/**
 * Группировка тикетов по этапам
 * 
 * Создаёт структуру этапов с сотрудниками и распределяет тикеты
 * Если сотрудник не был загружен, создаёт его с минимальными данными
 * 
 * @param {Array} tickets - Массив тикетов из Bitrix24
 * @param {Array} employees - Массив сотрудников (только те, у которых есть тикеты)
 * @returns {Array} Массив этапов с тикетами
 */
export function groupTicketsByStages(tickets, employees) {
  // Проверяем, что tickets - массив
  if (!Array.isArray(tickets)) {
    console.warn('Tickets is not an array:', tickets);
    tickets = [];
  }

  // Проверяем, что employees - массив
  if (!Array.isArray(employees)) {
    console.warn('Employees is not an array:', employees);
    employees = [];
  }

  const stages = [
    {
      id: 'formed',
      name: 'Сформировано обращение',
      color: '#007bff',
      employees: employees.map(emp => ({ ...emp, tickets: [] }))
    },
    {
      id: 'review',
      name: 'Рассмотрение ТЗ',
      color: '#ffc107',
      employees: employees.map(emp => ({ ...emp, tickets: [] }))
    },
    {
      id: 'execution',
      name: 'Исполнение',
      color: '#28a745',
      employees: employees.map(emp => ({ ...emp, tickets: [] }))
    }
  ];

  // Распределяем тикеты по этапам и сотрудникам
  tickets.forEach(ticket => {
    // Обрабатываем как верхний, так и нижний регистр полей
    const stageId = mapStageId(ticket.stageId || ticket.STAGE_ID || '');
    const stage = stages.find(s => s.id === stageId);
    
    if (stage) {
      const assignedById = ticket.assignedById || ticket.ASSIGNED_BY_ID || null;
      const employeeId = assignedById ? parseInt(assignedById) : null;
      
      if (employeeId) {
        // Ищем сотрудника в этапе
        let employee = stage.employees.find(e => e.id === employeeId);
        
        // Если сотрудника нет в списке (не был загружен), создаём его
        if (!employee) {
          employee = {
            id: employeeId,
            name: `Сотрудник #${employeeId}`,
            position: 'Неизвестно',
            email: '',
            tickets: []
          };
          stage.employees.push(employee);
        }
        
        employee.tickets.push(mapTicket(ticket));
      }
    }
  });

  return stages;
}

/**
 * Получение тикетов нулевой точки (без назначенного сотрудника)
 * 
 * @param {Array} tickets - Массив тикетов
 * @returns {object} Объект с тикетами для каждого этапа
 */
export function getZeroPointTickets(tickets) {
  const zeroPointTickets = {
    formed: [],
    review: [],
    execution: []
  };

  // Проверяем, что tickets - массив
  if (!Array.isArray(tickets)) {
    console.warn('Tickets is not an array in getZeroPointTickets:', tickets);
    return zeroPointTickets;
  }

  // Тикеты без назначенного сотрудника
  tickets
    .filter(t => !(t.assignedById || t.ASSIGNED_BY_ID))
    .forEach(ticket => {
      const stageId = mapStageId(ticket.stageId || ticket.STAGE_ID || '');
      if (zeroPointTickets[stageId]) {
        zeroPointTickets[stageId].push(mapTicket(ticket));
      }
    });

  return zeroPointTickets;
}

/**
 * Извлечение уникальных ID сотрудников из тикетов
 * 
 * @param {Array} tickets - Массив тикетов
 * @returns {Array<number>} Массив уникальных ID сотрудников
 */
export function extractUniqueEmployeeIds(tickets) {
  if (!Array.isArray(tickets)) {
    return [];
  }

  const employeeIds = new Set();

  tickets.forEach(ticket => {
    // Пробуем разные варианты имени поля assignedById
    // В смарт-процессах может быть assignedById или assignedByIdId
    const assignedById = ticket.assignedById || 
                        ticket.assignedByIdId || 
                        ticket.ASSIGNED_BY_ID ||
                        ticket['assignedById'] ||
                        (ticket.assignedById && typeof ticket.assignedById === 'object' && (ticket.assignedById.id || ticket.assignedById.ID)) ||
                        (ticket.assignedById && typeof ticket.assignedById === 'object' && ticket.assignedById.value);
    
    if (assignedById) {
      const employeeId = parseInt(assignedById);
      if (employeeId && !isNaN(employeeId) && employeeId > 0) {
        employeeIds.add(employeeId);
      }
    }
  });

  return Array.from(employeeIds);
}

