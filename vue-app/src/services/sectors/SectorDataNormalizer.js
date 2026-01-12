/**
 * Универсальный нормализатор данных секторов
 *
 * Преобразует данные любого сектора в унифицированный формат
 * для использования в дашбордах, графиках и других компонентах
 *
 * @version 1.0
 * @since 2026-01-12
 */

export class SectorDataNormalizer {
  /**
   * Цвета для этапов (если не заданы в конфигурации)
   */
  static STAGE_COLORS = [
    '#007bff', // Синий - новые/запросы
    '#ffc107', // Желтый - в работе/проверка
    '#28a745', // Зеленый - завершено/готово
    '#dc3545', // Красный - проблемы/ошибки
    '#6c757d', // Серый - другие
    '#17a2b8', // Голубой - дополнительные
    '#e83e8c', // Розовый - специальные
    '#fd7e14'  // Оранжевый - предупреждения
  ];

  /**
   * Нормализация полных данных сектора
   *
   * @param {object} sectorData - Сырые данные сектора
   * @param {object} sectorConfig - Конфигурация сектора
   * @returns {object} Нормализованные данные
   */
  static normalizeSectorData(sectorData, sectorConfig) {
    if (!sectorData) {
      return this.getEmptySectorData(sectorConfig);
    }

    return {
      stages: this.normalizeStages(sectorData.stages || [], sectorConfig),
      employees: this.normalizeEmployees(sectorData.employees || [], sectorConfig),
      zeroPointTickets: this.normalizeTickets(sectorData.zeroPointTickets || [], sectorConfig),
      metrics: this.calculateMetrics(sectorData, sectorConfig),
      metadata: this.createMetadata(sectorData, sectorConfig)
    };
  }

