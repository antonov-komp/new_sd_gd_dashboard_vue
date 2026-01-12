<template>
  <div :class="`dashboard-sector-${sectorId}`" :class="{ 'is-dragging': draggedTicket }">
    <!-- Заголовок -->
    <div class="dashboard-header">
      <!-- Хлебные крошки -->
      <div class="breadcrumbs-row">
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
        <span class="breadcrumb-current">Дашборд сектора {{ sectorName }}</span>
      </div>

      <BackButton variant="header" />
      <h1>Дашборд - Сектор {{ sectorName }}</h1>

      <!-- Действия -->
      <div class="header-actions">
        <button
          v-if="isDiagnosticsEnabled && isUserAdmin"
          @click="clearCache"
          class="btn-clear-cache"
          title="Сбросить кеш сектора и тикетов"
        >
          <span class="icon">♻️</span>
          <span>Сбросить кеш</span>
        </button>

        <button
          v-if="!isDiagnosticsEnabled && isUserAdmin"
          @click="enableDiagnostics"
          class="btn-enable-diagnostics"
          title="Включить диагностический режим"
        >
          <span class="icon">🔍</span>
          <span>Диагностика</span>
        </button>

        <button
          @click="navigateToGraphState"
          class="btn-navigate-graph-state"
          title="Перейти к графику состояния сектора"
        >
          <span class="icon">📊</span>
          <span>График состояния</span>
        </button>

        <button
          @click="navigateToAdmissionClosure"
          class="btn-navigate-admission-closure"
          title="Перейти к графику приемки-закрытия"
        >
          <span class="icon">📈</span>
          <span>Приемка-закрытие</span>
        </button>

        <button
          @click="navigateToTicketsManagement"
          class="btn-navigate-tickets"
          title="Перейти к управлению тикетами"
        >
          <span class="icon">📋</span>
          <span>Управление тикетами</span>
        </button>
      </div>
    </div>

    <!-- Статистика сектора -->
    <div class="sector-stats">
      <div class="stat-item">
        <div class="stat-value">{{ totalTickets }}</div>
        <div class="stat-label">Всего тикетов</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ employees.length }}</div>
        <div class="stat-label">Сотрудников</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ completionRate }}%</div>
        <div class="stat-label">Завершено</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ stages.length }}</div>
        <div class="stat-label">Этапов</div>
      </div>
    </div>

    <!-- Прелоадер -->
    <Transition name="fade" mode="out-in">
      <LoadingPreloader
        v-if="isLoading"
        :current-step="currentStep"
        :progress="getProgressValue()"
        :step-details="stepDetails"
        :error="error"
        @retry="handleRetry"
      />
    </Transition>

    <!-- Сообщение об ошибке -->
    <div v-if="error && !isLoading" class="error-message-container">
      <div class="error-message">
        <div class="error-header">
          <span class="error-icon">❌</span>
          <h3>Ошибка загрузки данных сектора</h3>
          <button @click="handleErrorClose" class="error-close" aria-label="Закрыть">✕</button>
        </div>
        <p class="error-text">{{ error }}</p>
        <div class="error-actions">
          <button @click="handleRetry" class="btn-retry">Повторить загрузку</button>
        </div>
      </div>
    </div>

    <!-- Основной контент дашборда -->
    <Transition name="dashboard-fade">
      <div v-if="!isLoading && !error && hasData" class="dashboard-content">
        <!-- Этапы обработки -->
        <div class="stages-container">
          <DashboardStage
            v-for="stage in stages"
            :key="stage.id"
            :stage="stage"
            :zero-point-tickets="getZeroPointTickets(stage.id)"
            :employees="employees"
            :sector-id="sectorId"
            @ticket-moved="handleTicketMoved"
            @ticket-assigned="handleTicketAssigned"
            @ticket-created="handleTicketCreated"
          />
        </div>

        <!-- Пустое состояние -->
        <div v-if="!hasData && !isLoading" class="empty-state">
          <div class="empty-state-content">
            <div class="empty-icon">📋</div>
            <h3>Нет данных сектора</h3>
            <p>В секторе "{{ sectorName }}" пока нет активных тикетов</p>
            <button @click="handleRetry" class="btn-retry">Обновить данные</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Плавающая кнопка "НАЗАД" -->
    <BackButton variant="floating" />

    <!-- Панель диагностики -->
    <LoggerControl v-if="showLoggerControl" />
    <DiagnosticsPanel v-if="isDiagnosticsEnabled && isUserAdmin" />
  </div>
</template>

