# TASK-050-03: Frontend структура компонентов и сервисов

**Дата создания:** 2025-12-17 09:30 (UTC+3, Брест)  
**Статус:** 📋 Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Этап 3 из TASK-050  
**Зависимости:** TASK-050-02 (требуется завершение backend API endpoint)

---

## Цель этапа

Создать структуру Vue.js компонентов и сервисов для модуля «Трудозатраты на Тикеты сектора 1С». Подготовить базовую инфраструктуру для работы с API и обработки данных.

---

## Контекст

- Модуль «Трудозатраты на Тикеты сектора 1С» (TASK-050) — 4-й модуль в дашборде сектора 1С
- Использовать Vue.js 3.x (Composition API), как в других модулях сектора 1С
- Структура должна быть аналогична существующим модулям (GraphState, GraphAdmissionClosure)

---

## Задачи этапа

### 1. Создание структуры папок

**Структура:**
```
vue-app/src/
├── components/
│   └── tickets-time-tracking/
│       ├── TicketsTimeTrackingDashboard.vue
│       ├── TicketsTimeTrackingTable.vue
│       ├── TicketsTimeTrackingSummary.vue
│       ├── TicketsTimeTrackingChart.vue (опционально)
│       └── TimeTrackingDetailModal.vue (для попапа детализации)
├── services/
│   └── tickets-time-tracking/
│       ├── timeTrackingService.js
│       └── timeTrackingUtils.js
└── config/
    └── time-tracking-config.js (если нужна)
```

### 2. Создание сервиса для работы с API

**Файл:** `vue-app/src/services/tickets-time-tracking/timeTrackingService.js`

**Функционал:**
- Метод `getTimeTrackingData(params)` — получение данных о трудозатратах
- Обработка ошибок API
- Кеширование данных (если нужно)
- Форматирование ответа API для использования в компонентах

**Пример использования:**
```javascript
import { timeTrackingService } from '@/services/tickets-time-tracking/timeTrackingService.js';

const data = await timeTrackingService.getTimeTrackingData({
  product: '1C',
  weekStartUtc: '2025-12-15T00:00:00Z',
  weekEndUtc: '2025-12-21T23:59:59Z',
  weeksCount: 4
});
```

### 3. Создание утилит для обработки данных

**Файл:** `vue-app/src/services/tickets-time-tracking/timeTrackingUtils.js`

**Функционал:**
- `formatElapsedTime(hours)` — форматирование времени (часы → "X.X ч")
- `aggregateByWeek(data)` — агрегация данных по неделям
- `aggregateByEmployee(data)` — агрегация данных по сотрудникам
- `getWeekLabel(weekNumber, weekStartUtc)` — получение метки недели
- `calculateSummary(data)` — расчёт summary-метрик (общая сумма, средняя)

### 4. Создание главного компонента дашборда

**Файл:** `vue-app/src/components/tickets-time-tracking/TicketsTimeTrackingDashboard.vue`

**Структура компонента:**
- Composition API (setup)
- Состояния: loading, error, data
- Методы: loadData, handleFilterChange
- Шаблон: заголовок, фильтры, summary-карточки, таблица, графики

**Базовый каркас:**
```vue
<template>
  <div class="tickets-time-tracking-dashboard">
    <!-- Breadcrumbs -->
    <!-- Заголовок -->
    <!-- Фильтры -->
    <!-- Summary-карточки -->
    <!-- Таблица -->
    <!-- Графики (опционально) -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { timeTrackingService } from '@/services/tickets-time-tracking/timeTrackingService.js';

// Состояния
const loading = ref(false);
const error = ref(null);
const data = ref(null);

// Методы
const loadData = async () => {
  // Загрузка данных
};

onMounted(() => {
  loadData();
});
</script>
```

### 5. Изучение существующих компонентов

**Что изучить:**
- `vue-app/src/components/graph-admission-closure/GraphAdmissionClosureDashboard.vue` — структура дашборда
- `vue-app/src/components/graph-state/GraphStateDashboard.vue` — навигация и breadcrumbs
- `vue-app/src/services/graph-admission-closure/admissionClosureService.js` — пример сервиса

**Принципы:**
- Использовать те же паттерны, что и в существующих модулях
- Сохранить единообразие стилей и структуры
- Использовать те же утилиты для форматирования (если применимо)

---

## Технические требования

### Vue.js 3.x (Composition API)

- Использовать `<script setup>` синтаксис
- Использовать `ref`, `computed`, `onMounted` и другие композиции
- Избегать Options API

