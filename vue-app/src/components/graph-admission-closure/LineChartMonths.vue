<template>
  <div class="line-chart-months">
    <!-- График "Новые и Закрытые тикеты" -->
    <div class="chart-section">
      <h3 class="chart-title">
        Новые и Закрытые тикеты
        <span v-if="chartPeriod" class="chart-period">({{ chartPeriod }})</span>
      </h3>
      <!-- TASK-058-07: Обертка для графика и сводного итога -->
      <div class="chart-wrapper">
        <div class="chart-container">
          <Line :data="newClosedChartData" :options="chartOptions" />
        </div>
        <!-- TASK-058-07: Сводный итог справа от графика -->
        <div class="chart-summary">
          <h4 class="summary-title">Сводный итог</h4>
          <div class="summary-numbers">
            <div class="summary-row">
              <span class="summary-label">Новые:</span>
              <span class="summary-values">{{ summaryNumbers.new }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Закрытые:</span>
              <span class="summary-values">{{ summaryNumbers.closed }}</span>
            </div>
          </div>
          <div class="summary-analysis">
            <p v-for="(analysis, index) in summaryAnalysis" :key="index">
              {{ analysis }}
            </p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- График "Переходящие тикеты" -->
    <div class="chart-section">
      <h3 class="chart-title">
        Переходящие тикеты
        <span v-if="carryoverChartPeriod" class="chart-period">({{ carryoverChartPeriod }})</span>
      </h3>
      <!-- TASK-058-07: Обертка для графика и анализа -->
      <div class="chart-wrapper">
        <div class="chart-container">
          <Line :data="carryoverChartData" :options="chartOptions" />
        </div>
        <!-- TASK-058-07: Анализ справа от графика -->
        <div class="chart-analysis">
          <h4 class="analysis-title">Анализ</h4>
          <div class="analysis-content">
            <p v-for="(analysis, index) in carryoverAnalysis" :key="index">
              {{ analysis }}
            </p>
          </div>
        </div>
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
import { Chart as ChartJS } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { chartColors } from '@/utils/chart-config.js';

// TASK-058-04: Регистрация плагина для отображения цифр на точках графика
ChartJS.register(ChartDataLabels);

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
        fill: false,
        // TASK-058-04: Настройка datalabels для новых тикетов (справа от точки)
        // TASK-058-06: Улучшено позиционирование для избежания перекрытия
        datalabels: {
          anchor: 'end',
          align: 'top',
          offset: 10,  // Увеличенное смещение для лучшей видимости
          color: chartColors.primary,
          font: {
            size: 12,
            weight: 'bold'
          },
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderColor: chartColors.primary,
          borderWidth: 1,
          borderRadius: 4,
          padding: 4
        }
      },
      {
        label: 'Закрытые тикеты',
        data: closedData,
        borderColor: chartColors.success,
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        tension: 0.4,
        fill: false,
        // TASK-058-04: Настройка datalabels для закрытых тикетов
        // TASK-058-06: Изменено на 'bottom' для избежания перекрытия с новыми тикетами
        datalabels: {
          anchor: 'start',
          align: 'bottom',  // Изменено с 'top' на 'bottom' для разделения по вертикали
          offset: 10,  // Увеличенное смещение для лучшей видимости
          color: chartColors.success,
          font: {
            size: 12,
            weight: 'bold'
          },
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderColor: chartColors.success,
          borderWidth: 1,
          borderRadius: 4,
          padding: 4
        }
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
        fill: false,
        // TASK-058-05: Настройка datalabels для переходящих тикетов
        datalabels: {
          anchor: 'end',
          align: 'top',
          offset: 4,
          color: chartColors.carryover || '#ff9800'
        }
      }
    ]
  };
});

