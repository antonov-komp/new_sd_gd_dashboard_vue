<template>
  <div class="ac-dashboard">
    <LoadingSpinner v-if="isLoading" message="Загрузка данных..." />

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
              <span class="breadcrumb-separator" aria-hidden="true">/</span>
              <router-link 
                :to="{ name: 'dashboard-graph-state' }"
                class="breadcrumb-link"
              >
                График состояния
              </router-link>
              <span class="breadcrumb-separator" aria-hidden="true">/</span>
              <span class="breadcrumb-current">График приёма и закрытий</span>
            </nav>
          </div>
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
            @open-stages="showStagesModal = true"
            @open-carryover="showCarryoverModal = true"
          />
        </div>
      </div>
    </div>

    <ResponsibleModal
      :is-visible="showResponsibleModal"
      :responsible="chartData.responsible || []"
      :closed-tickets-created-this-week="chartData.closedTicketsCreatedThisWeek ?? 0"
      :closed-tickets-created-other-week="chartData.closedTicketsCreatedOtherWeek ?? 0"
      :responsible-created-this-week="chartData.responsibleCreatedThisWeek || []"
      :responsible-created-other-week="chartData.responsibleCreatedOtherWeek || []"
      :week-number="chartMeta?.weekNumber || null"
      :week-start-utc="chartMeta?.weekStartUtc || null"
      :week-end-utc="chartMeta?.weekEndUtc || null"
      @close="showResponsibleModal = false"
    />

    <StagesModal
      :is-visible="showStagesModal"
      :week-number="chartMeta?.weekNumber || null"
      :week-start-utc="chartMeta?.weekStartUtc || null"
      :week-end-utc="chartMeta?.weekEndUtc || null"
      @close="showStagesModal = false"
    />

    <CarryoverDurationModal
      :is-visible="showCarryoverModal"
      :week-number="chartMeta?.weekNumber || null"
      :week-start-utc="chartMeta?.weekStartUtc || null"
      :week-end-utc="chartMeta?.weekEndUtc || null"
      @close="showCarryoverModal = false"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import StatusMessage from '@/components/common/StatusMessage.vue';
import FiltersPanel from '@/components/filters/FiltersPanel.vue';
import GraphAdmissionClosureChart from './GraphAdmissionClosureChart.vue';
import ResponsibleModal from './ResponsibleModal.vue';
import StagesModal from './StagesModal.vue';
import CarryoverDurationModal from './CarryoverDurationModal.vue';
import { fetchAdmissionClosureStats } from '@/services/graph-admission-closure/admissionClosureService.js';

const router = useRouter();

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
const showStagesModal = ref(false);
const showCarryoverModal = ref(false);

// Навигация "Назад"
const isNavigatingBack = ref(false);
const hasHistory = computed(() => {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.history.length > 1;
});
const backAriaLabel = computed(() => {
  return hasHistory.value ? 'Вернуться на предыдущую страницу' : 'Вернуться на главную страницу';
});
const fallbackRoute = { name: 'dashboard-sector-1c' };

function handleBack(event) {
  event?.preventDefault?.();

  if (isNavigatingBack.value) {
    return;
  }

  isNavigatingBack.value = true;

  try {
    if (hasHistory.value) {
      router.back();
      return;
    }

    console.warn('GraphAdmissionClosureDashboard: fallback navigation to dashboard-sector-1c');
    router.push(fallbackRoute);
  } finally {
    isNavigatingBack.value = false;
  }
}

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
      weekEndUtc,
      includeTickets: true // TASK-047: Включаем тикеты для вкладки "По сотрудникам"
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
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-xl, 24px);
  padding-bottom: var(--spacing-md, 16px);
  border-bottom: 2px solid var(--b24-border-light, #e5e7eb);
}

.header-content {
  flex: 1;
}

.breadcrumbs-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  margin-bottom: var(--spacing-xs, 4px);
}

.btn-back-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--b24-border-light, #e5e7eb);
  background: var(--b24-bg-white, #ffffff);
  color: var(--b24-primary, #3b82f6);
  cursor: pointer;
  transition: all var(--transition-base, 0.2s);
  font-weight: 700;
  line-height: 1;
}

.btn-back-link:hover:not(:disabled) {
  background-color: var(--b24-bg-light, #f5f7fb);
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
}

.btn-back-link:focus {
  outline: 2px solid var(--b24-primary, #3b82f6);
  outline-offset: 2px;
}

.btn-back-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-back-link[data-fallback="true"] {
  border-style: dashed;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 4px);
  margin-bottom: var(--spacing-sm, 8px);
  font-size: var(--font-size-sm, 14px);
}

.breadcrumb-link {
  color: var(--b24-primary, #3b82f6);
  text-decoration: none;
  transition: color var(--transition-base, 0.2s);
}

.breadcrumb-link:hover {
  color: var(--b24-primary-hover, #2563eb);
  text-decoration: underline;
}

.breadcrumb-separator {
  color: var(--b24-text-secondary, #6b7280);
}

.breadcrumb-current {
  color: var(--b24-text-primary, #111827);
  font-weight: 600;
}

.dashboard-title {
  margin: 0 0 var(--spacing-xs, 4px) 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--b24-text-primary, #111827);
}

.dashboard-subtitle {
  margin: 0;
  font-size: var(--font-size-sm, 14px);
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

