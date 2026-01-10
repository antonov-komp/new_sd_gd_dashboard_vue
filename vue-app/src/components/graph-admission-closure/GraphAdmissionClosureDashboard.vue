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
      
      <div v-else-if="!showPeriodModeInfo && !isLoading" key="content">
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
                  @open-responsible="handleOpenResponsible"
                  @open-stages="handleOpenStages"
                  @open-carryover="handleOpenCarryover"
                />
              </template>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <ResponsibleModal
      :is-visible="showResponsibleModal"
      :responsible="getResponsibleData(selectedWeekMeta) || chartData.responsible || []"
      :closed-tickets-created-this-week="getClosedTicketsCreatedThisWeek(selectedWeekMeta) ?? chartData.closedTicketsCreatedThisWeek ?? 0"
      :closed-tickets-created-other-week="getClosedTicketsCreatedOtherWeek(selectedWeekMeta) ?? chartData.closedTicketsCreatedOtherWeek ?? 0"
      :responsible-created-this-week="getResponsibleCreatedThisWeek(selectedWeekMeta) || chartData.responsibleCreatedThisWeek || []"
      :responsible-created-other-week="getResponsibleCreatedOtherWeek(selectedWeekMeta) || chartData.responsibleCreatedOtherWeek || []"
      :week-number="selectedWeekMeta?.weekNumber || chartMeta?.weekNumber || null"
      :week-start-utc="selectedWeekMeta?.weekStartUtc || chartMeta?.weekStartUtc || null"
      :week-end-utc="selectedWeekMeta?.weekEndUtc || chartMeta?.weekEndUtc || null"
      @close="showResponsibleModal = false; selectedWeekMeta.value = null"
    />

    <StagesModal
      :is-visible="showStagesModal"
      :week-number="selectedWeekMeta?.weekNumber || chartMeta?.weekNumber || null"
      :week-start-utc="selectedWeekMeta?.weekStartUtc || chartMeta?.weekStartUtc || null"
      :week-end-utc="selectedWeekMeta?.weekEndUtc || chartMeta?.weekEndUtc || null"
      :preloaded-data="getPreloadedStagesData(selectedWeekMeta)"
      @close="showStagesModal = false; selectedWeekMeta.value = null"
    />

    <CarryoverDurationModal
      :is-visible="showCarryoverModal"
      :week-number="selectedWeekMeta?.weekNumber || chartMeta?.weekNumber || null"
      :week-start-utc="selectedWeekMeta?.weekStartUtc || chartMeta?.weekStartUtc || null"
      :week-end-utc="selectedWeekMeta?.weekEndUtc || chartMeta?.weekEndUtc || null"
      :preloaded-data="getPreloadedCarryoverData(selectedWeekMeta)"
      @close="showCarryoverModal = false; selectedWeekMeta.value = null"
    />

    <PeriodModeInfoModal
      v-if="showPeriodModeInfo"
      :is-visible="showPeriodModeInfo"
      :current-mode="periodMode"
      @close="handleCloseModal"
      @select-mode="handleModeSelectFromModal"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
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
const showPeriodModeInfo = ref(true); // Показываем попап сразу при инициализации

// TASK-062: Метаданные выбранной недели для попапов (текущая или предыдущая)
const selectedWeekMeta = ref(null);

// TASK-070: Предзагруженные данные для попапов
const preloadedPopupData = ref({
  currentWeek: {
    newTicketsByStages: null,
    carryoverTicketsByDuration: null,
    responsibleCreatedThisWeek: null,  // Для ResponsibleModal (уже частично загружено)
    responsibleCreatedOtherWeek: null  // Для ResponsibleModal (уже частично загружено)
  },
  previousWeek: {
    newTicketsByStages: null,
    carryoverTicketsByDuration: null,
    responsibleCreatedThisWeek: null,
    responsibleCreatedOtherWeek: null
  }
});

