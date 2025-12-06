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
import TicketCard from './TicketCard.vue';
import { useDragAndDrop } from '@/composables/useDragAndDrop.js';

/**
 * Компонент колонки сотрудника
 * 
 * Отображает информацию о сотруднике и его тикетах
 * Поддерживает Drag & Drop для назначения тикетов сотруднику
 * 
 * Использует композабл useDragAndDrop для логики перетаскивания
 * 
 * @component
 * @prop {Object} employee - Объект сотрудника с тикетами
 * @prop {string} stageId - ID этапа
 * @emits {Object, number} ticket-dropped - Тикет сброшен на сотрудника
 * @emits {Object} ticket-clicked - Тикет кликнут
 */
export default {
  name: 'EmployeeColumn',
  components: {
    TicketCard
  },
  props: {
    /**
     * Объект сотрудника
     * @type {Object}
     * @property {number} id - ID сотрудника
     * @property {string} name - Имя сотрудника
     * @property {string} position - Должность
     * @property {Array} tickets - Массив тикетов сотрудника
     */
    employee: {
      type: Object,
      required: true
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
  emits: ['ticket-clicked', 'ticket-dropped'],
  setup(props, { emit }) {
    /**
     * Callback при сбросе тикета
     * 
     * @param {Object} ticket - Тикет
     * @param {number} employeeId - ID сотрудника
     * @param {string} stageId - ID этапа
     */
    const onDrop = async (ticket, employeeId, stageId) => {
      // employeeId и stageId уже переданы из handleDrop
      emit('ticket-dropped', ticket, employeeId);
    };

    // Используем композабл для Drag & Drop
    const dragAndDrop = useDragAndDrop(onDrop);
    
    /**
     * Обработчик сброса с передачей ID сотрудника и этапа
     * 
     * @param {DragEvent} event - Событие drop
     */
    const handleDropWithContext = (event) => {
      dragAndDrop.handleDrop(event, props.employee.id, props.stageId);
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
      // Состояние и методы из композабла
      isDropZoneActive: dragAndDrop.isDropZoneActive,
      handleDragOver: dragAndDrop.handleDragOver,
      handleDragLeave: dragAndDrop.handleDragLeave,
      handleDrop: handleDropWithContext,
      
      // Локальные методы
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

