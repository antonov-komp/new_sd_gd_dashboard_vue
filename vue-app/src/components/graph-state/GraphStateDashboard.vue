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
        <nav class="breadcrumbs" aria-label="Навигация">
          <router-link 
            :to="{ name: 'dashboard-sector-1c' }"
            class="breadcrumb-link"
          >
            Дашборд сектора 1С
          </router-link>
          <span class="breadcrumb-separator" aria-hidden="true">/</span>
          <span class="breadcrumb-current">График состояния</span>
        </nav>
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
      class="filters-panel"
      :class="{ 
        'mobile-open': showMobileFilters && isMobile,
        'mobile-closed': !showMobileFilters && isMobile
      }"
    >
      <div class="filters-header">
        <h2>Фильтры</h2>
        <button 
          @click="resetFilters" 
          class="btn-reset-filters"
          :disabled="!hasActiveFilters"
        >
          Сбросить фильтры
        </button>
      </div>

      <div class="filters-content">
        <!-- Фильтр по этапам -->
        <div class="filter-group">
          <label class="filter-label">Этапы:</label>
          <div class="checkbox-group">
            <label class="checkbox-item">
              <input 
                type="checkbox" 
                v-model="filters.stages.formed"
                @change="applyFilters"
              />
              <span>Сформировано обращение</span>
            </label>
            <label class="checkbox-item">
              <input 
                type="checkbox" 
                v-model="filters.stages.review"
                @change="applyFilters"
              />
              <span>Рассмотрение ТЗ</span>
            </label>
            <label class="checkbox-item">
              <input 
                type="checkbox" 
                v-model="filters.stages.execution"
                @change="applyFilters"
              />
              <span>Исполнение</span>
            </label>
          </div>
        </div>

        <!-- Фильтр по сотрудникам -->
        <div class="filter-group">
          <label class="filter-label">Сотрудники:</label>
          <select 
            v-model="filters.employees" 
            multiple
            @change="applyFilters"
            class="employees-select"
            size="5"
          >
            <option value="all">Все сотрудники</option>
            <option 
              v-for="employee in availableEmployees" 
              :key="employee.id"
              :value="employee.id"
            >
              {{ employee.name }}
            </option>
          </select>
          <small class="filter-hint">
            Для выбора нескольких сотрудников удерживайте Ctrl (Cmd на Mac)
          </small>
        </div>

        <!-- Фильтр по датам -->
        <div class="filter-group">
          <label class="filter-label">Период:</label>
          <select 
            v-model="filters.dateRange" 
            @change="handleDateRangeChange"
            class="date-range-select"
          >
            <option value="last-week">Последняя неделя</option>
            <option value="last-2-weeks">Последние 2 недели</option>
            <option value="last-month">Последний месяц</option>
            <option value="custom">Произвольный период</option>
          </select>
        </div>

        <!-- Календарь для произвольного периода -->
        <div v-if="filters.dateRange === 'custom'" class="filter-group custom-date-range">
          <label class="filter-label">Произвольный период:</label>
          <div class="date-range-inputs">
            <div class="date-input-group">
              <label>С:</label>
              <input 
                type="date" 
                v-model="filters.customDateRange.startDate"
                @change="handleCustomDateChange"
                :max="filters.customDateRange.endDate || maxDate"
                class="date-input"
              />
            </div>
            <div class="date-input-group">
              <label>По:</label>
              <input 
                type="date" 
                v-model="filters.customDateRange.endDate"
                @change="handleCustomDateChange"
                :min="filters.customDateRange.startDate || minDate"
                :max="maxDate"
                class="date-input"
              />
            </div>
          </div>
          <small v-if="dateRangeError" class="filter-error">{{ dateRangeError }}</small>
          <small v-else class="filter-hint">
            Выберите начальную и конечную дату для отображения данных
          </small>
        </div>
      </div>
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
import GraphStateChart from './GraphStateChart.vue';
import CreateSnapshotButton from './CreateSnapshotButton.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { useNotifications } from '@/composables/useNotifications.js';
import { useGraphState } from '@/composables/useGraphState.js';
import { AccessControlService } from '@/services/access-control-service.js';

