# TASK-057-02: Улучшение попапа детализации — добавление информации из тикетов

**Дата создания:** 2025-12-17 15:00 (UTC+3, Брест)  
**Статус:** ✅ Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачами:** 
- TASK-050-07 (Frontend попап детализации) — базовый попап
- TASK-057 (Поиск связи Задач с Объектами CRM) — подтверждена связь через `ufCrmTask`

---

## Цель

Улучшить попап детализации в модуле «Трудозатраты на Тикеты сектора 1С», добавив информацию из связанных тикетов к карточкам задач. Сейчас попап показывает только ID задач, а нужно отображать данные из тикетов (название, статус, дата создания и т.д.).

---

## Контекст

- В модуле «Трудозатраты на Тикеты сектора 1С» (TASK-050) есть попап детализации
- Попап показывает карточки задач с ID, названием, датами
- Задачи связаны с тикетами через поле `ufCrmTask` (формат: `["T8c_XXXX"]`)
- Связь подтверждена в TASK-057: все тестовые задачи успешно связаны с тикетами
- В API уже есть функция `matchTasksWithTickets()`, которая связывает задачи с тикетами
- Нужно расширить API endpoint `getTasksDetails()` для включения информации о тикетах

---

## Текущее состояние

### Попап (TimeTrackingDetailModal.vue)

**Текущее отображение карточки задачи:**
```vue
<div class="task-card">
  <div class="task-card__header">
    <span class="task-card__number">Задача #{{ task.id }}</span>
    <span class="task-card__time">{{ formatElapsedTime(task.elapsedTime) }}</span>
  </div>
  
  <div class="task-card__title">
    {{ task.title || 'Без названия' }}
  </div>
  
  <div class="task-card__dates">
    <!-- Даты начала, дедлайна, завершения -->
  </div>
</div>
```

**Проблема:** Нет информации о связанном тикете.

### API (tickets-time-tracking-sector-1c.php)

**Текущая функция `getTasksDetails()`:**
- Получает задачи через `tasks.task.get`
- Возвращает: ID, название, даты, статус
- Не включает информацию о связанных тикетах

**Существующая функция `matchTasksWithTickets()`:**
- Связывает задачи с тикетами через поле `ufCrmTask`
- Получает тикеты через `crm.item.list`
- Возвращает данные тикетов

---

## Задачи этапа

### 1. Расширение Backend API

**Файл:** `api/tickets-time-tracking-sector-1c.php`

**Текущее состояние:**
- Функция `getTasksDetails()` (строки 806-926) получает задачи через `tasks.task.get`
- Функция `matchTasksWithTickets()` (строки 426-513) уже существует и связывает задачи с тикетами
- В основном запросе (строка 1052) уже вызывается `matchTasksWithTickets()`, но данные тикетов не передаются в `getTasksDetails()`

**Задачи:**
1. Расширить функцию `getTasksDetails()` для включения информации о тикетах
2. Вызвать `matchTasksWithTickets()` внутри `getTasksDetails()` или передать `$taskTicketMap` как параметр
3. Добавить данные тикетов к каждой задаче в ответе API
4. Рассчитать неделю создания тикета через `getWeekNumberByDate()` для визуального выделения

