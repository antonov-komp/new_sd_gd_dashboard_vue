<template>
  <div
    class="user-list-panel"
    :class="{
      'loading': loading,
      'empty': !loading && filteredUsers.length === 0,
      'compact-view': viewOptions.compactView
    }"
    role="region"
    aria-label="Список пользователей"
  >
    <!-- Заголовок и действия -->
    <div class="panel-header">
      <div class="header-content">
        <h2 class="panel-title">
          Пользователи
          <span v-if="!loading" class="users-count">
            ({{ pagination.total.toLocaleString() }})
          </span>
        </h2>

        <div class="header-actions">
          <!-- Поиск -->
          <div class="search-container">
            <input
              v-model="localFilters.search"
              type="text"
              class="search-input"
              placeholder="Поиск по имени или email..."
              @input="debounceSearch"
              @keydown.enter="applySearch"
              :aria-label="'Поиск пользователей'"
            >
            <button
              v-if="localFilters.search"
              @click="clearSearch"
              class="search-clear"
              :aria-label="'Очистить поиск'"
            >
              ✕
            </button>
            <div class="search-icon" aria-hidden="true">🔍</div>
          </div>

          <!-- Фильтры -->
          <button
            @click="toggleFilters"
            class="filters-toggle"
            :class="{ active: showFilters }"
            :aria-label="'Показать/скрыть фильтры'"
            :aria-expanded="showFilters"
          >
            <svg class="filter-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
            </svg>
            Фильтры
            <span v-if="activeFiltersCount > 0" class="filters-count">
              {{ activeFiltersCount }}
            </span>
          </button>

          <!-- Вид отображения -->
          <div class="view-options">
            <button
              @click="toggleCompactView"
              class="view-toggle"
              :class="{ active: viewOptions.compactView }"
              :aria-label="'Переключить компактный вид'"
              title="Компактный вид"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 3h18v2H3V3zm0 16h18v2H3v16zm0-8h18v2H3v-2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Расширенные фильтры -->
    <div v-if="showFilters" class="filters-panel" role="region" aria-label="Панель фильтров">
      <div class="filters-grid">
        <!-- Фильтр по отделам -->
        <div class="filter-group">
          <label class="filter-label">Отделы:</label>
          <div class="departments-filter">
            <button
              v-for="dept in departments"
              :key="dept.id"
              @click="toggleDepartmentFilter(dept.id)"
              class="department-chip"
              :class="{ active: localFilters.department_ids.includes(dept.id) }"
              :style="{ borderColor: dept.color }"
              :aria-label="`Фильтр по отделу ${dept.name}`"
            >
              <span
                class="dept-dot"
                :style="{ backgroundColor: dept.color }"
                aria-hidden="true"
              ></span>
              {{ dept.name }}
            </button>
          </div>
        </div>

        <!-- Фильтр по активности -->
        <div class="filter-group">
          <label class="filter-label">Активность:</label>
          <select
            v-model="localFilters.activity_filter"
            class="filter-select"
            @change="applyFilters"
            aria-label="Фильтр по уровню активности"
          >
            <option value="all">Все пользователи</option>
            <option value="active">Активные (80%+)</option>
            <option value="moderate">Средне активные (50-80%)</option>
            <option value="inactive">Неактивные (<50%)</option>
            <option value="new">Новые (за неделю)</option>
          </select>
        </div>

        <!-- Временной диапазон -->
        <div class="filter-group">
          <label class="filter-label">Период:</label>
          <select
            v-model="localFilters.time_range"
            class="filter-select"
            @change="applyFilters"
            aria-label="Временной диапазон для фильтрации"
          >
            <option value="today">Сегодня</option>
            <option value="week">Эта неделя</option>
            <option value="month">Этот месяц</option>
            <option value="quarter">Этот квартал</option>
            <option value="year">Этот год</option>
          </select>
        </div>

        <!-- Сортировка -->
        <div class="filter-group">
          <label class="filter-label">Сортировка:</label>
          <div class="sort-controls">
            <select
              v-model="localFilters.sort_by"
              class="filter-select sort-select"
              @change="applyFilters"
              aria-label="Поле сортировки"
            >
              <option value="last_activity">Последняя активность</option>
              <option value="name">Имя</option>
              <option value="email">Email</option>
              <option value="total_actions">Количество действий</option>
            </select>
            <button
              @click="toggleSortOrder"
              class="sort-order-toggle"
              :aria-label="`Изменить порядок сортировки на ${localFilters.sort_order === 'asc' ? 'убывающий' : 'возрастающий'}`"
            >
              <svg
                :class="{ rotated: localFilters.sort_order === 'desc' }"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M7 14l5-5 5 5z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Действия с фильтрами -->
      <div class="filter-actions">
        <button @click="resetFilters" class="filter-reset-btn">
          Сбросить
        </button>
        <button @click="applyFilters" class="filter-apply-btn">
          Применить
        </button>
      </div>
    </div>

    <!-- Панель массовых действий -->
    <BulkActionsBar
      v-if="selectedUsers.length > 0"
      :selected-users="selectedUsers"
      :available-actions="bulkActions"
      @execute="handleBulkAction"
      @clear-selection="clearSelection"
    />

    <!-- Список пользователей -->
    <div class="users-list-container" role="list" aria-label="Список пользователей">
      <!-- Состояние загрузки -->
      <div v-if="loading" class="loading-state">
        <div
          v-for="n in viewOptions.itemsPerPage"
          :key="n"
          class="user-skeleton"
          aria-hidden="true"
        >
          <div class="skeleton-avatar"></div>
          <div class="skeleton-content">
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
          </div>
          <div class="skeleton-actions">
            <div class="skeleton-button"></div>
            <div class="skeleton-button"></div>
          </div>
        </div>
      </div>

      <!-- Пустое состояние -->
      <div v-else-if="filteredUsers.length === 0" class="empty-state">
        <div class="empty-icon" aria-hidden="true">👥</div>
        <h3 class="empty-title">
          {{ localFilters.search ? 'Пользователи не найдены' : 'Нет пользователей' }}
        </h3>
        <p class="empty-description">
          {{
            localFilters.search
              ? `По запросу "${localFilters.search}" ничего не найдено. Попробуйте изменить поиск или сбросить фильтры.`
              : 'В системе ещё нет зарегистрированных пользователей.'
          }}
        </p>
        <button
          v-if="activeFiltersCount > 0"
          @click="resetFilters"
          class="empty-action-btn"
        >
          Сбросить фильтры
        </button>
      </div>

      <!-- Список пользователей -->
      <VirtualList
        v-else
        :items="filteredUsers"
        :item-height="viewOptions.compactView ? 80 : 120"
        :container-height="listHeight"
        class="virtual-users-list"
        @item-click="handleUserClick"
      >
        <template #item="{ item: user, index }">
          <UnifiedUserCard
            :key="user.id"
            :user="user"
            :is-selected="selectedUsers.some(u => u.id === user.id)"
            :compact-view="viewOptions.compactView"
            :can-edit-permissions="canEditPermissions"
            :can-delete="canDeleteUsers"
            :show-extended-metrics="!viewOptions.compactView"
            @select="handleUserSelect"
            @view-profile="handleViewProfile"
            @edit-permissions="handleEditPermissions"
            @toggle-hidden="handleToggleHidden"
            @view-analytics="handleViewAnalytics"
            @export-data="handleExportUserData"
            @delete-user="handleDeleteUser"
          />
        </template>
      </VirtualList>
    </div>

    <!-- Пагинация -->
    <PaginationControls
      v-if="!loading && pagination.total_pages > 1"
      :current-page="pagination.current_page"
      :total-pages="pagination.total_pages"
      :total-items="pagination.total"
      :per-page="pagination.per_page"
      @page-change="handlePageChange"
      @per-page-change="handlePerPageChange"
    />
  </div>
