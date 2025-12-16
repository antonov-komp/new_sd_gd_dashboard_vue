<template>
  <div class="graph-state-dashboard">
    <!-- Прелоадер -->
    <LoadingSpinner v-if="isLoading" :message="loadingMessage" />

    <!-- Сообщение об ошибке -->
    <div v-if="error" class="error-message-container">
      <div class="error-message">
        <div class="error-header">
          <span class="error-icon">❌</span>
          <h3>Ошибка</h3>
          <button @click="handleErrorClose" class="error-close" aria-label="Закрыть">✕</button>
        </div>
        <p class="error-text">{{ error.message }}</p>
        <div v-if="error.details" class="error-details">
          <details>
            <summary>Детали ошибки</summary>
            <pre>{{ error.details }}</pre>
          </details>
        </div>
        <div class="error-actions">
          <button @click="handleErrorRetry" class="btn-retry">Повторить попытку</button>
        </div>
      </div>
    </div>

    <!-- Заголовок дашборда -->
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
            <span class="breadcrumb-current">График состояния</span>
            <span class="breadcrumb-separator" aria-hidden="true">/</span>
            <router-link 
              :to="{ name: 'dashboard-graph-admission-closure' }"
              class="breadcrumb-link"
            >
              График приёма и закрытий
            </router-link>
          </nav>
        </div>
        <h1 class="dashboard-title">График состояния сектора 1С</h1>
        <p class="dashboard-subtitle">
          Визуализация изменений состояния сектора во времени
        </p>
      </div>
      <div class="header-actions">
        <button 
          @click="exportToPDF" 
          class="btn-export-pdf"
          :disabled="isExporting || isLoading"
          title="Экспортировать график в PDF"
        >
          <span v-if="!isExporting">📄 Экспорт в PDF</span>
          <span v-else>⏳ Экспорт...</span>
        </button>
        <CreateSnapshotButton 
          :user="currentUser"
          @snapshot-created="handleSnapshotCreated"
        />
      </div>
    </div>

    <!-- Мобильное меню фильтров -->
    <button 
      v-if="isMobile"
      class="mobile-filters-toggle"
      @click="showMobileFilters = !showMobileFilters"
    >
      <span>Фильтры</span>
      <span class="toggle-icon" :class="{ 'open': showMobileFilters }">▼</span>
    </button>

    <!-- Панель фильтров -->
    <div 
      :class="{ 
        'mobile-open': showMobileFilters && isMobile,
        'mobile-closed': !showMobileFilters && isMobile
      }"
    >
      <FiltersPanel
        :stages="filters.stages"
        :employees="filters.employees"
        :dateRange="filters.dateRange"
        :customDateRange="filters.customDateRange"
        :hasActiveFilters="hasActiveFilters"
        @update:stages="handleStagesUpdate"
        @update:employees="handleEmployeesUpdate"
        @update:dateRange="handleDateRangeUpdate"
        @update:customDateRange="handleCustomDateRangeUpdate"
        @reset="resetFilters"
        @apply="applyFilters"
      />
    </div>

    <!-- Основной контент -->
    <div class="dashboard-content" v-if="!isLoading && !error">
      <div class="chart-container">
        <GraphStateChart 
          :period="selectedPeriod"
          :show-current-state="showCurrentState"
          @data-loaded="handleDataLoaded"
          @error="handleChartError"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import GraphStateChart from './GraphStateChart.vue';
import CreateSnapshotButton from './CreateSnapshotButton.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import FiltersPanel from '@/components/filters/FiltersPanel.vue';
import { useNotifications } from '@/composables/useNotifications.js';
import { useGraphState } from '@/composables/useGraphState.js';
import { AccessControlService } from '@/services/access-control-service.js';

const cssVar = (name, fallback) => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

/**
 * Композаблы
 */
const notifications = useNotifications();
const router = useRouter();
const fallbackRoute = { name: 'dashboard-sector-1c' };
const {
  filters,
  selectedPeriod,
  hasActiveFilters,
  applyFilters: applyFiltersFromComposable,
  resetFilters: resetFiltersFromComposable,
  loadFiltersFromLocalStorage
} = useGraphState();

/**
 * Состояние компонента
 */
