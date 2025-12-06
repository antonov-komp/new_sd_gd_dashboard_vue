<template>
  <div
    class="ticket-card"
    :class="{
      'priority-high': ticket.priority === 'high',
      'priority-medium': ticket.priority === 'medium',
      'priority-low': ticket.priority === 'low'
    }"
    :draggable="draggable"
    @click="$emit('click', ticket)"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <div class="ticket-header">
      <span class="ticket-icon">🎫</span>
      <span class="ticket-id">#{{ ticket.id }}</span>
    </div>
    
    <div class="ticket-title">
      {{ ticket.title }}
    </div>
    
    <div class="ticket-meta">
      <span class="ticket-priority" :class="`priority-${ticket.priority}`">
        {{ getPriorityLabel(ticket.priority) }}
      </span>
      <span class="ticket-status">
        {{ getStatusLabel(ticket.status) }}
      </span>
    </div>
    
    <div v-if="ticket.description" class="ticket-description">
      {{ ticket.description }}
    </div>
  </div>
</template>

<script>
/**
 * Компонент карточки тикета
 * 
 * Отображает информацию о тикете (ID, тема, приоритет, статус)
 * Поддерживает перетаскивание (Drag & Drop)
 * 
 * Используется в:
 * - EmployeeColumn.vue (тикеты сотрудника)
 * - ZeroPoint.vue (входящие тикеты)
 */
export default {
  name: 'TicketCard',
  props: {
    ticket: {
      type: Object,
      required: true
    },
    draggable: {
      type: Boolean,
      default: true
    }
  },
  emits: ['click', 'drag-start', 'drag-end'],
  setup(props, { emit }) {
    /**
     * Получение текстового значения приоритета
     * 
     * @param {string} priority - Приоритет (high, medium, low)
     * @returns {string} Текстовое значение
     */
    const getPriorityLabel = (priority) => {
      const labels = {
        high: 'Высокий',
        medium: 'Средний',
        low: 'Низкий'
      };
      return labels[priority] || priority;
    };

    /**
     * Получение текстового значения статуса
     * 
     * @param {string} status - Статус
     * @returns {string} Текстовое значение
     */
    const getStatusLabel = (status) => {
      const labels = {
        in_progress: 'В работе',
        new: 'Новый',
        done: 'Выполнено',
        pending: 'Ожидание'
      };
      return labels[status] || status;
    };

    /**
     * Обработка начала перетаскивания
     * 
     * @param {Event} event - Событие dragstart
     */
    const handleDragStart = (event) => {
      // Сохраняем данные тикета в dataTransfer
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/json', JSON.stringify(props.ticket));
      
      // Добавляем визуальный эффект
      event.dataTransfer.setDragImage(event.target, 0, 0);
      
      emit('drag-start', props.ticket);
    };

    /**
     * Обработка окончания перетаскивания
     */
    const handleDragEnd = () => {
      emit('drag-end');
    };

    return {
      getPriorityLabel,
      getStatusLabel,
      handleDragStart,
      handleDragEnd
    };
  }
};
</script>

<style scoped>
.ticket-card {
  background: white;
  border-radius: 4px;
  padding: 12px;
  border-left: 4px solid #ddd;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.ticket-card:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.ticket-card.priority-high {
  border-left-color: #dc3545;
}

.ticket-card.priority-medium {
  border-left-color: #ffc107;
}

.ticket-card.priority-low {
  border-left-color: #28a745;
}

.ticket-card[draggable="true"] {
  cursor: grab;
}

.ticket-card[draggable="true"]:active {
  cursor: grabbing;
}

.ticket-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.ticket-icon {
  font-size: 18px;
}

.ticket-id {
  font-size: 12px;
  color: #666;
  font-weight: 600;
}

.ticket-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  line-height: 1.4;
}

.ticket-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.ticket-priority,
.ticket-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.ticket-priority.priority-high {
  background: #dc3545;
  color: white;
}

.ticket-priority.priority-medium {
  background: #ffc107;
  color: #333;
}

.ticket-priority.priority-low {
  background: #28a745;
  color: white;
}

.ticket-status {
  background: #e9ecef;
  color: #666;
}

.ticket-description {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
  margin-top: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>

