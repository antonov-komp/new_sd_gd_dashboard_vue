/**
 * Тесты для системы иерархического управления кешем
 * TASK-084: Иерархическая сортировка модулей в режиме "Ручное управление кешем"
 */

import { CacheManagementService } from '@/services/cache-management-service.js';
import { formatCacheSize, formatTTL, isExpiringSoon } from '@/utils/cache-helpers.js';

// Мок данные для тестирования
const mockModules = [
  // Основные модули
  {
    id: 'dashboard-sector-1c',
    name: 'Дашборд сектора 1С',
    status: 'active',
    file_count: 5,
    total_size: 1024000,
    ttl: 600
  },
  {
    id: 'graph-state',
    name: 'График состояния',
    status: 'active',
    file_count: 3,
    total_size: 512000,
    ttl: 3600
  },
  {
    id: 'graph-admission-closure-weeks',
    name: 'График приёма/закрытий 1С (4 недели)',
    status: 'active',
    file_count: 8,
    total_size: 2048000,
    ttl: 300
  },
  {
    id: 'graph-admission-closure-months',
    name: 'График приёма/закрытий 1С (3 месяца)',
    status: 'active',
    file_count: 12,
    total_size: 3072000,
    ttl: 300
  },
  {
    id: 'time-tracking-default',
    name: 'Трудозатраты (режим по умолчанию)',
    status: 'active',
    file_count: 4,
    total_size: 768000,
    ttl: 300
  },

  // Побочные модули
  {
    id: 'users-management-departments',
    name: 'Управление пользователями (отделы)',
    status: 'active',
    file_count: 2,
    total_size: 256000,
    ttl: 3600
  },
  {
    id: 'users-management-users',
    name: 'Управление пользователями (пользователи)',
    status: 'expired',
    file_count: 0,
    total_size: 0,
    ttl: 1800
  },
  {
    id: 'user-activity-stats',
    name: 'Отслеживание активности (статистика)',
    status: 'active',
    file_count: 6,
    total_size: 1024000,
    ttl: 300
  },
  {
    id: 'webhook-logs-api',
    name: 'Логи вебхуков (API запросы)',
    status: 'active',
    file_count: 15,
    total_size: 5120000,
    ttl: 300
  }
];

describe('CacheManagementService - Categorization', () => {
  beforeEach(() => {
    // Очистка кеша перед каждым тестом
    CacheManagementService.clearCategorizationCache();
  });

  describe('categorizeAndSortModules', () => {
    test('correctly categorizes primary and secondary modules', () => {
      const result = CacheManagementService.categorizeAndSortModules(mockModules);

      expect(result.primaryModules).toHaveLength(5);
      expect(result.secondaryModules).toHaveLength(4);
      expect(result.metadata.totalModules).toBe(9);
    });

    test('sorts primary modules by priority', () => {
      const result = CacheManagementService.categorizeAndSortModules(mockModules);

      // Проверяем порядок основных модулей
      expect(result.primaryModules[0].id).toBe('dashboard-sector-1c'); // priority 1
      expect(result.primaryModules[1].id).toBe('graph-state'); // priority 2
      expect(result.primaryModules[2].id).toBe('graph-admission-closure-weeks'); // priority 3
      expect(result.primaryModules[3].id).toBe('graph-admission-closure-months'); // priority 4
      expect(result.primaryModules[4].id).toBe('time-tracking-default'); // priority 5
    });

    test('sorts secondary modules by type and name', () => {
      const result = CacheManagementService.categorizeAndSortModules(mockModules);

      // Проверяем порядок побочных модулей (users -> activity -> webhooks)
      expect(result.secondaryModules[0].id).toBe('users-management-departments');
      expect(result.secondaryModules[1].id).toBe('users-management-users');
      expect(result.secondaryModules[2].id).toBe('user-activity-stats');
      expect(result.secondaryModules[3].id).toBe('webhook-logs-api');
    });

    test('adds correct metadata to categorized modules', () => {
      const result = CacheManagementService.categorizeAndSortModules(mockModules);

      // Проверяем метаданные основных модулей
      result.primaryModules.forEach(module => {
        expect(module.category).toBe('primary');
        expect(module.priority).toBeDefined();
      });

      // Проверяем метаданные побочных модулей
      result.secondaryModules.forEach(module => {
        expect(module.category).toBe('secondary');
        expect(module.groupType).toBeDefined();
      });
    });
  });

  describe('getModuleType', () => {
    test('correctly identifies module types', () => {
      expect(CacheManagementService.getModuleType('users-management-departments')).toBe('users');
      expect(CacheManagementService.getModuleType('user-activity-stats')).toBe('activity');
      expect(CacheManagementService.getModuleType('webhook-logs-api')).toBe('webhooks');
      expect(CacheManagementService.getModuleType('unknown-module')).toBe('other');
    });
  });

  describe('PRIMARY_MODULE_IDS', () => {
    test('contains all expected primary modules', () => {
      const expectedPrimaryIds = [
        'dashboard-sector-1c',
        'graph-state',
        'graph-admission-closure-weeks',
        'graph-admission-closure-months',
        'time-tracking-default',
        'time-tracking-detailed',
        'time-tracking-summary'
      ];

      expectedPrimaryIds.forEach(id => {
        expect(CacheManagementService.PRIMARY_MODULE_IDS).toContain(id);
      });
    });
  });

  describe('Caching', () => {
    test('caches categorization results', () => {
      // Первый вызов - без кеша
      const result1 = CacheManagementService.categorizeAndSortModules(mockModules);
      expect(result1.metadata.cached).toBe(false);

      // Второй вызов - из кеша
      const result2 = CacheManagementService.categorizeAndSortModules(mockModules);
      expect(result2.metadata.cached).toBe(true);

      // Результаты должны быть идентичными
      expect(result1.primaryModules.length).toBe(result2.primaryModules.length);
      expect(result1.secondaryModules.length).toBe(result2.secondaryModules.length);
    });

    test('forceRefresh bypasses cache', () => {
      // Заполняем кеш
      CacheManagementService.categorizeAndSortModules(mockModules);

      // Принудительный refresh
      const result = CacheManagementService.categorizeAndSortModules(mockModules, { forceRefresh: true });
      expect(result.metadata.cached).toBe(false);
    });
  });
});

