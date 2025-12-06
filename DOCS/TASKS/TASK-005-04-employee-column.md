# TASK-005-04: Создание компонента колонки сотрудника EmployeeColumn.vue

**Дата создания:** 2025-12-06 11:18 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-005

---

## Описание

Создать компонент колонки сотрудника (`EmployeeColumn.vue`), который отображает информацию о сотруднике и его тикетах. Компонент должен поддерживать Drag & Drop для назначения тикетов сотруднику.

---

## Props

```javascript
{
  employee: {
    type: Object,
    required: true,
    // {
    //   id: 1,
    //   name: 'Иван Иванов',
    //   position: 'Разработчик 1С',
    //   tickets: [...]
    // }
  },
  stageId: {
    type: String,
    required: true
  }
}
```

---

## Events

- `@ticket-clicked` — клик по тикету (передаёт: ticket)
- `@ticket-dropped` — тикет сброшен на сотрудника (передаёт: ticket)

---

## Ступенчатые подзадачи

### 1. Создать структуру компонента

```vue
<template>
  <div
    class="employee-column"
    :class="{ 'drop-zone-active': isDropZoneActive }"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div class="employee-header">
      <div class="employee-info">
        <span class="employee-icon">👤</span>
        <div class="employee-details">
          <div class="employee-name">{{ employee.name }}</div>
          <div v-if="employee.position" class="employee-position">
            {{ employee.position }}
          </div>
        </div>
      </div>
      <div class="tickets-count">
        📊 Тикетов: {{ employee.tickets?.length || 0 }}
      </div>
    </div>

    <div class="tickets-list">
      <TicketCard
        v-for="ticket in employee.tickets"
        :key="ticket.id"
        :ticket="ticket"
        :draggable="true"
        @click="$emit('ticket-clicked', ticket)"
        @drag-start="handleTicketDragStart"
      />
      
      <div v-if="!employee.tickets || employee.tickets.length === 0" class="empty-state">
        <p>Нет тикетов</p>
        <button class="add-ticket-btn" @click="handleAddTicket">
          + Добавить тикет
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import TicketCard from './TicketCard.vue';

export default {
  name: 'EmployeeColumn',
  components: {
    TicketCard
  },
  props: {
    employee: {
      type: Object,
      required: true
    },
    stageId: {
      type: String,
      required: true
    }
  },
  emits: ['ticket-clicked', 'ticket-dropped'],
  setup(props, { emit }) {
    const isDropZoneActive = ref(false);

    const handleDragOver = (event) => {
      event.preventDefault();
      isDropZoneActive.value = true;
    };

    const handleDragLeave = () => {
      isDropZoneActive.value = false;
    };

    const handleDrop = (event) => {
      event.preventDefault();
      isDropZoneActive.value = false;

      const ticketData = event.dataTransfer.getData('application/json');
      if (ticketData) {
        try {
          const ticket = JSON.parse(ticketData);
          emit('ticket-dropped', ticket, props.employee.id);
        } catch (err) {
          console.error('Error parsing ticket data:', err);
        }
      }
    };

    const handleTicketDragStart = (ticket) => {
      // Обработка начала перетаскивания (если нужно)
    };

    const handleAddTicket = () => {
      // Обработка добавления тикета (можно открыть модальное окно)
      console.log('Add ticket for employee:', props.employee.id);
    };

    return {
      isDropZoneActive,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleTicketDragStart,
      handleAddTicket
    };
  }
};
</script>

<style scoped>
.employee-column {
  background: #f9f9f9;
  border-radius: 4px;
  padding: 15px;
  min-height: 200px;
  transition: all 0.3s ease;
}

.employee-column.drop-zone-active {
  background: #e7f3ff;
  border: 2px dashed #007bff;
}

.employee-header {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.employee-icon {
  font-size: 24px;
}

.employee-details {
  flex: 1;
}

.employee-name {
  font-weight: 600;
  color: #333;
  font-size: 16px;
}

.employee-position {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.tickets-count {
  font-size: 14px;
  color: #666;
}

.tickets-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #999;
}

.add-ticket-btn {
  margin-top: 10px;
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.add-ticket-btn:hover {
  background: #0056b3;
}
</style>
```

---

## Критерии приёмки

- [ ] Компонент `EmployeeColumn.vue` создан
- [ ] Компонент принимает props `employee` и `stageId`
- [ ] Компонент отображает информацию о сотруднике
- [ ] Компонент отображает список тикетов через `TicketCard`
- [ ] Компонент поддерживает Drag & Drop (зона сброса)
- [ ] Компонент эмитит события `ticket-clicked` и `ticket-dropped`
- [ ] Стили добавлены и соответствуют дизайну
- [ ] Компонент работает в составе `DashboardStage.vue`

---

## История правок

- **2025-12-06 11:18 (UTC+3, Брест):** Создана подзадача TASK-005-04


