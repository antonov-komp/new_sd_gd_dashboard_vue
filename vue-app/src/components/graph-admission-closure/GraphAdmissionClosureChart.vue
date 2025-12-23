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
      <!-- TASK-062: Блок текущей недели -->
      <div class="summary-week-block summary-week-block--current">
        <h3 class="summary-week-block__title">
          <span class="summary-week-block__title-text">Текущая неделя</span>
          <span class="summary-week-block__title-week">
            Неделя {{ currentWeekMeta.weekNumber ?? '—' }}
          </span>
          <span class="summary-week-block__title-dates" v-if="currentWeekMeta.weekStartUtc">
            {{ formatWeekDates(currentWeekMeta.weekStartUtc, currentWeekMeta.weekEndUtc) }}
          </span>
        </h3>
        <div class="summary-week-block__cards">
          <!-- TASK-048: Используем currentWeekData для summary-карточек (текущая неделя из 4) -->
          <div class="summary-card summary-card--new" @click="handleSummaryClick('new')">
            <div class="summary-card__label">Новые за неделю</div>
            <div class="summary-card__value-wrapper">
              <div class="summary-card__value">{{ currentWeekData?.newTickets ?? 0 }}</div>
              <!-- TASK-062: Процент изменения относительно предыдущей недели -->
              <div 
                v-if="currentWeekPercentages.newTickets !== null" 
                :class="['percentage-indicator', currentWeekPercentages.newTickets >= 0 ? 'percentage-indicator--positive' : 'percentage-indicator--negative']"
                :title="`Изменение относительно предыдущей недели (Неделя ${previousWeekData?.weekNumber ?? '—'}): ${formatPercentage(currentWeekPercentages.newTickets)}`"
              >
                <span class="percentage-indicator__arrow">{{ currentWeekPercentages.newTickets >= 0 ? '↑' : '↓' }}</span>
                <span class="percentage-indicator__value">{{ formatPercentage(currentWeekPercentages.newTickets) }}</span>
                <span class="percentage-indicator__label">к неделе {{ previousWeekData?.weekNumber ?? '—' }}</span>
              </div>
            </div>
          </div>
          <!-- TASK-047: Три цифры для закрытых тикетов (компактный вариант) -->
          <div class="summary-card summary-card--closed-breakdown" @click="handleSummaryClick('closed')">
            <div class="summary-card__label">Закрытые за неделю</div>
            <div class="summary-card__value-wrapper">
              <div class="summary-card__value-main">{{ currentWeekData?.closedTickets ?? 0 }}</div>
              <!-- TASK-062: Процент изменения относительно предыдущей недели -->
              <div 
                v-if="currentWeekPercentages.closedTickets !== null" 
                :class="['percentage-indicator', currentWeekPercentages.closedTickets >= 0 ? 'percentage-indicator--positive' : 'percentage-indicator--negative']"
                :title="`Изменение относительно предыдущей недели (Неделя ${previousWeekData?.weekNumber ?? '—'}): ${formatPercentage(currentWeekPercentages.closedTickets)}`"
              >
                <span class="percentage-indicator__arrow">{{ currentWeekPercentages.closedTickets >= 0 ? '↑' : '↓' }}</span>
                <span class="percentage-indicator__value">{{ formatPercentage(currentWeekPercentages.closedTickets) }}</span>
                <span class="percentage-indicator__label">к неделе {{ previousWeekData?.weekNumber ?? '—' }}</span>
              </div>
            </div>
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
            <div class="summary-card__value-wrapper">
              <div class="summary-card__value-main">{{ currentWeekData?.carryoverTickets ?? 0 }}</div>
              <!-- TASK-062: Процент изменения относительно предыдущей недели -->
              <div 
                v-if="currentWeekPercentages.carryoverTickets !== null" 
                :class="['percentage-indicator', currentWeekPercentages.carryoverTickets >= 0 ? 'percentage-indicator--positive' : 'percentage-indicator--negative']"
                :title="`Изменение относительно предыдущей недели (Неделя ${previousWeekData?.weekNumber ?? '—'}): ${formatPercentage(currentWeekPercentages.carryoverTickets)}`"
              >
                <span class="percentage-indicator__arrow">{{ currentWeekPercentages.carryoverTickets >= 0 ? '↑' : '↓' }}</span>
                <span class="percentage-indicator__value">{{ formatPercentage(currentWeekPercentages.carryoverTickets) }}</span>
                <span class="percentage-indicator__label">к неделе {{ previousWeekData?.weekNumber ?? '—' }}</span>
              </div>
            </div>
            <div class="summary-card__breakdown">
              <div class="breakdown-item breakdown-item--this-week">
                <span class="breakdown-item__icon">✓</span>
                <span class="breakdown-item__value">{{ currentWeekData?.carryoverTicketsCreatedThisWeek ?? 0 }}</span>
                <span class="breakdown-item__label">этой недели</span>
              </div>
              <div class="breakdown-item breakdown-item--previous-week">
                <span class="breakdown-item__icon">↻</span>
                <span class="breakdown-item__value">{{ currentWeekData?.carryoverTicketsCreatedPreviousWeek ?? 0 }}</span>
                <span class="breakdown-item__label">предыдущей недели</span>
              </div>
              <div class="breakdown-item breakdown-item--older">
                <span class="breakdown-item__icon">↻</span>
                <span class="breakdown-item__value">{{ currentWeekData?.carryoverTicketsCreatedOlder ?? 0 }}</span>
                <span class="breakdown-item__label">остальные</span>
              </div>
            </div>
          </div>
          <div class="summary-card summary-card--stages">
            <div class="summary-card__label">Закрытия по стадиям</div>
            <div class="summary-card__tags">
              <span
                v-for="stage in currentWeekStages"
                :key="stage.stageId"
                class="stage-tag"
              >
                {{ stage.stageName || stage.stageId }} — {{ stage.count }}
              </span>
              <span v-if="!currentWeekStages || currentWeekStages.length === 0" class="stage-tag stage-tag--empty">
                Нет данных
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- TASK-062: Визуальный разделитель -->
      <div v-if="previousWeekData" class="summary-week-divider">
        <div class="summary-week-divider__line"></div>
        <div class="summary-week-divider__label">Предыдущая неделя</div>
      </div>

      <!-- TASK-062: Блок предыдущей недели -->
      <div v-if="previousWeekData" class="summary-week-block summary-week-block--previous">
        <h3 class="summary-week-block__title">
          <span class="summary-week-block__title-text">Предыдущая неделя</span>
          <span class="summary-week-block__title-week">
            Неделя {{ previousWeekData.weekNumber ?? '—' }}
          </span>
          <span class="summary-week-block__title-dates" v-if="previousWeekData.weekStartUtc">
            {{ formatWeekDates(previousWeekData.weekStartUtc, previousWeekData.weekEndUtc) }}
          </span>
        </h3>
        <div class="summary-week-block__cards">
          <!-- TASK-062: Карточка 1: Новые за неделю (предыдущая) - кликабельна -->
          <div class="summary-card summary-card--new summary-card--previous summary-card--clickable" @click="handlePreviousWeekSummaryClick('new')">
            <div class="summary-card__label">Новые за неделю</div>
            <div class="summary-card__value-wrapper">
              <!-- TASK-062: Сравнение значений: слева - предыдущая неделя (51), справа - предпредыдущая неделя (50) -->
              <div class="summary-card__values-comparison">
                <div class="summary-card__value-comparison-item summary-card__value-comparison-item--previous">
                  <div class="summary-card__value">{{ previousWeekData?.newTickets ?? 0 }}</div>
                  <span class="value-label">Неделя {{ previousWeekData?.weekNumber ?? '—' }}</span>
                </div>
                <div class="summary-card__value-comparison-item summary-card__value-comparison-item--current">
                  <div class="summary-card__value summary-card__value--current-week">{{ prePreviousWeekData?.newTickets ?? 0 }}</div>
                  <span class="value-label">Неделя {{ prePreviousWeekData?.weekNumber ?? '—' }}</span>
                </div>
              </div>
              <!-- TASK-062: Процент изменения относительно предпредыдущей недели -->
              <div 
                v-if="previousWeekPercentages.newTickets !== null" 
                :class="['percentage-indicator', previousWeekPercentages.newTickets >= 0 ? 'percentage-indicator--positive' : 'percentage-indicator--negative']"
                :title="`Изменение относительно предпредыдущей недели (Неделя ${prePreviousWeekData?.weekNumber ?? '—'}): ${formatPercentage(previousWeekPercentages.newTickets)}`"
              >
                <span class="percentage-indicator__arrow">{{ previousWeekPercentages.newTickets >= 0 ? '↑' : '↓' }}</span>
                <span class="percentage-indicator__value">{{ formatPercentage(previousWeekPercentages.newTickets) }}</span>
                <span class="percentage-indicator__label">к неделе {{ prePreviousWeekData?.weekNumber ?? '—' }}</span>
              </div>
            </div>
          </div>
          
          <!-- TASK-062: Карточка 2: Закрытые за неделю (предыдущая, с разбивкой) - кликабельна -->
          <div class="summary-card summary-card--closed-breakdown summary-card--previous summary-card--clickable" @click="handlePreviousWeekSummaryClick('closed')">
            <div class="summary-card__label">Закрытые за неделю</div>
            <div class="summary-card__value-wrapper">
              <!-- TASK-062: Сравнение значений: слева - предыдущая неделя (51), справа - предпредыдущая неделя (50) -->
              <div class="summary-card__values-comparison">
                <div class="summary-card__value-comparison-item summary-card__value-comparison-item--previous">
                  <div class="summary-card__value-main">{{ previousWeekData?.closedTickets ?? 0 }}</div>
                  <span class="value-label">Неделя {{ previousWeekData?.weekNumber ?? '—' }}</span>
                </div>
                <div class="summary-card__value-comparison-item summary-card__value-comparison-item--current">
                  <div class="summary-card__value-main summary-card__value-main--current-week">{{ prePreviousWeekData?.closedTickets ?? 0 }}</div>
                  <span class="value-label">Неделя {{ prePreviousWeekData?.weekNumber ?? '—' }}</span>
                </div>
              </div>
              <!-- TASK-062: Процент изменения относительно предпредыдущей недели -->
              <div 
                v-if="previousWeekPercentages.closedTickets !== null" 
                :class="['percentage-indicator', previousWeekPercentages.closedTickets >= 0 ? 'percentage-indicator--positive' : 'percentage-indicator--negative']"
                :title="`Изменение относительно предпредыдущей недели (Неделя ${prePreviousWeekData?.weekNumber ?? '—'}): ${formatPercentage(previousWeekPercentages.closedTickets)}`"
              >
                <span class="percentage-indicator__arrow">{{ previousWeekPercentages.closedTickets >= 0 ? '↑' : '↓' }}</span>
                <span class="percentage-indicator__value">{{ formatPercentage(previousWeekPercentages.closedTickets) }}</span>
                <span class="percentage-indicator__label">к неделе {{ prePreviousWeekData?.weekNumber ?? '—' }}</span>
              </div>
            </div>
            <div class="summary-card__breakdown">
              <div class="breakdown-item breakdown-item--this-week">
                <span class="breakdown-item__icon">✓</span>
                <span class="breakdown-item__value">{{ previousWeekData?.closedTicketsCreatedThisWeek ?? 0 }}</span>
                <span class="breakdown-item__label">этой неделей</span>
              </div>
              <div class="breakdown-item breakdown-item--other-week">
                <span class="breakdown-item__icon">↻</span>
                <span class="breakdown-item__value">{{ previousWeekData?.closedTicketsCreatedOtherWeek ?? 0 }}</span>
                <span class="breakdown-item__label">другой неделей</span>
              </div>
            </div>
          </div>
          
          <!-- TASK-062: Карточка 3: Переходящие (предыдущая, с разбивкой) - кликабельна -->
          <div class="summary-card summary-card--carryover-breakdown summary-card--previous summary-card--clickable" @click="handlePreviousWeekSummaryClick('carryover')">
            <div class="summary-card__label">Переходящие</div>
            <div class="summary-card__value-wrapper">
              <!-- TASK-062: Сравнение значений: слева - предыдущая неделя (51), справа - предпредыдущая неделя (50) -->
              <div class="summary-card__values-comparison">
                <div class="summary-card__value-comparison-item summary-card__value-comparison-item--previous">
                  <div class="summary-card__value-main">{{ previousWeekData?.carryoverTickets ?? 0 }}</div>
                  <span class="value-label">Неделя {{ previousWeekData?.weekNumber ?? '—' }}</span>
                </div>
                <div class="summary-card__value-comparison-item summary-card__value-comparison-item--current">
                  <div class="summary-card__value-main summary-card__value-main--current-week">{{ prePreviousWeekData?.carryoverTickets ?? 0 }}</div>
                  <span class="value-label">Неделя {{ prePreviousWeekData?.weekNumber ?? '—' }}</span>
                </div>
              </div>
              <!-- TASK-062: Процент изменения относительно предпредыдущей недели -->
              <div 
                v-if="previousWeekPercentages.carryoverTickets !== null" 
                :class="['percentage-indicator', previousWeekPercentages.carryoverTickets >= 0 ? 'percentage-indicator--positive' : 'percentage-indicator--negative']"
                :title="`Изменение относительно предпредыдущей недели (Неделя ${prePreviousWeekData?.weekNumber ?? '—'}): ${formatPercentage(previousWeekPercentages.carryoverTickets)}`"
              >
                <span class="percentage-indicator__arrow">{{ previousWeekPercentages.carryoverTickets >= 0 ? '↑' : '↓' }}</span>
                <span class="percentage-indicator__value">{{ formatPercentage(previousWeekPercentages.carryoverTickets) }}</span>
                <span class="percentage-indicator__label">к неделе {{ prePreviousWeekData?.weekNumber ?? '—' }}</span>
              </div>
            </div>
            <div class="summary-card__breakdown">
              <div class="breakdown-item breakdown-item--this-week">
                <span class="breakdown-item__icon">✓</span>
                <span class="breakdown-item__value">{{ previousWeekData?.carryoverTicketsCreatedThisWeek ?? 0 }}</span>
                <span class="breakdown-item__label">этой недели</span>
              </div>
              <div class="breakdown-item breakdown-item--previous-week">
                <span class="breakdown-item__icon">↻</span>
                <span class="breakdown-item__value">{{ previousWeekData?.carryoverTicketsCreatedPreviousWeek ?? 0 }}</span>
                <span class="breakdown-item__label">предыдущей недели</span>
              </div>
              <div class="breakdown-item breakdown-item--older">
                <span class="breakdown-item__icon">↻</span>
                <span class="breakdown-item__value">{{ previousWeekData?.carryoverTicketsCreatedOlder ?? 0 }}</span>
                <span class="breakdown-item__label">остальные</span>
              </div>
            </div>
          </div>
          
          <!-- Карточка 4: Закрытия по стадиям (предыдущая) -->
          <!-- Примечание: Стадии для предыдущей недели могут быть недоступны в текущем API -->
          <!-- Используем общие стадии или показываем "Нет данных" -->
          <div class="summary-card summary-card--stages summary-card--previous">
            <div class="summary-card__label">Закрытия по стадиям</div>
            <div class="summary-card__tags">
              <span
                v-for="stage in previousWeekStages"
                :key="stage.stageId"
                class="stage-tag"
              >
                {{ stage.stageName || stage.stageId }} — {{ stage.count }}
              </span>
              <span v-if="!previousWeekStages || previousWeekStages.length === 0" class="stage-tag stage-tag--empty">
                {{ previousWeekStagesEmptyLabel }}
              </span>
            </div>
          </div>
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
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { chartColors } from '@/utils/chart-config.js';

