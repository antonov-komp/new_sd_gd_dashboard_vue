<template>
  <div class="activity-data-table">
    <div class="table-header">
      <div class="table-info">
        <h3 class="table-title">Детальная активность</h3>
        <p class="table-subtitle">
          Показано {{ displayedData.length }} из {{ totalCount }} записей
          <span v-if="filtersApplied" class="filters-indicator">• Фильтры применены</span>
        </p>
      </div>
      <div class="table-actions">
        <div class="view-options">
          <button
            @click="viewMode = 'table'"
            :class="{ active: viewMode === 'table' }"
            class="view-btn"
          >
            📋 Таблица
          </button>
          <button
            @click="viewMode = 'cards'"
            :class="{ active: viewMode === 'cards' }"
            class="view-btn"
          >
            🃏 Карточки
          </button>
        </div>
        <button @click="handleExport" class="export-btn">
          📥 Экспорт
        </button>
      </div>
    </div>

    <!-- Фильтры и поиск -->
    <div class="table-filters">
      <div class="search-container">
        <input
          v-model="searchInput"
          @input="handleSearchInput"
          type="text"
          placeholder="Поиск по пользователю, странице или действию..."
          class="search-input"
        />
        <span class="search-icon">🔍</span>
      </div>
      <div class="filter-badges">
        <span
          v-for="filter in activeFilters"
          :key="filter.key"
          class="filter-badge"
        >
          {{ filter.label }}: {{ filter.value }}
          <button @click="removeFilter(filter.key)" class="remove-filter">×</button>
        </span>
      </div>
    </div>

    <!-- Таблица -->
    <div v-if="viewMode === 'table'" class="table-container" :class="{ 'loading': loading }">
      <div v-if="loading" class="table-loading">
        Загрузка данных...
      </div>

      <div v-else-if="displayedData.length === 0" class="table-empty">
        Нет данных для отображения
      </div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th
              v-for="column in visibleColumns"
              :key="column.key"
              :class="{ sortable: column.sortable }"
              @click="column.sortable && handleSort(column.key)"
            >
              <div class="column-header">
                <span>{{ column.label }}</span>
                <span v-if="column.sortable" class="sort-icon">
                  <span v-if="sortBy === column.key && sortOrder === 'asc'">↑</span>
                  <span v-else-if="sortBy === column.key && sortOrder === 'desc'">↓</span>
                  <span v-else>↕</span>
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in paginatedData"
            :key="getEntryKey(entry)"
            :class="getRowClass(entry)"
            @click="handleRowClick(entry)"
          >
            <td v-for="column in visibleColumns" :key="column.key">
              <div class="cell-content" :class="`cell-${column.key}`">
                <component
                  :is="column.component || 'span'"
                  v-bind="getCellProps(column, entry)"
                >
                  {{ getCellValue(column, entry) }}
                </component>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Карточки -->
    <div v-else-if="viewMode === 'cards'" class="cards-container">
      <div
        v-for="entry in paginatedData"
        :key="getEntryKey(entry)"
        class="activity-card"
        :class="getRowClass(entry)"
        @click="handleRowClick(entry)"
        v-if="entry"
      >
        <div class="card-header">
          <div class="card-icon">{{ getActionIcon(entry.type) }}</div>
          <div class="card-timestamp">{{ formatTimestamp(entry.timestamp) }}</div>
        </div>
        <div class="card-content">
          <div class="card-user">
            <strong>{{ entry.user_name || `User #${entry.user_id}` }}</strong>
          </div>
          <div class="card-action">{{ getActionDescription(entry) }}</div>
          <div v-if="entry.route_path" class="card-page">
            Страница: {{ entry.route_title || entry.route_path }}
          </div>
          <div v-if="entry.user_agent" class="card-device">
            Устройство: {{ parseUserAgent(entry.user_agent).device }}
          </div>
        </div>
      </div>
    </div>

    <!-- Пагинация -->
    <div v-if="totalPages > 1" class="table-pagination">
      <div class="pagination-info">
        Страница {{ currentPage }} из {{ totalPages }}
        ({{ totalCount }} записей)
      </div>
      <div class="pagination-controls">
        <button
          @click="goToPage(1)"
          :disabled="currentPage === 1"
          class="page-btn"
        >
          «« Первая
        </button>
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="page-btn"
        >
          ‹ Предыдущая
        </button>

        <div class="page-numbers">
          <button
            v-for="page in visiblePages"
            :key="page"
            @click="goToPage(page)"
            :class="{ active: page === currentPage }"
            class="page-number"
          >
            {{ page }}
          </button>
        </div>

        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="page-btn"
        >
          Следующая ›
        </button>
        <button
          @click="goToPage(totalPages)"
          :disabled="currentPage === totalPages"
          class="page-btn"
        >
          Последняя »»
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { VisualizationHelpers } from '@/utils/visualization-helpers.js';
import { debounce } from '@/utils/debounce.js';

