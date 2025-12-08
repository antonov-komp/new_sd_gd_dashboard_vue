/**
 * Unit-тесты для SnapshotService
 * 
 * Тестирует методы создания, чтения, удаления слепков и нормализацию данных
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SnapshotService from '@/services/graph-state/SnapshotService.js';

// Моки для fetch и window
global.fetch = vi.fn();
global.window = {
  location: {
    pathname: '/vue-app/index.html'
  }
};

// Мок для snapshot-config
vi.mock('@/config/snapshot-config.js', () => ({
  default: {
    apiBaseUrl: '',
    snapshotsEndpoint: '/api/snapshots.php',
    defaultSectorId: '1C',
    snapshotVersion: '1.0',
    timeout: 30000
  }
}));

describe('SnapshotService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSnapshot', () => {
    it('должен создать слепок успешно', async () => {
      const mockSectorData = {
        stages: [
          {
            id: 'formed',
            name: 'Сформировано обращение',
            employees: [
              {
                id: 456,
                name: 'Петр Петров',
                tickets: [
                  { id: 789, title: 'Тикет 1', stageId: 'formed' }
                ]
              }
            ]
          },
          {
            id: 'review',
            name: 'Рассмотрение ТЗ',
            employees: []
          },
          {
            id: 'execution',
            name: 'Исполнение',
            employees: []
          }
        ],
        employees: [
          { id: 456, name: 'Петр Петров' }
        ],
        zeroPointTickets: {
          formed: [],
          review: [],
          execution: []
        }
      };

      const mockSnapshot = {
        metadata: {
          version: '1.0',
          createdAt: '2025-12-08T10:00:00+03:00',
          type: 'manual',
          sectorId: '1C',
          createdBy: {
            id: 123,
            name: 'Иван Иванов'
          }
        },
        statistics: {
          stages: {
            formed: { count: 1 },
            review: { count: 0 },
            execution: { count: 0 }
          },
          employees: [],
          zeroPoint: {
            unassigned: 0,
            keeper: 0,
            total: 0
          }
        },
        ticketIds: [789],
        tickets: []
      };

      const mockResponse = {
        success: true,
        data: {
          snapshot: mockSnapshot
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await SnapshotService.createSnapshot(
        mockSectorData,
        'manual',
        {
          createdBy: { id: 123, name: 'Иван Иванов' }
        }
      );

      expect(result).toBeDefined();
      expect(result.metadata.type).toBe('manual');
      expect(result.metadata.createdBy.id).toBe(123);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('должен обработать ошибку при создании слепка (network error)', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        SnapshotService.createSnapshot({ stages: [], employees: [], zeroPointTickets: {} }, 'manual', {})
      ).rejects.toThrow();
    });

    it('должен обработать ошибку API при создании слепка', async () => {
      const mockResponse = {
        success: false,
        message: 'Ошибка создания слепка'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await expect(
        SnapshotService.createSnapshot({ stages: [], employees: [], zeroPointTickets: {} }, 'manual', {})
      ).rejects.toThrow('Ошибка создания слепка');
    });

    it('должен обработать HTTP ошибку при создании слепка', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(
        SnapshotService.createSnapshot({ stages: [], employees: [], zeroPointTickets: {} }, 'manual', {})
      ).rejects.toThrow('HTTP error! status: 500');
    });

    it('должен валидировать входные данные (неверный type)', async () => {
      await expect(
        SnapshotService.createSnapshot(
          { stages: [], employees: [], zeroPointTickets: {} },
          'invalid_type',
          {}
        )
      ).rejects.toThrow();
    });

    it('должен валидировать входные данные (отсутствие sectorData)', async () => {
      await expect(
        SnapshotService.createSnapshot(null, 'manual', {})
      ).rejects.toThrow();
    });
  });

  describe('getSnapshot', () => {
    it('должен получить слепок по дате и типу', async () => {
      const mockSnapshot = {
        metadata: {
          version: '1.0',
          createdAt: '2025-12-08T10:00:00+03:00',
          type: 'week_start'
        },
        statistics: {
          stages: {
            formed: { count: 5 }
          }
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { snapshot: mockSnapshot }
        })
      });

      const result = await SnapshotService.getSnapshot('2025-12-08', 'week_start');

      expect(result).toEqual(mockSnapshot);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('get'),
        expect.any(Object)
      );
    });

    it('должен вернуть null, если слепок не найден', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 404,
        ok: false
      });

      const result = await SnapshotService.getSnapshot('2025-12-08', 'week_start');

      expect(result).toBeNull();
    });

    it('должен обработать ошибку при получении слепка', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          message: 'Слепок не найден'
        })
      });

      await expect(
        SnapshotService.getSnapshot('2025-12-08', 'week_start')
      ).rejects.toThrow('Слепок не найден');
    });
  });

  describe('getAllSnapshots', () => {
    it('должен получить все слепки за период', async () => {
      const mockSnapshots = [
        {
          date: '2025-12-01',
          type: 'week_start',
          metadata: { createdAt: '2025-12-01T08:00:00+03:00' }
        },
        {
          date: '2025-12-07',
          type: 'week_end',
          metadata: { createdAt: '2025-12-07T23:59:00+03:00' }
        }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { snapshots: mockSnapshots }
        })
      });

      // Моки для загрузки деталей каждого слепка
      mockSnapshots.forEach(() => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { snapshot: { metadata: {}, statistics: {}, ticketIds: [], tickets: [] } }
          })
        });
      });

      const result = await SnapshotService.getAllSnapshots({
        startDate: '2025-12-01',
        endDate: '2025-12-07'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('должен обработать ошибку при получении списка слепков', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          message: 'Ошибка получения списка слепков'
        })
      });

      await expect(
        SnapshotService.getAllSnapshots({
          startDate: '2025-12-01',
          endDate: '2025-12-07'
        })
      ).rejects.toThrow('Ошибка получения списка слепков');
    });
  });

  describe('deleteSnapshot', () => {
    it('должен удалить слепок по дате и типу', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { deleted: true }
        })
      });

      const result = await SnapshotService.deleteSnapshot('2025-12-08', 'week_start');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('delete'),
        expect.any(Object)
      );
    });

    it('должен обработать ошибку при удалении слепка', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          message: 'Ошибка удаления слепка'
        })
      });

      await expect(
        SnapshotService.deleteSnapshot('2025-12-08', 'week_start')
      ).rejects.toThrow('Ошибка удаления слепка');
    });
  });

  describe('normalizeSectorData', () => {
    it('должен нормализовать данные сектора', () => {
      const sectorData = {
        stages: [
          {
            id: 'formed',
            name: 'Сформировано обращение',
            employees: [
              {
                id: 456,
                name: 'Петр Петров',
                tickets: [
                  { id: 789, title: 'Тикет 1', stageId: 'formed' }
                ]
              }
            ]
          },
          {
            id: 'review',
            name: 'Рассмотрение ТЗ',
            employees: []
          },
          {
            id: 'execution',
            name: 'Исполнение',
            employees: []
          }
        ],
        employees: [
          { id: 456, name: 'Петр Петров' }
        ],
        zeroPointTickets: {
          formed: [{ id: 790 }],
          review: [],
          execution: []
        }
      };

      const normalized = SnapshotService.normalizeSectorData(sectorData);

      expect(normalized.statistics.stages.formed.count).toBe(1);
      expect(normalized.statistics.stages.review.count).toBe(0);
      expect(normalized.statistics.stages.execution.count).toBe(0);
      expect(normalized.statistics.employees).toHaveLength(1);
      expect(normalized.ticketIds).toContain(789);
      expect(normalized.ticketIds).toContain(790);
    });

    it('должен обработать пустые данные сектора', () => {
      const sectorData = {
        stages: [],
        employees: [],
        zeroPointTickets: {}
      };

      const normalized = SnapshotService.normalizeSectorData(sectorData);

      expect(normalized.statistics.stages.formed.count).toBe(0);
      expect(normalized.statistics.stages.review.count).toBe(0);
      expect(normalized.statistics.stages.execution.count).toBe(0);
      expect(normalized.statistics.employees).toHaveLength(0);
      expect(normalized.ticketIds).toHaveLength(0);
    });
  });

  describe('generateSnapshotMetadata', () => {
    it('должен сгенерировать метаданные слепка', () => {
      const metadata = SnapshotService.generateSnapshotMetadata(
        'manual',
        { id: 123, name: 'Иван Иванов' },
        '1C'
      );

      expect(metadata).toBeDefined();
      expect(metadata.type).toBe('manual');
      expect(metadata.sectorId).toBe('1C');
      expect(metadata.createdBy.id).toBe(123);
      expect(metadata.createdBy.name).toBe('Иван Иванов');
      expect(metadata.version).toBe('1.0');
      expect(metadata.createdAt).toBeDefined();
    });

    it('должен использовать значения по умолчанию для опциональных параметров', () => {
      const metadata = SnapshotService.generateSnapshotMetadata('week_start');

      expect(metadata.sectorId).toBe('1C');
      expect(metadata.createdBy).toBeDefined();
    });
  });

  describe('validateSnapshot', () => {
    it('должен валидировать корректный слепок', () => {
      const snapshot = {
        metadata: {
          version: '1.0',
          createdAt: '2025-12-08T10:00:00+03:00',
          type: 'manual',
          sectorId: '1C'
        },
        statistics: {
          stages: {
            formed: { count: 5 },
            review: { count: 3 },
            execution: { count: 8 }
          },
          employees: [],
          zeroPoint: { unassigned: 0, keeper: 0, total: 0 }
        },
        ticketIds: [],
        tickets: []
      };

      const result = SnapshotService.validateSnapshot(snapshot);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('должен обнаружить отсутствие обязательных полей', () => {
      const invalidSnapshot = {};

      const result = SnapshotService.validateSnapshot(invalidSnapshot);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('должен обнаружить отсутствие этапов', () => {
      const invalidSnapshot = {
        metadata: { createdAt: '2025-12-08T10:00:00+03:00', type: 'week_start' },
        statistics: {}
      };

      const result = SnapshotService.validateSnapshot(invalidSnapshot);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('stages'))).toBe(true);
    });
  });

  describe('validateSectorData', () => {
    it('должен валидировать корректные данные сектора', () => {
      const sectorData = {
        stages: [
          {
            id: 'formed',
            employees: []
          }
        ],
        employees: [],
        zeroPointTickets: {}
      };

      const result = SnapshotService.validateSectorData(sectorData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('должен обнаружить отсутствие обязательных полей', () => {
      const invalidData = {};

      const result = SnapshotService.validateSectorData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

