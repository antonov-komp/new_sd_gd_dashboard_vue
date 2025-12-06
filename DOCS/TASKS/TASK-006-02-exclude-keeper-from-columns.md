# TASK-006-02: Исключение тикетов с ответственным 1051 из колонок сотрудников

**Дата создания:** 2025-12-06 13:12 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-006

---

## Описание

Обновить функцию `groupTicketsByStages()` в файле `ticket-grouper.js`, чтобы тикеты с ответственным **1051 "Хранитель объектов"** не попадали в колонки сотрудников. Такие тикеты должны отображаться только в нулевой точке соответствующего этапа.

---

## Контекст

**Текущая логика:**
- Все тикеты с назначенным сотрудником попадают в колонку соответствующего сотрудника
- Тикеты без назначенного сотрудника попадают в нулевую точку

**Новая логика:**
- Тикеты с ответственным 1051 (Хранитель объектов) **НЕ** должны попадать в колонки сотрудников
- Тикеты с ответственным 1051 должны отображаться только в нулевой точке (через функцию `getZeroPointTickets()`)
- **Сотрудник с ID 1051 не должен отображаться в рендере стадий** (не должен быть в списке сотрудников этапа)
- Тикеты с другими ответственными работают как раньше

**Файл для изменения:**
- `vue-app/src/services/dashboard-sector-1c/groupers/ticket-grouper.js`
- Функция: `groupTicketsByStages(tickets, employees)`

---

## Модули и компоненты

### Файл для изменения:

**`vue-app/src/services/dashboard-sector-1c/groupers/ticket-grouper.js`**

**Текущая реализация (фрагмент):**
```javascript
// Распределяем тикеты по этапам и сотрудникам
tickets.forEach(ticket => {
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
```

**Новая реализация (фрагмент):**
```javascript
const KEEPER_OBJECTS_ID = 1051; // ID ответственного "Хранитель объектов"

// Распределяем тикеты по этапам и сотрудникам
tickets.forEach(ticket => {
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
```

---

## Зависимости

### От других задач:
- **TASK-006** — родительская задача
- **TASK-006-01** — должна быть выполнена первой (обновление `getZeroPointTickets()`)

### От модулей:
- `ticket-grouper.js` — файл с функцией
- `stage-mapper.js` — функция `mapStageId()`
- `ticket-mapper.js` — функция `mapTicket()`
- `employee-mapper.js` — функция `mapEmployee()`

---

## Ступенчатые подзадачи

### 1. Добавить константу для ID "Хранитель объектов"

```javascript
const KEEPER_OBJECTS_ID = 1051; // ID ответственного "Хранитель объектов"
```

**Размещение:** В начале функции `groupTicketsByStages()` или в начале файла (если будет использоваться в других функциях)

**Важно:** Использовать ту же константу, что и в `getZeroPointTickets()`, или вынести в общий файл конфигурации

### 2. Исключить сотрудника с ID 1051 из списка сотрудников этапа

**Место добавления:** Перед созданием структуры этапов (после проверки массива employees)

**Код:**
```javascript
// Исключаем сотрудника с ID 1051 (Хранитель объектов) из списка сотрудников
// Он не должен отображаться в колонках, только в нулевой точке
const filteredEmployees = employees.filter(emp => {
  const empId = emp.id ? parseInt(emp.id) : null;
  return empId !== KEEPER_OBJECTS_ID;
});
```

**Использование:** Использовать `filteredEmployees` вместо `employees` при создании структуры этапов

### 3. Добавить проверку на ответственного 1051

**Место добавления:** Перед проверкой `if (employeeId)` в цикле распределения тикетов

**Код:**
```javascript
// Пропускаем тикеты с ответственным 1051 (они попадают в нулевую точку)
if (employeeId === KEEPER_OBJECTS_ID) {
  return; // Пропускаем этот тикет
}
```

### 4. Обновить комментарии

**Добавить комментарий к функции:**
```javascript
/**
 * Группировка тикетов по этапам
 * 
 * Исключает тикеты с ответственным 1051 из колонок сотрудников
 * (такие тикеты попадают в нулевую точку через getZeroPointTickets())
 * 
 * @param {Array} tickets - Массив тикетов из Bitrix24
 * @param {Array} employees - Массив сотрудников
 * @returns {Array} Массив этапов с тикетами
 */
```