</template>

<script>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import UnifiedUserCard from '../shared/UnifiedUserCard.vue';
import BulkActionsBar from '../shared/BulkActionsBar.vue';
import VirtualList from '../../common/VirtualList.vue';
import PaginationControls from '../../common/PaginationControls.vue';

/**
 * UserListPanel - панель списка пользователей для глобального контекста
 *
 * Предоставляет:
 * - Поиск и фильтрацию пользователей
 * - Сортировку и пагинацию
 * - Массовые действия
 * - Виртуализацию списка для производительности
 *
 * @version 1.0.0
 * @since TASK-089
 */
export default {
  name: 'UserListPanel',

  components: {
    UnifiedUserCard,
    BulkActionsBar,
    VirtualList,
    PaginationControls
  },

  props: {
    /**
     * Список пользователей
     */
    users: {
      type: Array,
      default: () => []
    },

    /**
     * Состояние загрузки
     */
    loading: {
      type: Boolean,
      default: false
    },

    /**
     * Информация о пагинации
     */
    pagination: {
      type: Object,
      default: () => ({
        current_page: 1,
        per_page: 50,
        total: 0,
        total_pages: 0
      })
    },

    /**
     * Фильтры
     */
    filters: {
      type: Object,
      default: () => ({
        search: '',
        department_ids: [],
        activity_filter: 'all',
        sort_by: 'last_activity',
        sort_order: 'desc',
        time_range: 'week'
      })
    },

    /**
     * Опции отображения
     */
    viewOptions: {
      type: Object,
      default: () => ({
        compactView: false,
        showExtendedMetrics: false,
        itemsPerPage: 50
      })
    },

    /**
     * Разрешение на редактирование прав
     */
    canEditPermissions: {
      type: Boolean,
      default: false
    },

    /**
     * Разрешение на удаление пользователей
     */
    canDeleteUsers: {
      type: Boolean,
      default: false
    }
  },

  emits: [
    'user-select',
    'user-select-multiple',
    'filters-change',
    'pagination-change',
    'view-options-change',
    'user-action'
  ],

  setup(props, { emit }) {
    // Реактивное состояние
    const showFilters = ref(false);
    const selectedUsers = ref([]);
    const localFilters = ref({ ...props.filters });
    const searchTimeout = ref(null);
    const listContainer = ref(null);

    // Вычисляемые свойства
    const filteredUsers = computed(() => props.users);

    const activeFiltersCount = computed(() => {
      let count = 0;
      if (localFilters.value.search) count++;
      if (localFilters.value.department_ids.length > 0) count++;
      if (localFilters.value.activity_filter !== 'all') count++;
      if (localFilters.value.time_range !== 'week') count++;
      return count;
    });

    const listHeight = computed(() => {
      if (!listContainer.value) return 400;
      const rect = listContainer.value.getBoundingClientRect();
      return Math.max(400, window.innerHeight - rect.top - 200);
    });

    const departments = computed(() => {
      // Моковые данные отделов (будут заменены на реальные)
      return [
        { id: 369, name: 'Битрикс24 отдел', color: '#2196F3' },
        { id: 366, name: 'Сектор 1С', color: '#4CAF50' },
        { id: 370, name: 'Отдел аналитики', color: '#FF9800' },
        { id: 371, name: 'Техническая поддержка', color: '#F44336' }
      ];
    });

    const bulkActions = computed(() => [
      {
        id: 'change_department',
        label: 'Изменить отдел',
        icon: 'BuildingIcon',
        description: 'Назначить пользователей в другой отдел'
      },
      {
        id: 'toggle_admin',
        label: 'Изменить права администратора',
        icon: 'ShieldIcon',
        description: 'Предоставить или отозвать права администратора'
      },
      {
        id: 'export',
        label: 'Экспорт данных',
        icon: 'DownloadIcon',
        description: 'Экспортировать данные выбранных пользователей'
      },
      {
        id: 'hide_users',
        label: 'Скрыть пользователей',
        icon: 'EyeOffIcon',
        description: 'Скрыть выбранных пользователей из списка'
      }
    ]);

    // Методы

    /**
     * Переключение видимости фильтров
     */
    const toggleFilters = () => {
      showFilters.value = !showFilters.value;
    };

    /**
     * Применение фильтров
     */
    const applyFilters = () => {
      emit('filters-change', { ...localFilters.value });
    };

    /**
     * Сброс фильтров
     */
    const resetFilters = () => {
      localFilters.value = {
        search: '',
        department_ids: [],
        activity_filter: 'all',
        sort_by: 'last_activity',
        sort_order: 'desc',
        time_range: 'week'
      };
      applyFilters();
    };

    /**
     * Переключение фильтра по отделу
     */
    const toggleDepartmentFilter = (deptId) => {
      const index = localFilters.value.department_ids.indexOf(deptId);
      if (index > -1) {
        localFilters.value.department_ids.splice(index, 1);
      } else {
        localFilters.value.department_ids.push(deptId);
      }
      applyFilters();
    };

    /**
     * Переключение порядка сортировки
     */
    const toggleSortOrder = () => {
      localFilters.value.sort_order = localFilters.value.sort_order === 'asc' ? 'desc' : 'asc';
      applyFilters();
    };

    /**
     * Переключение компактного вида
     */
    const toggleCompactView = () => {
      const newOptions = {
        ...props.viewOptions,
        compactView: !props.viewOptions.compactView
      };
      emit('view-options-change', newOptions);
    };

    /**
     * Поиск с дебаунсом
     */
    const debounceSearch = () => {
      if (searchTimeout.value) {
        clearTimeout(searchTimeout.value);
      }
      searchTimeout.value = setTimeout(applySearch, 300);
    };

    /**
     * Применение поиска
     */
    const applySearch = () => {
      applyFilters();
    };

    /**
     * Очистка поиска
     */
    const clearSearch = () => {
      localFilters.value.search = '';
      applyFilters();
    };

    /**
     * Обработчик клика по пользователю
     */
    const handleUserClick = (user) => {
      handleUserSelect(user);
    };

    /**
     * Выбор пользователя
     */
    const handleUserSelect = (user) => {
      emit('user-select', user);
    };

    /**
     * Выбор нескольких пользователей
     */
    const handleUserSelectMultiple = (users) => {
      selectedUsers.value = users;
      emit('user-select-multiple', users);
    };

    /**
     * Очистка выбора
     */
    const clearSelection = () => {
      selectedUsers.value = [];
    };

    // Обработчики действий с пользователем

    /**
     * Просмотр профиля
     */
    const handleViewProfile = (user) => {
      emit('user-action', 'view-profile', user);
    };

    /**
     * Редактирование прав
     */
    const handleEditPermissions = (user) => {
      emit('user-action', 'edit-permissions', user);
    };

    /**
     * Переключение видимости пользователя
     */
    const handleToggleHidden = (user) => {
      emit('user-action', 'toggle-visibility', user);
    };

    /**
     * Просмотр аналитики
     */
    const handleViewAnalytics = (user) => {
      emit('user-action', 'view-analytics', user);
    };

    /**
     * Экспорт данных пользователя
     */
    const handleExportUserData = (user) => {
      emit('user-action', 'export-data', user);
    };

    /**
     * Удаление пользователя
     */
    const handleDeleteUser = (user) => {
      emit('user-action', 'delete', user);
    };

    /**
     * Выполнение массового действия
     */
    const handleBulkAction = (action) => {
      emit('user-action', 'bulk-action', { action, users: selectedUsers.value });
    };

    // Обработчики пагинации

    /**
     * Изменение страницы
     */
    const handlePageChange = (page) => {
      emit('pagination-change', page);
    };

    /**
     * Изменение количества элементов на странице
     */
    const handlePerPageChange = (perPage) => {
      emit('pagination-change', 1, perPage);
    };

    // Наблюдатели
    watch(() => props.filters, (newFilters) => {
      localFilters.value = { ...newFilters };
    }, { deep: true });

    // Инициализация
    onMounted(() => {
      nextTick(() => {
        // Инициализация высоты списка
        if (listContainer.value) {
          listContainer.value.style.height = `${listHeight.value}px`;
        }
      });
    });

    return {
      showFilters,
      selectedUsers,
      localFilters,
      filteredUsers,
      activeFiltersCount,
      listHeight,
      departments,
      bulkActions,
      listContainer,
      toggleFilters,
      applyFilters,
      resetFilters,
      toggleDepartmentFilter,
      toggleSortOrder,
      toggleCompactView,
      debounceSearch,
      applySearch,
      clearSearch,
      handleUserClick,
      handleUserSelect,
      handleUserSelectMultiple,
      clearSelection,
      handleViewProfile,
      handleEditPermissions,
      handleToggleHidden,
      handleViewAnalytics,
      handleExportUserData,
      handleDeleteUser,
      handleBulkAction,
      handlePageChange,
      handlePerPageChange
    };
  }
};
</script>

