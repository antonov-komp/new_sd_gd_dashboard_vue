/**
 * Composable для работы со списком логов вебхуков
 * 
 * Расположение: vue-app/src/composables/useWebhookLogsList.js
 * 
 * Инкапсулирует логику загрузки, фильтрации, сортировки и пагинации логов
 * Использует типизированные интерфейсы из types/webhook-logs.js
 */

import { ref, computed, watch } from 'vue';
import { WebhookLogsApiService } from '@/services/webhook-logs-api.js';
import { 
  normalizeWebhookLogEntries,
  isValidWebhookLogEntry 
} from '@/types/webhook-logs.js';
import { validateFilters } from '@/utils/webhook-validators.js';

/**
 * Composable для работы со списком логов
 * 
 * @param {Object} options Опции
 * @param {boolean} options.autoLoad Автоматическая загрузка при монтировании
 * @param {Object} options.initialFilters Начальные фильтры
 * @param {number} options.initialPage Начальная страница
 * @param {number} options.initialLimit Начальный лимит
 * @returns {Object} API для работы со списком логов
 */
export function useWebhookLogsList(options = {}) {
  const {
    autoLoad = true,
    initialFilters = {},
    initialPage = 1,
    initialLimit = 50
  } = options;

  // Состояние
  const logs = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const filters = ref({ ...initialFilters });
  const pagination = ref({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    pages: 0
  });
  const sortBy = ref('timestamp');
  const sortOrder = ref('desc');
  const selectedLogs = ref([]);

  // Вычисляемые свойства
  const hasLogs = computed(() => logs.value.length > 0);
  const isEmpty = computed(() => !loading.value && logs.value.length === 0 && !error.value);
  const allSelected = computed(() => {
    if (logs.value.length === 0) return false;
    return logs.value.every(log => 
      selectedLogs.value.some(selected => 
        selected.timestamp === log.timestamp && selected.event === log.event
      )
    );
  });

  // Валидация фильтров
  const validateFiltersBeforeLoad = () => {
    if (!validateFilters(filters.value)) {
      throw new Error('Invalid filters');
    }
  };

  // Загрузка логов
  const loadLogs = async (forceRefresh = false) => {
    if (loading.value) {
      return; // Уже загружается
    }

    try {
      loading.value = true;
      error.value = null;

      // Валидация фильтров
      validateFiltersBeforeLoad();

      // Загрузка через API
      const result = await WebhookLogsApiService.getLogs(
        filters.value,
        pagination.value.page,
        pagination.value.limit,
        forceRefresh
      );

      // Нормализация и валидация данных
      const normalizedLogs = normalizeWebhookLogEntries(result.logs);
      
      // Фильтрация невалидных записей
      const validLogs = normalizedLogs.filter(log => isValidWebhookLogEntry(log));
      
      if (validLogs.length !== normalizedLogs.length) {
        console.warn(
          '[useWebhookLogsList] Filtered out invalid logs:',
          normalizedLogs.length - validLogs.length
        );
      }

      logs.value = validLogs;
      pagination.value = result.pagination || pagination.value;

      // Сортировка
      applySorting();

    } catch (err) {
      error.value = err.message || 'Failed to load logs';
      console.error('[useWebhookLogsList] Error loading logs:', err);
      logs.value = [];
    } finally {
      loading.value = false;
    }
  };

  // Применение сортировки
  const applySorting = () => {
    if (sortBy.value && logs.value.length > 0) {
      logs.value.sort((a, b) => {
        const aValue = a[sortBy.value];
        const bValue = b[sortBy.value];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }

        return sortOrder.value === 'asc' ? comparison : -comparison;
      });
    }
  };

  // Изменение фильтров
  const updateFilters = (newFilters) => {
    // Валидация новых фильтров
    if (!validateFilters(newFilters)) {
      throw new Error('Invalid filters');
    }

    filters.value = { ...filters.value, ...newFilters };
    pagination.value.page = 1; // Сброс на первую страницу
  };

  // Сброс фильтров
  const resetFilters = () => {
    filters.value = {};
    pagination.value.page = 1;
  };

  // Изменение страницы
  const changePage = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.value.pages) {
      pagination.value.page = newPage;
    }
  };

  // Изменение лимита
  const changeLimit = (newLimit) => {
    if (newLimit >= 1 && newLimit <= 1000) {
      pagination.value.limit = newLimit;
      pagination.value.page = 1; // Сброс на первую страницу
    }
  };

  // Сортировка
  const setSorting = (field, order = 'asc') => {
    if (sortBy.value === field) {
      // Переключение порядка
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy.value = field;
      sortOrder.value = order;
    }
    applySorting();
  };

  // Выбор логов
  const selectLog = (log) => {
    if (!isValidWebhookLogEntry(log)) {
      console.warn('[useWebhookLogsList] Attempted to select invalid log');
      return;
    }

    const index = selectedLogs.value.findIndex(
      selected => selected.timestamp === log.timestamp && selected.event === log.event
    );

    if (index === -1) {
      selectedLogs.value.push(log);
    } else {
      selectedLogs.value.splice(index, 1);
    }
  };

  const selectAll = () => {
    if (allSelected.value) {
      selectedLogs.value = [];
    } else {
      selectedLogs.value = [...logs.value];
    }
  };

  const clearSelection = () => {
    selectedLogs.value = [];
  };

  // Обновление логов из realtime
  const updateLogsFromRealtime = (newLogs) => {
    if (!Array.isArray(newLogs)) {
      return;
    }

    const normalizedLogs = normalizeWebhookLogEntries(newLogs);
    const validLogs = normalizedLogs.filter(log => isValidWebhookLogEntry(log));

    // Добавление новых логов в начало списка
    logs.value.unshift(...validLogs);

    // Обновление пагинации
    pagination.value.total += validLogs.length;
  };

  // Автоматическая загрузка при изменении фильтров или пагинации
  watch(
    [filters, () => pagination.value.page, () => pagination.value.limit],
    () => {
      if (autoLoad) {
        loadLogs();
      }
    },
    { deep: true }
  );

  // Автоматическая загрузка при монтировании
  if (autoLoad) {
    loadLogs();
  }

  return {
    // Состояние
    logs,
    loading,
    error,
    filters,
    pagination,
    sortBy,
    sortOrder,
    selectedLogs,
    
    // Вычисляемые свойства
    hasLogs,
    isEmpty,
    allSelected,
    
    // Методы
    loadLogs,
    updateFilters,
    resetFilters,
    changePage,
    changeLimit,
    setSorting,
    selectLog,
    selectAll,
    clearSelection,
    updateLogsFromRealtime
  };
}





