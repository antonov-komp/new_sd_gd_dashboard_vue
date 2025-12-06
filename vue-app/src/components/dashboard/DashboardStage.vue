<template>
  <div class="dashboard-stage" :style="{ borderLeftColor: stage.color }">
    <div class="stage-header">
      <h2>{{ stageNameWithCount }}</h2>
    </div>
    
    <div class="stage-content">
      <!-- Нулевая точка -->
      <ZeroPoint
        :tickets="zeroPointTickets"
        :stage-id="stage.id"
        @ticket-dragged="handleTicketDragged"
        @ticket-assigned="handleTicketAssigned"
        @ticket-clicked="handleTicketClicked"
      />
      
      <!-- Колонки сотрудников -->
      <div class="employees-container">
        <EmployeeColumn
          v-for="employee in stage.employees"
          :key="employee.id"
          :employee="employee"
          :stage-id="stage.id"
          @ticket-clicked="handleTicketClicked"
          @ticket-dropped="handleTicketDropped"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import ZeroPoint from './ZeroPoint.vue';
import EmployeeColumn from './EmployeeColumn.vue';

/**
 * Компонент этапа дашборда
 * 
 * Отображает один этап обработки тикетов с нулевой точкой и колонками сотрудников
 * Обрабатывает события от дочерних компонентов и передаёт их родительскому компоненту
 * 
 * Используется в:
 * - DashboardSector1C.vue (для каждого этапа)
 */
export default {
  name: 'DashboardStage',
  components: {
    ZeroPoint,
    EmployeeColumn
  },
  props: {
    stage: {
      type: Object,
      required: true
    },
    zeroPointTickets: {
      type: Array,
      default: () => []
    }
  },
  emits: ['ticket-moved', 'ticket-assigned', 'ticket-clicked'],
  setup(props, { emit }) {
    const isDragging = ref(false);

    /**
     * Подсчёт общего количества тикетов по стадии
     * 
     * Сумма = тикеты в нулевой точке + тикеты у всех сотрудников
     * 
     * @returns {number} Общее количество тикетов
     */
    const totalTicketsCount = computed(() => {
      // Тикеты в нулевой точке
      const zeroPointCount = Array.isArray(props.zeroPointTickets) 
        ? props.zeroPointTickets.length 
        : 0;
      
      // Тикеты у всех сотрудников в этой стадии
      const employeesTicketsCount = Array.isArray(props.stage.employees)
        ? props.stage.employees.reduce((total, employee) => {
            const employeeTickets = Array.isArray(employee.tickets) 
              ? employee.tickets.length 
              : 0;
            return total + employeeTickets;
          }, 0)
        : 0;
      
      return zeroPointCount + employeesTicketsCount;
    });

    /**
     * Название стадии с количеством тикетов
     * 
     * Формат: "Название стадии (N)"
     * 
     * @returns {string} Название стадии с количеством тикетов
     */
    const stageNameWithCount = computed(() => {
      const baseName = props.stage?.name || 'Стадия';
      const count = totalTicketsCount.value;
      return `${baseName} (${count})`;
    });

    /**
     * Обработка начала перетаскивания тикета
     * 
     * @param {Object} ticket - Тикет
     */
    const handleTicketDragged = (ticket) => {
      isDragging.value = true;
    };

    /**
     * Обработка назначения тикета сотруднику
     * 
     * @param {Object} ticket - Тикет
     * @param {number} employeeId - ID сотрудника
     */
    const handleTicketAssigned = (ticket, employeeId) => {
      emit('ticket-assigned', ticket, employeeId);
    };

    /**
     * Обработка сброса тикета на сотрудника
     * 
     * @param {Object} ticket - Тикет
     * @param {number} employeeId - ID сотрудника
     */
    const handleTicketDropped = (ticket, employeeId) => {
      emit('ticket-moved', ticket, employeeId, props.stage.id);
      isDragging.value = false;
    };

    /**
     * Обработка клика по тикету
     * 
     * @param {Object} ticket - Тикет
     */
    const handleTicketClicked = (ticket) => {
      // Обработка клика по тикету (можно открыть модальное окно)
      console.log('Ticket clicked:', ticket);
      emit('ticket-clicked', ticket);
    };

    return {
      isDragging,
      totalTicketsCount,
      stageNameWithCount,
      handleTicketDragged,
      handleTicketAssigned,
      handleTicketDropped,
      handleTicketClicked
    };
  }
};
</script>

<style scoped>
.dashboard-stage {
  background: white;
  border-radius: 4px;
  padding: 15px;
  border-left: 4px solid;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-height: 400px;
}

.stage-header {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.stage-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.stage-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.employees-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>

