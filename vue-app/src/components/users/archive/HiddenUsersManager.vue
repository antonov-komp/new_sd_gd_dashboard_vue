<template>
  <div class="hidden-users-manager">
    <div class="manager-controls">
      <div class="dropdown-wrapper">
        <label class="dropdown-label">
          👁️ Скрыть пользователей:
        </label>
        <select
          v-model="selectedUsers"
          multiple
          class="users-dropdown"
          :disabled="loading || availableUsers.length === 0"
          size="5"
        >
          <option
            v-for="user in availableUsers"
            :key="user.id"
            :value="user.id"
          >
            {{ user.name }} ({{ user.count }} {{ user.count === 1 ? 'запись' : 'записей' }})
          </option>
        </select>
        <div v-if="availableUsers.length === 0 && !loading" class="empty-hint">
          Нет пользователей в записях активности
        </div>
      </div>
      
      <div class="actions">
        <button
          @click="applySelection"
          class="apply-btn"
          :disabled="loading"
          title="Применить выбранные пользователи для скрытия"
        >
          Применить
        </button>
        <button
          v-if="hiddenUsers.length > 0"
          @click="showAll"
          class="show-all-btn"
          :disabled="loading"
          title="Показать всех пользователей"
        >
          Показать всех ({{ hiddenUsers.length }})
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="loading">
      Загрузка...
    </div>
    
    <div v-if="error" class="error">
      {{ error }}
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import {
  getHiddenUsers,
  hideUser,
  showUser,
  clearHiddenUsers,
  getUsersFromActivity
} from '@/utils/hidden-users-manager.js';
import { UserActivityService } from '@/services/user-activity-service.js';

export default {
  name: 'HiddenUsersManager',
  props: {
    filters: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['hidden-users-changed'],
  setup(props, { emit }) {
    const loading = ref(false);
    const error = ref(null);
    const activity = ref([]);
    const selectedUsers = ref([]);
    
    // Получить список пользователей из активности
    const availableUsers = computed(() => {
      return getUsersFromActivity(activity.value);
    });
    
    // Получить список скрытых пользователей
    const hiddenUsers = computed(() => {
      const hidden = getHiddenUsers();
      return availableUsers.value.filter(user => hidden.includes(user.id));
    });
    
    // Загрузить активность для получения списка пользователей
    const loadActivity = async () => {
      loading.value = true;
      error.value = null;
      
      try {
        const options = {
          ...props.filters,
          limit: 1000 // Большой лимит для получения всех пользователей
        };
        
        activity.value = await UserActivityService.getActivity(options);
        
        // Устанавливаем выбранных пользователей (текущие скрытые)
        const hidden = getHiddenUsers();
        selectedUsers.value = hidden.filter(id => 
          availableUsers.value.some(user => user.id === id)
        );
      } catch (err) {
        error.value = err.message || 'Ошибка загрузки пользователей';
        console.error('[HiddenUsersManager] Error loading activity:', err);
      } finally {
        loading.value = false;
      }
    };
    
    // Применить выбранных пользователей для скрытия
    const applySelection = () => {
      const currentHidden = getHiddenUsers();
      const selectedIds = selectedUsers.value.map(id => Number(id));
      
      // Скрываем выбранных пользователей
      selectedIds.forEach(userId => {
        if (!currentHidden.includes(userId)) {
          hideUser(userId);
        }
      });
      
      // Показываем пользователей, которые были скрыты, но не выбраны
      currentHidden.forEach(userId => {
        if (!selectedIds.includes(userId)) {
          showUser(userId);
        }
      });
      
      // Отправляем события для обновления компонентов
      emit('hidden-users-changed');
      window.dispatchEvent(new CustomEvent('hidden-users-changed'));
    };
    
    // Показать всех пользователей
    const showAll = () => {
      clearHiddenUsers();
      selectedUsers.value = [];
      
      // Отправляем события для обновления компонентов
      emit('hidden-users-changed');
      window.dispatchEvent(new CustomEvent('hidden-users-changed'));
    };
    
    onMounted(() => {
      loadActivity();
    });
    
    watch(() => props.filters, () => {
      loadActivity();
    }, { deep: true });
    
    // Обновляем выбранных пользователей при изменении скрытых
    watch(() => hiddenUsers.value, (newHidden) => {
      selectedUsers.value = newHidden.map(user => user.id);
    }, { deep: true });
    
    return {
      loading,
      error,
      availableUsers,
      hiddenUsers,
      selectedUsers,
      applySelection,
      showAll
    };
  }
};
</script>

<style scoped>
.hidden-users-manager {
  margin-top: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.manager-controls {
  display: flex;
  gap: 15px;
  align-items: flex-start;
}

.dropdown-wrapper {
  flex: 1;
  min-width: 250px;
}

.dropdown-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.users-dropdown {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.users-dropdown:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.6;
}

.users-dropdown option {
  padding: 4px;
}

.empty-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
  font-style: italic;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.apply-btn,
.show-all-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.apply-btn {
  background: #2196F3;
  color: white;
}

.apply-btn:hover:not(:disabled) {
  background: #1976D2;
}

.apply-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.show-all-btn {
  background: #ff9800;
  color: white;
}

.show-all-btn:hover:not(:disabled) {
  background: #f57c00;
}

.show-all-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.loading,
.error {
  margin-top: 10px;
  padding: 10px;
  text-align: center;
  font-size: 14px;
  color: #666;
}

.error {
  color: #dc3545;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .manager-controls {
    flex-direction: column;
  }
  
  .actions {
    flex-direction: row;
    width: 100%;
  }
  
  .apply-btn,
  .show-all-btn {
    flex: 1;
  }
}
</style>

