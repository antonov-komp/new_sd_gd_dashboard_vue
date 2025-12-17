<template>
  <div class="tickets-time-tracking-dashboard">
    <!-- Breadcrumbs -->
    <div class="breadcrumbs" v-if="breadcrumbs">
      <router-link 
        v-for="(crumb, index) in breadcrumbs" 
        :key="index"
        :to="crumb.to"
        class="breadcrumb-link"
      >
        {{ crumb.label }}
      </router-link>
      <span class="breadcrumb-current">Трудозатраты на Тикеты сектора 1С</span>
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
        @cell-click="handleCellClick"
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
import { timeTrackingService } from '@/services/tickets-time-tracking/timeTrackingService.js';
import { hasData as hasDataUtil } from '@/services/tickets-time-tracking/timeTrackingUtils.js';
import TicketsTimeTrackingSummary from './TicketsTimeTrackingSummary.vue';
import TicketsTimeTrackingTable from './TicketsTimeTrackingTable.vue';
import TimeTrackingDetailModal from './TimeTrackingDetailModal.vue';

// Состояния
const loading = ref(false);
const error = ref(null);
const data = ref(null);
const selectedCell = ref(null);

// Breadcrumbs
const breadcrumbs = ref([
  { to: '/', label: 'Дашборд сектора 1С' },
  { to: '/graph-state', label: 'График состояния' },
  { to: '/graph-admission-closure', label: 'График приёма и закрытий' }
]);

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

const closeDetailModal = () => {
  selectedCell.value = null;
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

.breadcrumbs {
  margin-bottom: 20px;
  font-size: 14px;
}

.breadcrumb-link {
  color: #007bff;
  text-decoration: none;
  margin-right: 5px;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-link::after {
  content: ' / ';
  color: #666;
  margin-left: 5px;
}

.breadcrumb-current {
  color: #666;
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