// TASK-070: Метаданные предыдущей недели для предзагрузки данных
const previousWeekMetaForPreload = computed(() => {
  const weeks = chartMeta.value?.weeks || [];
  if (weeks.length >= 2) {
    return weeks[weeks.length - 2]; // Предпоследняя неделя
  }
  return null;
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
  console.log('[DEBUG] loadData called');
  console.log('[DEBUG] periodMode:', periodMode.value);
  console.log('[DEBUG] isLoading before:', isLoading.value);
  
  // Загружаем данные только для недельного режима
  // Месячный режим обрабатывается в GraphAdmissionClosureMonthsDashboard
  if (periodMode.value !== 'weeks') {
    console.log('[DEBUG] loadData: periodMode is not weeks, returning and resetting isLoading');
    // Если режим не 'weeks', сбрасываем isLoading
    isLoading.value = false;
    return;
  }
  
  console.log('[DEBUG] Setting isLoading to true');
  // Устанавливаем isLoading в true сразу для показа прелоадера
  isLoading.value = true;
  error.value = null;
  
  // Небольшая задержка для гарантии отображения прелоадера (минимум 300ms)
  const minLoadingTime = new Promise(resolve => setTimeout(resolve, 300));
  
  try {
    console.log('[DEBUG] Starting API call');
    // Режим "4 последние недели" - используем текущую логику
    const currentWeek = getCurrentWeekBounds();
    const weekStartUtc = currentWeek.weekStartUtc;
    const weekEndUtc = currentWeek.weekEndUtc;
    
    console.log('[DEBUG] Week bounds:', { weekStartUtc, weekEndUtc });
    
    // Ждём минимум 300ms и загрузку данных параллельно
    const [_, result] = await Promise.all([
      minLoadingTime,
      fetchAdmissionClosureStats({
        product: '1C',
        periodMode: 'weeks',
        weekStartUtc,
        weekEndUtc,
        includeTickets: true,                    // TASK-047: Включаем тикеты для вкладки "По сотрудникам"
        includeNewTicketsByStages: true,          // TASK-070: Предзагрузка для StagesModal
        includeCarryoverTickets: true,             // TASK-080: Включаем переходящие тикеты для консистентности с универсальным кешем
        includeCarryoverTicketsByDuration: true   // TASK-070: Предзагрузка для CarryoverDurationModal
      })
    ]);
    
    console.log('[DEBUG] API call successful, result:', result);
    const { meta, data, carryoverDebug } = result;
    chartMeta.value = meta;
    
    // Нормализация данных: преобразуем объекты в массивы, если необходимо
    const normalizedThisWeek = Array.isArray(data.responsibleCreatedThisWeek) 
      ? data.responsibleCreatedThisWeek 
      : (data.responsibleCreatedThisWeek ? Object.values(data.responsibleCreatedThisWeek) : []);
    const normalizedOtherWeek = Array.isArray(data.responsibleCreatedOtherWeek) 
      ? data.responsibleCreatedOtherWeek 
      : (data.responsibleCreatedOtherWeek ? Object.values(data.responsibleCreatedOtherWeek) : []);
    
    chartData.value = {
      ...data,
      responsibleCreatedThisWeek: normalizedThisWeek,
      responsibleCreatedOtherWeek: normalizedOtherWeek
    };
    
    console.log('[DEBUG] Data set, meta:', meta, 'data keys:', Object.keys(data));
    console.log('[TASK-070] chartData.value.responsibleCreatedThisWeek after normalization:', {
      isArray: Array.isArray(normalizedThisWeek),
      length: normalizedThisWeek.length,
      sample: normalizedThisWeek.slice(0, 2).map(r => ({
        id: r.id,
        name: r.name,
        count: r.count,
        hasTickets: !!(r.tickets),
        ticketsCount: r.tickets?.length || 0
      }))
    });
    console.log('[TASK-070] chartData.value.responsibleCreatedOtherWeek after normalization:', {
      isArray: Array.isArray(normalizedOtherWeek),
      length: normalizedOtherWeek.length,
      sample: normalizedOtherWeek.slice(0, 2).map(r => ({
        id: r.id,
        name: r.name,
        count: r.count,
        hasTickets: !!(r.tickets),
        ticketsCount: r.tickets?.length || 0
      }))
    });
    
    // TASK-070: Логирование данных responsible для диагностики
    console.log('[TASK-070] responsibleCreatedThisWeek from API:', {
      count: data.responsibleCreatedThisWeek?.length || 0,
      data: data.responsibleCreatedThisWeek,
      details: data.responsibleCreatedThisWeek?.map(r => ({
        id: r.id,
        name: r.name,
        count: r.count,
        hasTickets: !!(r.tickets),
        ticketsCount: r.tickets?.length || 0
      }))
    });
    console.log('[TASK-070] responsibleCreatedOtherWeek from API:', {
      count: data.responsibleCreatedOtherWeek?.length || 0,
      data: data.responsibleCreatedOtherWeek,
      details: data.responsibleCreatedOtherWeek?.map(r => ({
        id: r.id,
        name: r.name,
        count: r.count,
        hasTickets: !!(r.tickets),
        ticketsCount: r.tickets?.length || 0
      }))
    });
    console.log('[TASK-070] closedTicketsCreatedThisWeek:', data.closedTicketsCreatedThisWeek);
    console.log('[TASK-070] closedTicketsCreatedOtherWeek:', data.closedTicketsCreatedOtherWeek);
    
    // TASK-070: Сохраняем предзагруженные данные для текущей недели
    if (data.newTicketsByStages) {
      preloadedPopupData.value.currentWeek.newTicketsByStages = data.newTicketsByStages;
      console.log('[TASK-070] Preloaded newTicketsByStages for current week:', data.newTicketsByStages.length, 'stages');
    }
    if (data.carryoverTicketsByDuration) {
      preloadedPopupData.value.currentWeek.carryoverTicketsByDuration = data.carryoverTicketsByDuration;
      console.log('[TASK-070] Preloaded carryoverTicketsByDuration for current week:', data.carryoverTicketsByDuration.length, 'categories');
    }
    // TASK-070: Сохраняем данные для ResponsibleModal (уже загружены в первом запросе)
    if (data.responsibleCreatedThisWeek) {
      // Нормализация: преобразуем объект в массив, если необходимо
      const normalizedThisWeek = Array.isArray(data.responsibleCreatedThisWeek) 
        ? data.responsibleCreatedThisWeek 
        : Object.values(data.responsibleCreatedThisWeek);
      preloadedPopupData.value.currentWeek.responsibleCreatedThisWeek = normalizedThisWeek;
      console.log('[TASK-070] Preloaded responsibleCreatedThisWeek for current week:', normalizedThisWeek.length, 'employees');
      console.log('[TASK-070] responsibleCreatedThisWeek details:', normalizedThisWeek.map(r => ({
        id: r.id,
        name: r.name,
        count: r.count,
        hasTickets: !!(r.tickets),
        ticketsCount: r.tickets?.length || 0
      })));
    }
    if (data.responsibleCreatedOtherWeek) {
      // Нормализация: преобразуем объект в массив, если необходимо
      const normalizedOtherWeek = Array.isArray(data.responsibleCreatedOtherWeek) 
        ? data.responsibleCreatedOtherWeek 
        : Object.values(data.responsibleCreatedOtherWeek);
      preloadedPopupData.value.currentWeek.responsibleCreatedOtherWeek = normalizedOtherWeek;
      console.log('[TASK-070] Preloaded responsibleCreatedOtherWeek for current week:', normalizedOtherWeek.length, 'employees');
      console.log('[TASK-070] responsibleCreatedOtherWeek details:', normalizedOtherWeek.map(r => ({
        id: r.id,
        name: r.name,
        count: r.count,
        hasTickets: !!(r.tickets),
        ticketsCount: r.tickets?.length || 0
      })));
    }
    
    // TASK-063: Временный вывод carryover breakdown для проверки в консоли
    if (carryoverDebug) {
      console.log('[CARRYOVER-DEBUG] ========================================');
      console.log('[CARRYOVER-DEBUG] Total:', carryoverDebug.total);
      console.log('[CARRYOVER-DEBUG] ThisWeek:', carryoverDebug.thisWeek);
      console.log('[CARRYOVER-DEBUG] PreviousWeek:', carryoverDebug.previousWeek);
      console.log('[CARRYOVER-DEBUG] Older:', carryoverDebug.older);
      console.log('[CARRYOVER-DEBUG] Sum:', carryoverDebug.sum, '(expected:', carryoverDebug.total, ')');
      console.log('[CARRYOVER-DEBUG] Series:', carryoverDebug.series);
      console.log('[CARRYOVER-DEBUG] CurrentWeekData:', carryoverDebug.currentWeekData);
      console.log('[CARRYOVER-DEBUG] WeeksData:', carryoverDebug.weeksData);
      console.log('[CARRYOVER-DEBUG] Full object:', carryoverDebug);
      console.log('[CARRYOVER-DEBUG] ========================================');
    }
    
    // TASK-070: Параллельная загрузка данных для предыдущей недели (не блокирует основной UI)
    if (previousWeekMetaForPreload.value) {
      const prevWeekStart = previousWeekMetaForPreload.value.weekStartUtc;
      const prevWeekEnd = previousWeekMetaForPreload.value.weekEndUtc;
      
      console.log('[TASK-070] Starting preload for previous week:', {
        weekNumber: previousWeekMetaForPreload.value.weekNumber,
        weekStartUtc: prevWeekStart,
        weekEndUtc: prevWeekEnd
      });
      
      // Загружаем данные для предыдущей недели в фоне (не блокируем основной UI)
      fetchAdmissionClosureStats({
        product: '1C',
        periodMode: 'weeks',
        weekStartUtc: prevWeekStart,
        weekEndUtc: prevWeekEnd,
        includeTickets: true,                    // Для ResponsibleModal
        includeNewTicketsByStages: true,          // Для StagesModal
        includeCarryoverTickets: true,             // TASK-080: Включаем переходящие тикеты для консистентности
        includeCarryoverTicketsByDuration: true   // Для CarryoverDurationModal
      }).then(result => {
        console.log('[TASK-070] Preload successful for previous week');
        
        // Сохраняем предзагруженные данные для предыдущей недели
        if (result.data.newTicketsByStages) {
          preloadedPopupData.value.previousWeek.newTicketsByStages = result.data.newTicketsByStages;
          console.log('[TASK-070] Preloaded newTicketsByStages for previous week:', result.data.newTicketsByStages.length, 'stages');
        }
        if (result.data.carryoverTicketsByDuration) {
          preloadedPopupData.value.previousWeek.carryoverTicketsByDuration = result.data.carryoverTicketsByDuration;
          console.log('[TASK-070] Preloaded carryoverTicketsByDuration for previous week:', result.data.carryoverTicketsByDuration.length, 'categories');
        }
        if (result.data.responsibleCreatedThisWeek) {
          // Нормализация: преобразуем объект в массив, если необходимо
          const normalizedThisWeek = Array.isArray(result.data.responsibleCreatedThisWeek) 
            ? result.data.responsibleCreatedThisWeek 
            : Object.values(result.data.responsibleCreatedThisWeek);
          preloadedPopupData.value.previousWeek.responsibleCreatedThisWeek = normalizedThisWeek;
          console.log('[TASK-070] Preloaded responsibleCreatedThisWeek for previous week:', normalizedThisWeek.length, 'employees');
        }
        if (result.data.responsibleCreatedOtherWeek) {
          // Нормализация: преобразуем объект в массив, если необходимо
          const normalizedOtherWeek = Array.isArray(result.data.responsibleCreatedOtherWeek) 
            ? result.data.responsibleCreatedOtherWeek 
            : Object.values(result.data.responsibleCreatedOtherWeek);
          preloadedPopupData.value.previousWeek.responsibleCreatedOtherWeek = normalizedOtherWeek;
          console.log('[TASK-070] Preloaded responsibleCreatedOtherWeek for previous week:', normalizedOtherWeek.length, 'employees');
        }
      }).catch(err => {
        console.warn('[TASK-070] Failed to preload previous week data (non-critical):', err);
        // Не критично, данные загрузятся при открытии попапа (fallback)
      });
    }
  } catch (err) {
    console.error('[DEBUG] API call failed:', err);
    error.value = err instanceof Error ? err : new Error('Неизвестная ошибка загрузки');
    console.error('[GraphAdmissionClosureDashboard] loadData error:', err);
  } finally {
    console.log('[DEBUG] Finally block: setting isLoading to false');
    isLoading.value = false;
    console.log('[DEBUG] isLoading after:', isLoading.value);
  }
}

/**
 * TASK-070: Получение предзагруженных данных для StagesModal
 * 
 * @param {Object|null} weekMeta - Метаданные недели (текущей или предыдущей)
 * @returns {Array|null} Предзагруженные данные стадий или null
 */
function getPreloadedStagesData(weekMeta) {
  if (!weekMeta || !chartMeta.value) {
    console.log('[TASK-070] getPreloadedStagesData: Missing weekMeta or chartMeta');
    return null;
  }
  
  // Определяем текущую неделю: последний элемент из weeks или weekNumber из chartMeta
  const weeks = chartMeta.value?.weeks || [];
  const currentWeekNumber = weeks.length > 0 
    ? weeks[weeks.length - 1].weekNumber 
    : chartMeta.value.weekNumber;
  
  const previousWeekNumber = weeks.length >= 2 
    ? weeks[weeks.length - 2].weekNumber 
    : null;
  
  console.log('[TASK-070] getPreloadedStagesData:', {
    requestedWeek: weekMeta.weekNumber,
    currentWeekNumber,
    previousWeekNumber,
    weeksInMeta: weeks.length
  });
  
  const isCurrentWeek = weekMeta.weekNumber === currentWeekNumber;
  const isPreviousWeek = weekMeta.weekNumber === previousWeekNumber;
  
  let data = null;
  if (isCurrentWeek) {
    data = preloadedPopupData.value.currentWeek.newTicketsByStages;
    console.log('[TASK-070] Requested week is current week, checking currentWeek data:', data ? `Array(${data.length})` : 'null');
  } else if (isPreviousWeek) {
    data = preloadedPopupData.value.previousWeek.newTicketsByStages;
    console.log('[TASK-070] Requested week is previous week, checking previousWeek data:', data ? `Array(${data.length})` : 'null');
  } else {
    console.log('[TASK-070] Requested week', weekMeta.weekNumber, 'is neither current nor previous, no preloaded data available');
    return null;
  }
  
  // Валидация: проверяем, что данные есть и это массив
  if (Array.isArray(data) && data.length > 0) {
    console.log('[TASK-070] Using preloaded stages data for week', weekMeta.weekNumber, ':', data.length, 'stages');
    return data;
  }
  
  console.log('[TASK-070] No preloaded stages data for week', weekMeta.weekNumber, ', will use API fallback');
  return null;
}

/**
 * TASK-070: Получение предзагруженных данных для CarryoverDurationModal
 * 
 * @param {Object|null} weekMeta - Метаданные недели (текущей или предыдущей)
 * @returns {Array|null} Предзагруженные данные категорий сроков или null
 */
function getPreloadedCarryoverData(weekMeta) {
  if (!weekMeta || !chartMeta.value) {
    return null;
  }
  
  // Определяем текущую неделю: последний элемент из weeks или weekNumber из chartMeta
  const weeks = chartMeta.value?.weeks || [];
  const currentWeekNumber = weeks.length > 0 
    ? weeks[weeks.length - 1].weekNumber 
    : chartMeta.value.weekNumber;
  
  const isCurrentWeek = weekMeta.weekNumber === currentWeekNumber;
  const data = isCurrentWeek 
    ? preloadedPopupData.value.currentWeek.carryoverTicketsByDuration
    : preloadedPopupData.value.previousWeek.carryoverTicketsByDuration;
  
  // Валидация: проверяем, что данные есть и это массив
  if (Array.isArray(data) && data.length > 0) {
    console.log('[TASK-070] Using preloaded carryover data for week', weekMeta.weekNumber, ':', data.length, 'categories');
    return data;
  }
  
  console.log('[TASK-070] No preloaded carryover data for week', weekMeta.weekNumber, ', will use API fallback');
  return null;
}

/**
 * TASK-070: Получение данных ответственных для ResponsibleModal
 * 
 * @param {Object|null} weekMeta - Метаданные недели (текущей или предыдущей)
 * @returns {Array|null} Данные ответственных или null
 */
function getResponsibleData(weekMeta) {
  // Для ResponsibleModal данные загружаются через отдельный запрос при открытии попапа
  // Предзагруженные данные используются только для текущей недели (уже в chartData)
  if (!weekMeta || !chartMeta.value) {
    return null;
  }
  
  // Определяем текущую неделю: последний элемент из weeks или weekNumber из chartMeta
  const weeks = chartMeta.value?.weeks || [];
  const currentWeekNumber = weeks.length > 0 
    ? weeks[weeks.length - 1].weekNumber 
    : chartMeta.value.weekNumber;
  
  const isCurrentWeek = weekMeta.weekNumber === currentWeekNumber;
  if (isCurrentWeek) {
    // Для текущей недели данные уже в chartData.responsible
    return chartData.value.responsible || null;
  }
  
  // Для предыдущей недели данные будут загружены при открытии попапа
  return null;
}

/**
 * TASK-070: Получение данных responsibleCreatedThisWeek для ResponsibleModal
 */
function getResponsibleCreatedThisWeek(weekMeta) {
  // Если weekMeta не указан (клик на summary-карточку текущей недели), используем данные из chartData
  if (!weekMeta) {
    const data = chartData.value.responsibleCreatedThisWeek;
    console.log('[TASK-070] getResponsibleCreatedThisWeek: weekMeta is null, using chartData:', {
      hasData: !!data,
      isArray: Array.isArray(data),
      dataLength: Array.isArray(data) ? data.length : (data ? Object.keys(data).length : 0)
    });
    if (!data) return null;
    // Нормализация: преобразуем объект в массив, если необходимо
    return Array.isArray(data) ? data : Object.values(data);
  }
  
  if (!chartMeta.value) {
    console.log('[TASK-070] getResponsibleCreatedThisWeek: chartMeta is null');
    return null;
  }
  
  // Определяем текущую неделю: последний элемент из weeks или weekNumber из chartMeta
  const weeks = chartMeta.value?.weeks || [];
  const currentWeekNumber = weeks.length > 0 
    ? weeks[weeks.length - 1].weekNumber 
    : chartMeta.value.weekNumber;
  
  const previousWeekNumber = weeks.length >= 2 
    ? weeks[weeks.length - 2].weekNumber 
    : null;
  
  const isCurrentWeek = weekMeta.weekNumber === currentWeekNumber;
  const isPreviousWeek = weekMeta.weekNumber === previousWeekNumber;
  
  console.log('[TASK-070] getResponsibleCreatedThisWeek:', {
    requestedWeek: weekMeta.weekNumber,
    currentWeekNumber,
    previousWeekNumber,
    isCurrentWeek,
    isPreviousWeek
  });
  
  if (isCurrentWeek) {
    const data = chartData.value.responsibleCreatedThisWeek;
    console.log('[TASK-070] getResponsibleCreatedThisWeek: current week data:', {
      hasData: !!data,
      isArray: Array.isArray(data),
      dataLength: Array.isArray(data) ? data.length : (data ? Object.keys(data).length : 0)
    });
    if (!data) return null;
    // Нормализация: преобразуем объект в массив, если необходимо
    return Array.isArray(data) ? data : Object.values(data);
  }
  
  // Для предыдущей недели используем предзагруженные данные
  if (isPreviousWeek) {
    const previousWeekData = preloadedPopupData.value.previousWeek.responsibleCreatedThisWeek;
    console.log('[TASK-070] getResponsibleCreatedThisWeek: previous week data:', {
      hasData: !!previousWeekData,
      isArray: Array.isArray(previousWeekData),
      dataLength: Array.isArray(previousWeekData) ? previousWeekData.length : 0,
      data: previousWeekData
    });
    return previousWeekData || null;
  }
  
  // Для других недель данные будут загружены при открытии попапа
  console.log('[TASK-070] getResponsibleCreatedThisWeek: week', weekMeta.weekNumber, 'is neither current nor previous, no preloaded data');
  return null;
}

/**
 * TASK-070: Получение данных responsibleCreatedOtherWeek для ResponsibleModal
 */
function getResponsibleCreatedOtherWeek(weekMeta) {
  // Если weekMeta не указан (клик на summary-карточку текущей недели), используем данные из chartData
  if (!weekMeta) {
    const data = chartData.value.responsibleCreatedOtherWeek;
    console.log('[TASK-070] getResponsibleCreatedOtherWeek: weekMeta is null, using chartData:', {
      hasData: !!data,
      isArray: Array.isArray(data),
      dataLength: Array.isArray(data) ? data.length : (data ? Object.keys(data).length : 0)
    });
    if (!data) return null;
    // Нормализация: преобразуем объект в массив, если необходимо
    return Array.isArray(data) ? data : Object.values(data);
  }
  
  if (!chartMeta.value) {
    console.log('[TASK-070] getResponsibleCreatedOtherWeek: chartMeta is null');
    return null;
  }
  
  // Определяем текущую неделю: последний элемент из weeks или weekNumber из chartMeta
  const weeks = chartMeta.value?.weeks || [];
  const currentWeekNumber = weeks.length > 0 
    ? weeks[weeks.length - 1].weekNumber 
    : chartMeta.value.weekNumber;
  
  const previousWeekNumber = weeks.length >= 2 
    ? weeks[weeks.length - 2].weekNumber 
    : null;
  
  const isCurrentWeek = weekMeta.weekNumber === currentWeekNumber;
  const isPreviousWeek = weekMeta.weekNumber === previousWeekNumber;
  
  console.log('[TASK-070] getResponsibleCreatedOtherWeek:', {
    requestedWeek: weekMeta.weekNumber,
    currentWeekNumber,
    previousWeekNumber,
    isCurrentWeek,
    isPreviousWeek
  });
  
  if (isCurrentWeek) {
    const data = chartData.value.responsibleCreatedOtherWeek;
    console.log('[TASK-070] getResponsibleCreatedOtherWeek: current week data:', {
      hasData: !!data,
      isArray: Array.isArray(data),
      dataLength: Array.isArray(data) ? data.length : (data ? Object.keys(data).length : 0)
    });
    if (!data) return null;
    // Нормализация: преобразуем объект в массив, если необходимо
    return Array.isArray(data) ? data : Object.values(data);
  }
  
  // Для предыдущей недели используем предзагруженные данные
  if (isPreviousWeek) {
    const previousWeekData = preloadedPopupData.value.previousWeek.responsibleCreatedOtherWeek;
    console.log('[TASK-070] getResponsibleCreatedOtherWeek: previous week data:', {
      hasData: !!previousWeekData,
      isArray: Array.isArray(previousWeekData),
      dataLength: Array.isArray(previousWeekData) ? previousWeekData.length : 0,
      data: previousWeekData
    });
    return previousWeekData || null;
  }
  
  // Для других недель данные будут загружены при открытии попапа
  console.log('[TASK-070] getResponsibleCreatedOtherWeek: week', weekMeta.weekNumber, 'is neither current nor previous, no preloaded data');
  return null;
}

/**
 * TASK-070: Получение closedTicketsCreatedThisWeek для ResponsibleModal
 */
function getClosedTicketsCreatedThisWeek(weekMeta) {
  if (!weekMeta || !chartMeta.value) {
    return null;
  }
  
  // Определяем текущую неделю: последний элемент из weeks или weekNumber из chartMeta
  const weeks = chartMeta.value?.weeks || [];
  const currentWeekNumber = weeks.length > 0 
    ? weeks[weeks.length - 1].weekNumber 
    : chartMeta.value.weekNumber;
  const previousWeekNumber = weeks.length >= 2 
    ? weeks[weeks.length - 2].weekNumber 
    : null;
  
  const isCurrentWeek = weekMeta.weekNumber === currentWeekNumber;
  const isPreviousWeek = weekMeta.weekNumber === previousWeekNumber;
  
  if (isCurrentWeek) {
    return chartData.value.closedTicketsCreatedThisWeek ?? null;
  }
  
  // Для предыдущей недели получаем из weeksData
  if (isPreviousWeek && chartData.value.weeksData) {
    const previousWeekData = chartData.value.weeksData.find(w => w.weekNumber === previousWeekNumber);
    return previousWeekData?.closedTicketsCreatedThisWeek ?? null;
  }
  
  // Для других недель попап сделает запрос при открытии
  return null;
}

/**
 * TASK-070: Получение closedTicketsCreatedOtherWeek для ResponsibleModal
 */
function getClosedTicketsCreatedOtherWeek(weekMeta) {
  if (!weekMeta || !chartMeta.value) {
    return null;
  }
  
  // Определяем текущую неделю: последний элемент из weeks или weekNumber из chartMeta
  const weeks = chartMeta.value?.weeks || [];
  const currentWeekNumber = weeks.length > 0 
    ? weeks[weeks.length - 1].weekNumber 
    : chartMeta.value.weekNumber;
  const previousWeekNumber = weeks.length >= 2 
    ? weeks[weeks.length - 2].weekNumber 
    : null;
  
  const isCurrentWeek = weekMeta.weekNumber === currentWeekNumber;
  const isPreviousWeek = weekMeta.weekNumber === previousWeekNumber;
  
  if (isCurrentWeek) {
    return chartData.value.closedTicketsCreatedOtherWeek ?? null;
  }
  
  // Для предыдущей недели получаем из weeksData
  if (isPreviousWeek && chartData.value.weeksData) {
    const previousWeekData = chartData.value.weeksData.find(w => w.weekNumber === previousWeekNumber);
    return previousWeekData?.closedTicketsCreatedOtherWeek ?? null;
  }
  
  // Для других недель попап сделает запрос при открытии
  return null;
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
  
  // НЕ сохраняем в localStorage - режим определяется только выбором из попапа и переключением через фильтры
  // Перезагрузка данных при изменении режима (покажет прелоадер)
  // Для months режима загрузка происходит в GraphAdmissionClosureMonthsDashboard
  if (mode === 'weeks') {
    loadData();
  } else if (mode === 'months') {
    // Для месячного режима загрузка происходит в дочернем компоненте
    // Сбрасываем isLoading, чтобы показать дочерний компонент
    isLoading.value = false;
  }
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
  // Для months режима фильтры применяются в GraphAdmissionClosureMonthsDashboard
  // Загружаем данные только для weeks режима
  if (periodMode.value === 'weeks') {
    loadData();
  }
  // Для months режима фильтры обрабатываются в дочернем компоненте
}

/**
 * Обработка выбора режима из попапа
 */
function handleModeSelectFromModal(mode) {
  if (['weeks', 'months'].includes(mode)) {
    periodMode.value = mode;
    // НЕ сохраняем в localStorage при выборе из попапа
    // Попап показывается каждый раз, сохранение не нужно
    // Сохранение происходит только при переключении через фильтры
  }
}

/**
 * Обработка закрытия попапа
 */
function handleCloseModal() {
  console.log('[DEBUG] handleCloseModal called');
  console.log('[DEBUG] showPeriodModeInfo before:', showPeriodModeInfo.value);
  console.log('[DEBUG] isLoading before:', isLoading.value);
  console.log('[DEBUG] periodMode:', periodMode.value);
  
  // Закрываем попап
  showPeriodModeInfo.value = false;
  
  // Сразу устанавливаем isLoading в true для показа прелоадера
  // Это предотвратит показ контента без данных
  isLoading.value = true;
  
  console.log('[DEBUG] showPeriodModeInfo after:', showPeriodModeInfo.value);
  console.log('[DEBUG] isLoading after:', isLoading.value);
  
  // Запускаем загрузку данных сразу после закрытия попапа
  // Используем nextTick для гарантии, что попап закрыт и DOM обновлен
  nextTick(() => {
    console.log('[DEBUG] handleCloseModal: calling handleStartLoading in nextTick');
    handleStartLoading();
  });
}

/**
 * Обработка начала загрузки после закрытия попапа
 */
function handleStartLoading() {
  console.log('[DEBUG] handleStartLoading called');
  console.log('[DEBUG] periodMode before check:', periodMode.value);
  console.log('[DEBUG] showPeriodModeInfo:', showPeriodModeInfo.value);
  console.log('[DEBUG] isLoading:', isLoading.value);
  
  // Убеждаемся, что режим установлен перед загрузкой
  if (!periodMode.value || !['weeks', 'months'].includes(periodMode.value)) {
    console.warn('[GraphAdmissionClosureDashboard] Period mode not set, using default "weeks"');
    periodMode.value = 'weeks';
  }
  
  console.log('[GraphAdmissionClosureDashboard] Starting loading, periodMode:', periodMode.value);
  
  // isLoading уже установлен в true в handleCloseModal
  // Используем nextTick для гарантии, что режим установлен и попап закрыт перед загрузкой
  nextTick(() => {
    console.log('[DEBUG] nextTick callback, periodMode:', periodMode.value);
    console.log('[DEBUG] isLoading in nextTick:', isLoading.value);
    
    // Для недельного режима загружаем данные здесь
    if (periodMode.value === 'weeks') {
      console.log('[GraphAdmissionClosureDashboard] Loading data for weeks mode');
      loadData();
    } else if (periodMode.value === 'months') {
      console.log('[GraphAdmissionClosureDashboard] Months mode - data will be loaded by GraphAdmissionClosureMonthsDashboard');
      // Для месячного режима загрузка происходит в GraphAdmissionClosureMonthsDashboard
      // Но нужно сбросить isLoading родителя, чтобы показать дочерний компонент
      // Дочерний компонент имеет свой isLoading
      isLoading.value = false;
      console.log('[DEBUG] Reset parent isLoading to false for months mode');
    }
  });
}

/**
 * Загрузка режима из localStorage при монтировании
 */
// TASK-062: Обработчики открытия попапов с поддержкой метаданных недели (текущая/предыдущая)
function handleOpenStages(weekMeta = null) {
  // Если переданы метаданные недели, используем их, иначе используем текущую неделю из chartMeta
  if (weekMeta) {
    selectedWeekMeta.value = weekMeta;
  } else {
    selectedWeekMeta.value = {
      weekNumber: chartMeta.value?.weekNumber || null,
      weekStartUtc: chartMeta.value?.weekStartUtc || null,
      weekEndUtc: chartMeta.value?.weekEndUtc || null
    };
  }
  showStagesModal.value = true;
}

function handleOpenResponsible(weekMeta = null) {
  // Если переданы метаданные недели, используем их, иначе используем текущую неделю из chartMeta
  if (weekMeta) {
    selectedWeekMeta.value = weekMeta;
  } else {
    selectedWeekMeta.value = {
      weekNumber: chartMeta.value?.weekNumber || null,
      weekStartUtc: chartMeta.value?.weekStartUtc || null,
      weekEndUtc: chartMeta.value?.weekEndUtc || null
    };
  }
  showResponsibleModal.value = true;
}

function handleOpenCarryover(weekMeta = null) {
  // Если переданы метаданные недели, используем их, иначе используем текущую неделю из chartMeta
  if (weekMeta) {
    selectedWeekMeta.value = weekMeta;
  } else {
    selectedWeekMeta.value = {
      weekNumber: chartMeta.value?.weekNumber || null,
      weekStartUtc: chartMeta.value?.weekStartUtc || null,
      weekEndUtc: chartMeta.value?.weekEndUtc || null
    };
  }
  showCarryoverModal.value = true;
}

onMounted(() => {
  // Удаляем старые флаги из localStorage, если они есть (больше не используются)
  try {
    const oldFlag = 'graph-admission-closure-period-mode-info-shown';
    if (localStorage.getItem(oldFlag)) {
      localStorage.removeItem(oldFlag);
    }
    // Удаляем старый режим из localStorage (больше не используется)
    const oldMode = 'graph-admission-closure-period-mode';
    if (localStorage.getItem(oldMode)) {
      localStorage.removeItem(oldMode);
    }
  } catch (error) {
    console.warn('[GraphAdmissionClosureDashboard] Failed to clean localStorage:', error);
  }
  
  // Подписка на глобальное событие изменения режима
  window.addEventListener('period-mode-change', handleGlobalPeriodModeChange);
  
  // showPeriodModeInfo уже установлен в true при инициализации
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

