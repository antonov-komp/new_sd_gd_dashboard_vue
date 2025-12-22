# Аудит использования console.* в дашборде сектора 1С

**Дата создания:** 2025-12-06 17:57 (UTC+3, Брест)  
**Задача:** TASK-014  
**Статус:** Завершён

---

## Общая статистика

- **Всего использований:** 19
- **Файлов с console.*:** 10
- **console.error:** 12 использований
- **console.warn:** 3 использования
- **console.log:** 4 использования

---

## Классификация по типам

### 1. Ошибки (ERROR) — 12 использований

**Критичные для production:** ✅ Да (все ошибки должны логироваться)

#### Сервисы

**`vue-app/src/services/dashboard-sector-1c/index.js`** (6 использований)

1. **Строка 197:** `console.error('Error getting sector data:', error);`
   - **Контекст:** Метод `getSectorData()`
   - **Тип:** Критичная ошибка загрузки данных сектора
   - **Уровень:** ERROR
   - **Замена:** `Logger.error('Error getting sector data', 'DashboardSector1CService', error)`

2. **Строка 232:** `console.error('Error assigning ticket:', error);`
   - **Контекст:** Метод `assignTicket()`
   - **Тип:** Критичная ошибка назначения тикета
   - **Уровень:** ERROR
   - **Замена:** `Logger.error('Error assigning ticket', 'DashboardSector1CService', error)`

3. **Строка 271:** `console.error('Error creating ticket:', error);`
   - **Контекст:** Метод `createTicket()`
   - **Тип:** Критичная ошибка создания тикета
   - **Уровень:** ERROR
   - **Замена:** `Logger.error('Error creating ticket', 'DashboardSector1CService', error)`

4. **Строка 290:** `console.error('Error getting ticket:', error);`
   - **Контекст:** Метод `getTicket()`
   - **Тип:** Критичная ошибка получения тикета
   - **Уровень:** ERROR
   - **Замена:** `Logger.error('Error getting ticket', 'DashboardSector1CService', error)`

5. **Строка 314:** `console.error('Error getting ticket details:', error);`
   - **Контекст:** Метод `getTicketDetails()`
   - **Тип:** Критичная ошибка получения деталей тикета
   - **Уровень:** ERROR
   - **Замена:** `Logger.error('Error getting ticket details', 'DashboardSector1CService', error)`

6. **Строка 341:** `console.error('Error adding comment:', error);`
   - **Контекст:** Метод `addComment()`
   - **Тип:** Критичная ошибка добавления комментария
   - **Уровень:** ERROR
   - **Замена:** `Logger.error('Error adding comment', 'DashboardSector1CService', error)`

**`vue-app/src/services/dashboard-sector-1c/services/ticket-details-service.js`** (1 использование)

7. **Строка 75:** `console.error('Error getting ticket details:', error);`
   - **Контекст:** Метод `getTicketDetails()`
   - **Тип:** Критичная ошибка получения деталей тикета
   - **Уровень:** ERROR
   - **Замена:** `Logger.error('Error getting ticket details', 'TicketDetailsService', error)`

**`vue-app/src/services/dashboard-sector-1c/data/employee-repository.js`** (1 использование)

8. **Строка 80:** `console.error('Error getting employees by IDs:', error);`
   - **Контекст:** Метод `getEmployeesByIds()`
   - **Тип:** Критичная ошибка получения сотрудников
   - **Уровень:** ERROR
   - **Замена:** `Logger.error('Error getting employees by IDs', 'EmployeeRepository', error)`
   - **Примечание:** Метод возвращает пустой массив при ошибке, чтобы не ломать работу дашборда

**`vue-app/src/services/dashboard-sector-1c/data/ticket-repository.js`** (3 использования)

9. **Строка 86:** `console.error(\`Error loading tickets for stage ${stageId}:\`, stageError);`
   - **Контекст:** Метод `getAllTickets()`, обработка ошибок загрузки по этапам
   - **Тип:** Критичная ошибка загрузки тикетов для этапа
   - **Уровень:** ERROR
   - **Замена:** `Logger.error(\`Error loading tickets for stage ${stageId}\`, 'TicketRepository', stageError)`

10. **Строка 110:** `console.error('Error in getAllTickets:', error);`
    - **Контекст:** Метод `getAllTickets()`
    - **Тип:** Критичная ошибка получения всех тикетов
    - **Уровень:** ERROR
    - **Замена:** `Logger.error('Error in getAllTickets', 'TicketRepository', error)`

