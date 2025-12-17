<template>
  <div class="ac-dashboard">
    <!-- Приятный прелоадер для загрузки графика -->
    <Transition name="fade" mode="out-in">
      <div v-if="isLoading" key="preloader" class="chart-preloader">
        <div class="preloader-content">
          <div class="preloader-spinner">
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
          </div>
          <h3 class="preloader-title">Загрузка графика</h3>
          <p class="preloader-message">
            Получение данных за {{ periodMode === 'weeks' ? '4 недели' : '3 месяца' }}...
          </p>
          <div class="preloader-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
      
      <div v-else-if="!showPeriodModeInfo" key="content">
        <!-- Условный рендеринг: месячный или недельный режим -->
        <GraphAdmissionClosureMonthsDashboard
          v-if="periodMode === 'months'"
        />
        
        <div v-else class="weeks-dashboard">
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
                :period-mode="periodMode"
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
                <!-- График для недельного режима -->
                <GraphAdmissionClosureChart
                  :meta="chartMeta"
                  :data="chartData"
                  @open-responsible="showResponsibleModal = true"
                  @open-stages="showStagesModal = true"
                  @open-carryover="showCarryoverModal = true"
                />
              </template>
            </div>
          </div>
        </div>
      </div>
    </Transition>

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

    <PeriodModeInfoModal
      v-if="showPeriodModeInfo"
      :is-visible="showPeriodModeInfo"
      :current-mode="periodMode"
      @close="showPeriodModeInfo = false"
      @start-loading="handleStartLoading"
      @select-mode="handleModeSelectFromModal"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import StatusMessage from '@/components/common/StatusMessage.vue';
import FiltersPanel from '@/components/filters/FiltersPanel.vue';
import PeriodModeInfoModal from './PeriodModeInfoModal.vue';
import GraphAdmissionClosureChart from './GraphAdmissionClosureChart.vue';
import GraphAdmissionClosureMonthsDashboard from './GraphAdmissionClosureMonthsDashboard.vue';
import ResponsibleModal from './ResponsibleModal.vue';
import StagesModal from './StagesModal.vue';
import CarryoverDurationModal from './CarryoverDurationModal.vue';
import { fetchAdmissionClosureStats } from '@/services/graph-admission-closure/admissionClosureService.js';

const router = useRouter();

const isLoading = ref(false); // Начинаем с false, чтобы не показывать прелоадер при показе попапа
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
const showPeriodModeInfo = ref(false);

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

// Режим периода: 'weeks' (4 последние недели) или 'months' (3 последних месяца)
const periodMode = ref('weeks');

const hasActiveFilters = computed(() => {
  const hasCustomDates = filters.value.customDateRange.startDate || filters.value.customDateRange.endDate;
  const onlyAllEmployees = filters.value.employees.length === 1 && filters.value.employees.includes('all');
  return hasCustomDates || !onlyAllEmployees;
});

