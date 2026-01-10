<template>
  <div class="tickets-time-tracking-dashboard">
    <!-- Breadcrumbs -->
    <div class="dashboard-header">
      <div class="breadcrumbs-row">
        <!-- Кнопка Главная -->
        <button
          class="btn-home-link"
          type="button"
          @click="handleGoHome"
          title="Перейти на главную страницу"
          aria-label="Перейти на главную страницу"
        >
          Главная
        </button>
        <span class="breadcrumb-separator">/</span>
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
          <router-link 
            :to="{ name: 'dashboard-graph-admission-closure' }"
            class="breadcrumb-link"
          >
            График приёма и закрытий
          </router-link>
          <span class="breadcrumb-separator" aria-hidden="true">/</span>
          <span class="breadcrumb-current">Трудозатраты</span>
        </nav>
      </div>
    </div>

    <!-- Заголовок -->
    <h1 class="dashboard-title">Трудозатраты на Тикеты сектора 1С</h1>

    <!-- Фильтры -->
    <div class="filters" v-if="false">
      <!-- Фильтры будут добавлены в следующих этапах -->
    </div>

    <!-- Приятный прелоадер для загрузки данных -->
    <Transition name="fade" mode="out-in">
      <div v-if="loading" key="preloader" class="time-tracking-preloader">
        <div class="preloader-content">
          <div class="preloader-spinner">
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
          </div>
          <h3 class="preloader-title">Загрузка данных</h3>
          <p class="preloader-message">Получение данных о трудозатратах...</p>
          <div class="preloader-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
      
      <!-- Состояние ошибки -->
      <div v-else-if="error" key="error" class="error-state">
        <p>Ошибка загрузки данных: {{ error }}</p>
        <button @click="loadData" class="retry-button">Повторить попытку</button>
      </div>

      <!-- Состояние пустых данных -->
      <div v-else-if="!hasData" key="empty" class="empty-state">
        <p>Нет данных о трудозатратах за выбранный период</p>
      </div>

      <!-- Основной контент -->
      <div v-else key="content" class="dashboard-content">
      <!-- Summary-карточки -->
      <TicketsTimeTrackingSummary 
        v-if="data"
        :data="data"
      />

      <!-- Таблица -->
      <TicketsTimeTrackingTable 
        v-if="data"
        :data="data"
        :loading="loading"
        :error="error"
        @cell-click="handleCellClick"
        @employee-click="handleEmployeeClick"
        @week-click="handleWeekClick"
      />

      <!-- Графики (опционально) -->
      <!-- TicketsTimeTrackingChart будет добавлен в этапе TASK-050-06 -->
      </div>
    </Transition>

    <!-- Попап детализации -->
    <TimeTrackingDetailModal
      v-if="selectedCell"
      :cell-data="selectedCell"
      @close="closeDetailModal"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { timeTrackingService } from '@/services/tickets-time-tracking/timeTrackingService.js';
import { hasData as hasDataUtil } from '@/services/tickets-time-tracking/timeTrackingUtils.js';
import TicketsTimeTrackingSummary from './TicketsTimeTrackingSummary.vue';
import TicketsTimeTrackingTable from './TicketsTimeTrackingTable.vue';
import TimeTrackingDetailModal from './TimeTrackingDetailModal.vue';

const router = useRouter();

// Состояния
const loading = ref(true); // Начинаем с true для показа прелоадера при первой загрузке
const error = ref(null);
const data = ref(null);
const selectedCell = ref(null);
const isNavigatingBack = ref(false);

// Computed
const hasData = computed(() => {
  return hasDataUtil(data.value);
});

// Методы
const loadData = async () => {
  // Устанавливаем loading в true сразу для показа прелоадера
  loading.value = true;
  error.value = null;
  
  // Небольшая задержка для гарантии отображения прелоадера (минимум 300ms)
  const minLoadingTime = new Promise(resolve => setTimeout(resolve, 300));
  
  try {
    // Ждём минимум 300ms и загрузку данных параллельно
    const [_, result] = await Promise.all([
      minLoadingTime,
      timeTrackingService.getTimeTrackingData({
        product: '1C',
        weeksCount: 4
      })
    ]);
    
    data.value = result;
  } catch (err) {
    console.error('[TicketsTimeTrackingDashboard] Error loading data:', err);
    error.value = err.message || 'Не удалось загрузить данные';
  } finally {
    loading.value = false;
  }
};

const handleCellClick = (cellData) => {
  selectedCell.value = cellData;
};

const handleEmployeeClick = (employeeData) => {
  // Открыть попап с детализацией сотрудника
  selectedCell.value = {
    type: 'employee',
    ...employeeData
  };
};

const handleWeekClick = (weekData) => {
  // Открыть попап с детализацией недели
  selectedCell.value = {
    type: 'week',
    ...weekData
  };
};

const closeDetailModal = () => {
  selectedCell.value = null;
};

// Навигация "Назад"
const hasHistory = computed(() => {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.history.length > 1;
});

const backAriaLabel = computed(() => {
  return hasHistory.value ? 'Вернуться назад' : 'Вернуться на главную';
});

const handleBack = () => {
  if (isNavigatingBack.value) {
    return;
  }

  isNavigatingBack.value = true;

  if (hasHistory.value) {
    router.go(-1);
  } else {
    router.push({ name: 'dashboard-sector-1c' });
  }

  setTimeout(() => {
    isNavigatingBack.value = false;
  }, 300);
};

/**
 * Переход на главную страницу
 */
const handleGoHome = () => {
  router.push('/');
};

// Lifecycle
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.tickets-time-tracking-dashboard {
  padding: 20px;
}

.dashboard-header {
  margin-bottom: 20px;
}

.breadcrumbs-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-home-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  background: #ffffff;
  color: #007bff;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
}

.btn-home-link:hover {
  background-color: #f8f9fa;
  border-color: #007bff;
}

.btn-home-link:focus {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}

.btn-back-link {
  background: none;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 16px;
  color: #333;
  transition: all 0.2s;
}

.btn-back-link:hover:not(:disabled) {
  background-color: #f8f9fa;
  border-color: #adb5bd;
}

.btn-back-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  font-size: 14px;
  flex-wrap: wrap;
}

.breadcrumb-link {
  color: #007bff;
  text-decoration: none;
  transition: color 0.2s;
}

.breadcrumb-link:hover {
  color: #0056b3;
  text-decoration: underline;
}

.breadcrumb-separator {
  margin: 0 8px;
  color: #666;
}

.breadcrumb-current {
  color: #666;
  font-weight: 500;
}

.dashboard-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
}

/* Приятный прелоадер для загрузки данных о трудозатратах */
.time-tracking-preloader {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 70vh;
  padding: 60px 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: var(--radius-lg, 12px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 1;
  margin-top: 20px;
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

.error-state,
.empty-state {
  padding: 40px;
  text-align: center;
  color: #666;
}

.error-state {
  color: #dc3545;
}

.retry-button {
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.retry-button:hover {
  background-color: #0056b3;
}

.dashboard-content {
  margin-top: 20px;
}

/* Адаптивность для мобильных */
@media (max-width: 768px) {
  .time-tracking-preloader {
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

