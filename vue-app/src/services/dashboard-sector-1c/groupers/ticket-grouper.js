/**
 * Группер для группировки тикетов по этапам и сотрудникам
 * 
 * Создаёт структуру этапов с сотрудниками и распределяет тикеты
 */

import { mapStageId } from '../mappers/stage-mapper.js';
import { mapTicket } from '../mappers/ticket-mapper.js';
import { mapEmployee } from '../mappers/employee-mapper.js';

/**
 * Константы для группировки тикетов
 */

/**
 * ID ответственного "Хранитель объектов"
 * 
 * Тикеты с этим ответственным попадают в нулевую точку,
 * а не в колонки сотрудников.
 * 
 * Используется в:
 * - getZeroPointTickets() — для включения тикетов в нулевую точку
 * - groupTicketsByStages() — для исключения тикетов из колонок сотрудников
 */
export const KEEPER_OBJECTS_ID = 1051;

/**
 * Группировка тикетов по этапам
 * 
 * Создаёт структуру этапов с сотрудниками и распределяет тикеты.
 * Если сотрудник не был загружен, создаёт его с минимальными данными.
 * 
 * Исключает тикеты с ответственным 1051 (Хранитель объектов) из колонок сотрудников.
 * Также исключает самого сотрудника с ID 1051 из списка сотрудников этапа.
 * Такие тикеты попадают в нулевую точку через getZeroPointTickets().
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

  // Исключаем сотрудника с ID 1051 (Хранитель объектов) из списка сотрудников
  // Он не должен отображаться в колонках, только в нулевой точке
  const filteredEmployees = employees.filter(emp => {
    const empId = emp.id ? parseInt(emp.id) : null;
    return empId !== KEEPER_OBJECTS_ID;
  });

  const stages = [
    {
      id: 'formed',
      name: 'Сформировано обращение',
      color: '#007bff',
      employees: filteredEmployees.map(emp => ({ ...emp, tickets: [] }))
    },
    {
      id: 'review',
      name: 'Рассмотрение ТЗ',
      color: '#ffc107',
      employees: filteredEmployees.map(emp => ({ ...emp, tickets: [] }))
    },
    {
      id: 'execution',
      name: 'Исполнение',
      color: '#28a745',
      employees: filteredEmployees.map(emp => ({ ...emp, tickets: [] }))
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
      
      // Пропускаем тикеты с ответственным 1051 (они попадают в нулевую точку)
      if (employeeId === KEEPER_OBJECTS_ID) {
        return; // Пропускаем этот тикет
      }
      
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
 * Получение тикетов нулевой точки
 * 
 * Нулевая точка включает:
 * - Тикеты без назначенного сотрудника (assignedById === null)
 * - Тикеты с ответственным 1051 (Хранитель объектов)
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

  // Тикеты без назначенного сотрудника ИЛИ с ответственным 1051
  tickets
    .filter(t => {
      const assignedById = t.assignedById || t.ASSIGNED_BY_ID;
      const employeeId = assignedById ? parseInt(assignedById) : null;
      
      // Попадают в нулевую точку:
      // 1. Тикеты без ответственного (employeeId === null)
      // 2. Тикеты с ответственным 1051 (Хранитель объектов)
      return !employeeId || employeeId === KEEPER_OBJECTS_ID;
    })
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


