<template>
  <div class="zero-point">
    <div class="zero-point-header">
      <h3>Нулевая точка</h3>
    </div>

    <div class="zero-point-tickets">
      <TicketCard
        v-for="ticket in tickets"
        :key="ticket.id"
        :ticket="ticket"
        :draggable="true"
        @drag-start="handleTicketDragStart(ticket)"
        @click="$emit('ticket-clicked', ticket)"
      />
      
      <div v-if="tickets.length === 0" class="empty-state">
        <p>Нет неразобранных тикетов в стадии</p>
      </div>
    </div>
  </div>
</template>

<script>
import TicketCard from './TicketCard.vue';

/**
 * Компонент нулевой точки
 * 
 * Отображает входящие тикеты для этапа (тикеты без назначенного сотрудника)
 * Позволяет перетаскивать тикеты из нулевой точки на сотрудников
 * 
 * Используется в:
 * - DashboardStage.vue (для каждого этапа)
 * 
 * @component
 * @prop {Array} tickets - Массив тикетов без назначенного сотрудника
 * @prop {string} stageId - ID этапа
 * @emits {Object} ticket-dragged - Тикет начал перетаскиваться
 * @emits {Object} ticket-assigned - Тикет назначен сотруднику
 * @emits {Object} ticket-clicked - Тикет кликнут
 */
export default {
  name: 'ZeroPoint',
  components: {
    TicketCard
  },
  props: {
    /**
     * Массив тикетов без назначенного сотрудника
     * @type {Array<Object>}
     */
    tickets: {
      type: Array,
      default: () => []
    },
    /**
     * ID этапа
     * @type {string}
     */
    stageId: {
      type: String,
      required: true
    }
  },
  emits: ['ticket-dragged', 'ticket-assigned', 'ticket-clicked'],
  setup(props, { emit }) {
    /**
     * Обработка начала перетаскивания тикета
     * 
     * @param {Object} ticket - Тикет
     */
    const handleTicketDragStart = (ticket) => {
      emit('ticket-dragged', ticket);
    };

    return {
      handleTicketDragStart
    };
  }
};
</script>

<style scoped>
.zero-point {
  background: #f5f5f5;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 15px;
  border: 2px dashed #ccc;
}

.zero-point-header {
  margin-bottom: 10px;
}

.zero-point-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.zero-point-tickets {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 14px;
}
</style>

