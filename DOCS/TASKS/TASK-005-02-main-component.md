# TASK-005-02: Создание главного компонента DashboardSector1C.vue

**Дата создания:** 2025-12-06 11:18 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-005

---

## Описание

Создать главный компонент дашборда сектора 1С (`DashboardSector1C.vue`), который будет отображать три этапа обработки тикетов с колонками сотрудников и нулевыми точками. Компонент должен загружать данные из API, управлять состоянием и координировать работу дочерних компонентов.

---

## Контекст

Компонент `DashboardSector1C.vue` является корневым компонентом дашборда. Он должен:
- Загружать данные о тикетах и сотрудниках из Bitrix24 REST API
- Управлять состоянием дашборда (этапы, сотрудники, тикеты)
- Координировать работу дочерних компонентов (DashboardStage, EmployeeColumn, ZeroPoint, TicketCard)
- Обрабатывать события от дочерних компонентов (перемещение тикетов, назначение)

**Структура компонента:**
```
DashboardSector1C.vue
├── DashboardStage.vue (×3 — для каждого этапа)
│   ├── ZeroPoint.vue
│   └── EmployeeColumn.vue (×N — для каждого сотрудника)
│       └── TicketCard.vue (×M — для каждого тикета)
```

---

## Модули и компоненты

### Файлы для создания:

1. **`vue-app/src/components/dashboard/DashboardSector1C.vue`**
   - Главный компонент дашборда
   - Структура: template, script, style

### Зависимости от других подзадач:
- **TASK-005-03:** DashboardStage.vue (можно создать заглушку)
- **TASK-005-07:** Сервис для работы с API (можно создать заглушку)

---

## Зависимости

### От других задач:
- **TASK-005-01:** Маршрут должен быть создан
- **TASK-005-03:** Компонент DashboardStage.vue (можно использовать заглушку)
- **TASK-005-07:** Сервис для работы с API (можно использовать заглушку)

### От модулей:
- `vue` (версия 3.x) — Composition API
- `@/services/dashboard-sector-1c-service.js` — сервис для API (будет создан в TASK-005-07)
- Bitrix24 REST API — для получения данных

---

## Ступенчатые подзадачи

### 1. Создать структуру компонента

**Файл:** `vue-app/src/components/dashboard/DashboardSector1C.vue`

Создать базовую структуру:

```vue
<template>
  <div class="dashboard-sector-1c">
    <!-- Заголовок -->
    <div class="dashboard-header">
      <h1>Дашборд - Сектор 1С</h1>
    </div>

    <!-- Контент дашборда -->
    <div class="dashboard-content">
      <!-- Этапы будут добавлены в следующем шаге -->
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  name: 'DashboardSector1C',
  setup() {
    // State будет добавлен в следующем шаге
    
    return {
      // Возвращаемые значения
    };
  }
};
</script>

<style scoped>
.dashboard-sector-1c {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.dashboard-header {
  margin-bottom: 20px;
}

.dashboard-header h1 {
  color: #333;
  font-size: 24px;
  margin: 0;
}
</style>
```

---

### 2. Добавить State (состояние компонента)

**Файл:** `vue-app/src/components/dashboard/DashboardSector1C.vue`

В секции `setup()` добавить:

```javascript
import { ref, onMounted } from 'vue';

export default {
  name: 'DashboardSector1C',
  setup() {
    // Состояние загрузки
    const isLoading = ref(true);
    const error = ref(null);

    // Данные сектора
    const stages = ref([
      {
        id: 'formed',
        name: 'Сформировано обращение',
        color: '#007bff', // Синий
        employees: []
      },
      {
        id: 'review',
        name: 'Рассмотрение ТЗ',
        color: '#ffc107', // Жёлтый
        employees: []
      },
      {
        id: 'execution',
        name: 'Исполнение',
        color: '#28a745' // Зелёный
        employees: []
      }
    ]);

    // Нулевая точка (входящие тикеты для каждого этапа)
    const zeroPointTickets = ref({
      formed: [],
      review: [],
      execution: []
    });

    // Список сотрудников
    const employees = ref([]);

    // Перетаскиваемый тикет
    const draggedTicket = ref(null);

    return {
      isLoading,
      error,
      stages,
      zeroPointTickets,
      employees,
      draggedTicket
    };
  }
};
```

---

