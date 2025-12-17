<template>
  <Teleport to="body">
    <div
      v-if="cellData"
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      @click.self="close"
      @keydown.esc="close"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ modalTitle }}</h2>
          <button class="close-button" @click="close" aria-label="Закрыть">×</button>
        </div>
        
        <div class="modal-body">
          <!-- Попап по ячейке (сотрудник + неделя) -->
          <div v-if="cellData.type === 'cell' || (!cellData.type && cellData.employee && cellData.week)" class="detail-cell">
            <div class="detail-info">
              <p><strong>Сотрудник:</strong> {{ cellData.employee?.name || 'Неизвестно' }}</p>
              <p><strong>Неделя:</strong> {{ cellData.week?.weekNumber || '?' }}</p>
              <p><strong>Трудозатраты:</strong> {{ formatElapsedTime(cellData.elapsedTime || 0) }}</p>
            </div>
            
            <div v-if="cellData.week?.employees" class="tasks-list">
              <h3>Задачи и связанные тикеты:</h3>
              <div 
                v-for="employee in cellData.week.employees.filter(e => e.id === cellData.employee?.id)" 
                :key="employee.id"
                class="employee-tasks"
              >
                <div class="task-item" v-for="(task, index) in employee.tasks" :key="index">
                  <div class="task-header">
                    <span class="task-label">Задача #{{ task.id || index + 1 }}</span>
                    <span class="task-time">{{ formatElapsedTime(task.elapsedTime || 0) }}</span>
                  </div>
                  <div v-if="task.ticket" class="ticket-info">
                    <span class="ticket-label">Тикет #{{ task.ticket.id }}</span>
                    <span 
                      v-if="task.ticket.createdWeek && task.ticket.createdWeek !== cellData.week.weekNumber"
                      class="ticket-week-badge"
                      :title="`Тикет создан в неделе ${task.ticket.createdWeek}, трудозатрата записана в неделе ${cellData.week.weekNumber}`"
                    >
                      (создан в неделе {{ task.ticket.createdWeek }})
                    </span>
                    <div v-if="task.ticket.title" class="ticket-title">{{ task.ticket.title }}</div>
                  </div>
                  <div v-else class="ticket-info ticket-info--no-ticket">
                    <span class="no-ticket-label">Тикет не связан</span>
                  </div>
                </div>
              </div>
              
              <div class="detail-total">
                <p>
                  <strong>Итого:</strong> 
                  {{ formatElapsedTime(cellData.elapsedTime || 0) }} 
                  ({{ tasksCount }} задач, {{ ticketsCount }} тикетов)
                </p>
              </div>
            </div>
          </div>
          
          <!-- Попап по сотруднику -->
          <div v-else-if="cellData.type === 'employee'" class="detail-employee">
            <div class="detail-info">
              <p><strong>Сотрудник:</strong> {{ cellData.employee?.name || 'Неизвестно' }}</p>
              <p><strong>Период:</strong> {{ formatPeriod(cellData.weeks) }}</p>
            </div>
            
            <div class="weeks-list">
              <h3>Трудозатраты по неделям:</h3>
              <div 
                v-for="weekData in cellData.weeks" 
                :key="weekData.week.weekNumber"
                class="week-item"
              >
                <div class="week-header">
                  <span class="week-label">Неделя {{ weekData.week.weekNumber }}</span>
                  <span class="week-time">{{ formatElapsedTime(weekData.elapsedTime || 0) }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Попап по неделе -->
          <div v-else-if="cellData.type === 'week'" class="detail-week">
            <div class="detail-info">
              <p><strong>Неделя:</strong> {{ cellData.week?.weekNumber || '?' }}</p>
              <p><strong>Период:</strong> {{ formatWeekPeriod(cellData.week) }}</p>
              <p><strong>Общие трудозатраты:</strong> {{ formatElapsedTime(cellData.week?.totalElapsedTime || 0) }}</p>
            </div>
            
            <div class="employees-list">
              <h3>Трудозатраты по сотрудникам:</h3>
              <div 
                v-for="employeeData in cellData.employees" 
                :key="employeeData.employee.id"
                class="employee-item"
              >
                <div class="employee-header">
                  <span class="employee-label">{{ employeeData.employee.name }}</span>
                  <span class="employee-time">{{ formatElapsedTime(employeeData.elapsedTime || 0) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="close-btn" @click="close">Закрыть</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';
import { formatElapsedTime, getWeekLabel } from '@/services/tickets-time-tracking/timeTrackingUtils.js';

const props = defineProps({
  cellData: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close']);

const modalTitle = computed(() => {
  if (!props.cellData) return 'Детализация трудозатрат';
  
  if (props.cellData.type === 'employee') {
    return `Детализация: ${props.cellData.employee?.name || 'Сотрудник'}`;
  }
  
  if (props.cellData.type === 'week') {
    return `Детализация: Неделя ${props.cellData.week?.weekNumber || '?'}`;
  }
  
  // По умолчанию - попап по ячейке
  const employee = props.cellData.employee?.name || 'Сотрудник';
  const week = props.cellData.week?.weekNumber || '?';
  const time = formatElapsedTime(props.cellData.elapsedTime || 0);
  return `Детализация: ${employee}, Неделя ${week} (${time})`;
});

const tasksCount = computed(() => {
  if (!props.cellData?.week?.employees) return 0;
  const employee = props.cellData.week.employees.find(e => e.id === props.cellData.employee?.id);
  return employee?.tasksCount || 0;
});

const ticketsCount = computed(() => {
  if (!props.cellData?.week?.employees) return 0;
  const employee = props.cellData.week.employees.find(e => e.id === props.cellData.employee?.id);
  return employee?.ticketsCount || 0;
});

const formatPeriod = (weeks) => {
  if (!weeks || weeks.length === 0) return 'Период не указан';
  if (weeks.length === 1) {
    return getWeekLabel(weeks[0].week.weekNumber, weeks[0].week.weekStartUtc);
  }
  const firstWeek = weeks[0].week;
  const lastWeek = weeks[weeks.length - 1].week;
  return `${getWeekLabel(firstWeek.weekNumber, firstWeek.weekStartUtc)} - ${getWeekLabel(lastWeek.weekNumber, lastWeek.weekStartUtc)}`;
};

const formatWeekPeriod = (week) => {
  if (!week) return 'Период не указан';
  return getWeekLabel(week.weekNumber, week.weekStartUtc);
};

const close = () => {
  emit('close');
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  padding: 0;
  max-width: 700px;
  width: 90%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #dee2e6;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
}

.close-button {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #666;
  line-height: 1;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.detail-info {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e5e7eb;
}

.detail-info p {
  margin: 8px 0;
  font-size: 14px;
}

.tasks-list h3,
.weeks-list h3,
.employees-list h3 {
  margin-top: 20px;
  margin-bottom: 15px;
  font-size: 16px;
  font-weight: bold;
}

.task-item {
  margin-bottom: 15px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #007bff;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-label {
  font-weight: bold;
  color: #333;
}

.task-time {
  font-weight: bold;
  color: #007bff;
}

.ticket-info {
  margin-top: 8px;
  padding-left: 20px;
  font-size: 13px;
  color: #666;
}

.ticket-label {
  font-weight: 500;
  color: #28a745;
}

.ticket-week-badge {
  margin-left: 8px;
  padding: 2px 6px;
  background-color: #fff3cd;
  color: #856404;
  border-radius: 3px;
  font-size: 11px;
}

.ticket-title {
  margin-top: 4px;
  font-style: italic;
  color: #555;
}

.ticket-info--no-ticket {
  color: #999;
}

.no-ticket-label {
  font-style: italic;
}

.detail-total {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 2px solid #dee2e6;
  font-size: 14px;
}

.week-item,
.employee-item {
  margin-bottom: 10px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.week-header,
.employee-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.week-label,
.employee-label {
  font-weight: 500;
  color: #333;
}

.week-time,
.employee-time {
  font-weight: bold;
  color: #007bff;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #dee2e6;
  display: flex;
  justify-content: flex-end;
}

.close-btn {
  padding: 8px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.close-btn:hover {
  background-color: #0056b3;
}

/* Адаптивность для мобильных */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 90vh;
  }
  
  .modal-header {
    padding: 15px;
  }
  
  .modal-header h2 {
    font-size: 18px;
  }
  
  .modal-body {
    padding: 15px;
  }
  
  .task-item {
    padding: 10px;
  }
}
</style>

