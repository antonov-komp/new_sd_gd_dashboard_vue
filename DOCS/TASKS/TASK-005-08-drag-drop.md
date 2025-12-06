# TASK-005-08: Реализация Drag & Drop функциональности

**Дата создания:** 2025-12-06 11:18 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-005

---

## Описание

Реализовать полную функциональность Drag & Drop для перемещения тикетов между сотрудниками и этапами. Включает визуальную обратную связь, валидацию перемещений и обновление данных через API.

---

## Контекст

Drag & Drop должен работать на всех уровнях:
1. Из нулевой точки на сотрудника
2. Между сотрудниками в одном этапе
3. Между этапами
4. С визуальной обратной связью (подсветка зон сброса)

---

## Зависимости

### От других задач:
- **TASK-005-02:** DashboardSector1C.vue должен быть создан
- **TASK-005-04:** EmployeeColumn.vue должен поддерживать Drag & Drop
- **TASK-005-05:** ZeroPoint.vue должен поддерживать Drag & Drop
- **TASK-005-06:** TicketCard.vue должен быть draggable
- **TASK-005-07:** Сервис API должен быть создан

---

## Ступенчатые подзадачи

### 1. Обновить TicketCard.vue для Drag & Drop

Убедиться, что компонент правильно передаёт данные при перетаскивании:

```javascript
const handleDragStart = (event) => {
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('application/json', JSON.stringify(props.ticket));
  
  // Добавляем визуальный эффект
  event.dataTransfer.setDragImage(event.target, 0, 0);
  
  emit('drag-start', props.ticket);
};
```

---

### 2. Обновить EmployeeColumn.vue для обработки Drop

```javascript
const handleDragOver = (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  isDropZoneActive.value = true;
};

const handleDragLeave = (event) => {
  // Проверяем, что мы действительно покинули зону
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;
  
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    isDropZoneActive.value = false;
  }
};

const handleDrop = async (event) => {
  event.preventDefault();
  isDropZoneActive.value = false;

  const ticketData = event.dataTransfer.getData('application/json');
  if (ticketData) {
    try {
      const ticket = JSON.parse(ticketData);
      
      // Валидация: можно ли переместить тикет сюда
      if (this.canDropTicket(ticket, props.employee.id, props.stageId)) {
        emit('ticket-dropped', ticket, props.employee.id);
      } else {
        // Показ уведомления об ошибке
        if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
          BX.UI.Notification.Center.notify({
            content: 'Нельзя переместить тикет сюда',
            autoHideDelay: 3000
          });
        }
      }
    } catch (err) {
      console.error('Error parsing ticket data:', err);
    }
  }
};

const canDropTicket = (ticket, employeeId, stageId) => {
  // Логика валидации (например, нельзя переместить тикет на того же сотрудника)
  if (ticket.assigneeId === employeeId && ticket.stageId === stageId) {
    return false;
  }
  return true;
};
```

---

### 3. Обновить DashboardSector1C.vue для координации Drag & Drop