// TASK-066: Регистрация плагина для отображения datalabels на линейных графиках недельного режима
ChartJS.register(ChartDataLabels);

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
      carryoverTicketsCreatedPreviousWeek: 0, // TASK-063: НОВОЕ
      carryoverTicketsCreatedOlder: 0, // TASK-063: НОВОЕ
      carryoverTicketsCreatedOtherWeek: 0, // TASK-063: DEPRECATED (для обратной совместимости)
      series: { // TASK-049: массивы с одним элементом для выбранной недели
        new: [0],
        closed: [0],
        closedCreatedThisWeek: [0],
        closedCreatedOtherWeek: [0],
        carryover: [0],
        carryoverCreatedThisWeek: [0],
        carryoverCreatedPreviousWeek: [0], // TASK-063: НОВОЕ
        carryoverCreatedOlder: [0], // TASK-063: НОВОЕ
        carryoverCreatedOtherWeek: [0] // TASK-063: DEPRECATED
      },
      stagesByWeek: [], // TASK-064: стадии по неделям (синхронизировано с meta.weeks/series)
      stages: [],
      responsible: []
    })
  }
});

const emit = defineEmits(['open-responsible', 'open-stages', 'open-carryover']);

// TASK-062: Computed-свойство для метаданных предыдущей недели
const previousWeekMeta = computed(() => {
  const weeks = props.meta?.weeks || [];
  if (weeks.length >= 2) {
    return weeks[weeks.length - 2]; // Предпоследняя неделя
  }
  return null;
});