const currentUser = ref(null);
const showCurrentState = ref(true);
const isLoading = ref(false);
const loadingMessage = ref('Загрузка данных...');
const error = ref(null);
const isExporting = ref(false);
const showMobileFilters = ref(false);
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);
const dateRangeError = ref(null);
const isNavigatingBack = ref(false);

/**
 * Вычисляемые свойства для адаптивности
 */
const isMobile = computed(() => windowWidth.value < 768);
const isTablet = computed(() => windowWidth.value >= 768 && windowWidth.value < 1024);
const isDesktop = computed(() => windowWidth.value >= 1024);
const hasHistory = computed(() => {
  if (typeof window === 'undefined') {
    return false;
  }
  // История >1 означает, что есть предыдущий экран для router.back()
  return window.history.length > 1;
});
const backAriaLabel = 'Назад';

/**
 * Минимальная и максимальная даты для календаря
 */
const minDate = computed(() => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1); // Год назад
  return date.toISOString().split('T')[0];
});

const maxDate = computed(() => {
  return new Date().toISOString().split('T')[0];
});

/**
 * Обработка обновления стадий
 */
function handleStagesUpdate(newStages) {
  filters.value.stages = newStages;
}

/**
 * Обработка обновления сотрудников
 */
function handleEmployeesUpdate(newEmployees) {
  filters.value.employees = newEmployees;
}

/**
 * Обработка обновления периода
 */
function handleDateRangeUpdate(newDateRange) {
  filters.value.dateRange = newDateRange;
}

/**
 * Обработка обновления произвольного периода
 */
function handleCustomDateRangeUpdate(newRange) {
  filters.value.customDateRange = newRange;
}

/**
 * Применить фильтры
 */
function applyFilters() {
  applyFiltersFromComposable();
}

/**
 * Сбросить фильтры
 */
function resetFilters() {
  resetFiltersFromComposable();
  dateRangeError.value = null;
  applyFilters();
  notifications.info('Фильтры сброшены');
}

/**
 * Валидация выбранного периода
 */
function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return { valid: false, error: 'Необходимо выбрать обе даты' };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return { valid: false, error: 'Начальная дата не может быть больше конечной' };
  }

  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  if (daysDiff > 365) {
    return { valid: false, error: 'Период не может превышать 365 дней' };
  }

  return { valid: true };
}

/**
 * Обработка создания слепка
 */
function handleSnapshotCreated(snapshot) {
  notifications.success('Слепок успешно создан');
  // График автоматически обновится через watch в GraphStateChart
}

/**
 * Обработка загрузки данных графика
 */
function handleDataLoaded(data) {
  isLoading.value = false;
  loadingMessage.value = '';
  console.log('Данные графика загружены:', data);
}

/**
 * Обработка ошибки графика
 */
function handleChartError(errorMessage) {
  isLoading.value = false;
  handleError({
    message: errorMessage || 'Ошибка загрузки графика',
    details: null,
    type: 'error'
  });
}

/**
 * Обработка ошибки
 */
function handleError(errorData) {
  error.value = {
    message: errorData.message || 'Произошла ошибка',
    details: errorData.details || null,
    type: errorData.type || 'error',
    timestamp: new Date()
  };
  
  // Логирование ошибки
  console.error('Dashboard error:', error.value);
  
  // Уведомление пользователя
  notifications.error(error.value.message);
}

/**
 * Закрыть сообщение об ошибке
 */
function handleErrorClose() {
  error.value = null;
}

/**
 * Повторить попытку при ошибке
 */
function handleErrorRetry() {
  error.value = null;
  isLoading.value = true;
  loadingMessage.value = 'Повторная загрузка данных...';
  // График автоматически перезагрузится через watch в GraphStateChart
}

/**
 * Экспорт графика в PDF
 * 
 * Примечание: Для работы этой функции необходимо установить библиотеки:
 * npm install jspdf html2canvas
 * 
 * После установки раскомментировать код ниже и добавить импорты:
 * import jsPDF from 'jspdf';
 * import html2canvas from 'html2canvas';
 */
