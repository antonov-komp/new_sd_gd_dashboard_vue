<template>
  <div class="dashboard-sector-1c" :class="{ 'is-dragging': draggedTicket }">
    <!-- Заголовок -->
    <div class="dashboard-header">
      <BackButton variant="header" />
      <h1>Дашборд - Сектор 1С</h1>
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
          title="Перейти к графику приёма и закрытий сектора"
        >
          <span class="icon">📈</span>
          <span>График приёма и закрытий</span>
        </button>
        <button 
          @click="navigateToTimeTracking"
          class="btn-navigate-time-tracking"
          title="Перейти к трудозатратам на тикеты сектора"
        >
          <span class="icon">⏱</span>
          <span>Трудозатраты</span>
        </button>
      </div>
    </div>

    <!-- Прелоадер с плавным исчезновением -->
    <Transition name="preloader-fade">
      <LoadingPreloader
        v-if="isLoading || error || currentStep"
        :current-step="currentStep"
        :progress="progress"
        :step-details="stepDetails"
        :error="error || null"
        @retry="handleRetry"
      />
    </Transition>

    <!-- Контент дашборда с плавным появлением -->
    <Transition name="dashboard-fade">
      <div v-if="!isLoading && !error && !currentStep" class="dashboard-content">
        <div class="stages-container">
          <DashboardStage
            v-for="stage in stages"
            :key="stage.id"
            :stage="stage"
            :zero-point-tickets="zeroPointTickets[stage.id] || []"
            @ticket-moved="handleTicketDrop"
            @ticket-assigned="assignTicketToEmployee"
          />
        </div>
      </div>
    </Transition>

    <!-- Плавающая кнопка "НАЗАД" для мобильной версии -->
    <BackButton variant="floating" />

    <!-- Компонент управления логированием (только в режиме разработки) -->
    <LoggerControl :show-control="showLoggerControl" />

    <!-- Панель диагностики (только при включённом режиме и для администраторов) -->
    <DiagnosticsPanel :is-enabled="isDiagnosticsEnabled" :is-user-admin="isUserAdmin" />
  </div>
</template>

<script>
import { onMounted, computed, ref } from 'vue';
import DashboardStage from './DashboardStage.vue';
import LoadingPreloader from './LoadingPreloader.vue';
import LoggerControl from './LoggerControl.vue';
import BackButton from './BackButton.vue';
import DiagnosticsPanel from './DiagnosticsPanel.vue';
import { useRouter, useRoute } from 'vue-router';
import { useDashboardState } from '@/composables/useDashboardState.js';
import { useDashboardActions } from '@/composables/useDashboardActions.js';
import { 
  getPreloaderFadeOutTransition, 
  getDashboardFadeInTransition, 
  PRELOADER_TRANSITION 
} from '@/services/dashboard-sector-1c/utils/transition-config.js';
import { isDiagnosticsEnabled, getDiagnosticsService } from '@/services/dashboard-sector-1c/utils/diagnostics-service.js';
import { CacheManager } from '@/services/dashboard-sector-1c/cache/cache-manager.js';
import { clearSectorCache } from '@/services/dashboard-sector-1c/utils/sector-helper.js';
import { AccessControlService } from '@/services/access-control-service.js';
import { isAdmin } from '@/config/access-config.js';

/**
 * Главный компонент дашборда сектора 1С
 * 
 * Отображает три этапа обработки тикетов:
 * 1. Сформировано обращение (синий)
 * 2. Рассмотрение ТЗ (жёлтый)
 * 3. Исполнение (зелёный)
 * 
 * Каждый этап содержит нулевую точку и колонки сотрудников
 * 
 * Использует композаблы для управления состоянием и действиями:
 * - useDashboardState - управление состоянием
 * - useDashboardActions - действия (загрузка, назначение, создание)
 * 
 * Использует Bitrix24 REST API для получения данных:
 * - crm.item.list - получение списка элементов смарт-процесса 140
 * - crm.item.update - обновление элемента
 * - crm.item.add - создание элемента
 * - user.get - получение данных сотрудников
 * 
 * Документация:
 * - https://context7.com/bitrix24/rest/crm.item.list
 * - https://context7.com/bitrix24/rest/crm.item.update
 * - https://context7.com/bitrix24/rest/user.get
 * 
 * @component
 */