const chartTypes = [
  { value: 'line', label: 'Линейный', icon: '📈' },
  { value: 'bar', label: 'Столбчатый', icon: '📊' },
  { value: 'doughnut', label: 'Круговая', icon: '🍩' }
];

const chartType = ref('line');

const baseDataLabelConfig = {
  color: '#111827',
  font: {
    size: 12,
    weight: 'bold'
  },
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  borderColor: (ctx) => ctx?.dataset?.borderColor || '#111827',
  borderWidth: 1,
  borderRadius: 4,
  padding: 4,
  offset: 8,
  formatter: (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '';
    }
    return formatNumber(value);
  },
  display: (context) => {
    const chartKind = context?.chart?.config?.type;
    if (chartKind !== 'line') {
      return false;
    }
    const value = context?.dataset?.data?.[context.dataIndex];
    return value !== null && value !== undefined && !isNaN(value) && isFinite(value);
  }
};

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
        pointRadius: 4, // TASK-066: Видимые точки для недельного режима
        pointBorderWidth: 1,
        pointBorderColor: chartColors.primary,
        pointHoverRadius: 6, // TASK-056-01: Показывать точки при hover
        pointHoverBorderWidth: 2, // TASK-056-01: Обводка точек
        pointHoverBorderColor: '#ffffff', // TASK-056-01: Белая обводка
        pointHoverBackgroundColor: chartColors.primary,
        pointBackgroundColor: chartColors.primary,
        datalabels: {
          ...baseDataLabelConfig,
          anchor: 'end',
          align: 'top',
          offset: 10,
          color: chartColors.primary,
          borderColor: chartColors.primary
        }
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
        pointRadius: 4, // TASK-066: Видимые точки для недельного режима
        pointBorderWidth: 1,
        pointBorderColor: chartColors.success,
        pointHoverRadius: 6, // TASK-056-01: Показывать точки при hover
        pointHoverBorderWidth: 2, // TASK-056-01: Обводка точек
        pointHoverBorderColor: '#ffffff', // TASK-056-01: Белая обводка
        pointHoverBackgroundColor: chartColors.success,
        pointBackgroundColor: chartColors.success,
        datalabels: {
          ...baseDataLabelConfig,
          anchor: 'start',
          align: 'bottom',
          offset: 10,
          color: chartColors.success,
          borderColor: chartColors.success
        }
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
        pointRadius: 3, // TASK-066: Видимые точки для вспомогательных линий
        pointBorderWidth: 1,
        pointBorderColor: chartColors.successLight,
        pointHoverRadius: 5, // TASK-056-01: Показывать точки при hover (меньший радиус)
        pointHoverBorderWidth: 2, // TASK-056-01: Обводка точек
        pointHoverBorderColor: '#ffffff', // TASK-056-01: Белая обводка
        pointHoverBackgroundColor: chartColors.successLight,
        pointBackgroundColor: chartColors.successLight,
        datalabels: {
          ...baseDataLabelConfig,
          anchor: 'end',
          align: 'bottom',
          offset: 8,
          color: chartColors.successLight,
          borderColor: chartColors.successLight
        }
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
        pointRadius: 3, // TASK-066: Видимые точки для вспомогательных линий
        pointBorderWidth: 1,
        pointBorderColor: chartColors.warning,
        pointHoverRadius: 5, // TASK-056-01: Показывать точки при hover (меньший радиус)
        pointHoverBorderWidth: 2, // TASK-056-01: Обводка точек
        pointHoverBorderColor: '#ffffff', // TASK-056-01: Белая обводка
        pointHoverBackgroundColor: chartColors.warning,
        pointBackgroundColor: chartColors.warning,
        datalabels: {
          ...baseDataLabelConfig,
          anchor: 'end',
          align: 'bottom',
          offset: 8,
          color: chartColors.warning,
          borderColor: chartColors.warning
        }
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
  
  const carryoverCreatedPreviousWeekSeries = Array.isArray(props.data.series?.carryoverCreatedPreviousWeek) && props.data.series.carryoverCreatedPreviousWeek.length > 0
    ? props.data.series.carryoverCreatedPreviousWeek
    : [props.data.carryoverTicketsCreatedPreviousWeek ?? 0]; // TASK-063: НОВОЕ

  const carryoverCreatedOlderSeries = Array.isArray(props.data.series?.carryoverCreatedOlder) && props.data.series.carryoverCreatedOlder.length > 0
    ? props.data.series.carryoverCreatedOlder
    : [props.data.carryoverTicketsCreatedOlder ?? 0]; // TASK-063: НОВОЕ

  // TASK-063: DEPRECATED - для обратной совместимости
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
        pointRadius: 4, // TASK-066: Видимые точки для недельного режима
        pointBorderWidth: 1,
        pointBorderColor: chartColors.carryover,
        pointHoverRadius: 6, // TASK-056-01: Показывать точки при hover
        pointHoverBorderWidth: 2, // TASK-056-01: Обводка точек
        pointHoverBorderColor: '#ffffff', // TASK-056-01: Белая обводка
        pointHoverBackgroundColor: chartColors.carryover,
        pointBackgroundColor: chartColors.carryover,
        datalabels: {
          ...baseDataLabelConfig,
          anchor: 'end',
          align: 'top',
          offset: 4, // TASK-066: Соответствует месячному режиму (offset: 4)
          color: chartColors.carryover,
          borderColor: chartColors.carryover
        }
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
        pointRadius: 3, // TASK-066: Видимые точки для вспомогательных линий
        pointBorderWidth: 1,
        pointBorderColor: chartColors.carryoverLight,
        pointHoverRadius: 5, // TASK-056-01: Показывать точки при hover (меньший радиус)
        pointHoverBorderWidth: 2, // TASK-056-01: Обводка точек
        pointHoverBorderColor: '#ffffff', // TASK-056-01: Белая обводка
        pointHoverBackgroundColor: chartColors.carryoverLight,
        pointBackgroundColor: chartColors.carryoverLight,
        datalabels: {
          ...baseDataLabelConfig,
          anchor: 'end',
          align: 'top',
          offset: 6,
          color: chartColors.carryoverLight,
          borderColor: chartColors.carryoverLight
        }
      },
      {
        // TASK-063: Вспомогательная линия - Переходящие (созданы предыдущей неделей)
        label: 'Переходящие (созданы предыдущей неделей)',
        data: carryoverCreatedPreviousWeekSeries,
        backgroundColor: chartColors.warning,
        borderColor: chartColors.warning,
        borderWidth: 2, // TASK-056-01: Уменьшена толщина для вспомогательных линий
        tension: 0.4, // TASK-056-01: Увеличено скругление
        borderDash: [8, 4], // TASK-056-01: Обновлён стиль пунктира
        fill: false, // TASK-056-01: Без градиента для вспомогательных линий
        pointRadius: 3, // TASK-066: Видимые точки для вспомогательных линий
        pointBorderWidth: 1,
        pointBorderColor: chartColors.warning,
        pointHoverRadius: 5, // TASK-056-01: Показывать точки при hover (меньший радиус)
        pointHoverBorderWidth: 2, // TASK-056-01: Обводка точек
        pointHoverBorderColor: '#ffffff', // TASK-056-01: Белая обводка
        pointHoverBackgroundColor: chartColors.warning,
        pointBackgroundColor: chartColors.warning,
        datalabels: {
          ...baseDataLabelConfig,
          anchor: 'end',
          align: 'top',
          offset: 6,
          color: chartColors.warning,
          borderColor: chartColors.warning
        }
      },
      {
        // TASK-063: Вспомогательная линия - Переходящие (созданы остальными неделями)
        label: 'Переходящие (созданы остальными неделями)',
        data: carryoverCreatedOlderSeries,
        backgroundColor: chartColors.carryoverDark,
        borderColor: chartColors.carryoverDark,
        borderWidth: 2, // TASK-056-01: Уменьшена толщина для вспомогательных линий
        tension: 0.4, // TASK-056-01: Увеличено скругление
        borderDash: [8, 4], // TASK-056-01: Обновлён стиль пунктира
        fill: false, // TASK-056-01: Без градиента для вспомогательных линий
        pointRadius: 3, // TASK-066: Видимые точки для вспомогательных линий
        pointBorderWidth: 1,
        pointBorderColor: chartColors.carryoverDark,
        pointHoverRadius: 5, // TASK-056-01: Показывать точки при hover (меньший радиус)
        pointHoverBorderWidth: 2, // TASK-056-01: Обводка точек
        pointHoverBorderColor: '#ffffff', // TASK-056-01: Белая обводка
        pointHoverBackgroundColor: chartColors.carryoverDark,
        pointBackgroundColor: chartColors.carryoverDark,
        datalabels: {
          ...baseDataLabelConfig,
          anchor: 'end',
          align: 'top',
          offset: 6,
          color: chartColors.carryoverDark,
          borderColor: chartColors.carryoverDark
        }
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
  
  const carryoverCreatedPreviousWeekSeries = Array.isArray(props.data.series?.carryoverCreatedPreviousWeek) && props.data.series.carryoverCreatedPreviousWeek.length > 0
    ? props.data.series.carryoverCreatedPreviousWeek
    : [props.data.carryoverTicketsCreatedPreviousWeek ?? 0]; // TASK-063: НОВОЕ

  const carryoverCreatedOlderSeries = Array.isArray(props.data.series?.carryoverCreatedOlder) && props.data.series.carryoverCreatedOlder.length > 0
    ? props.data.series.carryoverCreatedOlder
    : [props.data.carryoverTicketsCreatedOlder ?? 0]; // TASK-063: НОВОЕ

  // TASK-063: DEPRECATED - для обратной совместимости
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
        fill: false,
        pointRadius: 4, // TASK-066: Видимые точки для линейного режима
        pointBorderWidth: 1,
        pointBorderColor: chartColors.primary,
        pointHoverRadius: 6,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#ffffff',
        pointHoverBackgroundColor: chartColors.primary,
        pointBackgroundColor: chartColors.primary,
        datalabels: {
          ...baseDataLabelConfig,
          anchor: 'end',
          align: 'top',
          offset: 10,
          color: chartColors.primary,
          borderColor: chartColors.primary
        }
      },
      {
        label: 'Закрытые (все)',
        data: closedSeries,
        backgroundColor: chartColors.success,
        borderColor: chartColors.success,
        tension: 0.3,
        fill: false,
        pointRadius: 4, // TASK-066: Видимые точки для линейного режима
        pointBorderWidth: 1,
        pointBorderColor: chartColors.success,
        pointHoverRadius: 6,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#ffffff',
        pointHoverBackgroundColor: chartColors.success,
        pointBackgroundColor: chartColors.success,
        datalabels: {
          ...baseDataLabelConfig,
          anchor: 'start',
          align: 'bottom',
          offset: 10,
          color: chartColors.success,
          borderColor: chartColors.success
        }
      },
      {
        label: 'Закрытые (созданы этой неделей)',
        data: closedCreatedThisWeekSeries,
        backgroundColor: chartColors.successLight,
        borderColor: chartColors.successLight,
        tension: 0.3,
        fill: false,
        borderDash: [5, 5], // Пунктирная линия
        pointRadius: 3, // TASK-066: Видимые точки для вспомогательных линий
        pointBorderWidth: 1,
        pointBorderColor: chartColors.successLight,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#ffffff',
        pointHoverBackgroundColor: chartColors.successLight,
        pointBackgroundColor: chartColors.successLight,
        datalabels: {
          ...baseDataLabelConfig,
          anchor: 'end',
          align: 'bottom',
          offset: 8,
          color: chartColors.successLight,
          borderColor: chartColors.successLight
        }
      },
      {
        label: 'Закрытые (созданы другой неделей)',
        data: closedCreatedOtherWeekSeries,
        backgroundColor: chartColors.warning,
        borderColor: chartColors.warning,
        tension: 0.3,
        fill: false,
        borderDash: [5, 5], // Пунктирная линия
        pointRadius: 3, // TASK-066: Видимые точки для вспомогательных линий
        pointBorderWidth: 1,
        pointBorderColor: chartColors.warning,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#ffffff',
        pointHoverBackgroundColor: chartColors.warning,
        pointBackgroundColor: chartColors.warning,
        datalabels: {
          ...baseDataLabelConfig,
          anchor: 'end',
          align: 'bottom',
          offset: 8,
          color: chartColors.warning,
          borderColor: chartColors.warning
        }
      },
      {
        label: 'Переходящие (все)',
        data: carryoverSeries,
        backgroundColor: chartColors.carryover,
        borderColor: chartColors.carryover,
        tension: 0.3,
        fill: false,
        pointRadius: 4, // TASK-066: Видимые точки для линейного режима
        pointBorderWidth: 1,
        pointBorderColor: chartColors.carryover,
        pointHoverRadius: 6,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#ffffff',
        pointHoverBackgroundColor: chartColors.carryover,
        pointBackgroundColor: chartColors.carryover,
        datalabels: {
          ...baseDataLabelConfig,
          anchor: 'end',
          align: 'top',
          offset: 4, // TASK-066: Соответствует месячному режиму (offset: 4)
          color: chartColors.carryover,
          borderColor: chartColors.carryover
        }
      },
      {
        label: 'Переходящие (созданы этой неделей)',
        data: carryoverCreatedThisWeekSeries,
        backgroundColor: chartColors.carryoverLight,
        borderColor: chartColors.carryoverLight,
        tension: 0.3,
        fill: false,
        borderDash: [5, 5], // Пунктирная линия
        pointRadius: 3, // TASK-066: Видимые точки для вспомогательных линий
        pointBorderWidth: 1,
        pointBorderColor: chartColors.carryoverLight,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#ffffff',
        pointHoverBackgroundColor: chartColors.carryoverLight,
        pointBackgroundColor: chartColors.carryoverLight,
        datalabels: {
          ...baseDataLabelConfig,
          anchor: 'end',
          align: 'top',
          offset: 6,
          color: chartColors.carryoverLight,
          borderColor: chartColors.carryoverLight
        }
      },
      {
        // TASK-063: Вспомогательная линия - Переходящие (созданы предыдущей неделей)
        label: 'Переходящие (созданы предыдущей неделей)',
        data: carryoverCreatedPreviousWeekSeries,
        backgroundColor: chartColors.warning,
        borderColor: chartColors.warning,
        tension: 0.3,
        fill: false,
        borderDash: [5, 5], // Пунктирная линия
        pointRadius: 3, // TASK-066: Видимые точки для вспомогательных линий
        pointBorderWidth: 1,
        pointBorderColor: chartColors.warning,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#ffffff',
        pointHoverBackgroundColor: chartColors.warning,
        pointBackgroundColor: chartColors.warning,
        datalabels: {
          ...baseDataLabelConfig,
          anchor: 'end',
          align: 'top',
          offset: 6,
          color: chartColors.warning,
          borderColor: chartColors.warning
        }
      },
      {
        // TASK-063: Вспомогательная линия - Переходящие (созданы остальными неделями)
        label: 'Переходящие (созданы остальными неделями)',
        data: carryoverCreatedOlderSeries,
        backgroundColor: chartColors.carryoverDark,
        borderColor: chartColors.carryoverDark,
        tension: 0.3,
        fill: false,
        borderDash: [5, 5], // Пунктирная линия
        pointRadius: 3, // TASK-066: Видимые точки для вспомогательных линий
        pointBorderWidth: 1,
        pointBorderColor: chartColors.carryoverDark,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#ffffff',
        pointHoverBackgroundColor: chartColors.carryoverDark,
        pointBackgroundColor: chartColors.carryoverDark,
        datalabels: {
          ...baseDataLabelConfig,
          anchor: 'end',
          align: 'top',
          offset: 6,
          color: chartColors.carryoverDark,
          borderColor: chartColors.carryoverDark
        }
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
    datalabels: {
      ...baseDataLabelConfig,
      anchor: 'end',
      align: 'top'
    },
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
      (Array.isArray(series.closedCreatedThisWeek) ? series.closedCreatedThisWeek.length : 0) - 1,
      (Array.isArray(series.closedCreatedOtherWeek) ? series.closedCreatedOtherWeek.length : 0) - 1,
      (Array.isArray(series.carryover) ? series.carryover.length : 0) - 1,
      (Array.isArray(series.carryoverCreatedThisWeek) ? series.carryoverCreatedThisWeek.length : 0) - 1,
      (Array.isArray(series.carryoverCreatedPreviousWeek) ? series.carryoverCreatedPreviousWeek.length : 0) - 1, // TASK-063: НОВОЕ
      (Array.isArray(series.carryoverCreatedOlder) ? series.carryoverCreatedOlder.length : 0) - 1, // TASK-063: НОВОЕ
      (Array.isArray(series.carryoverCreatedOtherWeek) ? series.carryoverCreatedOtherWeek.length : 0) - 1,
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
        carryoverTicketsCreatedPreviousWeek: (Array.isArray(series.carryoverCreatedPreviousWeek) && series.carryoverCreatedPreviousWeek[lastIndex] !== undefined) ? series.carryoverCreatedPreviousWeek[lastIndex] : 0, // TASK-063: НОВОЕ
        carryoverTicketsCreatedOlder: (Array.isArray(series.carryoverCreatedOlder) && series.carryoverCreatedOlder[lastIndex] !== undefined) ? series.carryoverCreatedOlder[lastIndex] : 0, // TASK-063: НОВОЕ
        carryoverTicketsCreatedOtherWeek: (Array.isArray(series.carryoverCreatedOtherWeek) && series.carryoverCreatedOtherWeek[lastIndex] !== undefined) ? series.carryoverCreatedOtherWeek[lastIndex] : 0 // TASK-063: DEPRECATED
      };
      
      // TASK-063: Временное логирование для диагностики
      if (fromSeries.carryoverTickets > 0) {
        console.log('[DEBUG currentWeekData]', {
          total: fromSeries.carryoverTickets,
          thisWeek: fromSeries.carryoverTicketsCreatedThisWeek,
          previousWeek: fromSeries.carryoverTicketsCreatedPreviousWeek,
          older: fromSeries.carryoverTicketsCreatedOlder,
          otherWeek: fromSeries.carryoverTicketsCreatedOtherWeek,
          sum: fromSeries.carryoverTicketsCreatedThisWeek + fromSeries.carryoverTicketsCreatedPreviousWeek + fromSeries.carryoverTicketsCreatedOlder,
          lastIndex,
          series: {
            carryoverCreatedPreviousWeek: series.carryoverCreatedPreviousWeek,
            carryoverCreatedOlder: series.carryoverCreatedOlder,
            carryoverCreatedPreviousWeekLength: series.carryoverCreatedPreviousWeek?.length,
            carryoverCreatedOlderLength: series.carryoverCreatedOlder?.length,
            carryoverCreatedPreviousWeekLast: series.carryoverCreatedPreviousWeek?.[lastIndex],
            carryoverCreatedOlderLast: series.carryoverCreatedOlder?.[lastIndex]
          },
          currentWeek: props.data.currentWeek,
          data: {
            carryoverTicketsCreatedPreviousWeek: props.data.carryoverTicketsCreatedPreviousWeek,
            carryoverTicketsCreatedOlder: props.data.carryoverTicketsCreatedOlder
          }
        });
      }
      
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
        carryoverTicketsCreatedPreviousWeek: (Array.isArray(series.carryoverCreatedPreviousWeek) && series.carryoverCreatedPreviousWeek[lastIndex] !== undefined) ? series.carryoverCreatedPreviousWeek[lastIndex] : 0, // TASK-063: НОВОЕ
        carryoverTicketsCreatedOlder: (Array.isArray(series.carryoverCreatedOlder) && series.carryoverCreatedOlder[lastIndex] !== undefined) ? series.carryoverCreatedOlder[lastIndex] : 0, // TASK-063: НОВОЕ
        carryoverTicketsCreatedOtherWeek: (Array.isArray(series.carryoverCreatedOtherWeek) && series.carryoverCreatedOtherWeek[lastIndex] !== undefined) ? series.carryoverCreatedOtherWeek[lastIndex] : 0 // TASK-063: DEPRECATED
      };
    }
  }
  
  // 5. Последний fallback на прямые данные
  return props.data || {};
});

