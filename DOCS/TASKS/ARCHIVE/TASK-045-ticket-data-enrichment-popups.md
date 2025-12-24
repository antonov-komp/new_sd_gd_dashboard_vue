# TASK-045: Обогащение данных тикетов в попапах модуля «График приёма и закрытий сектора 1С»

**Дата создания:** 2025-12-16 18:30 (UTC+3, Брест)  
**Статус:** В работе  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачами:** TASK-042, TASK-043

## Этапы реализации

Задача разделена на последовательные этапы:

1. **[TASK-045-01](TASK-045-01-responsible-modal-enrichment.md)** — Обогащение данных тикетов в ResponsibleModal.vue
2. **[TASK-045-02](TASK-045-02-stages-modal-enrichment.md)** — Обогащение данных тикетов в StagesModal.vue
3. **[TASK-045-03](TASK-045-03-testing-and-verification.md)** — Тестирование и проверка обогащения данных

**Порядок выполнения:** Этапы должны выполняться последовательно, так как каждый этап зависит от предыдущего.

## Цель

Обеспечить полное обогащение данных тикетов в попапах модуля «График приёма и закрытий сектора 1С» (`ResponsibleModal` и `StagesModal`), чтобы тикеты отображались с той же полнотой информации, что и в попапах модуля «График состояния сектора 1С» (`EmployeeDetailsModal`).

## Контекст

### Текущее состояние

**Модуль «График состояния сектора 1С» (работает корректно):**
- Компонент: `EmployeeDetailsModal.vue`
- Использует функцию `prepareTicketsForDisplay()` из `ticketListUtils.js`
- Функция автоматически:
  - Определяет, какие тикеты нуждаются в дополнительных данных
  - Загружает недостающие данные через `TicketDetailsService.getTicketsDetails()`
  - Объединяет данные из snapshot и загруженных деталей
  - Подготавливает полные объекты тикетов с:
    - `ufSubject` (полное название)
    - `departmentHead` и `departmentHeadFull` (отдел заказчика)
    - `actionStr` (действие)
    - `description` (описание)
    - Правильными приоритетами и сервисами с цветами
    - Всеми необходимыми полями для `TicketCard.vue`

**Модуль «График приёма и закрытий сектора 1С» (проблема):**
- Компоненты: `ResponsibleModal.vue` и `StagesModal.vue`
- Тикеты подготавливаются вручную с минимальными полями:
  ```javascript
  // ResponsibleModal.vue (строки 263-281)
  tickets.value = employeeTickets.map(ticket => ({
    id: ticket.id,
    title: ticket.title || 'Без названия',
    ufSubject: ticket.title || 'Без названия',
    createdTime: ticket.createdTime,
    createdAt: ticket.createdTime,
    updatedTime: ticket.movedTime,
    modifiedAt: ticket.movedTime,
    stageId: ticket.stageId,
    assignedById: ticket.assignedById,
    priorityId: 'medium',
    priorityLabel: 'Средний',
    priorityColors: {
      color: '#ffc107',
      backgroundColor: '#fff3cd',
      textColor: '#856404'
    },
    priority: 'medium'
  }));
  ```

- **Проблема:** Тикеты не получают полную информацию:
  - ❌ Нет `departmentHead` (отдел заказчика)
  - ❌ Нет `ufSubject` (используется только `title`)
  - ❌ Нет `actionStr` (действие)
  - ❌ Нет `description` (описание)
  - ❌ Приоритеты и сервисы всегда "medium" (не загружаются из API)
  - ❌ Нет правильных цветов для приоритетов и сервисов
  - ❌ Отсутствуют другие поля, необходимые для полноценного отображения в `TicketCard.vue`

### Аналогичная реализация

В модуле «График состояния сектора 1С» используется:
```javascript
// EmployeeDetailsModal.vue (строки 1487-1494)
const { prepareTicketsForDisplay } = await import('@/utils/graph-state/ticketListUtils.js');
preparedTickets = await prepareTicketsForDisplay(
  filteredTickets,
  context.snapshot,
  context.ticketDetails
);
```

**Функция `prepareTicketsForDisplay()`:**
- Файл: `vue-app/src/utils/graph-state/ticketListUtils.js`
- Определяет тикеты, которым нужны дополнительные данные
- Загружает их через `TicketDetailsService.getTicketsDetails()`
- Объединяет данные и подготавливает полные объекты тикетов

## Анализ проблемы

### Сравнение подготовки тикетов

