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
import { ref, onMounted } from 'vue';
import DashboardStage from './DashboardStage.vue';
import { DashboardSector1CService } from '@/services/dashboard-sector-1c-service.js';

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
 * Использует Bitrix24 REST API для получения данных:
 * - crm.deal.list - получение списка тикетов
 * - crm.deal.update - обновление тикета
 * - user.get - получение данных сотрудников
 * 
 * Документация:
 * - https://context7.com/bitrix24/rest/crm.deal.list
 * - https://context7.com/bitrix24/rest/crm.deal.update
 * - https://context7.com/bitrix24/rest/user.get
 */
export default {
  name: 'DashboardSector1C',
  components: {
    DashboardStage
  },
  setup() {
    // Состояние загрузки
    const isLoading = ref(true);
    const error = ref(null);

    // Данные сектора
    const stages = ref([
      {
        id: 'formed',
        name: 'Сформировано обращение',
        color: '#007bff', // Синий
        employees: []
      },
      {
        id: 'review',
        name: 'Рассмотрение ТЗ',
        color: '#ffc107', // Жёлтый
        employees: []
      },
      {
        id: 'execution',
        name: 'Исполнение',
        color: '#28a745', // Зелёный
        employees: []
      }
    ]);

    // Нулевая точка (входящие тикеты для каждого этапа)
    const zeroPointTickets = ref({
      formed: [],
      review: [],
      execution: []
    });

    // Список сотрудников
    const employees = ref([]);

    // Перетаскиваемый тикет
    const draggedTicket = ref(null);

    /**
     * Загрузка данных сектора из API
     * 
     * Временно использует заглушку (будет заменено в TASK-005-07)
     */
    const loadSectorData = async () => {
      isLoading.value = true;
      error.value = null;

      try {
        // Загружаем данные из API
        const data = await DashboardSector1CService.getSectorData();

        // Обновляем состояние
        stages.value = data.stages;
        zeroPointTickets.value = data.zeroPointTickets;
        employees.value = data.employees;
      } catch (err) {
        error.value = err.message;
        console.error('Error loading sector data:', err);
        
        // Показ уведомления через Bitrix24 UI
        if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
          BX.UI.Notification.Center.notify({
            content: 'Ошибка загрузки данных дашборда',
            autoHideDelay: 5000
          });
        }
      } finally {
        isLoading.value = false;
      }
    };

    /**
     * Обработка начала перетаскивания тикета
     * 
     * @param {Object} ticket - Тикет
     */
    const handleTicketDragStart = (ticket) => {
      draggedTicket.value = ticket;
    };

    /**
     * Обработка сброса тикета
     * 
     * @param {Object} ticket - Тикет
     * @param {number} employeeId - ID сотрудника
     * @param {string} stageId - ID этапа
     */
    const handleTicketDrop = async (ticket, employeeId, stageId) => {
      try {
        // Обновляем через API
        await DashboardSector1CService.assignTicket(ticket.id, employeeId, stageId);
        
        // Обновляем локальное состояние
        updateLocalState(ticket, employeeId, stageId);
        
        // Показ уведомления об успехе
        if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
          BX.UI.Notification.Center.notify({
            content: 'Тикет перемещён',
            autoHideDelay: 3000
          });
        }
      } catch (err) {
        console.error('Error moving ticket:', err);
        
        // Показ уведомления об ошибке
        if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
          BX.UI.Notification.Center.notify({
            content: 'Ошибка перемещения тикета',
            autoHideDelay: 5000
          });
        }
      } finally {
        draggedTicket.value = null;
      }
    };

    /**
     * Обновление локального состояния после перемещения тикета
     * 
     * @param {Object} ticket - Тикет
     * @param {number} newEmployeeId - ID нового сотрудника
     * @param {string} newStageId - ID нового этапа
     */
    const updateLocalState = (ticket, newEmployeeId, newStageId) => {
      // Находим старую позицию тикета
      const oldStage = stages.value.find(s => 
        s.employees.some(e => 
          e.tickets.some(t => t.id === ticket.id)
        )
      );
      
      if (oldStage) {
        const oldEmployee = oldStage.employees.find(e =>
          e.tickets.some(t => t.id === ticket.id)
        );
        
        if (oldEmployee) {
          // Удаляем тикет из старой позиции
          oldEmployee.tickets = oldEmployee.tickets.filter(t => t.id !== ticket.id);
        }
      }
      
      // Добавляем тикет в новую позицию
      const newStage = stages.value.find(s => s.id === newStageId);
      if (newStage) {
        const newEmployee = newStage.employees.find(e => e.id === newEmployeeId);
        if (newEmployee) {
          // Обновляем данные тикета
          const updatedTicket = {
            ...ticket,
            assigneeId: newEmployeeId,
            stageId: newStageId
          };
          
          newEmployee.tickets.push(updatedTicket);
        }
      }
      
      // Обновляем нулевую точку (если тикет был там)
      Object.keys(zeroPointTickets.value).forEach(stageId => {
        zeroPointTickets.value[stageId] = zeroPointTickets.value[stageId].filter(
          t => t.id !== ticket.id
        );
      });
    };

    /**
     * Назначение тикета сотруднику
     * 
     * @param {Object} ticket - Тикет
     * @param {number} employeeId - ID сотрудника
     */
    const assignTicketToEmployee = async (ticket, employeeId) => {
      await handleTicketDrop(ticket, employeeId, ticket.stageId);
    };

    /**
     * Перемещение тикета на этап
     * 
     * @param {Object} ticket - Тикет
     * @param {string} stageId - ID этапа
     */
    const moveTicketToStage = async (ticket, stageId) => {
      await handleTicketDrop(ticket, ticket.assigneeId, stageId);
    };

    /**
     * Создание нового тикета
     * 
     * @param {Object} ticketData - Данные тикета
     */
    const createTicket = async (ticketData) => {
      try {
        // Создаём тикет через API
        const newTicketId = await DashboardSector1CService.createTicket(ticketData);
        
        // Перезагружаем данные для обновления состояния
        await loadSectorData();
        
        // Показ уведомления об успехе
        if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
          BX.UI.Notification.Center.notify({
            content: 'Тикет создан',
            autoHideDelay: 3000
          });
        }
      } catch (err) {
        console.error('Error creating ticket:', err);
        
        // Показ уведомления об ошибке
        if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
          BX.UI.Notification.Center.notify({
            content: 'Ошибка создания тикета',
            autoHideDelay: 5000
          });
        }
      }
    };

    /**
     * Получение тикетов сотрудника для этапа
     * 
     * @param {number} employeeId - ID сотрудника
     * @param {string} stageId - ID этапа
     * @returns {Array} Массив тикетов
     */
    const getEmployeeTickets = (employeeId, stageId) => {
      const stage = stages.value.find(s => s.id === stageId);
      if (!stage) return [];

      const employee = stage.employees.find(e => e.id === employeeId);
      if (!employee) return [];

      return employee.tickets || [];
    };

    // Загрузка данных при монтировании компонента
    onMounted(() => {
      loadSectorData();
    });

    return {
      isLoading,
      error,
      stages,
      zeroPointTickets,
      employees,
      draggedTicket,
      loadSectorData,
      handleTicketDragStart,
      handleTicketDrop,
      assignTicketToEmployee,
      moveTicketToStage,
      createTicket,
      getEmployeeTickets
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