async function exportToPDF() {
  // Проверка наличия библиотек
  if (typeof window === 'undefined' || !window.jsPDF || !window.html2canvas) {
    notifications.warning('Экспорт в PDF временно недоступен. Необходимо установить библиотеки jspdf и html2canvas.');
    console.warn('Для экспорта в PDF установите: npm install jspdf html2canvas');
    return;
  }

  isExporting.value = true;

  try {
    // Получение элемента графика
    const chartElement = document.querySelector('.chart-container');
    if (!chartElement) {
      throw new Error('График не найден');
    }

    // Конвертация в canvas (используем глобальные функции, если доступны)
    const html2canvas = window.html2canvas;
    const canvas = await html2canvas(chartElement, {
      scale: 2, // Увеличенное разрешение для качества
      useCORS: true,
      logging: false,
      backgroundColor: cssVar('--b24-bg-white', '#ffffff')
    });

    // Создание PDF (используем глобальный класс, если доступен)
    const jsPDF = window.jsPDF;
    const pdf = new jsPDF('landscape', 'mm', 'a4'); // Альбомная ориентация
    const imgWidth = 297; // Ширина A4 в мм
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Добавление заголовка
    pdf.setFontSize(18);
    pdf.text('График состояния сектора 1С', 148.5, 15, { align: 'center' });

    // Добавление метаданных
    const date = new Date().toLocaleDateString('ru-RU');
    pdf.setFontSize(10);
    const periodText = selectedPeriod.value.startDate && selectedPeriod.value.endDate
      ? `Период: ${selectedPeriod.value.startDate} - ${selectedPeriod.value.endDate}`
      : 'Период: не указан';
    pdf.text(periodText, 148.5, 25, { align: 'center' });
    pdf.text(`Экспорт от ${date}`, 148.5, 30, { align: 'center' });

    // Добавление изображения в PDF
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 35, imgWidth - 20, imgHeight - 20);

    // Добавление метаданных PDF
    pdf.setProperties({
      title: 'График состояния сектора 1С',
      subject: `Экспорт от ${date}`,
      author: 'Bitrix24 Dashboard'
    });

    // Сохранение PDF
    const fileName = `graph-state-${date.replace(/\//g, '-')}.pdf`;
    pdf.save(fileName);

    notifications.success('График успешно экспортирован в PDF');
  } catch (err) {
    console.error('Ошибка экспорта в PDF:', err);
    handleError({
      message: 'Ошибка экспорта в PDF: ' + (err.message || 'Неизвестная ошибка'),
      details: err.stack,
      type: 'error'
    });
  } finally {
    isExporting.value = false;
  }
}

/**
 * Навигация «Назад» с fallback на дашборд
 */
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

    console.warn('GraphStateDashboard: fallback navigation to dashboard-sector-1c');
    router.push(fallbackRoute);
  } finally {
    // Небольшая задержка не требуется — состояние сбрасываем сразу
    isNavigatingBack.value = false;
  }
}

/**
 * Обработка изменения размера окна
 */
function handleResize() {
  if (typeof window !== 'undefined') {
    windowWidth.value = window.innerWidth;
  }
}

/**
 * Загрузка текущего пользователя
 */
async function loadCurrentUser() {
  try {
    const accessResult = await AccessControlService.checkAccess();
    if (accessResult.allowed) {
      currentUser.value = accessResult.user;
    }
  } catch (err) {
    console.error('Error loading user:', err);
  }
}

/**
 * Инициализация при монтировании
 */
onMounted(() => {
  // Загрузка фильтров из localStorage
  loadFiltersFromLocalStorage();
  
  // Загрузка текущего пользователя
  loadCurrentUser();
  
  // Инициализация размера окна
  if (typeof window !== 'undefined') {
    windowWidth.value = window.innerWidth;
    window.addEventListener('resize', handleResize);
  }
});

/**
 * Очистка при размонтировании
 */
onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize);
  }
});
</script>

<style scoped>
.graph-state-dashboard {
  padding: var(--spacing-lg);
  max-width: 1400px;
  margin: 0 auto;
  background: var(--b24-bg);
}

.breadcrumbs-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.btn-back-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--b24-border-light);
  background: var(--b24-bg-white);
  color: var(--b24-primary);
  cursor: pointer;
  transition: all var(--transition-base);
  font-weight: 700;
  line-height: 1;
}