async function loadData() {
  // Загружаем данные только для недельного режима
  // Месячный режим обрабатывается в GraphAdmissionClosureMonthsDashboard
  if (periodMode.value !== 'weeks') {
    return;
  }
  
  // Устанавливаем isLoading в true сразу для показа прелоадера
  isLoading.value = true;
  error.value = null;
  
  // Небольшая задержка для гарантии отображения прелоадера (минимум 300ms)
  const minLoadingTime = new Promise(resolve => setTimeout(resolve, 300));
  
  try {
    // Режим "4 последние недели" - используем текущую логику
    const currentWeek = getCurrentWeekBounds();
    const weekStartUtc = currentWeek.weekStartUtc;
    const weekEndUtc = currentWeek.weekEndUtc;
    
    // Ждём минимум 300ms и загрузку данных параллельно
    const [_, result] = await Promise.all([
      minLoadingTime,
      fetchAdmissionClosureStats({
        product: '1C',
        periodMode: 'weeks',
        weekStartUtc,
        weekEndUtc,
        includeTickets: true // TASK-047: Включаем тикеты для вкладки "По сотрудникам"
      })
    ]);
    
    const { meta, data } = result;
    chartMeta.value = meta;
    chartData.value = data;
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

/**
 * Обработка изменения режима периода
 */
function handlePeriodModeChange(mode) {
  if (!['weeks', 'months'].includes(mode)) {
    console.warn('[GraphAdmissionClosureDashboard] Invalid periodMode:', mode);
    return;
  }
  
  // Не обрабатываем, если режим не изменился
  if (mode === periodMode.value) {
    return;
  }
  
  periodMode.value = mode;
  
  // Сохранение в localStorage
  try {
    localStorage.setItem('graph-admission-closure-period-mode', mode);
  } catch (error) {
    console.warn('[GraphAdmissionClosureDashboard] Failed to save mode to localStorage:', error);
  }
  
  // Перезагрузка данных при изменении режима (покажет прелоадер)
  loadData();
}

/**
 * Обработка глобального события изменения режима периода
 */
function handleGlobalPeriodModeChange(event) {
  const { mode } = event.detail;
  if (['weeks', 'months'].includes(mode)) {
    handlePeriodModeChange(mode);
  }
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
 * Обработка выбора режима из попапа
 */
function handleModeSelectFromModal(mode) {
  if (['weeks', 'months'].includes(mode)) {
    periodMode.value = mode;
    // Сохраняем в localStorage
    try {
      localStorage.setItem('graph-admission-closure-period-mode', mode);
    } catch (error) {
      console.warn('[GraphAdmissionClosureDashboard] Failed to save mode to localStorage:', error);
    }
  }
}

/**
 * Обработка начала загрузки после закрытия попапа
 */
function handleStartLoading() {
  // Запускаем загрузку данных после закрытия попапа
  loadData();
}

/**
 * Загрузка режима из localStorage при монтировании
 */
onMounted(() => {
  try {
    const savedMode = localStorage.getItem('graph-admission-closure-period-mode');
    if (savedMode === 'weeks' || savedMode === 'months') {
      periodMode.value = savedMode;
    }
  } catch (error) {
    console.warn('[GraphAdmissionClosureDashboard] Failed to read from localStorage:', error);
  }
  
  // Подписка на глобальное событие изменения режима
  window.addEventListener('period-mode-change', handleGlobalPeriodModeChange);
  
  // Всегда показываем попап выбора режима при входе в модуль
  showPeriodModeInfo.value = true;
  // Не запускаем загрузку, если показывается попап
  // Загрузка запустится после закрытия попапа
});

// Очистка при размонтировании
onUnmounted(() => {
  window.removeEventListener('period-mode-change', handleGlobalPeriodModeChange);
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

.weeks-dashboard {
  width: 100%;
}

.chart-container {
  width: 100%;
  min-height: 360px;
}

.months-chart-placeholder {
  padding: var(--spacing-xl, 24px);
  text-align: center;
  background-color: var(--b24-bg-light, #f9fafb);
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--b24-border-light, #e5e7eb);
  color: var(--b24-text-secondary, #6b7280);
  margin-top: var(--spacing-lg, 20px);
}

/* Приятный прелоадер для загрузки графика */
.chart-preloader {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 70vh; /* Занимает минимум 70% высоты экрана */
  padding: 60px 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: var(--radius-lg, 12px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 1;
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

.preloader-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  max-width: 400px;
}

.preloader-spinner {
  position: relative;
  width: 80px;
  height: 80px;
  margin-bottom: 32px;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 4px solid transparent;
  border-top-color: var(--b24-primary, #007bff);
  border-radius: 50%;
  animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.spinner-ring:nth-child(1) {
  animation-delay: 0s;
  border-top-color: var(--b24-primary, #007bff);
  opacity: 1;
}

.spinner-ring:nth-child(2) {
  animation-delay: -0.4s;
  border-top-color: var(--b24-success, #28a745);
  opacity: 0.7;
  width: 70%;
  height: 70%;
  top: 15%;
  left: 15%;
}

.spinner-ring:nth-child(3) {
  animation-delay: -0.8s;
  border-top-color: #ff9800;
  opacity: 0.5;
  width: 50%;
  height: 50%;
  top: 25%;
  left: 25%;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.preloader-title {
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
  letter-spacing: -0.02em;
}

.preloader-message {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: var(--b24-text-secondary, #6b7280);
  line-height: 1.5;
}

.preloader-dots {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
}

.preloader-dots .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--b24-primary, #007bff);
  animation: dotPulse 1.4s ease-in-out infinite;
  opacity: 0.6;
}

.preloader-dots .dot:nth-child(1) {
  animation-delay: 0s;
}

.preloader-dots .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.preloader-dots .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dotPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.3);
    opacity: 1;
  }
}

/* Адаптивность для мобильных */
@media (max-width: 768px) {
  .chart-preloader {
    min-height: 400px;
    padding: 40px 20px;
  }
  
  .preloader-spinner {
    width: 60px;
    height: 60px;
    margin-bottom: 24px;
  }
  
  .preloader-title {
    font-size: 18px;
  }
  
  .preloader-message {
    font-size: 13px;
  }
}
</style>