---

## Технические детали

### Обработка полей `assignedById`

**Варианты имени поля:**
- `assignedById` (camelCase)
- `ASSIGNED_BY_ID` (UPPER_SNAKE_CASE)
- `assignedByIdId` (в некоторых смарт-процессах)

**Логика обработки:**
```javascript
const assignedById = ticket.assignedById || ticket.ASSIGNED_BY_ID || null;
const employeeId = assignedById ? parseInt(assignedById) : null;
```

### Проверка на ответственного 1051

**Важно:**
- Проверка должна быть строгой (`employeeId === KEEPER_OBJECTS_ID`)
- Проверка должна выполняться до добавления тикета в колонку сотрудника
- Использовать `return` для пропуска тикета (не `continue`, так как это `forEach`, а не `for`)

---

## Критерии приёмки

- [ ] Константа `KEEPER_OBJECTS_ID = 1051` добавлена (или используется общая константа)
- [ ] Сотрудник с ID 1051 исключён из списка сотрудников этапа (фильтрация перед созданием структуры)
- [ ] Проверка на ответственного 1051 добавлена перед распределением по сотрудникам
- [ ] Тикеты с ответственным 1051 не попадают в колонки сотрудников
- [ ] Сотрудник с ID 1051 не отображается в рендере стадий
- [ ] Тикеты с другими ответственными работают как раньше
- [ ] Комментарии к функции обновлены
- [ ] Код обрабатывает оба варианта имени поля (`assignedById` и `ASSIGNED_BY_ID`)
- [ ] Обратная совместимость сохранена
- [ ] Код соответствует стандартам JavaScript/ES6

---

## Тестирование

### Ручное тестирование:

1. **Проверка исключения тикетов с ответственным 1051 из колонок:**
   - Найти тикет с ответственным 1051 в стадии "Сформировано обращение"
   - Открыть дашборд сектора 1С
   - Проверить, что тикет **НЕ** отображается в колонке сотрудника с ID 1051
   - Проверить, что тикет отображается в нулевой точке этапа "Сформировано обращение"
   - **Проверить, что сотрудник с ID 1051 НЕ отображается в рендере стадий** (нет пустой колонки с его именем)

2. **Проверка тикетов с другими ответственными:**
   - Найти тикет с ответственным (не 1051) в стадии "Сформировано обращение"
   - Проверить, что тикет отображается в колонке соответствующего сотрудника
   - Проверить, что тикет **НЕ** отображается в нулевой точке

3. **Проверка тикетов без ответственного:**
   - Найти тикет без ответственного
   - Проверить, что тикет отображается в нулевой точке (как раньше)

### Интеграционное тестирование:

1. Проверить загрузку данных из Bitrix24 REST API
2. Проверить корректность маппинга полей `assignedById` и `ASSIGNED_BY_ID`
3. Проверить работу с кешем (если тикеты кешируются)

---

## Примеры кода

### Полная реализация функции (фрагмент с изменениями):

```javascript
/**
 * Группировка тикетов по этапам
 * 
 * Исключает тикеты с ответственным 1051 из колонок сотрудников
 * (такие тикеты попадают в нулевую точку через getZeroPointTickets())
 * 
 * @param {Array} tickets - Массив тикетов из Bitrix24
 * @param {Array} employees - Массив сотрудников
 * @returns {Array} Массив этапов с тикетами
 */
export function groupTicketsByStages(tickets, employees) {
  const KEEPER_OBJECTS_ID = 1051; // ID ответственного "Хранитель объектов"
  
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
```

---

## История правок

- **2025-12-06 13:12 (UTC+3, Брест):** Создана подзадача TASK-006-02
- **2025-12-06 13:24 (UTC+3, Брест):** Добавлено исключение сотрудника с ID 1051 из списка сотрудников этапа (чтобы он не рендерился в колонках стадий)
- **2025-12-06 13:33 (UTC+3, Брест):** Подзадача успешно завершена

---

**Автор:** Технический писатель  
**Статус:** Завершена ✅