export default {
  name: 'ActivityDataTable',
  props: {
    data: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    filters: {
      type: Object,
      default: () => ({})
    },
    pageSize: {
      type: Number,
      default: 25
    },
    maxPagesShown: {
      type: Number,
      default: 7
    }
  },
  emits: ['sort-change', 'row-click', 'export', 'filter-change'],
  setup(props, { emit }) {
    // Реактивные данные
    const searchQuery = ref('');
    const searchInput = ref('');
    const viewMode = ref('table'); // 'table' | 'cards'
    const sortBy = ref('timestamp');
    const sortOrder = ref('desc'); // 'asc' | 'desc'
    const currentPage = ref(1);

    // Конфигурация колонок
    const columns = [
      {
        key: 'timestamp',
        label: 'Время',
        sortable: true,
        width: '150px',
        component: 'span'
      },
      {
        key: 'user_name',
        label: 'Пользователь',
        sortable: true,
        width: '200px',
        component: 'span'
      },
      {
        key: 'type',
        label: 'Действие',
        sortable: true,
        width: '120px',
        component: 'span'
      },
      {
        key: 'route_title',
        label: 'Страница',
        sortable: true,
        width: '250px',
        component: 'span'
      },
      {
        key: 'device',
        label: 'Устройство',
        sortable: false,
        width: '100px',
        component: 'span'
      }
    ];

    // Вычисляемые свойства
    const visibleColumns = computed(() => columns);

    // Debounced поиск
    const debouncedSearch = debounce((query) => {
      searchQuery.value = query;
    }, 300);

    const filteredData = computed(() => {
      try {
        if (!Array.isArray(props.data)) {
          return [];
        }

        let result = [...props.data];

        // Фильтруем валидные записи
        result = result.filter(entry =>
          entry &&
          typeof entry === 'object' &&
          entry !== null &&
          entry.user_id &&
          entry.timestamp &&
          typeof entry.type === 'string'
        );

        // Применяем поиск
        if (searchQuery.value.trim()) {
          const query = searchQuery.value.toLowerCase();
          result = result.filter(entry => {
            // Проверяем, что entry существует
            if (!entry) return false;

            return (entry.user_name || '').toLowerCase().includes(query) ||
                   (entry.route_title || '').toLowerCase().includes(query) ||
                   (entry.route_path || '').toLowerCase().includes(query) ||
                   (entry.type || '').toLowerCase().includes(query);
          });
        }

      // Сортировка
      result.sort((a, b) => {
        // Проверяем существование объектов
        if (!a || !b) return 0;

        let aVal = a[sortBy.value];
        let bVal = b[sortBy.value];

        // Специальная обработка для timestamp
        if (sortBy.value === 'timestamp') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }

        // Обработка строк
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1;
        return 0;
      });

      return result;
      } catch (error) {
        console.warn('[ActivityDataTable] Error filtering data:', error);
        return [];
      }
    });

    const totalCount = computed(() => filteredData.value.length);

    const totalPages = computed(() =>
      Math.ceil(totalCount.value / props.pageSize)
    );

    const paginatedData = computed(() => {
      try {
        if (!Array.isArray(filteredData.value)) {
          return [];
        }

        const start = (currentPage.value - 1) * props.pageSize;
        const end = start + props.pageSize;
        return filteredData.value.slice(start, end);
      } catch (error) {
        console.warn('[ActivityDataTable] Error paginating data:', error);
        return [];
      }
    });

    const displayedData = computed(() => paginatedData.value);

    const visiblePages = computed(() => {
      const total = totalPages.value;
      const current = currentPage.value;
      const maxShown = props.maxPagesShown;

      if (total <= maxShown) {
        return Array.from({ length: total }, (_, i) => i + 1);
      }

      const half = Math.floor(maxShown / 2);
      let start = Math.max(1, current - half);
      let end = Math.min(total, start + maxShown - 1);

      if (end - start + 1 < maxShown) {
        start = Math.max(1, end - maxShown + 1);
      }

      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    });

    const filtersApplied = computed(() => {
      return Object.values(props.filters).some(value =>
        value !== null && value !== undefined && value !== ''
      ) || searchQuery.value.trim();
    });

    const activeFilters = computed(() => {
      const filters = [];
      if (props.filters.dateFrom) {
        filters.push({ key: 'dateFrom', label: 'Дата от', value: props.filters.dateFrom });
      }
      if (props.filters.dateTo) {
        filters.push({ key: 'dateTo', label: 'Дата до', value: props.filters.dateTo });
      }
      if (props.filters.userId) {
        filters.push({ key: 'userId', label: 'Пользователь', value: `ID ${props.filters.userId}` });
      }
      if (props.filters.type) {
        filters.push({ key: 'type', label: 'Тип', value: props.filters.type });
      }
      if (searchQuery.value.trim()) {
        filters.push({ key: 'search', label: 'Поиск', value: searchQuery.value });
      }
      return filters;
    });

    // Методы
    const handleSort = (columnKey) => {
      if (sortBy.value === columnKey) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortBy.value = columnKey;
        sortOrder.value = 'asc';
      }

      emit('sort-change', { sortBy: sortBy.value, sortOrder: sortOrder.value });
    };

    const handleRowClick = (entry) => {
      emit('row-click', entry);
    };

    const handleExport = () => {
      emit('export', {
        data: filteredData.value,
        filters: props.filters,
        searchQuery: searchQuery.value
      });
    };

    const handleSearchInput = (event) => {
      debouncedSearch(event.target.value);
    };

    const removeFilter = (filterKey) => {
      if (filterKey === 'search') {
        searchQuery.value = '';
        searchInput.value = '';
      } else {
        // Для других фильтров отправляем событие
        emit('filter-change', { ...props.filters, [filterKey]: null });
      }
    };

    const goToPage = (page) => {
      if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
      }
    };

    const getEntryKey = (entry) => {
      if (!entry) return 'undefined-entry';
      return `${entry.timestamp || 'no-timestamp'}-${entry.user_id || 'no-user'}-${entry.type || 'no-type'}-${entry.route_path || ''}`;
    };

    const getRowClass = (entry) => {
      if (!entry) return {};
      return {
        'row-app-entry': entry.type === 'app_entry',
        'row-page-visit': entry.type === 'page_visit'
      };
    };

    const getCellValue = (column, entry) => {
      switch (column.key) {
        case 'timestamp':
          return formatTimestamp(entry.timestamp);
        case 'user_name':
          return entry.user_name || `User #${entry.user_id}`;
        case 'type':
          return getActionDescription(entry);
        case 'route_title':
          return entry.route_title || entry.route_path || 'Неизвестная страница';
        case 'device':
          return parseUserAgent(entry.user_agent).device;
        default:
          return entry[column.key] || '';
      }
    };

    const getCellProps = (column, entry) => {
      // Возвращает props для компонента ячейки, если нужен
      return {};
    };

    const getActionIcon = (type) => {
      if (!type) return '❓';
      return VisualizationHelpers.getActionIcon(type);
    };

    const getActionDescription = (entry) => {
      if (!entry) return 'Неизвестное действие';

      switch (entry.type) {
        case 'app_entry':
          return 'Открытие приложения';
        case 'page_visit':
          return 'Переход по страницам';
        default:
          return entry.type || 'Неизвестное действие';
      }
    };

    const formatTimestamp = (timestamp) => {
      return VisualizationHelpers.formatTimestamp(timestamp);
    };

    const parseUserAgent = (userAgent) => {
      return VisualizationHelpers.parseUserAgent(userAgent);
    };

    // Наблюдатели
    watch(() => props.data, () => {
      currentPage.value = 1; // Сбрасываем пагинацию при изменении данных
    });

    watch(searchQuery, () => {
      currentPage.value = 1; // Сбрасываем пагинацию при поиске
    });

    return {
      // Данные
      searchQuery,
      searchInput,
      viewMode,
      sortBy,
      sortOrder,
      currentPage,

      // Вычисляемые
      visibleColumns,
      filteredData,
      totalCount,
      totalPages,
      paginatedData,
      displayedData,
      visiblePages,
      filtersApplied,
      activeFilters,

      // Методы
      handleSort,
      handleRowClick,
      handleExport,
      handleSearchInput,
      removeFilter,
      goToPage,
      getEntryKey,
      getRowClass,
      getCellValue,
      getCellProps,
      getActionIcon,
      getActionDescription,
      formatTimestamp,
      parseUserAgent
    };
  }
};
</script>

