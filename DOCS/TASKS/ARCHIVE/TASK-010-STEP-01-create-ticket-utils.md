# TASK-010-STEP-01: Создание утилиты для работы с полем `assignedById`

**Дата создания:** 2025-12-06 18:30 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Vue.js Программист  
**Родительская задача:** TASK-010  
**Связанные задачи:** TASK-006, TASK-007

---

## Описание

Создать утилиту для работы с полем `assignedById` тикетов, чтобы устранить дублирование логики извлечения ID ответственного сотрудника из тикетов в разных местах кода.

**Цель:** Централизовать логику работы с полем `assignedById` в одном месте для упрощения поддержки и устранения дублирования кода.

---

## Контекст

**Проблема:**
В текущем коде логика извлечения `assignedById` из тикетов дублируется в нескольких местах:
- `ticket-grouper.js` — в функциях `groupTicketsByStages()` и `getZeroPointTickets()`
- `ticket-grouper.js` — в функции `extractUniqueEmployeeIds()` с множественными вариантами имени поля
- Отсутствует единая утилита для работы с полем `assignedById`

**Текущая логика:**
```javascript
// В разных местах используется разная логика:
const assignedById = ticket.assignedById || ticket.ASSIGNED_BY_ID || null;
const employeeId = assignedById ? parseInt(assignedById) : null;

// Или более сложная версия:
const assignedById = ticket.assignedById || 
                    ticket.assignedByIdId || 
                    ticket.ASSIGNED_BY_ID ||
                    ticket['assignedById'] ||
                    (ticket.assignedById && typeof ticket.assignedById === 'object' && (ticket.assignedById.id || ticket.assignedById.ID)) ||
                    (ticket.assignedById && typeof ticket.assignedById === 'object' && ticket.assignedById.value);
```

**Решение:**
Создать единую утилиту `ticket-utils.js` с функциями для работы с полем `assignedById`.

---

## Модули и компоненты

### Новый файл для создания:

1. **`vue-app/src/services/dashboard-sector-1c/utils/ticket-utils.js`**
   - Утилита для извлечения `assignedById` из тикета
   - Утилита для парсинга ID сотрудника
   - Утилита для проверки, является ли тикет нулевой точкой

### Файлы для обновления (в следующих шагах):

- `vue-app/src/services/dashboard-sector-1c/groupers/ticket-grouper.js` — будет обновлён в STEP-02

---

## Зависимости

### От других задач:
- **TASK-006** — должна быть завершена (логика нулевой точки реализована)
- **TASK-007** — должна быть завершена (прелоадер реализован)

### От модулей:
- Использует константу `KEEPER_OBJECTS_ID` из `ticket-grouper.js` (или можно вынести в отдельный файл констант)

---

## Ступенчатые подзадачи

### 1. Создать файл `ticket-utils.js`

**Расположение:** `vue-app/src/services/dashboard-sector-1c/utils/ticket-utils.js`

**Структура файла:**
```javascript
/**
 * Утилиты для работы с тикетами
 * 
 * Централизованная логика для работы с полями тикетов,
 * особенно для извлечения ID ответственного сотрудника
 */

/**
 * Константа ID ответственного "Хранитель объектов"
 * 
 * Тикеты с этим ответственным попадают в нулевую точку
 */
export const KEEPER_OBJECTS_ID = 1051;

/**
 * Извлечение ID ответственного сотрудника из тикета
 * 
 * Поддерживает различные варианты имени поля:
 * - assignedById (camelCase)
 * - ASSIGNED_BY_ID (UPPER_CASE)
 * - assignedByIdId (альтернативное имя)
 * - Объект с полями id/ID/value
 * 
 * @param {object} ticket - Тикет из Bitrix24
 * @returns {string|number|null} ID ответственного или null
 * 
 * @example
 * const ticket = { assignedById: 123 };
 * const id = getAssignedById(ticket); // 123
 * 
 * @example
 * const ticket = { ASSIGNED_BY_ID: '456' };
 * const id = getAssignedById(ticket); // '456'
 * 
 * @example
 * const ticket = { assignedById: { id: 789 } };
 * const id = getAssignedById(ticket); // 789
 */
export function getAssignedById(ticket) {
  // Реализация
}

/**
 * Парсинг ID сотрудника из значения assignedById
 * 
 * Преобразует значение в число, если возможно.
 * Обрабатывает строки, числа и объекты.
 * 
 * @param {string|number|object|null} assignedById - Значение поля assignedById
 * @returns {number|null} ID сотрудника как число или null
 * 
 * @example
 * parseEmployeeId(123); // 123
 * parseEmployeeId('456'); // 456
 * parseEmployeeId({ id: 789 }); // 789
 * parseEmployeeId(null); // null
 * parseEmployeeId('invalid'); // null
 */
export function parseEmployeeId(assignedById) {
  // Реализация
}

/**
 * Проверка, является ли тикет нулевой точкой
 * 
 * Нулевая точка включает:
 * - Тикеты без назначенного сотрудника (assignedById === null)
 * - Тикеты с ответственным KEEPER_OBJECTS_ID (Хранитель объектов)
 * 
 * @param {object} ticket - Тикет из Bitrix24
 * @param {number} keeperId - ID хранителя объектов (по умолчанию KEEPER_OBJECTS_ID)
 * @returns {boolean} true, если тикет является нулевой точкой
 * 
 * @example
 * const ticket1 = { assignedById: null };
 * isZeroPointTicket(ticket1); // true
 * 
 * @example
 * const ticket2 = { assignedById: 1051 };
 * isZeroPointTicket(ticket2); // true
 * 
 * @example
 * const ticket3 = { assignedById: 123 };
 * isZeroPointTicket(ticket3); // false
 */
export function isZeroPointTicket(ticket, keeperId = KEEPER_OBJECTS_ID) {
  // Реализация
}
```