/**
 * Композаблы
 */
const notifications = useNotifications();
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
const availableEmployees = ref([]); // Пока пустой массив, можно загрузить из API
const isLoading = ref(false);
const loadingMessage = ref('Загрузка данных...');
const error = ref(null);
const isExporting = ref(false);
const showMobileFilters = ref(false);
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);
const dateRangeError = ref(null);

/**
 * Вычисляемые свойства для адаптивности
 */
const isMobile = computed(() => windowWidth.value < 768);
const isTablet = computed(() => windowWidth.value >= 768 && windowWidth.value < 1024);
const isDesktop = computed(() => windowWidth.value >= 1024);

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
 * Обработка изменения типа периода
 */
function handleDateRangeChange() {
  if (filters.value.dateRange !== 'custom') {
    dateRangeError.value = null;
    applyFilters();
  }
}

/**
 * Обработка изменения произвольного периода
 */
function handleCustomDateChange() {
  const validation = validateDateRange(
    filters.value.customDateRange.startDate,
    filters.value.customDateRange.endDate
  );
  
  if (!validation.valid) {
    dateRangeError.value = validation.error;
    return;
  }
  
  dateRangeError.value = null;
  applyFilters();
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
      backgroundColor: '#ffffff'
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
  
  // Загрузка списка сотрудников (можно реализовать позже)
  // loadAvailableEmployees();
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
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.header-content {
  flex: 1;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 14px;
}

.breadcrumb-link {
  color: #3b82f6;
  text-decoration: none;
  transition: color 0.2s;
}

.breadcrumb-link:hover {
  color: #2563eb;
  text-decoration: underline;
}

.breadcrumb-separator {
  color: #6b7280;
}

.breadcrumb-current {
  color: #1f2937;
  font-weight: 600;
}

.dashboard-title {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
}

.dashboard-subtitle {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.filters-panel {
  background-color: #f9fafb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filters-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.btn-reset-filters {
  padding: 8px 16px;
  background-color: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-reset-filters:hover:not(:disabled) {
  background-color: #dc2626;
}

.btn-reset-filters:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.filters-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-item input[type="checkbox"] {
  cursor: pointer;
}

.employees-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
}

.filter-hint {
  color: #6b7280;
  font-size: 12px;
  margin-top: 4px;
}

.date-range-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
}

.dashboard-content {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.chart-container {
  min-height: 400px;
  position: relative;
}

/* Кнопка экспорта в PDF */
.btn-export-pdf {
  padding: 10px 20px;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-export-pdf:hover:not(:disabled) {
  background-color: #059669;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
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
  background-color: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 16px;
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
  color: #991b1b;
}

.error-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #991b1b;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-text {
  margin: 10px 0;
  color: #7f1d1d;
}

.error-details {
  margin-top: 10px;
}

.error-details summary {
  cursor: pointer;
  color: #7f1d1d;
  font-size: 14px;
}

.error-details pre {
  margin-top: 8px;
  padding: 8px;
  background-color: #fef2f2;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
}

.error-actions {
  margin-top: 15px;
}

.btn-retry {
  padding: 8px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-retry:hover {
  background-color: #2563eb;
}

/* Календарь для произвольного периода */
.custom-date-range {
  grid-column: 1 / -1;
}

.date-range-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.date-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date-input-group label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.date-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
}

.filter-error {
  color: #dc2626;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}

/* Мобильное меню фильтров */
.mobile-filters-toggle {
  width: 100%;
  padding: 12px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  transition: background-color 0.2s;
}

.mobile-filters-toggle:hover {
  background-color: #2563eb;
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
  outline: 2px solid #3b82f6;
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

  .filters-panel {
    max-height: 0;
    overflow: hidden;
    padding: 0 20px;
    margin-bottom: 0;
  }

  .filters-panel.mobile-open {
    max-height: 2000px;
    padding: 20px;
    margin-bottom: 20px;
  }

  .filters-content {
    grid-template-columns: 1fr;
  }

  .date-range-inputs {
    grid-template-columns: 1fr;
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

