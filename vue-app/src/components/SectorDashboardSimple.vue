<template>
  <div :class="`dashboard-sector-${sectorId}`">
    <!-- Заголовок -->
    <div class="dashboard-header">
      <h1>Дашборд - Сектор {{ sectorName }}</h1>
    </div>

    <!-- Статистика сектора -->
    <div class="sector-stats">
      <div class="stat-item">
        <div class="stat-value">{{ totalTickets }}</div>
        <div class="stat-label">Всего тикетов</div>
      </div>
    </div>

    <!-- Основной контент -->
    <div class="dashboard-content">
      <div class="loading-indicator" v-if="isLoading">
        <div class="loading-spinner"></div>
        <p>Загрузка данных сектора...</p>
      </div>

      <div class="error-indicator" v-else-if="error">
        <div class="error-icon">⚠️</div>
        <p>Ошибка загрузки: {{ error }}</p>
        <button @click="handleRetry" class="btn-retry">Повторить</button>
      </div>

      <div class="empty-state" v-else-if="!hasData">
        <div class="empty-state-content">
          <div class="empty-icon">📋</div>
          <h3>Сектор "{{ sectorName }}" в разработке</h3>
          <p>Этот сектор находится в стадии разработки.</p>
          <button @click="handleRetry" class="btn-retry">Обновить данные</button>
        </div>
      </div>

      <div class="stages-container" v-else>
        <div
          v-for="stage in stages"
          :key="stage.id"
          class="stage-card"
          :style="{ borderLeftColor: stage.color }"
        >
          <div class="stage-header">
            <h3>{{ stage.name }}</h3>
            <div class="stage-stats">
              <span class="stat">{{ stage.tickets?.length || 0 }} тикетов</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Плавающая кнопка "НАЗАД" -->
    <BackButton variant="floating" />
  </div>
</template>

<script>
import { onMounted, computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';

import BackButton from './dashboard/BackButton.vue';
import { useUniversalDashboardState } from '@/composables/useUniversalDashboardState.js';
import { useUniversalDashboardActions } from '@/composables/useUniversalDashboardActions.js';

export default {
  name: 'SectorDashboardSimple',
  components: {
    BackButton
  },

  props: {
    sectorId: {
      type: String,
      required: true
    }
  },

  setup(props) {
    const router = useRouter();
    const route = useRoute();

    // Состояние
    const { state, actions } = useUniversalDashboardState(props.sectorId);

    // Вычисляемые свойства
    const sectorName = computed(() => {
      return state.sectorStats?.name || props.sectorId.toUpperCase();
    });

    const totalTickets = computed(() => state.totalTickets || 0);
    const isLoading = computed(() => state.isLoading || false);
    const error = computed(() => state.error || null);
    const hasData = computed(() => state.hasData || false);
    const stages = computed(() => state.stages || []);

    // Методы
    const handleGoHome = () => {
      router.push('/');
    };

    const handleRetry = () => {
      actions.loadSectorData();
    };

    // Инициализация
    onMounted(() => {
      console.log(`[SectorDashboardSimple] Mounted for sector: ${props.sectorId}`);
      actions.loadSectorData();
    });

    return {
      // Состояние
      isLoading,
      error,
      hasData,
      totalTickets,
      stages,

      // Вычисляемые
      sectorName,

      // Методы
      handleGoHome,
      handleRetry,

      // Действия
      ...actions
    };
  }
};
</script>

<style scoped>
.dashboard-sector-pdm,
.dashboard-sector-bitrix24,
.dashboard-sector-infrastructure {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 30px;
}

.dashboard-header h1 {
  color: #333;
  font-size: 28px;
  margin: 0;
}

.sector-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

.stat-item {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  min-width: 120px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
}

.dashboard-content {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.loading-indicator,
.error-indicator,
.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.loading-spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon,
.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.btn-retry {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 20px;
}

.btn-retry:hover {
  background: #0056b3;
}

.stages-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stage-card {
  background: #f8f9fa;
  border-left: 4px solid #007bff;
  border-radius: 8px;
  padding: 20px;
}

.stage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stage-header h3 {
  margin: 0;
  color: #333;
}

.stage-stats {
  font-size: 14px;
  color: #666;
}
</style>