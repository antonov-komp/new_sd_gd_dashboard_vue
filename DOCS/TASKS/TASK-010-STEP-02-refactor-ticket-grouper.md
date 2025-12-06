# TASK-010-STEP-02: Рефакторинг `ticket-grouper.js` с использованием утилит

**Дата создания:** 2025-12-06 18:30 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Рефактор-менеджер  
**Родительская задача:** TASK-010  
**Связанные задачи:** TASK-006, TASK-010-STEP-01

---

## Описание

Рефакторить файл `ticket-grouper.js`, заменив дублирующуюся логику извлечения `assignedById` на использование утилит из `ticket-utils.js`, созданных в STEP-01.

**Цель:** Упростить код группировки тикетов, используя централизованные утилиты, и улучшить читаемость без нарушения существующей логики.

---

## Контекст

**Текущее состояние:**
- В `ticket-grouper.js` логика извлечения `assignedById` дублируется в нескольких функциях
- Проверка на `KEEPER_OBJECTS_ID` выполняется вручную в разных местах
- Сложная логика проверки полей с множественными вариантами имени поля

**После STEP-01:**
- Созданы утилиты `getAssignedById()`, `parseEmployeeId()`, `isZeroPointTicket()` в `ticket-utils.js`
- Константа `KEEPER_OBJECTS_ID` доступна из утилит

**Цель STEP-02:**
- Заменить всю дублирующуюся логику на использование утилит
- Упростить код функций группировки
- Сохранить существующую функциональность

---

## Модули и компоненты

### Файлы для обновления:

1. **`vue-app/src/services/dashboard-sector-1c/groupers/ticket-grouper.js`**
   - Импортировать утилиты из `ticket-utils.js`
   - Заменить логику извлечения `assignedById` на вызовы утилит
   - Упростить функции `getZeroPointTickets()`, `groupTicketsByStages()`, `extractUniqueEmployeeIds()`

### Зависимости:

- **TASK-010-STEP-01** — должна быть завершена (утилиты созданы)

---

## Зависимости

### От других задач:
- **TASK-010-STEP-01** — должна быть завершена (утилиты `ticket-utils.js` созданы)
- **TASK-006** — должна быть завершена (логика нулевой точки реализована)

### От модулей:
- Использует утилиты из `ticket-utils.js`
- Использует мапперы из `mappers/`

---

## Ступенчатые подзадачи

### 1. Импортировать утилиты из `ticket-utils.js`

**Изменения в начале файла:**
```javascript
// Добавить импорты после существующих импортов
import { 
  getAssignedById, 
  parseEmployeeId, 
  isZeroPointTicket,
  KEEPER_OBJECTS_ID 
} from '../utils/ticket-utils.js';
```

**Важно:** Если константа `KEEPER_OBJECTS_ID` уже определена в `ticket-grouper.js`, её нужно удалить и использовать из утилит.

### 2. Обновить функцию `getZeroPointTickets()`

**Текущий код:**
```javascript
export function getZeroPointTickets(tickets) {
  // ...
  tickets
    .filter(t => {
      const assignedById = t.assignedById || t.ASSIGNED_BY_ID;
      const employeeId = assignedById ? parseInt(assignedById) : null;
      
      return !employeeId || employeeId === KEEPER_OBJECTS_ID;
    })
    // ...
}
```

**Обновлённый код:**
```javascript
export function getZeroPointTickets(tickets) {
  // ...
  tickets
    .filter(t => isZeroPointTicket(t))
    // ...
}
```

**Критерии:**
- [ ] Используется `isZeroPointTicket()` вместо ручной проверки
- [ ] Логика работы не нарушена (тикеты с ответственным 1051 попадают в нулевую точку)
- [ ] Тикеты без ответственного также попадают в нулевую точку

### 3. Обновить функцию `groupTicketsByStages()`

**Текущий код:**
```javascript
export function groupTicketsByStages(tickets, employees) {
  // ...
  tickets.forEach(ticket => {
    // ...
    const assignedById = ticket.assignedById || ticket.ASSIGNED_BY_ID || null;
    const employeeId = assignedById ? parseInt(assignedById) : null;
    
    // Пропускаем тикеты с ответственным 1051
    if (employeeId === KEEPER_OBJECTS_ID) {
      return;
    }
    // ...
  });
}
```

**Обновлённый код:**
```javascript
export function groupTicketsByStages(tickets, employees) {
  // ...
  tickets.forEach(ticket => {
    // ...
    // Пропускаем тикеты нулевой точки (без ответственного или с ответственным 1051)
    if (isZeroPointTicket(ticket)) {
      return;
    }
    
    const assignedById = getAssignedById(ticket);
    const employeeId = parseEmployeeId(assignedById);
    // ...
  });
}
```

**Критерии:**
- [ ] Используется `isZeroPointTicket()` для проверки нулевой точки
- [ ] Используются `getAssignedById()` и `parseEmployeeId()` для извлечения ID
- [ ] Логика работы не нарушена (тикеты с ответственным 1051 исключаются из колонок)

