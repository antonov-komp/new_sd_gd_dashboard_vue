<template>
  <div class="empty-state" :class="`empty-state-${variant}`">
    <div class="empty-icon">{{ icon }}</div>
    <h3 class="empty-title">{{ title }}</h3>
    <p class="empty-description">{{ description }}</p>
    <div v-if="hints && hints.length > 0" class="empty-hints">
      <div 
        v-for="(hint, index) in hints" 
        :key="index"
        class="hint-item"
      >
        💡 {{ hint }}
      </div>
    </div>
    <div v-if="actionLabel || actions" class="empty-actions">
      <button 
        v-if="actionLabel"
        @click="$emit('action')" 
        class="btn-primary"
      >
        {{ actionLabel }}
      </button>
      <button
        v-for="(action, index) in actions"
        :key="index"
        @click="$emit('action-click', action.id)"
        :class="['btn', `btn-${action.variant || 'secondary'}`]"
      >
        {{ action.label }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EmptyState',
  props: {
    icon: {
      type: String,
      default: '📭'
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    actionLabel: {
      type: String,
      default: null
    },
    actions: {
      type: Array,
      default: null
    },
    hints: {
      type: Array,
      default: () => []
    },
    variant: {
      type: String,
      default: 'default',
      validator: (v) => ['default', 'error', 'warning', 'info'].includes(v)
    }
  },
  emits: ['action', 'action-click']
};
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  min-height: 300px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.6;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px 0;
}

.empty-description {
  font-size: 14px;
  color: #666;
  margin: 0 0 24px 0;
  max-width: 400px;
}

.empty-hints {
  margin: 20px 0;
  text-align: left;
  max-width: 400px;
}

.hint-item {
  font-size: 13px;
  color: #666;
  margin: 8px 0;
  padding: 8px 12px;
  background: #f9f9f9;
  border-radius: 4px;
}

.empty-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #2196F3;
  color: white;
}

.btn-primary:hover {
  background: #1976d2;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.empty-state-error .empty-icon {
  color: #dc3545;
}

.empty-state-warning .empty-icon {
  color: #ffc107;
}

.empty-state-info .empty-icon {
  color: #2196F3;
}
</style>

