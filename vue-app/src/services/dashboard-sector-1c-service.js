/**
 * Сервис для работы с API дашборда сектора 1С
 * 
 * Предоставляет методы для получения и обновления данных о тикетах и сотрудниках
 * через Bitrix24 REST API
 * 
 * Работает со смарт-процессом 140 (Сектор 1С)
 * 
 * Используемые методы Bitrix24 REST API:
 * - crm.item.list - получение списка элементов смарт-процесса
 * - crm.item.get - получение детальной информации об элементе
 * - crm.item.update - обновление элемента
 * - crm.item.add - создание элемента
 * - user.get - получение данных сотрудников
 * - crm.timeline.comment.add - добавление комментария
 * 
 * Стадии смарт-процесса 140:
 * - DT140_12:UC_0VHWE2 - Сформировано обращение
 * - DT140_12:PREPARATION - Рассмотрение ТЗ
 * - DT140_12:CLIENT - Исполнение
 * 
 * Документация:
 * - https://context7.com/bitrix24/rest/crm.item.list
 * - https://context7.com/bitrix24/rest/crm.item.update
 * - https://context7.com/bitrix24/rest/user.get
 */

import { Bitrix24ApiService } from './bitrix24-api.js';

export class DashboardSector1CService {
  /**
   * ID смарт-процесса сектора 1С
   */
  static ENTITY_TYPE_ID = 140;

  /**
   * Глобальный тег определения сектора 1С
   * Пользовательское поле UF_CRM_7_TYPE_PRODUCT
   */
  static SECTOR_TAG = '1C';

  /**
   * Получение данных сектора 1С
   * 
   * Логика:
   * 1. Получаем все тикеты смарт-процесса 140 (с пагинацией)
   * 2. Из тикетов извлекаем уникальных сотрудников (assignedById)
   * 3. Получаем данные только этих сотрудников
   * 4. Раскладываем тикеты по этапам и сотрудникам
   * 
   * @returns {Promise<object>} Данные сектора (stages, employees, zeroPointTickets)
   */
  static async getSectorData() {
    try {
      // Шаг 1: Получаем все тикеты с пагинацией
      const allTickets = await this.getAllTickets();

      console.log('Total tickets loaded:', allTickets.length);

      // Шаг 2: Извлекаем уникальных сотрудников из тикетов
      const uniqueEmployeeIds = this.extractUniqueEmployeeIds(allTickets);
      console.log('Unique employee IDs:', uniqueEmployeeIds);

      // Шаг 3: Получаем данные только этих сотрудников
      const employees = await this.getEmployeesByIds(uniqueEmployeeIds);
      console.log('Loaded employees:', employees.length);

      // Шаг 4: Группируем тикеты по этапам и сотрудникам
      const stages = this.groupTicketsByStages(allTickets, employees);

      return {
        stages,
        employees: employees,
        zeroPointTickets: this.getZeroPointTickets(allTickets)
      };
    } catch (error) {
      console.error('Error getting sector data:', error);
      throw error;
    }
  }

  /**
   * Получение всех тикетов смарт-процесса с пагинацией
   * 
   * Загружает только тикеты из трёх стадий:
   * - DT140_12:UC_0VHWE2 - Сформировано обращение
   * - DT140_12:PREPARATION - Рассмотрение ТЗ
   * - DT140_12:CLIENT - Исполнение
   * 
   * Bitrix24 возвращает максимум 50 элементов за запрос
   * Используем пагинацию для получения всех тикетов
   * 
   * @returns {Promise<Array>} Массив всех тикетов
   */
  static async getAllTickets() {
    // Стадии смарт-процесса 140, которые нужно загружать
    const targetStages = [
      'DT140_12:UC_0VHWE2',    // Сформировано обращение
      'DT140_12:PREPARATION',   // Рассмотрение ТЗ
      'DT140_12:CLIENT'          // Исполнение
    ];

    // Загружаем тикеты по каждой стадии отдельно (более надёжный способ)
    const allTickets = [];
    
    for (const stageId of targetStages) {
      console.log(`Loading tickets for stage: ${stageId}`);
      const stageTickets = await this.getTicketsByStage(stageId);
      allTickets.push(...stageTickets);
      console.log(`Loaded ${stageTickets.length} tickets for stage ${stageId}`);
    }

    return allTickets;
  }

