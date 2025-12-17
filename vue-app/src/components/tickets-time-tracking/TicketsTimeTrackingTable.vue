<template>
  <div class="time-tracking-table">
    <table class="table">
      <thead>
        <tr>
          <th>Сотрудник</th>
          <th v-for="week in weeks" :key="week.weekNumber">
            Неделя {{ week.weekNumber }}
          </th>
          <th>Итого</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="employee in employeesSummary" :key="employee.id">
          <td>{{ employee.name }}</td>
          <td 
            v-for="week in weeks" 
            :key="week.weekNumber"
            class="cell-clickable"
            @click="handleCellClick(week, employee)"
          >
            {{ formatElapsedTime(getEmployeeWeekTime(week, employee.id)) }}
          </td>
          <td class="total-cell">
            {{ formatElapsedTime(employee.totalElapsedTime) }}
          </td>
        </tr>
        <tr class="total-row">
          <td><strong>ВСЕГО</strong></td>
          <td 
            v-for="week in weeks" 
            :key="week.weekNumber"
            class="total-cell"
          >
            {{ formatElapsedTime(week.totalElapsedTime) }}
          </td>
          <td class="total-cell">
            {{ formatElapsedTime(data.data.totalElapsedTime) }}
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
  }
});

const emit = defineEmits(['cell-click']);

const weeks = computed(() => {
  return props.data.data.weeks || [];
});

const employeesSummary = computed(() => {
  return props.data.data.employeesSummary || [];
});

const getEmployeeWeekTime = (week, employeeId) => {
  if (!week.employees) {
    return 0;
  }
  
  const employee = week.employees.find(emp => emp.id === employeeId);
  return employee ? (employee.elapsedTime || 0) : 0;
};

const handleCellClick = (week, employee) => {
  emit('cell-click', {
    week,
    employee,
    elapsedTime: getEmployeeWeekTime(week, employee.id)
  });
};
</script>

<style scoped>
.time-tracking-table {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
}

.table th,
.table td {
  padding: 12px;
  text-align: left;
  border: 1px solid #dee2e6;
}

.table th {
  background-color: #f8f9fa;
  font-weight: bold;
}

.cell-clickable {
  cursor: pointer;
  transition: background-color 0.2s;
}

.cell-clickable:hover {
  background-color: #e9ecef;
}

.total-cell {
  font-weight: bold;
  background-color: #f8f9fa;
}

.total-row {
  background-color: #f8f9fa;
}
</style>

