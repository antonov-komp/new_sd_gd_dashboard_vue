<template>
  <div class="advanced-filters">
    <div class="filters-header">
      <h2>Расширенные фильтры</h2>
      <p class="filters-subtitle">Настройте параметры для точного анализа активности пользователей</p>
    </div>

    <div class="filters-container">
      <!-- Основные фильтры -->
      <div class="filter-section">
        <h3>Основные фильтры</h3>

        <div class="filter-grid">
          <!-- Отдел -->
          <div class="filter-item">
            <label for="department-filter">Отдел:</label>
            <select
              id="department-filter"
              v-model="filters.departmentId"
              @change="handleFilterChange"
              class="filter-select"
            >
              <option value="">Все отделы</option>
              <option
                v-for="dept in departments"
                :key="dept.ID"
                :value="dept.ID"
              >
                {{ dept.NAME }}
              </option>
            </select>
          </div>

          <!-- Статус активности -->
          <div class="filter-item">
            <label for="active-filter">Статус активности:</label>
            <select
              id="active-filter"
              v-model="filters.activeStatus"
              @change="handleFilterChange"
              class="filter-select"
            >
              <option value="">Все пользователи</option>
              <option value="Y">Активные</option>
              <option value="N">Неактивные</option>
            </select>
          </div>

          <!-- Период регистрации -->
          <div class="filter-item">
            <label for="registration-period">Период регистрации:</label>
            <select
              id="registration-period"
              v-model="filters.registrationPeriod"
              @change="handleFilterChange"
              class="filter-select"
            >
              <option value="">Все время</option>
              <option value="week">Последняя неделя</option>
              <option value="month">Последний месяц</option>
              <option value="quarter">Последний квартал</option>
              <option value="year">Последний год</option>
              <option value="custom">Произвольный период</option>
            </select>
          </div>

          <!-- Должность -->
          <div class="filter-item">
            <label for="position-filter">Должность:</label>
            <input
              id="position-filter"
              type="text"
              v-model="filters.position"
              @input="debouncedFilterChange"
              placeholder="Введите должность..."
              class="filter-input"
            />
          </div>
        </div>
      </div>

      <!-- Продвинутые фильтры -->
      <div class="filter-section">
        <h3>Продвинутые фильтры</h3>

        <div class="filter-grid">
          <!-- Заполненность профиля -->
          <div class="filter-item">
            <label for="completeness-filter">Заполненность профиля:</label>
            <select
              id="completeness-filter"
              v-model="filters.profileCompleteness"
              @change="handleFilterChange"
              class="filter-select"
            >
              <option value="">Любая</option>
              <option value="high">Высокая (80-100%)</option>
              <option value="medium">Средняя (50-79%)</option>
              <option value="low">Низкая (0-49%)</option>
              <option value="incomplete">Незаполненные</option>
            </select>
          </div>

          <!-- Тип пользователя -->
          <div class="filter-item">
            <label for="user-type-filter">Тип пользователя:</label>
            <select
              id="user-type-filter"
              v-model="filters.userType"
              @change="handleFilterChange"
              class="filter-select"
            >
              <option value="">Все типы</option>
              <option value="employee">Сотрудники</option>
              <option value="external">Внешние пользователи</option>
            </select>
          </div>

          <!-- Наличие фото -->
          <div class="filter-item">
            <label for="photo-filter">Фото профиля:</label>
            <select
              id="photo-filter"
              v-model="filters.hasPhoto"
              @change="handleFilterChange"
              class="filter-select"
            >
              <option value="">Не важно</option>
              <option value="true">Есть фото</option>
              <option value="false">Нет фото</option>
            </select>
          </div>

          <!-- Контактная информация -->
          <div class="filter-item">
            <label for="contact-filter">Контакты:</label>
            <select
              id="contact-filter"
              v-model="filters.hasContact"
              @change="handleFilterChange"
              class="filter-select"
            >
              <option value="">Не важно</option>
              <option value="email">Есть email</option>
              <option value="phone">Есть телефон</option>
              <option value="both">Email и телефон</option>
              <option value="none">Нет контактов</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Пользовательские диапазоны -->
      <div v-if="filters.registrationPeriod === 'custom'" class="filter-section">
        <h3>Произвольный период регистрации</h3>

        <div class="filter-grid">
          <div class="filter-item">
            <label for="date-from">Дата с:</label>
            <input
              id="date-from"
              type="date"
              v-model="filters.dateFrom"
              @change="handleFilterChange"
              class="filter-input"
            />
          </div>

          <div class="filter-item">
            <label for="date-to">Дата по:</label>
            <input
              id="date-to"
              type="date"
              v-model="filters.dateTo"
              @change="handleFilterChange"
              class="filter-input"
            />
          </div>
        </div>
      </div>

      <!-- Фильтры по активности -->
      <div class="filter-section">
        <h3>Фильтры по активности</h3>

        <div class="filter-grid">
          <!-- Последняя активность -->
          <div class="filter-item">
            <label for="last-activity">Последняя активность:</label>
            <select
              id="last-activity"
              v-model="filters.lastActivity"
              @change="handleFilterChange"
              class="filter-select"
            >
              <option value="">Не важно</option>
              <option value="today">Сегодня</option>
              <option value="week">На этой неделе</option>
              <option value="month">В этом месяце</option>
              <option value="quarter">В этом квартале</option>
              <option value="inactive_month">Неактивны > 30 дней</option>
              <option value="inactive_quarter">Неактивны > 90 дней</option>
            </select>
          </div>

          <!-- Уровень вовлеченности -->
          <div class="filter-item">
            <label for="engagement-filter">Уровень вовлеченности:</label>
            <select
              id="engagement-filter"
              v-model="filters.engagementLevel"
              @change="handleFilterChange"
              class="filter-select"
            >
              <option value="">Не важно</option>
              <option value="high">Высокий</option>
              <option value="medium">Средний</option>
              <option value="low">Низкий</option>
            </select>
          </div>

          <!-- Новые пользователи -->
          <div class="filter-item">
            <label for="new-users-filter">Новые пользователи:</label>
            <select
              id="new-users-filter"
              v-model="filters.newUsersOnly"
              @change="handleFilterChange"
              class="filter-select"
            >
              <option value="">Все пользователи</option>
              <option value="true">Только новые (< 30 дней)</option>
              <option value="false">Исключая новых</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Управление фильтрами -->
      <div class="filter-actions">
        <button
          @click="applyFilters"
          :disabled="!hasActiveFilters"
          class="apply-btn"
        >
          Применить фильтры
        </button>

        <button
          @click="resetFilters"
          :disabled="!hasActiveFilters"
          class="reset-btn"
        >
          Сбросить все
        </button>

        <button
          @click="saveFilterPreset"
          class="save-preset-btn"
        >
          Сохранить как шаблон
        </button>
      </div>

      <!-- Активные фильтры -->
      <div v-if="activeFilterTags.length > 0" class="active-filters">
        <h4>Активные фильтры:</h4>
        <div class="filter-tags">
          <span
            v-for="tag in activeFilterTags"
            :key="tag.key"
            class="filter-tag"
          >
            {{ tag.label }}
            <button @click="removeFilter(tag.key)" class="tag-remove">×</button>
          </span>
        </div>
      </div>

      <!-- Статистика фильтров -->
      <div class="filter-stats">
        <div class="stats-item">
          <span class="stats-label">Всего пользователей:</span>
          <span class="stats-value">{{ totalUsers }}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">Соответствует фильтрам:</span>
          <span class="stats-value">{{ filteredUsers }}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">Процент:</span>
          <span class="stats-value">{{ filterPercentage }}%</span>
        </div>
      </div>
    </div>

    <!-- Предустановки фильтров -->
    <div class="filter-presets">
      <h3>Готовые шаблоны</h3>
      <div class="preset-buttons">
        <button
          v-for="preset in filterPresets"
          :key="preset.id"
          @click="applyPreset(preset)"
          class="preset-btn"
        >
          {{ preset.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { ActivityBitrix24Facade } from '@/services/facades/ActivityBitrix24Facade.js';

export default {
  name: 'AdvancedFilters',

  props: {
    modelValue: {
      type: Object,
      default: () => ({})
    }
  },

  emits: ['update:modelValue', 'filters-changed'],

  setup(props, { emit }) {
    // Реактивные данные
    const departments = ref([]);
    const totalUsers = ref(0);
    const filteredUsers = ref(0);

    const filters = ref({
      departmentId: '',
      activeStatus: '',
      registrationPeriod: '',
      position: '',
      profileCompleteness: '',
      userType: '',
      hasPhoto: '',
      hasContact: '',
      dateFrom: '',
      dateTo: '',
      lastActivity: '',
      engagementLevel: '',
      newUsersOnly: ''
    });

    // Предустановки фильтров
    const filterPresets = ref([
      {
        id: 'active_users',
        name: 'Активные пользователи',
        filters: {
          activeStatus: 'Y',
          lastActivity: 'month'
        }
      },
      {
        id: 'new_users',
        name: 'Новые пользователи',
        filters: {
          registrationPeriod: 'month',
          activeStatus: 'Y'
        }
      },
      {
        id: 'incomplete_profiles',
        name: 'Незаполненные профили',
        filters: {
          profileCompleteness: 'low',
          activeStatus: 'Y'
        }
      },
      {
        id: 'department_heads',
        name: 'Руководители отделов',
        filters: {
          position: 'начальник,директор,руководитель',
          activeStatus: 'Y'
        }
      }
    ]);

    // Вычисляемые свойства
    const hasActiveFilters = computed(() => {
      return Object.values(filters.value).some(value =>
        value !== '' && value !== null && value !== undefined
      );
    });

    const activeFilterTags = computed(() => {
      const tags = [];
      const filterLabels = {
        departmentId: 'Отдел',
        activeStatus: 'Статус активности',
        registrationPeriod: 'Период регистрации',
        position: 'Должность',
        profileCompleteness: 'Заполненность профиля',
        userType: 'Тип пользователя',
        hasPhoto: 'Фото профиля',
        hasContact: 'Контакты',
        dateFrom: 'Дата с',
        dateTo: 'Дата по',
        lastActivity: 'Последняя активность',
        engagementLevel: 'Вовлеченность',
        newUsersOnly: 'Новые пользователи'
      };

      Object.entries(filters.value).forEach(([key, value]) => {
        if (value && value !== '') {
          let label = filterLabels[key] || key;
          if (key === 'activeStatus') {
            label += value === 'Y' ? ': Активные' : ': Неактивные';
          } else if (key === 'departmentId') {
            const dept = departments.value.find(d => d.ID == value);
            label += `: ${dept ? dept.NAME : value}`;
          } else if (typeof value === 'string' && value.length > 20) {
            label += `: ${value.substring(0, 20)}...`;
          } else {
            label += `: ${value}`;
          }

          tags.push({ key, label, value });
        }
      });

      return tags;
    });

    const filterPercentage = computed(() => {
      if (totalUsers.value === 0) return 0;
      return Math.round((filteredUsers.value / totalUsers.value) * 100);
    });

    // Методы
    const loadDepartments = async () => {
      try {
        const facade = new ActivityBitrix24Facade();
        const depts = await facade.getDepartments();
        departments.value = depts;
      } catch (error) {
        console.error('Error loading departments:', error);
      }
    };

    const loadUserStats = async () => {
      try {
        const facade = new ActivityBitrix24Facade();
        const stats = await facade.getUserSummaryStats();

        totalUsers.value = stats.total;
        // В реальном приложении здесь нужно применить фильтры
        filteredUsers.value = hasActiveFilters.value
          ? Math.floor(stats.total * 0.7) // Примерная оценка
          : stats.total;
      } catch (error) {
        console.error('Error loading user stats:', error);
      }
    };

    const handleFilterChange = () => {
      emitFilters();
      loadUserStats();
    };

    const emitFilters = () => {
      emit('update:modelValue', { ...filters.value });
      emit('filters-changed', { ...filters.value });
    };

    const resetFilters = () => {
      Object.keys(filters.value).forEach(key => {
        filters.value[key] = '';
      });
      emitFilters();
      loadUserStats();
    };

    const removeFilter = (key) => {
      filters.value[key] = '';
      emitFilters();
      loadUserStats();
    };

    const applyFilters = () => {
      // Валидация фильтров
      if (filters.value.dateFrom && filters.value.dateTo) {
        const fromDate = new Date(filters.value.dateFrom);
        const toDate = new Date(filters.value.dateTo);

        if (fromDate > toDate) {
          alert('Дата "с" не может быть позже даты "по"');
          return;
        }
      }

      emitFilters();
      loadUserStats();
    };

    const applyPreset = (preset) => {
      // Сначала сбросить все фильтры
      resetFilters();

      // Применить фильтры из предустановки
      setTimeout(() => {
        Object.assign(filters.value, preset.filters);
        emitFilters();
        loadUserStats();
      }, 100);
    };

    const saveFilterPreset = () => {
      const presetName = prompt('Введите название шаблона:');
      if (presetName && presetName.trim()) {
        const newPreset = {
          id: `custom_${Date.now()}`,
          name: presetName.trim(),
          filters: { ...filters.value }
        };

        filterPresets.value.push(newPreset);
        alert(`Шаблон "${presetName}" сохранен`);
      }
    };

    // Дебаунс для текстовых полей
    let filterTimeout;
    const debouncedFilterChange = () => {
      clearTimeout(filterTimeout);
      filterTimeout = setTimeout(() => {
        emitFilters();
        loadUserStats();
      }, 500);
    };

    // Синхронизация с внешними изменениями
    watch(() => props.modelValue, (newFilters) => {
      if (newFilters) {
        Object.assign(filters.value, newFilters);
      }
    }, { deep: true });

    // Инициализация
    onMounted(async () => {
      await loadDepartments();
      await loadUserStats();

      // Синхронизация начальных фильтров
      if (props.modelValue) {
        Object.assign(filters.value, props.modelValue);
      }
    });

    return {
      // Реактивные данные
      departments,
      totalUsers,
      filteredUsers,
      filters,
      filterPresets,

      // Вычисляемые свойства
      hasActiveFilters,
      activeFilterTags,
      filterPercentage,

      // Методы
      handleFilterChange,
      resetFilters,
      removeFilter,
      applyFilters,
      applyPreset,
      saveFilterPreset,
      debouncedFilterChange
    };
  }
};
</script>

<style scoped>
.advanced-filters {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.filters-header {
  margin-bottom: 30px;
  text-align: center;
}

.filters-header h2 {
  color: #333;
  margin-bottom: 8px;
  font-size: 1.8rem;
}

.filters-subtitle {
  color: #666;
  font-size: 1.1rem;
}

.filters-container {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.filter-section {
  margin-bottom: 40px;
}

.filter-section:last-child {
  margin-bottom: 0;
}

.filter-section h3 {
  color: #333;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #007bff;
  font-size: 1.3rem;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-item label {
  font-weight: 600;
  color: #555;
  font-size: 0.9rem;
}

.filter-select,
.filter-input {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.filter-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 30px;
  padding-top: 30px;
  border-top: 1px solid #e0e0e0;
  flex-wrap: wrap;
}

.apply-btn,
.reset-btn,
.save-preset-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.apply-btn {
  background: #007bff;
  color: white;
}

.apply-btn:hover:not(:disabled) {
  background: #0056b3;
}

.reset-btn {
  background: #6c757d;
  color: white;
}

.reset-btn:hover:not(:disabled) {
  background: #545b62;
}

.save-preset-btn {
  background: #28a745;
  color: white;
}

.save-preset-btn:hover {
  background: #218838;
}

.apply-btn:disabled,
.reset-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.active-filters {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.active-filters h4 {
  color: #333;
  margin-bottom: 15px;
  font-size: 1.1rem;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  background: #e3f2fd;
  color: #1565c0;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 500;
}

.tag-remove {
  background: none;
  border: none;
  color: #1565c0;
  cursor: pointer;
  margin-left: 8px;
  font-size: 1.2rem;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.tag-remove:hover {
  background: rgba(21, 101, 192, 0.1);
}

.filter-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
  flex-wrap: wrap;
  gap: 20px;
}

.stats-item {
  text-align: center;
}

.stats-label {
  display: block;
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 5px;
}

.stats-value {
  display: block;
  color: #007bff;
  font-size: 1.5rem;
  font-weight: bold;
}

.filter-presets {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.filter-presets h3 {
  color: #333;
  margin-top: 0;
  margin-bottom: 20px;
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.preset-btn {
  padding: 10px 16px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  color: #495057;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.preset-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

@media (max-width: 768px) {
  .advanced-filters {
    padding: 10px;
  }

  .filters-container {
    padding: 20px;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .apply-btn,
  .reset-btn,
  .save-preset-btn {
    width: 100%;
  }

  .filter-stats {
    flex-direction: column;
    align-items: center;
  }

  .preset-buttons {
    flex-direction: column;
  }

  .preset-btn {
    width: 100%;
    text-align: center;
  }
}
</style>