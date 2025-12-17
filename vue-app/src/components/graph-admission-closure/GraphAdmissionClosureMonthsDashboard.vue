<template>
  <div class="ac-dashboard-months">
    <!-- Прелоадер для загрузки графика -->
    <Transition name="fade" mode="out-in">
      <MonthsModePreloader
        v-if="isLoading"
        key="preloader"
        :progress="loadingProgress"
        :current-stage="currentLoadingStage"
      />
      
      <div v-else key="content">
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
              :weekPickerMode="false"
              :showPeriodMode="true"
              :period-mode="'months'"
              @update:stages="updateStages"
              @update:employees="updateEmployees"
              @update:dateRange="updateDateRange"
              @update:customDateRange="updateCustomDateRange"
              @update:period-mode="handlePeriodModeChange"
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

            <template v-else>
              <!-- Summary-карточки для 3-месячного режима -->
              <SummaryCardsMonths
                :data="chartData"
              />
              
              <!-- Графики для 3-месячного режима -->
              <LineChartMonths
                :data="chartData"
                :meta="chartMeta"
              />
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import StatusMessage from '@/components/common/StatusMessage.vue';
import FiltersPanel from '@/components/filters/FiltersPanel.vue';
import SummaryCardsMonths from './SummaryCardsMonths.vue';
import LineChartMonths from './LineChartMonths.vue';
import MonthsModePreloader from './MonthsModePreloader.vue';
import { fetchAdmissionClosureStats } from '@/services/graph-admission-closure/admissionClosureService.js';

const router = useRouter();

const isLoading = ref(true);
const loadingProgress = ref(0);
const currentLoadingStage = ref('Подготовка данных...');
const error = ref(null);
const chartMeta = ref(null);
const chartData = ref({
  newTickets: 0,
  closedTickets: 0,
  carryoverTickets: 0,
  newTicketsByMonth: [],
  closedTicketsByMonth: [],
  carryoverTicketsByMonth: []
});

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

    console.warn('GraphAdmissionClosureMonthsDashboard: fallback navigation to dashboard-sector-1c');
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

const hasActiveFilters = computed(() => {
  const hasCustomDates = filters.value.customDateRange.startDate || filters.value.customDateRange.endDate;
  const onlyAllEmployees = filters.value.employees.length === 1 && filters.value.employees.includes('all');
  return hasCustomDates || !onlyAllEmployees;
});

/**
 * Плавное обновление прогресса
 */
async function updateProgress(targetProgress, stage, duration = 500) {
  const startProgress = loadingProgress.value;
  const steps = 10;
  const stepProgress = (targetProgress - startProgress) / steps;
  const stepDuration = duration / steps;
  
  for (let i = 0; i < steps; i++) {
    await new Promise(resolve => setTimeout(resolve, stepDuration));
    loadingProgress.value = Math.min(
      startProgress + stepProgress * (i + 1),
      targetProgress
    );
  }
  
  loadingProgress.value = targetProgress;
  currentLoadingStage.value = stage;
}

async function loadData() {
  // Устанавливаем isLoading в true сразу для показа прелоадера
  isLoading.value = true;
  error.value = null;
  loadingProgress.value = 0;
  currentLoadingStage.value = 'Подготовка данных...';
  
  try {
    // Этап 1: Подготовка данных (0-10%)
    await updateProgress(10, 'Подготовка данных...', 300);
    
    // Этап 2: Загрузка данных за октябрь (10-40%)
    await updateProgress(40, 'Загрузка данных за октябрь...', 800);
    
    // Этап 3: Загрузка данных за ноябрь (40-70%)
    await updateProgress(70, 'Загрузка данных за ноябрь...', 800);
    
    // Этап 4: Загрузка данных за декабрь (70-90%)
    await updateProgress(90, 'Загрузка данных за декабрь...', 800);
    
    // Этап 5: Агрегация данных (90-95%)
    await updateProgress(95, 'Агрегация данных...', 400);
    
    // Выполняем реальный запрос к API
    const result = await fetchAdmissionClosureStats({
      product: '1C',
      periodMode: 'months',
      includeTickets: true
    });
    
    // Этап 6: Формирование графиков (95-100%)
    await updateProgress(100, 'Формирование графиков...', 300);
    
    const { meta, data } = result;
    chartMeta.value = meta;
    chartData.value = data;
    
    // Небольшая задержка перед скрытием прелоадера
    await new Promise(resolve => setTimeout(resolve, 200));
  } catch (err) {
    error.value = err instanceof Error ? err : new Error('Неизвестная ошибка загрузки');
    console.error('[GraphAdmissionClosureMonthsDashboard] loadData error:', err);
    // При ошибке показываем прогресс 100%, чтобы прелоадер скрылся
    loadingProgress.value = 100;
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

/**
 * Обработка изменения режима периода
 * Эмитим событие для родительского компонента
 */
function handlePeriodModeChange(mode) {
  if (!['weeks', 'months'].includes(mode)) {
    console.warn('[GraphAdmissionClosureMonthsDashboard] Invalid periodMode:', mode);
    return;
  }
  
  // Если выбран 'weeks', нужно переключиться на недельный режим
  if (mode === 'weeks') {
    // НЕ сохраняем в localStorage - режим определяется только выбором из попапа и переключением через фильтры
    // Эмитим глобальное событие для родительского компонента
    window.dispatchEvent(new CustomEvent('period-mode-change', { detail: { mode } }));
  }
  // Если выбран 'months', ничего не делаем (уже в месячном режиме)
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.ac-dashboard-months {
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

/* Transition для плавного появления/исчезновения */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-enter-to {
  opacity: 1;
  transform: translateY(0);
}

.fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