**Структура ответа API:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 73885,
        "title": "Обращение#4872 Доработка модуля...",
        "elapsedTime": 2.0,
        "startDate": "2025-12-01T16:00:36+03:00",
        "deadline": "2025-12-02T19:00:00+03:00",
        "closedDate": "2025-12-01T16:01:44+03:00",
        "ticket": {
          "id": 4872,
          "title": "Обращение#4872 Доработка модуля прихода Камоцци для стат.деклараций",
          "createdTime": "2025-11-26T14:33:02+03:00",
          "createdWeek": 48,
          "stageId": "DT140_12:SUCCESS",
          "ufSubject": "Доработка модуля прихода Камоцци для стат.деклараций",
          "ufCrm7TypeProduct": "1C",
          "ufSlaBlockStr": "1С",
          "ufSlaServiceStr": "1С.Бухгалтерия",
          "ufActionStr": "Разработка / доработка",
          "ufPriority": 10179,
          "ufCrm7UfPriority": "Оптимизация"
        }
      }
    ],
    "pagination": {
      "totalTasks": 10,
      "currentPage": 1,
      "perPage": 10,
      "totalPages": 1
    }
  }
}
```

### 2. Обновление Frontend компонента

**Файл:** `vue-app/src/components/tickets-time-tracking/TimeTrackingDetailModal.vue`

**Задачи:**
1. Обновить отображение карточки задачи для показа информации о тикете
2. Добавить блок с данными тикета под информацией о задаче
3. Визуально выделить тикеты, созданные в другие недели
4. Добавить клик на тикет для открытия в Bitrix24 (если возможно)

**Новая структура карточки задачи:**
```vue
<div class="task-card">
  <!-- Информация о задаче -->
  <div class="task-card__header">
    <span class="task-card__number">Задача #{{ task.id }}</span>
    <span class="task-card__time">{{ formatElapsedTime(task.elapsedTime) }}</span>
  </div>
  
  <div class="task-card__title">
    {{ task.title || 'Без названия' }}
  </div>
  
  <div class="task-card__dates">
    <!-- Даты задачи -->
  </div>
  
  <!-- Информация о тикете -->
  <div v-if="task.ticket" class="task-card__ticket">
    <div class="ticket-header">
      <span class="ticket-id">Тикет #{{ task.ticket.id }}</span>
      <span 
        v-if="task.ticket.createdWeek !== currentWeek"
        class="ticket-week-badge"
      >
        Создан в нед. {{ task.ticket.createdWeek }}
      </span>
    </div>
    
    <div class="ticket-title">
      {{ task.ticket.title || task.ticket.ufSubject }}
    </div>
    
    <div class="ticket-meta">
      <div class="ticket-meta__item">
        <span class="meta-label">Сектор:</span>
        <span class="meta-value">{{ task.ticket.ufSlaBlockStr || 'Не указан' }}</span>
      </div>
      
      <div class="ticket-meta__item">
        <span class="meta-label">Сервис:</span>
        <span class="meta-value">{{ task.ticket.ufSlaServiceStr || 'Не указан' }}</span>
      </div>
      
      <div class="ticket-meta__item">
        <span class="meta-label">Действие:</span>
        <span class="meta-value">{{ task.ticket.ufActionStr || 'Не указано' }}</span>
      </div>
      
      <div class="ticket-meta__item">
        <span class="meta-label">Приоритет:</span>
        <span class="meta-value">{{ task.ticket.ufCrm7UfPriority || 'Не указан' }}</span>
      </div>
    </div>
    
    <div class="ticket-dates">
      <div class="ticket-date-item">
        <span class="date-icon">📅</span>
        <span class="date-label">Создан:</span>
        <span class="date-value">{{ formatDate(task.ticket.createdTime) }}</span>
      </div>
    </div>
  </div>
  
  <div v-else class="task-card__no-ticket">
    <span class="no-ticket-label">Тикет не связан</span>
  </div>
</div>
```

### 3. Обновление сервиса

**Файл:** `vue-app/src/services/tickets-time-tracking/timeTrackingService.js`

**Задачи:**
1. Обновить типы данных для включения информации о тикетах
2. Обеспечить обработку данных тикетов в ответе API

---

## Технические требования

### Backend (PHP)

**Расширение функции `getTasksDetails()`:**

1. После получения задач через `tasks.task.get`:
   - Вызвать `matchTasksWithTickets()` для связи задач с тикетами
   - Добавить данные тикетов в каждую задачу

2. Поля тикета для включения:
   - `id` — ID тикета
   - `title` — Название тикета
   - `createdTime` — Дата создания
   - `createdWeek` — Неделя создания (рассчитать через `getWeekNumberByDate()`)
   - `stageId` — Статус тикета
   - `ufSubject` — Тема тикета
   - `ufCrm7TypeProduct` — Тип продукта (1C)
   - `ufSlaBlockStr` — Сектор (1С)
   - `ufSlaServiceStr` — Сервис (1С.Бухгалтерия)
   - `ufActionStr` — Действие (Разработка / доработка)
   - `ufCrm7UfPriority` — Приоритет (Оптимизация)

**Важно:** Расширить `select` в функции `matchTasksWithTickets()` (строка 480-485) для получения всех нужных полей тикета.

3. Обработка отсутствия связи:
   - Если задача не связана с тикетом → `ticket: null`
   - Не прерывать обработку других задач

### Frontend (Vue.js)

**Обновление компонента:**

1. Обработка данных тикета:
   - Проверка наличия `task.ticket`
   - Отображение информации о тикете
   - Визуальное выделение тикетов из других недель

2. Стилизация:
   - Блок тикета с отступом от информации о задаче
   - Визуальное разделение (граница, фон)
   - Badge для недели создания тикета (если отличается от недели трудозатраты)

3. Интерактивность:
   - Клик на тикет → открытие в Bitrix24 (если возможно)
   - Клик на задачу → открытие задачи в Bitrix24 (если возможно)

---

## Критерии приёмки

- [ ] Backend API расширен для включения информации о тикетах
- [ ] Функция `getTasksDetails()` возвращает данные тикетов вместе с задачами
- [ ] Используется существующая функция `matchTasksWithTickets()` для связи
- [ ] Frontend компонент обновлён для отображения информации о тикетах
- [ ] Карточка задачи показывает данные тикета (ID, название, метаданные)
- [ ] Визуально выделяются тикеты, созданные в другие недели (badge)
- [ ] Обрабатывается случай отсутствия связи задачи с тикетом
- [ ] Стили соответствуют другим модулям сектора 1С
- [ ] Попап адаптивен для мобильных устройств
- [ ] Протестировано с реальными данными

---

## Примеры реализации

### Backend: Расширение select в matchTasksWithTickets()

**Файл:** `api/tickets-time-tracking-sector-1c.php` (строки 480-485)

```php
// Расширить select для получения всех нужных полей тикета
'select' => [
    'id',
    'title',
    'createdTime',
    'UF_CRM_7_TYPE_PRODUCT',
    'stageId',
    'ufSubject',
    'ufSlaBlockStr',
    'ufSlaServiceStr',
    'ufActionStr',
    'ufCrm7UfPriority'
]
```

### Backend: Расширение getTasksDetails()

**Файл:** `api/tickets-time-tracking-sector-1c.php` (строки 806-926)

**Важно:** Функция вызывается в основном запросе (строка 1114), где уже есть `$weeks` и `$taskTicketMap`. Нужно передать эти данные как параметры.

```php
/**
 * Получение детальной информации о задачах с информацией о тикетах
 * 
 * @param array $taskIds Массив ID задач
 * @param int $page Номер страницы
 * @param int $perPage Количество задач на страницу
 * @param array|null $weeks Массив недель (для расчёта недели создания тикета)
 * @param array|null $taskTicketMap Массив связи задач с тикетами (если уже получен)
 * @return array Массив с задачами, тикетами и метаданными пагинации
 */
