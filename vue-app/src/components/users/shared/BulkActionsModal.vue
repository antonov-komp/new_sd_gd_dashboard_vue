<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Массовые действия</h3>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>

      <div class="modal-body">
        <div class="selected-summary">
          <p>Выбрано пользователей: <strong>{{ selectedUsers.length }}</strong></p>
          <div class="selected-list">
            <div
              v-for="user in selectedUsers.slice(0, 5)"
              :key="user.id"
              class="selected-user"
            >
              {{ user.name }}
            </div>
            <div v-if="selectedUsers.length > 5" class="more-users">
              ... и ещё {{ selectedUsers.length - 5 }}
            </div>
          </div>
        </div>

        <div class="actions-list">
          <div
            v-for="action in availableActions"
            :key="action.id"
            class="action-item"
          >
            <div class="action-header">
              <div class="action-icon">{{ action.icon || '⚙️' }}</div>
              <div class="action-info">
                <h4>{{ action.label }}</h4>
                <p>{{ action.description }}</p>
              </div>
            </div>
            <button
              @click="selectAction(action)"
              class="action-btn"
              :disabled="!canExecuteAction(action)"
            >
              Выполнить
            </button>
          </div>
        </div>

        <div class="placeholder-note">
          <strong>Статус:</strong> Массовые действия в разработке
        </div>
      </div>

      <div class="modal-footer">
        <button @click="$emit('close')" class="cancel-btn">Отмена</button>
        <button
          v-if="selectedAction"
          @click="executeAction"
          class="execute-btn"
        >
          Выполнить "{{ selectedAction.label }}"
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BulkActionsModal',
  emits: ['close', 'execute'],
  props: {
    selectedUsers: {
      type: Array,
      default: () => []
    },
    availableActions: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      selectedAction: null
    };
  },
  methods: {
    selectAction(action) {
      this.selectedAction = action;
    },

    canExecuteAction(action) {
      // Простая проверка - можно расширить логику прав доступа
      return this.selectedUsers.length > 0;
    },

    executeAction() {
      if (this.selectedAction) {
        this.$emit('execute', this.selectedAction);
        this.$emit('close');
      }
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f8f9fa;
  color: #333;
}

.modal-body {
  padding: 24px;
}

.selected-summary {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.selected-summary p {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #333;
}

.selected-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-user {
  padding: 4px 8px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 14px;
  color: #333;
}

.more-users {
  padding: 4px 8px;
  background: #e9ecef;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 14px;
  color: #666;
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.action-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: #f8f9fa;
}

.action-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.action-icon {
  font-size: 24px;
  width: 40px;
  text-align: center;
}

.action-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.action-info p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.action-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: #0056b3;
}

.action-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.placeholder-note {
  background: #fff3cd;
  padding: 12px 16px;
  border-radius: 6px;
  color: #856404;
  font-size: 14px;
  text-align: center;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e9ecef;
}

.cancel-btn,
.execute-btn {
  padding: 8px 16px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.cancel-btn {
  background: white;
  color: #6c757d;
}

.cancel-btn:hover {
  background: #f8f9fa;
}

.execute-btn {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.execute-btn:hover {
  background: #218838;
}
</style>