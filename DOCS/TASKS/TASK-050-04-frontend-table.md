# TASK-050-04: Frontend таблица трудозатрат

**Дата создания:** 2025-12-17 09:30 (UTC+3, Брест)  
**Статус:** 📋 Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Этап 4 из TASK-050  
**Зависимости:** TASK-050-03 (требуется завершение структуры компонентов)

---

## Цель этапа

Реализовать компонент таблицы трудозатрат, который отображает данные по неделям и сотрудникам. Таблица должна показывать сумму трудозатрат для каждого сотрудника за каждую неделю, а также итоговые значения.

---

## Контекст

- Модуль «Трудозатраты на Тикеты сектора 1С» (TASK-050) — 4-й модуль в дашборде сектора 1С
- Таблица — основной компонент отображения данных
- Неделя определяется по времени создания записи трудозатраты
- Трудозатраты могут относиться к тикетам, созданным в другие недели

---

## Задачи этапа

### 1. Создание компонента таблицы

**Файл:** `vue-app/src/components/tickets-time-tracking/TicketsTimeTrackingTable.vue`

**Структура таблицы:**
```
┌──────────────┬──────────┬──────────┬──────────┬──────────┬─────────┐
│  Сотрудник   │ Неделя 48│ Неделя 49│ Неделя 50│ Неделя 51│  Итого  │
│              │ (запись) │ (запись) │ (запись) │ (запись) │         │
├──────────────┼──────────┼──────────┼──────────┼──────────┼─────────┤
│  Иванов И.И. │  15.5 ч  │  12.0 ч  │  18.5 ч  │  16.0 ч  │  62.0 ч │
│  [клик]      │ [клик]   │ [клик]   │ [клик]   │ [клик]   │         │
│  Петров П.П. │  17.0 ч  │  14.5 ч  │  19.0 ч  │  17.5 ч  │  68.0 ч │
│  [клик]      │ [клик]   │ [клик]   │ [клик]   │ [клик]   │         │
├──────────────┼──────────┼──────────┼──────────┼──────────┼─────────┤
│  ВСЕГО       │  42.5 ч  │  36.0 ч  │  48.5 ч  │  44.0 ч  │ 171.0 ч │
│  (сумма)     │ (сумма)  │ (сумма)  │ (сумма)  │ (сумма)  │ (сумма) │
└──────────────┴──────────┴──────────┴──────────┴──────────┴─────────┘
```

### 2. Обработка данных для таблицы

**Логика:**
- Преобразовать данные из API в формат для таблицы
- Группировать по сотрудникам
- Группировать по неделям
- Рассчитать итоговые значения (по сотрудникам и по неделям)

**Структура данных:**
```javascript
{
  employees: [
    {
      id: 123,
      name: "Иванов Иван",
      weeks: {
        48: 15.5,
        49: 12.0,
        50: 18.5,
        51: 16.0
      },
      total: 62.0
    }
  ],
  weekTotals: {
    48: 42.5,
    49: 36.0,
    50: 48.5,
    51: 44.0
  },
  grandTotal: 171.0
}
```

### 3. Форматирование значений

**Логика:**
- Форматировать время в читаемый формат (например, "15.5 ч")
- Округление до 1 знака после запятой
- Обработка нулевых значений (показывать "0.0 ч" или "-")

### 4. Интерактивность

**Функционал:**
- Клик на ячейку → открытие попапа детализации (TASK-050-07)
- Клик на строку сотрудника → открытие попапа с детализацией сотрудника
- Клик на колонку недели → открытие попапа с детализацией недели

**Обработчики:**
```javascript
const handleCellClick = (employeeId, weekNumber) => {
  // Открыть попап детализации
  showDetailModal(employeeId, weekNumber);
};

const handleEmployeeClick = (employeeId) => {
  // Открыть попап с детализацией сотрудника
  showEmployeeDetailModal(employeeId);
};

const handleWeekClick = (weekNumber) => {
  // Открыть попап с детализацией недели
  showWeekDetailModal(weekNumber);
};
```

### 5. Адаптивность

**Мобильные устройства:**
- Таблица становится горизонтально прокручиваемой
- Фиксированная первая колонка (Сотрудник)
- Вертикальная прокрутка для большого количества сотрудников

**Стили:**
- Использовать scoped styles
- Адаптивные классы для мобильных устройств
- Соответствие стилям других модулей

---

## Технические требования

### Vue.js компонент

- Использовать Composition API (`<script setup>`)
- Props: `data` (данные из API), `loading`, `error`
- Emits: `cell-click`, `employee-click`, `week-click`

### Стили

- Таблица с границами (как в других модулях)
- Выделение строки при наведении
- Выделение ячейки при клике
- Стили для итоговой строки (жирный шрифт, другой фон)

