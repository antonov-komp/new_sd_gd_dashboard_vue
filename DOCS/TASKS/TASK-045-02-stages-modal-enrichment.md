# TASK-045-02: Обогащение данных тикетов в StagesModal.vue

**Дата создания:** 2025-12-16 20:00 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** TASK-045

## Цель

Заменить ручное маппирование тикетов в `StagesModal.vue` на использование функции `prepareTicketsForDisplay()` для полного обогащения данных тикетов.

## Контекст

**Текущее состояние:**
- В `StagesModal.vue` (строки 211-260) тикеты подготавливаются вручную с минимальными полями
- Отсутствуют важные поля: `departmentHead`, `ufSubject`, `actionStr`, `description`, правильные приоритеты и сервисы
- Тикеты отображаются неполно в `TicketCard.vue`

**Требуется:**
- Заменить ручное маппирование на вызов `prepareTicketsForDisplay()`
- Обеспечить полное обогащение данных тикетов
- Сохранить обработку ошибок с fallback на исходные тикеты

## Файлы для изменения

**Основной файл:**
- `vue-app/src/components/graph-admission-closure/StagesModal.vue`

**Используемые утилиты:**
- `vue-app/src/utils/graph-state/ticketListUtils.js` — функция `prepareTicketsForDisplay()`

## Текущий код

**Файл:** `vue-app/src/components/graph-admission-closure/StagesModal.vue`  
**Строки:** 211-260

```javascript
async function loadStageTickets(stageId) {
  isLoadingTickets.value = true;
  error.value = null;
  
  try {
    if (!props.weekStartUtc || !props.weekEndUtc) {
      throw new Error('Не указаны границы недели');
    }
    
    const response = await fetchAdmissionClosureStats({
      product: '1C',
      weekStartUtc: props.weekStartUtc,
      weekEndUtc: props.weekEndUtc,
      includeNewTicketsByStages: true,
      includeTickets: true
    });
    
    const stage = response.data.newTicketsByStages?.find(s => s.stageId === stageId);
    const stageTickets = stage?.tickets || [];
    
    // Подготовка тикетов для отображения
    tickets.value = stageTickets.map(ticket => ({
      id: ticket.id,
      title: ticket.title || 'Без названия',
      ufSubject: ticket.title || 'Без названия',
      createdTime: ticket.createdTime,
      createdAt: ticket.createdTime,
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
    
    if (tickets.value.length === 0) {
      error.value = null; // Не ошибка, просто нет тикетов
    }
  } catch (err) {
    error.value = err.message || 'Ошибка загрузки тикетов';
    console.error('[StagesModal] Error loading tickets:', err);
    tickets.value = [];
  } finally {
    isLoadingTickets.value = false;
  }
}
```

## Требуемая реализация

**Заменить ручное маппирование на вызов `prepareTicketsForDisplay()`:**

```javascript
async function loadStageTickets(stageId) {
  isLoadingTickets.value = true;
  error.value = null;
  
  try {
    if (!props.weekStartUtc || !props.weekEndUtc) {
      throw new Error('Не указаны границы недели');
    }
    
    const response = await fetchAdmissionClosureStats({
      product: '1C',
      weekStartUtc: props.weekStartUtc,
      weekEndUtc: props.weekEndUtc,
      includeNewTicketsByStages: true,
      includeTickets: true
    });
    
    const stage = response.data.newTicketsByStages?.find(s => s.stageId === stageId);
    const stageTickets = stage?.tickets || [];
    
    // Использовать prepareTicketsForDisplay() для полного обогащения данных
    try {
      const { prepareTicketsForDisplay } = await import('@/utils/graph-state/ticketListUtils.js');
      tickets.value = await prepareTicketsForDisplay(
        stageTickets,
        null, // snapshot (если есть, передать; если нет — null)
        null  // ticketDetails (если есть, передать; если нет — null)
      );
    } catch (prepareError) {
      console.error('[StagesModal] Error preparing tickets:', prepareError);
      // Fallback: использовать исходные тикеты
      tickets.value = stageTickets;
    }
    
    if (tickets.value.length === 0) {
      error.value = null; // Не ошибка, просто нет тикетов
    }
  } catch (err) {
    error.value = err.message || 'Ошибка загрузки тикетов';
    console.error('[StagesModal] Error loading tickets:', err);
    tickets.value = [];
  } finally {
    isLoadingTickets.value = false;
  }
}
```

## Технические детали

### Импорт функции

```javascript
// Динамический импорт для оптимизации
const { prepareTicketsForDisplay } = await import('@/utils/graph-state/ticketListUtils.js');
```

### Параметры функции

- `tickets` — массив тикетов из API (`stageTickets`)
- `snapshot` — `null` (snapshot недоступен в модуле «График приёма и закрытий»)
- `ticketDetails` — `null` (детали будут загружены автоматически через API)

### Обработка ошибок

- Внешний `try-catch` обрабатывает ошибки загрузки из API
- Внутренний `try-catch` обрабатывает ошибки подготовки тикетов
- При ошибке подготовки используется fallback на исходные тикеты

## Критерии приёмки

- [ ] Ручное маппирование заменено на вызов `prepareTicketsForDisplay()`
- [ ] Тикеты обогащаются полными данными:
  - [ ] `departmentHead` (отдел заказчика) присутствует
  - [ ] `ufSubject` (полное название) загружается из API
  - [ ] `actionStr` (если есть) загружается из API
  - [ ] `description` (если есть) загружается из API
  - [ ] Приоритеты и сервисы загружаются из API с правильными цветами
- [ ] Обработка ошибок реализована (fallback на исходные тикеты)
- [ ] Производительность не ухудшилась (используется кеш и батч-загрузка)
- [ ] Визуальное отображение тикетов идентично модулю «График состояния»

## Тестирование

1. Открыть попап `StagesModal` (клик на «Новые» на графике)
2. Выбрать стадию с тикетами
3. Проверить, что тикеты отображаются с полной информацией:
   - Отдел заказчика в правом верхнем углу карточки
   - Полное название (`ufSubject`) вместо только `title`
   - Чип `actionStr` (если есть)
   - Описание (если есть)
   - Правильные приоритеты и сервисы с цветами
4. Проверить обработку ошибок (отключить API и проверить fallback)

## История правок

- 2025-12-16 20:00 (UTC+3, Брест): Создана подзадача для обогащения данных тикетов в StagesModal.vue
- 2025-12-16 20:15 (UTC+3, Брест): Реализовано обогащение данных тикетов через prepareTicketsForDisplay(). Ручное маппирование заменено на вызов функции с обработкой ошибок и fallback

