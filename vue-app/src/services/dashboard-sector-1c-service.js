/**
 * Сервис для работы с API дашборда сектора 1С
 * 
 * Предоставляет методы для получения и обновления данных о тикетах и сотрудниках
 * через Bitrix24 REST API
 * 
 * Используемые методы Bitrix24 REST API:
 * - crm.deal.list - получение списка тикетов/сделок
 * - crm.deal.get - получение детальной информации о тикете
 * - crm.deal.update - обновление тикета
 * - crm.deal.add - создание тикета
 * - user.get - получение данных сотрудников
 * - crm.timeline.comment.add - добавление комментария
 * 
 * Документация:
 * - https://context7.com/bitrix24/rest/crm.deal.list
 * - https://context7.com/bitrix24/rest/crm.deal.update
 * - https://context7.com/bitrix24/rest/user.get
 */

import { Bitrix24ApiService } from './bitrix24-api.js';

export class DashboardSector1CService {
  /**
   * Получение данных сектора 1С
   * 
   * Загружает тикеты, сотрудников и группирует их по этапам
   * 
   * @returns {Promise<object>} Данные сектора (stages, employees, zeroPointTickets)
   */
  static async getSectorData() {
    try {
      // Получаем тикеты
      const ticketsResult = await Bitrix24ApiService.call('crm.deal.list', {
        filter: {
          // Фильтр для сектора 1С (можно настроить по CATEGORY_ID или другим полям)
          // 'CATEGORY_ID': 0,
        },
        select: ['ID', 'TITLE', 'STAGE_ID', 'ASSIGNED_BY_ID', 'OPPORTUNITY', 'CURRENCY_ID', 'CREATED_DATE', 'MODIFY_DATE'],
        order: { ID: 'DESC' }
      });

      // Получаем сотрудников
      const employeesResult = await this.getEmployees();

      // Группируем данные по этапам
      const stages = this.groupTicketsByStages(ticketsResult.result || [], employeesResult);

      return {
        stages,
        employees: employeesResult,
        zeroPointTickets: this.getZeroPointTickets(ticketsResult.result || [])
      };
    } catch (error) {
      console.error('Error getting sector data:', error);
      throw error;
    }
  }

  /**
   * Получение списка сотрудников сектора 1С
   * 
   * Метод: user.get
   * Документация: https://context7.com/bitrix24/rest/user.get
   * 
   * @returns {Promise<Array>} Массив сотрудников
   */
  static async getEmployees() {
    try {
      // Получаем список сотрудников
      // Можно использовать фильтр по отделу или другим критериям
      const result = await Bitrix24ApiService.call('user.get', {
        // Фильтр по отделу сектора 1С (нужно настроить под конкретный проект)
        // filter: {
        //   'UF_DEPARTMENT': [366] // ID отдела сектора 1С
        // }
      });

      return (result.result || []).map(user => ({
        id: parseInt(user.ID),
        name: `${user.NAME || ''} ${user.LAST_NAME || ''}`.trim() || user.EMAIL || 'Неизвестный',
        position: user.WORK_POSITION || 'Сотрудник',
        email: user.EMAIL || '',
        tickets: []
      }));
    } catch (error) {
      console.error('Error getting employees:', error);
      throw error;
    }
  }

