<template>
  <Teleport to="body">
    <div
      v-if="isVisible"
      class="employee-details-modal"
      @click.self="close"
      @keydown.esc="close"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ stageName }}</h3>
          <span class="modal-total">Всего: {{ totalCount }} тикетов</span>
          <button class="modal-close" @click="close" aria-label="Закрыть">×</button>
        </div>
        <div class="modal-body">
          <div v-if="employees.length === 0 && (!others || others.count === 0)" class="no-employees">
            Нет данных о сотрудниках
          </div>
          <div v-else class="employees-list">
            <div
              v-for="employee in employees"
              :key="employee.id"
              :class="['employee-item', { 'employee-keeper': employee.isKeeper }]"
            >
              <span class="employee-name">{{ employee.name }}</span>
              <div class="employee-progress">
                <div
                  class="progress-bar"
                  :style="{
                    width: employee.progressBarWidth + '%',
                    backgroundColor: employee.progressBarColor
                  }"
                ></div>
              </div>
              <span class="employee-count">
                {{ employee.count }} тикетов ({{ employee.percentage }}%)
              </span>
            </div>
            <div v-if="others && others.count > 0" class="employee-item employee-others">
              <span class="employee-name">Другие ({{ others.employeeCount }})</span>
              <div class="employee-progress">
                <div
                  class="progress-bar"
                  :style="{
                    width: others.progressBarWidth + '%',
                    backgroundColor: others.progressBarColor
                  }"
                ></div>
              </div>
              <span class="employee-count">
                {{ others.count }} тикетов ({{ others.percentage }}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * Компонент модального окна с детализацией по сотрудникам
 * 
 * Используется для отображения детализации по сотрудникам при клике на точку графика
 * 
 * Дата создания: 2025-12-11 (UTC+3, Брест)
 * Задача: TASK-031-03
 */

const props = defineProps({
  /**
   * Видимость модального окна
   */
  isVisible: {
    type: Boolean,
    default: false
  },
  /**
   * Название этапа
   */
  stageName: {
    type: String,
    required: true
  },
  /**
   * Общее количество тикетов этапа
   */
  totalCount: {
    type: Number,
    required: true
  },
  /**
   * Массив сотрудников с данными
   */
  employees: {
    type: Array,
    default: () => []
  },
  /**
   * Данные о группе "Другие" (если сотрудников > 10)
   */
  others: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close']);

/**
 * Закрытие модального окна
 */
function close() {
  emit('close');
}
</script>

<style scoped>
.employee-details-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: var(--b24-bg-white, #ffffff);
  border-radius: var(--radius-lg, 8px);
  box-shadow: var(--shadow-lg, 0 10px 25px rgba(0, 0, 0, 0.2));
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--b24-border-light, #e5e7eb);
  gap: 12px;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--b24-text-primary, #1f2937);
  flex: 1;
}

.modal-total {
  font-size: 14px;
  font-weight: 500;
  color: var(--b24-text-secondary, #6b7280);
  background-color: var(--b24-bg-light, #f3f4f6);
  padding: 4px 12px;
  border-radius: var(--radius-xl, 9999px);
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  line-height: 1;
  color: var(--b24-text-secondary, #6b7280);
  cursor: pointer;
  border-radius: var(--radius-sm, 4px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background-color: var(--b24-bg-light, #f3f4f6);
  color: var(--b24-text-primary, #1f2937);
}

.modal-body {
  padding: 20px;
}

.no-employees {
  text-align: center;
  padding: 40px 20px;
  color: var(--b24-text-muted, #9ca3af);
  font-size: 14px;
  font-style: italic;
}

.employees-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.employee-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: var(--b24-bg-light, #f3f4f6);
  border-radius: var(--radius-md, 6px);
  border-left: 3px solid var(--b24-primary, #007bff);
  transition: background-color 0.2s ease;
}

.employee-item:hover {
  background-color: var(--b24-bg, #f9fafb);
}

.employee-item.employee-keeper {
  border-left-color: var(--b24-warning, #ffc107);
  background-color: var(--b24-warning-lighter, #fff8e1);
}

.employee-item.employee-keeper:hover {
  background-color: var(--b24-warning-light, #fff59d);
}

.employee-item.employee-others {
  border-left-color: var(--b24-text-muted, #9ca3af);
  background-color: var(--b24-bg, #f9fafb);
}

.employee-name {
  min-width: 150px;
  font-size: 14px;
  font-weight: 500;
  color: var(--b24-text-primary, #1f2937);
}

.employee-progress {
  flex: 1;
  height: 20px;
  background-color: var(--b24-bg-white, #ffffff);
  border-radius: var(--radius-sm, 4px);
  overflow: hidden;
  margin: 0 12px;
  border: 1px solid var(--b24-border-light, #e5e7eb);
}

.progress-bar {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: var(--radius-sm, 4px);
}

.employee-count {
  min-width: 120px;
  font-size: 14px;
  font-weight: 600;
  color: var(--b24-text-secondary, #6b7280);
  text-align: right;
}

/* Анимации */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Адаптивность */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 90vh;
  }

  .modal-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .modal-total {
    align-self: flex-start;
  }

  .employee-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .employee-name {
    min-width: auto;
    width: 100%;
  }

  .employee-progress {
    width: 100%;
    margin: 0;
  }

  .employee-count {
    min-width: auto;
    text-align: left;
    width: 100%;
  }
}
</style>

