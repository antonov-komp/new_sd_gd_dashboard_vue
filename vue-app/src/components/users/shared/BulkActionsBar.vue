<template>
  <div class="bulk-actions-bar" v-if="selectedUsers.length > 0">
    <div class="bar-content">
      <div class="selection-info">
        <span class="selection-count">
          Выбрано: {{ selectedUsers.length }}
        </span>
        <span class="selection-text">
          {{ selectedUsers.length === 1 ? 'пользователь' : 'пользователей' }}
        </span>
      </div>

      <div class="actions-list">
        <button
          v-for="action in availableActions"
          :key="action.id"
          @click="$emit('execute', action)"
          class="action-btn"
          :class="action.class"
          :title="action.description"
        >
          <span class="action-icon" v-if="action.icon">{{ action.icon }}</span>
          <span class="action-text">{{ action.label }}</span>
        </button>
      </div>

      <button
        @click="$emit('clear-selection')"
        class="clear-btn"
        title="Очистить выбор"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BulkActionsBar',
  emits: ['execute', 'clear-selection'],
  props: {
    selectedUsers: {
      type: Array,
      default: () => []
    },
    availableActions: {
      type: Array,
      default: () => []
    }
  }
};
</script>

<style scoped>
.bulk-actions-bar {
  background: #007bff;
  color: white;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.selection-count {
  font-size: 16px;
  font-weight: 700;
}

.selection-text {
  font-size: 14px;
}

.actions-list {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

.action-icon {
  font-size: 14px;
}

.clear-btn {
  padding: 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.2s ease;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

/* Responsive */
@media (max-width: 768px) {
  .bulk-actions-bar {
    padding: 10px 12px;
  }

  .bar-content {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .actions-list {
    justify-content: flex-start;
    order: -1;
  }

  .selection-info {
    justify-content: center;
  }

  .clear-btn {
    align-self: flex-end;
    width: 28px;
    height: 28px;
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .actions-list {
    flex-direction: column;
    gap: 6px;
  }

  .action-btn {
    justify-content: center;
    width: 100%;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .bulk-actions-bar,
  .action-btn,
  .clear-btn {
    animation: none;
    transition: none;
  }

  .action-btn:hover,
  .clear-btn:hover {
    transform: none;
  }
}
</style>