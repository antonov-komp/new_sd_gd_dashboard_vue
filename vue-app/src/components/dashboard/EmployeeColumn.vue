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
        📊 Тикетов: {{ totalTicketsCount }}
      </div>
    </div>

    <div class="tickets-list">
      <!-- Тикеты внутри сектора (для сотрудников сектора 1С) -->
      <template v-if="employee.isFromSector1C">
        <div
          v-memo="[ticketsToDisplay.length, ticketsToDisplay.map(t => t.id).join(',')]"
        >
          <transition-group name="ticket" tag="div">
            <TicketCard
              v-for="ticket in ticketsToDisplay"
              :key="ticket.id"
              :ticket="ticket"
              :draggable="true"
              @click="$emit('ticket-clicked', ticket)"
              @drag-start="handleTicketDragStart"
            />
          </transition-group>
        </div>
      </template>
      
      <!-- Тикеты для сотрудников других секторов (с разделением) -->
      <template v-else>
        <!-- Тикеты внутри сектора (пусто для сотрудников других секторов) -->
        <div
          v-if="ticketsInsideSector.length > 0"
          v-memo="[ticketsInsideSector.length, ticketsInsideSector.map(t => t.id).join(',')]"
          class="tickets-section tickets-inside-sector"
        >
          <transition-group name="ticket" tag="div">
            <TicketCard
              v-for="ticket in ticketsInsideSector"
              :key="ticket.id"
              :ticket="ticket"
              :draggable="true"
              @click="$emit('ticket-clicked', ticket)"
              @drag-start="handleTicketDragStart"
            />
          </transition-group>
        </div>
        
        <!-- Тикеты вне сектора (отображаются в конце) -->
        <div
          v-if="ticketsOutsideSector.length > 0"
          v-memo="[ticketsOutsideSector.length, ticketsOutsideSector.map(t => t.id).join(',')]"
          class="tickets-section tickets-outside-sector"
        >
          <div class="section-header">
            <span class="section-badge">Вне сектора</span>
            <span class="section-count">{{ ticketsOutsideSector.length }}</span>
          </div>
          <transition-group name="ticket" tag="div">
            <TicketCard
              v-for="ticket in ticketsOutsideSector"
              :key="ticket.id"
              :ticket="ticket"
              :draggable="true"
              class="ticket-outside-sector"
              @click="$emit('ticket-clicked', ticket)"
              @drag-start="handleTicketDragStart"
            />
          </transition-group>
        </div>
      </template>
      
      <div v-if="totalTicketsCount === 0" class="empty-state">
        <p>Нет тикетов</p>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import TicketCard from './TicketCard.vue';
import { useDragAndDrop } from '@/composables/useDragAndDrop.js';
import { useLogger } from '@/composables/useLogger.js';

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
    const logger = useLogger('EmployeeColumn');
    
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
     * Тикеты внутри сектора
     * 
     * Для сотрудников сектора 1С — все тикеты
     * Для сотрудников других секторов — пустой массив
     */
    const ticketsInsideSector = computed(() => {
      if (props.employee.isFromSector1C) {
        // Сотрудник из сектора 1С — все тикеты внутри сектора
        return Array.isArray(props.employee.tickets) ? props.employee.tickets : [];
      } else {
        // Сотрудник из другого сектора — используем ticketsInsideSector, если доступно
        return Array.isArray(props.employee.ticketsInsideSector) 
          ? props.employee.ticketsInsideSector 
          : [];
      }
    });
    
    /**
     * Тикеты вне сектора
     * 
     * Для сотрудников сектора 1С — пустой массив
     * Для сотрудников других секторов — тикеты вне сектора
     */
    const ticketsOutsideSector = computed(() => {
      if (props.employee.isFromSector1C) {
        // Сотрудник из сектора 1С — нет тикетов вне сектора
        return [];
      } else {
        // Сотрудник из другого сектора — используем ticketsOutsideSector, если доступно
        return Array.isArray(props.employee.ticketsOutsideSector) 
          ? props.employee.ticketsOutsideSector 
          : (Array.isArray(props.employee.tickets) ? props.employee.tickets : []);
      }
    });
    
    /**
     * Тикеты для отображения (для сотрудников сектора 1С)
     * 
     * Используется только для сотрудников сектора 1С
     */
    const ticketsToDisplay = computed(() => {
      if (props.employee.isFromSector1C) {
        return Array.isArray(props.employee.tickets) ? props.employee.tickets : [];
      }
      return [];
    });
    
    /**
     * Общее количество тикетов
     */
    const totalTicketsCount = computed(() => {
      return ticketsInsideSector.value.length + ticketsOutsideSector.value.length;
    });
    
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

    return {
      // Состояние и методы из композабла
      isDropZoneActive: dragAndDrop.isDropZoneActive,
      handleDragOver: dragAndDrop.handleDragOver,
      handleDragLeave: dragAndDrop.handleDragLeave,
      handleDrop: handleDropWithContext,
      
      // Computed свойства для тикетов
      ticketsInsideSector,
      ticketsOutsideSector,
      ticketsToDisplay,
      totalTicketsCount,
      
      // Локальные методы
      handleTicketDragStart
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

/* Стили для разделения тикетов по секторам */
.tickets-section {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

.tickets-section:first-child {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.tickets-outside-sector {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 10px;
  margin-top: 10px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ffc107;
}

.section-badge {
  font-size: 12px;
  font-weight: 600;
  color: #856404;
  background: #ffc107;
  padding: 4px 8px;
  border-radius: 3px;
}

.section-count {
  font-size: 12px;
  color: #856404;
  font-weight: 600;
}

.ticket-outside-sector {
  border-left: 3px solid #ffc107;
}
</style>

