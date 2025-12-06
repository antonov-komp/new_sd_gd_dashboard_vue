/**
 * Группер для группировки тикетов по этапам и сотрудникам
 * 
 * Создаёт структуру этапов с сотрудниками и распределяет тикеты
 */

import { mapStageId } from '../mappers/stage-mapper.js';
import { mapTicket } from '../mappers/ticket-mapper.js';
import { mapEmployee } from '../mappers/employee-mapper.js';
import { 
  KEEPER_OBJECTS_ID, 
  getAssignedById, 
  parseEmployeeId, 
  isZeroPointTicket 
} from '../utils/ticket-utils.js';
import { SECTOR_IDS, SECTOR_1C_ID } from '../utils/sector-constants.js';
import { Logger } from '../utils/logger.js';

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
    Logger.warn('Tickets is not an array', 'TicketGrouper', tickets);
    tickets = [];
  }

  // Проверяем, что employees - массив
  if (!Array.isArray(employees)) {
    Logger.warn('Employees is not an array', 'TicketGrouper', employees);
    employees = [];
  }

  // Исключаем сотрудника с ID 1051 (Хранитель объектов) из списка сотрудников
  // Он не должен отображаться в колонках, только в нулевой точке
  const filteredEmployees = employees.filter(emp => {
    const empId = emp.id ? parseInt(emp.id) : null;
    return empId !== KEEPER_OBJECTS_ID;
  });

  // Инициализируем стадии с разделением тикетов на внутри/вне сектора
  // Используем sectorId из маппера для определения принадлежности к сектору 1С
  const stages = [
    {
      id: 'formed',
      name: 'Сформировано обращение',
      color: '#007bff',
      employees: filteredEmployees.map(emp => ({
        ...emp,
        // Используем sectorId напрямую (уже определён в маппере)
        // Это более эффективно, чем вызов функции
        isFromSector1C: emp.sectorId === SECTOR_IDS.SECTOR_1C,
        tickets: [], // Все тикеты (для обратной совместимости)
        ticketsInsideSector: [], // Тикеты внутри сектора
        ticketsOutsideSector: [] // Тикеты вне сектора
      }))
    },
    {
      id: 'review',
      name: 'Рассмотрение ТЗ',
      color: '#ffc107',
      employees: filteredEmployees.map(emp => ({
        ...emp,
        // Используем sectorId напрямую (уже определён в маппере)
        // Это более эффективно, чем вызов функции
        isFromSector1C: emp.sectorId === SECTOR_IDS.SECTOR_1C,
        tickets: [], // Все тикеты (для обратной совместимости)
        ticketsInsideSector: [], // Тикеты внутри сектора
        ticketsOutsideSector: [] // Тикеты вне сектора
      }))
    },
    {
      id: 'execution',
      name: 'Исполнение',
      color: '#28a745',
      employees: filteredEmployees.map(emp => ({
        ...emp,
        // Используем sectorId напрямую (уже определён в маппере)
        // Это более эффективно, чем вызов функции
        isFromSector1C: emp.sectorId === SECTOR_IDS.SECTOR_1C,
        tickets: [], // Все тикеты (для обратной совместимости)
        ticketsInsideSector: [], // Тикеты внутри сектора
        ticketsOutsideSector: [] // Тикеты вне сектора
      }))
    }
  ];

  // Оптимизация: создаём Map для быстрого поиска этапов по ID
  const stagesMap = new Map(stages.map(stage => [stage.id, stage]));

  // Оптимизация: создаём Map для быстрого поиска сотрудников в каждом этапе
  // Ключ: stageId, Значение: Map<employeeId, employee>
  const employeesMapByStage = new Map();
  stages.forEach(stage => {
    const employeesMap = new Map(stage.employees.map(emp => [emp.id, emp]));
    employeesMapByStage.set(stage.id, employeesMap);
  });

  // Распределяем тикеты по этапам и сотрудникам
  tickets.forEach(ticket => {
    // Обрабатываем как верхний, так и нижний регистр полей
    const stageId = mapStageId(ticket.stageId || ticket.STAGE_ID || '');
    const stage = stagesMap.get(stageId);
    
    if (stage) {
      // Используем утилиты для извлечения и парсинга ID
      const assignedById = getAssignedById(ticket);
      const employeeId = parseEmployeeId(assignedById);
      
      // Пропускаем тикеты с ответственным 1051 (они попадают в нулевую точку)
      if (employeeId === KEEPER_OBJECTS_ID) {
        return; // Пропускаем этот тикет
      }
      
      if (employeeId) {
        // Оптимизация: используем Map для быстрого поиска сотрудника
        const employeesMap = employeesMapByStage.get(stageId);
        let employee = employeesMap.get(employeeId);
        
        // Если сотрудника нет в списке (не был загружен), создаём его
        if (!employee) {
          employee = {
            id: employeeId,
            name: `Сотрудник #${employeeId}`,
            position: 'Неизвестно',
            email: '',
            sectorId: null, // Неизвестный сектор для созданного сотрудника
            departmentId: null,
            isFromSector1C: false, // По умолчанию не из сектора 1С (не можем определить без данных)
            tickets: [], // Все тикеты (для обратной совместимости)
            ticketsInsideSector: [], // Тикеты внутри сектора
            ticketsOutsideSector: [] // Тикеты вне сектора
          };
          stage.employees.push(employee);
          employeesMap.set(employeeId, employee); // Добавляем в Map для быстрого доступа
        }
        
        const mappedTicket = mapTicket(ticket);
        
        // Добавляем тикет во все тикеты (для обратной совместимости)
        employee.tickets.push(mappedTicket);
        
        // Разделяем тикеты на внутри/вне сектора
        if (employee.isFromSector1C) {
          // Сотрудник из сектора 1С — тикет внутри сектора
          employee.ticketsInsideSector.push(mappedTicket);
        } else {
          // Сотрудник из другого сектора — тикет вне сектора
          employee.ticketsOutsideSector.push(mappedTicket);
        }
      }
    }
  });

  // Сортируем сотрудников в каждой стадии:
  // 1. Сначала сотрудники сектора 1С (isFromSector1C === true)
  // 2. Потом сотрудники других секторов (isFromSector1C === false)
  // Внутри каждой группы сортируем по ID (по возрастанию)
  stages.forEach(stage => {
    stage.employees.sort((a, b) => {
      // Сначала сравниваем по принадлежности к сектору 1С
      if (a.isFromSector1C && !b.isFromSector1C) {
        return -1; // a (сектор 1С) идёт первым
      }
      if (!a.isFromSector1C && b.isFromSector1C) {
        return 1; // b (сектор 1С) идёт первым
      }
      // Если оба в одной группе (оба из сектора 1С или оба не из сектора 1С),
      // сортируем по ID по возрастанию
      return (a.id || 0) - (b.id || 0);
    });
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
    Logger.warn('Tickets is not an array in getZeroPointTickets', 'TicketGrouper', tickets);
    return zeroPointTickets;
  }

  // Тикеты без назначенного сотрудника ИЛИ с ответственным 1051
  tickets
    .filter(t => {
      // Используем утилиту для проверки нулевой точки
      return isZeroPointTicket(t);
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
    // Используем утилиты для извлечения и парсинга ID
    const assignedById = getAssignedById(ticket);
    const employeeId = parseEmployeeId(assignedById);
    
    if (employeeId) {
      employeeIds.add(employeeId);
    }
  });

  return Array.from(employeeIds);
}