### 3. Добавить методы загрузки данных

**Файл:** `vue-app/src/components/dashboard/DashboardSector1C.vue`

В секции `setup()` добавить методы:

```javascript
import { ref, onMounted } from 'vue';
// Временно используем заглушку сервиса (будет создан в TASK-005-07)
// import { DashboardSector1CService } from '@/services/dashboard-sector-1c-service.js';

export default {
  name: 'DashboardSector1C',
  setup() {
    // ... state ...

    /**
     * Загрузка данных сектора из API
     */
    const loadSectorData = async () => {
      isLoading.value = true;
      error.value = null;

      try {
        // Временно используем заглушку (будет заменено в TASK-005-07)
        // const data = await DashboardSector1CService.getSectorData();
        
        // Заглушка для тестирования:
        const data = {
          stages: [
            {
              id: 'formed',
              name: 'Сформировано обращение',
              employees: [
                {
                  id: 1,
                  name: 'Иван Иванов',
                  tickets: []
                }
              ]
            },
            // ... другие этапы
          ],
          zeroPointTickets: {
            formed: [],
            review: [],
            execution: []
          },
          employees: []
        };

        // Обновляем состояние
        stages.value = data.stages;
        zeroPointTickets.value = data.zeroPointTickets;
        employees.value = data.employees;
      } catch (err) {
        error.value = err.message;
        console.error('Error loading sector data:', err);
        
        // Показ уведомления через Bitrix24 UI
        if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
          BX.UI.Notification.Center.notify({
            content: 'Ошибка загрузки данных дашборда',
            autoHideDelay: 5000
          });
        }
      } finally {
        isLoading.value = false;
      }
    };

    // Загрузка данных при монтировании компонента
    onMounted(() => {
      loadSectorData();
    });

    return {
      // ... state ...
      loadSectorData
    };
  }
};
```

---

### 4. Добавить методы обработки событий

**Файл:** `vue-app/src/components/dashboard/DashboardSector1C.vue`

В секции `setup()` добавить методы:

```javascript
/**
 * Обработка начала перетаскивания тикета
 * 
 * @param {Object} ticket - Тикет
 */
const handleTicketDragStart = (ticket) => {
  draggedTicket.value = ticket;
};

/**
 * Обработка сброса тикета
 * 
 * @param {Object} ticket - Тикет
 * @param {string} employeeId - ID сотрудника
 * @param {string} stageId - ID этапа
 */
const handleTicketDrop = async (ticket, employeeId, stageId) => {
  try {
    // Временно используем заглушку (будет заменено в TASK-005-07)
    // await DashboardSector1CService.assignTicket(ticket.id, employeeId, stageId);
    
    // Обновляем локальное состояние
    // Логика обновления будет реализована в TASK-005-08
    
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
    draggedTicket.value = null;
  }
};

/**
 * Назначение тикета сотруднику
 * 
 * @param {Object} ticket - Тикет
 * @param {number} employeeId - ID сотрудника
 */
const assignTicketToEmployee = async (ticket, employeeId) => {
  await handleTicketDrop(ticket, employeeId, ticket.stageId);
};

/**
 * Перемещение тикета на этап
 * 
 * @param {Object} ticket - Тикет
 * @param {string} stageId - ID этапа
 */
const moveTicketToStage = async (ticket, stageId) => {
  await handleTicketDrop(ticket, ticket.assigneeId, stageId);
};

/**
 * Создание нового тикета
 * 
 * @param {Object} ticketData - Данные тикета
 */
const createTicket = async (ticketData) => {
  try {
    // Временно используем заглушку (будет заменено в TASK-005-07)
    // const newTicket = await DashboardSector1CService.createTicket(ticketData);
    
    // Обновляем локальное состояние
    // Логика будет реализована в TASK-005-08
    
    // Показ уведомления об успехе
    if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
      BX.UI.Notification.Center.notify({
        content: 'Тикет создан',
        autoHideDelay: 3000
      });
    }
  } catch (err) {
    console.error('Error creating ticket:', err);
    
    // Показ уведомления об ошибке
    if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
      BX.UI.Notification.Center.notify({
        content: 'Ошибка создания тикета',
        autoHideDelay: 5000
      });
    }
  }
};

/**
 * Получение тикетов сотрудника для этапа
 * 
 * @param {number} employeeId - ID сотрудника
 * @param {string} stageId - ID этапа
 * @returns {Array} Массив тикетов
 */
const getEmployeeTickets = (employeeId, stageId) => {
  const stage = stages.value.find(s => s.id === stageId);
  if (!stage) return [];

  const employee = stage.employees.find(e => e.id === employeeId);
  if (!employee) return [];

  return employee.tickets || [];
};
```

