<template>
  <div class="ttt-summary">
    <div class="summary-cards">
      <div class="summary-card summary-card--total">
        <div class="summary-card__icon">⏱</div>
        <div class="summary-card__content">
          <div class="summary-card__label">Общая сумма трудозатрат</div>
          <div class="summary-card__value">
            {{ formatTotalTime }}
          </div>
        </div>
      </div>
      
      <div class="summary-card summary-card--employees">
        <div class="summary-card__icon">👥</div>
        <div class="summary-card__content">
          <div class="summary-card__label">Сотрудников в секторе</div>
          <div class="summary-card__value">
            {{ employeesCount }}
          </div>
        </div>
      </div>
      
      <div class="summary-card summary-card--average">
        <div class="summary-card__icon">📊</div>
        <div class="summary-card__content">
          <div class="summary-card__label">Средняя на сотрудника</div>
          <div class="summary-card__value">
            {{ formatAverageTime }}
          </div>
        </div>
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

const totalElapsedTime = computed(() => {
  return props.data?.data?.totalElapsedTime || 0;
});

const employeesCount = computed(() => {
  return props.data?.meta?.sector1CEmployeesCount || 0;
});

const averagePerEmployee = computed(() => {
  const total = totalElapsedTime.value;
  const count = employeesCount.value;
  return count > 0 ? total / count : 0;
});

const formatTotalTime = computed(() => {
  if (totalElapsedTime.value === 0) {
    return '0.0 ч';
  }
  return formatElapsedTime(totalElapsedTime.value, 1);
});

const formatAverageTime = computed(() => {
  if (averagePerEmployee.value === 0) {
    return '0.00 ч';
  }
  return formatElapsedTime(averagePerEmployee.value, 2);
});
</script>

<style scoped>
.ttt-summary {
  margin-bottom: 30px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.summary-card {
  display: flex;
  align-items: flex-start;
  padding: 20px;
  background-color: #ffffff;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.summary-card__icon {
  font-size: 32px;
  margin-right: 15px;
  flex-shrink: 0;
}

.summary-card--total .summary-card__icon {
  color: #007bff;
}

.summary-card--employees .summary-card__icon {
  color: #28a745;
}

.summary-card--average .summary-card__icon {
  color: #ffc107;
}

.summary-card__content {
  flex: 1;
}

.summary-card__label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  line-height: 1.4;
}

.summary-card__value {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  line-height: 1.2;
}

.summary-card--total .summary-card__value {
  color: #007bff;
}

.summary-card--employees .summary-card__value {
  color: #28a745;
}

.summary-card--average .summary-card__value {
  color: #ffc107;
}

/* Адаптивность для мобильных */
@media (max-width: 768px) {
  .summary-cards {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .summary-card {
    padding: 15px;
  }
  
  .summary-card__icon {
    font-size: 28px;
    margin-right: 12px;
  }
  
  .summary-card__value {
    font-size: 24px;
  }
}
</style>

