<template>
  <div
    class="ticket-card"
    :class="{
      'priority-high': ticket.priority === 'high',
      'priority-medium': ticket.priority === 'medium',
      'priority-low': ticket.priority === 'low'
    }"
    :draggable="isDragEnabled"
    @click="handleCardClick"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <div class="ticket-header">
      <span class="ticket-icon">🎫</span>
      <span class="ticket-id">#{{ ticket.id }}</span>
    </div>
    
    <div class="ticket-title">
      {{ ticket.ufSubject || ticket.title || 'Без названия' }}
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
import { computed, ref } from 'vue';
import { DISABLE_TICKET_DRAG, getTicketIframeUrl } from '@/services/dashboard-sector-1c/utils/constants.js';

/**
 * Компонент карточки тикета
 * 
 * Отображает информацию о тикете (ID, тема, приоритет, статус)
 * Поддерживает перетаскивание (Drag & Drop)
 * При клике открывает детальную информацию о тикете в iframe Bitrix24
 * 
 * Используется в:
 * - EmployeeColumn.vue (тикеты сотрудника)
 * - ZeroPoint.vue (входящие тикеты)
 * 
 * @component
 * @prop {Object} ticket - Объект тикета
 * @prop {number} ticket.id - ID тикета
 * @prop {string} ticket.title - Название тикета (fallback, если отсутствует ufSubject)
 * @prop {string|null} ticket.ufSubject - Тема тикета из пользовательского поля UF_SUBJECT (приоритетное для отображения)
 * @prop {string} ticket.priority - Приоритет (high, medium, low)
 * @prop {string} ticket.status - Статус (in_progress, new, done, pending)
 * @prop {string} ticket.description - Описание тикета (опционально)
 * @prop {boolean} draggable - Можно ли перетаскивать тикет
 * @emits {Object} click - Тикет кликнут
 * @emits {Object} drag-start - Начато перетаскивание тикета
 * @emits {void} drag-end - Завершено перетаскивание тикета
 */
export default {
  name: 'TicketCard',
  props: {
    /**
     * Объект тикета
     * @type {Object}
     */
    ticket: {
      type: Object,
      required: true
    },
    /**
     * Можно ли перетаскивать тикет
     * @type {boolean}
     */
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
    const isDragging = ref(false);
    const isDragEnabled = computed(() => !DISABLE_TICKET_DRAG && props.draggable);

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
      if (!isDragEnabled.value) {
        return;
      }
      // Сохраняем данные тикета в dataTransfer
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/json', JSON.stringify(props.ticket));
      
      // Добавляем визуальный эффект
      event.dataTransfer.setDragImage(event.target, 0, 0);
      
      isDragging.value = true;
      emit('drag-start', props.ticket);
    };

    /**
     * Обработка окончания перетаскивания
     */
    const handleDragEnd = () => {
      if (!isDragEnabled.value) {
        return;
      }
      isDragging.value = false;
      emit('drag-end');
    };

    /**
     * Обработка клика по карточке тикета
     * Открывает детальную информацию о тикете в iframe Bitrix24
     * 
     * @param {Event} event - Событие клика
     */
    const handleCardClick = (event) => {
      // Предотвращаем клик, если идёт перетаскивание
      if (isDragging.value) {
        return;
      }
      
      const iframeUrl = getTicketIframeUrl(props.ticket.id);
      
      // Открываем всегда в новой вкладке (по требованию)
      window.open(iframeUrl, '_blank');

      emit('click', props.ticket);
    };

    return {
      getPriorityLabel,
      getStatusLabel,
      handleDragStart,
      handleDragEnd,
      handleCardClick,
      isDragEnabled
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