### Стили

- Использовать scoped styles в компонентах
- Использовать CSS-переменные из существующих модулей (если применимо)
- Адаптивность для мобильных устройств

### Обработка состояний

- Состояние загрузки (loading)
- Состояние ошибки (error)
- Состояние пустых данных (empty)
- Состояние успешной загрузки (data)

---

## Критерии приёмки этапа

- [ ] Создана структура папок для компонентов и сервисов
- [ ] Создан сервис `timeTrackingService.js` с методом получения данных
- [ ] Созданы утилиты `timeTrackingUtils.js` для обработки данных
- [ ] Создан базовый каркас `TicketsTimeTrackingDashboard.vue`
- [ ] Изучены существующие компоненты и применены те же принципы
- [ ] Компоненты используют Vue.js 3.x (Composition API)
- [ ] Добавлена обработка состояний (loading, error, empty)
- [ ] Код соответствует стандартам проекта

---

## Дополнительные уточнения

- При создании сервиса использовать примеры из `admissionClosureService.js`
- Обратить внимание на обработку ошибок и таймаутов
- Учесть возможность пустых данных

## Примеры кода из существующих модулей

### Структура сервиса

**Пример из `vue-app/src/services/graph-admission-closure/admissionClosureService.js`:**

```javascript
/**
 * Сервис для работы с модулем «Трудозатраты на Тикеты сектора 1С»
 *
 * Использует REST-эндпоинт бэкенда:
 * - POST /api/tickets-time-tracking-sector-1c.php
 *
 * Документация (контракт зафиксирован в TASK-050-02):
 * - meta { weekNumber, weekStartUtc, weekEndUtc, totalWeeks, sector1CEmployeesCount }
 * - data { totalElapsedTime, totalElapsedTimeUnit, totalRecordsCount, weeks[], employeesSummary[] }
 */

const DEFAULT_ENDPOINT = '/api/tickets-time-tracking-sector-1c.php';

/**
 * Нормализует ответ бэкенда в ожидаемый формат фронта.
 * Гарантирует наличие meta/data и пустых значений по умолчанию.
 */
function normalizeResponse(raw) {
  if (!raw) {
    return {
      meta: null,
      data: {
        totalElapsedTime: 0,
        totalElapsedTimeUnit: 'hours',
        totalRecordsCount: 0,
        weeks: [],
        employeesSummary: []
      }
    };
  }

  const payload = raw.data || raw.result || raw;
  const meta = payload.meta || raw.meta || null;

  return {
    meta: {
      ...meta,
      currentWeek: meta?.currentWeek || (meta ? {
        weekNumber: meta.weekNumber,
        weekStartUtc: meta.weekStartUtc,
        weekEndUtc: meta.weekEndUtc
      } : null),
      weeks: meta?.weeks || []
    },
    data: {
      totalElapsedTime: payload.data?.totalElapsedTime ?? 0,
      totalElapsedTimeUnit: payload.data?.totalElapsedTimeUnit ?? 'hours',
      totalRecordsCount: payload.data?.totalRecordsCount ?? 0,
      weeks: payload.data?.weeks || [],
      employeesSummary: payload.data?.employeesSummary || []
    }
  };
}

/**
 * Получение данных о трудозатратах
 * 
 * @param {object} params Параметры запроса
 * @param {string} params.product Фильтр по продукту (default: '1C')
 * @param {string} params.weekStartUtc Начало недели (ISO-8601, UTC, optional)
 * @param {string} params.weekEndUtc Конец недели (ISO-8601, UTC, optional)
 * @param {number} params.weeksCount Количество недель (default: 4)
 * @returns {Promise<object>} Нормализованные данные
 */
export async function getTimeTrackingData(params = {}) {
  const {
    product = '1C',
    weekStartUtc = null,
    weekEndUtc = null,
    weeksCount = 4
  } = params;

  try {
    const response = await fetch(DEFAULT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product,
        weekStartUtc,
        weekEndUtc,
        weeksCount
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const raw = await response.json();
    
    if (raw.error) {
      throw new Error(raw.error_description || raw.error);
    }

    return normalizeResponse(raw);
  } catch (error) {
    console.error('Error fetching time tracking data:', error);
    throw error;
  }
}

export const timeTrackingService = {
  getTimeTrackingData
};
```

### Структура утилит

**Пример из `vue-app/src/services/tickets-time-tracking/timeTrackingUtils.js`:**

