<template>
  <div class="line-chart-months">
    <!-- График "Новые и Закрытые тикеты" -->
    <div class="chart-section">
      <h3 class="chart-title">Новые и Закрытые тикеты</h3>
      <div class="chart-container">
        <Line :data="newClosedChartData" :options="chartOptions" />
      </div>
    </div>
    
    <!-- График "Переходящие тикеты" -->
    <div class="chart-section">
      <h3 class="chart-title">Переходящие тикеты</h3>
      <div class="chart-container">
        <Line :data="carryoverChartData" :options="chartOptions" />
      </div>
    </div>
    
    <!-- Табличная часть с детализацией -->
    <div class="chart-table-section">
      <h3 class="chart-title">Детализация по месяцам и неделям</h3>
      <div class="chart-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th class="month-header-cell">Месяц</th>
              <th
                v-for="week in allWeeks"
                :key="`week-${week}`"
                class="week-header-cell"
              >
                Неделя {{ week }}
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Строка: Новые тикеты -->
            <tr class="data-row data-row--new">
              <td class="data-type-cell">Новые</td>
              <td
                v-for="week in allWeeks"
                :key="`new-${week}`"
                class="week-data-cell"
              >
                {{ getWeekData('new', week) }}
              </td>
            </tr>
            <!-- Строка: Закрытые тикеты -->
            <tr class="data-row data-row--closed">
              <td class="data-type-cell">Закрытые</td>
              <td
                v-for="week in allWeeks"
                :key="`closed-${week}`"
                class="week-data-cell"
              >
                {{ getWeekData('closed', week) }}
              </td>
            </tr>
            <!-- Строка: Переходящие тикеты -->
            <tr class="data-row data-row--carryover">
              <td class="data-type-cell">Переходящие</td>
              <td
                v-for="week in allWeeks"
                :key="`carryover-${week}`"
                class="week-data-cell"
              >
                {{ getWeekData('carryover', week) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import { chartColors } from '@/utils/chart-config.js';

const props = defineProps({
  data: {
    type: Object,
    required: true,
    default: () => ({
      newTicketsByMonth: [],
      closedTicketsByMonth: [],
      carryoverTicketsByMonth: []
    })
  },
  meta: {
    type: Object,
    default: () => ({
      months: []
    })
  }
});

/**
 * Форматирование числа
 */
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  
  if (num >= 1000) {
    return num.toLocaleString('ru-RU');
  }
  
  return num.toString();
}

/**
 * Получить все уникальные номера недель из данных
 */
const allWeeks = computed(() => {
  const weeks = new Set();
  
  // Собираем недели из всех месяцев
  props.data.newTicketsByMonth?.forEach(month => {
    if (month.weeks && Array.isArray(month.weeks)) {
      month.weeks.forEach(week => {
        if (week && week.weekNumber) {
          weeks.add(week.weekNumber);
        }
      });
    }
  });
  
  props.data.closedTicketsByMonth?.forEach(month => {
    if (month.weeks && Array.isArray(month.weeks)) {
      month.weeks.forEach(week => {
        if (week && week.weekNumber) {
          weeks.add(week.weekNumber);
        }
      });
    }
  });
  
  props.data.carryoverTicketsByMonth?.forEach(month => {
    if (month.weeks && Array.isArray(month.weeks)) {
      month.weeks.forEach(week => {
        if (week && week.weekNumber) {
          weeks.add(week.weekNumber);
        }
      });
    }
  });
  
  return Array.from(weeks).sort((a, b) => a - b);
});

/**
 * Получить данные для графика "Новые и Закрытые"
 */
const newClosedChartData = computed(() => {
  const months = props.data.newTicketsByMonth || [];
  const labels = months.map(m => m.monthName || `Месяц ${m.month}`);
  
  const newData = months.map(m => m.count || 0);
  const closedData = (props.data.closedTicketsByMonth || []).map(m => m.count || 0);
  
  return {
    labels,
    datasets: [
      {
        label: 'Новые тикеты',
        data: newData,
        borderColor: chartColors.primary,
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        tension: 0.4,
        fill: false
      },
      {
        label: 'Закрытые тикеты',
        data: closedData,
        borderColor: chartColors.success,
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        tension: 0.4,
        fill: false
      }
    ]
  };
});

/**
 * Получить данные для графика "Переходящие"
 */
const carryoverChartData = computed(() => {
  const months = props.data.carryoverTicketsByMonth || [];
  const labels = months.map(m => m.monthName || `Месяц ${m.month}`);
  
  const carryoverData = months.map(m => m.count || 0);
  
  return {
    labels,
    datasets: [
      {
        label: 'Переходящие тикеты',
        data: carryoverData,
        borderColor: chartColors.carryover,
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        tension: 0.4,
        fill: false
      }
    ]
  };
});

/**
 * Настройки графика
 */
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        font: {
          size: 14,
          weight: '500'
        },
        padding: 16,
        boxWidth: 20,
        boxHeight: 12
      }
    },
    tooltip: {
      enabled: true,
      titleFont: {
        size: 14,
        weight: 'bold'
      },
      bodyFont: {
        size: 13
      },
      padding: 12
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
        font: {
          size: 14
        },
        padding: 10
      },
      grid: {
        lineWidth: 1.5
      }
    },
    x: {
      ticks: {
        maxRotation: 0,
        minRotation: 0,
        font: {
          size: 14
        },
        padding: 10
      },
      grid: {
        lineWidth: 1.5
      }
    }
  }
};

