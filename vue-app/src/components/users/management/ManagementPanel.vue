<template>
  <div class="management-panel">
    <div class="panel-placeholder">
      <div class="placeholder-icon">⚙️</div>
      <h3>Панель управления правами</h3>
      <p>Управление правами доступа и ролями пользователей</p>
      <div class="placeholder-note">
        <strong>Статус:</strong> В разработке (TASK-089 - Этап 5)
      </div>

      <!-- Выбранные пользователи -->
      <div v-if="selectedUsers.length > 0" class="selected-info">
        <h4>Выбрано пользователей: {{ selectedUsers.length }}</h4>
        <div class="selected-list">
          <div
            v-for="user in selectedUsers.slice(0, 3)"
            :key="user.id"
            class="selected-user"
          >
            <span class="user-name">{{ user.name }}</span>
            <span class="user-email">{{ user.email }}</span>
          </div>
        </div>
      </div>

      <div class="placeholder-actions">
        <button @click="$emit('back')" class="back-btn">← Назад к списку</button>
        <button
          v-if="selectedUsers.length > 0"
          @click="handleBulkPermissions"
          class="permissions-btn"
        >
          Изменить права ({{ selectedUsers.length }})
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ManagementPanel',
  emits: ['back', 'permissions-change', 'bulk-update'],
  props: {
    selectedUsers: {
      type: Array,
      default: () => []
    },
    allUsers: {
      type: Array,
      default: () => []
    },
    departments: {
      type: Array,
      default: () => []
    },
    auditLog: {
      type: Array,
      default: () => []
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    canEditPermissions: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    handleBulkPermissions() {
      // Имитация массового изменения прав
      this.$emit('bulk-update', 'change_permissions', {
        is_admin: false,
        department_id: 369
      });
    }
  }
};
</script>

<style scoped>
.management-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  background: #f8f9fa;
}

.panel-placeholder {
  text-align: center;
  max-width: 600px;
  width: 100%;
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
  background: #fff3cd;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 24px;
  color: #856404;
  font-size: 14px;
}

.selected-info {
  text-align: left;
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.selected-info h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 16px;
}

.selected-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selected-user {
  padding: 8px 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.user-name {
  display: block;
  font-weight: 500;
  color: #333;
}

.user-email {
  display: block;
  font-size: 12px;
  color: #666;
}

.placeholder-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.back-btn,
.permissions-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.back-btn {
  background: #6c757d;
  color: white;
}

.back-btn:hover {
  background: #5a6268;
}

.permissions-btn {
  background: #28a745;
  color: white;
}

.permissions-btn:hover {
  background: #218838;
}

.permissions-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}
</style>