---

### 5. Добавить шаблон с этапами

**Файл:** `vue-app/src/components/dashboard/DashboardSector1C.vue`

В секции `<template>` добавить:

```vue
<template>
  <div class="dashboard-sector-1c">
    <!-- Заголовок -->
    <div class="dashboard-header">
      <h1>Дашборд - Сектор 1С</h1>
    </div>

    <!-- Состояние загрузки -->
    <div v-if="isLoading" class="loading-state">
      <p>Загрузка данных...</p>
    </div>

    <!-- Состояние ошибки -->
    <div v-else-if="error" class="error-state">
      <p>Ошибка: {{ error }}</p>
    </div>

    <!-- Контент дашборда -->
    <div v-else class="dashboard-content">
      <div class="stages-container">
        <DashboardStage
          v-for="stage in stages"
          :key="stage.id"
          :stage="stage"
          :zero-point-tickets="zeroPointTickets[stage.id]"
          @ticket-moved="handleTicketDrop"
          @ticket-assigned="assignTicketToEmployee"
        />
      </div>
    </div>
  </div>
</template>
```

**Важно:** Компонент `DashboardStage` будет создан в TASK-005-03. Пока можно использовать заглушку или временно закомментировать.

---

### 6. Добавить стили

**Файл:** `vue-app/src/components/dashboard/DashboardSector1C.vue`

В секции `<style scoped>` добавить:

```css
<style scoped>
.dashboard-sector-1c {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.dashboard-header {
  margin-bottom: 20px;
  padding: 15px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.dashboard-header h1 {
  color: #333;
  font-size: 24px;
  margin: 0;
  font-weight: 600;
}

.dashboard-content {
  margin-top: 20px;
}

.stages-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.loading-state,
.error-state {
  padding: 40px;
  text-align: center;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.error-state {
  color: #dc3545;
}

/* Адаптивность */
@media (max-width: 1024px) {
  .stages-container {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stages-container {
    grid-template-columns: 1fr;
  }
  
  .dashboard-sector-1c {
    padding: 10px;
  }
}
</style>
```

---

## Технические требования

### Версии:
- **Vue.js:** 3.x (Composition API)
- **Vue Router:** последняя версия

### Зависимости:
- `vue` — фреймворк
- `@/services/dashboard-sector-1c-service.js` — сервис для API (можно использовать заглушку)

### Ограничения:
- Использовать Composition API (не Options API)
- Стили должны быть scoped
- Компонент должен быть переиспользуемым

---

## Критерии приёмки

- [ ] Компонент `DashboardSector1C.vue` создан
- [ ] Компонент использует Composition API
- [ ] State компонента определён (stages, employees, tickets, isLoading, error)
- [ ] Методы загрузки данных реализованы (можно с заглушкой)
- [ ] Методы обработки событий реализованы (можно с заглушкой)
- [ ] Шаблон отображает заголовок и контейнер для этапов
- [ ] Стили добавлены и адаптивны
- [ ] Компонент загружается при переходе на маршрут `/dashboard/sector-1c`
- [ ] Нет ошибок в консоли браузера
- [ ] Код соответствует стандартам Vue.js

---

## Тестирование

### Функциональное тестирование:
1. Перейти на маршрут `/dashboard/sector-1c`
2. Проверить, что компонент загрузился
3. Проверить, что отображается заголовок "Дашборд - Сектор 1С"
4. Проверить, что отображается состояние загрузки (если данные ещё не загружены)
5. Проверить, что после загрузки отображается контент (даже если это заглушка)

### Проверка структуры:
1. Открыть компонент в редакторе
2. Проверить, что используется Composition API
3. Проверить, что state определён
4. Проверить, что методы реализованы
5. Проверить, что стили scoped

---

## Примеры кода

Полный пример компонента (с заглушками) см. в разделе "Ступенчатые подзадачи".

---

## История правок

- **2025-12-06 11:18 (UTC+3, Брест):** Создана подзадача TASK-005-02


