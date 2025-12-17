# TASK-050-07: Frontend попап детализации

**Дата создания:** 2025-12-17 09:30 (UTC+3, Брест)  
**Дата завершения:** 2025-12-17 13:00 (UTC+3, Брест)  
**Статус:** ✅ Завершён  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Этап 7 из TASK-050  
**Зависимости:** TASK-050-02 (завершён), TASK-050-04 (завершён)

---

## Цель этапа

Реализовать попап детализации, который показывает связь трудозатрат с задачами и тикетами. Попап открывается при клике на ячейку таблицы, точку графика или столбец графика.

---

## Контекст

- Модуль «Трудозатраты на Тикеты сектора 1С» (TASK-050) — 4-й модуль в дашборде сектора 1С
- Попап показывает детальную информацию о трудозатратах
- Важно показать связь: Трудозатраты → Задачи → Тикеты
- Тикеты могут быть созданы в другие недели (не той, в которую записана трудозатрата)

---

## Задачи этапа

### 1. Создание компонента попапа

**Файл:** `vue-app/src/components/tickets-time-tracking/TimeTrackingDetailModal.vue`

**Структура попапа:**
```
┌─────────────────────────────────────────────────────────────┐
│  Детализация: Иванов И.И., Неделя 50 (15.5 ч)              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Задачи и связанные тикеты:                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Задача #1001 (5.0 ч)                                 │ │
│  │   └─ Тикет #12345 (создан в неделе 48)               │ │
│  │      Название: "Исправление ошибки в модуле"        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Задача #1002 (7.5 ч)                                 │ │
│  │   └─ Тикет #12346 (создан в неделе 49)               │ │
│  │      Название: "Добавление новой функции"            │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Задача #1003 (3.0 ч)                                 │ │
│  │   └─ Тикет #12347 (создан в неделе 50)               │ │
│  │      Название: "Оптимизация запросов"                │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                             │
│  Итого: 15.5 ч (3 задачи, 3 тикета)                        │
│                                                             │
│  [Закрыть]                                                  │
└─────────────────────────────────────────────────────────────┘
```

### 2. Типы попапов

**Три типа попапов:**

1. **Попап по ячейке (сотрудник + неделя):**
   - Показывает все задачи сотрудника за неделю
   - Связь с тикетами
   - Неделя создания каждого тикета

2. **Попап по сотруднику:**
   - Показывает все задачи сотрудника за период
   - Группировка по неделям
   - Связь с тикетами

3. **Попап по неделе:**
   - Показывает все задачи всех сотрудников за неделю
   - Группировка по сотрудникам
   - Связь с тикетами

### 3. Получение детальных данных

**API запрос:**
- При открытии попапа запрашивать детальные данные
- Endpoint: расширение существующего API или отдельный endpoint
- Параметры: `employeeId`, `weekNumber` (в зависимости от типа попапа)

**Структура данных:**
```json
{
  "employee": {
    "id": 123,
    "name": "Иванов Иван"
  },
  "week": {
    "weekNumber": 50,
    "weekStartUtc": "2025-12-15T00:00:00Z",
    "weekEndUtc": "2025-12-21T23:59:59Z"
  },
  "tasks": [
    {
      "id": 1001,
      "elapsedTime": 5.0,
      "ticket": {
        "id": 12345,
        "title": "Исправление ошибки в модуле",
        "createdWeek": 48,
        "createdWeekStartUtc": "2025-11-24T00:00:00Z"
      }
    }
  ],
  "total": {
    "elapsedTime": 15.5,
    "tasksCount": 3,
    "ticketsCount": 3
  }
}
```

### 4. Отображение связи с тикетами

**Важно показать:**
- Задача и её трудозатрата
- Связанный тикет
- Неделя создания тикета (может отличаться от недели записи трудозатраты)
- Название тикета

**Визуальное выделение:**
- Если тикет создан в другую неделю → выделить цветом или иконкой
- Показать разницу недель (например, "создан на 2 недели раньше")