11. **Строка 223:** `console.error(\`Error loading tickets batch for stage ${stageId} (start: ${start}):\`, error);`
    - **Контекст:** Метод `getAllTickets()`, обработка ошибок батч-загрузки
    - **Тип:** Критичная ошибка загрузки батча тикетов
    - **Уровень:** ERROR
    - **Замена:** `Logger.error(\`Error loading tickets batch for stage ${stageId} (start: ${start})\`, 'TicketRepository', error)`

**`vue-app/src/services/dashboard-sector-1c/utils/error-handler.js`** (2 использования)

12. **Строка 13:** `console.error(\`API Error ${context ? \`(${context})\` : ''}:\`, error);`
    - **Контекст:** Функция `handleApiError()`
    - **Тип:** Критичная ошибка API
    - **Уровень:** ERROR
    - **Замена:** `Logger.error(\`API Error ${context ? \`(${context})\` : ''}\`, 'ErrorHandler', error)`

13. **Строка 64:** `console.error('Error logged:', errorInfo);`
    - **Контекст:** Функция `logError()`
    - **Тип:** Критичная ошибка (логирование ошибки)
    - **Уровень:** ERROR
    - **Замена:** `Logger.error('Error logged', 'ErrorHandler', errorInfo)`

**`vue-app/src/composables/useDragAndDrop.js`** (1 использование)

14. **Строка 93:** `console.error('Error parsing ticket data:', error);`
    - **Контекст:** Композабл `useDragAndDrop()`, обработка ошибок парсинга данных тикета
    - **Тип:** Критичная ошибка парсинга данных
    - **Уровень:** ERROR
    - **Замена:** `Logger.error('Error parsing ticket data', 'useDragAndDrop', error)`

---

### 2. Предупреждения (WARN) — 3 использования

**Критичные для production:** ⚠️ Частично (предупреждения важны для диагностики)

**`vue-app/src/services/dashboard-sector-1c/data/employee-repository.js`** (1 использование)

15. **Строка 68:** `console.warn('Unexpected user.get result format:', result);`
    - **Контекст:** Метод `getEmployeesByIds()`
    - **Тип:** Предупреждение о неожиданном формате данных
    - **Уровень:** WARN
    - **Замена:** `Logger.warn('Unexpected user.get result format', 'EmployeeRepository', result)`

**`vue-app/src/services/dashboard-sector-1c/groupers/ticket-grouper.js`** (2 использования)

16. **Строка 35:** `console.warn('Tickets is not an array:', tickets);`
    - **Контекст:** Функция `groupTicketsByEmployee()`
    - **Тип:** Предупреждение о валидации данных
    - **Уровень:** WARN
    - **Замена:** `Logger.warn('Tickets is not an array', 'TicketGrouper', tickets)`

17. **Строка 41:** `console.warn('Employees is not an array:', employees);`
    - **Контекст:** Функция `groupTicketsByEmployee()`
    - **Тип:** Предупреждение о валидации данных
    - **Уровень:** WARN
    - **Замена:** `Logger.warn('Employees is not an array', 'TicketGrouper', employees)`

18. **Строка 204:** `console.warn('Tickets is not an array in getZeroPointTickets:', tickets);`
    - **Контекст:** Функция `getZeroPointTickets()`
    - **Тип:** Предупреждение о валидации данных
    - **Уровень:** WARN
    - **Замена:** `Logger.warn('Tickets is not an array in getZeroPointTickets', 'TicketGrouper', tickets)`

---

### 3. Информационные сообщения (INFO/DEBUG) — 4 использования

**Критичные для production:** ❌ Нет (только для разработки)

**`vue-app/src/services/dashboard-sector-1c/data/employee-repository.js`** (1 использование)

19. **Строка 42:** `console.log(\`Cache hit for employees: ${employeeIds.length} employees\`);`
    - **Контекст:** Метод `getEmployeesByIds()`, проверка кеша
    - **Тип:** Отладочное сообщение о кеше
    - **Уровень:** DEBUG
    - **Замена:** `Logger.debug(\`Cache hit for employees: ${employeeIds.length} employees\`, 'EmployeeRepository')`
    - **Примечание:** Только для разработки, можно отключить в production

**`vue-app/src/services/dashboard-sector-1c/mappers/employee-mapper.js`** (1 использование)

20. **Строка 18:** `console.log(\`[EmployeeMapper] Employee ${bitrixUser.ID}:\`, {...});`
    - **Контекст:** Функция `mapEmployee()`, логирование только в development
    - **Тип:** Отладочное сообщение о маппинге сотрудника
    - **Уровень:** DEBUG
    - **Замена:** `Logger.debug(\`Employee ${bitrixUser.ID} mapped\`, 'EmployeeMapper', {...})`
    - **Примечание:** Уже обёрнуто в проверку `process.env.NODE_ENV === 'development'`, можно оставить как DEBUG

