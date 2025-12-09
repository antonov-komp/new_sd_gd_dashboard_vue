/**
 * Unit-тесты для SectorDataAdapter
 * 
 * Тестирует получение данных сектора, интеграцию с DashboardSector1CService и обработку ошибок
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import SectorDataAdapter from '@/services/graph-state/SectorDataAdapter.js';
import { DashboardSector1CService } from '@/services/dashboard-sector-1c/index.js';
import { normalizeSectorDataToSnapshot } from '@/services/graph-state/snapshot-normalizer.js';

// Моки для зависимостей
vi.mock('@/services/dashboard-sector-1c/index.js', () => ({
  DashboardSector1CService: {
    getSectorData: vi.fn()
  }
}));

vi.mock('@/services/graph-state/snapshot-normalizer.js', () => ({
  normalizeSectorDataToSnapshot: vi.fn()
}));

describe('SectorDataAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSectorDataForSnapshot', () => {
    it('должен получить данные сектора через DashboardSector1CService', async () => {
      const mockSectorData = {
        stages: [
          {
            id: 'formed',
            name: 'Сформировано обращение',
            employees: []
          }
        ],
        employees: [],
        zeroPointTickets: {}
      };

      DashboardSector1CService.getSectorData.mockResolvedValueOnce(mockSectorData);
      normalizeSectorDataToSnapshot.mockReturnValueOnce(mockSectorData);

      const result = await SectorDataAdapter.getSectorDataForSnapshot({
        useCache: true
      });

      expect(result).toEqual(mockSectorData);
      expect(DashboardSector1CService.getSectorData).toHaveBeenCalledWith(true, null);
      expect(normalizeSectorDataToSnapshot).toHaveBeenCalledWith(mockSectorData);
    });

    it('должен передать колбэк прогресса', async () => {
      const mockSectorData = { stages: [], employees: [], zeroPointTickets: {} };
      const progressCallback = vi.fn();

      DashboardSector1CService.getSectorData.mockResolvedValueOnce(mockSectorData);
      normalizeSectorDataToSnapshot.mockReturnValueOnce(mockSectorData);

      await SectorDataAdapter.getSectorDataForSnapshot({
        useCache: true,
        onProgress: progressCallback
      });

      expect(DashboardSector1CService.getSectorData).toHaveBeenCalledWith(
        true,
        progressCallback
      );
    });

    it('должен вернуть данные без нормализации, если normalize = false', async () => {
      const mockSectorData = { stages: [], employees: [], zeroPointTickets: {} };

      DashboardSector1CService.getSectorData.mockResolvedValueOnce(mockSectorData);

      const result = await SectorDataAdapter.getSectorDataForSnapshot({
        useCache: true,
        normalize: false
      });

      expect(result).toEqual(mockSectorData);
      expect(normalizeSectorDataToSnapshot).not.toHaveBeenCalled();
    });

    it('должен обработать ошибку получения данных', async () => {
      const error = new Error('Ошибка загрузки данных');
      DashboardSector1CService.getSectorData.mockRejectedValueOnce(error);

      await expect(
        SectorDataAdapter.getSectorDataForSnapshot({})
      ).rejects.toThrow('Ошибка загрузки данных');
    });

    it('должен использовать значения по умолчанию для опций', async () => {
      const mockSectorData = { stages: [], employees: [], zeroPointTickets: {} };

      DashboardSector1CService.getSectorData.mockResolvedValueOnce(mockSectorData);
      normalizeSectorDataToSnapshot.mockReturnValueOnce(mockSectorData);

      await SectorDataAdapter.getSectorDataForSnapshot({});

      expect(DashboardSector1CService.getSectorData).toHaveBeenCalledWith(true, null);
      expect(normalizeSectorDataToSnapshot).toHaveBeenCalled();
    });

    it('должен обработать includeTicketDetails (пока не реализовано)', async () => {
      const mockSectorData = { stages: [], employees: [], zeroPointTickets: {} };
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      DashboardSector1CService.getSectorData.mockResolvedValueOnce(mockSectorData);

      await SectorDataAdapter.getSectorDataForSnapshot({
        normalize: false,
        includeTicketDetails: true
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith('includeTicketDetails пока не реализовано');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('isDataAvailable', () => {
    it('должен вернуть true, если данные доступны', async () => {
      DashboardSector1CService.getSectorData.mockResolvedValueOnce({
        stages: [],
        employees: [],
        zeroPointTickets: {}
      });

      const result = await SectorDataAdapter.isDataAvailable();

      expect(result).toBe(true);
    });

    it('должен вернуть false, если данные недоступны', async () => {
      DashboardSector1CService.getSectorData.mockRejectedValueOnce(
        new Error('Ошибка')
      );

      const result = await SectorDataAdapter.isDataAvailable();

      expect(result).toBe(false);
    });

    it('должен вернуть false, если данные null', async () => {
      DashboardSector1CService.getSectorData.mockResolvedValueOnce(null);

      const result = await SectorDataAdapter.isDataAvailable();

      expect(result).toBe(false);
    });

    it('должен вернуть false, если данные undefined', async () => {
      DashboardSector1CService.getSectorData.mockResolvedValueOnce(undefined);

      const result = await SectorDataAdapter.isDataAvailable();

      expect(result).toBe(false);
    });
  });
});


