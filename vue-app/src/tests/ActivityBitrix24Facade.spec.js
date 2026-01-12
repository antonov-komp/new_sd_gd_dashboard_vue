/**
 * Unit тесты для ActivityBitrix24Facade
 *
 * TASK-088-02: Решение конфликта импортов Bitrix24 API
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { ActivityBitrix24Facade } from '@/services/facades/ActivityBitrix24Facade.js';

// Мокаем LazyServiceLoader
vi.mock('@/utils/lazy-services.js', () => ({
  LazyServiceLoader: {
    loadBitrix24Api: vi.fn()
  }
}));

// Мокаем Bitrix24ApiService
const mockApiService = {
  call: vi.fn()
};

describe('ActivityBitrix24Facade', () => {
  let facade;

  beforeEach(async () => {
    // Очищаем все моки
    vi.clearAllMocks();

    // Мокаем загрузку API
    const { LazyServiceLoader } = await import('@/utils/lazy-services.js');
    LazyServiceLoader.loadBitrix24Api.mockResolvedValue({
      Bitrix24ApiService: mockApiService
    });

    // Создаем экземпляр фасада
    facade = new ActivityBitrix24Facade();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Инициализация', () => {
    test('должен правильно инициализироваться', () => {
      expect(facade.domain).toBe('activity');
      expect(facade.cache).toBeInstanceOf(Map);
      expect(facade.cacheTimeout).toBe(5 * 60 * 1000); // 5 минут
    });

    test('должен иметь правильные начальные метрики', () => {
      const metrics = facade.getMetrics();
      expect(metrics.domain).toBe('activity');
      expect(metrics.cache.size).toBe(0);
      expect(metrics.api.totalCalls).toBe(0);
      expect(metrics.api.errors).toBe(0);
    });
  });

  describe('getUsersList', () => {
    test('должен вызывать user.get с правильными параметрами', async () => {
      const mockUsers = [
        { ID: '1', NAME: 'Test User', ACTIVE: 'Y' },
        { ID: '2', NAME: 'Another User', ACTIVE: 'Y' }
      ];

      mockApiService.call.mockResolvedValue({
        result: mockUsers
      });

      const filters = { ACTIVE: 'Y' };
      const result = await facade.getUsersList(filters);

      expect(mockApiService.call).toHaveBeenCalledWith('user.get', {
        filter: {
          ACTIVE: 'Y' // Автоматически добавляется активные пользователи
        },
        select: expect.arrayContaining([
          'ID', 'NAME', 'LAST_NAME', 'EMAIL',
          'UF_DEPARTMENT', 'ACTIVE', 'DATE_REGISTER',
          'PERSONAL_PHOTO', 'WORK_POSITION'
        ])
      });

      expect(result).toEqual(mockUsers);
    });

    test('должен фильтровать по отделу', async () => {
      const mockUsers = [
        { ID: '1', NAME: 'User 1', UF_DEPARTMENT: [123] }
      ];

      mockApiService.call.mockResolvedValue({
        result: mockUsers
      });

      await facade.getUsersList({ UF_DEPARTMENT: 123 });

      expect(mockApiService.call).toHaveBeenCalledWith('user.get', {
        filter: {
          ACTIVE: 'Y',
          UF_DEPARTMENT: 123
        },
        select: expect.any(Array)
      });
    });

    test('должен кешировать результаты для GET методов', async () => {
      mockApiService.call.mockResolvedValue({
        result: [{ ID: '1', NAME: 'Test User' }]
      });

      // Первый вызов
      await facade.getUsersList();
      // Второй вызов (должен использовать кеш)
      await facade.getUsersList();

      expect(mockApiService.call).toHaveBeenCalledTimes(1);
    });

    test('должен обрабатывать ошибки API', async () => {
      mockApiService.call.mockRejectedValue(new Error('API Error'));

      await expect(facade.getUsersList()).rejects.toThrow();
    });
  });

  describe('getUserDetails', () => {
    test('должен получать детальную информацию о пользователе', async () => {
      const mockUser = {
        ID: '1',
        NAME: 'Test User',
        EMAIL: 'test@example.com'
      };

      mockApiService.call.mockResolvedValue({
        result: [mockUser]
      });

      const result = await facade.getUserDetails('1');

      expect(mockApiService.call).toHaveBeenCalledWith('user.get', {
        filter: { ID: 1 },
        select: expect.arrayContaining([
          'ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'EMAIL',
          'UF_DEPARTMENT', 'ACTIVE', 'DATE_REGISTER', 'TIMESTAMP_X',
          'PERSONAL_PHONE', 'WORK_PHONE', 'PERSONAL_PHOTO',
          'WORK_POSITION', 'WORK_COMPANY'
        ])
      });

      expect(result).toEqual(mockUser);
    });

    test('должен возвращать null для несуществующего пользователя', async () => {
      mockApiService.call.mockResolvedValue({
        result: []
      });

      const result = await facade.getUserDetails('999');

      expect(result).toBeNull();
    });

    test('должен выбрасывать ошибку при отсутствии ID', async () => {
      await expect(facade.getUserDetails()).rejects.toThrow('User ID is required');
    });
  });

  describe('getDepartments', () => {
    test('должен получать список отделов', async () => {
      const mockDepartments = [
        { ID: '1', NAME: 'IT Department' },
        { ID: '2', NAME: 'HR Department' }
      ];

      mockApiService.call.mockResolvedValue({
        result: mockDepartments
      });

      const result = await facade.getDepartments();

      expect(mockApiService.call).toHaveBeenCalledWith('department.get', {
        select: ['ID', 'NAME', 'UF_HEAD', 'PARENT', 'SORT']
      });

      expect(result).toEqual(mockDepartments);
    });
  });

  describe('getDepartmentUsers', () => {
    test('должен получать пользователей отдела', async () => {
      const mockUsers = [
        { ID: '1', NAME: 'User 1', UF_DEPARTMENT: [123] }
      ];

      mockApiService.call.mockResolvedValue({
        result: mockUsers
      });

      const result = await facade.getDepartmentUsers(123);

      expect(mockApiService.call).toHaveBeenCalledWith('user.get', {
        filter: {
          UF_DEPARTMENT: 123,
          ACTIVE: 'Y'
        },
        select: expect.any(Array)
      });

      expect(result).toEqual(mockUsers);
    });

    test('должен выбрасывать ошибку при отсутствии ID отдела', async () => {
      await expect(facade.getDepartmentUsers()).rejects.toThrow('Department ID is required');
    });
  });

  describe('getDepartmentStats', () => {
    test('должен рассчитывать статистику по отделам', async () => {
      const mockDepartments = [
        { ID: '1', NAME: 'IT Department' }
      ];

      const mockUsers = [
        { ID: '1', NAME: 'User 1', UF_DEPARTMENT: [1], ACTIVE: 'Y' },
        { ID: '2', NAME: 'User 2', UF_DEPARTMENT: [1], ACTIVE: 'N' }
      ];

      mockApiService.call
        .mockResolvedValueOnce({ result: mockDepartments }) // getDepartments
        .mockResolvedValueOnce({ result: mockUsers }); // getUsersList

      const result = await facade.getDepartmentStats();

      expect(result).toEqual([
        {
          department: mockDepartments[0],
          userCount: 2,
          activeUsers: 1
        }
      ]);
    });
  });

  describe('searchUsers', () => {
    test('должен искать пользователей по имени', async () => {
      const mockUsers = [
        { ID: '1', NAME: 'John Doe' }
      ];

      mockApiService.call.mockResolvedValue({
        result: mockUsers
      });

      const result = await facade.searchUsers('John');

      expect(mockApiService.call).toHaveBeenCalledWith('user.get', {
        filter: {
          '%NAME': 'John',
          '%LAST_NAME': 'John',
          '%EMAIL': 'John'
        },
        select: expect.any(Array)
      });

      expect(result).toEqual(mockUsers);
    });

    test('должен возвращать пустой массив для короткого запроса', async () => {
      const result = await facade.searchUsers('A');

      expect(result).toEqual([]);
      expect(mockApiService.call).not.toHaveBeenCalled();
    });
  });

  describe('getUsersForAnalytics', () => {
    test('должен получать пользователей для аналитики с дополнительными полями', async () => {
      const mockUsers = [
        {
          ID: '1',
          NAME: 'Test User',
          DATE_REGISTER: '2024-01-01'
        }
      ];

      mockApiService.call.mockResolvedValue({
        result: mockUsers
      });

      const result = await facade.getUsersForAnalytics();

      expect(result[0]).toHaveProperty('fullName');
      expect(result[0]).toHaveProperty('registrationAge');
      expect(result[0]).toHaveProperty('isNewUser');
    });
  });

  describe('Кеширование', () => {
    test('должен использовать кеш для повторных вызовов', async () => {
      mockApiService.call.mockResolvedValue({
        result: [{ ID: '1', NAME: 'Test User' }]
      });

      // Первый вызов
      await facade.getUsersList();
      const metrics1 = facade.getMetrics();

      // Второй вызов (кешированный)
      await facade.getUsersList();
      const metrics2 = facade.getMetrics();

      expect(metrics2.cache.hits).toBeGreaterThan(metrics1.cache.hits);
      expect(mockApiService.call).toHaveBeenCalledTimes(1);
    });

    test('должен очищать кеш', () => {
      facade.cache.set('test', { data: 'test', timestamp: Date.now() });
      facade.clearCache();

      expect(facade.cache.size).toBe(0);
    });
  });

  describe('Метрики', () => {
    test('должен рассчитывать эффективность кеша', async () => {
      // Имитируем кешированные вызовы
      facade.metrics.cacheHits = 7;
      facade.metrics.cacheMisses = 3;

      const metrics = facade.getMetrics();

      expect(metrics.cache.hitRate).toBe(0.7); // 7/(7+3) = 0.7
      expect(metrics.cache.efficiency).toBe('good');
    });

    test('должен рассчитывать производительность API', () => {
      facade.metrics.apiCalls = 10;
      facade.metrics.totalResponseTime = 2500; // 2.5 секунды всего

      const metrics = facade.getMetrics();

      expect(metrics.api.avgResponseTime).toBe(250); // 2500/10 = 250ms
      expect(metrics.api.performance).toBe('fast');
    });
  });
});