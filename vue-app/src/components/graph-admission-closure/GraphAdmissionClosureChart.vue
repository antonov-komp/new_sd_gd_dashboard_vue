<template>
  <div class="ac-chart">
    <header class="ac-chart__header">
      <div>
        <h2 class="ac-chart__title">График приёма и закрытий сектора 1С</h2>
        <p class="ac-chart__subtitle">
          Неделя {{ (meta?.currentWeek?.weekNumber ?? meta?.weekNumber) ?? '—' }} · 
          {{ (meta?.currentWeek?.weekStartUtc ?? meta?.weekStartUtc) || '—' }} — {{ (meta?.currentWeek?.weekEndUtc ?? meta?.weekEndUtc) || '—' }} (UTC)
        </p>
      </div>

      <div class="ac-chart__controls">
        <div class="chart-type-selector">
          <button
            v-for="type in chartTypes"
            :key="type.value"
            :class="['chart-type-btn', { active: chartType === type.value }]"
            @click="chartType = type.value"
          >
            <span class="chart-type-icon">{{ type.icon }}</span>
            <span class="chart-type-label">{{ type.label }}</span>
          </button>
        </div>
      </div>
    </header>

    <section class="ac-chart__summary">
      <!-- TASK-048: Используем currentWeekData для summary-карточек (текущая неделя из 4) -->
      <div class="summary-card summary-card--new" @click="handleSummaryClick('new')">
        <div class="summary-card__label">Новые за неделю</div>
        <div class="summary-card__value">{{ currentWeekData?.newTickets ?? 0 }}</div>
      </div>
      <!-- TASK-047: Три цифры для закрытых тикетов (компактный вариант) -->
      <div class="summary-card summary-card--closed-breakdown" @click="handleSummaryClick('closed')">
        <div class="summary-card__label">Закрытые за неделю</div>
        <div class="summary-card__value-main">{{ currentWeekData?.closedTickets ?? 0 }}</div>
        <div class="summary-card__breakdown">
          <div class="breakdown-item breakdown-item--this-week">
            <span class="breakdown-item__icon">✓</span>
            <span class="breakdown-item__value">{{ currentWeekData?.closedTicketsCreatedThisWeek ?? 0 }}</span>
            <span class="breakdown-item__label">этой неделей</span>
          </div>
          <div class="breakdown-item breakdown-item--other-week">
            <span class="breakdown-item__icon">↻</span>
            <span class="breakdown-item__value">{{ currentWeekData?.closedTicketsCreatedOtherWeek ?? 0 }}</span>
            <span class="breakdown-item__label">другой неделей</span>
          </div>
        </div>
      </div>
      <!-- TASK-047: Три цифры для переходящих тикетов (компактный вариант) -->
      <div class="summary-card summary-card--carryover-breakdown" @click="handleSummaryClick('carryover')">
        <div class="summary-card__label">Переходящие</div>
        <div class="summary-card__value-main">{{ currentWeekData?.carryoverTickets ?? 0 }}</div>
        <div class="summary-card__breakdown">
          <div class="breakdown-item breakdown-item--this-week">
            <span class="breakdown-item__icon">✓</span>
            <span class="breakdown-item__value">{{ currentWeekData?.carryoverTicketsCreatedThisWeek ?? 0 }}</span>
            <span class="breakdown-item__label">этой недели</span>
          </div>
          <div class="breakdown-item breakdown-item--other-week">
            <span class="breakdown-item__icon">↻</span>
            <span class="breakdown-item__value">{{ currentWeekData?.carryoverTicketsCreatedOtherWeek ?? 0 }}</span>
            <span class="breakdown-item__label">предыдущих</span>
          </div>
        </div>
      </div>
      <div class="summary-card summary-card--stages">
        <div class="summary-card__label">Закрытия по стадиям</div>
        <div class="summary-card__tags">
          <span
            v-for="stage in data.stages || []"
            :key="stage.stageId"
            class="stage-tag"
          >
            {{ stage.stageName || stage.stageId }} — {{ stage.count }}
          </span>
          <span v-if="!data.stages || data.stages.length === 0" class="stage-tag stage-tag--empty">
            Нет данных
          </span>
        </div>
      </div>
    </section>

    <div class="ac-chart__body">
      <!-- TASK-052: Для линейного графика - два графика рядом -->
      <div v-if="chartType === 'line'" class="split-charts-container">
        <div class="chart-wrapper chart-wrapper--left">
          <h3 class="chart-subtitle">Новые и Закрытые тикеты</h3>
          <div class="chart-canvas-wrapper">
            <Line :data="newClosedChartData" :options="chartOptions" />
          </div>
        </div>
        <div class="chart-wrapper chart-wrapper--right">
          <h3 class="chart-subtitle">Переходящие тикеты</h3>
          <div class="chart-canvas-wrapper">
            <Line :data="carryoverChartData" :options="chartOptions" />
          </div>
        </div>
      </div>
      
      <!-- Для других типов графиков: один график (как сейчас) -->
      <component
        v-else
        :is="chartComponent"
        :data="chartData"
        :options="chartOptions"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { Line, Bar, Doughnut } from 'vue-chartjs';
import { Chart as ChartJS } from 'chart.js';
import { chartColors } from '@/utils/chart-config.js';