```javascript
/**
 * Утилиты для обработки данных о трудозатратах
 */

/**
 * Форматирование времени в читаемый формат
 * 
 * @param {number} hours Часы (может быть дробным)
 * @returns {string} Отформатированная строка (например, "15.5 ч")
 */
export function formatElapsedTime(hours) {
  if (hours === null || hours === undefined || isNaN(hours)) {
    return '0.0 ч';
  }
  
  return `${hours.toFixed(1)} ч`;
}

/**
 * Агрегация данных по неделям
 * 
 * @param {array} data Данные из API
 * @returns {object} Агрегированные данные по неделям
 */
export function aggregateByWeek(data) {
  const weeks = data.weeks || [];
  
  return weeks.reduce((acc, week) => {
    acc[week.weekNumber] = {
      weekNumber: week.weekNumber,
      weekStartUtc: week.weekStartUtc,
      weekEndUtc: week.weekEndUtc,
      totalElapsedTime: week.totalElapsedTime,
      recordsCount: week.recordsCount,
      employees: week.employees || []
    };
    return acc;
  }, {});
}

/**
 * Агрегация данных по сотрудникам
 * 
 * @param {array} data Данные из API
 * @returns {object} Агрегированные данные по сотрудникам
 */
export function aggregateByEmployee(data) {
  const employeesSummary = data.employeesSummary || [];
  
  return employeesSummary.reduce((acc, employee) => {
    acc[employee.id] = {
      id: employee.id,
      name: employee.name,
      totalElapsedTime: employee.totalElapsedTime,
      totalRecordsCount: employee.totalRecordsCount,
      totalTasksCount: employee.totalTasksCount,
      totalTicketsCount: employee.totalTicketsCount
    };
    return acc;
  }, {});
}

/**
 * Получение метки недели для отображения
 * 
 * @param {number} weekNumber Номер недели
 * @param {string} weekStartUtc Начало недели (ISO-8601)
 * @returns {string} Метка недели (например, "Неделя 50 (15-21 дек)")
 */
export function getWeekLabel(weekNumber, weekStartUtc) {
  if (!weekStartUtc) {
    return `Неделя ${weekNumber}`;
  }
  
  const date = new Date(weekStartUtc);
  const day = date.getDate();
  const month = date.toLocaleString('ru-RU', { month: 'short' });
  
  return `Неделя ${weekNumber} (${day} ${month})`;
}

/**
 * Расчёт summary-метрик
 * 
 * @param {object} data Данные из API
 * @returns {object} Summary-метрики
 */
export function calculateSummary(data) {
  const totalElapsedTime = data.totalElapsedTime || 0;
  const employeesCount = data.employeesSummary?.length || 0;
  const averageTime = employeesCount > 0 
    ? totalElapsedTime / employeesCount 
    : 0;
  
  return {
    totalElapsedTime: round(totalElapsedTime, 1),
    employeesCount,
    averageTime: round(averageTime, 2)
  };
}

function round(value, decimals) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
```

### Структура главного компонента

**Пример из `vue-app/src/components/graph-admission-closure/GraphAdmissionClosureDashboard.vue`:**

