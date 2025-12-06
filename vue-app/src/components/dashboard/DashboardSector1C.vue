<template>
  <div class="dashboard-sector-1c" :class="{ 'is-dragging': draggedTicket }">
    <!-- Заголовок -->
    <div class="dashboard-header">
      <h1>Дашборд - Сектор 1С</h1>
    </div>

    <!-- Состояние загрузки -->
    <div v-if="isLoading" class="loading-state">
      <p>Загрузка данных...</p>
    </div>

    <!-- Состояние ошибки -->
    <div v-else-if="error" class="error-state">
      <p>Ошибка: {{ error }}</p>
    </div>

    <!-- Контент дашборда -->
    <div v-else class="dashboard-content">
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
  </div>
</template>

<script>
import { onMounted } from 'vue';
import DashboardStage from './DashboardStage.vue';
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
    DashboardStage
  },
  setup() {
    // Используем композаблы для состояния и действий
    const state = useDashboardState();
    const actions = useDashboardActions(state);

    // Загрузка данных при монтировании компонента
    onMounted(() => {
      actions.loadSectorData();
    });

    return {
      // Состояние из композабла
      isLoading: state.isLoading,
      error: state.error,
      stages: state.stages,
      zeroPointTickets: state.zeroPointTickets,
      employees: state.employees,
      draggedTicket: state.draggedTicket,
      
      // Действия из композабла
      loadSectorData: actions.loadSectorData,
      handleTicketDragStart: actions.handleTicketDragStart,
      handleTicketDrop: actions.handleTicketDrop,
      assignTicketToEmployee: actions.assignTicketToEmployee,
      moveTicketToStage: actions.moveTicketToStage,
      createTicket: actions.createTicket,
      getEmployeeTickets: state.getEmployeeTickets
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
  margin-bottom: 20px;
  padding: 15px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.dashboard-header h1 {
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

.loading-state,
.error-state {
  padding: 40px;
  text-align: center;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.error-state {
  color: #dc3545;
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
}
</style>

