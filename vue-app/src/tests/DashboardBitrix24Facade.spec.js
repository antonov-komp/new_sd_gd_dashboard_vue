/**
 * Unit тесты для DashboardBitrix24Facade
 *
 * TASK-088-02: Решение конфликта импортов Bitrix24 API
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { DashboardBitrix24Facade } from '@/services/facades/DashboardBitrix24Facade.js';

// Мокаем зависимости
vi.mock('@/utils/lazy-services.js', () => ({
  LazyServiceLoader: {
    loadBitrix24Api: vi.fn()
  }
}));

const mockApiService = {
  call: vi.fn()
};

describe('DashboardBitrix24Facade', () => {
  let facade;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { LazyServiceLoader } = await import('@/utils/lazy-services.js');
    LazyServiceLoader.loadBitrix24Api.mockResolvedValue({
      Bitrix24ApiService: mockApiService
    });

    facade = new DashboardBitrix24Facade();
  });

  describe('Инициализация', () => {
    test('должен правильно инициализироваться с доменом dashboard', () => {
      expect(facade.domain).toBe('dashboard');
      expect(facade.cacheTimeout).toBe(3 * 60 * 1000); // 3 минуты для дашбордов
    });
  });

  describe('getDepartmentsForDashboard', () => {
    test('должен получать отделы для дашборда', async () => {
      const mockDepartments = [
        { ID: '1', NAME: 'IT Department', UF_HEAD: '1' }
      ];

      mockApiService.call.mockResolvedValue({
        result: mockDepartments
      });

      const result = await facade.getDepartmentsForDashboard();

      expect(mockApiService.call).toHaveBeenCalledWith('department.get', {
        select: ['ID', 'NAME', 'UF_HEAD', 'PARENT', 'SORT'],
        order: { SORT: 'ASC' },
        start: 0
      });

      expect(result).toEqual(mockDepartments);
    });
  });

  describe('getUsersForDashboard', () => {
    test('должен получать пользователей для дашборда', async () => {
      const mockUsers = [
        { ID: '1', NAME: 'Test User', ACTIVE: 'Y' }
      ];

      mockApiService.call.mockResolvedValue({
        result: mockUsers
      });

      const result = await facade.getUsersForDashboard({
        departmentId: 123,
        activeOnly: true
      });

      expect(mockApiService.call).toHaveBeenCalledWith('user.get', {
        filter: {
          UF_DEPARTMENT: 123,
          ACTIVE: 'Y'
        },
        select: expect.any(Array)
      });

      expect(result[0]).toHaveProperty('fullName');
      expect(result[0]).toHaveProperty('hasPhoto');
    });
  });

  describe('getActivityChartData', () => {
    test('должен рассчитывать данные для графиков активности', async () => {
      const mockUsers = [
        {
          ID: '1',
          DATE_REGISTER: '2024-01-15T10:00:00',
          ACTIVE: 'Y'
        },
        {
          ID: '2',
          DATE_REGISTER: '2024-01-15T15:00:00',
          ACTIVE: 'Y'
        }
      ];

      mockApiService.call.mockResolvedValue({
        result: mockUsers
      });

      const result = await facade.getActivityChartData({
        period: 'day',
        limit: 5
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('count');
    });
  });

  describe('getDashboardSummary', () => {
    test('должен формировать сводную информацию дашборда', async () => {
      const mockDepartments = [{ ID: '1', NAME: 'IT' }];
      const mockUsers = [{ ID: '1', NAME: 'User', ACTIVE: 'Y' }];
      const mockStats = { total: 1, active: 1, new: 0 };

      mockApiService.call
        .mockResolvedValueOnce({ result: mockDepartments })
        .mockResolvedValueOnce({ result: mockUsers })
        .mockResolvedValueOnce({ result: mockStats });

      const result = await facade.getDashboardSummary();

      expect(result).toHaveProperty('departments');
      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('system');
      expect(result).toHaveProperty('timestamp');
    });
  });
});