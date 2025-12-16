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
import { mapStageId } from '@/services/dashboard-sector-1c/mappers/stage-mapper.js';

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
  console.log('[popupNavigationUtils] getEmployeeTicketsForStage called:', {
    employeeId,
    stageId,
    hasSnapshot: !!snapshot,
    snapshotType: snapshot ? typeof snapshot : 'null',
    snapshotKeys: snapshot ? Object.keys(snapshot) : [],
    hasTickets: snapshot?.tickets ? true : false,
    ticketsIsArray: Array.isArray(snapshot?.tickets),
    ticketsLength: snapshot?.tickets?.length || 0
  });

  if (!employeeId || !stageId) {
    console.warn('[popupNavigationUtils] Employee ID and stage ID are required');
    return [];
  }

  if (!snapshot) {
    console.warn('[popupNavigationUtils] Snapshot is null or undefined');
    return [];
  }

  if (!snapshot.tickets) {
    console.warn('[popupNavigationUtils] Snapshot.tickets is missing. Snapshot keys:', Object.keys(snapshot));
    return [];
  }

  if (!Array.isArray(snapshot.tickets)) {
    console.warn('[popupNavigationUtils] Snapshot.tickets is not an array. Type:', typeof snapshot.tickets);
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
      // Попытка загрузить детали через API, но если ошибка - используем данные из snapshot
      try {
        const details = await TicketDetailsService.getTicketsDetails(ticketIds);
        
        // Преобразовать в Map для быстрого доступа
        detailsMap = new Map();
        details.forEach(detail => {
          if (detail && detail.id) {
            detailsMap.set(detail.id, detail);
          }
        });
      } catch (error) {
        console.warn('[popupNavigationUtils] Failed to load ticket details from API, using snapshot data:', error);
        // Если API не работает, используем данные из snapshot как есть
        detailsMap = null;
      }
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
        merged.departmentHead = details.departmentHead || null;
        merged.departmentHeadFull = details.departmentHeadFull || details.departmentHead || null;
      } else {
        // Если детали не найдены, оставить null
        merged.stageId = null;
        merged.departmentHead = null;
      }
    } else {
      // Если загрузка не нужна, использовать данные из слепка (если есть)
      merged.stageId = ticket.stageId || null;
      merged.departmentHead = ticket.departmentHead || null;
      // Если в слепке нет полного значения, используем то, что есть
      merged.departmentHeadFull = ticket.departmentHeadFull || ticket.departmentHead || null;
    }

    return merged;
  });

  // Фильтровать по стадии
  // Если stageId не определен в тикетах (API не сработал), используем все тикеты сотрудника
  // так как они уже отфильтрованы по стадии в snapshot
  const filteredTickets = mergedTickets.filter(ticket => {
    // Если stageId не определен, но тикет есть в snapshot для этой стадии - используем его
    if (!ticket.stageId) {
      // Если API не сработал, но тикет есть в snapshot для этой стадии - используем его
      // Это означает, что тикет уже отфильтрован по стадии при создании snapshot
      return true; // Используем все тикеты сотрудника из snapshot
    }
    
    // Преобразовать Bitrix24 stageId во внутренний формат
    const internalStageId = mapStageId(ticket.stageId);
    
    // Сравнить с переданным stageId (уже во внутреннем формате)
    return internalStageId === stageId;
  });

  return filteredTickets;
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
    
    // Логирование для отладки (только для первых 3 тикетов)
    if (tickets.indexOf(ticket) < 3) {
      console.log('[popupNavigationUtils] groupTicketsByDepartment - ticket sample:', {
        ticketId: ticket.id,
        departmentHead: ticket.departmentHead,
        departmentHeadFull: ticket.departmentHeadFull,
        allKeys: Object.keys(ticket).filter(k => k.toLowerCase().includes('department'))
      });
    }
    
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





