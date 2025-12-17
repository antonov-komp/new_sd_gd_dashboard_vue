<template>
  <div class="tickets-time-tracking-dashboard">
    <!-- Breadcrumbs -->
    <div class="dashboard-header">
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

    <!-- Состояние загрузки -->
    <div v-if="loading" class="loading-state">
      <p>Загрузка данных о трудозатратах...</p>
    </div>

    <!-- Состояние ошибки -->
    <div v-else-if="error" class="error-state">
      <p>Ошибка загрузки данных: {{ error }}</p>
      <button @click="loadData" class="retry-button">Повторить попытку</button>
    </div>

    <!-- Состояние пустых данных -->
    <div v-else-if="!hasData" class="empty-state">
      <p>Нет данных о трудозатратах за выбранный период</p>
    </div>

    <!-- Основной контент -->
    <div v-else class="dashboard-content">
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
const loading = ref(false);
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
  loading.value = true;
  error.value = null;
  
  try {
    const result = await timeTrackingService.getTimeTrackingData({
      product: '1C',
      weeksCount: 4
    });
    
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

.loading-state,
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
</style>