const props = defineProps({
  meta: {
    type: Object,
    default: () => ({
      weekNumber: null,
      weekStartUtc: null,
      weekEndUtc: null
    })
  },
  data: {
    type: Object,
    default: () => ({
      newTickets: 0,
      closedTickets: 0,
      closedTicketsCreatedThisWeek: 0, // TASK-047
      closedTicketsCreatedOtherWeek: 0, // TASK-047
      carryoverTickets: 0,
      carryoverTicketsCreatedThisWeek: 0, // TASK-047
      carryoverTicketsCreatedOtherWeek: 0, // TASK-047
      series: { // TASK-049: массивы с одним элементом для выбранной недели
        new: [0],
        closed: [0],
        closedCreatedThisWeek: [0],
        closedCreatedOtherWeek: [0],
        carryover: [0],
        carryoverCreatedThisWeek: [0],
        carryoverCreatedOtherWeek: [0]
      },
      stages: [],
      responsible: []
    })
  }
});

const emit = defineEmits(['open-responsible', 'open-stages', 'open-carryover']);

const chartTypes = [
  { value: 'line', label: 'Линейный', icon: '📈' },
  { value: 'bar', label: 'Столбчатый', icon: '📊' },
  { value: 'doughnut', label: 'Круговая', icon: '🍩' }
];

const chartType = ref('line');

const weekLabel = computed(() => props.meta?.weekNumber ?? '—');

// TASK-052: Вспомогательная функция для получения labels из weeks
const getWeekLabels = () => {
  const weeks = props.meta?.weeks || [];
  return weeks.length > 0 
    ? weeks.map(week => `Неделя ${week.weekNumber}`)
    : [props.meta?.weekNumber ? `Неделя ${props.meta.weekNumber}` : 'Неделя'];
};

// TASK-056-01: Функция для создания градиента под линией графика
/**
 * Создаёт градиент для заливки под линией графика
 * 
 * @param {CanvasRenderingContext2D} ctx - Контекст canvas
 * @param {Object} chartArea - Область графика {top, bottom, left, right}
 * @param {string} color - Цвет линии в формате hex (#007bff)
 * @param {number} opacityStart - Начальная прозрачность (0-1), по умолчанию 0.3
 * @param {number} opacityEnd - Конечная прозрачность (0-1), по умолчанию 0
 * @returns {CanvasGradient|string} Градиент для использования в backgroundColor или fallback цвет
 */
function createGradient(ctx, chartArea, color, opacityStart = 0.3, opacityEnd = 0) {
  if (!chartArea) {
    // Fallback: конвертируем hex в rgba с прозрачностью
    const hexToRgba = (hex, alpha) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    return hexToRgba(color, opacityStart);
  }
  
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  gradient.addColorStop(0, hexToRgba(color, opacityStart)); // Внизу: opacity 0.3
  gradient.addColorStop(1, hexToRgba(color, opacityEnd)); // Вверху: прозрачный
  
  return gradient;
}

// TASK-052: Данные для левого графика (Новые и Закрытые)
const newClosedChartData = computed(() => {
  const labels = getWeekLabels();
  
  const newSeries = Array.isArray(props.data.series?.new) && props.data.series.new.length > 0
    ? props.data.series.new
    : [props.data.newTickets ?? 0];
  
  const closedSeries = Array.isArray(props.data.series?.closed) && props.data.series.closed.length > 0
    ? props.data.series.closed
    : [props.data.closedTickets ?? 0];
  
  const closedCreatedThisWeekSeries = Array.isArray(props.data.series?.closedCreatedThisWeek) && props.data.series.closedCreatedThisWeek.length > 0
    ? props.data.series.closedCreatedThisWeek
    : [props.data.closedTicketsCreatedThisWeek ?? 0];
  
  const closedCreatedOtherWeekSeries = Array.isArray(props.data.series?.closedCreatedOtherWeek) && props.data.series.closedCreatedOtherWeek.length > 0
    ? props.data.series.closedCreatedOtherWeek
    : [props.data.closedTicketsCreatedOtherWeek ?? 0];

  return {
    labels,
    datasets: [
      {
        // TASK-056-01: Основная линия - Новые
        label: 'Новые',
        data: newSeries,
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          return createGradient(ctx, chartArea, chartColors.primary);
        },
        borderColor: chartColors.primary,
        borderWidth: 3, // TASK-056-01: Увеличена толщина для основных линий
        tension: 0.4, // TASK-056-01: Увеличено скругление
        fill: true, // TASK-056-01: Включена заливка для градиента
        pointRadius: 0, // TASK-056-01: Скрыты точки по умолчанию
        pointHoverRadius: 5, // TASK-056-01: Показывать точки при hover
        pointHoverBorderWidth: 2, // TASK-056-01: Обводка точек
        pointHoverBorderColor: '#ffffff', // TASK-056-01: Белая обводка
        pointBackgroundColor: chartColors.primary
      },
      {
        // TASK-056-01: Основная линия - Закрытые (все)
        label: 'Закрытые (все)',
        data: closedSeries,
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          return createGradient(ctx, chartArea, chartColors.success);
        },
        borderColor: chartColors.success,
        borderWidth: 3, // TASK-056-01: Увеличена толщина для основных линий
        tension: 0.4, // TASK-056-01: Увеличено скругление
        fill: true, // TASK-056-01: Включена заливка для градиента
        pointRadius: 0, // TASK-056-01: Скрыты точки по умолчанию
        pointHoverRadius: 5, // TASK-056-01: Показывать точки при hover
        pointHoverBorderWidth: 2, // TASK-056-01: Обводка точек
        pointHoverBorderColor: '#ffffff', // TASK-056-01: Белая обводка
        pointBackgroundColor: chartColors.success
      },
      {
        // TASK-056-01: Вспомогательная линия - Закрытые (созданы этой неделей)
        label: 'Закрытые (созданы этой неделей)',
        data: closedCreatedThisWeekSeries,
        backgroundColor: chartColors.successLight,
        borderColor: chartColors.successLight,
        borderWidth: 2, // TASK-056-01: Уменьшена толщина для вспомогательных линий
        tension: 0.4, // TASK-056-01: Увеличено скругление
        borderDash: [8, 4], // TASK-056-01: Обновлён стиль пунктира
        fill: false, // TASK-056-01: Без градиента для вспомогательных линий
        pointRadius: 0, // TASK-056-01: Скрыты точки по умолчанию
        pointHoverRadius: 4, // TASK-056-01: Показывать точки при hover (меньший радиус)
        pointHoverBorderWidth: 2, // TASK-056-01: Обводка точек
        pointHoverBorderColor: '#ffffff', // TASK-056-01: Белая обводка
        pointBackgroundColor: chartColors.successLight
      },
      {
        // TASK-056-01: Вспомогательная линия - Закрытые (созданы другой неделей)
        label: 'Закрытые (созданы другой неделей)',
        data: closedCreatedOtherWeekSeries,
        backgroundColor: chartColors.warning,
        borderColor: chartColors.warning,
        borderWidth: 2, // TASK-056-01: Уменьшена толщина для вспомогательных линий
        tension: 0.4, // TASK-056-01: Увеличено скругление
        borderDash: [8, 4], // TASK-056-01: Обновлён стиль пунктира
        fill: false, // TASK-056-01: Без градиента для вспомогательных линий
        pointRadius: 0, // TASK-056-01: Скрыты точки по умолчанию
        pointHoverRadius: 4, // TASK-056-01: Показывать точки при hover (меньший радиус)
        pointHoverBorderWidth: 2, // TASK-056-01: Обводка точек
        pointHoverBorderColor: '#ffffff', // TASK-056-01: Белая обводка
        pointBackgroundColor: chartColors.warning
      }
    ]
  };
});