export default {
  name: 'DashboardSector1C',
  components: {
    DashboardStage,
    LoadingPreloader,
    LoggerControl,
    BackButton,
    DiagnosticsPanel
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    // Используем композаблы для состояния и действий
    const state = useDashboardState();
    const actions = useDashboardActions(state);

    // Информация о текущем пользователе
    const currentUser = ref(null);

    // Проверка, является ли пользователь администратором
    const isUserAdmin = computed(() => {
      if (!currentUser.value) {
        return false;
      }
      return isAdmin(currentUser.value);
    });

    // Проверка, включён ли диагностический режим
    const isDiagnosticsEnabledFlag = computed(() => {
      const enabled = isDiagnosticsEnabled(route, currentUser.value);
      // Отладочный вывод (можно убрать после проверки)
      if (import.meta.env?.MODE !== 'production') {
        console.log('[Diagnostics] Enabled:', enabled, 'Route query:', route.query, 'Hash:', window.location.hash);
      }
      return enabled;
    });

    /**
     * Включение диагностического режима
     */
    const enableDiagnostics = () => {
      // Добавляем query-параметр в URL
      router.push({
        name: 'dashboard-sector-1c',
        query: {
          ...route.query,
          diagnostics: 'true'
        }
      });
      
      // Также устанавливаем в localStorage для надёжности
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('dashboard-sector-1c-diagnostics', 'true');
      }
      
      // Перезагружаем данные с диагностикой
      const diagnostics = getDiagnosticsService();
      if (diagnostics) {
        diagnostics.reset();
      }
      actions.loadSectorData(false); // Не используем кеш
    };

    /**
     * Сброс кеша тикетов/сектора и повторная загрузка без кеша
     */
    const clearCache = () => {
      CacheManager.invalidateTicketsCache();
      CacheManager.invalidateEmployeesCache();
      clearSectorCache();
      const diagnostics = getDiagnosticsService();
      if (diagnostics) {
        diagnostics.reset();
      }
      actions.loadSectorData(false);
    };

    // Загрузка данных при монтировании компонента
    onMounted(async () => {
      // Получаем информацию о текущем пользователе
      try {
        currentUser.value = await AccessControlService.getCurrentUser();
      } catch (error) {
        console.error('Error getting current user:', error);
        currentUser.value = null;
      }

      // Сбрасываем диагностику перед загрузкой (если включена)
      if (isDiagnosticsEnabledFlag.value) {
        const diagnostics = getDiagnosticsService();
        if (diagnostics) {
          diagnostics.reset();
        }
      }
      
      actions.loadSectorData();
    });

    // Конфигурация transitions для использования в CSS через v-bind
    const preloaderFadeOutTransition = getPreloaderFadeOutTransition();
    const dashboardFadeInTransition = getDashboardFadeInTransition();
    const transitionDelay = `${PRELOADER_TRANSITION.delayBetween}ms`;
    const preloaderFadeOutTransform = PRELOADER_TRANSITION.fadeOutTransform;
    const dashboardFadeInTransform = PRELOADER_TRANSITION.fadeInTransform;

    /**
     * Обработка повтора загрузки при ошибке
     */
    const handleRetry = () => {
      actions.loadSectorData(false); // Не используем кеш при повторе
    };

    /**
     * Переход к дашборду графика состояния
     */
    const navigateToGraphState = () => {
      router.push({ name: 'dashboard-graph-state' });
    };

    /**
     * Переход к графику приёма и закрытий
     */
    const navigateToAdmissionClosure = () => {
      router.push({ name: 'dashboard-graph-admission-closure' });
    };

    /**
     * Переход к модулю трудозатрат на тикеты
     */
    const navigateToTimeTracking = () => {
      router.push({ name: 'dashboard-tickets-time-tracking' });
    };

    // Извлекаем loadingProgress для удобства доступа
    const loadingProgress = actions.loadingProgress;

    /**
     * Показывать ли компонент управления логированием
     * 
     * Показывается только в режиме разработки (не production)
     * Можно также включить через localStorage для отладки в production
     */
    const showLoggerControl = computed(() => {
      // Показываем в режиме разработки
      if (import.meta.env?.MODE !== 'production') {
        return true;
      }
      
      // В production можно включить через localStorage (для отладки)
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('dashboard-sector-1c-show-logger-control') === 'true';
      }
      
      return false;
    });

    return {
      // Состояние из композабла
      isLoading: state.isLoading,
      error: state.error,
      stages: state.stages,
      zeroPointTickets: state.zeroPointTickets,
      employees: state.employees,
      draggedTicket: state.draggedTicket,
      
      // Прогресс загрузки - передаём refs напрямую для правильной реактивности
      currentStep: loadingProgress.currentStep,
      progress: loadingProgress.progress,
      stepDetails: loadingProgress.stepDetails,
      loadingProgress, // Оставляем для доступа к методам, если нужно
      
      // Действия из композабла
      loadSectorData: actions.loadSectorData,
      handleTicketDragStart: actions.handleTicketDragStart,
      handleTicketDrop: actions.handleTicketDrop,
      assignTicketToEmployee: actions.assignTicketToEmployee,
      moveTicketToStage: actions.moveTicketToStage,
      createTicket: actions.createTicket,
      getEmployeeTickets: state.getEmployeeTickets,
      
      // Управление логированием
      showLoggerControl,
      
      // Обработка ошибок
      handleRetry,
      isTransitioning: actions.isTransitioning,
      
      // Конфигурация transitions для CSS
      preloaderFadeOutTransition,
      dashboardFadeInTransition,
      transitionDelay,
      preloaderFadeOutTransform,
      dashboardFadeInTransform,
      navigateToGraphState,
      navigateToAdmissionClosure,
      navigateToTimeTracking,
      
      // Диагностика
      isDiagnosticsEnabled: isDiagnosticsEnabledFlag,
      enableDiagnostics,
      clearCache,
      isUserAdmin
    };
  }
};
</script>