### Производительность

- Виртуализация строк (если сотрудников много)
- Ленивая загрузка данных (если нужно)

---

## Критерии приёмки этапа

- [ ] Создан компонент `TicketsTimeTrackingTable.vue`
- [ ] Таблица отображает данные по сотрудникам и неделям
- [ ] Реализована итоговая строка (ВСЕГО)
- [ ] Реализована итоговая колонка (Итого по сотруднику)
- [ ] Значения форматируются корректно (часы с одним знаком после запятой)
- [ ] Реализована интерактивность (клик на ячейку, строку, колонку)
- [ ] Таблица адаптивна для мобильных устройств
- [ ] Стили соответствуют другим модулям
- [ ] Обработка пустых данных (показывать "-" или "0.0 ч")

---

## Дополнительные уточнения

- При реализации использовать примеры таблиц из других модулей (если есть)
- Обратить внимание на производительность при большом количестве данных
- Учесть возможность отсутствия данных за некоторые недели

## Примеры кода

### Структура компонента таблицы

**Пример из `vue-app/src/components/tickets-time-tracking/TicketsTimeTrackingTable.vue`:**

```vue
<template>
  <div class="ttt-table-container">
    <div v-if="loading" class="ttt-table-loading">
      Загрузка данных...
    </div>
    
    <div v-else-if="error" class="ttt-table-error">
      {{ error }}
    </div>
    
    <div v-else-if="!tableData || tableData.employees.length === 0" class="ttt-table-empty">
      Нет данных о трудозатратах за выбранный период
    </div>
    
    <table v-else class="ttt-table">
      <thead>
        <tr>
          <th class="ttt-table__header-employee">Сотрудник</th>
          <th 
            v-for="week in weeks" 
            :key="week.weekNumber"
            class="ttt-table__header-week"
            @click="handleWeekClick(week.weekNumber)"
          >
            Неделя {{ week.weekNumber }}<br>
            <span class="ttt-table__header-week-date">
              {{ formatWeekDate(week.weekStartUtc) }}
            </span>
          </th>
          <th class="ttt-table__header-total">Итого</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="employee in tableData.employees"
          :key="employee.id"
          class="ttt-table__row"
          @click="handleEmployeeClick(employee.id)"
        >
          <td class="ttt-table__cell-employee">
            {{ employee.name }}
          </td>
          <td
            v-for="week in weeks"
            :key="`${employee.id}-${week.weekNumber}`"
            class="ttt-table__cell-week"
            :class="{ 'ttt-table__cell--clickable': true }"
            @click.stop="handleCellClick(employee.id, week.weekNumber)"
          >
            {{ formatElapsedTime(getEmployeeWeekTime(employee.id, week.weekNumber)) }}
          </td>
          <td class="ttt-table__cell-total">
            <strong>{{ formatElapsedTime(employee.total) }}</strong>
          </td>
        </tr>
        <tr class="ttt-table__row-total">
          <td class="ttt-table__cell-employee">
            <strong>ВСЕГО</strong>
          </td>
          <td
            v-for="week in weeks"
            :key="`total-${week.weekNumber}`"
            class="ttt-table__cell-week"
            :class="{ 'ttt-table__cell--clickable': true }"
            @click="handleWeekClick(week.weekNumber)"
          >
            <strong>{{ formatElapsedTime(getWeekTotal(week.weekNumber)) }}</strong>
          </td>
          <td class="ttt-table__cell-total">
            <strong>{{ formatElapsedTime(tableData.grandTotal) }}</strong>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatElapsedTime } from '@/services/tickets-time-tracking/timeTrackingUtils.js';

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['cell-click', 'employee-click', 'week-click']);

// Преобразование данных для таблицы
const tableData = computed(() => {
  if (!props.data || !props.data.weeks) {
    return null;
  }
  
  const weeks = props.data.weeks || [];
  const employeesSummary = props.data.employeesSummary || [];
  
  // Создаём структуру для таблицы
  const employees = employeesSummary.map(emp => {
    const weeksData = {};
    let total = 0;
    
    weeks.forEach(week => {
      const weekEmployee = week.employees?.find(e => e.id === emp.id);
      const elapsedTime = weekEmployee?.elapsedTime || 0;
      weeksData[week.weekNumber] = elapsedTime;
      total += elapsedTime;
    });
    
    return {
      id: emp.id,
      name: emp.name,
      weeks: weeksData,
      total: total
    };
  });
  
  // Итоги по неделям
  const weekTotals = {};
  let grandTotal = 0;
  
  weeks.forEach(week => {
    weekTotals[week.weekNumber] = week.totalElapsedTime || 0;
    grandTotal += week.totalElapsedTime || 0;
  });
  
  return {
    employees,
    weekTotals,
    grandTotal
  };
});

const weeks = computed(() => {
  return props.data?.weeks || [];
});

// Методы для получения значений
const getEmployeeWeekTime = (employeeId, weekNumber) => {
  const employee = tableData.value?.employees.find(e => e.id === employeeId);
  return employee?.weeks[weekNumber] || 0;
};

const getWeekTotal = (weekNumber) => {
  return tableData.value?.weekTotals[weekNumber] || 0;
};

const formatWeekDate = (weekStartUtc) => {
  if (!weekStartUtc) return '';
  const date = new Date(weekStartUtc);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

// Обработчики событий
const handleCellClick = (employeeId, weekNumber) => {
  emit('cell-click', employeeId, weekNumber);
};

const handleEmployeeClick = (employeeId) => {
  emit('employee-click', employeeId);
};

const handleWeekClick = (weekNumber) => {
  emit('week-click', weekNumber);
};
</script>

<style scoped>
.ttt-table-container {
  padding: 20px;
  overflow-x: auto;
}

.ttt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.ttt-table__header-employee,
.ttt-table__cell-employee {
  text-align: left;
  padding: 12px;
  border: 1px solid #e5e7eb;
  background-color: #f9fafb;
  position: sticky;
  left: 0;
  z-index: 1;
}

.ttt-table__header-week,
.ttt-table__cell-week {
  text-align: center;
  padding: 12px;
  border: 1px solid #e5e7eb;
  min-width: 120px;
}

.ttt-table__header-total,
.ttt-table__cell-total {
  text-align: center;
  padding: 12px;
  border: 1px solid #e5e7eb;
  background-color: #f3f4f6;
  font-weight: bold;
}

.ttt-table__row:hover {
  background-color: #f9fafb;
}

.ttt-table__cell--clickable {
  cursor: pointer;
}

.ttt-table__cell--clickable:hover {
  background-color: #e5e7eb;
}

.ttt-table__row-total {
  background-color: #f3f4f6;
  font-weight: bold;
}

/* Адаптивность для мобильных */
@media (max-width: 768px) {
  .ttt-table-container {
    overflow-x: scroll;
  }
  
  .ttt-table__header-employee,
  .ttt-table__cell-employee {
    position: sticky;
    left: 0;
    background-color: #f9fafb;
    z-index: 2;
  }
}
</style>
```