<script>
import { onMounted, computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';

// Импорты компонентов
import DashboardStage from './dashboard/DashboardStage.vue';
import LoadingPreloader from './dashboard/LoadingPreloader.vue';
import LoggerControl from './dashboard/LoggerControl.vue';
import BackButton from './dashboard/BackButton.vue';
import DiagnosticsPanel from './dashboard/DiagnosticsPanel.vue';

// Импорты композаблов
import { useUniversalDashboardState } from '@/composables/useUniversalDashboardState.js';
import { useUniversalDashboardActions } from '@/composables/useUniversalDashboardActions.js';

// Импорты утилит
import { isDiagnosticsEnabled, getDiagnosticsService } from '@/services/dashboard-sector-1c/utils/diagnostics-service.js';
import { isAdmin } from '@/config/access-config.js';

/**
 * Универсальный компонент дашборда сектора
 *
 * Работает с любым сектором: 1С, PDM, Битрикс24, Инфраструктура
 * Заменяет специализированные компоненты типа DashboardSector1C.vue
 *
 * @component
 */
export default {
  name: 'SectorDashboard',
  components: {
    DashboardStage,
    LoadingPreloader,
    LoggerControl,
    BackButton,
    DiagnosticsPanel
  },

  props: {
    sectorId: {
      type: String,
      required: true,
      validator: (value) => ['1c', 'pdm', 'bitrix24', 'infrastructure'].includes(value)
    }
  },

  setup(props) {
    const router = useRouter();
    const route = useRoute();

    // Универсальные композаблы
    const state = useUniversalDashboardState(props.sectorId);
    const actions = useUniversalDashboardActions(state, props.sectorId);

    // Информация о текущем пользователе
    const currentUser = ref(null);
    const draggedTicket = ref(null);

    // Вычисляемые свойства
    const sectorName = computed(() => {
      const names = {
        '1c': '1С',
        'pdm': 'PDM',
        'bitrix24': 'Битрикс24',
        'infrastructure': 'Инфраструктура'
      };
      return names[props.sectorId] || props.sectorId;
    });

    const isUserAdmin = computed(() => {
      if (!currentUser.value) return false;
      return isAdmin(currentUser.value);
    });

    const isDiagnosticsEnabledFlag = computed(() => {
      const enabled = isDiagnosticsEnabled(route, currentUser.value);
      if (import.meta.env?.MODE !== 'production') {
        console.log('[SectorDashboard] Diagnostics enabled:', enabled, 'Route query:', route.query);
      }
      return enabled;
    });

    const showLoggerControl = computed(() => {
      return isDiagnosticsEnabledFlag.value;
    });

    // Прогресс загрузки
    const getProgressValue = () => {
      // Имитация прогресса на основе текущего шага
      const progressMap = {
        'Загрузка данных сектора...': 25,
        'Обработка тикетов...': 50,
        'Обработка сотрудников...': 75,
        'Финализация...': 90
      };
      return progressMap[state.currentStep] || 0;
    };

    // Методы
    const handleGoHome = () => {
      router.push('/');
    };

    const handleRetry = () => {
      actions.loadSectorData({ forceRefresh: true });
    };

    const handleErrorClose = () => {
      state.clearError();
    };

    const enableDiagnostics = () => {
      router.push({
        name: route.name,
        query: {
          ...route.query,
          diagnostics: 'true'
        }
      });
    };

    const clearCache = () => {
      actions.clearCache();
    };

    const handleTicketMoved = async (data) => {
      try {
        await actions.moveTicket(data.ticket, data.targetStageId, data.employeeId);
      } catch (error) {
        console.error('Failed to move ticket:', error);
      }
    };

    const handleTicketAssigned = async (data) => {
      try {
        await actions.assignTicketToEmployee(data.ticketId, data.employeeId);
      } catch (error) {
        console.error('Failed to assign ticket:', error);
      }
    };

    const handleTicketCreated = async (data) => {
      try {
        await actions.createTicket(data.ticketData);
      } catch (error) {
        console.error('Failed to create ticket:', error);
      }
    };

    // Навигация
    const navigateToGraphState = () => {
      actions.navigateToGraphState();
    };

    const navigateToAdmissionClosure = () => {
      actions.navigateToAdmissionClosure();
    };

    const navigateToTicketsManagement = () => {
      actions.navigateToTicketsManagement();
    };

    // Инициализация
    onMounted(async () => {
      console.log(`[SectorDashboard] Mounted for sector: ${props.sectorId}`);

      // Загружаем данные сектора
      try {
        await actions.loadSectorData();
      } catch (error) {
        console.error(`[SectorDashboard] Failed to load initial data for sector ${props.sectorId}:`, error);
      }
    });

    return {
      // Состояние
      ...state,

      // Действия
      ...actions,

      // Локальные свойства
      sectorName,
      currentUser,
      draggedTicket,

      // Вычисляемые
      isUserAdmin,
      isDiagnosticsEnabled: isDiagnosticsEnabledFlag,
      showLoggerControl,

      // Методы
      handleGoHome,
      handleRetry,
      handleErrorClose,
      enableDiagnostics,
      clearCache,
      handleTicketMoved,
      handleTicketAssigned,
      handleTicketCreated,
      navigateToGraphState,
      navigateToAdmissionClosure,
      navigateToTicketsManagement,
      getProgressValue,
      getZeroPointTickets: state.getZeroPointTickets
    };
  }
};
</script>

<style scoped>
/* Основные стили дашборда */
.dashboard-sector-1c,
.dashboard-sector-pdm,
.dashboard-sector-bitrix24,
.dashboard-sector-infrastructure {
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
}

.dashboard-sector-1c.is-dragging,
.dashboard-sector-pdm.is-dragging,
.dashboard-sector-bitrix24.is-dragging,
.dashboard-sector-infrastructure.is-dragging {
  user-select: none;
}

/* Заголовок дашборда */
.dashboard-header {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.breadcrumbs-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 14px;
}

.btn-home-link {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  text-decoration: underline;
  font-size: inherit;
}

.btn-home-link:hover {
  color: #0056b3;
}

.breadcrumb-separator {
  color: #6c757d;
}

.breadcrumb-current {
  color: #495057;
  font-weight: 500;
}

.dashboard-header h1 {
  margin: 10px 0;
  color: #2c3e50;
  font-size: 24px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  flex-wrap: wrap;
}

.header-actions button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.header-actions button:hover {
  border-color: #007bff;
  color: #007bff;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.btn-clear-cache {
  border-color: #ffc107;
  color: #856404;
}

.btn-clear-cache:hover {
  background: #fff3cd;
  border-color: #ffc107;
}

.btn-enable-diagnostics {
  border-color: #17a2b8;
  color: #0c5460;
}

.btn-enable-diagnostics:hover {
  background: #d1ecf1;
  border-color: #17a2b8;
}

/* Статистика сектора */
.sector-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.stat-item {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #007bff;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 12px;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Контейнер этапов */
.stages-container {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding-bottom: 10px;
}

.stages-container::-webkit-scrollbar {
  height: 6px;
}

.stages-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.stages-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.stages-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Сообщения об ошибках */
.error-message-container {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.error-message {
  text-align: center;
}

.error-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
}

.error-header h3 {
  margin: 0;
  color: #dc3545;
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-icon {
  font-size: 20px;
}

.error-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #6c757d;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.error-close:hover {
  background: #f8f9fa;
  color: #495057;
}

.error-text {
  color: #dc3545;
  margin-bottom: 15px;
}

.error-actions {
  display: flex;
  justify-content: center;
}

.btn-retry {
  padding: 10px 20px;
  border: 1px solid #007bff;
  border-radius: 6px;
  background: #007bff;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn-retry:hover {
  background: #0056b3;
  border-color: #0056b3;
}

/* Пустое состояние */
.empty-state {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.empty-state-content {
  max-width: 400px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 10px 0;
  color: #6c757d;
}

.empty-state p {
  margin: 0 0 20px 0;
  color: #6c757d;
}

/* Анимации переходов */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.dashboard-fade-enter-active,
.dashboard-fade-leave-active {
  transition: all 0.4s ease;
}

.dashboard-fade-enter-from,
.dashboard-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Адаптивность */
@media (max-width: 1024px) {
  .stages-container {
    gap: 15px;
  }

  .header-actions {
    gap: 8px;
  }

  .header-actions button {
    padding: 6px 10px;
    font-size: 13px;
  }
}

@media (max-width: 768px) {
  .dashboard-sector-1c,
  .dashboard-sector-pdm,
  .dashboard-sector-bitrix24,
  .dashboard-sector-infrastructure {
    padding: 15px;
  }

  .dashboard-header {
    padding: 15px;
  }

  .dashboard-header h1 {
    font-size: 20px;
  }

  .sector-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .stages-container {
    gap: 10px;
    padding-bottom: 5px;
  }

  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions button {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .sector-stats {
    grid-template-columns: 1fr;
  }

  .stat-item {
    padding: 12px;
  }

  .stat-value {
    font-size: 20px;
  }
}
</style>