// TASK-062: Получаем метаданные текущей недели (последний элемент из meta.weeks)
const currentWeekMeta = computed(() => {
  const weeks = props.meta?.weeks || [];
  if (weeks.length > 0) {
    return weeks[weeks.length - 1];
  }
  // Fallback для обратной совместимости
  return {
    weekNumber: props.meta?.currentWeek?.weekNumber ?? props.meta?.weekNumber ?? null,
    weekStartUtc: props.meta?.currentWeek?.weekStartUtc ?? props.meta?.weekStartUtc ?? null,
    weekEndUtc: props.meta?.currentWeek?.weekEndUtc ?? props.meta?.weekEndUtc ?? null
  };
});

// TASK-062: Получаем данные предыдущей недели (предпоследняя неделя из series или weeksData)
// Приоритет: series[предпоследний] (если есть данные за 2+ недели) > weeksData[предпоследний]
const previousWeekData = computed(() => {
  // 1. Приоритет: series[предпоследний] (если есть данные за 2+ недели)
  if (props.data?.series) {
    const series = props.data.series;
    
    // Находим максимальный индекс (длина самого длинного массива - 1)
    const lastIndex = Math.max(
      (Array.isArray(series.new) ? series.new.length : 0) - 1,
      (Array.isArray(series.closed) ? series.closed.length : 0) - 1,
      (Array.isArray(series.closedCreatedThisWeek) ? series.closedCreatedThisWeek.length : 0) - 1,
      (Array.isArray(series.closedCreatedOtherWeek) ? series.closedCreatedOtherWeek.length : 0) - 1,
      (Array.isArray(series.carryover) ? series.carryover.length : 0) - 1,
      (Array.isArray(series.carryoverCreatedThisWeek) ? series.carryoverCreatedThisWeek.length : 0) - 1,
      (Array.isArray(series.carryoverCreatedPreviousWeek) ? series.carryoverCreatedPreviousWeek.length : 0) - 1, // TASK-063: НОВОЕ
      (Array.isArray(series.carryoverCreatedOlder) ? series.carryoverCreatedOlder.length : 0) - 1, // TASK-063: НОВОЕ
      (Array.isArray(series.carryoverCreatedOtherWeek) ? series.carryoverCreatedOtherWeek.length : 0) - 1,
      -1
    );
    
    // Проверяем, что есть хотя бы 2 недели данных (lastIndex >= 1 означает, что есть минимум 2 элемента)
    if (lastIndex >= 1) {
      const prevIndex = lastIndex - 1;
      
      // Получаем метаданные о предыдущей неделе
      const prevWeekMeta = props.meta?.weeks?.[prevIndex];
      
      // Формируем объект с данными предыдущей недели
      const prevWeekFromSeries = {
        weekNumber: prevWeekMeta?.weekNumber ?? null,
        weekStartUtc: prevWeekMeta?.weekStartUtc ?? null,
        weekEndUtc: prevWeekMeta?.weekEndUtc ?? null,
        newTickets: (Array.isArray(series.new) && series.new[prevIndex] !== undefined) 
          ? series.new[prevIndex] 
          : 0,
        closedTickets: (Array.isArray(series.closed) && series.closed[prevIndex] !== undefined) 
          ? series.closed[prevIndex] 
          : 0,
        closedTicketsCreatedThisWeek: (Array.isArray(series.closedCreatedThisWeek) && series.closedCreatedThisWeek[prevIndex] !== undefined) 
          ? series.closedCreatedThisWeek[prevIndex] 
          : 0,
        closedTicketsCreatedOtherWeek: (Array.isArray(series.closedCreatedOtherWeek) && series.closedCreatedOtherWeek[prevIndex] !== undefined) 
          ? series.closedCreatedOtherWeek[prevIndex] 
          : 0,
        carryoverTickets: (Array.isArray(series.carryover) && series.carryover[prevIndex] !== undefined) 
          ? series.carryover[prevIndex] 
          : 0,
        carryoverTicketsCreatedThisWeek: (Array.isArray(series.carryoverCreatedThisWeek) && series.carryoverCreatedThisWeek[prevIndex] !== undefined) 
          ? series.carryoverCreatedThisWeek[prevIndex] 
          : 0,
        carryoverTicketsCreatedPreviousWeek: (Array.isArray(series.carryoverCreatedPreviousWeek) && series.carryoverCreatedPreviousWeek[prevIndex] !== undefined) 
          ? series.carryoverCreatedPreviousWeek[prevIndex] 
          : 0, // TASK-063: НОВОЕ
        carryoverTicketsCreatedOlder: (Array.isArray(series.carryoverCreatedOlder) && series.carryoverCreatedOlder[prevIndex] !== undefined) 
          ? series.carryoverCreatedOlder[prevIndex] 
          : 0, // TASK-063: НОВОЕ
        carryoverTicketsCreatedOtherWeek: (Array.isArray(series.carryoverCreatedOtherWeek) && series.carryoverCreatedOtherWeek[prevIndex] !== undefined) 
          ? series.carryoverCreatedOtherWeek[prevIndex] 
          : 0 // TASK-063: DEPRECATED
      };
      
      // Если в series есть хотя бы одно ненулевое значение, используем эти данные
      if (prevWeekFromSeries.newTickets > 0 || 
          prevWeekFromSeries.closedTickets > 0 || 
          prevWeekFromSeries.carryoverTickets > 0) {
        return prevWeekFromSeries;
      }
    }
  }
  
  // 2. Пробуем weeksData[предпоследний]
  if (props.data?.weeksData && Array.isArray(props.data.weeksData) && props.data.weeksData.length >= 2) {
    const prevWeekIndex = props.data.weeksData.length - 2;
    const prevWeek = props.data.weeksData[prevWeekIndex];
    const prevWeekMeta = props.meta?.weeks?.[prevWeekIndex];
    
    // Проверяем, что есть хотя бы одно ненулевое значение
    if ((prevWeek.newTickets ?? 0) > 0 || 
        (prevWeek.closedTickets ?? 0) > 0 || 
        (prevWeek.carryoverTickets ?? 0) > 0) {
      return {
        weekNumber: prevWeek.weekNumber ?? prevWeekMeta?.weekNumber ?? null,
        weekStartUtc: prevWeekMeta?.weekStartUtc ?? null,
        weekEndUtc: prevWeekMeta?.weekEndUtc ?? null,
        newTickets: prevWeek.newTickets ?? 0,
        closedTickets: prevWeek.closedTickets ?? 0,
        closedTicketsCreatedThisWeek: prevWeek.closedTicketsCreatedThisWeek ?? 0,
        closedTicketsCreatedOtherWeek: prevWeek.closedTicketsCreatedOtherWeek ?? 0,
        carryoverTickets: prevWeek.carryoverTickets ?? 0,
        carryoverTicketsCreatedThisWeek: prevWeek.carryoverTicketsCreatedThisWeek ?? 0,
        carryoverTicketsCreatedOtherWeek: prevWeek.carryoverTicketsCreatedOtherWeek ?? 0
      };
    }
  }
  
  // 3. Fallback: возвращаем данные из series даже если они нули (для консистентности)
  if (props.data?.series) {
    const series = props.data.series;
    const lastIndex = Math.max(
      (Array.isArray(series.new) ? series.new.length : 0) - 1,
      (Array.isArray(series.closed) ? series.closed.length : 0) - 1,
      (Array.isArray(series.carryover) ? series.carryover.length : 0) - 1,
      -1
    );
    
    if (lastIndex >= 1) {
      const prevIndex = lastIndex - 1;
      const prevWeekMeta = props.meta?.weeks?.[prevIndex];
      
      return {
        weekNumber: prevWeekMeta?.weekNumber ?? null,
        weekStartUtc: prevWeekMeta?.weekStartUtc ?? null,
        weekEndUtc: prevWeekMeta?.weekEndUtc ?? null,
        newTickets: (Array.isArray(series.new) && series.new[prevIndex] !== undefined) ? series.new[prevIndex] : 0,
        closedTickets: (Array.isArray(series.closed) && series.closed[prevIndex] !== undefined) ? series.closed[prevIndex] : 0,
        closedTicketsCreatedThisWeek: (Array.isArray(series.closedCreatedThisWeek) && series.closedCreatedThisWeek[prevIndex] !== undefined) ? series.closedCreatedThisWeek[prevIndex] : 0,
        closedTicketsCreatedOtherWeek: (Array.isArray(series.closedCreatedOtherWeek) && series.closedCreatedOtherWeek[prevIndex] !== undefined) ? series.closedCreatedOtherWeek[prevIndex] : 0,
        carryoverTickets: (Array.isArray(series.carryover) && series.carryover[prevIndex] !== undefined) ? series.carryover[prevIndex] : 0,
        carryoverTicketsCreatedThisWeek: (Array.isArray(series.carryoverCreatedThisWeek) && series.carryoverCreatedThisWeek[prevIndex] !== undefined) ? series.carryoverCreatedThisWeek[prevIndex] : 0,
        carryoverTicketsCreatedPreviousWeek: (Array.isArray(series.carryoverCreatedPreviousWeek) && series.carryoverCreatedPreviousWeek[prevIndex] !== undefined) ? series.carryoverCreatedPreviousWeek[prevIndex] : 0, // TASK-063: НОВОЕ
        carryoverTicketsCreatedOlder: (Array.isArray(series.carryoverCreatedOlder) && series.carryoverCreatedOlder[prevIndex] !== undefined) ? series.carryoverCreatedOlder[prevIndex] : 0, // TASK-063: НОВОЕ
        carryoverTicketsCreatedOtherWeek: (Array.isArray(series.carryoverCreatedOtherWeek) && series.carryoverCreatedOtherWeek[prevIndex] !== undefined) ? series.carryoverCreatedOtherWeek[prevIndex] : 0 // TASK-063: DEPRECATED
      };
    }
  }
  
  // 4. Если данных меньше 2 недель, возвращаем null (блок не отображается)
  return null;
});