<style scoped>
.user-list-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--um-bg-primary, #ffffff);
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--um-border-color, #e0e0e0);
  background: var(--um-bg-primary, #ffffff);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.panel-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--um-text-primary, #212121);
  display: flex;
  align-items: center;
  gap: 8px;
}

.users-count {
  font-size: 16px;
  font-weight: 400;
  color: var(--um-text-secondary, #757575);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
}

.search-container {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 10px 40px 10px 16px;
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 24px;
  font-size: 14px;
  background: var(--um-bg-primary, #ffffff);
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--um-primary, #2196f3);
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
}

.search-clear {
  position: absolute;
  right: 32px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--um-text-secondary, #757575);
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.search-clear:hover {
  background: var(--um-hover, rgba(33, 150, 243, 0.1));
  color: var(--um-text-primary, #212121);
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--um-text-secondary, #757575);
  font-size: 16px;
}

.filters-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 6px;
  background: var(--um-bg-primary, #ffffff);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.filters-toggle:hover {
  border-color: var(--um-primary, #2196f3);
  background: var(--um-hover, rgba(33, 150, 243, 0.1));
}

.filters-toggle.active {
  border-color: var(--um-primary, #2196f3);
  background: var(--um-bg-accent, #e3f2fd);
  color: var(--um-primary, #2196f3);
}

.filter-icon {
  width: 16px;
  height: 16px;
}

.filters-count {
  background: var(--um-primary, #2196f3);
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
  min-width: 18px;
  text-align: center;
}

.view-options {
  display: flex;
  gap: 4px;
}

.view-toggle {
  padding: 8px;
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 6px;
  background: var(--um-bg-primary, #ffffff);
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-toggle:hover {
  border-color: var(--um-primary, #2196f3);
  background: var(--um-hover, rgba(33, 150, 243, 0.1));
}

.view-toggle.active {
  border-color: var(--um-primary, #2196f3);
  background: var(--um-bg-accent, #e3f2fd);
  color: var(--um-primary, #2196f3);
}

.view-toggle svg {
  width: 16px;
  height: 16px;
}

/* Панель фильтров */
.filters-panel {
  padding: 20px 24px;
  border-bottom: 1px solid var(--um-border-color, #e0e0e0);
  background: var(--um-bg-secondary, #f5f5f5);
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

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--um-text-primary, #212121);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.departments-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.department-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 16px;
  background: var(--um-bg-primary, #ffffff);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.department-chip:hover {
  border-color: var(--um-primary, #2196f3);
  background: var(--um-hover, rgba(33, 150, 243, 0.1));
}

.department-chip.active {
  border-color: var(--um-primary, #2196f3);
  background: var(--um-bg-accent, #e3f2fd);
  color: var(--um-primary, #2196f3);
}

.dept-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 6px;
  background: var(--um-bg-primary, #ffffff);
  font-size: 14px;
}

.filter-select:focus {
  outline: none;
  border-color: var(--um-primary, #2196f3);
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
}

.sort-controls {
  display: flex;
  gap: 8px;
}

.sort-select {
  flex: 1;
}

.sort-order-toggle {
  padding: 8px;
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 6px;
  background: var(--um-bg-primary, #ffffff);
  cursor: pointer;
  transition: all 0.2s ease;
}

.sort-order-toggle:hover {
  border-color: var(--um-primary, #2196f3);
  background: var(--um-hover, rgba(33, 150, 243, 0.1));
}

.sort-order-toggle svg {
  width: 16px;
  height: 16px;
  transition: transform 0.2s ease;
}

.sort-order-toggle .rotated {
  transform: rotate(180deg);
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.filter-reset-btn,
.filter-apply-btn {
  padding: 8px 16px;
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 6px;
  background: var(--um-bg-primary, #ffffff);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.filter-reset-btn:hover {
  border-color: var(--um-danger, #f44336);
  background: rgba(244, 67, 54, 0.1);
  color: var(--um-danger, #f44336);
}

.filter-apply-btn {
  border-color: var(--um-primary, #2196f3);
  background: var(--um-primary, #2196f3);
  color: white;
}

.filter-apply-btn:hover {
  background: #1976d2;
}

/* Список пользователей */
.users-list-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.virtual-users-list {
  height: 100%;
}

/* Состояние загрузки */
.loading-state {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-skeleton {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--um-bg-secondary, #f5f5f5);
  margin-right: 16px;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 16px;
  background: var(--um-bg-secondary, #f5f5f5);
  border-radius: 4px;
}

.skeleton-line.short {
  width: 60%;
}

.skeleton-actions {
  display: flex;
  gap: 4px;
}

.skeleton-button {
  width: 32px;
  height: 32px;
  background: var(--um-bg-secondary, #f5f5f5);
  border-radius: 6px;
}

/* Пустое состояние */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-title {
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--um-text-primary, #212121);
}

.empty-description {
  margin: 0 0 24px 0;
  color: var(--um-text-secondary, #757575);
  line-height: 1.5;
  max-width: 400px;
}

.empty-action-btn {
  padding: 10px 20px;
  border: 1px solid var(--um-primary, #2196f3);
  border-radius: 6px;
  background: var(--um-primary, #2196f3);
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.empty-action-btn:hover {
  background: #1976d2;
}

/* Адаптивность */
@media (max-width: 768px) {
  .panel-header {
    padding: 16px 20px 12px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .panel-title {
    font-size: 20px;
    text-align: center;
  }

  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
  }

  .search-container {
    max-width: none;
    order: -1;
    width: 100%;
  }

  .filters-panel {
    padding: 16px 20px;
  }

  .filters-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .departments-filter {
    justify-content: center;
  }

  .empty-state {
    padding: 40px 20px;
  }
}

@media (max-width: 480px) {
  .panel-header {
    padding: 12px 16px 8px;
  }

  .header-actions {
    flex-direction: column;
    gap: 8px;
  }

  .filters-toggle,
  .view-toggle {
    padding: 6px;
    font-size: 13px;
  }

  .filters-panel {
    padding: 12px 16px;
  }

  .department-chip {
    padding: 4px 8px;
    font-size: 12px;
  }

  .loading-state {
    padding: 16px;
  }

  .empty-icon {
    font-size: 48px;
  }

  .empty-title {
    font-size: 18px;
  }
}

/* Темная тема */
@media (prefers-color-scheme: dark) {
  .user-list-panel {
    background: var(--um-bg-dark-primary, #1e1e1e);
  }

  .panel-header {
    border-bottom-color: var(--um-border-dark-color, #424242);
    background: var(--um-bg-dark-primary, #1e1e1e);
  }

  .panel-title {
    color: var(--um-text-dark-primary, #ffffff);
  }

  .users-count {
    color: var(--um-text-dark-secondary, #b0b0b0);
  }

  .search-input,
  .filters-toggle,
  .view-toggle,
  .department-chip,
  .filter-select,
  .sort-order-toggle,
  .filter-reset-btn,
  .filter-apply-btn {
    background: var(--um-bg-dark-primary, #2d2d2d);
    border-color: var(--um-border-dark-color, #424242);
    color: var(--um-text-dark-primary, #ffffff);
  }

  .filters-panel {
    background: var(--um-bg-dark-secondary, #2d2d2d);
  }

  .user-skeleton,
  .skeleton-avatar,
  .skeleton-line,
  .skeleton-button {
    background: var(--um-bg-dark-secondary, #424242);
  }

  .empty-title {
    color: var(--um-text-dark-primary, #ffffff);
  }

  .empty-description {
    color: var(--um-text-dark-secondary, #b0b0b0);
  }
}

/* Высокий контраст */
@media (prefers-contrast: high) {
  .filters-toggle:hover,
  .view-toggle:hover,
  .department-chip:hover,
  .sort-order-toggle:hover,
  .filter-reset-btn:hover,
  .filter-apply-btn:hover,
  .empty-action-btn:hover {
    border-width: 2px;
  }

  .search-input:focus,
  .filter-select:focus {
    border-width: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .filters-panel {
    animation: none;
  }

  .user-skeleton {
    animation: none;
  }
}
</style>