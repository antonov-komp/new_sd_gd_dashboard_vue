/**
 * Утилиты для навигации между уровнями попапа детализации по сотрудникам
 * 
 * Содержит функции для:
 * - Получения тикетов сотрудника на стадии
 * - Группировки тикетов по временным градациям
 * - Группировки тикетов по заказчикам (отделам)
 * 
 * Дата создания: 2025-12-12 (UTC+3, Брест)
 * Задача: TASK-033
 */

import { getDateAccentCategory } from '@/services/dashboard-sector-1c/utils/date-utils.js';
import { 
  DATE_ACCENT_CATEGORIES, 
  DATE_ACCENT_CONFIG 
} from '@/services/dashboard-sector-1c/utils/date-accent-config.js';
import TicketDetailsService from '@/services/graph-state/TicketDetailsService.js';

/**
 * Получить тикеты сотрудника на стадии
 * 
 * Объединяет данные из слепка и загруженных деталей через API.
 * Если в слепке отсутствуют stageId и departmentHead, загружает детали через API.
 * 
 * @param {number} employeeId - ID сотрудника
 * @param {string} stageId - ID стадии ('formed', 'review', 'execution')
 * @param {Object|null} snapshot - Слепок с данными (версия 1.0)
 * @param {Object|null} ticketDetails - Детали тикетов (если уже загружены)
 * @returns {Promise<Array>} Массив тикетов сотрудника на стадии
 * 
 * @example
 * const tickets = await getEmployeeTicketsForStage(456, 'formed', snapshot, null);
 */
export async function getEmployeeTicketsForStage(employeeId, stageId, snapshot, ticketDetails = null) {
  if (!employeeId || !stageId) {
    console.warn('Employee ID and stage ID are required');
    return [];
  }

  if (!snapshot || !snapshot.tickets || !Array.isArray(snapshot.tickets)) {
    console.warn('Invalid snapshot data');
    return [];
  }

  // Фильтровать тикеты по сотруднику из слепка
  const employeeTicketsFromSnapshot = snapshot.tickets.filter(ticket => {
    const assignedTo = ticket.assignedTo;
    if (!assignedTo) {
      return false;
    }
    
    const assignedToId = typeof assignedTo === 'object' ? assignedTo.id : assignedTo;
    return assignedToId === employeeId;
  });

  if (employeeTicketsFromSnapshot.length === 0) {
    return [];
  }

  // Проверить, нужна ли загрузка деталей
  // Если в слепке уже есть stageId и departmentHead, загрузка не нужна
  const needsLoading = !employeeTicketsFromSnapshot[0].stageId || 
                       !employeeTicketsFromSnapshot[0].departmentHead;

  let detailsMap = null;
  
  if (needsLoading) {
    // Загрузить детали через API
    const ticketIds = employeeTicketsFromSnapshot.map(t => t.id);
    
    // Использовать переданные детали или загрузить новые
    if (ticketDetails && typeof ticketDetails === 'object') {
      // Если передан объект с деталями (ключ - ID тикета)
      detailsMap = ticketDetails;
    } else {
      // Загрузить детали через API
      const details = await TicketDetailsService.getTicketsDetails(ticketIds);
      
      // Преобразовать в Map для быстрого доступа
      detailsMap = new Map();
      details.forEach(detail => {
        if (detail && detail.id) {
          detailsMap.set(detail.id, detail);
        }
      });
    }
  }

  // Объединить данные из слепка и загруженных деталей
  const mergedTickets = employeeTicketsFromSnapshot.map(ticket => {
    const ticketId = ticket.id;
    
    // Базовые данные из слепка
    const merged = {
      id: ticketId,
      title: ticket.title || 'Без названия',
      assignedTo: ticket.assignedTo,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt
    };

    // Если детали загружены, добавить stageId и departmentHead
    if (detailsMap) {
      const details = detailsMap instanceof Map 
        ? detailsMap.get(ticketId)
        : detailsMap[ticketId];
      
      if (details) {
        merged.stageId = details.stageId || null;
        // Использовать полное значение departmentHead для уровня 3
        merged.departmentHead = details.departmentHeadFull || details.departmentHead || null;
      } else {
        // Если детали не найдены, оставить null
        merged.stageId = null;
        merged.departmentHead = null;
      }
    } else {
      // Если загрузка не нужна, использовать данные из слепка (если есть)
      merged.stageId = ticket.stageId || null;
      merged.departmentHead = ticket.departmentHead || null;
    }

    return merged;
  });

  // Фильтровать по стадии
  const filteredTickets = mergedTickets.filter(ticket => {
    // Если stageId не определен, пропускаем тикет
    if (!ticket.stageId) {
      return false;
    }
    
    // Сравнить stageId (может быть в формате Bitrix24 или внутреннем формате)
    // Внутренний формат: 'formed', 'review', 'execution'
    // Bitrix24 формат: 'DT140_12:UC_0VHWE2', 'DT140_12:PREPARATION', 'DT140_12:CLIENT'
    return ticket.stageId === stageId || 
           mapStageIdToInternal(ticket.stageId) === stageId;
  });

  return filteredTickets;
}

