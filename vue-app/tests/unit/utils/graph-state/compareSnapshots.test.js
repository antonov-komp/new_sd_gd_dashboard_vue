/**
 * Unit-тесты для CompareSnapshots
 * 
 * Тестирует сравнение слепков, вычисление дельты, валидацию и обработку edge cases
 */

import { describe, it, expect } from 'vitest';
import CompareSnapshots from '@/utils/graph-state/compareSnapshots.js';

describe('CompareSnapshots', () => {
  const mockSnapshot1 = {
    metadata: {
      version: '1.0',
      createdAt: '2025-12-01T08:00:00+03:00',
      type: 'week_start'
    },
    statistics: {
      stages: {
        formed: { count: 5 },
        review: { count: 3 },
        execution: { count: 8 },
        total: 16
      },
      employees: [
        {
          id: 456,
          name: 'Петр Петров',
          ticketsByStage: { formed: 2, review: 1, execution: 3 },
          totalTickets: 6
        }
      ],
      zeroPoint: {
        unassigned: 2,
        keeper: 1,
        total: 3
      }
    },
    ticketIds: [789, 790],
    tickets: []
  };

  const mockSnapshot2 = {
    metadata: {
      version: '1.0',
      createdAt: '2025-12-08T08:00:00+03:00',
      type: 'week_end'
    },
    statistics: {
      stages: {
        formed: { count: 3 },
        review: { count: 4 },
        execution: { count: 8 },
        total: 15
      },
      employees: [
        {
          id: 456,
          name: 'Петр Петров',
          ticketsByStage: { formed: 1, review: 2, execution: 3 },
          totalTickets: 6
        }
      ],
      zeroPoint: {
        unassigned: 1,
        keeper: 2,
        total: 3
      }
    },
    ticketIds: [790, 791],
    tickets: []
  };

  describe('compareTwoSnapshots', () => {
    it('должен сравнить два слепка и вычислить дельту', () => {
      const result = CompareSnapshots.compareTwoSnapshots(mockSnapshot1, mockSnapshot2);

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.stages).toBeDefined();
      expect(result.employees).toBeDefined();
      expect(result.zeroPoint).toBeDefined();
      expect(result.summary).toBeDefined();

      // Проверка дельты по этапам
      expect(result.stages.formed.delta).toBe(-2);
      expect(result.stages.formed.trend).toBe('decrease');
      expect(result.stages.review.delta).toBe(1);
      expect(result.stages.review.trend).toBe('increase');
      expect(result.stages.execution.delta).toBe(0);
      expect(result.stages.execution.trend).toBe('stable');
    });

    it('должен обработать отсутствие данных', () => {
      const emptySnapshot = {
        metadata: { createdAt: '2025-12-01T08:00:00+03:00', type: 'week_start', version: '1.0' },
        statistics: {
          stages: { formed: { count: 0 }, review: { count: 0 }, execution: { count: 0 }, total: 0 },
          employees: [],
          zeroPoint: { unassigned: 0, keeper: 0, total: 0 }
        },
        ticketIds: [],
        tickets: []
      };

      const result = CompareSnapshots.compareTwoSnapshots(emptySnapshot, mockSnapshot2);

      expect(result.stages.formed.delta).toBe(3);
      expect(result.stages.formed.trend).toBe('increase');
    });

    it('должен выбросить ошибку при невалидных слепках', () => {
      const invalidSnapshot = {};

      expect(() => {
        CompareSnapshots.compareTwoSnapshots(invalidSnapshot, mockSnapshot2);
      }).toThrow();
    });

    it('должен сравнивать без сотрудников, если includeEmployees = false', () => {
      const result = CompareSnapshots.compareTwoSnapshots(mockSnapshot1, mockSnapshot2, {
        includeEmployees: false
      });

      expect(result.employees).toEqual([]);
      expect(result.stages).toBeDefined();
    });

    it('должен сравнивать с тикетами, если includeTickets = true', () => {
      const result = CompareSnapshots.compareTwoSnapshots(mockSnapshot1, mockSnapshot2, {
        includeTickets: true
      });

      expect(result.tickets).toBeDefined();
    });
  });

  describe('calculateDelta', () => {
    it('должен вычислить дельту между двумя значениями', () => {
      const result = CompareSnapshots.calculateDelta(5, 3);

      expect(result.value1).toBe(5);
      expect(result.value2).toBe(3);
      expect(result.delta).toBe(-2);
      expect(result.deltaPercent).toBe(-40);
      expect(result.trend).toBe('decrease');
    });

    it('должен обработать null и undefined', () => {
      const result1 = CompareSnapshots.calculateDelta(null, 5);
      expect(result1.value1).toBe(0);
      expect(result1.value2).toBe(5);
      expect(result1.delta).toBe(5);

      const result2 = CompareSnapshots.calculateDelta(5, undefined);
      expect(result2.value1).toBe(5);
      expect(result2.value2).toBe(0);
      expect(result2.delta).toBe(-5);
    });

    it('должен обработать деление на ноль', () => {
      const result = CompareSnapshots.calculateDelta(0, 5);
      expect(result.value1).toBe(0);
      expect(result.value2).toBe(5);
      expect(result.delta).toBe(5);
      expect(result.deltaPercent).toBe(Infinity);
    });

    it('должен обработать одинаковые значения', () => {
      const result = CompareSnapshots.calculateDelta(5, 5);
      expect(result.delta).toBe(0);
      expect(result.deltaPercent).toBe(0);
      expect(result.trend).toBe('stable');
    });

    it('должен обработать увеличение значения', () => {
      const result = CompareSnapshots.calculateDelta(3, 5);
      expect(result.delta).toBe(2);
      expect(result.deltaPercent).toBeGreaterThan(0);
      expect(result.trend).toBe('increase');
    });
  });

  describe('validateSnapshot', () => {
    it('должен валидировать корректный слепок', () => {
      const result = CompareSnapshots.validateSnapshot(mockSnapshot1);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('должен обнаружить отсутствие обязательных полей', () => {
      const invalidSnapshot = {};

      const result = CompareSnapshots.validateSnapshot(invalidSnapshot);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('должен обнаружить отсутствие этапов', () => {
      const invalidSnapshot = {
        metadata: { createdAt: '2025-12-01T08:00:00+03:00', type: 'week_start', version: '1.0' },
        statistics: {}
      };

      const result = CompareSnapshots.validateSnapshot(invalidSnapshot);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('stages'))).toBe(true);
    });

    it('должен обнаружить отсутствие метаданных', () => {
      const invalidSnapshot = {
        statistics: {
          stages: { formed: { count: 0 }, review: { count: 0 }, execution: { count: 0 } }
        }
      };

      const result = CompareSnapshots.validateSnapshot(invalidSnapshot);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('metadata'))).toBe(true);
    });
  });

  describe('compareMultipleSnapshots', () => {
    it('должен сравнить несколько слепков', () => {
      const snapshots = [mockSnapshot1, mockSnapshot2];

      const result = CompareSnapshots.compareMultipleSnapshots(snapshots);

      expect(result.snapshots).toHaveLength(2);
      expect(result.comparisons).toBeDefined();
      expect(result.trends).toBeDefined();
    });

    it('должен отсортировать слепки по дате', () => {
      const unsortedSnapshots = [mockSnapshot2, mockSnapshot1];

      const result = CompareSnapshots.compareMultipleSnapshots(unsortedSnapshots);

      expect(result.snapshots).toHaveLength(2);
      // Первый слепок должен быть более ранним
      const firstDate = new Date(result.snapshots[0].metadata.createdAt);
      const secondDate = new Date(result.snapshots[1].metadata.createdAt);
      expect(firstDate.getTime()).toBeLessThanOrEqual(secondDate.getTime());
    });

    it('должен обработать пустой массив слепков', () => {
      const result = CompareSnapshots.compareMultipleSnapshots([]);

      expect(result.snapshots).toHaveLength(0);
      expect(result.comparisons).toHaveLength(0);
    });

    it('должен обработать один слепок', () => {
      const result = CompareSnapshots.compareMultipleSnapshots([mockSnapshot1]);

      expect(result.snapshots).toHaveLength(1);
      expect(result.comparisons).toHaveLength(0);
    });
  });

  describe('normalizeValue', () => {
    it('должен нормализовать null в 0', () => {
      expect(CompareSnapshots.normalizeValue(null)).toBe(0);
    });

    it('должен нормализовать undefined в 0', () => {
      expect(CompareSnapshots.normalizeValue(undefined)).toBe(0);
    });

    it('должен нормализовать NaN в 0', () => {
      expect(CompareSnapshots.normalizeValue(NaN)).toBe(0);
    });

    it('должен вернуть число как есть', () => {
      expect(CompareSnapshots.normalizeValue(5)).toBe(5);
      expect(CompareSnapshots.normalizeValue(-3)).toBe(-3);
      expect(CompareSnapshots.normalizeValue(0)).toBe(0);
    });
  });

  describe('getTrend', () => {
    it('должен определить тренд "increase" для положительной дельты', () => {
      expect(CompareSnapshots.getTrend(5)).toBe('increase');
      expect(CompareSnapshots.getTrend(0.1)).toBe('increase');
    });

    it('должен определить тренд "decrease" для отрицательной дельты', () => {
      expect(CompareSnapshots.getTrend(-5)).toBe('decrease');
      expect(CompareSnapshots.getTrend(-0.1)).toBe('decrease');
    });

    it('должен определить тренд "stable" для нулевой дельты', () => {
      expect(CompareSnapshots.getTrend(0)).toBe('stable');
    });
  });
});

