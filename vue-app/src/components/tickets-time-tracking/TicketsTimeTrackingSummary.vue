<template>
  <div class="time-tracking-summary">
    <div class="summary-cards">
      <div class="summary-card">
        <div class="card-label">Общая сумма трудозатрат</div>
        <div class="card-value">{{ formatElapsedTime(data.data.totalElapsedTime) }}</div>
      </div>
      <div class="summary-card">
        <div class="card-label">Сотрудников в секторе</div>
        <div class="card-value">{{ data.meta.sector1CEmployeesCount }}</div>
      </div>
      <div class="summary-card">
        <div class="card-label">Средняя на сотрудника</div>
        <div class="card-value">{{ formatElapsedTime(averagePerEmployee) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatElapsedTime } from '@/services/tickets-time-tracking/timeTrackingUtils.js';

const props = defineProps({
  data: {
    type: Object,
    required: true
  }
});

const averagePerEmployee = computed(() => {
  const total = props.data.data.totalElapsedTime || 0;
  const count = props.data.meta.sector1CEmployeesCount || 0;
  return count > 0 ? total / count : 0;
});
</script>

<style scoped>
.time-tracking-summary {
  margin-bottom: 30px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.summary-card {
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.card-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}
</style>