// TASK-052: Данные для правого графика (Переходящие)
const carryoverChartData = computed(() => {
  const labels = getWeekLabels();
  
  const carryoverSeries = Array.isArray(props.data.series?.carryover) && props.data.series.carryover.length > 0
    ? props.data.series.carryover
    : [props.data.carryoverTickets ?? 0];
  
  const carryoverCreatedThisWeekSeries = Array.isArray(props.data.series?.carryoverCreatedThisWeek) && props.data.series.carryoverCreatedThisWeek.length > 0
    ? props.data.series.carryoverCreatedThisWeek
    : [props.data.carryoverTicketsCreatedThisWeek ?? 0];
  
  const carryoverCreatedOtherWeekSeries = Array.isArray(props.data.series?.carryoverCreatedOtherWeek) && props.data.series.carryoverCreatedOtherWeek.length > 0
    ? props.data.series.carryoverCreatedOtherWeek
    : [props.data.carryoverTicketsCreatedOtherWeek ?? 0];

  return {
    labels,
    datasets: [
      {
        // TASK-056-01: Основная линия - Переходящие (все)
        label: 'Переходящие (все)',
        data: carryoverSeries,
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          return createGradient(ctx, chartArea, chartColors.carryover);
        },
        borderColor: chartColors.carryover,
        borderWidth: 3, // TASK-056-01: Увеличена толщина для основных линий
        tension: 0.4, // TASK-056-01: Увеличено скругление
        fill: true, // TASK-056-01: Включена заливка для градиента
        pointRadius: 0, // TASK-056-01: Скрыты точки по умолчанию
        pointHoverRadius: 5, // TASK-056-01: Показывать точки при hover
        pointHoverBorderWidth: 2, // TASK-056-01: Обводка точек
        pointHoverBorderColor: '#ffffff', // TASK-056-01: Белая обводка
        pointBackgroundColor: chartColors.carryover
      },
      {
        // TASK-056-01: Вспомогательная линия - Переходящие (созданы этой неделей)
        label: 'Переходящие (созданы этой неделей)',
        data: carryoverCreatedThisWeekSeries,
        backgroundColor: chartColors.carryoverLight,
        borderColor: chartColors.carryoverLight,
        borderWidth: 2, // TASK-056-01: Уменьшена толщина для вспомогательных линий
        tension: 0.4, // TASK-056-01: Увеличено скругление
        borderDash: [8, 4], // TASK-056-01: Обновлён стиль пунктира
        fill: false, // TASK-056-01: Без градиента для вспомогательных линий
        pointRadius: 0, // TASK-056-01: Скрыты точки по умолчанию
        pointHoverRadius: 4, // TASK-056-01: Показывать точки при hover (меньший радиус)
        pointHoverBorderWidth: 2, // TASK-056-01: Обводка точек
        pointHoverBorderColor: '#ffffff', // TASK-056-01: Белая обводка
        pointBackgroundColor: chartColors.carryoverLight
      },
      {
        // TASK-056-01: Вспомогательная линия - Переходящие (созданы другой неделей)
        label: 'Переходящие (созданы другой неделей)',
        data: carryoverCreatedOtherWeekSeries,
        backgroundColor: chartColors.carryoverDark,
        borderColor: chartColors.carryoverDark,
        borderWidth: 2, // TASK-056-01: Уменьшена толщина для вспомогательных линий
        tension: 0.4, // TASK-056-01: Увеличено скругление
        borderDash: [8, 4], // TASK-056-01: Обновлён стиль пунктира
        fill: false, // TASK-056-01: Без градиента для вспомогательных линий
        pointRadius: 0, // TASK-056-01: Скрыты точки по умолчанию
        pointHoverRadius: 4, // TASK-056-01: Показывать точки при hover (меньший радиус)
        pointHoverBorderWidth: 2, // TASK-056-01: Обводка точек
        pointHoverBorderColor: '#ffffff', // TASK-056-01: Белая обводка
        pointBackgroundColor: chartColors.carryoverDark
      }
    ]
  };
});