```javascript
/**
 * Обработка сброса тикета
 */
const handleTicketDrop = async (ticket, employeeId, stageId) => {
  try {
    isLoading.value = true;
    
    // Обновляем через API
    await DashboardSector1CService.assignTicket(ticket.id, employeeId, stageId);
    
    // Обновляем локальное состояние
    updateLocalState(ticket, employeeId, stageId);
    
    // Показ уведомления об успехе
    if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
      BX.UI.Notification.Center.notify({
        content: 'Тикет перемещён',
        autoHideDelay: 3000
      });
    }
  } catch (err) {
    console.error('Error moving ticket:', err);
    
    // Показ уведомления об ошибке
    if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
      BX.UI.Notification.Center.notify({
        content: 'Ошибка перемещения тикета',
        autoHideDelay: 5000
      });
    }
  } finally {
    isLoading.value = false;
    draggedTicket.value = null;
  }
};

/**
 * Обновление локального состояния после перемещения тикета
 */
const updateLocalState = (ticket, newEmployeeId, newStageId) => {
  // Находим старую позицию тикета
  const oldStage = stages.value.find(s => 
    s.employees.some(e => 
      e.tickets.some(t => t.id === ticket.id)
    )
  );
  
  if (oldStage) {
    const oldEmployee = oldStage.employees.find(e =>
      e.tickets.some(t => t.id === ticket.id)
    );
    
    if (oldEmployee) {
      // Удаляем тикет из старой позиции
      oldEmployee.tickets = oldEmployee.tickets.filter(t => t.id !== ticket.id);
    }
  }
  
  // Добавляем тикет в новую позицию
  const newStage = stages.value.find(s => s.id === newStageId);
  if (newStage) {
    const newEmployee = newStage.employees.find(e => e.id === newEmployeeId);
    if (newEmployee) {
      // Обновляем данные тикета
      const updatedTicket = {
        ...ticket,
        assigneeId: newEmployeeId,
        stageId: newStageId
      };
      
      newEmployee.tickets.push(updatedTicket);
    }
  }
  
  // Обновляем нулевую точку (если тикет был там)
  Object.keys(zeroPointTickets.value).forEach(stageId => {
    zeroPointTickets.value[stageId] = zeroPointTickets.value[stageId].filter(
      t => t.id !== ticket.id
    );
  });
};
```

---

### 4. Добавить визуальную обратную связь

**В DashboardSector1C.vue:**

```vue
<template>
  <div class="dashboard-sector-1c" :class="{ 'is-dragging': draggedTicket }">
    <!-- ... -->
  </div>
</template>

<style scoped>
.dashboard-sector-1c.is-dragging {
  cursor: grabbing;
}

.dashboard-sector-1c.is-dragging * {
  pointer-events: none;
}

.dashboard-sector-1c.is-dragging .drop-zone-active {
  pointer-events: auto;
}
</style>
```

**В EmployeeColumn.vue:**

```css
.employee-column.drop-zone-active {
  background: #e7f3ff;
  border: 2px dashed #007bff;
  transform: scale(1.02);
}
```

---

### 5. Добавить анимации переходов

**В DashboardSector1C.vue:**

```vue
<template>
  <transition-group name="ticket" tag="div" class="tickets-list">
    <TicketCard
      v-for="ticket in employee.tickets"
      :key="ticket.id"
      :ticket="ticket"
    />
  </transition-group>
</template>

<style scoped>
.ticket-enter-active,
.ticket-leave-active {
  transition: all 0.3s ease;
}

.ticket-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.ticket-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
```

---

## Критерии приёмки

- [ ] Drag & Drop работает из нулевой точки на сотрудника
- [ ] Drag & Drop работает между сотрудниками в одном этапе
- [ ] Drag & Drop работает между этапами
- [ ] Визуальная обратная связь реализована (подсветка зон сброса)
- [ ] Валидация перемещений работает (нельзя переместить на того же сотрудника)
- [ ] Данные обновляются через API при перемещении
- [ ] Локальное состояние обновляется после успешного перемещения
- [ ] Показываются уведомления об успехе/ошибке
- [ ] Анимации переходов работают
- [ ] Нет ошибок в консоли браузера

---

## Тестирование

### Функциональное тестирование:
1. Перетащить тикет из нулевой точки на сотрудника
2. Перетащить тикет между сотрудниками в одном этапе
3. Перетащить тикет между этапами
4. Попытаться переместить тикет на того же сотрудника (должна быть ошибка)
5. Проверить обновление счётчиков тикетов
6. Проверить визуальную обратную связь (подсветка зон)

### Интеграционное тестирование:
1. Проверить сохранение изменений в Bitrix24 через API
2. Проверить обновление данных после перезагрузки страницы
3. Проверить обработку ошибок API

---

## История правок

- **2025-12-06 11:18 (UTC+3, Брест):** Создана подзадача TASK-005-08