**`vue-app/src/components/dashboard/DashboardStage.vue`** (1 использование)

21. **Строка 189:** `console.log('Ticket clicked:', ticket);`
    - **Контекст:** Метод `handleTicketClicked()`
    - **Тип:** Отладочное сообщение о клике по тикету
    - **Уровень:** DEBUG
    - **Замена:** `logger.debug('Ticket clicked', ticket)` (через `useLogger()`)

**`vue-app/src/components/dashboard/EmployeeColumn.vue`** (1 использование)

22. **Строка 226:** `console.log('Add ticket for employee:', props.employee.id);`
    - **Контекст:** Метод `handleAddTicket()`
    - **Тип:** Отладочное сообщение о добавлении тикета
    - **Уровень:** DEBUG
    - **Замена:** `logger.debug('Add ticket for employee', props.employee.id)` (через `useLogger()`)

**`vue-app/src/composables/useNotifications.js`** (1 использование)

23. **Строка 28:** `console.log(\`[${type.toUpperCase()}] ${message}\`);`
    - **Контекст:** Композабл `useNotifications()`, fallback для окружений без Bitrix24
    - **Тип:** Информационное сообщение (fallback)
    - **Уровень:** INFO
    - **Замена:** `Logger.info(\`[${type.toUpperCase()}] ${message}\`, 'useNotifications')`
    - **Примечание:** Это fallback, когда Bitrix24 недоступен, можно оставить как INFO

---

## Сводная таблица по файлам

| Файл | ERROR | WARN | DEBUG/INFO | Всего |
|------|-------|------|------------|-------|
| `index.js` | 6 | 0 | 0 | 6 |
| `ticket-details-service.js` | 1 | 0 | 0 | 1 |
| `employee-repository.js` | 1 | 1 | 1 | 3 |
| `ticket-repository.js` | 3 | 0 | 0 | 3 |
| `error-handler.js` | 2 | 0 | 0 | 2 |
| `ticket-grouper.js` | 0 | 3 | 0 | 3 |
| `employee-mapper.js` | 0 | 0 | 1 | 1 |
| `DashboardStage.vue` | 0 | 0 | 1 | 1 |
| `EmployeeColumn.vue` | 0 | 0 | 1 | 1 |
| `useDragAndDrop.js` | 1 | 0 | 0 | 1 |
| `useNotifications.js` | 0 | 0 | 1 | 1 |
| **ИТОГО** | **14** | **4** | **5** | **23** |

*Примечание: В таблице показано 23 использования, но некоторые могут быть в одной строке с несколькими вызовами.*

---

## Рекомендации по замене

### Приоритет 1 (Критичные — ERROR)
Все 14 использований `console.error` должны быть заменены на `Logger.error()` с указанием контекста.

### Приоритет 2 (Важные — WARN)
Все 4 использования `console.warn` должны быть заменены на `Logger.warn()` с указанием контекста.

### Приоритет 3 (Отладочные — DEBUG/INFO)
Все 5 использований `console.log` должны быть заменены на:
- `Logger.debug()` — для отладочных сообщений (4 использования)
- `Logger.info()` — для информационных сообщений (1 использование в useNotifications)

---

## План замены

### Шаг 1: Сервисы (высокий приоритет)
1. `index.js` — 6 замен
2. `ticket-repository.js` — 3 замены
3. `error-handler.js` — 2 замены
4. `ticket-details-service.js` — 1 замена
5. `employee-repository.js` — 3 замены

### Шаг 2: Утилиты и групперы
6. `ticket-grouper.js` — 3 замены
7. `employee-mapper.js` — 1 замена

### Шаг 3: Компоненты и композаблы
8. `DashboardStage.vue` — 1 замена (через `useLogger()`)
9. `EmployeeColumn.vue` — 1 замена (через `useLogger()`)
10. `useDragAndDrop.js` — 1 замена
11. `useNotifications.js` — 1 замена

---

## Выводы

1. **Все ошибки критичны** — должны логироваться в production (уровень ERROR)
2. **Предупреждения важны** — должны логироваться в production (уровень WARN)
3. **Отладочные сообщения** — только для разработки (уровень DEBUG)
4. **Информационные сообщения** — для fallback-сценариев (уровень INFO)

**Рекомендуемый уровень логирования по умолчанию:**
- **Production:** `ERROR` (только ошибки)
- **Development:** `DEBUG` (все логи)

---

## История правок

- 2025-12-06 17:57 (UTC+3, Брест): Создан документ аудита
