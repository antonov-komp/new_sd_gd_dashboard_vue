# TASK-005-07: Создание сервиса для работы с API

**Дата создания:** 2025-12-06 11:18 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-005

---

## Описание

Создать сервис для работы с API дашборда сектора 1С (`dashboard-sector-1c-service.js`). Сервис должен предоставлять методы для получения данных о тикетах, сотрудниках и обновления тикетов через Bitrix24 REST API.

---

## Контекст

Сервис является промежуточным слоем между компонентами Vue.js и Bitrix24 REST API. Он инкапсулирует логику работы с API и предоставляет удобные методы для компонентов.

**Используемые методы Bitrix24 REST API:**
- `crm.deal.list` — получение списка тикетов/сделок
- `crm.deal.get` — получение детальной информации о тикете
- `crm.deal.update` — обновление тикета
- `user.get` — получение данных сотрудников
- `crm.timeline.comment.add` — добавление комментария

---

## Модули и компоненты

### Файлы для создания:
- `vue-app/src/services/dashboard-sector-1c-service.js`

### Зависимости:
- Bitrix24 REST API (через вебхук или BX.ajax)
- Существующий сервис для Bitrix24 API (если есть)

---

## Ступенчатые подзадачи

### 1. Создать структуру сервиса

```javascript
/**
 * Сервис для работы с API дашборда сектора 1С
 * 
 * Предоставляет методы для получения и обновления данных о тикетах и сотрудниках
 * через Bitrix24 REST API
 */

export class DashboardSector1CService {
  /**
   * Базовый URL для API запросов
   */
  static getApiUrl() {
    // Получаем из конфигурации или глобальной переменной
    return window.BITRIX24_API_URL || '/api/bitrix24/';
  }

  /**
   * Выполнение запроса к Bitrix24 API
   * 
   * @param {string} method Метод API (например, 'crm.deal.list')
   * @param {object} params Параметры запроса
   * @returns {Promise<object>} Результат запроса
   */
  static async call(method, params = {}) {
    // Реализация будет добавлена в следующем шаге
  }
}
```

---

### 2. Реализовать метод call() для запросов к API

```javascript
/**
 * Выполнение запроса к Bitrix24 API
 * 
 * @param {string} method Метод API
 * @param {object} params Параметры запроса
 * @returns {Promise<object>} Результат запроса
 */
static async call(method, params = {}) {
  const url = this.getApiUrl() + method;
  
  try {
    // Используем BX.ajax если доступен, иначе fetch
    if (typeof BX !== 'undefined' && BX.ajax) {
      return new Promise((resolve, reject) => {
        BX.ajax({
          url: url,
          method: 'POST',
          dataType: 'json',
          data: params,
          onsuccess: (response) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error));
            } else {
              resolve(response);
            }
          },
          onfailure: (error) => {
            reject(new Error('Request failed'));
          }
        });
      });
    } else {
      // Fallback на fetch
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error_description || result.error);
      }
      
      return result;
    }
  } catch (error) {
    console.error('Bitrix24 API error:', error);
    throw error;
  }
}
```

---

### 3. Реализовать методы получения данных