### 5. Интерактивность

**Функционал:**
- Клик на тикет → открытие тикета в Bitrix24 (если возможно)
- Клик на задачу → открытие задачи в Bitrix24 (если возможно)
- Кнопка "Закрыть" → закрытие попапа

---

## Технические требования

### Vue.js компонент

- Использовать Composition API (`<script setup>`)
- Props: `visible`, `type` ('cell' | 'employee' | 'week'), `employeeId`, `weekNumber`
- Emits: `close`

### Модальное окно

- Использовать тот же компонент модального окна, что и в других модулях
- Адаптивность для мобильных устройств
- Закрытие по клику вне попапа или по ESC

### Стили

- Соответствие стилям других попапов в модулях сектора 1С
- Читаемость структуры (задачи → тикеты)
- Визуальное выделение тикетов, созданных в другие недели

---

## Критерии приёмки этапа

- [x] Создан компонент `TimeTrackingDetailModal.vue`
- [x] Реализован попап по ячейке (сотрудник + неделя)
- [x] Реализован попап по сотруднику
- [x] Реализован попап по неделе
- [x] Отображается связь задач с тикетами (базовая структура)
- [x] Указывается неделя создания каждого тикета (визуальное выделение)
- [x] Визуально выделяются тикеты, созданные в другие недели (badge)
- [ ] Реализована интерактивность (клик на тикет/задачу) - требуется интеграция с Bitrix24
- [x] Попап адаптивен для мобильных устройств
- [x] Стили соответствуют другим модулям
- [x] Обработка пустых данных

---

## Дополнительные уточнения

- При реализации использовать примеры попапов из других модулей
- Обратить внимание на производительность при большом количестве задач
- Учесть возможность отсутствия связи задачи с тикетом

## Примеры кода

### Структура компонента попапа

**Пример из `vue-app/src/components/tickets-time-tracking/TimeTrackingDetailModal.vue`:**

```vue
<template>
  <div
    v-if="isVisible"
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    @click.self="handleClose"
  >
    <div class="modal modal--time-tracking-detail">
      <header class="modal__header">
        <h3 class="modal__title">
          {{ modalTitle }}
        </h3>
        <button class="modal__close" @click="handleClose" aria-label="Закрыть">
          ✕
        </button>
      </header>
      
      <section class="modal__body">
        <LoadingSpinner v-if="isLoading" message="Загрузка деталей..." />
        
        <div v-else-if="error" class="modal__error">
          {{ error }}
        </div>
        
        <div v-else-if="!detailData || detailData.tasks.length === 0" class="modal__empty">
          Нет данных о трудозатратах
        </div>
        
        <div v-else class="detail-content">
          <!-- Сводка -->
          <div class="detail-summary">
            <div class="summary-item">
              <span class="summary-label">Общая трудозатрата:</span>
              <span class="summary-value">{{ formatElapsedTime(detailData.total.elapsedTime) }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Задач:</span>
              <span class="summary-value">{{ detailData.total.tasksCount }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Тикетов:</span>
              <span class="summary-value">{{ detailData.total.ticketsCount }}</span>
            </div>
          </div>
          
          <!-- Список задач и тикетов -->
          <div class="tasks-list">
            <div
              v-for="task in detailData.tasks"
              :key="task.id"
              class="task-item"
            >
              <div class="task-header">
                <span class="task-id">Задача #{{ task.id }}</span>
                <span class="task-time">{{ formatElapsedTime(task.elapsedTime) }}</span>
              </div>
              
              <div v-if="task.ticket" class="ticket-info">
                <div class="ticket-link">
                  <span class="ticket-id">Тикет #{{ task.ticket.id }}</span>
                  <span
                    v-if="task.ticket.createdWeek !== currentWeek"
                    class="ticket-week-badge"
                    :title="`Тикет создан в неделе ${task.ticket.createdWeek}, трудозатрата записана в неделе ${currentWeek}`"
                  >
                    Создан в нед. {{ task.ticket.createdWeek }}
                  </span>
                </div>
                <div class="ticket-title">{{ task.ticket.title }}</div>
                <div v-if="task.ticket.createdWeekStartUtc" class="ticket-date">
                  Создан: {{ formatDate(task.ticket.createdWeekStartUtc) }}
                </div>
              </div>
              
              <div v-else class="ticket-info ticket-info--no-ticket">
                <span class="no-ticket-label">Тикет не связан</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <footer class="modal__footer">
        <button class="btn btn--primary" @click="handleClose">Закрыть</button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { formatElapsedTime } from '@/services/tickets-time-tracking/timeTrackingUtils.js';
import { timeTrackingService } from '@/services/tickets-time-tracking/timeTrackingService.js';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'cell', // 'cell' | 'employee' | 'week'
    validator: (value) => ['cell', 'employee', 'week'].includes(value)
  },
  employeeId: {
    type: Number,
    default: null
  },
  weekNumber: {
    type: Number,
    default: null
  }
});

const emit = defineEmits(['close']);

// Состояния
const isLoading = ref(false);
const error = ref(null);
const detailData = ref(null);
const currentWeek = ref(null);

// Computed
const modalTitle = computed(() => {
  if (props.type === 'cell' && props.employeeId && props.weekNumber) {
    return `Детализация: Сотрудник #${props.employeeId}, Неделя ${props.weekNumber}`;
  } else if (props.type === 'employee' && props.employeeId) {
    return `Детализация: Сотрудник #${props.employeeId}`;
  } else if (props.type === 'week' && props.weekNumber) {
    return `Детализация: Неделя ${props.weekNumber}`;
  }
  return 'Детализация трудозатрат';
});

