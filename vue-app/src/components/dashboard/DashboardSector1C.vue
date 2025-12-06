<template>
  <div class="dashboard-sector-1c" :class="{ 'is-dragging': draggedTicket }">
    <!-- Заголовок -->
    <div class="dashboard-header">
      <button class="back-button" @click="goBack" aria-label="Вернуться на главную">
        <span class="back-button-icon">←</span>
        <span class="back-button-text">НАЗАД</span>
      </button>
      <h1>Дашборд - Сектор 1С</h1>
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
    <button 
      class="floating-back-button" 
      @click="goBack"
      aria-label="Вернуться на главную"
      title="Вернуться на главную"
    >
      <span class="floating-back-button-icon">←</span>
    </button>

    <!-- Компонент управления логированием (только в режиме разработки) -->
    <LoggerControl :show-control="showLoggerControl" />
  </div>
</template>

<script>
import { onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import DashboardStage from './DashboardStage.vue';
import LoadingPreloader from './LoadingPreloader.vue';
import LoggerControl from './LoggerControl.vue';
import { useDashboardState } from '@/composables/useDashboardState.js';
import { useDashboardActions } from '@/composables/useDashboardActions.js';

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
    LoggerControl
  },
  setup() {
    // Роутер для навигации
    const router = useRouter();

    // Используем композаблы для состояния и действий
    const state = useDashboardState();
    const actions = useDashboardActions(state);

    // Загрузка данных при монтировании компонента
    onMounted(() => {
      actions.loadSectorData();
    });

    /**
     * Возврат на стартовую страницу
     * 
     * Используется для кнопок навигации "НАЗАД":
     * - Кнопка в заголовке (десктоп и планшет)
     * - Плавающая кнопка (мобильная версия)
     */
    const goBack = () => {
      router.push('/');
    };

    /**
     * Обработка повтора загрузки при ошибке
     */
    const handleRetry = () => {
      actions.loadSectorData(false); // Не используем кеш при повторе
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
      
      // Навигация и обработка ошибок
      handleRetry,
      isTransitioning: actions.isTransitioning,
      goBack
    };
  }
};
</script>

<style scoped>
.dashboard-sector-1c {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
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
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.back-button:hover {
  background: #e0e0e0;
  border-color: #bbb;
}

.back-button:active {
  background: #d0d0d0;
}

.back-button-icon {
  font-size: 18px;
  line-height: 1;
}

.back-button-text {
  font-weight: 500;
}

.dashboard-header h1 {
  flex: 1;
  color: #333;
  font-size: 24px;
  margin: 0;
  font-weight: 600;
}

.dashboard-content {
  margin-top: 20px;
}

.stages-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

/* Стили для загрузки и ошибок теперь в компоненте LoadingPreloader */

/* Анимация исчезновения прелоадера (fade-out) */
.preloader-fade-leave-active {
  transition: opacity 0.4s ease-out, transform 0.4s ease-out;
}

.preloader-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}

.preloader-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Анимация появления дашборда (fade-in) */
.dashboard-fade-enter-active {
  transition: opacity 0.4s ease-in, transform 0.4s ease-in;
  transition-delay: 0.15s; /* Начинаем после начала fade-out прелоадера */
}

.dashboard-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
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

  /* Скрытие кнопки в заголовке на мобильной версии (для плавающей кнопки) */
  .back-button {
    display: none;
  }
}

/* Плавающая кнопка "НАЗАД" для мобильной версии */
.floating-back-button {
  display: none; /* Скрыта по умолчанию */
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #2196F3; /* Акцентный цвет Bitrix24 */
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1000; /* Поверх всего контента */
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  line-height: 1;
}

.floating-back-button:hover {
  background: #1976D2;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.15);
  transform: scale(1.05);
}

.floating-back-button:active {
  background: #1565C0;
  transform: scale(0.95);
}

.floating-back-button-icon {
  font-size: 28px;
  line-height: 1;
  font-weight: bold;
}

/* Показываем плавающую кнопку только на мобильной версии */
@media (max-width: 768px) {
  .floating-back-button {
    display: flex;
  }
}

/* Скрываем плавающую кнопку на планшете и десктопе */
@media (min-width: 769px) {
  .floating-back-button {
    display: none;
  }
}
</style>