```javascript
/**
 * Получение данных сектора 1С
 * 
 * @returns {Promise<object>} Данные сектора (stages, employees, tickets)
 */
static async getSectorData() {
  try {
    // Получаем тикеты
    const ticketsResult = await this.call('crm.deal.list', {
      filter: {
        'CATEGORY_ID': 0, // Или другой фильтр для сектора 1С
        // Дополнительные фильтры
      },
      select: ['ID', 'TITLE', 'STAGE_ID', 'ASSIGNED_BY_ID', 'PRIORITY', 'STATUS_ID', 'CREATED_DATE'],
      order: ['ID' => 'DESC']
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
 * Получение списка сотрудников
 * 
 * @returns {Promise<Array>} Массив сотрудников
 */
static async getEmployees() {
  try {
    // Получаем список сотрудников сектора 1С
    // Можно использовать фильтр по отделу
    const result = await this.call('user.get', {
      filter: {
        'UF_DEPARTMENT': [366] // ID отдела сектора 1С
      }
    });

    return (result.result || []).map(user => ({
      id: user.ID,
      name: `${user.NAME} ${user.LAST_NAME}`.trim(),
      position: user.WORK_POSITION || 'Сотрудник',
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
 * @param {Array} tickets Массив тикетов
 * @param {Array} employees Массив сотрудников
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
      const employee = stage.employees.find(e => e.id === ticket.ASSIGNED_BY_ID);
      if (employee) {
        employee.tickets.push(this.mapTicket(ticket));
      }
    }
  });

  return stages;
}

/**
 * Маппинг ID этапа Bitrix24 на внутренний ID
 * 
 * @param {string} bitrixStageId ID этапа в Bitrix24
 * @returns {string} Внутренний ID этапа
 */
static mapStageId(bitrixStageId) {
  // Маппинг этапов Bitrix24 на внутренние этапы
  const mapping = {
    'NEW': 'formed',
    'PREPARATION': 'review',
    'PREPAYMENT_INVOICE': 'execution',
    // Добавить другие маппинги
  };
  
  return mapping[bitrixStageId] || 'formed';
}

/**
 * Маппинг тикета из Bitrix24 в внутренний формат
 * 
 * @param {object} bitrixTicket Тикет из Bitrix24
 * @returns {object} Тикет во внутреннем формате
 */
static mapTicket(bitrixTicket) {
  return {
    id: bitrixTicket.ID,
    title: bitrixTicket.TITLE,
    priority: this.mapPriority(bitrixTicket.PRIORITY),
    status: this.mapStatus(bitrixTicket.STATUS_ID),
    assigneeId: bitrixTicket.ASSIGNED_BY_ID,
    createdAt: bitrixTicket.CREATED_DATE,
    // Дополнительные поля
  };
}

/**
 * Маппинг приоритета
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
 * Маппинг статуса
 */
static mapStatus(bitrixStatus) {
  // Маппинг статусов Bitrix24
  return 'in_progress'; // Заглушка
}

/**
 * Получение тикетов нулевой точки
 */
static getZeroPointTickets(tickets) {
  // Тикеты без назначенного сотрудника
  return tickets
    .filter(t => !t.ASSIGNED_BY_ID)
    .map(t => this.mapTicket(t));
}
```

---

### 4. Реализовать методы обновления данных

```javascript
/**
 * Назначение тикета сотруднику
 * 
 * @param {number} ticketId ID тикета
 * @param {number} employeeId ID сотрудника
 * @param {string} stageId ID этапа
 * @returns {Promise<boolean>} Успешность операции
 */
static async assignTicket(ticketId, employeeId, stageId) {
  try {
    const bitrixStageId = this.mapStageIdToBitrix(stageId);
    
    const result = await this.call('crm.deal.update', {
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
 * Маппинг внутреннего ID этапа на ID этапа Bitrix24
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
 * Создание нового тикета
 * 
 * @param {object} ticketData Данные тикета
 * @returns {Promise<number>} ID созданного тикета
 */
static async createTicket(ticketData) {
  try {
    const result = await this.call('crm.deal.add', {
      fields: {
        TITLE: ticketData.title,
        ASSIGNED_BY_ID: ticketData.employeeId,
        STAGE_ID: this.mapStageIdToBitrix(ticketData.stageId),
        PRIORITY: this.mapPriorityToBitrix(ticketData.priority),
        // Дополнительные поля
      }
    });

    return result.result || 0;
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw error;
  }
}

/**
 * Маппинг приоритета на формат Bitrix24
 */
static mapPriorityToBitrix(priority) {
  const mapping = {
    'high': '3',
    'medium': '2',
    'low': '1'
  };
  return mapping[priority] || '2';
}
```

---

## Критерии приёмки

- [ ] Сервис `dashboard-sector-1c-service.js` создан
- [ ] Реализован метод `call()` для запросов к Bitrix24 API
- [ ] Реализован метод `getSectorData()` для получения данных сектора
- [ ] Реализован метод `getEmployees()` для получения сотрудников
- [ ] Реализован метод `assignTicket()` для назначения тикета
- [ ] Реализован метод `createTicket()` для создания тикета
- [ ] Реализованы методы маппинга данных (mapTicket, mapStageId, etc.)
- [ ] Обработка ошибок реализована
- [ ] Сервис интегрирован с компонентом `DashboardSector1C.vue`

---

## История правок

- **2025-12-06 11:18 (UTC+3, Брест):** Создана подзадача TASK-005-07