### 2. Реализовать функцию `getAssignedById()`

**Логика:**
1. Проверять различные варианты имени поля (assignedById, ASSIGNED_BY_ID, assignedByIdId)
2. Обрабатывать случай, когда значение — объект с полями id/ID/value
3. Возвращать значение или null

**Пример реализации:**
```javascript
export function getAssignedById(ticket) {
  if (!ticket || typeof ticket !== 'object') {
    return null;
  }
  
  // Пробуем разные варианты имени поля
  let assignedById = ticket.assignedById || 
                     ticket.ASSIGNED_BY_ID || 
                     ticket.assignedByIdId ||
                     ticket['assignedById'];
  
  // Если значение — объект, извлекаем id/ID/value
  if (assignedById && typeof assignedById === 'object') {
    assignedById = assignedById.id || assignedById.ID || assignedById.value || null;
  }
  
  return assignedById || null;
}
```

### 3. Реализовать функцию `parseEmployeeId()`

**Логика:**
1. Если значение — число, возвращать его
2. Если значение — строка, пытаться преобразовать в число
3. Если значение — объект, извлекать id/ID/value и парсить
4. Если значение null/undefined или невалидное, возвращать null
5. Проверять, что результат — положительное число

**Пример реализации:**
```javascript
export function parseEmployeeId(assignedById) {
  if (assignedById === null || assignedById === undefined) {
    return null;
  }
  
  // Если это объект, извлекаем значение
  if (typeof assignedById === 'object') {
    assignedById = assignedById.id || assignedById.ID || assignedById.value || null;
  }
  
  // Парсим в число
  const employeeId = typeof assignedById === 'number' 
    ? assignedById 
    : parseInt(assignedById);
  
  // Проверяем валидность
  if (isNaN(employeeId) || employeeId <= 0) {
    return null;
  }
  
  return employeeId;
}
```

### 4. Реализовать функцию `isZeroPointTicket()`

**Логика:**
1. Использовать `getAssignedById()` для извлечения ID
2. Использовать `parseEmployeeId()` для парсинга ID
3. Проверять, что ID === null или ID === keeperId

**Пример реализации:**
```javascript
export function isZeroPointTicket(ticket, keeperId = KEEPER_OBJECTS_ID) {
  const assignedById = getAssignedById(ticket);
  const employeeId = parseEmployeeId(assignedById);
  
  // Нулевая точка: нет ответственного ИЛИ ответственный — хранитель объектов
  return employeeId === null || employeeId === keeperId;
}
```

---

## Технические требования

### Принципы реализации:

1. **Единая точка истины**
   - Вся логика работы с `assignedById` в одном месте
   - Изменения в логике требуют правки только в утилите

2. **Обратная совместимость**
   - Поддержка всех существующих вариантов имени поля
   - Поддержка различных типов данных (строка, число, объект)

3. **Валидация данных**
   - Проверка типов входных данных
   - Обработка edge cases (null, undefined, невалидные значения)

4. **Документация**
   - JSDoc комментарии для всех функций
   - Примеры использования в комментариях

### Стандарты кода:

- **JavaScript:** ES6+ синтаксис
- **Комментарии:** JSDoc для функций и типов
- **Именование:** camelCase для функций, UPPER_CASE для констант
- **Экспорт:** Named exports для всех функций

---

## Критерии приёмки

