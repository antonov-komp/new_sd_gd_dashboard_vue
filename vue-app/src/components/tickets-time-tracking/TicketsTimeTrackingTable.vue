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
    
    <div v-else class="ttt-table-wrapper">
      <table class="ttt-table">
        <thead>
          <tr>
            <th class="ttt-table__header-employee">Сотрудник</th>
            <th 
              v-for="week in weeks" 
              :key="week.weekNumber"
              class="ttt-table__header-week"
              :class="{ 'ttt-table__header--clickable': true }"
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
            :class="{ 'ttt-table__row--clickable': true }"
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

const weeks = computed(() => {
  return props.data?.data?.weeks || [];
});

// Преобразование данных для таблицы
const tableData = computed(() => {
  if (!props.data || !props.data.data || !props.data.data.weeks) {
    return null;
  }
  
  const weeksData = props.data.data.weeks || [];
  const employeesSummary = props.data.data.employeesSummary || [];
  
  // Создаём структуру для таблицы
  const employees = employeesSummary.map(emp => {
    const weeksDataMap = {};
    let total = 0;
    
    weeksData.forEach(week => {
      const weekEmployee = week.employees?.find(e => e.id === emp.id);
      const elapsedTime = weekEmployee?.elapsedTime || 0;
      weeksDataMap[week.weekNumber] = elapsedTime;
      total += elapsedTime;
    });
    
    return {
      id: emp.id,
      name: emp.name,
      weeks: weeksDataMap,
      total: total
    };
  });
  
  // Итоги по неделям
  const weekTotals = {};
  let grandTotal = 0;
  
  weeksData.forEach(week => {
    weekTotals[week.weekNumber] = week.totalElapsedTime || 0;
    grandTotal += week.totalElapsedTime || 0;
  });
  
  return {
    employees,
    weekTotals,
    grandTotal
  };
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
  try {
    const date = new Date(weekStartUtc);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch (error) {
    return '';
  }
};

// Обработчики событий
const handleCellClick = (employeeId, weekNumber) => {
  const employee = tableData.value?.employees.find(e => e.id === employeeId);
  const week = weeks.value.find(w => w.weekNumber === weekNumber);
  
  if (employee && week) {
    emit('cell-click', {
      employee,
      week,
      elapsedTime: getEmployeeWeekTime(employeeId, weekNumber)
    });
  }
};

const handleEmployeeClick = (employeeId) => {
  const employee = tableData.value?.employees.find(e => e.id === employeeId);
  if (employee) {
    emit('employee-click', {
      employee,
      weeks: weeks.value.map(week => ({
        week,
        elapsedTime: getEmployeeWeekTime(employeeId, week.weekNumber)
      }))
    });
  }
};

const handleWeekClick = (weekNumber) => {
  const week = weeks.value.find(w => w.weekNumber === weekNumber);
  if (week) {
    emit('week-click', {
      week,
      employees: tableData.value?.employees.map(emp => ({
        employee: emp,
        elapsedTime: getEmployeeWeekTime(emp.id, weekNumber)
      })).filter(item => item.elapsedTime > 0)
    });
  }
};
</script>

<style scoped>
.ttt-table-container {
  padding: 20px;
}

.ttt-table-loading,
.ttt-table-error,
.ttt-table-empty {
  padding: 40px;
  text-align: center;
  color: #666;
}

.ttt-table-error {
  color: #dc3545;
}

.ttt-table-wrapper {
  overflow-x: auto;
  border: 1px solid #dee2e6;
  border-radius: 4px;
}

.ttt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  background-color: white;
  min-width: 600px;
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
  min-width: 150px;
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
  min-width: 100px;
}

.ttt-table__header-week-date {
  font-size: 11px;
  color: #666;
  font-weight: normal;
}

.ttt-table__header--clickable {
  cursor: pointer;
  transition: background-color 0.2s;
}

.ttt-table__header--clickable:hover {
  background-color: #e5e7eb;
}

.ttt-table__row {
  transition: background-color 0.2s;
}

.ttt-table__row:hover {
  background-color: #f9fafb;
}

.ttt-table__row--clickable {
  cursor: pointer;
}

.ttt-table__cell--clickable {
  cursor: pointer;
  transition: background-color 0.2s;
}

.ttt-table__cell--clickable:hover {
  background-color: #e5e7eb;
}

.ttt-table__row-total {
  background-color: #f3f4f6;
  font-weight: bold;
}

.ttt-table__row-total:hover {
  background-color: #e5e7eb;
}

/* Адаптивность для мобильных */
@media (max-width: 768px) {
  .ttt-table-container {
    padding: 10px;
  }
  
  .ttt-table-wrapper {
    overflow-x: scroll;
    -webkit-overflow-scrolling: touch;
  }
  
  .ttt-table__header-employee,
  .ttt-table__cell-employee {
    position: sticky;
    left: 0;
    background-color: #f9fafb;
    z-index: 2;
    box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
  }
  
  .ttt-table__row-total .ttt-table__cell-employee {
    background-color: #f3f4f6;
  }
  
  .ttt-table {
    font-size: 12px;
  }
  
  .ttt-table__header-week,
  .ttt-table__cell-week {
    min-width: 100px;
    padding: 8px;
  }
}
</style>

