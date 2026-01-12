<template>
  <div class="analysis-panel">
    <div class="panel-placeholder">
      <div class="placeholder-icon">📊</div>
      <h3>Панель анализа пользователя</h3>
      <p>Детальный анализ активности выбранного пользователя</p>
      <div class="placeholder-note">
        <strong>Статус:</strong> В разработке (TASK-089 - Этап 4)
      </div>
      <div class="placeholder-actions">
        <button @click="$emit('back')" class="back-btn">← Назад к списку</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AnalysisPanel',
  emits: ['back', 'filter-change', 'export'],
  props: {
    user: {
      type: Object,
      default: null
    },
    activityData: {
      type: Object,
      default: () => ({})
    },
    filters: {
      type: Object,
      default: () => ({})
    },
    timeRange: {
      type: String,
      default: 'week'
    },
    isLoading: {
      type: Boolean,
      default: false
    }
  }
};
</script>

<style scoped>
.analysis-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  background: #f8f9fa;
}

.panel-placeholder {
  text-align: center;
  max-width: 500px;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.panel-placeholder h3 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.panel-placeholder p {
  margin: 0 0 20px 0;
  color: #666;
  font-size: 16px;
  line-height: 1.5;
}

.placeholder-note {
  background: #e3f2fd;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 24px;
  color: #1976d2;
  font-size: 14px;
}

.placeholder-actions {
  display: flex;
  justify-content: center;
}

.back-btn {
  padding: 10px 20px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.back-btn:hover {
  background: #1976d2;
}
</style>