  /**
   * Нормализация этапов сектора
   *
   * @param {Array} stages - Этапы сектора
   * @param {object} sectorConfig - Конфигурация сектора
   * @returns {Array} Нормализованные этапы
   */
  static normalizeStages(stages, sectorConfig) {
    if (!Array.isArray(stages)) {
      return [];
    }

    return stages.map((stage, index) => {
      const config = sectorConfig.stages?.[stage.id] || {};
      const colorIndex = index % this.STAGE_COLORS.length;

      return {
        id: stage.id || `stage_${index}`,
        name: config.name || stage.name || stage.title || `Этап ${index + 1}`,
        color: config.color || stage.color || this.STAGE_COLORS[colorIndex],
        order: config.order || stage.order || index,
        tickets: this.normalizeTickets(stage.tickets || [], sectorConfig),
        employees: this.normalizeEmployees(stage.employees || [], sectorConfig),
        metrics: this.calculateStageMetrics(stage, sectorConfig)
      };
    }).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Нормализация сотрудников
   *
   * @param {Array} employees - Сотрудники сектора
   * @param {object} sectorConfig - Конфигурация сектора
   * @returns {Array} Нормализованные сотрудники
   */
  static normalizeEmployees(employees, sectorConfig) {
    if (!Array.isArray(employees)) {
      return [];
    }

    return employees.map(employee => ({
      id: employee.id || employee.ID || `emp_${Math.random()}`,
      name: this.normalizeEmployeeName(employee),
      department: employee.department || employee.UF_DEPARTMENT || sectorConfig.defaultDepartment || 'Unknown',
      load: employee.load || employee.currentLoad || 0,
      avatar: employee.avatar || employee.PERSONAL_PHOTO || null,
      status: employee.status || employee.ACTIVE || 'active',
      color: this.assignEmployeeColor(employee, sectorConfig)
    }));
  }

  /**
   * Нормализация тикетов
   *
   * @param {Array} tickets - Тикеты
   * @param {object} sectorConfig - Конфигурация сектора
   * @returns {Array} Нормализованные тикеты
   */
  static normalizeTickets(tickets, sectorConfig) {
    if (!Array.isArray(tickets)) {
      return [];
    }

    return tickets.map(ticket => ({
      id: ticket.id || ticket.ID || `ticket_${Math.random()}`,
      title: this.normalizeTicketTitle(ticket),
      status: ticket.status || ticket.STATUS_ID || 'new',
      priority: this.normalizePriority(ticket),
      assignedTo: ticket.assignedTo || ticket.ASSIGNED_BY_ID || ticket.assigned_to,
      createdAt: this.normalizeDate(ticket.createdAt || ticket.CREATED_DATE || ticket.DATE_CREATE),
      updatedAt: this.normalizeDate(ticket.updatedAt || ticket.UPDATED_DATE || ticket.TIMESTAMP_X),
      deadline: this.normalizeDate(ticket.deadline || ticket.DEADLINE),
      tags: this.extractTags(ticket, sectorConfig),
      description: ticket.description || ticket.DETAIL_TEXT || ticket.COMMENTS || ''
    }));
  }

  /**
   * Нормализация имени сотрудника
   *
   * @param {object} employee - Данные сотрудника
   * @returns {string} Нормализованное имя
   */
  static normalizeEmployeeName(employee) {
    if (!employee) return 'Неизвестный сотрудник';

    // Разные форматы имен в Bitrix24
    const lastName = employee.LAST_NAME || employee.lastName || '';
    const firstName = employee.NAME || employee.firstName || employee.FIRST_NAME || '';
    const fullName = `${lastName} ${firstName}`.trim();

    // Если есть полное имя
    if (fullName && fullName !== ' ') {
      return fullName;
    }

    // Если есть только имя
    if (firstName) {
      return firstName;
    }

    // Если есть логин или email
    if (employee.LOGIN || employee.login) {
      return employee.LOGIN || employee.login;
    }

    // Fallback
    return `Сотрудник #${employee.id || employee.ID || 'unknown'}`;
  }

  /**
   * Нормализация заголовка тикета
   *
   * @param {object} ticket - Данные тикета
   * @returns {string} Нормализованный заголовок
   */
  static normalizeTicketTitle(ticket) {
    return ticket.title ||
           ticket.TITLE ||
           ticket.name ||
           ticket.NAME ||
           ticket.subject ||
           ticket.SUBJECT ||
           `Тикет ${ticket.id || ticket.ID || 'без названия'}`;
  }

  /**
   * Нормализация приоритета
   *
   * @param {object} ticket - Данные тикета
   * @returns {number} Приоритет (1-5)
   */
  static normalizePriority(ticket) {
    const priority = ticket.priority || ticket.PRIORITY;

    if (typeof priority === 'number') {
      return Math.max(1, Math.min(5, priority));
    }

    if (typeof priority === 'string') {
      const priorityMap = {
        'low': 1, 'lowest': 1,
        'normal': 3, 'medium': 3,
        'high': 4, 'highest': 5,
        'urgent': 5, 'critical': 5
      };
      return priorityMap[priority.toLowerCase()] || 3;
    }

    return 3; // normal по умолчанию
  }

  /**
   * Нормализация даты
   *
   * @param {*} dateValue - Значение даты
   * @returns {string|null} ISO строка даты или null
   */
  static normalizeDate(dateValue) {
    if (!dateValue) return null;

    try {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
      return null;
    }
  }

  /**
   * Извлечение тегов из тикета
   *
   * @param {object} ticket - Данные тикета
   * @param {object} sectorConfig - Конфигурация сектора
   * @returns {Array<string>} Массив тегов
   */
  static extractTags(ticket, sectorConfig) {
    const tags = [];

    // Поле сектора
    if (ticket.UF_CRM_7_TYPE_PRODUCT) {
      tags.push(ticket.UF_CRM_7_TYPE_PRODUCT);
    }

    // Категории
    if (ticket.category || ticket.CATEGORY) {
      tags.push(ticket.category || ticket.CATEGORY);
    }

    // Тип
    if (ticket.type || ticket.TYPE) {
      tags.push(ticket.type || ticket.TYPE);
    }

    // Приоритет как тег
    if (ticket.priority && typeof ticket.priority === 'string') {
      tags.push(`priority:${ticket.priority}`);
    }

    return [...new Set(tags)]; // Удаление дубликатов
  }

  /**
   * Назначение цвета сотруднику
   *
   * @param {object} employee - Данные сотрудника
   * @param {object} sectorConfig - Конфигурация сектора
   * @returns {string} Цвет
   */
  static assignEmployeeColor(employee, sectorConfig) {
    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6c757d', '#17a2b8'];

    // По департаменту
    if (employee.department) {
      const deptHash = employee.department.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      return colors[Math.abs(deptHash) % colors.length];
    }

    // По ID
    const id = employee.id || employee.ID || 0;
    return colors[Math.abs(id) % colors.length];
  }

  /**
   * Расчет метрик этапа
   *
   * @param {object} stage - Данные этапа
   * @param {object} sectorConfig - Конфигурация сектора
   * @returns {object} Метрики этапа
   */
  static calculateStageMetrics(stage, sectorConfig) {
    const tickets = stage.tickets || [];
    const employees = stage.employees || [];

    return {
      ticketCount: tickets.length,
      employeeCount: employees.length,
      averageLoad: employees.length > 0 ? tickets.length / employees.length : 0,
      completionRate: this.calculateCompletionRate(tickets),
      overdueCount: this.countOverdueTickets(tickets)
    };
  }

  /**
   * Расчет общей метрики сектора
   *
   * @param {object} sectorData - Данные сектора
   * @param {object} sectorConfig - Конфигурация сектора
   * @returns {object} Метрики сектора
   */
  static calculateMetrics(sectorData, sectorConfig) {
    const allTickets = [
      ...(sectorData.zeroPointTickets || []),
      ...(sectorData.stages || []).flatMap(stage => stage.tickets || [])
    ];

    const totalTickets = allTickets.length;
    const totalEmployees = sectorData.employees?.length || 0;
    const activeStages = (sectorData.stages || []).filter(stage =>
      (stage.tickets || []).length > 0
    ).length;

    return {
      totalTickets,
      totalEmployees,
      activeStages,
      averageTicketsPerEmployee: totalEmployees > 0 ? totalTickets / totalEmployees : 0,
      completionRate: this.calculateCompletionRate(allTickets),
      overdueCount: this.countOverdueTickets(allTickets)
    };
  }

  /**
   * Расчет процента завершения
   *
   * @param {Array} tickets - Тикеты
   * @returns {number} Процент завершения (0-100)
   */
  static calculateCompletionRate(tickets) {
    if (!tickets.length) return 0;

    const completedTickets = tickets.filter(ticket =>
      ticket.status === 'closed' ||
      ticket.status === 'completed' ||
      ticket.status === 'done'
    ).length;

    return Math.round((completedTickets / tickets.length) * 100);
  }

  /**
   * Подсчет просроченных тикетов
   *
   * @param {Array} tickets - Тикеты
   * @returns {number} Количество просроченных тикетов
   */
  static countOverdueTickets(tickets) {
    const now = new Date();

    return tickets.filter(ticket => {
      if (!ticket.deadline) return false;

      const deadline = new Date(ticket.deadline);
      return deadline < now && ticket.status !== 'closed' && ticket.status !== 'completed';
    }).length;
  }

  /**
   * Создание метаданных
   *
   * @param {object} sectorData - Данные сектора
   * @param {object} sectorConfig - Конфигурация сектора
   * @returns {object} Метаданные
   */
  static createMetadata(sectorData, sectorConfig) {
    return {
      sectorId: sectorConfig.id,
      sectorName: sectorConfig.name,
      lastUpdated: new Date().toISOString(),
      dataVersion: '2.0', // Универсальный формат
      source: 'universal-normalizer'
    };
  }

  /**
   * Получение пустых данных сектора
   *
   * @param {object} sectorConfig - Конфигурация сектора
   * @returns {object} Пустые данные
   */
  static getEmptySectorData(sectorConfig) {
    return {
      stages: [],
      employees: [],
      zeroPointTickets: [],
      metrics: {
        totalTickets: 0,
        totalEmployees: 0,
        activeStages: 0,
        averageTicketsPerEmployee: 0,
        completionRate: 0,
        overdueCount: 0
      },
      metadata: this.createMetadata({}, sectorConfig)
    };
  }
}

export default SectorDataNormalizer;