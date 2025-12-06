<template>
  <div class="zero-point">
    <div class="zero-point-header">
      <h3>Нулевая точка</h3>
    </div>

    <!-- Оптимизация списка тикетов с v-memo -->
    <div
      v-memo="[tickets.length, tickets.map(t => t.id).join(',')]"
      class="zero-point-tickets"
    >
      <TicketCard
        v-for="ticket in tickets"
        :key="ticket.id"
        :ticket="ticket"
        :draggable="true"
        @drag-start="handleTicketDragStart(ticket)"
        @click="$emit('ticket-clicked', ticket)"
      />
    </div>
    
    <!-- Fallback с v-once для статического контента -->
    <div v-if="!hasTickets" v-once class="empty-state">
      <p>Нет неразобранных тикетов в стадии</p>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import TicketCard from './TicketCard.vue';

/**
 * Компонент нулевой точки (Неразобранное)
 * 
 * Отображает тикеты с ответственным 1051 (Хранитель объектов) или без назначенного сотрудника.
 * Если тикетов нет, показывает fallback-сообщение "Нет неразобранных тикетов в стадии".
 * 
 * Используется в:
 * - DashboardStage.vue (для каждого этапа)
 * 
 * После TASK-012:
 * - Убраны иконка и счётчик из заголовка
 * - Убран блок описания
 * - Обновлён fallback для пустого состояния
 * 
 * @component
 */
export default {
  name: 'ZeroPoint',
  components: {
    TicketCard
  },
  props: {
    /**
     * Список тикетов нулевой точки
     * 
     * Тикеты без назначенного сотрудника или с ответственным 1051 (Хранитель объектов).
     * 
     * @type {Array<Object>}
     * @property {number} ticket.id - ID тикета
     * @property {string} ticket.title - Название тикета
     * @property {number} ticket.assignedById - ID ответственного (null или 1051)
     */
    tickets: {
      type: Array,
      required: true,
      default: () => []
    },
    /**
     * ID этапа
     * 
     * Используется для идентификации этапа, к которому относится нулевая точка.
     * 
     * @type {string}
     */
    stageId: {
      type: String,
      required: true
    }
  },
  emits: {
    /**
     * Событие начала перетаскивания тикета
     * 
     * @param {Object} ticket - Тикет, который начал перетаскиваться
     */
    'ticket-dragged': (ticket) => typeof ticket === 'object' && ticket !== null,
    /**
     * Событие назначения тикета сотруднику
     * 
     * @param {Object} data - Данные назначения
     * @param {Object} data.ticket - Тикет
     * @param {number} data.employeeId - ID сотрудника
     * @param {string} data.stageId - ID этапа
     */
    'ticket-assigned': (data) => typeof data === 'object' && data !== null,
    /**
     * Событие клика по тикету
     * 
     * @param {Object} ticket - Тикет, по которому кликнули
     */
    'ticket-clicked': (ticket) => typeof ticket === 'object' && ticket !== null
  },
  setup(props, { emit }) {
    /**
     * Есть ли тикеты в нулевой точке
     * 
     * Computed свойство для оптимизации проверки наличия тикетов.
     * Используется вместо прямого `tickets.length === 0` в template.
     * 
     * @returns {boolean} true, если есть тикеты
     */
    const hasTickets = computed(() => {
      return Array.isArray(props.tickets) && props.tickets.length > 0;
    });

    /**
     * Обработка начала перетаскивания тикета
     * 
     * @param {Object} ticket - Тикет
     */
    const handleTicketDragStart = (ticket) => {
      emit('ticket-dragged', ticket);
    };

    return {
      hasTickets,
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

