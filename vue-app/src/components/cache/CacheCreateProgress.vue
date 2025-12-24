<template>
  <div class="cache-create-progress">
    <div class="progress-bar">
      <div
        class="progress-fill"
        :style="{ width: progress + '%' }"
      ></div>
    </div>
    <div class="progress-text">
      {{ progress }}% - {{ message }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'CacheCreateProgress',
  props: {
    progress: {
      type: Number,
      required: true,
      validator: (value) => value >= 0 && value <= 100
    },
    message: {
      type: String,
      default: 'Создание кеша...'
    }
  }
};
</script>

<style scoped>
.cache-create-progress {
  padding: 20px;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background-color: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background-color: #28a745;
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  color: #666;
  font-size: 14px;
}
</style>