  /**
   * Получение тикетов по конкретной стадии с пагинацией
   * 
   * Загружает тикеты по стадии, затем фильтрует по глобальному тегу сектора 1С
   * (UF_CRM_7_TYPE_PRODUCT не поддерживается в фильтре crm.item.list)
   * 
   * @param {string} stageId - ID стадии
   * @returns {Promise<Array>} Массив тикетов стадии с тегом сектора 1С
   */
  static async getTicketsByStage(stageId) {
    const allTickets = [];
    let start = 0;
    const limit = 50; // Максимум элементов за запрос
    let hasMore = true;

    while (hasMore) {
      try {
        // Загружаем тикеты по стадии (без фильтра по UF_CRM_7_TYPE_PRODUCT, т.к. не поддерживается)
        const result = await Bitrix24ApiService.call('crm.item.list', {
          entityTypeId: this.ENTITY_TYPE_ID,
          filter: {
            stageId: stageId  // Фильтр только по стадии
          },
          // Для смарт-процессов нужно использовать правильные имена полей
          // Попробуем получить все поля или использовать правильные имена
          select: ['*'], // Получаем все поля, чтобы увидеть структуру
          order: { id: 'DESC' },
          start: start,
          useOriginalUfNames: 'Y'  // Использовать оригинальные имена пользовательских полей (UF_CRM_7_TYPE_PRODUCT)
        });

        // Извлекаем массив тикетов из ответа
        let batchTickets = [];
        if (result && result.result) {
          if (Array.isArray(result.result)) {
            batchTickets = result.result;
          } else if (result.result.items && Array.isArray(result.result.items)) {
            batchTickets = result.result.items;
          } else if (result.result.data && Array.isArray(result.result.data)) {
            batchTickets = result.result.data;
          }
        }

        if (batchTickets.length > 0) {
          allTickets.push(...batchTickets);
          start += batchTickets.length;

          // Проверяем, есть ли ещё данные
          // Если получили меньше limit, значит это последняя страница
          hasMore = batchTickets.length === limit;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Error loading tickets batch for stage ${stageId} (start: ${start}):`, error);
        hasMore = false; // Прерываем цикл при ошибке
      }
    }

    // Фильтруем тикеты по глобальному тегу сектора 1С на клиенте
    // С параметром useOriginalUfNames: 'Y' поле должно приходить как UF_CRM_7_TYPE_PRODUCT
    // Без параметра поле приходит в нижнем регистре (uf_crm_7_type_product)
    if (allTickets.length > 0) {
      // Логируем первый тикет для отладки (полная структура в JSON)
      console.log('Sample ticket structure (full JSON):', JSON.stringify(allTickets[0], null, 2));
      console.log('Sample ticket keys:', Object.keys(allTickets[0]));
      console.log('Sample ticket assignedById variants:', {
        assignedById: allTickets[0].assignedById,
        assignedByIdId: allTickets[0].assignedByIdId,
        ASSIGNED_BY_ID: allTickets[0].ASSIGNED_BY_ID
      });
    }

    const filteredTickets = allTickets.filter(ticket => {
      // Пробуем разные варианты имени поля (с useOriginalUfNames и без)
      const tagValue = ticket.UF_CRM_7_TYPE_PRODUCT ||  // С useOriginalUfNames: 'Y'
                      ticket.uf_crm_7_type_product ||   // Без параметра (нижний регистр)
                      ticket.ufCrm7TypeProduct ||       // camelCase вариант
                      ticket['UF_CRM_7_TYPE_PRODUCT'] ||
                      ticket['uf_crm_7_type_product'];
      
      // Убираем детальное логирование для каждого тикета (оставляем только для отладки)
      // if (allTickets.indexOf(ticket) < 3) {
      //   console.log(`Ticket ${ticket.id || ticket.ID}: tagValue =`, tagValue, 'expected:', this.SECTOR_TAG);
      //   console.log(`Ticket ${ticket.id || ticket.ID}: UF_CRM_7_TYPE_PRODUCT =`, ticket.UF_CRM_7_TYPE_PRODUCT);
      //   console.log(`Ticket ${ticket.id || ticket.ID}: uf_crm_7_type_product =`, ticket.uf_crm_7_type_product);
      // }
      
      // Проверяем точное совпадение или если значение является массивом/объектом
      if (Array.isArray(tagValue)) {
        return tagValue.includes(this.SECTOR_TAG);
      }
      if (typeof tagValue === 'object' && tagValue !== null) {
        return tagValue.value === this.SECTOR_TAG || tagValue === this.SECTOR_TAG;
      }
      
      return tagValue === this.SECTOR_TAG;
    });

    console.log(`Filtered ${filteredTickets.length} tickets from ${allTickets.length} for stage ${stageId} (sector tag: ${this.SECTOR_TAG})`);

    return filteredTickets;
  }

  /**
   * Извлечение уникальных ID сотрудников из тикетов
   * 
   * @param {Array} tickets - Массив тикетов
   * @returns {Array<number>} Массив уникальных ID сотрудников
   */
  static extractUniqueEmployeeIds(tickets) {
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

    // Логируем для отладки
    if (tickets.length > 0) {
      console.log('Sample ticket for employee extraction:', tickets[0]);
      console.log('Sample ticket assignedById variants:', {
        assignedById: tickets[0].assignedById,
        assignedByIdId: tickets[0].assignedByIdId,
        ASSIGNED_BY_ID: tickets[0].ASSIGNED_BY_ID
      });
      console.log('Extracted employee IDs:', Array.from(employeeIds));
    }

    return Array.from(employeeIds);
  }

  /**
   * Получение данных сотрудников по их ID
   * 
   * Метод: user.get
   * Документация: https://context7.com/bitrix24/rest/user.get
   * 
   * @param {Array<number>} employeeIds - Массив ID сотрудников
   * @returns {Promise<Array>} Массив сотрудников
   */
  static async getEmployeesByIds(employeeIds) {
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return [];
    }

    try {
      // Получаем данные сотрудников по их ID
      // Можно использовать фильтр ID или получать по одному
      const result = await Bitrix24ApiService.call('user.get', {
        filter: {
          ID: employeeIds
        }
      });

      // Проверяем структуру ответа
      let users = [];
      if (result && result.result) {
        if (Array.isArray(result.result)) {
          users = result.result;
        } else {
          console.warn('Unexpected user.get result format:', result);
        }
      }

      return users.map(user => ({
        id: parseInt(user.ID || user.id || 0),
        name: `${user.NAME || user.name || ''} ${user.LAST_NAME || user.lastName || ''}`.trim() || user.EMAIL || user.email || 'Неизвестный',
        position: user.WORK_POSITION || user.workPosition || 'Сотрудник',
        email: user.EMAIL || user.email || '',
        tickets: []
      }));
    } catch (error) {
      console.error('Error getting employees by IDs:', error);
      // Возвращаем пустой массив при ошибке, чтобы не ломать работу дашборда
      return [];
    }
  }

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
  static groupTicketsByStages(tickets, employees) {
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
      const stageId = this.mapStageId(ticket.stageId || ticket.STAGE_ID || '');
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
          
          employee.tickets.push(this.mapTicket(ticket));
        }
      }
    });

    return stages;
  }

  /**
   * Маппинг ID этапа Bitrix24 на внутренний ID
   * 
   * Стадии смарт-процесса 140:
   * - DT140_12:UC_0VHWE2 - Сформировано обращение
   * - DT140_12:PREPARATION - Рассмотрение ТЗ
   * - DT140_12:CLIENT - Исполнение
   * 
   * @param {string} bitrixStageId - ID этапа в Bitrix24
   * @returns {string} Внутренний ID этапа
   */
  static mapStageId(bitrixStageId) {
    // Маппинг этапов смарт-процесса 140 на внутренние этапы
    const mapping = {
      'DT140_12:UC_0VHWE2': 'formed',      // Сформировано обращение
      'DT140_12:PREPARATION': 'review',    // Рассмотрение ТЗ
      'DT140_12:CLIENT': 'execution'        // Исполнение
    };
    
    return mapping[bitrixStageId] || 'formed';
  }

  /**
   * Маппинг внутреннего ID этапа на ID этапа Bitrix24
   * 
   * @param {string} stageId - Внутренний ID этапа
   * @returns {string} ID этапа в Bitrix24 (смарт-процесс 140)
   */
  static mapStageIdToBitrix(stageId) {
    const mapping = {
      'formed': 'DT140_12:UC_0VHWE2',      // Сформировано обращение
      'review': 'DT140_12:PREPARATION',    // Рассмотрение ТЗ
      'execution': 'DT140_12:CLIENT'        // Исполнение
    };
    return mapping[stageId] || 'DT140_12:UC_0VHWE2';
  }

  /**
   * Маппинг тикета из Bitrix24 в внутренний формат
   * 
   * Для смарт-процессов поля могут быть в нижнем регистре (id, title, stageId, assignedById)
   * 
   * @param {object} bitrixTicket - Тикет из Bitrix24 (элемент смарт-процесса)
   * @returns {object} Тикет во внутреннем формате
   */
  static mapTicket(bitrixTicket) {
    // Обрабатываем как верхний, так и нижний регистр полей
    const id = parseInt(bitrixTicket.id || bitrixTicket.ID || 0);
    const title = bitrixTicket.title || bitrixTicket.TITLE || 'Без названия';
    const stageId = bitrixTicket.stageId || bitrixTicket.STAGE_ID || '';
    const assignedById = bitrixTicket.assignedById || bitrixTicket.ASSIGNED_BY_ID || null;
    const createdAt = bitrixTicket.createdTime || bitrixTicket.CREATED_DATE || bitrixTicket.CREATED_TIME || '';
    const updatedAt = bitrixTicket.updatedTime || bitrixTicket.MODIFY_DATE || bitrixTicket.UPDATED_TIME || '';

    return {
      id: id,
      title: title,
      priority: this.mapPriority(bitrixTicket.priority || bitrixTicket.PRIORITY),
      status: this.mapStatus(stageId),
      assigneeId: assignedById ? parseInt(assignedById) : null,
      stageId: this.mapStageId(stageId),
      createdAt: createdAt,
      modifiedAt: updatedAt,
      amount: bitrixTicket.opportunity || bitrixTicket.OPPORTUNITY || 0,
      currency: bitrixTicket.currencyId || bitrixTicket.CURRENCY_ID || 'RUB',
      description: bitrixTicket.comments || bitrixTicket.COMMENTS || ''
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

    // Проверяем, что tickets - массив
    if (!Array.isArray(tickets)) {
      console.warn('Tickets is not an array in getZeroPointTickets:', tickets);
      return zeroPointTickets;
    }

    // Тикеты без назначенного сотрудника
    tickets
      .filter(t => !(t.assignedById || t.ASSIGNED_BY_ID))
      .forEach(ticket => {
        const stageId = this.mapStageId(ticket.stageId || ticket.STAGE_ID || '');
        if (zeroPointTickets[stageId]) {
          zeroPointTickets[stageId].push(this.mapTicket(ticket));
        }
      });

    return zeroPointTickets;
  }

  /**
   * Назначение тикета сотруднику
   * 
   * Метод: crm.item.update
   * Документация: https://context7.com/bitrix24/rest/crm.item.update
   * 
   * @param {number} ticketId - ID тикета
   * @param {number} employeeId - ID сотрудника
   * @param {string} stageId - ID этапа
   * @returns {Promise<boolean>} Успешность операции
   */
  static async assignTicket(ticketId, employeeId, stageId) {
    try {
      const bitrixStageId = this.mapStageIdToBitrix(stageId);
      
      const result = await Bitrix24ApiService.call('crm.item.update', {
        entityTypeId: this.ENTITY_TYPE_ID,
        id: ticketId,
        fields: {
          assignedById: employeeId,
          stageId: bitrixStageId
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
   * Метод: crm.item.add
   * Документация: https://context7.com/bitrix24/rest/crm.item.add
   * 
   * @param {object} ticketData - Данные тикета
   * @returns {Promise<number>} ID созданного тикета
   */
  static async createTicket(ticketData) {
    try {
      const result = await Bitrix24ApiService.call('crm.item.add', {
        entityTypeId: this.ENTITY_TYPE_ID,
        fields: {
          title: ticketData.title,
          assignedById: ticketData.employeeId,
          stageId: this.mapStageIdToBitrix(ticketData.stageId)
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
   * Метод: crm.item.get
   * Документация: https://context7.com/bitrix24/rest/crm.item.get
   * 
   * @param {number} ticketId - ID тикета
   * @returns {Promise<object>} Данные тикета
   */
  static async getTicket(ticketId) {
    try {
      const result = await Bitrix24ApiService.call('crm.item.get', {
        entityTypeId: this.ENTITY_TYPE_ID,
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
          entityId: ticketId,
          entityType: 'DYNAMIC_' + this.ENTITY_TYPE_ID, // Для смарт-процессов используется префикс DYNAMIC_
          comment: comment
        }
      });

      return result.result !== undefined;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }
}