// TASK-052: Сохраняем lineBarData для столбчатого графика (без изменений)
const lineBarData = computed(() => {
  // TASK-048: Получаем метаданные о 4 неделях
  const weeks = props.meta?.weeks || [];
  const labels = weeks.length > 0 
    ? weeks.map(week => `Неделя ${week.weekNumber}`)
    : [props.meta?.weekNumber ? `Неделя ${props.meta.weekNumber}` : 'Неделя'];
  
  // TASK-048: Получаем серии данных для 4 недель (массивы с 4 элементами)
  // Данные уже в правильном порядке: от старых к новым (неделя 48, 49, 50, 51)
  const newSeries = Array.isArray(props.data.series?.new) && props.data.series.new.length > 0
    ? props.data.series.new
    : [props.data.newTickets ?? 0];
  
  const closedSeries = Array.isArray(props.data.series?.closed) && props.data.series.closed.length > 0
    ? props.data.series.closed
    : [props.data.closedTickets ?? 0];
  
  const closedCreatedThisWeekSeries = Array.isArray(props.data.series?.closedCreatedThisWeek) && props.data.series.closedCreatedThisWeek.length > 0
    ? props.data.series.closedCreatedThisWeek
    : [props.data.closedTicketsCreatedThisWeek ?? 0];
  
  const closedCreatedOtherWeekSeries = Array.isArray(props.data.series?.closedCreatedOtherWeek) && props.data.series.closedCreatedOtherWeek.length > 0
    ? props.data.series.closedCreatedOtherWeek
    : [props.data.closedTicketsCreatedOtherWeek ?? 0];
  
  const carryoverSeries = Array.isArray(props.data.series?.carryover) && props.data.series.carryover.length > 0
    ? props.data.series.carryover
    : [props.data.carryoverTickets ?? 0];
  
  const carryoverCreatedThisWeekSeries = Array.isArray(props.data.series?.carryoverCreatedThisWeek) && props.data.series.carryoverCreatedThisWeek.length > 0
    ? props.data.series.carryoverCreatedThisWeek
    : [props.data.carryoverTicketsCreatedThisWeek ?? 0];
  
  const carryoverCreatedOtherWeekSeries = Array.isArray(props.data.series?.carryoverCreatedOtherWeek) && props.data.series.carryoverCreatedOtherWeek.length > 0
    ? props.data.series.carryoverCreatedOtherWeek
    : [props.data.carryoverTicketsCreatedOtherWeek ?? 0];

  return {
    labels,
    datasets: [
      {
        label: 'Новые',
        data: newSeries,
        backgroundColor: chartColors.primary,
        borderColor: chartColors.primary,
        tension: 0.3,
        fill: false
      },
      {
        label: 'Закрытые (все)',
        data: closedSeries,
        backgroundColor: chartColors.success,
        borderColor: chartColors.success,
        tension: 0.3,
        fill: false
      },
      {
        label: 'Закрытые (созданы этой неделей)',
        data: closedCreatedThisWeekSeries,
        backgroundColor: chartColors.successLight,
        borderColor: chartColors.successLight,
        tension: 0.3,
        fill: false,
        borderDash: [5, 5] // Пунктирная линия
      },
      {
        label: 'Закрытые (созданы другой неделей)',
        data: closedCreatedOtherWeekSeries,
        backgroundColor: chartColors.warning,
        borderColor: chartColors.warning,
        tension: 0.3,
        fill: false,
        borderDash: [5, 5] // Пунктирная линия
      },
      {
        label: 'Переходящие (все)',
        data: carryoverSeries,
        backgroundColor: chartColors.carryover,
        borderColor: chartColors.carryover,
        tension: 0.3,
        fill: false
      },
      {
        label: 'Переходящие (созданы этой неделей)',
        data: carryoverCreatedThisWeekSeries,
        backgroundColor: chartColors.carryoverLight,
        borderColor: chartColors.carryoverLight,
        tension: 0.3,
        fill: false,
        borderDash: [5, 5] // Пунктирная линия
      },
      {
        label: 'Переходящие (созданы другой неделей)',
        data: carryoverCreatedOtherWeekSeries,
        backgroundColor: chartColors.carryoverDark,
        borderColor: chartColors.carryoverDark,
        tension: 0.3,
        fill: false,
        borderDash: [5, 5] // Пунктирная линия
      }
    ]
  };
});

const doughnutData = computed(() => {
  // TASK-049: Используем data напрямую для круговой диаграммы (одна неделя)
  return {
    labels: ['Новые', 'Закрытые', 'Переходящие'],
    datasets: [
      {
        data: [
          props.data.newTickets ?? 0,
          props.data.closedTickets ?? 0,
          props.data.carryoverTickets ?? 0
        ],
        backgroundColor: [chartColors.primary, chartColors.success, chartColors.carryover],
        borderWidth: 1
      }
    ]
  };
});

const chartComponent = computed(() => {
  switch (chartType.value) {
    case 'line':
      return Line;
    case 'bar':
      return Bar;
    case 'doughnut':
      return Doughnut;
    default:
      return Line;
  }
});

const chartData = computed(() => (chartType.value === 'doughnut' ? doughnutData.value : lineBarData.value));

