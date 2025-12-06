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
import { useLogger } from '@/composables/useLogger.js';

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
    const logger = useLogger('DashboardStage');
    const isDragging = ref(false);

    /**
     * Подсчёт количества тикетов внутри сектора
     * 
     * Включает:
     * - Тикеты в нулевой точке (они считаются внутри сектора)
     * - Тикеты у сотрудников сектора 1С
     * 
     * @returns {number} Количество тикетов внутри сектора
     */
    const ticketsCountInsideSector = computed(() => {
      // Тикеты в нулевой точке (считаются внутри сектора)
      const zeroPointCount = Array.isArray(props.zeroPointTickets) 
        ? props.zeroPointTickets.length 
        : 0;
      
      // Тикеты у сотрудников сектора 1С
      const employeesTicketsCount = Array.isArray(props.stage.employees)
        ? props.stage.employees.reduce((total, employee) => {
            // Используем ticketsInsideSector, если доступно, иначе проверяем isFromSector1C
            if (Array.isArray(employee.ticketsInsideSector)) {
              return total + employee.ticketsInsideSector.length;
            } else if (employee.isFromSector1C && Array.isArray(employee.tickets)) {
              return total + employee.tickets.length;
            }
            return total;
          }, 0)
        : 0;
      
      return zeroPointCount + employeesTicketsCount;
    });

    /**
     * Подсчёт количества тикетов вне сектора
     * 
     * Включает тикеты у сотрудников других секторов (не 1С)
     * 
     * @returns {number} Количество тикетов вне сектора
     */
    const ticketsCountOutsideSector = computed(() => {
      return Array.isArray(props.stage.employees)
        ? props.stage.employees.reduce((total, employee) => {
            // Используем ticketsOutsideSector, если доступно
            if (Array.isArray(employee.ticketsOutsideSector)) {
              return total + employee.ticketsOutsideSector.length;
            } else if (!employee.isFromSector1C && Array.isArray(employee.tickets)) {
              return total + employee.tickets.length;
            }
            return total;
          }, 0)
        : 0;
    });

    /**
     * Подсчёт общего количества тикетов по стадии
     * 
     * Сумма = тикеты в нулевой точке + тикеты у всех сотрудников
     * 
     * @returns {number} Общее количество тикетов
     */
    const totalTicketsCount = computed(() => {
      return ticketsCountInsideSector.value + ticketsCountOutsideSector.value;
    });

    /**
     * Название стадии с количеством тикетов
     * 
     * Формат:
     * - "Название стадии (N)" — если нет тикетов вне сектора
     * - "Название стадии (N / M)" — если есть тикеты вне сектора (N — внутри, M — вне)
     * 
     * @returns {string} Название стадии с количеством тикетов
     */
    const stageNameWithCount = computed(() => {
      const baseName = props.stage?.name || 'Стадия';
      const insideCount = ticketsCountInsideSector.value;
      const outsideCount = ticketsCountOutsideSector.value;
      
      if (outsideCount === 0) {
        // Если нет тикетов вне сектора, показываем только одно число
        return `${baseName} (${insideCount})`;
      } else {
        // Если есть тикеты вне сектора, показываем два числа
        return `${baseName} (${insideCount} / ${outsideCount})`;
      }
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
      logger.debug('Ticket clicked', ticket);
      emit('ticket-clicked', ticket);
    };

    return {
      isDragging,
      ticketsCountInsideSector,
      ticketsCountOutsideSector,
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

