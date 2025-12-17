<template>
  <div v-if="cellData" class="modal-overlay" @click="close">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Детализация трудозатрат</h2>
        <button class="close-button" @click="close">×</button>
      </div>
      <div class="modal-body">
        <p><strong>Сотрудник:</strong> {{ cellData.employee.name }}</p>
        <p><strong>Неделя:</strong> {{ cellData.week.weekNumber }}</p>
        <p><strong>Трудозатраты:</strong> {{ formatElapsedTime(cellData.elapsedTime) }}</p>
        <!-- Детализация будет добавлена в этапе TASK-050-07 -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatElapsedTime } from '@/services/tickets-time-tracking/timeTrackingUtils.js';

const props = defineProps({
  cellData: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close']);

const close = () => {
  emit('close');
};
</script>

<style scoped>
.modal-overlay {
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
  padding: 20px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h2 {
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.close-button:hover {
  color: #333;
}

.modal-body {
  line-height: 1.6;
}
</style>