function getTasksDetails(array $taskIds, int $page = 1, int $perPage = 10, ?array $weeks = null, ?array $taskTicketMap = null): array
{
    // ... существующий код получения задач через tasks.task.get ...
    // Важно: добавить 'UF_*' в select для получения ufCrmTask
    
    // Связь задач с тикетами
    if ($taskTicketMap === null) {
        // Если маппинг не передан, создаём его из сырых данных задач
        $tasksForMatching = [];
        foreach ($allTasks as $task) {
            if (isset($task['_rawTask'])) {
                $tasksForMatching[$task['id']] = $task['_rawTask'];
            }
        }
        $taskTicketMap = matchTasksWithTickets($tasksForMatching);
    }
    
    // Добавить информацию о тикетах к задачам
    foreach ($allTasks as &$task) {
        $taskId = $task['id'];
        
        if (isset($taskTicketMap[$taskId]['ticket'])) {
            $ticket = $taskTicketMap[$taskId]['ticket'];
            
            // Рассчитать неделю создания тикета
            $ticketCreatedWeek = null;
            if ($weeks && isset($ticket['createdTime'])) {
                $ticketCreatedWeek = getWeekNumberByDate($ticket['createdTime'], $weeks);
            }
            
            $task['ticket'] = [
                'id' => (int)($ticket['id'] ?? 0),
                'title' => $ticket['title'] ?? null,
                'createdTime' => $ticket['createdTime'] ?? null,
                'createdWeek' => $ticketCreatedWeek,
                'stageId' => $ticket['stageId'] ?? null,
                'ufSubject' => $ticket['ufSubject'] ?? null,
                'ufCrm7TypeProduct' => $ticket['UF_CRM_7_TYPE_PRODUCT'] ?? $ticket['ufCrm7TypeProduct'] ?? null,
                'ufSlaBlockStr' => $ticket['ufSlaBlockStr'] ?? null,
                'ufSlaServiceStr' => $ticket['ufSlaServiceStr'] ?? null,
                'ufActionStr' => $ticket['ufActionStr'] ?? null,
                'ufCrm7UfPriority' => $ticket['ufCrm7UfPriority'] ?? null
            ];
        } else {
            $task['ticket'] = null;
        }
    }
    unset($task);
    
    // ... существующий код пагинации ...
    
    return [
        'tasks' => $paginatedTasks,
        'pagination' => $pagination
    ];
}
```

**Обновление вызова функции (строка 1114):**

```php
// В основном запросе, после получения $taskTicketMap (строка 1052)
$tasksDetails = getTasksDetails($taskIds, $page, $perPage, $weeks, $taskTicketMap);
```

### Frontend: Обновление карточки задачи

```vue
<!-- Информация о тикете -->
<div v-if="task.ticket" class="task-card__ticket">
  <div class="ticket-header">
    <div class="ticket-header__left">
      <span class="ticket-id">Тикет #{{ task.ticket.id }}</span>
      <span 
        v-if="task.ticket.createdWeek && task.ticket.createdWeek !== currentWeek"
        class="ticket-week-badge"
        :title="`Тикет создан в неделе ${task.ticket.createdWeek}, трудозатрата записана в неделе ${currentWeek}`"
      >
        Создан в нед. {{ task.ticket.createdWeek }}
      </span>
    </div>
  </div>
  
  <div class="ticket-title">
    {{ task.ticket.title || task.ticket.ufSubject || 'Без названия' }}
  </div>
  
  <div class="ticket-meta">
    <div class="ticket-meta__row">
      <div class="ticket-meta__item">
        <span class="meta-label">Сектор:</span>
        <span class="meta-value">{{ task.ticket.ufSlaBlockStr || 'Не указан' }}</span>
      </div>
      
      <div class="ticket-meta__item">
        <span class="meta-label">Сервис:</span>
        <span class="meta-value">{{ task.ticket.ufSlaServiceStr || 'Не указан' }}</span>
      </div>
    </div>
    
    <div class="ticket-meta__row">
      <div class="ticket-meta__item">
        <span class="meta-label">Действие:</span>
        <span class="meta-value">{{ task.ticket.ufActionStr || 'Не указано' }}</span>
      </div>
      
      <div class="ticket-meta__item">
        <span class="meta-label">Приоритет:</span>
        <span class="meta-value">{{ task.ticket.ufCrm7UfPriority || 'Не указан' }}</span>
      </div>
    </div>
  </div>
  
  <div class="ticket-dates">
    <div class="ticket-date-item">
      <span class="date-icon">📅</span>
      <span class="date-label">Создан:</span>
      <span class="date-value">{{ formatDate(task.ticket.createdTime) }}</span>
    </div>
  </div>
