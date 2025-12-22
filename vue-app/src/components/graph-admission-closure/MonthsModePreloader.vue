<template>
  <div class="months-preloader">
    <div class="preloader-content">
      <div class="preloader-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      
      <h3 class="preloader-title">Загрузка данных за 3 месяца</h3>
      
      <div class="progress-container">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
        <div class="progress-text">{{ Math.round(progress) }}%</div>
      </div>
      
      <p class="preloader-message">{{ currentStage }}</p>
      
      <div class="stages-list">
        <div
          v-for="(stage, index) in stages"
          :key="index"
          class="stage-item"
          :class="{
            'stage-completed': isStageCompleted(index),
            'stage-current': isStageCurrent(index)
          }"
        >
          <span class="stage-icon">
            {{ isStageCompleted(index) ? '✓' : isStageCurrent(index) ? '→' : '○' }}
          </span>
          <span class="stage-text">{{ stage.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  progress: {
    type: Number,
    required: true,
    validator: (value) => value >= 0 && value <= 100
  },
  currentStage: {
    type: String,
    default: ''
  }
});

// TASK-059-04: Обновлённые этапы загрузки, отражающие реальные этапы выполнения
const stages = [
  { label: 'Подготовка данных...', threshold: 5 },
  { label: 'Загрузка данных за период (запрос 1)...', threshold: 35 },
  { label: 'Загрузка данных за период (запрос 2)...', threshold: 65 },
  { label: 'Загрузка данных за период (запрос 3)...', threshold: 85 },
  { label: 'Агрегация данных...', threshold: 90 },
  { label: 'Формирование графиков...', threshold: 100 }
];

/**
 * Проверка, завершён ли этап
 */
function isStageCompleted(index) {
  return props.progress >= stages[index].threshold;
}

/**
 * Проверка, является ли этап текущим
 */
function isStageCurrent(index) {
  const currentThreshold = stages[index].threshold;
  const prevThreshold = index > 0 ? stages[index - 1].threshold : 0;
  return props.progress >= prevThreshold && props.progress < currentThreshold;
}
</script>

<style scoped>
.months-preloader {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 70vh;
  padding: 60px 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: var(--radius-lg, 12px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.preloader-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  max-width: 500px;
  width: 100%;
}

.preloader-spinner {
  position: relative;
  width: 80px;
  height: 80px;
  margin-bottom: 32px;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 4px solid transparent;
  border-top-color: var(--b24-primary, #007bff);
  border-radius: 50%;
  animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.spinner-ring:nth-child(1) {
  animation-delay: 0s;
  border-top-color: var(--b24-primary, #007bff);
  opacity: 1;
}

.spinner-ring:nth-child(2) {
  animation-delay: -0.4s;
  border-top-color: var(--b24-success, #28a745);
  opacity: 0.7;
  width: 70%;
  height: 70%;
  top: 15%;
  left: 15%;
}

.spinner-ring:nth-child(3) {
  animation-delay: -0.8s;
  border-top-color: #ff9800;
  opacity: 0.5;
  width: 50%;
  height: 50%;
  top: 25%;
  left: 25%;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.preloader-title {
  margin: 0 0 24px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
  letter-spacing: -0.02em;
}

.progress-container {
  width: 100%;
  margin-bottom: 24px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: var(--b24-bg-light, #f5f7fb);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--b24-primary, #007bff) 0%, var(--b24-success, #28a745) 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
  will-change: width;
}

.progress-text {
  font-size: var(--font-size-sm, 14px);
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
  text-align: center;
}

.preloader-message {
  margin: 0 0 24px 0;
  font-size: var(--font-size-base, 14px);
  color: var(--b24-text-secondary, #6b7280);
  font-weight: 500;
  min-height: 20px;
}

.stages-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs, 4px);
  text-align: left;
}

.stage-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  font-size: var(--font-size-sm, 14px);
  padding: var(--spacing-xs, 4px) 0;
  color: var(--b24-text-secondary, #6b7280);
  transition: color 0.2s ease;
}

.stage-item.stage-completed {
  color: var(--b24-success, #28a745);
}

.stage-item.stage-current {
  color: var(--b24-primary, #007bff);
  font-weight: 600;
}

.stage-icon {
  font-size: 16px;
  font-weight: 600;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.stage-text {
  flex: 1;
}

/* Адаптивность */
@media (max-width: 768px) {
  .months-preloader {
    min-height: 400px;
    padding: 40px 20px;
  }
  
  .preloader-spinner {
    width: 60px;
    height: 60px;
    margin-bottom: 24px;
  }
  
  .preloader-title {
    font-size: 18px;
  }
  
  .stages-list {
    font-size: var(--font-size-xs, 12px);
  }
}
</style>

