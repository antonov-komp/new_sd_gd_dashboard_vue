<template>
  <div class="ac-dashboard">
    <LoadingSpinner v-if="isLoading" message="Загрузка данных..." />

    <div v-else>
      <div class="dashboard-header">
        <div>
          <h1 class="dashboard-title">График приёма и закрытий сектора 1С</h1>
          <p class="dashboard-subtitle">
            Доступы и фильтры аналогичны «Графику состояния», селектор этапов скрыт.
          </p>
        </div>
      </div>

      <div class="dashboard-layout">
        <div class="filters-container">
          <FiltersPanel
            :stages="filters.stages"
            :employees="filters.employees"
            :dateRange="filters.dateRange"
            :customDateRange="filters.customDateRange"
            :hasActiveFilters="hasActiveFilters"
            :hideStages="true"
            :weekPickerMode="true"
            :selectedWeek="selectedWeek"
            :weeksCount="52"
            @update:stages="updateStages"
            @update:employees="updateEmployees"
            @update:dateRange="updateDateRange"
            @update:customDateRange="updateCustomDateRange"
            @update:selectedWeek="updateSelectedWeek"
            @reset="resetFilters"
            @apply="applyFilters"
          />
        </div>

        <div class="chart-container">
          <StatusMessage
            v-if="error"
            type="error"
            title="Ошибка загрузки"
            :message="error.message"
          />

          <GraphAdmissionClosureChart
            v-else
            :meta="chartMeta"
            :data="chartData"
            @open-responsible="showResponsibleModal = true"
          />
        </div>
      </div>
    </div>

    <ResponsibleModal
      :is-visible="showResponsibleModal"
      :responsible="chartData.responsible || []"
      :week-start-utc="chartMeta?.weekStartUtc || null"
      :week-end-utc="chartMeta?.weekEndUtc || null"
      @close="showResponsibleModal = false"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import StatusMessage from '@/components/common/StatusMessage.vue';
import FiltersPanel from '@/components/filters/FiltersPanel.vue';
import GraphAdmissionClosureChart from './GraphAdmissionClosureChart.vue';
import ResponsibleModal from './ResponsibleModal.vue';
import { fetchAdmissionClosureStats } from '@/services/graph-admission-closure/admissionClosureService.js';

const isLoading = ref(true);
const error = ref(null);
const chartMeta = ref(null);
const chartData = ref({
  newTickets: 0,
  closedTickets: 0,
  series: { new: [0], closed: [0] },
  stages: [],
  responsible: []
});
const showResponsibleModal = ref(false);

const filters = ref({
  stages: {
    formed: true,
    review: true,
    execution: true
  },
  employees: ['all'],
  dateRange: 'last-week',
  customDateRange: {
    startDate: null,
    endDate: null
  }
});

// Выбранная неделя для барабана прокрутки
const selectedWeek = ref(null);

const hasActiveFilters = computed(() => {
  const hasCustomDates = filters.value.customDateRange.startDate || filters.value.customDateRange.endDate;
  const onlyAllEmployees = filters.value.employees.length === 1 && filters.value.employees.includes('all');
  return hasCustomDates || !onlyAllEmployees;
});

async function loadData() {
  isLoading.value = true;
  error.value = null;
  try {
    // Используем выбранную неделю или вычисляем текущую неделю
    let weekStartUtc, weekEndUtc;
    
    if (selectedWeek.value) {
      weekStartUtc = selectedWeek.value.startUtc;
      weekEndUtc = selectedWeek.value.endUtc;
    } else {
      // При первом открытии всегда используем текущую неделю
      const currentWeek = getCurrentWeekBounds();
      weekStartUtc = currentWeek.weekStartUtc;
      weekEndUtc = currentWeek.weekEndUtc;
    }
    
    const { meta, data } = await fetchAdmissionClosureStats({
      product: '1C',
      weekStartUtc,
      weekEndUtc
    });
    chartMeta.value = meta;
    chartData.value = data;
    
    // Обновляем selectedWeek из meta, если она не была установлена
    if (!selectedWeek.value && meta) {
      selectedWeek.value = {
        weekNumber: meta.weekNumber,
        startUtc: meta.weekStartUtc,
        endUtc: meta.weekEndUtc
      };
    }
  } catch (err) {
    error.value = err instanceof Error ? err : new Error('Неизвестная ошибка загрузки');
    console.error('[GraphAdmissionClosureDashboard] loadData error:', err);
  } finally {
    isLoading.value = false;
  }
}

function updateStages(newStages) {
  filters.value.stages = newStages;
}

function updateEmployees(newEmployees) {
  filters.value.employees = newEmployees;
}

function updateDateRange(newRange) {
  filters.value.dateRange = newRange;
}

function updateCustomDateRange(newRange) {
  filters.value.customDateRange = newRange;
}

function updateSelectedWeek(week) {
  selectedWeek.value = week;
}

function resetFilters() {
  filters.value = {
    stages: {
      formed: true,
      review: true,
      execution: true
    },
    employees: ['all'],
    dateRange: 'last-week',
    customDateRange: {
      startDate: null,
      endDate: null
    }
  };
  applyFilters();
}

function applyFilters() {
  loadData();
}

onMounted(() => {
  loadData();
});

/**
 * Получает границы текущей недели (ISO-8601, пн-вс, UTC)
 */
function getCurrentWeekBounds() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Понедельник
  
  const weekStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff, 0, 0, 0));
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);
  
  return {
    weekStartUtc: weekStart.toISOString(),
    weekEndUtc: weekEnd.toISOString()
  };
}

/**
 * Рассчитывает границы периода в UTC на основе выбранного фильтра.
 * Неделя: пн 00:00:00 — вс 23:59:59.
 */
function getPeriodBounds() {
  const tz = 'UTC';
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  switch (filters.value.dateRange) {
    case 'last-2-weeks':
      start.setDate(now.getDate() - 14);
      break;
    case 'last-month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'custom':
      if (filters.value.customDateRange.startDate) {
        start = new Date(filters.value.customDateRange.startDate + 'T00:00:00Z');
      }
      if (filters.value.customDateRange.endDate) {
        end = new Date(filters.value.customDateRange.endDate + 'T23:59:59Z');
      }
      break;
    case 'last-week':
    default:
      start.setDate(now.getDate() - 7);
      break;
  }

  // Нормализуем к началу/концу дней в UTC
  const weekStartUtc = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0)).toISOString();
  const weekEndUtc = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59)).toISOString();

  return { weekStartUtc, weekEndUtc };
}
</script>

<style scoped>
.ac-dashboard {
  padding: var(--spacing-lg, 20px);
}

.dashboard-header {
  margin-bottom: 16px;
}

.dashboard-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--b24-text-primary, #111827);
}

.dashboard-subtitle {
  margin: 6px 0 0;
  color: var(--b24-text-secondary, #6b7280);
}

.dashboard-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.filters-container {
  display: flex;
  justify-content: center;
  width: 100%;
}

.filters-container > * {
  width: 100%;
}

.chart-container {
  width: 100%;
  min-height: 360px;
}
</style>