</div>

<div v-else class="task-card__no-ticket">
  <span class="no-ticket-label">Тикет не связан</span>
</div>
```

### Стили для блока тикета

```css
.task-card__ticket {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.ticket-header__left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ticket-id {
  font-weight: bold;
  color: #3b82f6;
  font-size: 14px;
}

.ticket-week-badge {
  padding: 2px 8px;
  background-color: #fef3c7;
  color: #92400e;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.ticket-title {
  font-size: 14px;
  color: #1f2937;
  margin-bottom: 12px;
  line-height: 1.4;
}

.ticket-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.ticket-meta__row {
  display: flex;
  gap: 16px;
}

.ticket-meta__item {
  display: flex;
  gap: 4px;
  font-size: 12px;
}

.meta-label {
  color: #6b7280;
}

.meta-value {
  color: #1f2937;
  font-weight: 500;
}

.ticket-dates {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ticket-date-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.task-card__no-ticket {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  color: #9ca3af;
  font-style: italic;
  font-size: 12px;
}
```

---

## Зависимости

- **TASK-050-07:** Frontend попап детализации (базовый попап)
- **TASK-057:** Поиск связи Задач с Объектами CRM (подтверждена связь через `ufCrmTask`)
- **TASK-050-02:** Backend API endpoint (функция `matchTasksWithTickets()`)

---

## История правок

- **2025-12-17 15:00 (UTC+3, Брест):** Создан черновик задачи TASK-057-02
  - Добавлена цель и контекст
  - Описаны задачи этапа
  - Добавлены примеры реализации
  - Добавлены критерии приёмки

- **2025-12-17 17:21 (UTC+3, Брест):** Задача реализована
  - Расширена функция `matchTasksWithTickets()` для получения всех нужных полей тикета
  - Расширена функция `getTasksDetails()` для включения информации о тикетах
  - Обновлён вызов `getTasksDetails()` в основном запросе с передачей `$weeks` и `$taskTicketMap`
  - Обновлён Vue компонент `TimeTrackingDetailModal.vue` для отображения информации о тикете в карточке задачи
  - Добавлены стили для блока тикета
  - Добавлено computed свойство `currentWeek` для сравнения недель

---

## Примечания

- **Статус:** ✅ Завершена — задача реализована и готова к тестированию
- **Тестирование:** Использовать тестовые задачи из TASK-057 (73885, 73881, 74110)
- **Реализовано:**
  - Backend API расширен для включения информации о тикетах
  - Frontend компонент обновлён для отображения информации о тикетах
  - Визуальное выделение тикетов, созданных в другие недели (badge)
  - Обработка случая отсутствия связи задачи с тикетом

