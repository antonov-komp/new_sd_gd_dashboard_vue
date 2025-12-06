# TASK-005-05: Создание компонента нулевой точки ZeroPoint.vue

**Дата создания:** 2025-12-06 11:18 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-005

---

## Описание

Создать компонент нулевой точки (`ZeroPoint.vue`), который отображает входящие тикеты для этапа. Компонент должен позволять перетаскивать тикеты из нулевой точки на сотрудников.

---

## Props

```javascript
{
  tickets: {
    type: Array,
    default: () => []
    // Массив входящих тикетов
  },
  stageId: {
    type: String,
    required: true
  }
}
```

---

## Events

- `@ticket-dragged` — тикет начал перетаскиваться (передаёт: ticket)
- `@ticket-assigned` — тикет назначен сотруднику (передаёт: ticket, employeeId)

---

## Ступенчатые подзадачи

### 1. Создать структуру компонента

```vue
<template>
  <div class="zero-point">
    <div class="zero-point-header">
      <span class="zero-point-icon">📥</span>
      <h3>[0] Нулевая точка</h3>
      <span class="tickets-count">({{ tickets.length }})</span>
    </div>
    
    <div class="zero-point-description">
      <p>Входящие тикеты</p>
      <p class="hint">Перетащите тикет на сотрудника</p>
    </div>

    <div class="zero-point-tickets">
      <TicketCard
        v-for="ticket in tickets"
        :key="ticket.id"
        :ticket="ticket"
        :draggable="true"
        @drag-start="handleTicketDragStart(ticket)"
      />
      
      <div v-if="tickets.length === 0" class="empty-state">
        <p>Нет входящих тикетов</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import TicketCard from './TicketCard.vue';

export default {
  name: 'ZeroPoint',
  components: {
    TicketCard
  },
  props: {
    tickets: {
      type: Array,
      default: () => []
    },
    stageId: {
      type: String,
      required: true
    }
  },
  emits: ['ticket-dragged', 'ticket-assigned'],
  setup(props, { emit }) {
    const handleTicketDragStart = (ticket) => {
      emit('ticket-dragged', ticket);
    };

    return {
      handleTicketDragStart
    };
  }
};
</script>

<style scoped>
.zero-point {
  background: #f5f5f5;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 15px;
  border: 2px dashed #ccc;
}

.zero-point-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.zero-point-icon {
  font-size: 24px;
}

.zero-point-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.tickets-count {
  font-size: 14px;
  color: #666;
  background: white;
  padding: 4px 8px;
  border-radius: 12px;
}

.zero-point-description {
  margin-bottom: 15px;
  font-size: 14px;
  color: #666;
}

.zero-point-description p {
  margin: 4px 0;
}

.hint {
  font-size: 12px;
  color: #999;
  font-style: italic;
}

.zero-point-tickets {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 14px;
}
</style>
```

---

## Критерии приёмки

- [ ] Компонент `ZeroPoint.vue` создан
- [ ] Компонент принимает props `tickets` и `stageId`
- [ ] Компонент отображает заголовок с иконкой и счётчиком тикетов
- [ ] Компонент отображает список тикетов через `TicketCard`
- [ ] Компонент поддерживает Drag & Drop для тикетов
- [ ] Компонент эмитит события `ticket-dragged` и `ticket-assigned`
- [ ] Стили добавлены и соответствуют дизайну
- [ ] Компонент работает в составе `DashboardStage.vue`

---

## История правок

- **2025-12-06 11:18 (UTC+3, Брест):** Создана подзадача TASK-005-05

