<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Профиль пользователя</h3>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>

      <div class="modal-body">
        <div v-if="user" class="user-profile">
          <div class="user-avatar">
            <img
              v-if="user.avatar"
              :src="user.avatar"
              :alt="`Аватар ${user.name}`"
            />
            <div v-else class="avatar-placeholder">
              {{ user.name.charAt(0) }}
            </div>
          </div>

          <div class="user-info">
            <h4>{{ user.name }}</h4>
            <p class="user-email">{{ user.email }}</p>
            <p class="user-role">
              <span v-if="user.is_admin" class="admin-badge">Администратор</span>
              <span v-else>Пользователь</span>
            </p>
          </div>
        </div>

        <div class="placeholder-note">
          <strong>Статус:</strong> Модальное окно профиля в разработке
        </div>
      </div>

      <div class="modal-footer">
        <button @click="$emit('close')" class="cancel-btn">Закрыть</button>
        <button @click="handleSave" class="save-btn">Сохранить</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UserProfileModal',
  emits: ['close', 'save'],
  props: {
    user: {
      type: Object,
      default: null
    },
    activityData: {
      type: Object,
      default: () => ({})
    }
  },
  methods: {
    handleSave() {
      // Имитация сохранения
      this.$emit('save', this.user);
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
  max-width: 500px;
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

.user-profile {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: #007bff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
}

.user-info h4 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.user-email {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 14px;
}

.user-role {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.admin-badge {
  background: #dc3545;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.placeholder-note {
  background: #e3f2fd;
  padding: 12px 16px;
  border-radius: 6px;
  color: #1976d2;
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
.save-btn {
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

.save-btn {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.save-btn:hover {
  background: #0056b3;
  border-color: #0056b3;
}
</style>