.btn-back-link:hover:not(:disabled) {
  background-color: var(--b24-bg-light, #f5f7fb);
  box-shadow: var(--shadow-sm);
}

.btn-back-link:focus {
  outline: 2px solid var(--b24-primary);
  outline-offset: 2px;
}

.btn-back-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-back-link[data-fallback="true"] {
  border-style: dashed;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-md);
  border-bottom: 2px solid var(--b24-border-light);
}

.header-content {
  flex: 1;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.breadcrumb-link {
  color: var(--b24-primary);
  text-decoration: none;
  transition: color var(--transition-base);
}

.breadcrumb-link:hover {
  color: var(--b24-primary-hover);
  text-decoration: underline;
}

.breadcrumb-separator {
  color: var(--b24-text-secondary);
}

.breadcrumb-current {
  color: var(--b24-text-primary);
  font-weight: 600;
}

.dashboard-title {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--b24-text-primary);
}

.dashboard-subtitle {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--b24-text-secondary);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

/* Стили фильтров перенесены в компонент FiltersPanel.vue */

.dashboard-content {
  background-color: var(--b24-bg-white);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
}

.chart-container {
  min-height: 400px;
  position: relative;
}

/* Кнопка экспорта в PDF */
.btn-export-pdf {
  padding: 10px 20px;
  background-color: var(--b24-success);
  color: var(--b24-text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.btn-export-pdf:hover:not(:disabled) {
  background-color: var(--b24-success-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn-export-pdf:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Сообщение об ошибке */
.error-message-container {
  margin-bottom: 20px;
}

.error-message {
  background-color: var(--b24-danger-light);
  border: 1px solid var(--b24-danger-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.error-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.error-icon {
  font-size: 20px;
}

.error-header h3 {
  margin: 0;
  flex: 1;
  font-size: 18px;
  color: var(--b24-danger);
}

.error-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--b24-danger);
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-text {
  margin: 10px 0;
  color: var(--b24-danger);
}

.error-details {
  margin-top: 10px;
}

.error-details summary {
  cursor: pointer;
  color: var(--b24-danger);
  font-size: var(--font-size-sm);
}

.error-details pre {
  margin-top: var(--spacing-xs);
  padding: var(--spacing-xs);
  background-color: var(--b24-danger-lighter);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  overflow-x: auto;
}

.error-actions {
  margin-top: 15px;
}

.btn-retry {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--b24-primary);
  color: var(--b24-text-inverse);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: background-color var(--transition-base);
}

.btn-retry:hover {
  background-color: var(--b24-primary-hover);
}

/* Стили календаря перенесены в компонент FiltersPanel.vue */

/* Мобильное меню фильтров */
.mobile-filters-toggle {
  width: 100%;
  padding: 12px;
  background-color: var(--b24-primary);
  color: var(--b24-text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  transition: background-color var(--transition-base);
}

.mobile-filters-toggle:hover {
  background-color: var(--b24-primary-hover);
}

.toggle-icon {
  transition: transform 0.3s ease;
}

.toggle-icon.open {
  transform: rotate(180deg);
}

/* Анимации */
.filters-panel {
  transition: all 0.3s ease;
}

.chart-container {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Фокус для доступности */
button:focus,
input:focus,
select:focus {
  outline: 2px solid var(--b24-primary);
  outline-offset: 2px;
}

/* Адаптивность */
@media (max-width: 767px) {
  .graph-state-dashboard {
    padding: 10px;
  }

  .dashboard-header {
    flex-direction: column;
    gap: 15px;
    padding: 15px;
  }

  .dashboard-title {
    font-size: 22px;
  }

  .header-actions {
    width: 100%;
    flex-direction: column;
    gap: 10px;
  }

  .btn-export-pdf {
    width: 100%;
    justify-content: center;
  }

  /* Мобильные стили для панели фильтров */
  .mobile-open {
    max-height: 2000px;
    overflow: visible;
  }

  .mobile-closed {
    max-height: 0;
    overflow: hidden;
  }

  .chart-container {
    min-height: 300px;
  }
}

/* Планшеты */
@media (min-width: 768px) and (max-width: 1023px) {
  .filters-content {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-container {
    min-height: 350px;
  }
}

/* Десктопы */
@media (min-width: 1024px) {
  .filters-content {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>

