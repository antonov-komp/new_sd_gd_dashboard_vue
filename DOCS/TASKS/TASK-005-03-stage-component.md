# TASK-005-03: Создание компонента этапа DashboardStage.vue

**Дата создания:** 2025-12-06 11:18 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-005

---

## Описание

Создать компонент этапа (`DashboardStage.vue`), который отображает один этап обработки тикетов с нулевой точкой и колонками сотрудников. Компонент должен обрабатывать события от дочерних компонентов и передавать их родительскому компоненту.

---

## Контекст

Компонент `DashboardStage.vue` является промежуточным компонентом между главным компонентом (`DashboardSector1C.vue`) и компонентами сотрудников (`EmployeeColumn.vue`) и нулевой точки (`ZeroPoint.vue`).

**Структура:**
```
DashboardStage.vue
├── ZeroPoint.vue (нулевая точка для входящих тикетов)
└── EmployeeColumn.vue (×N — для каждого сотрудника)
    └── TicketCard.vue (×M — для каждого тикета)
```

---

## Модули и компоненты

### Файлы для создания:
- `vue-app/src/components/dashboard/DashboardStage.vue`

### Зависимости от других подзадач:
- **TASK-005-04:** EmployeeColumn.vue (можно создать заглушку)
- **TASK-005-05:** ZeroPoint.vue (можно создать заглушку)

---

## Props

```javascript
{
  stage: {
    type: Object,
    required: true,
    // Структура:
    // {
    //   id: 'formed',
    //   name: 'Сформировано обращение',
    //   color: '#007bff',
    //   employees: [...]
    // }
  },
  zeroPointTickets: {
    type: Array,
    default: () => []
    // Массив входящих тикетов для этого этапа
  }
}
```

---

## Events

- `@ticket-moved` — тикет перемещён (передаёт: ticket, employeeId, stageId)
- `@ticket-assigned` — тикет назначен сотруднику (передаёт: ticket, employeeId)

---

## Ступенчатые подзадачи

### 1. Создать структуру компонента

```vue
<template>
  <div class="dashboard-stage" :style="{ borderLeftColor: stage.color }">
    <div class="stage-header">
      <h2>{{ stage.name }}</h2>
    </div>
    
    <div class="stage-content">
      <!-- Нулевая точка -->
      <ZeroPoint
        :tickets="zeroPointTickets"
        :stage-id="stage.id"
        @ticket-dragged="handleTicketDragged"
        @ticket-assigned="handleTicketAssigned"
      />
      
      <!-- Колонки сотрудников -->
      <div class="employees-container">
        <EmployeeColumn
          v-for="employee in stage.employees"
          :key="employee.id"
          :employee="employee"
          :stage-id="stage.id"
          @ticket-clicked="handleTicketClicked"
          @ticket-dropped="handleTicketDropped"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import ZeroPoint from './ZeroPoint.vue';
import EmployeeColumn from './EmployeeColumn.vue';

export default {
  name: 'DashboardStage',
  components: {
    ZeroPoint,
    EmployeeColumn
  },
  props: {
    stage: {
      type: Object,
      required: true
    },
    zeroPointTickets: {
      type: Array,
      default: () => []
    }
  },
  emits: ['ticket-moved', 'ticket-assigned'],
  setup(props, { emit }) {
    const isDragging = ref(false);

    const handleTicketDragged = (ticket) => {
      isDragging.value = true;
    };

    const handleTicketAssigned = (ticket, employeeId) => {
      emit('ticket-assigned', ticket, employeeId);
    };

    const handleTicketDropped = (ticket, employeeId) => {
      emit('ticket-moved', ticket, employeeId, props.stage.id);
      isDragging.value = false;
    };

    const handleTicketClicked = (ticket) => {
      // Обработка клика по тикету (можно открыть модальное окно)
      console.log('Ticket clicked:', ticket);
    };

    return {
      isDragging,
      handleTicketDragged,
      handleTicketAssigned,
      handleTicketDropped,
      handleTicketClicked
    };
  }
};
</script>

<style scoped>
.dashboard-stage {
  background: white;
  border-radius: 4px;
  padding: 15px;
  border-left: 4px solid;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-height: 400px;
}

.stage-header {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.stage-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.stage-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.employees-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
```

---

## Критерии приёмки

- [ ] Компонент `DashboardStage.vue` создан
- [ ] Компонент принимает props `stage` и `zeroPointTickets`
- [ ] Компонент эмитит события `ticket-moved` и `ticket-assigned`
- [ ] Компонент отображает заголовок этапа с цветом
- [ ] Компонент интегрирован с `ZeroPoint` и `EmployeeColumn`
- [ ] Стили добавлены и соответствуют дизайну
- [ ] Компонент работает в составе `DashboardSector1C.vue`

---

## История правок

- **2025-12-06 11:18 (UTC+3, Брест):** Создана подзадача TASK-005-03