/**
 * Настройки графика
 * TASK-058-04: Добавлена конфигурация datalabels для отображения цифр на точках
 */
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  // TASK-058-06: Отступы для легенды (слева) и цифр на точках (сверху)
  // TASK-058-07: Увеличен padding сверху, чтобы цифры не залипали на верхний край
  layout: {
    padding: {
      left: 16,  // Отступ от левого края для легенды
      right: 0,
      top: 56,  // Увеличен отступ сверху для цифр на точках (было 32px)
      bottom: 0
    }
  },
  plugins: {
    legend: {
      position: 'left',  // TASK-058-06: Легенда размещена слева
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
    },
    // TASK-058-04: Конфигурация для отображения цифр на точках графика
    datalabels: {
      anchor: 'end',
      align: 'top',
      formatter: (value, context) => {
        // Форматирование значения
        if (value === null || value === undefined || isNaN(value)) {
          return '';
        }
        return value.toString();
      },
      color: '#333',
      font: {
        size: 12,
        weight: 'bold'
      },
      padding: {
        top: 4,
        bottom: 4
      },
      display: function(context) {
        // Показывать только если значение не null/undefined
        const value = context.dataset.data[context.dataIndex];
        return value !== null && 
               value !== undefined && 
               !isNaN(value) && 
               isFinite(value);
      },
      // Дополнительные настройки для лучшей читаемости
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      borderColor: '#333',
      borderWidth: 1,
      borderRadius: 4,
      padding: 4
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
 * Получить период для заголовка графика
 * TASK-058-05: Общая функция для переиспользования
 * 
 * @param {Array} months - Массив месяцев
 * @returns {string|null} Период в формате "Месяц1 — Месяц2 Год" или null
 */
function getChartPeriod(months) {
  if (!months || months.length === 0) {
    return null;
  }
  
  const firstMonth = months[0];
  const lastMonth = months[months.length - 1];
  
  if (!firstMonth || !lastMonth) {
    return null;
  }
  
  const firstMonthName = firstMonth.monthName || `Месяц ${firstMonth.month}`;
  const lastMonthName = lastMonth.monthName || `Месяц ${lastMonth.month}`;
  const year = firstMonth.year || new Date().getFullYear();
  
  return `${firstMonthName} — ${lastMonthName} ${year}`;
}

/**
 * Период для графика "Новые и Закрытые тикеты"
 * TASK-058-04: Computed-свойство для динамичного заголовка
 */
const chartPeriod = computed(() => {
  return getChartPeriod(props.data?.newTicketsByMonth || []);
});

/**
 * Период для графика "Переходящие тикеты"
 * TASK-058-05: Computed-свойство для динамичного заголовка
 */
const carryoverChartPeriod = computed(() => {
  return getChartPeriod(props.data?.carryoverTicketsByMonth || []);
});

/**
 * Сводный итог с цифрами по месяцам
 * TASK-058-04: Computed-свойство для сводного итога
 */
const summaryNumbers = computed(() => {
  const months = props.data?.newTicketsByMonth || [];
  const closedMonths = props.data?.closedTicketsByMonth || [];
  
  if (months.length === 0) {
    return { new: '—', closed: '—' };
  }
  
  const newValues = months.map(m => 
    `${formatNumber(m.count || 0)} (${m.monthName || m.month})`
  ).join(' → ');
  
  const closedValues = closedMonths.map(m => 
    `${formatNumber(m.count || 0)} (${m.monthName || m.month})`
  ).join(' → ');
  
  return {
    new: newValues,
    closed: closedValues
  };
});

/**
 * Словесный анализ динамики
 * TASK-058-04: Computed-свойство для словесного анализа
 */
const summaryAnalysis = computed(() => {
  const months = props.data?.newTicketsByMonth || [];
  const closedMonths = props.data?.closedTicketsByMonth || [];
  
  if (months.length < 2) {
    return ['Недостаточно данных для анализа'];
  }
  
  const analysis = [];
  
  // Анализ новых тикетов
  if (months.length >= 2) {
    const month1 = months[0];
    const month2 = months[1];
    const month3 = months[2];
    
    // Изменение между первым и вторым месяцем
    if (month2 && month1 && typeof month1.count === 'number' && typeof month2.count === 'number') {
      if (month1.count > 0) {
        const change1 = ((month2.count - month1.count) / month1.count) * 100;
        if (isFinite(change1) && !isNaN(change1)) {
          const trend = change1 >= 0 ? 'рост' : 'снижение';
          const absChange = Math.abs(change1);
          analysis.push(
            `Новые тикеты: ${trend} на ${absChange.toFixed(1)}% в ${month2.monthName || month2.month}`
          );
        }
      } else if (month1.count === 0 && month2.count > 0) {
        analysis.push(
          `Новые тикеты: появление тикетов (${month2.count}) в ${month2.monthName || month2.month}`
        );
      }
    }
    
    // Изменение между вторым и третьим месяцем
    if (month3 && month2 && typeof month2.count === 'number' && typeof month3.count === 'number') {
      if (month2.count > 0) {
        const change2 = ((month3.count - month2.count) / month2.count) * 100;
        if (isFinite(change2) && !isNaN(change2)) {
          const trend = change2 >= 0 ? 'рост' : 'снижение';
          const absChange = Math.abs(change2);
          analysis.push(
            `Новые тикеты: ${trend} на ${absChange.toFixed(1)}% в ${month3.monthName || month3.month}`
          );
        }
      } else if (month2.count === 0 && month3.count > 0) {
        analysis.push(
          `Новые тикеты: появление тикетов (${month3.count}) в ${month3.monthName || month3.month}`
        );
      }
    }
  }
  
  // Анализ закрытых тикетов
  if (closedMonths.length >= 2) {
    const month1 = closedMonths[0];
    const month2 = closedMonths[1];
    const month3 = closedMonths[2];
    
    // Изменение между первым и вторым месяцем
    if (month2 && month1 && typeof month1.count === 'number' && typeof month2.count === 'number') {
      if (month1.count > 0) {
        const change1 = ((month2.count - month1.count) / month1.count) * 100;
        if (isFinite(change1) && !isNaN(change1)) {
          const trend = change1 >= 0 ? 'рост' : 'снижение';
          const absChange = Math.abs(change1);
          analysis.push(
            `Закрытые тикеты: ${trend} на ${absChange.toFixed(1)}% в ${month2.monthName || month2.month}`
          );
        }
      } else if (month1.count === 0 && month2.count > 0) {
        analysis.push(
          `Закрытые тикеты: появление закрытий (${month2.count}) в ${month2.monthName || month2.month}`
        );
      }
    }
    
    // Изменение между вторым и третьим месяцем
    if (month3 && month2 && typeof month2.count === 'number' && typeof month3.count === 'number') {
      if (month2.count > 0) {
        const change2 = ((month3.count - month2.count) / month2.count) * 100;
        if (isFinite(change2) && !isNaN(change2)) {
          const trend = change2 >= 0 ? 'рост' : 'снижение';
          const absChange = Math.abs(change2);
          analysis.push(
            `Закрытые тикеты: ${trend} на ${absChange.toFixed(1)}% в ${month3.monthName || month3.month}`
          );
        }
      } else if (month2.count === 0 && month3.count > 0) {
        analysis.push(
          `Закрытые тикеты: появление закрытий (${month3.count}) в ${month3.monthName || month3.month}`
        );
      }
    }
  }
  
  // Общая тенденция за период (если есть данные за все 3 месяца)
  if (months.length >= 3 && closedMonths.length >= 3) {
    const firstNew = months[0].count || 0;
    const lastNew = months[months.length - 1].count || 0;
    const firstClosed = closedMonths[0].count || 0;
    const lastClosed = closedMonths[closedMonths.length - 1].count || 0;
    
    if (firstNew > 0 && firstClosed > 0) {
      const newChange = ((lastNew - firstNew) / firstNew) * 100;
      const closedChange = ((lastClosed - firstClosed) / firstClosed) * 100;
      
      if (isFinite(newChange) && isFinite(closedChange)) {
        analysis.push(
          `Общая динамика за период: новые тикеты ${newChange >= 0 ? 'выросли' : 'снизились'} на ${Math.abs(newChange).toFixed(1)}%, закрытые тикеты ${closedChange >= 0 ? 'выросли' : 'снизились'} на ${Math.abs(closedChange).toFixed(1)}%`
        );
      }
    }
  }
  
  return analysis.length > 0 ? analysis : ['Недостаточно данных для анализа'];
});

/**
 * Словесный анализ для переходящих тикетов
 * TASK-058-05: Computed-свойство для словесного анализа переходящих тикетов
 */
const carryoverAnalysis = computed(() => {
  const months = props.data?.carryoverTicketsByMonth || [];
  
  if (months.length === 0) {
    return ['Нет данных для анализа'];
  }
  
  const analysis = [];
  
  // Формирование строки с цифрами
  const values = months
    .filter(m => m && typeof m.count === 'number')
    .map(m => `${formatNumber(m.count || 0)} (${m.monthName || m.month || 'Неизвестно'})`)
    .join(' → ');
  
  if (values) {
    analysis.push(`Переходящие тикеты: ${values}`);
  }
  
  // Анализ динамики
  if (months.length >= 2) {
    const month1 = months[0];
    const month2 = months[1];
    const month3 = months[2];
    
    // Изменение между первым и вторым месяцем
    if (month2 && month1 && typeof month1.count === 'number' && typeof month2.count === 'number') {
      if (month1.count > 0) {
        const change1 = ((month2.count - month1.count) / month1.count) * 100;
        if (isFinite(change1) && !isNaN(change1)) {
          const trend = change1 >= 0 ? 'рост' : 'снижение';
          const absChange = Math.abs(change1);
          analysis.push(
            `Динамика: ${trend} на ${absChange.toFixed(1)}% в ${month2.monthName || month2.month}`
          );
        }
      } else if (month1.count === 0 && month2.count > 0) {
        analysis.push(
          `Динамика: появление переходящих тикетов (${month2.count}) в ${month2.monthName || month2.month}`
        );
      }
    }
    
    // Изменение между вторым и третьим месяцем
    if (month3 && month2 && typeof month2.count === 'number' && typeof month3.count === 'number') {
      if (month2.count > 0) {
        const change2 = ((month3.count - month2.count) / month2.count) * 100;
        if (isFinite(change2) && !isNaN(change2)) {
          const trend = change2 >= 0 ? 'рост' : 'снижение';
          const absChange = Math.abs(change2);
          analysis.push(
            `${trend} на ${absChange.toFixed(1)}% в ${month3.monthName || month3.month}`
          );
        }
      } else if (month2.count === 0 && month3.count > 0) {
        analysis.push(
          `появление переходящих тикетов (${month3.count}) в ${month3.monthName || month3.month}`
        );
      }
    }
  }
  
  // Общая тенденция за период
  if (months.length >= 3) {
    const first = months[0];
    const last = months[months.length - 1];
    
    if (first && last && 
        typeof first.count === 'number' && 
        typeof last.count === 'number') {
      const firstCount = first.count || 0;
      const lastCount = last.count || 0;
      
      if (firstCount > 0) {
        const totalChange = ((lastCount - firstCount) / firstCount) * 100;
        if (isFinite(totalChange) && !isNaN(totalChange)) {
          if (Math.abs(totalChange) < 1) {
            // Изменение менее 1% считается стабильным
            analysis.push(`Тенденция: стабильное количество переходящих тикетов (изменение менее 1%)`);
          } else if (totalChange > 5) {
            analysis.push(`Тенденция: рост переходящих тикетов за период на ${totalChange.toFixed(1)}%`);
          } else if (totalChange < -5) {
            analysis.push(`Тенденция: снижение переходящих тикетов за период на ${Math.abs(totalChange).toFixed(1)}%`);
          } else {
            analysis.push(`Тенденция: незначительное изменение переходящих тикетов (${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(1)}%)`);
          }
        }
      } else if (firstCount === 0 && lastCount > 0) {
        analysis.push(`Тенденция: появление переходящих тикетов в конце периода (${lastCount})`);
      } else if (firstCount > 0 && lastCount === 0) {
        analysis.push(`Тенденция: полное отсутствие переходящих тикетов в конце периода`);
      }
    }
  }
  
  return analysis.length > 0 ? analysis : ['Недостаточно данных для анализа'];
});

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
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  flex-wrap: wrap;
}

/* TASK-058-04: Стили для динамичного периода в заголовке */
.chart-period {
  font-size: var(--font-size-base, 14px);
  font-weight: 400;
  color: var(--b24-text-secondary, #6b7280);
}

/* TASK-058-07: Обертка для графика и сводного итога */
.chart-wrapper {
  display: flex;
  flex-direction: row;
  gap: 20px;
  align-items: flex-start;
  width: 100%;
}

.chart-container {
  flex: 0 0 60%;
  width: 60%;
  height: 240px; /* TASK-058-07: Увеличена высота для лучшей читаемости графика (было 160px) */
  position: relative;
}

/* TASK-058-04: Стили для сводного итога */
/* TASK-058-07: Сводный итог справа от графика */
.chart-summary {
  flex: 0 0 35%;
  width: 35%;
  margin-top: 0; /* TASK-058-07: Убрать отступ сверху, так как теперь справа */
  padding: 20px;
  background-color: var(--b24-bg-light, #f9fafb);
  border-radius: 8px;
  border: 1px solid var(--b24-border-light, #e5e7eb);
}

.summary-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
}

.summary-numbers {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.summary-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.summary-label {
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
  min-width: 100px;
}

.summary-values {
  color: var(--b24-text-secondary, #6b7280);
  font-family: 'Courier New', monospace;
}

.summary-analysis {
  padding-top: 16px;
  border-top: 1px solid var(--b24-border-light, #e5e7eb);
}

.summary-analysis p {
  margin: 8px 0;
  font-size: 14px;
  color: var(--b24-text-primary, #111827);
  line-height: 1.5;
}

/* TASK-058-05: Стили для блока анализа переходящих тикетов */
/* TASK-058-07: Анализ справа от графика */
.chart-analysis {
  flex: 0 0 35%;
  width: 35%;
  margin-top: 0; /* TASK-058-07: Убрать отступ сверху, так как теперь справа */
  padding: 20px;
  background-color: var(--b24-bg-light, #f9fafb);
  border-radius: 8px;
  border: 1px solid var(--b24-border-light, #e5e7eb);
}

.analysis-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
}

.analysis-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.analysis-content p {
  margin: 0;
  font-size: 14px;
  color: var(--b24-text-primary, #111827);
  line-height: 1.5;
}

.analysis-content p:first-child {
  font-weight: 600;
  color: var(--b24-text-secondary, #6b7280);
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
  /* TASK-058-07: Вертикальная компоновка на мобильных устройствах */
  .chart-wrapper {
    flex-direction: column; /* Вертикальная компоновка на мобильных */
  }
  
  .chart-container {
    flex: 0 0 100%;
    width: 100%;
    height: 280px; /* Увеличена высота на мобильных для лучшей читаемости (было 200px) */
  }
  
  .chart-summary,
  .chart-analysis {
    flex: 0 0 100%;
    width: 100%;
    margin-top: 16px; /* Вернуть отступ сверху на мобильных */
    padding: 16px;
  }
  
  .summary-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .summary-label {
    min-width: auto;
  }
  
  .analysis-content p {
    font-size: 13px;
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