<style scoped>
.dashboard-sector-1c {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
  width: 100%;
  position: relative;
  overflow-x: auto; /* Предотвращаем горизонтальный скролл при переполнении */
}

.dashboard-sector-1c.is-dragging {
  cursor: grabbing;
}

.dashboard-sector-1c.is-dragging * {
  pointer-events: none;
}

.dashboard-sector-1c.is-dragging .drop-zone-active {
  pointer-events: auto;
}

.dashboard-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-wrap: wrap; /* Позволяет кнопкам переноситься на новую строку на маленьких экранах */
  width: 100%;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap; /* Позволяет кнопкам переноситься на новую строку */
  flex-shrink: 0; /* Предотвращает сжатие */
}

.btn-navigate-graph-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-navigate-graph-state:hover {
  background-color: #2563eb;
}

.btn-navigate-graph-state .icon {
  font-size: 18px;
}

.btn-navigate-admission-closure {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-navigate-admission-closure:hover {
  background-color: #059669;
}

.btn-navigate-admission-closure .icon {
  font-size: 18px;
}

.btn-enable-diagnostics {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: #ffc107;
  color: #333;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-enable-diagnostics:hover {
  background-color: #ffb300;
}

.btn-enable-diagnostics .icon {
  font-size: 18px;
}

.btn-clear-cache {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-clear-cache:hover {
  background-color: #dc2626;
}

.btn-clear-cache .icon {
  font-size: 18px;
}

.dashboard-header h1 {
  flex: 1;
  color: #333;
  font-size: 24px;
  margin: 0;
  padding: 0;
  font-weight: 600;
  min-width: 200px; /* Минимальная ширина для заголовка */
}

.dashboard-content {
  margin-top: 20px;
}

.stages-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  width: 100%;
  min-width: 0; /* Предотвращает переполнение grid */
}

/* Исправление для предотвращения переполнения grid элементов */
.stages-container > * {
  min-width: 0; /* Позволяет элементам сжиматься */
}

/* Стили для загрузки и ошибок теперь в компоненте LoadingPreloader */

/* Анимация исчезновения прелоадера (fade-out) */
.preloader-fade-leave-active {
  transition: v-bind('preloaderFadeOutTransition');
}

.preloader-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}

.preloader-fade-leave-to {
  opacity: 0;
  transform: v-bind('preloaderFadeOutTransform');
}

/* Анимация появления дашборда (fade-in) */
.dashboard-fade-enter-active {
  transition: v-bind('dashboardFadeInTransition');
  transition-delay: v-bind('transitionDelay');
}

.dashboard-fade-enter-from {
  opacity: 0;
  transform: v-bind('dashboardFadeInTransform');
}

.dashboard-fade-enter-to {
  opacity: 1;
  transform: translateY(0);
}

/* Адаптивность */
@media (max-width: 1024px) {
  .stages-container {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stages-container {
    grid-template-columns: 1fr;
  }
  
  .dashboard-sector-1c {
    padding: 10px;
  }
  
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .dashboard-header h1 {
    width: 100%;
    margin-bottom: 10px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  .btn-navigate-graph-state,
  .btn-navigate-admission-closure,
  .btn-navigate-time-tracking,
  .btn-enable-diagnostics,
  .btn-clear-cache {
    flex: 1 1 auto;
    min-width: 120px;
  }
}

</style>

