# Примеры использования дашборда сектора 1С

**Дата создания:** 2025-12-06 18:00 (UTC+3, Брест)  
**Версия:** 1.0

---

## 📚 Примеры использования композаблов

### 1. Использование в компоненте дашборда

```vue
<template>
  <div class="dashboard">
    <div v-if="isLoading">Загрузка...</div>
    <div v-else-if="error">Ошибка: {{ error }}</div>
    <div v-else>
      <div v-for="stage in stages" :key="stage.id">
        <h2>{{ stage.name }}</h2>
        <!-- ... -->
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted } from 'vue';
import { useDashboardState } from '@/composables/useDashboardState.js';
import { useDashboardActions } from '@/composables/useDashboardActions.js';

export default {
  name: 'DashboardSector1C',
  setup() {
    // Состояние
    const state = useDashboardState();
    
    // Действия
    const actions = useDashboardActions(state);
    
    // Загрузка данных при монтировании
    onMounted(() => {
      actions.loadSectorData();
    });
    
    return {
      isLoading: state.isLoading,
      error: state.error,
      stages: state.stages,
      loadSectorData: actions.loadSectorData,
      assignTicket: actions.assignTicket
    };
  }
};
</script>
```

### 2. Использование Drag & Drop

```vue
<template>
  <div
    class="drop-zone"
    :class="{ 'drop-zone-active': isDropZoneActive }"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <p>Перетащите тикет сюда</p>
  </div>
</template>

<script>
import { useDragAndDrop } from '@/composables/useDragAndDrop.js';

export default {
  props: {
    employeeId: Number,
    stageId: String
  },
  emits: ['ticket-dropped'],
  setup(props, { emit }) {
    const onDrop = async (ticket, employeeId, stageId) => {
      emit('ticket-dropped', ticket, employeeId);
    };
    
    const dragAndDrop = useDragAndDrop(onDrop);
    
    const handleDrop = (event) => {
      dragAndDrop.handleDrop(event, props.employeeId, props.stageId);
    };
    
    return {
      isDropZoneActive: dragAndDrop.isDropZoneActive,
      handleDragOver: dragAndDrop.handleDragOver,
      handleDragLeave: dragAndDrop.handleDragLeave,
      handleDrop
    };
  }
};
</script>
```

### 3. Использование уведомлений

```vue
<script>
import { useNotifications } from '@/composables/useNotifications.js';

export default {
  setup() {
    const notifications = useNotifications();
    
    const handleSuccess = () => {
      notifications.success('Операция выполнена успешно');
    };
    
    const handleError = (error) => {
      notifications.error('Произошла ошибка: ' + error.message);
    };
    
    const handleInfo = () => {
      notifications.info('Информационное сообщение');
    };
    
    const handleWarning = () => {
      notifications.warning('Предупреждение');
    };
    
    return {
      handleSuccess,
      handleError,
      handleInfo,
      handleWarning
    };
  }
};
</script>
```

### 4. Прямое использование сервиса

```javascript
import { DashboardSector1CService } from '@/services/dashboard-sector-1c/index.js';

// Загрузка данных сектора
async function loadData() {
  try {
    const data = await DashboardSector1CService.getSectorData();
    console.log('Stages:', data.stages);
    console.log('Employees:', data.employees);
    console.log('Zero point tickets:', data.zeroPointTickets);
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Назначение тикета сотруднику
async function assignTicket() {
  try {
    const success = await DashboardSector1CService.assignTicket(
      12345,  // ticketId
      678,    // employeeId
      'formed' // stageId
    );
    
    if (success) {
      console.log('Ticket assigned successfully');
    }
  } catch (error) {
    console.error('Error assigning ticket:', error);
  }
}

// Создание нового тикета
async function createTicket() {
  try {
    const ticketId = await DashboardSector1CService.createTicket({
      title: 'Новый тикет',
      employeeId: 678,
      stageId: 'formed'
    });
    
    console.log('Created ticket ID:', ticketId);
  } catch (error) {
    console.error('Error creating ticket:', error);
  }
}
```

### 5. Использование репозиториев напрямую

```javascript
import { TicketRepository } from '@/services/dashboard-sector-1c/data/ticket-repository.js';
import { EmployeeRepository } from '@/services/dashboard-sector-1c/data/employee-repository.js';

// Загрузка тикетов по стадии
async function loadTicketsByStage() {
  const stageId = 'DT140_12:UC_0VHWE2';
  const tickets = await TicketRepository.getTicketsByStage(stageId);
  console.log('Tickets:', tickets);
}

// Загрузка сотрудников
async function loadEmployees() {
  const employeeIds = [1, 2, 3, 4, 5];
  const employees = await EmployeeRepository.getEmployeesByIds(employeeIds);
  console.log('Employees:', employees);
}
```

### 6. Использование мапперов

