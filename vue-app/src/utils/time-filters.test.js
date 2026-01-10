/**
 * Unit тесты для утилит фильтрации по времени
 *
 * TASK-083: Исправление сортировки по времени в попапах графика сектора 1С
 */

import { filterTicketsByTimePeriod, TIME_FILTERS, TIME_FILTER_LABELS, getTicketsCountByPeriods, validateTimeFiltering } from './time-filters.js';
import { testTickets } from '../test-data.js';

/**
 * Основные тесты для filterTicketsByTimePeriod
 */
describe('Time Filters - filterTicketsByTimePeriod', () => {
  test('filters tickets for one month correctly', () => {
    const result = filterTicketsByTimePeriod(testTickets, TIME_FILTERS.ONE_MONTH);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('TICKET-001');
  });

  test('filters tickets for two months correctly', () => {
    const result = filterTicketsByTimePeriod(testTickets, TIME_FILTERS.TWO_MONTHS);
    expect(result).toHaveLength(2);
    expect(result.map(t => t.id)).toEqual(['TICKET-001', 'TICKET-002']);
  });

  test('filters tickets for six months plus correctly', () => {
    const result = filterTicketsByTimePeriod(testTickets, TIME_FILTERS.SIX_MONTHS_PLUS);
    expect(result).toHaveLength(2);
    expect(result.map(t => t.id)).toEqual(['TICKET-003', 'TICKET-004']);
  });

  test('filters tickets for one year plus correctly', () => {
    const result = filterTicketsByTimePeriod(testTickets, TIME_FILTERS.ONE_YEAR_PLUS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('TICKET-005');
  });

  test('handles empty array', () => {
    const result = filterTicketsByTimePeriod([], TIME_FILTERS.ONE_MONTH);
    expect(result).toHaveLength(0);
  });

  test('handles unknown period gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = filterTicketsByTimePeriod(testTickets, 'unknown_period');
    expect(result).toBe(testTickets); // Возвращает оригинал
    expect(consoleSpy).toHaveBeenCalledWith('filterTicketsByTimePeriod: Unknown period "unknown_period"');
    consoleSpy.mockRestore();
  });

  test('handles custom reference date', () => {
    const pastDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 дней назад
    const result = filterTicketsByTimePeriod(testTickets, TIME_FILTERS.ONE_MONTH, pastDate);
    // Все тикеты будут старше 30 дней относительно даты 100 дней назад
    expect(result).toHaveLength(0);
  });
});

/**
 * Тесты для getTicketsCountByPeriods
 */
describe('Time Filters - getTicketsCountByPeriods', () => {
  test('returns correct counts for all periods', () => {
    const counts = getTicketsCountByPeriods(testTickets);
    expect(counts).toEqual({
      [TIME_FILTERS.ONE_MONTH]: 1,
      [TIME_FILTERS.TWO_MONTHS]: 2,
      [TIME_FILTERS.SIX_MONTHS_PLUS]: 2,
      [TIME_FILTERS.ONE_YEAR_PLUS]: 1
    });
  });
});

/**
 * Тесты для validateTimeFiltering
 */
describe('Time Filters - validateTimeFiltering', () => {
  test('validates correct filtering', () => {
    const counts = getTicketsCountByPeriods(testTickets);
    const isValid = validateTimeFiltering(testTickets, counts);
    expect(isValid).toBe(true);
  });

  test('detects incorrect filtering', () => {
    const invalidCounts = {
      [TIME_FILTERS.ONE_MONTH]: 0,
      [TIME_FILTERS.TWO_MONTHS]: 0,
      [TIME_FILTERS.SIX_MONTHS_PLUS]: 0,
      [TIME_FILTERS.ONE_YEAR_PLUS]: 0
    };
    const isValid = validateTimeFiltering(testTickets, invalidCounts);
    expect(isValid).toBe(false);
  });
});

/**
 * Тесты производительности
 */
describe('Time Filters - Performance', () => {
  test('filters large dataset within time limit', () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: `TICKET-${String(i + 1).padStart(4, '0')}`,
      title: `Тестовый тикет ${i + 1}`,
      description: `Описание тестового тикета номер ${i + 1}`,
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'open'
    }));

    const startTime = performance.now();
    const result = filterTicketsByTimePeriod(largeDataset, TIME_FILTERS.ONE_MONTH);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(100); // < 100ms
    expect(result.length).toBeGreaterThan(0);
  });
});

/**
 * Тесты констант
 */
describe('Time Filters - Constants', () => {
  test('TIME_FILTERS contains expected keys', () => {
    expect(TIME_FILTERS).toHaveProperty('ONE_MONTH');
    expect(TIME_FILTERS).toHaveProperty('TWO_MONTHS');
    expect(TIME_FILTERS).toHaveProperty('SIX_MONTHS_PLUS');
    expect(TIME_FILTERS).toHaveProperty('ONE_YEAR_PLUS');
  });

  test('TIME_FILTER_LABELS contains labels for all filters', () => {
    Object.values(TIME_FILTERS).forEach(filterKey => {
      expect(TIME_FILTER_LABELS).toHaveProperty(filterKey);
      expect(typeof TIME_FILTER_LABELS[filterKey]).toBe('string');
    });
  });
});