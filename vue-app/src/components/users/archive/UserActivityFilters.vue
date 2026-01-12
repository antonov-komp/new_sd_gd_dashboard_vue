<template>
  <div class="user-activity-filters">
    <div class="filter-group">
      <label>Пользователь:</label>
      <select v-model="localFilters.userId" @change="updateFilters">
        <option :value="null">Все пользователи</option>
        <option v-for="user in users" :key="user.ID" :value="user.ID">
          {{ getUserName(user) }}
        </option>
      </select>
    </div>
    
    <div class="filter-group">
      <label>Тип активности:</label>
      <select v-model="localFilters.type" @change="updateFilters">
        <option :value="null">Все типы</option>
        <option value="app_entry">Открытие приложения</option>
        <option value="page_visit">Переходы по страницам</option>
      </select>
    </div>
    
    <div class="filter-group">
      <label>Дата от:</label>
      <input type="date" v-model="localFilters.dateFrom" @change="updateFilters" />
    </div>
    
    <div class="filter-group">
      <label>Дата до:</label>
      <input type="date" v-model="localFilters.dateTo" @change="updateFilters" />
    </div>
    
    <button @click="resetFilters" class="btn-reset">Сбросить</button>
  </div>
</template>

<script>
import { ref, watch } from 'vue';

export default {
  name: 'UserActivityFilters',
  props: {
    filters: {
      type: Object,
      default: () => ({})
    },
    users: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update-filters'],
  setup(props, { emit }) {
    const localFilters = ref({
      userId: props.filters.userId || null,
      type: props.filters.type || null,
      dateFrom: props.filters.dateFrom || null,
      dateTo: props.filters.dateTo || null
    });
    
    const updateFilters = () => {
      emit('update-filters', { ...localFilters.value });
    };
    
    const resetFilters = () => {
      localFilters.value = {
        userId: null,
        type: null,
        dateFrom: null,
        dateTo: null
      };
      updateFilters();
    };
    
    const getUserName = (user) => {
      const name = user.NAME || '';
      const lastName = user.LAST_NAME || '';
      const fullName = `${name} ${lastName}`.trim();
      return fullName || user.EMAIL || `User #${user.ID}`;
    };
    
    watch(() => props.filters, (newFilters) => {
      localFilters.value = { ...newFilters };
    }, { deep: true });
    
    return {
      localFilters,
      updateFilters,
      resetFilters,
      getUserName
    };
  }
};
</script>

<style scoped>
.user-activity-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 20px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 150px;
}

.filter-group label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
}

.filter-group select,
.filter-group input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.filter-group select:focus,
.filter-group input:focus {
  outline: none;
  border-color: #2196F3;
}

.btn-reset {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  align-self: flex-end;
  transition: background 0.2s;
}

.btn-reset:hover {
  background: #5a6268;
}

@media (max-width: 768px) {
  .user-activity-filters {
    flex-direction: column;
  }
  
  .filter-group {
    width: 100%;
  }
  
  .btn-reset {
    align-self: stretch;
  }
}
</style>