// TASK-049: Форматирование даты для tooltip
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
};

// TASK-056-02: Форматирование числа с разделителем тысяч
/**
 * Форматирует число с разделителем тысяч (пробел)
 * Переиспользована логика из LineChartMonths.vue (TASK-053-05)
 * 
 * @param {number} value - Число для форматирования
 * @returns {string} Отформатированное число
 */
function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  
  if (value >= 1000) {
    return value.toLocaleString('ru-RU'); // Использует разделитель тысяч
  }
  
  return value.toString();
}

// TASK-056-02: Склонение единиц измерения
/**
 * Возвращает правильную форму слова "тикет" в зависимости от числа
 * 
 * @param {number} count - Количество тикетов
 * @returns {string} "тикет", "тикета" или "тикетов"
 */
function getUnitLabel(count) {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'тикетов';
  }
  
  if (lastDigit === 1) {
    return 'тикет';
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'тикета';
  }
  
  return 'тикетов';
}

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  resizeDelay: 0, /* Минимальная задержка для предотвращения бесконечной прокрутки */
  // TASK-056-06: Настройки анимации загрузки графика
  animation: {
    duration: 800, // TASK-056-06: Длительность анимации в миллисекундах
    easing: 'easeOutQuart' // TASK-056-06: Тип easing (ease-out для плавного завершения)
    // Альтернативные значения: 'linear', 'easeInOutQuad', 'easeInOutCubic'
  },
  // TASK-056-06: Настройки взаимодействия (важно для hover-эффектов)
  interaction: {
    intersect: false, // TASK-056-06: Показывать tooltip при приближении к точке
    mode: 'index' // TASK-056-06: Показывать все серии для текущего индекса
  },
  plugins: {
    tooltip: {
      // TASK-056-02: Улучшенные стили tooltip
      enabled: true,
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      titleColor: '#111827',
      bodyColor: '#374151',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 16, // TASK-056-02: Увеличен padding
      titleFont: {
        size: 14,
        weight: 'bold'
      },
      bodyFont: {
        size: 13
      },
      displayColors: true, // TASK-056-02: Показывать цветные индикаторы
      boxPadding: 6,
      usePointStyle: true,
      animation: {
        duration: 300, // TASK-056-06: Плавная анимация появления tooltip
        easing: 'easeOutQuart' // TASK-056-06: Тип easing для плавности
      },
      // TASK-056-06: Задержка появления tooltip (через CSS, так как Chart.js не поддерживает напрямую)
      callbacks: {
        title: (items) => {
          // TASK-048, TASK-056-02: Показываем информацию о неделе в tooltip
          if (!items || items.length === 0) {
            return '';
          }
          
          const index = items[0]?.dataIndex;
          const weeks = props.meta?.weeks || [];
          
          // Режим "4 недели" - используем weeks
          if (weeks.length > 0 && index !== undefined && weeks[index]) {
            const week = weeks[index];
            return `Неделя ${week.weekNumber} (${formatDate(week.weekStartUtc)} — ${formatDate(week.weekEndUtc)})`;
          }
          
          // Fallback для обратной совместимости (режим одной недели)
          const weekNumber = props.meta?.weekNumber;
          const weekStartUtc = props.meta?.weekStartUtc;
          const weekEndUtc = props.meta?.weekEndUtc;
          if (weekNumber && weekStartUtc && weekEndUtc) {
            return `Неделя ${weekNumber} (${formatDate(weekStartUtc)} — ${formatDate(weekEndUtc)})`;
          }
          
          // Последний fallback
          return items[0]?.label || '';
        },
        label: (context) => {
          // TASK-056-02: Улучшенное форматирование значений с единицами измерения
          const value = context.parsed.y;
          const label = context.dataset.label || '';
          
          // Обработка null/undefined/NaN
          if (value === null || value === undefined || isNaN(value)) {
            return `${label}: 0 тикетов`;
          }
          
          const formattedValue = formatNumber(value);
          const unit = getUnitLabel(value);
          
          return `${label}: ${formattedValue} ${unit}`;
        }
      }
    },
    legend: {
      // TASK-056-03: Оптимизация легенды
      position: 'bottom', // TASK-056-03: Перемещена вниз
      labels: {
        font: {
          size: 13, // TASK-056-03: Уменьшен размер шрифта
          weight: '500'
        },
        padding: 12, // TASK-056-03: Уменьшен padding
        boxWidth: 18, // TASK-056-03: Уменьшен boxWidth
        boxHeight: 12,
        usePointStyle: true, // TASK-056-03: Использовать круглые точки
        pointStyle: 'circle', // TASK-056-03: Стиль точки
        generateLabels: (chart) => {
          // TASK-056-03: Кастомная генерация labels для группировки серий
          const original = ChartJS.defaults.plugins.legend.labels.generateLabels(chart);
          return original.map((label, index) => {
            const dataset = chart.data.datasets[index];
            const meta = chart.getDatasetMeta(index);
            
            // TASK-056-03: Определить, является ли серия вспомогательной
            // Критерии: пунктирная линия, толщина 2px, или отсутствие заливки
            const isAuxiliary = (dataset.borderDash && Array.isArray(dataset.borderDash) && dataset.borderDash.length > 0) ||
                               (dataset.borderWidth === 2) ||
                               (dataset.fill === false);
            
            // TASK-056-03: Визуальная индикация скрытых серий
            if (meta.hidden) {
              label.fontColor = '#9ca3af'; // Серый для скрытых
              label.textDecoration = 'line-through'; // Зачёркнутый текст
              label.opacity = 0.5; // Уменьшенная прозрачность
            } else if (isAuxiliary) {
              // TASK-056-03: Вспомогательные серии - светло-серый цвет
              label.fontColor = '#6b7280';
            } else {
              // TASK-056-03: Основные серии - тёмно-серый цвет
              label.fontColor = '#111827';
            }
            
            return label;
          });
        }
      },
      onClick: (e, legendItem) => {
        // TASK-056-03: Toggle видимости серии при клике
        const index = legendItem.datasetIndex;
        if (index === undefined || index === null) {
          console.warn('[Legend] Invalid datasetIndex:', index);
          return;
        }
        
        const chart = e.chart;
        if (!chart) {
          console.warn('[Legend] Chart not found');
          return;
        }
        
        const meta = chart.getDatasetMeta(index);
        if (!meta) {
          console.warn('[Legend] Dataset meta not found for index:', index);
          return;
        }
        
        // TASK-056-03: Toggle видимости серии
        meta.hidden = !meta.hidden;
        
        // TASK-056-03: Обновить график с анимацией
        chart.update('active'); // 'active' для плавной анимации
      },
      onHover: (e, legendItem) => {
        // TASK-056-03: Hover-эффект - изменить курсор
        if (e.native && e.native.target) {
          e.native.target.style.cursor = 'pointer';
        }
      },
      onLeave: (e, legendItem) => {
        // TASK-056-03: Сброс курсора при уходе
        if (e.native && e.native.target) {
          e.native.target.style.cursor = 'default';
        }
      }
    }
  },
  // TASK-048: Убран onClick обработчик - клики на точки графика не открывают попапы
  // TASK-056-04: Улучшение сетки и осей
  scales: chartType.value === 'doughnut'
    ? {}
    : {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            font: {
              size: 14 // TASK-056-04: Размер шрифта
            },
            padding: 10, // TASK-056-04: Padding
            color: '#374151', // TASK-056-04: Цвет текста
            callback: (value) => {
              // TASK-056-04: Форматирование с разделителем тысяч
              // Обработка edge cases
              if (value === null || value === undefined || isNaN(value)) {
                return '0';
              }
              
              // Использовать функцию formatNumber из TASK-056-02
              return formatNumber(value);
            }
          },
          title: {
            display: false
          },
          grid: {
            // TASK-056-04: Тонкие линии сетки с выделением основных делений
            color: (context) => {
              // Обработка edge cases
              if (!context || !context.tick || context.tick.value === undefined) {
                return '#e5e7eb'; // Fallback
              }
              
              const value = context.tick.value;
              
              // Проверка на NaN или Infinity
              if (isNaN(value) || !isFinite(value)) {
                return '#e5e7eb';
              }
              
              // TASK-056-04: Более тёмные линии для основных делений (каждые 5 единиц)
              // Также выделяем 0
              if (value === 0 || value % 5 === 0) {
                return '#d1d5db'; // Чуть темнее для основных делений
              }
              
              return '#e5e7eb'; // Обычный цвет для обычных линий
            },
            lineWidth: (context) => {
              // Обработка edge cases
              if (!context || !context.tick || context.tick.value === undefined) {
                return 1; // Fallback
              }
              
              const value = context.tick.value;
              
              if (isNaN(value) || !isFinite(value)) {
                return 1;
              }
              
              // TASK-056-04: Чуть толще для основных делений и 0
              if (value === 0 || value % 5 === 0) {
                return 1.5; // Толще для основных делений
              }
              
              return 1; // Обычная толщина
            }
          }
        },
        x: {
          ticks: {
            maxRotation: 45, // TASK-056-04: Угол поворота
            minRotation: 45,
            font: {
              size: 14 // TASK-056-04: Размер шрифта
            },
            padding: 10, // TASK-056-04: Padding
            color: '#374151' // TASK-056-04: Цвет текста
          },
          title: {
            display: false
          },
          grid: {
            // TASK-056-04: Тонкие линии сетки
            color: '#e5e7eb', // Светло-серый цвет
            lineWidth: 1 // Тонкие линии
          }
        }
      }
}));