### Обработка данных для таблицы

**Пример функции преобразования данных:**

```javascript
/**
 * Преобразование данных API в формат для таблицы
 * 
 * @param {object} apiData Данные из API
 * @returns {object} Данные для таблицы
 */
export function prepareTableData(apiData) {
  if (!apiData || !apiData.weeks) {
    return {
      employees: [],
      weekTotals: {},
      grandTotal: 0
    };
  }
  
  const weeks = apiData.weeks || [];
  const employeesSummary = apiData.employeesSummary || [];
  
  // Создаём map для быстрого доступа
  const employeesMap = new Map();
  
  // Инициализация сотрудников
  employeesSummary.forEach(emp => {
    employeesMap.set(emp.id, {
      id: emp.id,
      name: emp.name,
      weeks: {},
      total: 0
    });
  });
  
  // Заполнение данных по неделям
  const weekTotals = {};
  let grandTotal = 0;
  
  weeks.forEach(week => {
    const weekNumber = week.weekNumber;
    weekTotals[weekNumber] = week.totalElapsedTime || 0;
    grandTotal += week.totalElapsedTime || 0;
    
    (week.employees || []).forEach(weekEmployee => {
      const employee = employeesMap.get(weekEmployee.id);
      if (employee) {
        employee.weeks[weekNumber] = weekEmployee.elapsedTime || 0;
        employee.total += weekEmployee.elapsedTime || 0;
      }
    });
  });
  
  return {
    employees: Array.from(employeesMap.values()),
    weekTotals,
    grandTotal
  };
}
```

## Ссылки на существующие компоненты

**Изучить:**
- `vue-app/src/components/graph-admission-closure/GraphAdmissionClosureChart.vue` — пример работы с данными
- Другие таблицы в проекте (если есть) для понимания стилей

## История правок

- **2025-12-17 09:30 (UTC+3, Брест):** Создан этап frontend таблицы трудозатрат
- **2025-12-17 10:40 (UTC+3, Брест):** Добавлены детали:
  - Полный пример компонента таблицы с кодом
  - Функции преобразования данных
  - Стили для таблицы
  - Адаптивность для мобильных устройств
  - Обработчики событий

---

## Следующий этап

После завершения этого этапа переходить к **TASK-050-05: Frontend summary-карточки**

---

## История правок

- **2025-12-17 09:30 (UTC+3, Брест):** Создан этап frontend таблицы трудозатрат

