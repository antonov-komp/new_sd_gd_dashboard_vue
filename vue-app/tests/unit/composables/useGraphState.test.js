/**
 * Unit-тесты для useGraphState композабла
 * 
 * Тестирует управление состоянием фильтров, вычисление периода, сохранение/загрузку из localStorage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGraphState } from '@/composables/useGraphState.js';
import SectorDataAdapter from '@/services/graph-state/SectorDataAdapter.js';
import SnapshotService from '@/services/graph-state/SnapshotService.js';
import { useNotifications } from '@/composables/useNotifications.js';

// Моки для зависимостей
vi.mock('@/services/graph-state/SectorDataAdapter.js', () => ({
  default: {
    getSectorDataForSnapshot: vi.fn()
  }
}));

vi.mock('@/services/graph-state/SnapshotService.js', () => ({
  default: {
    createSnapshot: vi.fn()
  }
}));

vi.mock('@/composables/useNotifications.js', () => ({
  useNotifications: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }))
}));

// Мок для localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

describe('useGraphState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('должен инициализировать фильтры со значениями по умолчанию', () => {
    const { filters } = useGraphState();

    expect(filters.value.stages.formed).toBe(true);
    expect(filters.value.stages.review).toBe(true);
    expect(filters.value.stages.execution).toBe(true);
    expect(filters.value.employees).toEqual(['all']);
    expect(filters.value.dateRange).toBe('last-week');
  });

  it('должен вычислить период на основе фильтра дат (last-week)', () => {
    const { filters, selectedPeriod } = useGraphState();

    filters.value.dateRange = 'last-week';

    expect(selectedPeriod.value).toBeDefined();
    expect(selectedPeriod.value.startDate).toBeDefined();
    expect(selectedPeriod.value.endDate).toBeDefined();
  });

  it('должен вычислить период для last-2-weeks', () => {
    const { filters, selectedPeriod } = useGraphState();

    filters.value.dateRange = 'last-2-weeks';

    expect(selectedPeriod.value.startDate).toBeDefined();
    expect(selectedPeriod.value.endDate).toBeDefined();
  });

  it('должен вычислить период для last-month', () => {
    const { filters, selectedPeriod } = useGraphState();

    filters.value.dateRange = 'last-month';

    expect(selectedPeriod.value.startDate).toBeDefined();
    expect(selectedPeriod.value.endDate).toBeDefined();
  });

  it('должен вычислить период для custom', () => {
    const { filters, selectedPeriod } = useGraphState();

    filters.value.dateRange = 'custom';
    filters.value.customDateRange.startDate = '2025-12-01';
    filters.value.customDateRange.endDate = '2025-12-07';

    expect(selectedPeriod.value.startDate).toBe('2025-12-01');
    expect(selectedPeriod.value.endDate).toBe('2025-12-07');
  });

  it('должен сохранить фильтры в localStorage', () => {
    const { filters, saveFiltersToLocalStorage } = useGraphState();

    filters.value.dateRange = 'last-month';
    saveFiltersToLocalStorage();

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'graphStateFilters',
      expect.stringContaining('last-month')
    );
  });

  it('должен загрузить фильтры из localStorage', () => {
    const savedFilters = {
      stages: { formed: false, review: true, execution: true },
      employees: ['all'],
      dateRange: 'last-month',
      customDateRange: {
        startDate: null,
        endDate: null
      }
    };

    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(savedFilters));

    const { filters, loadFiltersFromLocalStorage } = useGraphState();
    loadFiltersFromLocalStorage();

    expect(filters.value.dateRange).toBe('last-month');
    expect(filters.value.stages.formed).toBe(false);
  });

  it('должен обработать ошибку при загрузке фильтров из localStorage', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorageMock.getItem.mockReturnValueOnce('invalid json');

    const { loadFiltersFromLocalStorage } = useGraphState();
    loadFiltersFromLocalStorage();

    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('должен сбросить фильтры к значениям по умолчанию', () => {
    const { filters, resetFilters } = useGraphState();

    filters.value.dateRange = 'last-month';
    filters.value.stages.formed = false;

    resetFilters();

    expect(filters.value.dateRange).toBe('last-week');
    expect(filters.value.stages.formed).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('должен определить, есть ли активные фильтры', () => {
    const { filters, hasActiveFilters } = useGraphState();

    // По умолчанию нет активных фильтров
    expect(hasActiveFilters.value).toBe(false);

    // Активируем фильтр по этапам
    filters.value.stages.formed = false;
    expect(hasActiveFilters.value).toBe(true);

    // Сбрасываем и активируем фильтр по датам
    filters.value.stages.formed = true;
    filters.value.dateRange = 'last-month';
    expect(hasActiveFilters.value).toBe(true);
  });

  it('должен загрузить данные сектора для создания слепка', async () => {
    const mockSectorData = {
      statistics: {
        stages: { formed: { count: 5 } }
      },
      ticketIds: [],
      tickets: []
    };

    SectorDataAdapter.getSectorDataForSnapshot.mockResolvedValueOnce(mockSectorData);

    const { loadSectorDataForSnapshot, currentSectorData, isLoading } = useGraphState();

    const result = await loadSectorDataForSnapshot(true);

    expect(result).toEqual(mockSectorData);
    expect(currentSectorData.value).toEqual(mockSectorData);
    expect(isLoading.value).toBe(false);
  });

  it('должен обработать ошибку при загрузке данных сектора', async () => {
    const error = new Error('Ошибка загрузки данных');
    SectorDataAdapter.getSectorDataForSnapshot.mockRejectedValueOnce(error);

    const { loadSectorDataForSnapshot, error: errorState, isLoading } = useGraphState();

    await expect(loadSectorDataForSnapshot()).rejects.toThrow('Ошибка загрузки данных');
    expect(errorState.value).toBe('Ошибка загрузки данных');
    expect(isLoading.value).toBe(false);
  });

  it('должен создать слепок из текущих данных сектора', async () => {
    const mockSectorData = {
      statistics: { stages: {} },
      ticketIds: [],
      tickets: []
    };
    const mockSnapshot = {
      metadata: { type: 'manual' },
      statistics: {},
      ticketIds: [],
      tickets: []
    };

    SectorDataAdapter.getSectorDataForSnapshot.mockResolvedValueOnce(mockSectorData);
    SnapshotService.createSnapshot.mockResolvedValueOnce(mockSnapshot);

    const { loadSectorDataForSnapshot, createSnapshot } = useGraphState();

    await loadSectorDataForSnapshot();
    const result = await createSnapshot('manual', {
      createdBy: { id: 123, name: 'Иван Иванов' }
    });

    expect(result).toEqual(mockSnapshot);
    expect(SnapshotService.createSnapshot).toHaveBeenCalledWith(
      mockSectorData,
      'manual',
      { createdBy: { id: 123, name: 'Иван Иванов' } }
    );
  });

  it('должен выбросить ошибку при создании слепка без загруженных данных', async () => {
    const { createSnapshot, error: errorState } = useGraphState();

    await expect(createSnapshot('manual', {})).rejects.toThrow();
    expect(errorState.value).toBeDefined();
  });

  it('должен выбросить ошибку при неверном типе слепка', async () => {
    const mockSectorData = {
      statistics: { stages: {} },
      ticketIds: [],
      tickets: []
    };

    SectorDataAdapter.getSectorDataForSnapshot.mockResolvedValueOnce(mockSectorData);

    const { loadSectorDataForSnapshot, createSnapshot } = useGraphState();

    await loadSectorDataForSnapshot();
    await expect(createSnapshot('invalid_type', {})).rejects.toThrow();
  });

  it('должен сбросить состояние', () => {
    const { isLoading, error, currentSectorData, loadingProgress, resetState } = useGraphState();

    isLoading.value = true;
    error.value = 'Test error';
    currentSectorData.value = { test: 'data' };
    loadingProgress.value = 50;

    resetState();

    expect(isLoading.value).toBe(false);
    expect(error.value).toBe(null);
    expect(currentSectorData.value).toBe(null);
    expect(loadingProgress.value).toBe(0);
  });

  it('должен проверить, загружены ли данные сектора', () => {
    const { currentSectorData, hasSectorData } = useGraphState();

    expect(hasSectorData.value).toBe(false);

    currentSectorData.value = { statistics: {} };
    expect(hasSectorData.value).toBe(true);
  });

  it('должен обновить прогресс при загрузке данных', async () => {
    const mockSectorData = {
      statistics: { stages: {} },
      ticketIds: [],
      tickets: []
    };

    const progressCallback = vi.fn();
    SectorDataAdapter.getSectorDataForSnapshot.mockImplementation(async (options) => {
      if (options.onProgress) {
        options.onProgress({ progress: 50 });
      }
      return mockSectorData;
    });

    const { loadSectorDataForSnapshot, loadingProgress } = useGraphState();

    await loadSectorDataForSnapshot(true, progressCallback);

    expect(progressCallback).toHaveBeenCalled();
    expect(loadingProgress.value).toBe(100); // После завершения должно быть 100%
  });
});