/**
 * Маппинг Bitrix24 stageId на внутренний формат
 * 
 * @param {string} bitrixStageId - Stage ID из Bitrix24
 * @returns {string|null} Внутренний stageId ('formed', 'review', 'execution') или null
 * @private
 */
function mapStageIdToInternal(bitrixStageId) {
  if (!bitrixStageId) {
    return null;
  }

  // Маппинг Bitrix24 ID на внутренние ID
  const stageMapping = {
    'DT140_12:UC_0VHWE2': 'formed',
    'DT140_12:PREPARATION': 'review',
    'DT140_12:CLIENT': 'execution'
  };

  return stageMapping[bitrixStageId] || null;
}

/**
 * Группировать тикеты по временным градациям
 * 
 * Использует функцию getDateAccentCategory() из date-utils.js для определения категории давности.
 * Группирует тикеты по 9 категориям и рассчитывает проценты и ширину прогресс-баров.
 * 
 * @param {Array} tickets - Массив тикетов сотрудника на стадии
 * @param {Date} currentDate - Текущая дата (по умолчанию new Date())
 * @returns {Array} Массив категорий с количеством тикетов, отсортированный по порядку категорий
 * 
 * @example
 * const categories = groupTicketsByDateCategory(tickets);
 * // [
 * //   { category: 'today', label: 'СЕГОДНЯ', count: 2, percentage: 20, ... },
 * //   { category: 'yesterday', label: 'ВЧЕРА', count: 1, percentage: 10, ... },
 * //   ...
 * // ]
 */