// Методы
const loadDetailData = async () => {
  if (!props.isVisible) {
    return;
  }
  
  isLoading.value = true;
  error.value = null;
  detailData.value = null;
  
  try {
    // Запрос детальных данных (требуется расширить API endpoint)
    const result = await timeTrackingService.getTimeTrackingDetail({
      type: props.type,
      employeeId: props.employeeId,
      weekNumber: props.weekNumber
    });
    
    detailData.value = result.data;
    currentWeek.value = result.meta?.weekNumber;
  } catch (err) {
    error.value = err.message || 'Ошибка загрузки детальных данных';
    console.error('Error loading detail data:', err);
  } finally {
    isLoading.value = false;
  }
};

const handleClose = () => {
  emit('close');
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

// Загрузка данных при открытии попапа
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    loadDetailData();
  }
});
</script>

<style scoped>
.modal--time-tracking-detail {
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.detail-summary {
  display: flex;
  gap: 20px;
  padding: 16px;
  background-color: #f9fafb;
  border-radius: 8px;
  margin-bottom: 20px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label {
  font-size: 12px;
  color: #6b7280;
}

.summary-value {
  font-size: 18px;
  font-weight: bold;
  color: #1f2937;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-item {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: #ffffff;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-id {
  font-weight: bold;
  color: #1f2937;
}

.task-time {
  font-size: 16px;
  font-weight: bold;
  color: #059669;
}

.ticket-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.ticket-link {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.ticket-id {
  font-weight: bold;
  color: #3b82f6;
}

.ticket-week-badge {
  padding: 2px 8px;
  background-color: #fef3c7;
  color: #92400e;
  border-radius: 4px;
  font-size: 12px;
}

.ticket-title {
  color: #1f2937;
  margin-bottom: 4px;
}

.ticket-date {
  font-size: 12px;
  color: #6b7280;
}

.ticket-info--no-ticket {
  color: #9ca3af;
  font-style: italic;
}
</style>
```

### Расширение API для детальных данных

**Требуется добавить в backend endpoint:**

```php
// В api/tickets-time-tracking-sector-1c.php

// Новый параметр запроса
$includeDetail = isset($body['includeDetail']) ? (bool)$body['includeDetail'] : false;
$detailType = isset($body['detailType']) ? (string)$body['detailType'] : null;
$detailEmployeeId = isset($body['detailEmployeeId']) ? (int)$body['detailEmployeeId'] : null;
$detailWeekNumber = isset($body['detailWeekNumber']) ? (int)$body['detailWeekNumber'] : null;

// Если запрашиваются детальные данные
if ($includeDetail && $detailType) {
    $detailData = getDetailData($detailType, $detailEmployeeId, $detailWeekNumber, $allRecords, $tasks, $tickets);
    
    $response['detail'] = $detailData;
}

/**
 * Получение детальных данных для попапа
 */
function getDetailData(string $type, ?int $employeeId, ?int $weekNumber, array $records, array $tasks, array $tickets): array
{
    $filteredRecords = [];
    
    // Фильтрация записей по типу попапа
    foreach ($records as $record) {
        $recordWeekNumber = getWeekNumberByDate($record['CREATED_DATE'], $weeks);
        $recordEmployeeId = $record['USER_ID'];
        
        if ($type === 'cell') {
            if ($recordWeekNumber === $weekNumber && $recordEmployeeId === $employeeId) {
                $filteredRecords[] = $record;
            }
        } elseif ($type === 'employee') {
            if ($recordEmployeeId === $employeeId) {
                $filteredRecords[] = $record;
            }
        } elseif ($type === 'week') {
            if ($recordWeekNumber === $weekNumber) {
                $filteredRecords[] = $record;
            }
        }
    }
    
    // Группировка по задачам
    $tasksData = [];
    foreach ($filteredRecords as $record) {
        $taskId = $record['TASK_ID'];
        if (!isset($tasksData[$taskId])) {
            $tasksData[$taskId] = [
                'id' => $taskId,
                'elapsedTime' => 0,
                'records' => []
            ];
        }
        
        $elapsedTimeHours = ($record['MINUTES'] ?? 0) / 60;
        $tasksData[$taskId]['elapsedTime'] += $elapsedTimeHours;
        $tasksData[$taskId]['records'][] = $record;
    }
    
    // Добавление информации о тикетах
    $result = [];
    foreach ($tasksData as $taskId => $taskData) {
        $task = $tasks[$taskId] ?? null;
        $ticket = $tickets[$taskId] ?? null;
        
        $result[] = [
            'id' => $taskId,
            'elapsedTime' => round($taskData['elapsedTime'], 1),
            'ticket' => $ticket ? [
                'id' => $ticket['id'],
                'title' => $ticket['title'],
                'createdWeek' => getWeekNumberByDate($ticket['createdTime'], $weeks),
                'createdWeekStartUtc' => getWeekStartByNumber($ticket['createdWeek'], $weeks)
            ] : null
        ];
    }
    
    return [
        'tasks' => $result,
        'total' => [
            'elapsedTime' => array_sum(array_column($result, 'elapsedTime')),
            'tasksCount' => count($result),
            'ticketsCount' => count(array_filter($result, fn($t) => $t['ticket'] !== null))
        ]
    ];
}
```

## Ссылки на существующие попапы

**Изучить:**
- `vue-app/src/components/graph-admission-closure/ResponsibleModal.vue` — пример попапа с уровнями
- `vue-app/src/components/graph-state/EmployeeDetailsModal.vue` — пример попапа с детализацией

## История правок

- **2025-12-17 09:30 (UTC+3, Брест):** Создан этап frontend попапа детализации
- **2025-12-17 10:40 (UTC+3, Брест):** Добавлены детали:
  - Полный пример компонента попапа с кодом
  - Пример расширения API для детальных данных
  - Функции получения детальных данных
  - Стили для попапа
  - Визуальное выделение тикетов, созданных в другие недели

---

## Следующий этап

После завершения этого этапа переходить к **TASK-050-08: Frontend интеграция с дашбордом и навигация**

---

## История правок

- **2025-12-17 09:30 (UTC+3, Брест):** Создан этап frontend попапа детализации