**Модуль «График состояния» (правильно):**
```javascript
// Использует prepareTicketsForDisplay()
const preparedTickets = await prepareTicketsForDisplay(
  tickets,
  snapshot,
  ticketDetails
);
// Результат: полные объекты тикетов со всеми полями
```

**Модуль «График приёма и закрытий» (неправильно):**
```javascript
// Вручную маппит тикеты с минимальными полями
tickets.value = employeeTickets.map(ticket => ({
  id: ticket.id,
  title: ticket.title || 'Без названия',
  // ... только базовые поля
}));
// Результат: неполные объекты тикетов без важных полей
```

### Отсутствующие поля в тикетах

1. **`departmentHead` / `departmentHeadFull`** — отдел заказчика
   - Необходимо для отображения в правом верхнем углу `TicketCard`
   - Загружается через `TicketDetailsService`

2. **`ufSubject`** — полное название тикета
   - Приоритетное поле для отображения в `TicketCard`
   - Может отличаться от `title`

3. **`actionStr`** — действие (UF_ACTION_STR)
   - Отображается как чип в `TicketCard`
   - Загружается через `TicketDetailsService`

4. **`description`** — описание тикета
   - Отображается в `TicketCard` при наличии
   - Загружается через `TicketDetailsService`

5. **Приоритеты и сервисы** — правильные значения с цветами
   - Сейчас всегда "medium" с жёлтым цветом
   - Должны загружаться из API и иметь правильные цвета из конфигурации

6. **Другие поля** — для полноценного отображения
   - `assignedTo` (объект с `id` и `name`)
   - Правильные `createdAt` / `updatedAt` с форматированием
   - И т.д.

## Решение

### Использовать `prepareTicketsForDisplay()` в обоих компонентах

**Для `ResponsibleModal.vue`:**
- Заменить ручное маппирование на вызов `prepareTicketsForDisplay()`
- Передать тикеты, snapshot (если есть) и ticketDetails (если есть)

**Для `StagesModal.vue`:**
- Заменить ручное маппирование на вызов `prepareTicketsForDisplay()`
- Передать тикеты, snapshot (если есть) и ticketDetails (если есть)

### Уточнение: snapshot и ticketDetails

**Вопрос:** Есть ли snapshot в модуле «График приёма и закрытий»?

**Анализ:**
- В модуле «График состояния» snapshot передаётся через props
- В модуле «График приёма и закрытий» snapshot может отсутствовать
- `prepareTicketsForDisplay()` может работать без snapshot (параметр опциональный)

**Решение:**
- Если snapshot есть — передать его
- Если snapshot нет — передать `null`
- Функция `prepareTicketsForDisplay()` загрузит недостающие данные через API

## Ступенчатые подзадачи

### 1) Модификация ResponsibleModal.vue

**Файл:** `vue-app/src/components/graph-admission-closure/ResponsibleModal.vue`

**Текущий код (строки 243-293):**
```javascript
async function loadEmployeeTickets(employeeId) {
  // ... загрузка из API ...
  const employeeTickets = employee?.tickets || [];
  
  // Подготовка тикетов для отображения в TicketCard
  tickets.value = employeeTickets.map(ticket => ({
    id: ticket.id,
    title: ticket.title || 'Без названия',
    // ... минимальные поля
  }));
}
```

**Требуется заменить на:**
```javascript
async function loadEmployeeTickets(employeeId) {
  // ... загрузка из API ...
  const employeeTickets = employee?.tickets || [];
  
  // Использовать prepareTicketsForDisplay() для полного обогащения данных
  try {
    const { prepareTicketsForDisplay } = await import('@/utils/graph-state/ticketListUtils.js');
    tickets.value = await prepareTicketsForDisplay(
      employeeTickets,
      null, // snapshot (если есть, передать; если нет — null)
      null  // ticketDetails (если есть, передать; если нет — null)
    );
  } catch (error) {
    console.error('[ResponsibleModal] Error preparing tickets:', error);
    // Fallback: использовать исходные тикеты
    tickets.value = employeeTickets;
  }
}
```

### 2) Модификация StagesModal.vue

**Файл:** `vue-app/src/components/graph-admission-closure/StagesModal.vue`

**Текущий код (строки 211-260):**
```javascript
async function loadStageTickets(stageId) {
  // ... загрузка из API ...
  const stageTickets = stage?.tickets || [];
  
  // Подготовка тикетов для отображения
  tickets.value = stageTickets.map(ticket => ({
    id: ticket.id,
    title: ticket.title || 'Без названия',
    // ... минимальные поля
  }));
}
```

