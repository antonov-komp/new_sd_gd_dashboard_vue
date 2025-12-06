<template>
  <div class="zero-point">
    <div class="zero-point-header">
      <span class="zero-point-icon">📥</span>
      <h3>[0] Нулевая точка</h3>
      <span class="tickets-count">({{ tickets.length }})</span>
    </div>
    
    <div class="zero-point-description">
      <p>Входящие тикеты</p>
      <p class="hint">Перетащите тикет на сотрудника</p>
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
        <p>Нет входящих тикетов</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import TicketCard from './TicketCard.vue';

/**
 * Компонент нулевой точки
 * 
 * Отображает входящие тикеты для этапа
 * Позволяет перетаскивать тикеты из нулевой точки на сотрудников
 * 
 * Используется в:
 * - DashboardStage.vue (для каждого этапа)
 */
export default {
  name: 'ZeroPoint',
  components: {
    TicketCard
  },
  props: {
    tickets: {
      type: Array,
      default: () => []
    },
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
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.zero-point-icon {
  font-size: 24px;
}

.zero-point-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.tickets-count {
  font-size: 14px;
  color: #666;
  background: white;
  padding: 4px 8px;
  border-radius: 12px;
}

.zero-point-description {
  margin-bottom: 15px;
  font-size: 14px;
  color: #666;
}

.zero-point-description p {
  margin: 4px 0;
}

.hint {
  font-size: 12px;
  color: #999;
  font-style: italic;
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