// TASK-048: Получаем данные текущей недели (последняя неделя из weeksData или currentWeek)
// Приоритет: series[последний] (если есть данные) > currentWeek > weeksData[последний] > data
const currentWeekData = computed(() => {
  // Сначала проверяем series - если там есть данные, используем их (это гарантирует соответствие графику)
  if (props.data?.series) {
    const series = props.data.series;
    // Находим максимальный индекс (длина самого длинного массива - 1)
    const lastIndex = Math.max(
      (Array.isArray(series.new) ? series.new.length : 0) - 1,
      (Array.isArray(series.closed) ? series.closed.length : 0) - 1,
      (Array.isArray(series.carryover) ? series.carryover.length : 0) - 1,
      -1
    );
    
    if (lastIndex >= 0) {
      const fromSeries = {
        newTickets: (Array.isArray(series.new) && series.new[lastIndex] !== undefined) ? series.new[lastIndex] : 0,
        closedTickets: (Array.isArray(series.closed) && series.closed[lastIndex] !== undefined) ? series.closed[lastIndex] : 0,
        closedTicketsCreatedThisWeek: (Array.isArray(series.closedCreatedThisWeek) && series.closedCreatedThisWeek[lastIndex] !== undefined) ? series.closedCreatedThisWeek[lastIndex] : 0,
        closedTicketsCreatedOtherWeek: (Array.isArray(series.closedCreatedOtherWeek) && series.closedCreatedOtherWeek[lastIndex] !== undefined) ? series.closedCreatedOtherWeek[lastIndex] : 0,
        carryoverTickets: (Array.isArray(series.carryover) && series.carryover[lastIndex] !== undefined) ? series.carryover[lastIndex] : 0,
        carryoverTicketsCreatedThisWeek: (Array.isArray(series.carryoverCreatedThisWeek) && series.carryoverCreatedThisWeek[lastIndex] !== undefined) ? series.carryoverCreatedThisWeek[lastIndex] : 0,
        carryoverTicketsCreatedOtherWeek: (Array.isArray(series.carryoverCreatedOtherWeek) && series.carryoverCreatedOtherWeek[lastIndex] !== undefined) ? series.carryoverCreatedOtherWeek[lastIndex] : 0
      };
      
      // Если в series есть хотя бы одно ненулевое значение, используем эти данные
      if (fromSeries.newTickets > 0 || fromSeries.closedTickets > 0 || fromSeries.carryoverTickets > 0) {
        return fromSeries;
      }
    }
  }
  
  // 2. Пробуем currentWeek (если есть и содержит ненулевые данные)
  if (props.data?.currentWeek && typeof props.data.currentWeek === 'object') {
    const cw = props.data.currentWeek;
    if ((cw.newTickets ?? 0) > 0 || (cw.closedTickets ?? 0) > 0 || (cw.carryoverTickets ?? 0) > 0) {
      return cw;
    }
  }
  
  // 3. Берём последний элемент из weeksData
  if (props.data?.weeksData && Array.isArray(props.data.weeksData) && props.data.weeksData.length > 0) {
    const lastWeek = props.data.weeksData[props.data.weeksData.length - 1];
    if ((lastWeek.newTickets ?? 0) > 0 || (lastWeek.closedTickets ?? 0) > 0 || (lastWeek.carryoverTickets ?? 0) > 0) {
      return lastWeek;
    }
  }
  
  // 4. Fallback: возвращаем данные из series даже если они нули (для консистентности с графиком)
  if (props.data?.series) {
    const series = props.data.series;
    const lastIndex = Math.max(
      (Array.isArray(series.new) ? series.new.length : 0) - 1,
      (Array.isArray(series.closed) ? series.closed.length : 0) - 1,
      (Array.isArray(series.carryover) ? series.carryover.length : 0) - 1,
      -1
    );
    
    if (lastIndex >= 0) {
      return {
        newTickets: (Array.isArray(series.new) && series.new[lastIndex] !== undefined) ? series.new[lastIndex] : 0,
        closedTickets: (Array.isArray(series.closed) && series.closed[lastIndex] !== undefined) ? series.closed[lastIndex] : 0,
        closedTicketsCreatedThisWeek: (Array.isArray(series.closedCreatedThisWeek) && series.closedCreatedThisWeek[lastIndex] !== undefined) ? series.closedCreatedThisWeek[lastIndex] : 0,
        closedTicketsCreatedOtherWeek: (Array.isArray(series.closedCreatedOtherWeek) && series.closedCreatedOtherWeek[lastIndex] !== undefined) ? series.closedCreatedOtherWeek[lastIndex] : 0,
        carryoverTickets: (Array.isArray(series.carryover) && series.carryover[lastIndex] !== undefined) ? series.carryover[lastIndex] : 0,
        carryoverTicketsCreatedThisWeek: (Array.isArray(series.carryoverCreatedThisWeek) && series.carryoverCreatedThisWeek[lastIndex] !== undefined) ? series.carryoverCreatedThisWeek[lastIndex] : 0,
        carryoverTicketsCreatedOtherWeek: (Array.isArray(series.carryoverCreatedOtherWeek) && series.carryoverCreatedOtherWeek[lastIndex] !== undefined) ? series.carryoverCreatedOtherWeek[lastIndex] : 0
      };
    }
  }
  
  // 5. Последний fallback на прямые данные
  return props.data || {};
});

