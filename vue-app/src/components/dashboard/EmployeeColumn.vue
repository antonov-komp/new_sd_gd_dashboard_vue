<template>
  <div
    class="employee-column"
    :class="{ 'drop-zone-active': isDropZoneActive }"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div class="employee-header">
      <div class="employee-info">
        <span class="employee-icon">👤</span>
        <div class="employee-details">
          <div class="employee-name">{{ employee.name }}</div>
          <div v-if="employee.position" class="employee-position">
            {{ employee.position }}
          </div>
        </div>
      </div>
      <div class="tickets-count">
        📊 Тикетов: {{ employee.tickets?.length || 0 }}
      </div>
    </div>

    <div class="tickets-list">
      <transition-group name="ticket" tag="div">
        <TicketCard
          v-for="ticket in employee.tickets"
          :key="ticket.id"
          :ticket="ticket"
          :draggable="true"
          @click="$emit('ticket-clicked', ticket)"
          @drag-start="handleTicketDragStart"
        />
      </transition-group>
      
      <div v-if="!employee.tickets || employee.tickets.length === 0" class="empty-state">
        <p>Нет тикетов</p>
        <button class="add-ticket-btn" @click="handleAddTicket">
          + Добавить тикет
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import TicketCard from './TicketCard.vue';

/**
 * Компонент колонки сотрудника
 * 
 * Отображает информацию о сотруднике и его тикетах
 * Поддерживает Drag & Drop для назначения тикетов сотруднику
 * 
 * Используется в:
 * - DashboardStage.vue (для каждого сотрудника этапа)
 */
export default {
  name: 'EmployeeColumn',
  components: {
    TicketCard
  },
  props: {
    employee: {
      type: Object,
      required: true
    },
    stageId: {
      type: String,
      required: true
    }
  },
  emits: ['ticket-clicked', 'ticket-dropped'],
  setup(props, { emit }) {
    const isDropZoneActive = ref(false);

    /**
     * Обработка наведения при перетаскивании
     * 
     * @param {Event} event - Событие dragover
     */
    const handleDragOver = (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      isDropZoneActive.value = true;
    };

    /**
     * Обработка ухода курсора из зоны сброса
     * 
     * @param {Event} event - Событие dragleave
     */
    const handleDragLeave = (event) => {
      // Проверяем, что мы действительно покинули зону
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;
      
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        isDropZoneActive.value = false;
      }
    };

    /**
     * Обработка сброса тикета
     * 
     * @param {Event} event - Событие drop
     */
    const handleDrop = async (event) => {
      event.preventDefault();
      isDropZoneActive.value = false;

      const ticketData = event.dataTransfer.getData('application/json');
      if (ticketData) {
        try {
          const ticket = JSON.parse(ticketData);
          
          // Валидация: можно ли переместить тикет сюда
          if (canDropTicket(ticket, props.employee.id, props.stageId)) {
            emit('ticket-dropped', ticket, props.employee.id);
          } else {
            // Показ уведомления об ошибке
            if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
              BX.UI.Notification.Center.notify({
                content: 'Нельзя переместить тикет сюда',
                autoHideDelay: 3000
              });
            }
          }
        } catch (err) {
          console.error('Error parsing ticket data:', err);
        }
      }
    };

    /**
     * Проверка возможности сброса тикета
     * 
     * @param {Object} ticket - Тикет
     * @param {number} employeeId - ID сотрудника
     * @param {string} stageId - ID этапа
     * @returns {boolean} Можно ли переместить тикет
     */
    const canDropTicket = (ticket, employeeId, stageId) => {
      // Логика валидации (например, нельзя переместить тикет на того же сотрудника)
      if (ticket.assigneeId === employeeId && ticket.stageId === stageId) {
        return false;
      }
      return true;
    };

    /**
     * Обработка начала перетаскивания тикета
     * 
     * @param {Object} ticket - Тикет
     */
    const handleTicketDragStart = (ticket) => {
      // Обработка начала перетаскивания (если нужно)
    };

    /**
     * Обработка добавления тикета
     */
    const handleAddTicket = () => {
      // Обработка добавления тикета (можно открыть модальное окно)
      console.log('Add ticket for employee:', props.employee.id);
    };

    return {
      isDropZoneActive,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleTicketDragStart,
      handleAddTicket
    };
  }
};
</script>

<style scoped>
.employee-column {
  background: #f9f9f9;
  border-radius: 4px;
  padding: 15px;
  min-height: 200px;
  transition: all 0.3s ease;
}

.employee-column.drop-zone-active {
  background: #e7f3ff;
  border: 2px dashed #007bff;
  transform: scale(1.02);
}

.employee-header {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.employee-icon {
  font-size: 24px;
}

.employee-details {
  flex: 1;
}

.employee-name {
  font-weight: 600;
  color: #333;
  font-size: 16px;
}

.employee-position {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.tickets-count {
  font-size: 14px;
  color: #666;
}

.tickets-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #999;
}

.add-ticket-btn {
  margin-top: 10px;
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.add-ticket-btn:hover {
  background: #0056b3;
}

/* Анимации для transition-group */
.ticket-enter-active,
.ticket-leave-active {
  transition: all 0.3s ease;
}

.ticket-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.ticket-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>