```javascript
import { mapTicket } from '@/services/dashboard-sector-1c/mappers/ticket-mapper.js';
import { mapStageId, mapStageIdToBitrix } from '@/services/dashboard-sector-1c/mappers/stage-mapper.js';
import { mapEmployees } from '@/services/dashboard-sector-1c/mappers/employee-mapper.js';

// Маппинг тикета
const bitrixTicket = {
  id: 12345,
  title: 'Тикет из Bitrix24',
  stageId: 'DT140_12:UC_0VHWE2',
  priority: '3'
};

const mappedTicket = mapTicket(bitrixTicket);
console.log('Mapped ticket:', mappedTicket);
// { id: 12345, title: 'Тикет из Bitrix24', stageId: 'formed', priority: 'high' }

// Маппинг ID этапа
const internalStageId = mapStageId('DT140_12:UC_0VHWE2');
console.log('Internal stage ID:', internalStageId); // 'formed'

const bitrixStageId = mapStageIdToBitrix('formed');
console.log('Bitrix stage ID:', bitrixStageId); // 'DT140_12:UC_0VHWE2'
```

### 7. Использование фильтров и групперов

```javascript
import { filterBySector } from '@/services/dashboard-sector-1c/filters/sector-filter.js';
import { groupTicketsByStages, getZeroPointTickets } from '@/services/dashboard-sector-1c/groupers/ticket-grouper.js';

// Фильтрация тикетов по сектору
const allTickets = [/* ... */];
const sectorTickets = filterBySector(allTickets);
console.log('Sector tickets:', sectorTickets);

// Группировка тикетов по этапам
const employees = [/* ... */];
const stages = groupTicketsByStages(sectorTickets, employees);
console.log('Stages with tickets:', stages);

// Получение тикетов нулевой точки
const zeroPointTickets = getZeroPointTickets(sectorTickets);
console.log('Zero point tickets:', zeroPointTickets);
```

### 8. Использование валидации

```javascript
import { 
  isValidTicketId, 
  isValidEmployeeId, 
  isValidStageId,
  canMoveTicket,
  validateTicketData 
} from '@/services/dashboard-sector-1c/utils/validation.js';

// Валидация ID
console.log(isValidTicketId(12345)); // true
console.log(isValidTicketId(0)); // false

// Валидация возможности перемещения
const ticket = { id: 12345, assigneeId: 678, stageId: 'formed' };
const canMove = canMoveTicket(ticket, 679, 'review');
console.log('Can move:', canMove); // true

// Валидация данных для создания тикета
const ticketData = {
  title: 'Новый тикет',
  stageId: 'formed',
  employeeId: 678
};

const validation = validateTicketData(ticketData);
if (validation.valid) {
  console.log('Ticket data is valid');
} else {
  console.error('Validation errors:', validation.errors);
}
```

### 9. Использование обработки ошибок

```javascript
import { 
  handleApiError, 
  handleErrorWithNotification,
  logError 
} from '@/services/dashboard-sector-1c/utils/error-handler.js';
import { useNotifications } from '@/composables/useNotifications.js';

// Обработка ошибки API
try {
  await someApiCall();
} catch (error) {
  const message = handleApiError(error, 'loading tickets');
  console.error(message);
}

// Обработка ошибки с уведомлением
const notifications = useNotifications();
try {
  await someApiCall();
} catch (error) {
  handleErrorWithNotification(error, 'loading tickets', notifications.error);
}

// Логирование ошибки
try {
  await someApiCall();
} catch (error) {
  logError(error, 'loading tickets', { ticketId: 12345 });
}
```

### 10. Использование кеша

```javascript
import { CacheManager } from '@/services/dashboard-sector-1c/cache/cache-manager.js';

// Сохранение в кеш
CacheManager.set('my-key', { data: 'value' }, 5 * 60 * 1000); // 5 минут

// Получение из кеша
const cached = CacheManager.get('my-key');
if (cached !== null) {
  console.log('Cache hit:', cached);
} else {
  console.log('Cache miss');
}

// Инвалидация кеша
CacheManager.invalidateTicketsCache(); // Удаляет все записи с префиксом 'tickets:'

// Статистика кеша
const stats = CacheManager.getStats();
console.log('Cache stats:', stats);
// { total: 10, valid: 8, expired: 2 }
```

---

## 🔧 Расширенные примеры

### Создание кастомного композабла на основе существующих

```javascript
import { useDashboardState } from '@/composables/useDashboardState.js';
import { useDashboardActions } from '@/composables/useDashboardActions.js';
import { useNotifications } from '@/composables/useNotifications.js';

export function useDashboardWithNotifications() {
  const state = useDashboardState();
  const actions = useDashboardActions(state);
  const notifications = useNotifications();
  
  // Обёртка для loadSectorData с уведомлениями
  const loadDataWithNotification = async () => {
    try {
      await actions.loadSectorData();
      notifications.success('Данные загружены');
    } catch (error) {
      notifications.error('Ошибка загрузки данных');
    }
  };
  
  return {
    ...state,
    ...actions,
    loadDataWithNotification
  };
}
```

### Кастомная обработка Drag & Drop

```javascript
import { useDragAndDrop } from '@/composables/useDragAndDrop.js';
import { useNotifications } from '@/composables/useNotifications.js';

export function useCustomDragAndDrop(onDrop) {
  const notifications = useNotifications();
  const dragAndDrop = useDragAndDrop(async (ticket, employeeId, stageId) => {
    try {
      await onDrop(ticket, employeeId, stageId);
      notifications.success('Тикет перемещён');
    } catch (error) {
      notifications.error('Ошибка перемещения тикета');
      throw error;
    }
  });
  
  return dragAndDrop;
}
```

---

**Дата создания:** 2025-12-06 18:00 (UTC+3, Брест)  
**Автор:** Рефактор-менеджер