<style scoped>
.activity-data-table {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.table-title {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.table-subtitle {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.filters-indicator {
  color: #2196F3;
  font-weight: 500;
}

.table-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.view-options {
  display: flex;
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
}

.view-btn {
  padding: 8px 16px;
  border: none;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.view-btn.active {
  background: #2196F3;
  color: white;
}

.view-btn:not(.active):hover {
  background: #f8f9fa;
}

.export-btn {
  padding: 8px 16px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.export-btn:hover {
  background: #45a049;
}

.table-filters {
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.search-container {
  position: relative;
  flex: 1;
  min-width: 300px;
}

.search-input {
  width: 100%;
  padding: 10px 40px 10px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #2196F3;
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  font-size: 16px;
}

.filter-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-badge {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.remove-filter {
  background: none;
  border: none;
  color: #1976d2;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0;
  margin-left: 4px;
}

.remove-filter:hover {
  color: #0d47a1;
}

.table-container {
  position: relative;
}

.table-loading,
.table-empty {
  padding: 40px 20px;
  text-align: center;
  color: #666;
  font-size: 14px;
}

.table-empty {
  color: #999;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: #f8f9fa;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  color: #333;
  border-bottom: 2px solid #dee2e6;
  cursor: pointer;
  user-select: none;
}

.data-table th.sortable {
  cursor: pointer;
}

.data-table th.sortable:hover {
  background: #e9ecef;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sort-icon {
  margin-left: 8px;
  color: #999;
  font-size: 12px;
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  font-size: 14px;
  color: #555;
}

.data-table tbody tr {
  transition: background 0.2s;
}

.data-table tbody tr:hover {
  background: #f8f9fa;
}

.data-table tbody tr.row-app-entry {
  border-left: 3px solid #4CAF50;
}

.data-table tbody tr.row-page-visit {
  border-left: 3px solid #2196F3;
}

.cell-content {
  display: flex;
  align-items: center;
}

.cell-timestamp {
  font-family: monospace;
  font-size: 13px;
}

.cell-user_name {
  font-weight: 500;
}

.cell-type {
  font-weight: 500;
}

.cell-route_title {
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-device {
  font-size: 12px;
  color: #666;
}

/* Карточки */
.cards-container {
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.activity-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.activity-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.activity-card.row-app-entry {
  border-left-color: #4CAF50;
}

.activity-card.row-page-visit {
  border-left-color: #2196F3;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-icon {
  font-size: 20px;
}

.card-timestamp {
  font-size: 12px;
  color: #666;
  font-family: monospace;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-user {
  font-weight: 600;
  color: #333;
}

.card-action,
.card-page,
.card-device {
  font-size: 14px;
  color: #555;
}

.card-page {
  font-style: italic;
  color: #666;
}

.card-device {
  font-size: 12px;
  color: #777;
}

/* Пагинация */
.table-pagination {
  padding: 16px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}

.pagination-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.page-btn {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #2196F3;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 4px;
  margin: 0 8px;
}

.page-number {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  min-width: 40px;
  text-align: center;
  transition: all 0.2s;
}

.page-number:hover {
  background: #f8f9fa;
  border-color: #2196F3;
}

.page-number.active {
  background: #2196F3;
  color: white;
  border-color: #2196F3;
}

/* Responsive */
@media (max-width: 1024px) {
  .table-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .table-actions {
    justify-content: center;
  }

  .cards-container {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

@media (max-width: 768px) {
  .activity-data-table {
    margin: 0 -16px;
    border-radius: 0;
  }

  .table-header,
  .table-filters,
  .table-pagination {
    padding: 16px;
  }

  .table-header {
    flex-direction: column;
    text-align: center;
  }

  .table-filters {
    flex-direction: column;
    align-items: stretch;
  }

  .search-container {
    min-width: auto;
  }

  .data-table {
    font-size: 12px;
  }

  .data-table th,
  .data-table td {
    padding: 8px 12px;
  }

  .cell-route_title {
    max-width: 150px;
  }

  .cards-container {
    padding: 16px;
    grid-template-columns: 1fr;
  }

  .table-pagination {
    flex-direction: column;
    text-align: center;
  }

  .pagination-controls {
    justify-content: center;
    flex-wrap: wrap;
  }
}
</style>