  /**
   * Группировка тикетов по этапам
   * 
   * @param {Array} tickets - Массив тикетов из Bitrix24
   * @param {Array} employees - Массив сотрудников
   * @returns {Array} Массив этапов с тикетами
   */
  static groupTicketsByStages(tickets, employees) {
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
      const stageId = this.mapStageId(ticket.STAGE_ID);
      const stage = stages.find(s => s.id === stageId);
      
      if (stage) {
        const employeeId = ticket.ASSIGNED_BY_ID ? parseInt(ticket.ASSIGNED_BY_ID) : null;
        if (employeeId) {
          const employee = stage.employees.find(e => e.id === employeeId);
          if (employee) {
            employee.tickets.push(this.mapTicket(ticket));
          }
        }
      }
    });

    return stages;
  }

  /**
   * Маппинг ID этапа Bitrix24 на внутренний ID
   * 
   * @param {string} bitrixStageId - ID этапа в Bitrix24
   * @returns {string} Внутренний ID этапа
   */
  static mapStageId(bitrixStageId) {
    // Маппинг этапов Bitrix24 на внутренние этапы
    // Нужно настроить под конкретную конфигурацию Bitrix24
    const mapping = {
      'NEW': 'formed',
      'PREPARATION': 'review',
      'PREPAYMENT_INVOICE': 'execution',
      // Добавить другие маппинги в зависимости от конфигурации
    };
    
    // Если этап начинается с определённого префикса
    if (bitrixStageId) {
      const upperStageId = bitrixStageId.toUpperCase();
      if (upperStageId.includes('NEW') || upperStageId.includes('C0')) {
        return 'formed';
      }
      if (upperStageId.includes('PREPARATION') || upperStageId.includes('C1')) {
        return 'review';
      }
      if (upperStageId.includes('PREPAYMENT') || upperStageId.includes('C2')) {
        return 'execution';
      }
    }
    
    return mapping[bitrixStageId] || 'formed';
  }

  /**
   * Маппинг внутреннего ID этапа на ID этапа Bitrix24
   * 
   * @param {string} stageId - Внутренний ID этапа
   * @returns {string} ID этапа в Bitrix24
   */
  static mapStageIdToBitrix(stageId) {
    const mapping = {
      'formed': 'NEW',
      'review': 'PREPARATION',
      'execution': 'PREPAYMENT_INVOICE'
    };
    return mapping[stageId] || 'NEW';
  }

  /**
   * Маппинг тикета из Bitrix24 в внутренний формат
   * 
   * @param {object} bitrixTicket - Тикет из Bitrix24
   * @returns {object} Тикет во внутреннем формате
   */
  static mapTicket(bitrixTicket) {
    return {
      id: parseInt(bitrixTicket.ID),
      title: bitrixTicket.TITLE || 'Без названия',
      priority: this.mapPriority(bitrixTicket.PRIORITY),
      status: this.mapStatus(bitrixTicket.STAGE_ID),
      assigneeId: bitrixTicket.ASSIGNED_BY_ID ? parseInt(bitrixTicket.ASSIGNED_BY_ID) : null,
      stageId: this.mapStageId(bitrixTicket.STAGE_ID),
      createdAt: bitrixTicket.CREATED_DATE,
      modifiedAt: bitrixTicket.MODIFY_DATE,
      amount: bitrixTicket.OPPORTUNITY || 0,
      currency: bitrixTicket.CURRENCY_ID || 'RUB',
      description: bitrixTicket.COMMENTS || ''
    };
  }

  /**
   * Маппинг приоритета из Bitrix24
   * 
   * @param {string} bitrixPriority - Приоритет в Bitrix24
   * @returns {string} Приоритет (high, medium, low)
   */
  static mapPriority(bitrixPriority) {
    const mapping = {
      '3': 'high',
      '2': 'medium',
      '1': 'low'
    };
    return mapping[bitrixPriority] || 'medium';
  }

  /**
   * Маппинг приоритета на формат Bitrix24
   * 
   * @param {string} priority - Приоритет (high, medium, low)
   * @returns {string} Приоритет в Bitrix24
   */
  static mapPriorityToBitrix(priority) {
    const mapping = {
      'high': '3',
      'medium': '2',
      'low': '1'
    };
    return mapping[priority] || '2';
  }

  /**
   * Маппинг статуса
   * 
   * @param {string} bitrixStatus - Статус в Bitrix24
   * @returns {string} Статус (in_progress, new, done, pending)
   */
  static mapStatus(bitrixStatus) {
    // Маппинг статусов Bitrix24
    // Можно расширить в зависимости от конфигурации
    return 'in_progress';
  }

  /**
   * Получение тикетов нулевой точки (без назначенного сотрудника)
   * 
   * @param {Array} tickets - Массив тикетов
   * @returns {object} Объект с тикетами для каждого этапа
   */
  static getZeroPointTickets(tickets) {
    const zeroPointTickets = {
      formed: [],
      review: [],
      execution: []
    };

    // Тикеты без назначенного сотрудника
    tickets
      .filter(t => !t.ASSIGNED_BY_ID)
      .forEach(ticket => {
        const stageId = this.mapStageId(ticket.STAGE_ID);
        if (zeroPointTickets[stageId]) {
          zeroPointTickets[stageId].push(this.mapTicket(ticket));
        }
      });

    return zeroPointTickets;
  }

  /**
   * Назначение тикета сотруднику
   * 
   * Метод: crm.deal.update
   * Документация: https://context7.com/bitrix24/rest/crm.deal.update
   * 
   * @param {number} ticketId - ID тикета
   * @param {number} employeeId - ID сотрудника
   * @param {string} stageId - ID этапа
   * @returns {Promise<boolean>} Успешность операции
   */
  static async assignTicket(ticketId, employeeId, stageId) {
    try {
      const bitrixStageId = this.mapStageIdToBitrix(stageId);
      
      const result = await Bitrix24ApiService.call('crm.deal.update', {
        id: ticketId,
        fields: {
          ASSIGNED_BY_ID: employeeId,
          STAGE_ID: bitrixStageId
        }
      });

      return result.result === true;
    } catch (error) {
      console.error('Error assigning ticket:', error);
      throw error;
    }
  }

  /**
   * Создание нового тикета
   * 
   * Метод: crm.deal.add
   * Документация: https://context7.com/bitrix24/rest/crm.deal.add
   * 
   * @param {object} ticketData - Данные тикета
   * @returns {Promise<number>} ID созданного тикета
   */
  static async createTicket(ticketData) {
    try {
      const result = await Bitrix24ApiService.call('crm.deal.add', {
        fields: {
          TITLE: ticketData.title,
          ASSIGNED_BY_ID: ticketData.employeeId,
          STAGE_ID: this.mapStageIdToBitrix(ticketData.stageId),
          OPPORTUNITY: ticketData.amount || 0,
          CURRENCY_ID: ticketData.currency || 'RUB',
          COMMENTS: ticketData.description || ''
        }
      });

      return result.result ? parseInt(result.result) : 0;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

  /**
   * Получение детальной информации о тикете
   * 
   * Метод: crm.deal.get
   * Документация: https://context7.com/bitrix24/rest/crm.deal.get
   * 
   * @param {number} ticketId - ID тикета
   * @returns {Promise<object>} Данные тикета
   */
  static async getTicket(ticketId) {
    try {
      const result = await Bitrix24ApiService.call('crm.deal.get', {
        id: ticketId
      });

      return this.mapTicket(result.result);
    } catch (error) {
      console.error('Error getting ticket:', error);
      throw error;
    }
  }

  /**
   * Добавление комментария к тикету
   * 
   * Метод: crm.timeline.comment.add
   * Документация: https://context7.com/bitrix24/rest/crm.timeline.comment.add
   * 
   * @param {number} ticketId - ID тикета
   * @param {string} comment - Текст комментария
   * @returns {Promise<boolean>} Успешность операции
   */
  static async addComment(ticketId, comment) {
    try {
      const result = await Bitrix24ApiService.call('crm.timeline.comment.add', {
        fields: {
          ENTITY_ID: ticketId,
          ENTITY_TYPE: 'deal',
          COMMENT: comment
        }
      });

      return result.result !== undefined;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }
}