// Обработчик клика на summary-карточки
// TASK-048: Используем currentWeekData для проверки наличия данных (текущая неделя)
const handleSummaryClick = (type) => {
  const currentWeek = currentWeekData.value;
  const newTickets = currentWeek?.newTickets ?? 0;
  const closedTickets = currentWeek?.closedTickets ?? 0;
  const carryoverTickets = currentWeek?.carryoverTickets ?? 0;
  
  if (type === 'new' && newTickets > 0) {
    emit('open-stages');
  } else if (type === 'closed' && closedTickets > 0) {
    if ((props.data?.responsible || []).length > 0) {
      emit('open-responsible');
    }
  } else if (type === 'carryover' && carryoverTickets > 0) {
    emit('open-carryover');
  }
};
</script>

<style scoped>
.ac-chart {
  padding: var(--spacing-lg, 20px);
  background: var(--b24-bg-white, #fff);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-md, 0 6px 20px rgba(0, 0, 0, 0.08));
}

.ac-chart__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.ac-chart__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--b24-text-primary, #111827);
}

.ac-chart__subtitle {
  margin: 4px 0 0;
  color: var(--b24-text-secondary, #6b7280);
  font-size: 14px;
}

.ac-chart__controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chart-type-selector {
  display: inline-flex;
  gap: 6px;
}

.chart-type-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--b24-border-light, #e5e7eb);
  background: var(--b24-bg, #f9fafb);
  cursor: pointer;
  transition: all 0.2s ease;
}

.chart-type-btn.active {
  background: var(--b24-primary, #007bff);
  color: var(--b24-text-inverse, #fff);
  border-color: var(--b24-primary, #007bff);
}

.chart-type-icon {
  font-size: 16px;
}

.ac-chart__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  border: 1px solid var(--b24-border-light, #e5e7eb);
  border-radius: var(--radius-md, 10px);
  padding: 12px;
  background: var(--b24-bg, #f9fafb);
  cursor: pointer;
  transition: all 0.2s ease;
}

.summary-card:hover {
  border-color: var(--b24-primary, #007bff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.summary-card--new:hover {
  border-color: var(--b24-primary, #007bff);
}

.summary-card--closed:hover {
  border-color: var(--b24-success, #28a745);
}

.summary-card--carryover:hover {
  border-color: #ff9800;
}

.summary-card__label {
  color: var(--b24-text-secondary, #6b7280);
  font-size: 13px;
  margin-bottom: 6px;
}

.summary-card__value {
  font-size: 24px;
  font-weight: 700;
  color: var(--b24-text-primary, #111827);
}

.summary-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stage-tag {
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--b24-bg-white, #fff);
  border: 1px solid var(--b24-border-light, #e5e7eb);
  font-size: 12px;
}

.stage-tag--empty {
  color: var(--b24-text-secondary, #6b7280);
}

.ac-chart__body {
  min-height: 640px; /* Уменьшено на 20% от 800px */
  width: 100%;
}

/* TASK-052: Стили для разделённых графиков */
.split-charts-container {
  display: flex;
  gap: var(--spacing-xl, 32px); /* Уменьшено на 20% от 40px */
  width: 100%;
  padding: 0;
  min-height: 720px; /* Уменьшено на 20% от 900px */
}

.chart-wrapper {
  flex: 1;
  min-width: 0; /* Для корректной работы flex */
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}


.chart-subtitle {
  margin: 0 0 var(--spacing-lg, 16px) 0;
  font-size: 20px; /* Уменьшено на ~10% от 22px */
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
  text-align: center;
  flex-shrink: 0; /* Заголовок не сжимается */
}

.chart-canvas-wrapper {
  position: relative;
  height: 720px; /* Уменьшено на 20% от 900px */
  flex: 1;
  min-height: 720px; /* Фиксированная минимальная высота */
  width: 100%;
}

/* Адаптивность для мобильных */
@media (max-width: 768px) {
  .split-charts-container {
    flex-direction: column;
    min-height: auto;
  }
  
  .chart-wrapper {
    width: 100%;
    height: auto;
  }
  
  .chart-canvas-wrapper {
    height: 480px; /* Уменьшено на 20% от 600px */
    min-height: 480px;
  }
  
  .chart-subtitle {
    font-size: 18px; /* Уменьшено на 10% от 20px */
  }
  
  .ac-chart__body {
    min-height: 520px; /* Уменьшено на 20% от 650px */
  }
}

/* TASK-047: Компактная карточка с разбивкой закрытых тикетов */
.summary-card--closed-breakdown {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* TASK-047: Компактная карточка с разбивкой переходящих тикетов */
.summary-card--carryover-breakdown {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-card__value-main {
  font-size: 24px;
  font-weight: 700;
  color: var(--b24-primary, #007bff);
  line-height: 1.2;
  margin-bottom: 4px;
}

/* Компактный контейнер для разбивки */
.summary-card__breakdown {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

/* Компактный элемент разбивки */
.breakdown-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--b24-bg, #f9fafb);
}

.breakdown-item__icon {
  font-size: 14px;
  line-height: 1;
}

.breakdown-item--this-week .breakdown-item__icon {
  color: var(--b24-success, #28a745);
}

.breakdown-item--other-week .breakdown-item__icon {
  color: var(--b24-warning, #ffc107);
}

.breakdown-item__value {
  font-size: 13px;
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
}

.breakdown-item--this-week .breakdown-item__value {
  color: var(--b24-success, #28a745);
}

.breakdown-item--other-week .breakdown-item__value {
  color: var(--b24-warning, #ffc107);
}

.breakdown-item__label {
  font-size: 11px;
  color: var(--b24-text-secondary, #6b7280);
}

/* Адаптивность для мобильных устройств */
@media (max-width: 768px) {
  .summary-card__breakdown {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  
  .summary-card__value-main {
    font-size: 20px;
  }
}
</style>

<!-- TASK-056-02: Глобальные стили для tooltip Chart.js -->
<!-- TASK-056-03: Глобальные стили для легенды Chart.js -->
<!-- TASK-056-06: Глобальные стили для анимаций Chart.js -->
<style>
/* Chart.js создаёт tooltip динамически, поэтому нужны глобальные стили */
.chartjs-tooltip {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  /* TASK-056-06: Плавное появление tooltip с задержкой */
  transition: opacity 0.3s ease-out 0.2s !important; /* Задержка 200ms, длительность 300ms */
  opacity: 0;
  animation: tooltipFadeIn 0.3s ease-out 0.2s forwards; /* Задержка 200ms */
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* TASK-056-03: Стили для элементов легенды Chart.js */
.chartjs-legend-item {
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.chartjs-legend-item:hover {
  opacity: 0.7;
}

/* TASK-056-06: Оптимизация производительности для анимаций */
.chart-canvas-wrapper canvas {
  will-change: transform;
  transition: opacity 0.3s ease-out;
}

/* TASK-056-03: Адаптивность легенды на мобильных */
@media (max-width: 768px) {
  .chartjs-legend {
    max-width: 100%;
  }
  
  .chartjs-legend-item {
    font-size: 11px !important;
    padding: 8px !important;
  }
}
</style>