// TASK-064: Стадии по неделям (индекс синхронизирован с meta.weeks/series)
const stagesByWeek = computed(() => {
  const stages = props.data?.stagesByWeek;
  if (Array.isArray(stages)) {
    return stages;
  }
  return null;
});

// TASK-064: Стадии текущей недели — берём из stagesByWeek[last] или fallback на data.stages (старый контракт)
const currentWeekStages = computed(() => {
  const byWeek = stagesByWeek.value;
  if (byWeek && byWeek.length > 0) {
    const lastIndex = byWeek.length - 1;
    const stages = byWeek[lastIndex];
    if (Array.isArray(stages)) {
      return stages;
    }
  }
  return props.data?.stages ?? [];
});

// TASK-064: Стадии предыдущей недели — берём из stagesByWeek[prev] или показываем пустой список (для "Нет данных")
const previousWeekStages = computed(() => {
  const byWeek = stagesByWeek.value;
  if (byWeek && byWeek.length >= 2) {
    const prevIndex = byWeek.length - 2;
    const stages = byWeek[prevIndex];
    if (Array.isArray(stages)) {
      return stages;
    }
  }
  return [];
});

// TASK-064: Текст для отсутствия данных по стадиям предыдущей недели
const previousWeekStagesEmptyLabel = computed(() => {
  if (previousWeekData.value?.weekNumber) {
    return `Нет данных для недели ${previousWeekData.value.weekNumber}`;
  }
  return 'Нет данных';
});