- [ ] Файл `ticket-utils.js` создан в правильной директории
- [ ] Функция `getAssignedById()` реализована и поддерживает все варианты имени поля
- [ ] Функция `parseEmployeeId()` реализована и корректно парсит различные типы данных
- [ ] Функция `isZeroPointTicket()` реализована и использует другие утилиты
- [ ] Константа `KEEPER_OBJECTS_ID` экспортирована (или импортирована из ticket-grouper.js)
- [ ] Все функции имеют JSDoc комментарии с примерами
- [ ] Функции протестированы вручную:
  - [ ] `getAssignedById()` с различными вариантами поля
  - [ ] `parseEmployeeId()` с различными типами данных
  - [ ] `isZeroPointTicket()` с тикетами без ответственного и с ответственным 1051
- [ ] Логика работы соответствует существующей (не нарушена)

---

## Тестирование

### Ручное тестирование функций:

1. **Тест `getAssignedById()`:**
   ```javascript
   // Тест 1: camelCase
   const ticket1 = { assignedById: 123 };
   console.assert(getAssignedById(ticket1) === 123);
   
   // Тест 2: UPPER_CASE
   const ticket2 = { ASSIGNED_BY_ID: '456' };
   console.assert(getAssignedById(ticket2) === '456');
   
   // Тест 3: Объект
   const ticket3 = { assignedById: { id: 789 } };
   console.assert(getAssignedById(ticket3) === 789);
   
   // Тест 4: null
   const ticket4 = { assignedById: null };
   console.assert(getAssignedById(ticket4) === null);
   
   // Тест 5: отсутствие поля
   const ticket5 = {};
   console.assert(getAssignedById(ticket5) === null);
   ```

2. **Тест `parseEmployeeId()`:**
   ```javascript
   // Тест 1: число
   console.assert(parseEmployeeId(123) === 123);
   
   // Тест 2: строка-число
   console.assert(parseEmployeeId('456') === 456);
   
   // Тест 3: объект
   console.assert(parseEmployeeId({ id: 789 }) === 789);
   
   // Тест 4: null
   console.assert(parseEmployeeId(null) === null);
   
   // Тест 5: невалидная строка
   console.assert(parseEmployeeId('invalid') === null);
   
   // Тест 6: отрицательное число
   console.assert(parseEmployeeId(-1) === null);
   ```

3. **Тест `isZeroPointTicket()`:**
   ```javascript
   // Тест 1: без ответственного
   const ticket1 = { assignedById: null };
   console.assert(isZeroPointTicket(ticket1) === true);
   
   // Тест 2: с ответственным 1051
   const ticket2 = { assignedById: 1051 };
   console.assert(isZeroPointTicket(ticket2) === true);
   
   // Тест 3: с другим ответственным
   const ticket3 = { assignedById: 123 };
   console.assert(isZeroPointTicket(ticket3) === false);
   
   // Тест 4: отсутствие поля
   const ticket4 = {};
   console.assert(isZeroPointTicket(ticket4) === true);
   ```

---

## Примеры использования

### Пример 1: Использование в группировке тикетов

```javascript
import { getAssignedById, parseEmployeeId, isZeroPointTicket } from '../utils/ticket-utils.js';

// Вместо:
const assignedById = ticket.assignedById || ticket.ASSIGNED_BY_ID || null;
const employeeId = assignedById ? parseInt(assignedById) : null;

// Используем:
const assignedById = getAssignedById(ticket);
const employeeId = parseEmployeeId(assignedById);
```

### Пример 2: Проверка нулевой точки

```javascript
import { isZeroPointTicket } from '../utils/ticket-utils.js';

// Вместо:
const assignedById = ticket.assignedById || ticket.ASSIGNED_BY_ID;
const employeeId = assignedById ? parseInt(assignedById) : null;
if (!employeeId || employeeId === KEEPER_OBJECTS_ID) {
  // Нулевая точка
}

// Используем:
if (isZeroPointTicket(ticket)) {
  // Нулевая точка
}
```

---

## История правок

- **2025-12-06 18:30 (UTC+3, Брест):** Создана подзадача STEP-01 для создания утилиты `ticket-utils.js`
- **2025-12-06 19:15 (UTC+3, Брест):** Выполнено создание утилиты:
  - Создан файл `ticket-utils.js` с константой `KEEPER_OBJECTS_ID`
  - Реализована функция `getAssignedById()` с поддержкой всех вариантов имени поля
  - Реализована функция `parseEmployeeId()` для парсинга ID в число
  - Реализована функция `isZeroPointTicket()` для проверки нулевой точки
  - Все функции имеют JSDoc комментарии с примерами
  - Логика работы соответствует существующей (не нарушена)

---

**Автор:** Технический писатель  
**Статус:** Завершена