describe('Cache Helpers', () => {
  describe('formatCacheSize', () => {
    test('formats bytes correctly', () => {
      expect(formatCacheSize(0)).toBe('0 B');
      expect(formatCacheSize(1024)).toBe('1 KB');
      expect(formatCacheSize(1024 * 1024)).toBe('1 MB');
      expect(formatCacheSize(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });

  describe('formatTTL', () => {
    test('formats seconds correctly', () => {
      expect(formatTTL(30)).toBe('30 сек');
      expect(formatTTL(90)).toBe('2 мин');
      expect(formatTTL(3660)).toBe('1 ч');
      expect(formatTTL(86400)).toBe('1 д');
    });
  });

  describe('isExpiringSoon', () => {
    test('detects expiring cache correctly', () => {
      const now = Date.now();
      const futureTimestamp = Math.floor((now + 12 * 60 * 60 * 1000) / 1000); // 12 часов
      const pastTimestamp = Math.floor((now - 60 * 60 * 1000) / 1000); // 1 час назад

      expect(isExpiringSoon(futureTimestamp, 24)).toBe(true);
      expect(isExpiringSoon(pastTimestamp, 24)).toBe(false);
      expect(isExpiringSoon(null, 24)).toBe(false);
    });
  });
});

describe('Performance Tests', () => {
  test('categorization completes within performance limits', () => {
    const largeModuleSet = Array.from({ length: 100 }, (_, i) => ({
      id: `module-${i}`,
      name: `Module ${i}`,
      status: 'active',
      file_count: Math.floor(Math.random() * 10),
      total_size: Math.floor(Math.random() * 1000000),
      ttl: Math.floor(Math.random() * 3600)
    }));

    const startTime = performance.now();
    const result = CacheManagementService.categorizeAndSortModules(largeModuleSet);
    const endTime = performance.now();

    const duration = endTime - startTime;

    // Проверяем производительность (должно быть < 50ms для 100 модулей)
    expect(duration).toBeLessThan(50);
    expect(result.metadata.totalModules).toBe(100);
  });
});

// Интеграционный тест
describe('Integration Tests', () => {
  test('full categorization workflow', () => {
    // Имитация полного рабочего процесса
    const result = CacheManagementService.categorizeAndSortModules(mockModules);

    // Проверяем структуру результата
    expect(result).toHaveProperty('primaryModules');
    expect(result).toHaveProperty('secondaryModules');
    expect(result).toHaveProperty('metadata');

    // Проверяем корректность данных
    expect(result.primaryModules.length).toBeGreaterThan(0);
    expect(result.secondaryModules.length).toBeGreaterThan(0);
    expect(result.metadata.totalModules).toBe(mockModules.length);

    // Проверяем что все модули распределены
    const totalCategorized = result.primaryModules.length + result.secondaryModules.length;
    expect(totalCategorized).toBe(mockModules.length);
  });
});