```vue
<template>
  <div class="ttt-dashboard">
    <LoadingSpinner v-if="isLoading" message="Загрузка данных о трудозатратах..." />

    <div v-else>
      <div class="dashboard-header">
        <div class="header-content">
          <div class="breadcrumbs-row">
            <button
              class="btn-back-link"
              type="button"
              @click="handleBack"
              :aria-label="backAriaLabel"
              :aria-disabled="!hasHistory"
              :data-fallback="!hasHistory"
              :disabled="isNavigatingBack"
              title="Назад"
            >
              ←
            </button>
            <nav class="breadcrumbs" aria-label="Навигация">
              <router-link 
                :to="{ name: 'dashboard-sector-1c' }"
                class="breadcrumb-link"
              >
                Дашборд сектора 1С
              </router-link>
              <span class="breadcrumb-separator">/</span>
              <router-link 
                :to="{ name: 'dashboard-graph-state' }"
                class="breadcrumb-link"
              >
                График состояния
              </router-link>
              <span class="breadcrumb-separator">/</span>
              <router-link 
                :to="{ name: 'dashboard-graph-admission-closure' }"
                class="breadcrumb-link"
              >
                График приёма и закрытий
              </router-link>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-current">Трудозатраты</span>
            </nav>
          </div>
          <h1 class="dashboard-title">Трудозатраты на Тикеты сектора 1С</h1>
        </div>
      </div>

      <div class="dashboard-layout">
        <StatusMessage
          v-if="error"
          type="error"
          title="Ошибка загрузки"
          :message="error.message"
        />

        <TicketsTimeTrackingSummary
          v-if="!error && data"
          :data="data"
        />

        <TicketsTimeTrackingTable
          v-if="!error && data"
          :data="data"
          @cell-click="handleCellClick"
          @employee-click="handleEmployeeClick"
          @week-click="handleWeekClick"
        />

        <TicketsTimeTrackingChart
          v-if="!error && data && showCharts"
          :data="data"
          @point-click="handlePointClick"
          @bar-click="handleBarClick"
        />
      </div>
    </div>

    <TimeTrackingDetailModal
      :is-visible="showDetailModal"
      :type="detailModalType"
      :employee-id="selectedEmployeeId"
      :week-number="selectedWeekNumber"
      @close="showDetailModal = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { timeTrackingService } from '@/services/tickets-time-tracking/timeTrackingService.js';
import TicketsTimeTrackingSummary from './TicketsTimeTrackingSummary.vue';
import TicketsTimeTrackingTable from './TicketsTimeTrackingTable.vue';
import TicketsTimeTrackingChart from './TicketsTimeTrackingChart.vue';
import TimeTrackingDetailModal from './TimeTrackingDetailModal.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import StatusMessage from '@/components/common/StatusMessage.vue';

const router = useRouter();

// Состояния
const isLoading = ref(false);
const error = ref(null);
const data = ref(null);
const showDetailModal = ref(false);
const detailModalType = ref('cell');
const selectedEmployeeId = ref(null);
const selectedWeekNumber = ref(null);
const showCharts = ref(false); // Опционально

// Навигация
const hasHistory = computed(() => window.history.length > 1);
const backAriaLabel = 'Вернуться к предыдущей странице';
const isNavigatingBack = ref(false);

// Методы
const loadData = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    const result = await timeTrackingService.getTimeTrackingData({
      product: '1C',
      weeksCount: 4
    });
    
    data.value = result.data;
  } catch (err) {
    error.value = {
      message: err.message || 'Ошибка загрузки данных о трудозатратах'
    };
    console.error('Error loading time tracking data:', err);
  } finally {
    isLoading.value = false;
  }
};

const handleBack = () => {
  if (hasHistory.value) {
    isNavigatingBack.value = true;
    router.back();
  } else {
    router.push({ name: 'dashboard-sector-1c' });
  }
};

const handleCellClick = (employeeId, weekNumber) => {
  detailModalType.value = 'cell';
  selectedEmployeeId.value = employeeId;
  selectedWeekNumber.value = weekNumber;
  showDetailModal.value = true;
};

const handleEmployeeClick = (employeeId) => {
  detailModalType.value = 'employee';
  selectedEmployeeId.value = employeeId;
  selectedWeekNumber.value = null;
  showDetailModal.value = true;
};

const handleWeekClick = (weekNumber) => {
  detailModalType.value = 'week';
  selectedEmployeeId.value = null;
  selectedWeekNumber.value = weekNumber;
  showDetailModal.value = true;
};

onMounted(() => {
  loadData();
});
</script>
```

## Ссылки на существующие компоненты

**Изучить структуру:**
- `vue-app/src/components/graph-admission-closure/GraphAdmissionClosureDashboard.vue` — структура дашборда
- `vue-app/src/components/graph-state/GraphStateDashboard.vue` — навигация и breadcrumbs
- `vue-app/src/components/common/LoadingSpinner.vue` — компонент загрузки
- `vue-app/src/components/common/StatusMessage.vue` — компонент сообщений об ошибках

**Изучить сервисы:**
- `vue-app/src/services/graph-admission-closure/admissionClosureService.js` — пример сервиса
- `vue-app/src/services/dashboard-sector-1c/utils/ticket-utils.js` — утилиты для работы с данными

## История правок

- **2025-12-17 09:30 (UTC+3, Брест):** Создан этап frontend структуры компонентов и сервисов
- **2025-12-17 10:40 (UTC+3, Брест):** Добавлены детали:
  - Примеры кода сервиса и утилит
  - Пример структуры главного компонента
  - Ссылки на существующие компоненты для изучения
  - Детальные примеры использования Composition API

---

## Следующий этап

После завершения этого этапа переходить к **TASK-050-04: Frontend таблица трудозатрат**

---

## История правок

- **2025-12-17 09:30 (UTC+3, Брест):** Создан этап frontend структуры компонентов и сервисов