### 4. Обновить функцию `extractUniqueEmployeeIds()`

**Текущий код:**
```javascript
export function extractUniqueEmployeeIds(tickets) {
  // ...
  tickets.forEach(ticket => {
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
  // ...
}
```

**Обновлённый код:**
```javascript
export function extractUniqueEmployeeIds(tickets) {
  // ...
  tickets.forEach(ticket => {
    const assignedById = getAssignedById(ticket);
    const employeeId = parseEmployeeId(assignedById);
    
    if (employeeId) {
      employeeIds.add(employeeId);
    }
  });
  // ...
}
```

**Критерии:**
- [ ] Используются `getAssignedById()` и `parseEmployeeId()` вместо сложной логики
- [ ] Код стал значительно проще и читаемее
- [ ] Логика работы не нарушена (извлекаются все уникальные ID сотрудников)

### 5. Удалить дублирующуюся константу `KEEPER_OBJECTS_ID` (если есть)

**Если константа определена в `ticket-grouper.js`:**
- Удалить определение константы
- Использовать импортированную константу из `ticket-utils.js`

**Критерии:**
- [ ] Константа `KEEPER_OBJECTS_ID` не дублируется
- [ ] Используется импортированная константа из утилит

---

## Технические требования

### Принципы рефакторинга:

1. **Не нарушать логику работы**
   - Все существующие тесты должны проходить
   - Функциональность должна работать идентично

2. **Использовать утилиты везде, где возможно**
   - Заменить всю дублирующуюся логику на вызовы утилит
   - Не оставлять старую логику "на всякий случай"

3. **Улучшать читаемость**
   - Код должен быть понятным и самодокументируемым
   - Комментарии должны объяснять "почему", а не "что"

### Стандарты кода:

- **JavaScript:** ES6+ синтаксис
- **Импорты:** Named imports из утилит
- **Комментарии:** Обновить комментарии, если логика изменилась

---

## Критерии приёмки

- [ ] Импортированы утилиты из `ticket-utils.js`
- [ ] Функция `getZeroPointTickets()` использует `isZeroPointTicket()`
- [ ] Функция `groupTicketsByStages()` использует утилиты для извлечения ID
- [ ] Функция `extractUniqueEmployeeIds()` использует утилиты вместо сложной логики
- [ ] Константа `KEEPER_OBJECTS_ID` не дублируется (используется из утилит)
- [ ] Логика работы не нарушена:
  - [ ] Тикеты с ответственным 1051 попадают в нулевую точку
  - [ ] Тикеты с ответственным 1051 не отображаются в колонках сотрудников
  - [ ] Сотрудник с ID 1051 не отображается в рендере стадий
  - [ ] Тикеты без ответственного работают как раньше
- [ ] Код стал более читаемым
- [ ] Дублирование кода устранено

---

## Тестирование

### Функциональное тестирование:

1. **Проверка логики нулевой точки:**
   - Тикеты с ответственным 1051 попадают в нулевую точку
   - Тикеты с ответственным 1051 не отображаются в колонках сотрудников
   - Сотрудник с ID 1051 не отображается в рендере стадий

2. **Проверка группировки тикетов:**
   - Тикеты корректно распределяются по этапам и сотрудникам
   - Тикеты без ответственного попадают в нулевую точку

3. **Проверка извлечения ID сотрудников:**
   - Из тикетов извлекаются все уникальные ID сотрудников
   - ID сотрудника 1051 не включается в список (если нужно)

### Интеграционное тестирование:

1. Проверить работу дашборда в целом
2. Проверить, что все тикеты отображаются корректно
3. Проверить, что нулевая точка работает как ожидается

---

## Примеры изменений

### До рефакторинга:

```javascript
// Сложная логика извлечения ID
const assignedById = ticket.assignedById || 
                    ticket.assignedByIdId || 
                    ticket.ASSIGNED_BY_ID ||
                    ticket['assignedById'] ||
                    (ticket.assignedById && typeof ticket.assignedById === 'object' && (ticket.assignedById.id || ticket.assignedById.ID)) ||
                    (ticket.assignedById && typeof ticket.assignedById === 'object' && ticket.assignedById.value);

const employeeId = assignedById ? parseInt(assignedById) : null;

if (!employeeId || employeeId === KEEPER_OBJECTS_ID) {
  // Нулевая точка
}
```

### После рефакторинга:

```javascript
// Простая и понятная логика
if (isZeroPointTicket(ticket)) {
  // Нулевая точка
}

const assignedById = getAssignedById(ticket);
const employeeId = parseEmployeeId(assignedById);
```

---

## История правок

- **2025-12-06 18:30 (UTC+3, Брест):** Создана подзадача STEP-02 для рефакторинга `ticket-grouper.js`

---

**Автор:** Технический писатель  
**Статус:** Новая