// TASK-062: Вычисляет процент изменения
/**
 * Вычисляет процент изменения между двумя значениями
 * 
 * @param {number} current - Текущее значение
 * @param {number|null|undefined} previous - Предыдущее значение
 * @returns {number|null} Процент изменения или null, если нельзя рассчитать
 */
function calculatePercentage(current, previous) {
  // Валидация входных данных
  if (typeof current !== 'number' || isNaN(current)) {
    return null;
  }
  
  if (previous === null || previous === undefined) {
    return null;
  }
  
  if (typeof previous !== 'number' || isNaN(previous)) {
    return null;
  }
  
  // Деление на ноль
  if (previous === 0) {
    return null;
  }
  
  // Нет изменения
  if (current === previous) {
    return 0;
  }
  
  // Расчет процента
  const percentage = ((current - previous) / previous) * 100;
  
  // Проверка на бесконечность или NaN
  if (!isFinite(percentage) || isNaN(percentage)) {
    return null;
  }
  
  return percentage;
}

// TASK-062: Форматирует процент для отображения
/**
 * Форматирует процент для отображения
 * 
 * @param {number|null} value - Процент изменения
 * @returns {string} Отформатированная строка процента
 */
function formatPercentage(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

// TASK-062: Получаем данные предпредыдущей недели (для расчета процентов предыдущей недели)
const prePreviousWeekData = computed(() => {
  if (props.data?.series) {
    const series = props.data.series;
    const lastIndex = Math.max(
      (Array.isArray(series.new) ? series.new.length : 0) - 1,
      (Array.isArray(series.closed) ? series.closed.length : 0) - 1,
      (Array.isArray(series.carryover) ? series.carryover.length : 0) - 1,
      -1
    );
    
    // Нужно минимум 3 недели данных (lastIndex >= 2)
    if (lastIndex >= 2) {
      const prePrevIndex = lastIndex - 2;
      const prePrevWeekMeta = props.meta?.weeks?.[prePrevIndex];
      
      return {
        weekNumber: prePrevWeekMeta?.weekNumber ?? null,
        newTickets: (Array.isArray(series.new) && series.new[prePrevIndex] !== undefined) ? series.new[prePrevIndex] : 0,
        closedTickets: (Array.isArray(series.closed) && series.closed[prePrevIndex] !== undefined) ? series.closed[prePrevIndex] : 0,
        carryoverTickets: (Array.isArray(series.carryover) && series.carryover[prePrevIndex] !== undefined) ? series.carryover[prePrevIndex] : 0
      };
    }
  }
  
  return null;
});

// TASK-062: Проценты изменения для текущей недели (относительно предыдущей)
const currentWeekPercentages = computed(() => {
  const current = currentWeekData.value;
  const previous = previousWeekData.value;
  
  if (!current || !previous) {
    return {
      newTickets: null,
      closedTickets: null,
      carryoverTickets: null
    };
  }
  
  return {
    newTickets: calculatePercentage(current.newTickets ?? 0, previous.newTickets ?? 0),
    closedTickets: calculatePercentage(current.closedTickets ?? 0, previous.closedTickets ?? 0),
    carryoverTickets: calculatePercentage(current.carryoverTickets ?? 0, previous.carryoverTickets ?? 0)
  };
});

// TASK-062: Проценты изменения для предыдущей недели (относительно предпредыдущей)
const previousWeekPercentages = computed(() => {
  const previous = previousWeekData.value;
  const prePrevious = prePreviousWeekData.value;
  
  if (!previous || !prePrevious) {
    return {
      newTickets: null,
      closedTickets: null,
      carryoverTickets: null
    };
  }
  
  return {
    newTickets: calculatePercentage(previous.newTickets ?? 0, prePrevious.newTickets ?? 0),
    closedTickets: calculatePercentage(previous.closedTickets ?? 0, prePrevious.closedTickets ?? 0),
    carryoverTickets: calculatePercentage(previous.carryoverTickets ?? 0, prePrevious.carryoverTickets ?? 0)
  };
});

// TASK-062: Форматирует даты недели для отображения в заголовке
/**
 * Форматирует даты недели для отображения в заголовке
 * 
 * @param {string} startUtc - Начало недели в UTC (ISO-8601)
 * @param {string} endUtc - Конец недели в UTC (ISO-8601)
 * @returns {string} Отформатированная строка дат
 */
function formatWeekDates(startUtc, endUtc) {
  if (!startUtc || !endUtc) {
    return '';
  }
  
  try {
    const start = new Date(startUtc);
    const end = new Date(endUtc);
    
    // Форматируем как "15 Dec — 21 Dec" или "15 Dec 2025 — 21 Dec 2025" (если разные годы)
    const startDay = start.getUTCDate();
    const startMonth = start.toLocaleDateString('ru-RU', { month: 'short', timeZone: 'UTC' });
    const startYear = start.getUTCFullYear();
    
    const endDay = end.getUTCDate();
    const endMonth = end.toLocaleDateString('ru-RU', { month: 'short', timeZone: 'UTC' });
    const endYear = end.getUTCFullYear();
    
    if (startYear === endYear && startMonth === endMonth) {
      return `${startDay} — ${endDay} ${startMonth}`;
    } else if (startYear === endYear) {
      return `${startDay} ${startMonth} — ${endDay} ${endMonth}`;
    } else {
      return `${startDay} ${startMonth} ${startYear} — ${endDay} ${endMonth} ${endYear}`;
    }
  } catch (error) {
    console.error('[formatWeekDates] Error:', error);
    return '';
  }
}

// Обработчик клика на summary-карточки текущей недели
// TASK-048: Используем currentWeekData для проверки наличия данных (текущая неделя)
// TASK-062: Передаём метаданные текущей недели в события
const handleSummaryClick = (type) => {
  const currentWeek = currentWeekData.value;
  const newTickets = currentWeek?.newTickets ?? 0;
  const closedTickets = currentWeek?.closedTickets ?? 0;
  const carryoverTickets = currentWeek?.carryoverTickets ?? 0;
  
  const weekMeta = currentWeekMeta.value;
  
  if (type === 'new' && newTickets > 0) {
    emit('open-stages', {
      weekNumber: weekMeta.weekNumber,
      weekStartUtc: weekMeta.weekStartUtc,
      weekEndUtc: weekMeta.weekEndUtc
    });
  } else if (type === 'closed' && closedTickets > 0) {
    if ((props.data?.responsible || []).length > 0) {
      emit('open-responsible', {
        weekNumber: weekMeta.weekNumber,
        weekStartUtc: weekMeta.weekStartUtc,
        weekEndUtc: weekMeta.weekEndUtc
      });
    }
  } else if (type === 'carryover' && carryoverTickets > 0) {
    emit('open-carryover', {
      weekNumber: weekMeta.weekNumber,
      weekStartUtc: weekMeta.weekStartUtc,
      weekEndUtc: weekMeta.weekEndUtc
    });
  }
};

// TASK-062: Обработчик клика на summary-карточки предыдущей недели
const handlePreviousWeekSummaryClick = (type) => {
  const previousWeek = previousWeekData.value;
  if (!previousWeek) return;
  
  const newTickets = previousWeek?.newTickets ?? 0;
  const closedTickets = previousWeek?.closedTickets ?? 0;
  const carryoverTickets = previousWeek?.carryoverTickets ?? 0;
  
  const weekMeta = previousWeekMeta.value;
  if (!weekMeta) return;
  
  if (type === 'new' && newTickets > 0) {
    emit('open-stages', {
      weekNumber: weekMeta.weekNumber,
      weekStartUtc: weekMeta.weekStartUtc,
      weekEndUtc: weekMeta.weekEndUtc
    });
  } else if (type === 'closed' && closedTickets > 0) {
    // Для предыдущей недели нужно проверить, есть ли данные responsible
    // Пока передаём событие, родительский компонент должен обработать
    emit('open-responsible', {
      weekNumber: weekMeta.weekNumber,
      weekStartUtc: weekMeta.weekStartUtc,
      weekEndUtc: weekMeta.weekEndUtc
    });
  } else if (type === 'carryover' && carryoverTickets > 0) {
    emit('open-carryover', {
      weekNumber: weekMeta.weekNumber,
      weekStartUtc: weekMeta.weekStartUtc,
      weekEndUtc: weekMeta.weekEndUtc
    });
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

/* TASK-062: Контейнер для всех summary-блоков */
.ac-chart__summary {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: 16px;
}

/* TASK-062: Блок недели (базовые стили) */
.summary-week-block {
  margin-bottom: 0;
  transition: all 0.3s ease;
}

/* TASK-062: Блок текущей недели - выделен */
.summary-week-block--current {
  background: var(--b24-bg-white, #fff);
  padding: 20px;
  border-radius: var(--radius-md, 8px);
  border: 2px solid var(--b24-primary, #007bff);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
  position: relative;
}

/* TASK-062: Блок текущей недели - индикатор активности */
.summary-week-block--current::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--b24-primary, #007bff), var(--b24-success, #28a745));
  border-radius: var(--radius-md, 8px) var(--radius-md, 8px) 0 0;
}

/* TASK-062: Блок предыдущей недели - приглушен */
.summary-week-block--previous {
  background: var(--b24-bg-light, #f9fafb);
  padding: 20px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--b24-border-light, #e5e7eb);
  opacity: 0.85;
  transition: opacity 0.2s ease;
}

/* TASK-062: При наведении на блок предыдущей недели - увеличиваем непрозрачность */
.summary-week-block--previous:hover {
  opacity: 0.95;
  border-color: var(--b24-border-light, #d1d5db);
}

/* TASK-062: Заголовок блока недели */
.summary-week-block__title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--b24-border-light, #e5e7eb);
}

/* TASK-062: Текст заголовка */
.summary-week-block__title-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--b24-text-primary, #111827);
  line-height: 1.2;
}

/* TASK-062: Номер недели в заголовке */
.summary-week-block__title-week {
  font-size: 14px;
  font-weight: 600;
  color: var(--b24-primary, #007bff);
  line-height: 1.2;
}

/* TASK-062: Даты в заголовке */
.summary-week-block__title-dates {
  font-size: 12px;
  font-weight: 400;
  color: var(--b24-text-secondary, #6b7280);
  line-height: 1.2;
  font-style: italic;
}

/* TASK-062: Блок предыдущей недели - приглушенные цвета заголовка */
.summary-week-block--previous .summary-week-block__title-text {
  color: var(--b24-text-secondary, #6b7280);
  font-weight: 600;
}

.summary-week-block--previous .summary-week-block__title-week {
  color: var(--b24-text-secondary, #6b7280);
  font-weight: 500;
}

/* TASK-062: Контейнер карточек внутри блока */
.summary-week-block__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

/* TASK-062: Визуальный разделитель между блоками */
.summary-week-divider {
  margin: 28px 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* TASK-062: Линия разделителя */
.summary-week-divider__line {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--b24-border-light, #e5e7eb) 20%,
    var(--b24-border-light, #e5e7eb) 80%,
    transparent
  );
  position: relative;
}

/* TASK-062: Декоративные элементы на концах линии */
.summary-week-divider__line::before,
.summary-week-divider__line::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 6px;
  height: 6px;
  background: var(--b24-border-light, #e5e7eb);
  border-radius: 50%;
  transform: translateY(-50%);
}

.summary-week-divider__line::before {
  left: -8px;
}

.summary-week-divider__line::after {
  right: -8px;
}

/* TASK-062: Метка разделителя (опционально) */
.summary-week-divider__label {
  padding: 0 12px;
  font-size: 11px;
  font-weight: 500;
  color: var(--b24-text-secondary, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--b24-bg-white, #fff);
  position: relative;
  z-index: 1;
}

/* TASK-062: Карточки предыдущей недели - легкое затемнение */
.summary-card--previous {
  opacity: 0.8;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

/* TASK-062: Кликабельные карточки предыдущей недели */
.summary-card--previous.summary-card--clickable {
  cursor: pointer;
}

/* TASK-062: При наведении на карточку предыдущей недели */
.summary-card--previous:hover {
  opacity: 1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* TASK-062: При наведении на кликабельную карточку предыдущей недели - изменение border */
.summary-card--previous.summary-card--clickable:hover {
  border-color: var(--b24-primary, #007bff);
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
  line-height: 1.2;
}

/* TASK-062: Обёртка для значения и процента */
.summary-card__value-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

/* TASK-062: Контейнер для сравнения двух значений (предыдущая и предпредыдущая неделя) */
.summary-card__values-comparison {
  display: flex;
  align-items: baseline; /* Выравнивание по базовой линии для значений в одной линии */
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}

/* TASK-062: Элемент сравнения (одно значение с меткой) */
.summary-card__value-comparison-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px; /* Уменьшен gap для компактности */
  flex: 1;
  justify-content: flex-start;
}

/* TASK-062: Выравнивание значения справа по базовой линии */
.summary-card__value-comparison-item--current {
  align-items: flex-end;
  text-align: right;
}

/* TASK-062: Значение предыдущей недели (слева) - основной цвет */
.summary-card__value-comparison-item--previous {
  /* Используются стандартные стили .summary-card__value */
}

/* TASK-062: Значение предпредыдущей недели (справа) - другой цвет для визуального отличия */
.summary-card__value-comparison-item--current {
  align-items: flex-end;
  text-align: right;
}

/* TASK-062: Значение предпредыдущей недели в карточках предыдущей недели - другой цвет, но тот же размер и стиль */
.summary-card--previous .summary-card__value--current-week,
.summary-card--previous .summary-card__value-main--current-week {
  color: var(--b24-primary, #007bff) !important; /* Явно переопределяем цвет */
  font-size: 24px !important; /* Тот же размер, что и основное значение */
  font-weight: 700 !important; /* Та же жирность */
  line-height: 1.2 !important; /* Та же высота строки */
  opacity: 0.9;
  margin-bottom: 0 !important; /* Убираем отступы */
}

/* TASK-062: Метка с номером недели под значением */
.value-label {
  font-size: 9px;
  font-weight: 500;
  color: var(--b24-text-secondary, #6b7280);
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1;
  margin-top: 2px;
}

/* TASK-062: Визуальный индикатор процента изменения */
.percentage-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

/* TASK-062: Положительный процент (рост) - зелёный */
.percentage-indicator--positive {
  color: var(--b24-success, #28a745);
  background-color: rgba(40, 167, 69, 0.1);
}

.percentage-indicator--positive .percentage-indicator__arrow {
  color: var(--b24-success, #28a745);
}

/* TASK-062: Отрицательный процент (снижение) - красный */
.percentage-indicator--negative {
  color: var(--b24-danger, #dc3545);
  background-color: rgba(220, 53, 69, 0.1);
}

.percentage-indicator--negative .percentage-indicator__arrow {
  color: var(--b24-danger, #dc3545);
}

/* TASK-062: Стрелка в индикаторе */
.percentage-indicator__arrow {
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}

/* TASK-062: Значение процента */
.percentage-indicator__value {
  font-weight: 700;
}

/* TASK-062: Метка с номером недели */
.percentage-indicator__label {
  font-size: 10px;
  font-weight: 500;
  opacity: 0.8;
  margin-left: 2px;
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

/* TASK-062: Обёртка значения в карточках с разбивкой */
.summary-card--closed-breakdown .summary-card__value-wrapper,
.summary-card--carryover-breakdown .summary-card__value-wrapper {
  margin-bottom: 0;
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
  margin-bottom: 0;
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
  
  /* TASK-062: Адаптивность для индикаторов процентов */
  .percentage-indicator {
    font-size: 11px;
    padding: 3px 6px;
    gap: 3px;
  }
  
  .percentage-indicator__arrow {
    font-size: 12px;
  }
  
  .percentage-indicator__label {
    font-size: 9px;
  }
  
  .summary-card__value-wrapper {
    gap: 6px;
  }
  
  /* TASK-062: Адаптивность для сравнения значений */
  .summary-card__values-comparison {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .summary-card__value-comparison-item--current {
    align-items: flex-start;
    text-align: left;
  }
  
  .summary-card__value--current-week,
  .summary-card__value-main--current-week {
    font-size: 18px;
  }
  
  .value-label {
    font-size: 9px;
  }
}

/* TASK-062: Адаптивность для планшетов (768px - 1024px) */
@media (max-width: 1024px) and (min-width: 769px) {
  .summary-week-block__cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  
  .summary-week-block--current,
  .summary-week-block--previous {
    padding: 16px;
  }
  
  .summary-week-divider {
    margin: 24px 0;
  }
}

/* TASK-062: Адаптивность для мобильных устройств (< 768px) */
@media (max-width: 768px) {
  .ac-chart__summary {
    gap: 0;
  }
  
  .summary-week-block--current,
  .summary-week-block--previous {
    padding: 12px;
    border-radius: var(--radius-sm, 6px);
  }
  
  .summary-week-block__title {
    margin-bottom: 12px;
    padding-bottom: 8px;
  }
  
  .summary-week-block__title-text {
    font-size: 14px;
  }
  
  .summary-week-block__title-week {
    font-size: 12px;
  }
  
  .summary-week-block__title-dates {
    font-size: 11px;
  }
  
  .summary-week-block__cards {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .summary-week-divider {
    margin: 20px 0;
  }
  
  .summary-week-divider__label {
    font-size: 10px;
    padding: 0 8px;
  }
  
  /* На мобильных карточки предыдущей недели менее приглушены */
  .summary-card--previous {
    opacity: 0.9;
  }
}

/* TASK-062: Адаптивность для очень маленьких экранов (< 480px) */
@media (max-width: 480px) {
  .summary-week-block--current,
  .summary-week-block--previous {
    padding: 10px;
  }
  
  .summary-week-block__title {
    gap: 2px;
    margin-bottom: 10px;
    padding-bottom: 6px;
  }
  
  .summary-week-block__cards {
    gap: 8px;
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

