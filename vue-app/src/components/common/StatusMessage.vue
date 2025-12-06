<template>
  <div :class="['status-message', `status-message--${type}`]">
    <strong v-if="title">{{ title }}</strong>
    <p v-if="message">{{ message }}</p>
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'StatusMessage',
  props: {
    type: {
      type: String,
      required: true,
      validator: (value) => ['success', 'error', 'info', 'warning'].includes(value)
    },
    title: {
      type: String,
      default: null
    },
    message: {
      type: String,
      default: null
    }
  }
};
</script>

<style scoped>
.status-message {
  padding: 15px;
  border-left: 4px solid;
  margin: 20px 0;
  border-radius: 4px;
}

.status-message--success {
  background: #e8f5e9;
  border-color: #4caf50;
  color: #2e7d32;
}

.status-message--error {
  background: #ffebee;
  border-color: #f44336;
  color: #c62828;
}

.status-message--info {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #1565c0;
}

.status-message--warning {
  background: #fff3e0;
  border-color: #ff9800;
  color: #e65100;
}

.status-message strong {
  display: block;
  margin-bottom: 5px;
  font-size: 16px;
}

.status-message p {
  margin: 0;
  font-size: 14px;
}
</style>



