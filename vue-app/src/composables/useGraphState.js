/**
 * Композабл для работы с графиком состояния сектора
 * 
 * Управляет состоянием и действиями для создания и загрузки слепков состояния сектора.
 * Интегрирован с SectorDataAdapter и SnapshotService.
 * 
 * @module useGraphState
 */

import { ref, computed } from 'vue';
import SectorDataAdapter from '@/services/graph-state/SectorDataAdapter.js';
import SnapshotService from '@/services/graph-state/SnapshotService.js';
import { useNotifications } from './useNotifications.js';

/**
 * Композабл для работы с графиком состояния сектора
 * 
 * Управляет состоянием и действиями для создания и загрузки слепков состояния сектора.
 * 
 * @returns {Object} Объект с реактивным состоянием и методами
 * 
 * @example
 * const { isLoading, error, currentSectorData, loadSectorDataForSnapshot, createSnapshot } = useGraphState();
 * 
 * // Загрузка данных сектора
 * await loadSectorDataForSnapshot(true);
 * 
 * // Создание слепка
 * await createSnapshot('week_start', { createdBy: { id: 123, name: 'Иван Иванов' } });
 */
export function useGraphState() {
  const isLoading = ref(false);
  const error = ref(null);
  const currentSectorData = ref(null);
  const loadingProgress = ref(0);

  const notifications = useNotifications();

  /**
   * Получить текущие данные сектора для создания слепка
   * 
   * Загружает данные сектора через SectorDataAdapter и нормализует их в формат слепка.
   * 
   * @param {boolean} useCache - Использовать кеш (по умолчанию true)
   * @param {Function|null} onProgress - Колбэк прогресса (опционально)
   * @returns {Promise<Object>} Нормализованные данные сектора
   * 
   * @example
   * await loadSectorDataForSnapshot(true, (progressInfo) => {
   *   console.log('Прогресс:', progressInfo.progress, '%');
   * });
   */
  const loadSectorDataForSnapshot = async (useCache = true, onProgress = null) => {
    isLoading.value = true;
    error.value = null;
    loadingProgress.value = 0;

    try {
      const data = await SectorDataAdapter.getSectorDataForSnapshot({
        useCache,
        onProgress: (progressInfo) => {
          // Обновляем прогресс
          if (progressInfo && typeof progressInfo.progress === 'number') {
            loadingProgress.value = progressInfo.progress;
          }
          
          // Вызываем пользовательский колбэк, если передан
          if (onProgress) {
            onProgress(progressInfo);
          }
        },
        normalize: true
      });

      currentSectorData.value = data;
      return data;
    } catch (err) {
      error.value = err.message || 'Ошибка загрузки данных сектора';
      notifications.error('Ошибка загрузки данных сектора: ' + error.value);
      throw err;
    } finally {
      isLoading.value = false;
      loadingProgress.value = 100;
    }
  };

  /**
   * Создать слепок из текущих данных сектора
   * 
   * Создаёт слепок состояния сектора на основе загруженных данных.
   * 
   * @param {String} type - Тип слепка: 'week_start' | 'week_end' | 'manual' | 'current'
   * @param {Object} metadata - Дополнительные метаданные
   * @param {Object} metadata.createdBy - Информация о создателе: { id: number, name: string }
   * @param {String} metadata.sectorId - Идентификатор сектора (по умолчанию: '1C')
   * @returns {Promise<Object>} Созданный слепок
   * 
   * @example
   * await createSnapshot('week_start', {
   *   createdBy: { id: 123, name: 'Иван Иванов' }
   * });
   */
  const createSnapshot = async (type, metadata = {}) => {
    if (!currentSectorData.value) {
      const errorMsg = 'Сначала загрузите данные сектора через loadSectorDataForSnapshot()';
      error.value = errorMsg;
      notifications.error(errorMsg);
      throw new Error(errorMsg);
    }

    isLoading.value = true;
    error.value = null;

    try {
      // Валидация типа слепка
      if (!['week_start', 'week_end', 'manual', 'current'].includes(type)) {
        throw new Error(`Неверный тип слепка: ${type}. Допустимые значения: week_start, week_end, manual, current`);
      }

      const snapshot = await SnapshotService.createSnapshot(
        currentSectorData.value,
        type,
        metadata
      );

      notifications.success('Слепок успешно создан');
      return snapshot;
    } catch (err) {
      error.value = err.message || 'Ошибка создания слепка';
      notifications.error('Ошибка создания слепка: ' + error.value);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Сбросить состояние
   */
  const resetState = () => {
    isLoading.value = false;
    error.value = null;
    currentSectorData.value = null;
    loadingProgress.value = 0;
  };

  /**
   * Проверить, загружены ли данные сектора
   */
  const hasSectorData = computed(() => {
    return currentSectorData.value !== null && currentSectorData.value !== undefined;
  });

  /**
   * Фильтры для дашборда
   */
  const filters = ref({
    stages: {
      formed: true,
      review: true,
      execution: true
    },
    employees: ['all'],
    dateRange: 'last-week',
    customDateRange: {
      startDate: null,
      endDate: null
    }
  });

  /**
   * Вычисление периода на основе фильтра дат
   */
  const selectedPeriod = computed(() => {
    const today = new Date();
    let startDate, endDate;

    switch (filters.value.dateRange) {
      case 'last-week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        endDate = today;
        break;
      case 'last-2-weeks':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 14);
        endDate = today;
        break;
      case 'last-month':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        endDate = today;
        break;
      case 'custom':
        startDate = filters.value.customDateRange.startDate 
          ? new Date(filters.value.customDateRange.startDate) 
          : null;
        endDate = filters.value.customDateRange.endDate 
          ? new Date(filters.value.customDateRange.endDate) 
          : null;
        break;
      default:
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        endDate = today;
    }

    return {
      startDate: startDate ? startDate.toISOString().split('T')[0] : null,
      endDate: endDate ? endDate.toISOString().split('T')[0] : null
    };
  });

  /**
   * Применить фильтры
   */
  const applyFilters = () => {
    // Логика применения фильтров (можно добавить дополнительную валидацию)
    saveFiltersToLocalStorage();
  };

  /**
   * Сбросить фильтры к значениям по умолчанию
   */
  const resetFilters = () => {
    filters.value = {
      stages: {
        formed: true,
        review: true,
        execution: true
      },
      employees: ['all'],
      dateRange: 'last-week',
      customDateRange: {
        startDate: null,
        endDate: null
      }
    };
    saveFiltersToLocalStorage();
  };

  /**
   * Сохранить фильтры в localStorage
   */
  const saveFiltersToLocalStorage = () => {
    try {
      localStorage.setItem('graphStateFilters', JSON.stringify(filters.value));
    } catch (e) {
      console.error('Ошибка сохранения фильтров в localStorage:', e);
    }
  };

  /**
   * Загрузить фильтры из localStorage
   */
  const loadFiltersFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('graphStateFilters');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Валидация загруженных данных
        if (parsed && typeof parsed === 'object') {
          filters.value = {
            stages: parsed.stages || {
              formed: true,
              review: true,
              execution: true
            },
            employees: parsed.employees || ['all'],
            dateRange: parsed.dateRange || 'last-week',
            customDateRange: parsed.customDateRange || {
              startDate: null,
              endDate: null
            }
          };
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки фильтров из localStorage:', e);
    }
  };

  /**
   * Проверить, есть ли активные фильтры
   */
  const hasActiveFilters = computed(() => {
    const stagesActive = Object.values(filters.value.stages).some(v => !v);
    const employeesActive = !filters.value.employees.includes('all');
    const dateRangeActive = filters.value.dateRange !== 'last-week';
    
    return stagesActive || employeesActive || dateRangeActive;
  });

  return {
    // Состояние
    isLoading,
    error,
    currentSectorData,
    loadingProgress,
    hasSectorData,
    
    // Фильтры
    filters,
    selectedPeriod,
    hasActiveFilters,
    
    // Методы
    loadSectorDataForSnapshot,
    createSnapshot,
    resetState,
    applyFilters,
    resetFilters,
    saveFiltersToLocalStorage,
    loadFiltersFromLocalStorage
  };
}

