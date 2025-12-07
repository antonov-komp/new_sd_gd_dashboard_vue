# TASK-006-01: Обновление функции `getZeroPointTickets()` для включения тикетов с ответственным 1051

**Дата создания:** 2025-12-06 13:12 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-006

---

## Описание

Обновить функцию `getZeroPointTickets()` в файле `ticket-grouper.js`, чтобы она включала в нулевую точку не только тикеты без назначенного сотрудника, но и тикеты с ответственным **1051 "Хранитель объектов"**.

---

## Контекст

**Текущая логика:**
- Нулевая точка содержит только тикеты без назначенного сотрудника (`assignedById === null`)

**Новая логика:**
- Нулевая точка содержит:
  1. Тикеты без назначенного сотрудника (`assignedById === null`)
  2. Тикеты с ответственным 1051 (Хранитель объектов) (`assignedById === 1051`)

**Файл для изменения:**
- `vue-app/src/services/dashboard-sector-1c/groupers/ticket-grouper.js`
- Функция: `getZeroPointTickets(tickets)`

---

## Модули и компоненты

### Файл для изменения:

**`vue-app/src/services/dashboard-sector-1c/groupers/ticket-grouper.js`**

**Текущая реализация:**
```javascript
export function getZeroPointTickets(tickets) {
  const zeroPointTickets = {
    formed: [],
    review: [],
    execution: []
  };

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
```

**Новая реализация:**
```javascript
export function getZeroPointTickets(tickets) {
  const KEEPER_OBJECTS_ID = 1051; // ID ответственного "Хранитель объектов"
  
  const zeroPointTickets = {
    formed: [],
    review: [],
    execution: []
  };

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
```

---

## Зависимости

### От других задач:
- **TASK-006** — родительская задача

### От модулей:
- `ticket-grouper.js` — файл с функцией
- `stage-mapper.js` — функция `mapStageId()`
- `ticket-mapper.js` — функция `mapTicket()`

---

## Ступенчатые подзадачи

### 1. Добавить константу для ID "Хранитель объектов"

```javascript
const KEEPER_OBJECTS_ID = 1051; // ID ответственного "Хранитель объектов"
```

**Размещение:** В начале функции `getZeroPointTickets()` или в начале файла (если будет использоваться в других функциях)

### 2. Обновить фильтр тикетов

**Текущий фильтр:**
```javascript
.filter(t => !(t.assignedById || t.ASSIGNED_BY_ID))
```

**Новый фильтр:**
```javascript
.filter(t => {
  const assignedById = t.assignedById || t.ASSIGNED_BY_ID;
  const employeeId = assignedById ? parseInt(assignedById) : null;
  
  // Попадают в нулевую точку:
  // 1. Тикеты без ответственного (employeeId === null)
  // 2. Тикеты с ответственным 1051 (Хранитель объектов)
  return !employeeId || employeeId === KEEPER_OBJECTS_ID;
})
```

### 3. Обновить комментарии

**Добавить комментарий к функции:**
```javascript
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
const assignedById = t.assignedById || t.ASSIGNED_BY_ID;
const employeeId = assignedById ? parseInt(assignedById) : null;
```

### Проверка на null и undefined

**Важно:**
- `!employeeId` проверяет и `null`, и `undefined`, и `0`
- `parseInt()` может вернуть `NaN`, поэтому проверяем `employeeId === KEEPER_OBJECTS_ID` только если `employeeId` не `null`

---

## Критерии приёмки

- [ ] Константа `KEEPER_OBJECTS_ID = 1051` добавлена
- [ ] Фильтр обновлён для включения тикетов с ответственным 1051
- [ ] Комментарии к функции обновлены
- [ ] Код обрабатывает оба варианта имени поля (`assignedById` и `ASSIGNED_BY_ID`)
- [ ] Код корректно обрабатывает `null`, `undefined` и числовые значения
- [ ] Функция возвращает корректную структуру данных
- [ ] Обратная совместимость сохранена (тикеты без ответственного работают как раньше)
- [ ] Код соответствует стандартам JavaScript/ES6

---

## Тестирование

### Юнит-тесты (если есть):

1. **Тест: тикеты без ответственного попадают в нулевую точку**
   ```javascript
   const tickets = [
     { id: 1, stageId: 'DT140_12:UC_0VHWE2', assignedById: null },
     { id: 2, stageId: 'DT140_12:UC_0VHWE2', ASSIGNED_BY_ID: null }
   ];
   const result = getZeroPointTickets(tickets);
   expect(result.formed.length).toBe(2);
   ```

2. **Тест: тикеты с ответственным 1051 попадают в нулевую точку**
   ```javascript
   const tickets = [
     { id: 1, stageId: 'DT140_12:UC_0VHWE2', assignedById: 1051 },
     { id: 2, stageId: 'DT140_12:UC_0VHWE2', ASSIGNED_BY_ID: 1051 }
   ];
   const result = getZeroPointTickets(tickets);
   expect(result.formed.length).toBe(2);
   ```

3. **Тест: тикеты с другими ответственными НЕ попадают в нулевую точку**
   ```javascript
   const tickets = [
     { id: 1, stageId: 'DT140_12:UC_0VHWE2', assignedById: 10 },
     { id: 2, stageId: 'DT140_12:UC_0VHWE2', ASSIGNED_BY_ID: 20 }
   ];
   const result = getZeroPointTickets(tickets);
   expect(result.formed.length).toBe(0);
   ```

### Ручное тестирование:

1. Открыть дашборд сектора 1С
2. Найти тикет с ответственным 1051 в стадии "Сформировано обращение"
3. Проверить, что тикет отображается в нулевой точке этапа "Сформировано обращение"
4. Проверить, что тикеты без ответственного также отображаются в нулевой точке

---

## Примеры кода

### Полная реализация функции:

```javascript
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
  const KEEPER_OBJECTS_ID = 1051; // ID ответственного "Хранитель объектов"
  
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
```

---

## История правок

- **2025-12-06 13:12 (UTC+3, Брест):** Создана подзадача TASK-006-01
- **2025-12-06 13:33 (UTC+3, Брест):** Подзадача успешно завершена

---

**Автор:** Технический писатель  
**Статус:** Завершена ✅