export function groupTicketsByDateCategory(tickets, currentDate = new Date()) {
  if (!tickets || tickets.length === 0) {
    return [];
  }
  
  const totalCount = tickets.length;
  
  // Инициализация категорий
  const categories = {};
  Object.values(DATE_ACCENT_CATEGORIES).forEach(categoryKey => {
    categories[categoryKey] = {
      category: categoryKey,
      label: DATE_ACCENT_CONFIG[categoryKey].label,
      count: 0,
      tickets: [],
      percentage: 0,
      progressBarWidth: 0,
      progressBarColor: DATE_ACCENT_CONFIG[categoryKey].color
    };
  });
  
  // Группировка тикетов
  tickets.forEach(ticket => {
    if (!ticket.createdAt) {
      // Если нет даты создания, относим к категории "БОЛЕЕ ГОДА"
      categories[DATE_ACCENT_CATEGORIES.MORE_THAN_YEAR].count++;
      categories[DATE_ACCENT_CATEGORIES.MORE_THAN_YEAR].tickets.push(ticket);
      return;
    }
    
    // Определение категории давности
    const category = getDateAccentCategory(ticket.createdAt, currentDate);
    
    if (categories[category]) {
      categories[category].count++;
      categories[category].tickets.push(ticket);
    }
  });
  
  // Расчет процентов и ширины прогресс-баров
  // Фильтруем только категории с тикетами
  const result = Object.values(categories)
    .filter(cat => cat.count > 0)
    .map(cat => {
      const percentage = totalCount > 0 
        ? parseFloat(((cat.count / totalCount) * 100).toFixed(1)) 
        : 0;
      
      return {
        ...cat,
        percentage,
        progressBarWidth: percentage
      };
    })
    .sort((a, b) => {
      // Сортировка по порядку категорий (от свежих к старым)
      const order = [
        DATE_ACCENT_CATEGORIES.TODAY,
        DATE_ACCENT_CATEGORIES.YESTERDAY,
        DATE_ACCENT_CATEGORIES.THIS_WEEK,
        DATE_ACCENT_CATEGORIES.LAST_WEEK,
        DATE_ACCENT_CATEGORIES.MORE_THAN_TWO_WEEKS,
        DATE_ACCENT_CATEGORIES.UP_TO_ONE_MONTH,
        DATE_ACCENT_CATEGORIES.MORE_THAN_TWO_MONTHS,
        DATE_ACCENT_CATEGORIES.MORE_THAN_HALF_YEAR,
        DATE_ACCENT_CATEGORIES.MORE_THAN_YEAR
      ];
      
      return order.indexOf(a.category) - order.indexOf(b.category);
    });
  
  return result;
}

/**
 * Группировать тикеты по заказчикам (отделам)
 * 
 * Группирует тикеты по полю departmentHead (UF_CRM_7_DEPARTMENT_HEAD).
 * Тикеты без заказчика (null, пустая строка) группируются в "Без заказчика".
 * Результат сортируется по убыванию количества тикетов.
 * 
 * @param {Array} tickets - Массив тикетов для группировки
 * @returns {Array} Массив заказчиков с количеством тикетов, отсортированный по убыванию
 * 
 * @example
 * const departments = groupTicketsByDepartment(tickets);
 * // [
 * //   { departmentName: "Отдел ИТ", count: 2 },
 * //   { departmentName: "Бухгалтерия", count: 1 },
 * //   { departmentName: "Без заказчика", count: 1 }
 * // ]
 */
export function groupTicketsByDepartment(tickets) {
  if (!tickets || tickets.length === 0) {
    return [];
  }
  
  // Объект для группировки: ключ - название заказчика, значение - количество
  const departmentsMap = {};
  
  tickets.forEach(ticket => {
    // Извлечение значения заказчика
    // Используем departmentHeadFull (полное значение) или departmentHead
    let departmentName = ticket.departmentHeadFull || ticket.departmentHead;
    
    // Нормализация значения
    if (!departmentName) {
      // Если значение null, undefined, пустая строка или только пробелы
      departmentName = 'Без заказчика';
    } else {
      // Приведение к строке и удаление пробелов в начале/конце
      departmentName = String(departmentName).trim();
      
      // Если после trim осталась пустая строка, относим к "Без заказчика"
      if (departmentName.length === 0) {
        departmentName = 'Без заказчика';
      }
    }
    
    // Группировка: увеличиваем счетчик для заказчика
    if (!departmentsMap[departmentName]) {
      departmentsMap[departmentName] = {
        departmentName: departmentName,
        count: 0
      };
    }
    
    departmentsMap[departmentName].count++;
  });
  
  // Преобразование объекта в массив
  const departments = Object.values(departmentsMap);
  
  // Сортировка по убыванию количества тикетов
  departments.sort((a, b) => {
    // Сначала по количеству (убывание)
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    
    // Если количество одинаковое, сортируем по названию (алфавитный порядок)
    return a.departmentName.localeCompare(b.departmentName, 'ru');
  });
  
  return departments;
}