**Требуется заменить на:**
```javascript
async function loadStageTickets(stageId) {
  // ... загрузка из API ...
  const stageTickets = stage?.tickets || [];
  
  // Использовать prepareTicketsForDisplay() для полного обогащения данных
  try {
    const { prepareTicketsForDisplay } = await import('@/utils/graph-state/ticketListUtils.js');
    tickets.value = await prepareTicketsForDisplay(
      stageTickets,
      null, // snapshot (если есть, передать; если нет — null)
      null  // ticketDetails (если есть, передать; если нет — null)
    );
  } catch (error) {
    console.error('[StagesModal] Error preparing tickets:', error);
    // Fallback: использовать исходные тикеты
    tickets.value = stageTickets;
  }
}
```

### 3) Проверка наличия snapshot (опционально)

**Если snapshot доступен в модуле:**
- Передать snapshot в `prepareTicketsForDisplay()` для оптимизации (меньше запросов к API)
- Если snapshot содержит полные данные тикетов, функция использует их

**Если snapshot недоступен:**
- Передать `null` — функция загрузит все необходимые данные через API
- Это нормально и работает корректно

## Технические требования

### Импорт функции

```javascript
// Динамический импорт для оптимизации
const { prepareTicketsForDisplay } = await import('@/utils/graph-state/ticketListUtils.js');
```

### Обработка ошибок

```javascript
try {
  tickets.value = await prepareTicketsForDisplay(tickets, snapshot, ticketDetails);
} catch (error) {
  console.error('[Component] Error preparing tickets:', error);
  // Fallback: использовать исходные тикеты
  tickets.value = rawTickets;
}
```

### Производительность

- Функция `prepareTicketsForDisplay()` использует кеш `TicketDetailsService`
- Загружает только недостающие данные через API
- Батч-загрузка для нескольких тикетов (оптимизация)

## Критерии приёмки

- [ ] В `ResponsibleModal` тикеты отображаются с полной информацией:
  - [ ] Отображается `departmentHead` (отдел заказчика) в правом верхнем углу карточки
  - [ ] Отображается `ufSubject` (полное название) вместо только `title`
  - [ ] Отображается `actionStr` (если есть) как чип
  - [ ] Отображается `description` (если есть)
  - [ ] Приоритеты и сервисы загружаются из API с правильными цветами
  - [ ] Все поля соответствуют структуре `TicketCard.vue`

- [ ] В `StagesModal` тикеты отображаются с полной информацией:
  - [ ] Отображается `departmentHead` (отдел заказчика) в правом верхнем углу карточки
  - [ ] Отображается `ufSubject` (полное название) вместо только `title`
  - [ ] Отображается `actionStr` (если есть) как чип
  - [ ] Отображается `description` (если есть)
  - [ ] Приоритеты и сервисы загружаются из API с правильными цветами
  - [ ] Все поля соответствуют структуре `TicketCard.vue`

- [ ] Используется функция `prepareTicketsForDisplay()` в обоих компонентах
- [ ] Обработка ошибок реализована (fallback на исходные тикеты)
- [ ] Производительность не ухудшилась (используется кеш и батч-загрузка)
- [ ] Визуальное отображение тикетов идентично модулю «График состояния»

## Дополнительные уточнения

### Оптимизация производительности

- Функция `prepareTicketsForDisplay()` использует кеш `TicketDetailsService`
- Загружает только недостающие данные (определяет автоматически)
- Батч-загрузка для нескольких тикетов (один запрос вместо нескольких)

### Совместимость с существующим кодом

- Не ломает текущую функциональность попапов
- Переиспользует существующую функцию из модуля «График состояния»
- Следует существующим паттернам и стилям

### Обработка отсутствующих данных

- Если данные не загружены через API — используются fallback значения
- Если `departmentHead` отсутствует — не отображается (как в `TicketCard.vue`)
- Если `ufSubject` отсутствует — используется `title` (fallback в `prepareTicketsForDisplay()`)

## История правок

- 2025-12-16 18:30 (UTC+3, Брест): Создана задача на основе анализа проблемы с попапами модуля «График приёма и закрытий сектора 1С»
- 2025-12-16 20:00 (UTC+3, Брест): Задача взята в работу. Добавлен раздел «Этапы реализации» для структуризации работы
- 2025-12-16 20:15 (UTC+3, Брест): Завершены этапы TASK-045-01 и TASK-045-02. Ручное маппирование тикетов заменено на prepareTicketsForDisplay() в обоих компонентах (ResponsibleModal и StagesModal)

