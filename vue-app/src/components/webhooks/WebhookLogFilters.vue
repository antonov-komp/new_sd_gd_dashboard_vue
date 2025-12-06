<template>
  <div class="webhook-log-filters">
    <div class="filters-row">
      <!-- Фильтр по категории -->
      <div class="filter-group">
        <label for="category-filter">Категория:</label>
        <select
          id="category-filter"
          v-model="localFilters.category"
          @change="handleFilterChange"
          class="filter-select"
        >
          <option :value="null">Все категории</option>
          <option value="tasks">Задачи</option>
          <option value="smart-processes">Смарт-процессы</option>
          <option value="errors">Ошибки</option>
        </select>
      </div>

      <!-- Фильтр по типу события -->
      <div class="filter-group">
        <label for="event-filter">Тип события:</label>
        <select
          id="event-filter"
          v-model="localFilters.event"
          @change="handleFilterChange"
          class="filter-select"
        >
          <option :value="null">Все события</option>
          <option value="ONTASKADD">Создание задачи</option>
          <option value="ONTASKUPDATE">Обновление задачи</option>
          <option value="ONTASKDELETE">Удаление задачи</option>
          <option value="ONTASKCOMMENTADD">Добавление комментария</option>
          <option value="ONTASKCOMMENTUPDATE">Обновление комментария</option>
          <option value="ONTASKCOMMENTDELETE">Удаление комментария</option>
          <option value="ONCRMDYNAMICITEMADD">Добавление элемента</option>
          <option value="ONCRMDYNAMICITEMUPDATE">Изменение элемента</option>
          <option value="ONCRMDYNAMICITEMDELETE">Удаление элемента</option>
        </select>
      </div>

      <!-- Фильтр по дате -->
      <div class="filter-group">
        <label for="date-filter">Дата:</label>
        <input
          id="date-filter"
          v-model="localFilters.date"
          type="date"
          @change="handleFilterChange"
          class="filter-input"
        />
      </div>

      <!-- Фильтр по часу -->
      <div class="filter-group">
        <label for="hour-filter">Час:</label>
        <select
          id="hour-filter"
          v-model="localFilters.hour"
          @change="handleFilterChange"
          class="filter-select"
        >
          <option :value="null">Все часы</option>
          <option v-for="h in 24" :key="h - 1" :value="h - 1">
            {{ String(h - 1).padStart(2, '0') }}:00
          </option>
        </select>
      </div>

      <!-- Кнопка сброса фильтров -->
      <div class="filter-group">
        <button
          @click="handleReset"
          class="btn-reset"
        >
          Сбросить
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';

export default {
  name: 'WebhookLogFilters',
  props: {
    filters: {
      type: Object,
      required: true
    }
  },
  emits: ['update:filters', 'reset'],
  setup(props, { emit }) {
    const localFilters = ref({
      category: props.filters.category || null,
      event: props.filters.event || null,
      date: props.filters.date || new Date().toISOString().split('T')[0],
      hour: props.filters.hour !== undefined ? props.filters.hour : null
    });

    // Синхронизация с props
    watch(() => props.filters, (newFilters) => {
      localFilters.value = {
        category: newFilters.category || null,
        event: newFilters.event || null,
        date: newFilters.date || new Date().toISOString().split('T')[0],
        hour: newFilters.hour !== undefined ? newFilters.hour : null
      };
    }, { deep: true });

    const handleFilterChange = () => {
      emit('update:filters', { ...localFilters.value });
    };

    const handleReset = () => {
      localFilters.value = {
        category: null,
        event: null,
        date: new Date().toISOString().split('T')[0],
        hour: null
      };
      emit('reset');
    };

    return {
      localFilters,
      handleFilterChange,
      handleReset
    };
  }
};
</script>

<style scoped>
.webhook-log-filters {
  margin-bottom: 20px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  min-width: 150px;
}

.filter-group label {
  margin-bottom: 5px;
  font-weight: 500;
  font-size: 14px;
  color: #333;
}

.filter-select,
.filter-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.filter-select:hover,
.filter-input:hover {
  border-color: #2196F3;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #2196F3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
}

.btn-reset {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.btn-reset:hover {
  background: #5a6268;
}

@media (max-width: 768px) {
  .filters-row {
    flex-direction: column;
  }

  .filter-group {
    width: 100%;
  }
}
</style>