/**
 * Получить данные для недели в таблице
 * 
 * @param {string} type - Тип данных: 'new', 'closed', 'carryover'
 * @param {number} weekNumber - Номер недели
 * @returns {string} Значение или '-'
 */
function getWeekData(type, weekNumber) {
  let months = [];
  
  switch (type) {
    case 'new':
      months = props.data.newTicketsByMonth || [];
      break;
    case 'closed':
      months = props.data.closedTicketsByMonth || [];
      break;
    case 'carryover':
      months = props.data.carryoverTicketsByMonth || [];
      break;
    default:
      return '-';
  }
  
  // Ищем неделю во всех месяцах
  // Неделя может быть в нескольких месяцах (на границе месяцев)
  // Берем первое найденное значение
  for (const month of months) {
    if (!month.weeks || !Array.isArray(month.weeks)) {
      continue;
    }
    
    const week = month.weeks.find(w => w && w.weekNumber === weekNumber);
    if (week) {
      // Для новых тикетов: week.count
      // Для закрытых: week.count (общее) или можно использовать week.closedCreatedThisWeek + week.closedCreatedOtherWeek
      // Для переходящих: week.count (общее) или можно использовать week.carryoverCreatedThisWeek + week.carryoverCreatedOtherWeek
      const count = week.count || 0;
      return count > 0 ? formatNumber(count) : '-';
    }
  }
  
  return '-';
}
</script>

<style scoped>
.line-chart-months {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl, 24px);
  margin-bottom: var(--spacing-xl, 24px);
}

.chart-section {
  width: 100%;
  background-color: var(--b24-bg-white, #ffffff);
  border: 1px solid var(--b24-border-light, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  padding: var(--spacing-lg, 20px);
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
}

.chart-title {
  margin: 0 0 var(--spacing-md, 16px) 0;
  font-size: var(--font-size-lg, 16px);
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
}

.chart-container {
  width: 100%;
  height: 400px;
  position: relative;
}

.chart-table-section {
  width: 100%;
  background-color: var(--b24-bg-white, #ffffff);
  border: 1px solid var(--b24-border-light, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  padding: var(--spacing-lg, 20px);
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
}

.chart-table-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.data-table {
  width: 100%;
  min-width: 600px;
  border-collapse: collapse;
  font-size: var(--font-size-sm, 14px);
}

.data-table th,
.data-table td {
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  text-align: center;
  border: 1px solid var(--b24-border-light, #e5e7eb);
}

.data-table th {
  background-color: var(--b24-bg-light, #f9fafb);
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
  position: sticky;
  top: 0;
  z-index: 10;
}

.month-header-cell {
  position: sticky;
  left: 0;
  z-index: 11;
  background-color: var(--b24-bg-light, #f9fafb);
  text-align: left;
  min-width: 120px;
}

.data-type-cell {
  font-weight: 600;
  text-align: left;
  background-color: var(--b24-bg-light, #f9fafb);
  position: sticky;
  left: 0;
  z-index: 9;
  min-width: 120px;
}

.week-header-cell {
  min-width: 100px;
  white-space: nowrap;
}

.week-data-cell {
  min-width: 100px;
  color: var(--b24-text-primary, #111827);
}

.data-row--new .data-type-cell {
  color: var(--b24-primary, #007bff);
}

.data-row--closed .data-type-cell {
  color: var(--b24-success, #28a745);
}

.data-row--carryover .data-type-cell {
  color: #ff9800;
}

/* Адаптивность */
@media (max-width: 768px) {
  .chart-container {
    height: 300px;
  }
  
  .data-table {
    font-size: var(--font-size-xs, 12px);
  }
  
  .data-table th,
  .data-table td {
    padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
  }
  
  .month-header-cell,
  .data-type-cell {
    min-width: 100px;
  }
  
  .week-header-cell,
  .week-data-cell {
    min-width: 80px;
  }
}
</style>

