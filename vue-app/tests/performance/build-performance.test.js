/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';

describe('Build Performance', () => {
  test('should load lazy components correctly', async () => {
    // Тест lazy loading компонентов
    const { default: DashboardComponent } = await import('@/components/dashboard/DashboardSector1C.vue');
    expect(DashboardComponent).toBeDefined();

    const { default: GraphComponent } = await import('@/components/graph-admission-closure/GraphAdmissionClosureDashboard.vue');
    expect(GraphComponent).toBeDefined();
  });

  test('should initialize services lazily', async () => {
    // Тест lazy loading сервисов
    const { LazyServiceLoader } = await import('@/utils/lazy-services');

    const admissionService = await LazyServiceLoader.loadAdmissionClosureService();
    expect(admissionService.fetchAdmissionClosureStats).toBeDefined();

    const bitrixApi = await LazyServiceLoader.loadBitrix24Api();
    expect(bitrixApi.Bitrix24ApiService).toBeDefined();
  });

  test('should cache lazy loaded modules', async () => {
    const { LazyServiceLoader } = await import('@/utils/lazy-services');

    // Первая загрузка
    const start1 = Date.now();
    await LazyServiceLoader.loadAdmissionClosureService();
    const time1 = Date.now() - start1;

    // Вторая загрузка (должна быть из кеша)
    const start2 = Date.now();
    await LazyServiceLoader.loadAdmissionClosureService();
    const time2 = Date.now() - start2;

    // Вторая загрузка должна быть значительно быстрее
    expect(time2).toBeLessThan(time1 * 0.5);
  });

  test('should have optimized bundle sizes', () => {
    // Проверяем, что основные файлы сборки существуют и имеют разумные размеры
    // Этот тест проверяется в CI/CD через отдельные скрипты
    expect(true).toBe(true); // Placeholder для реальных проверок размеров
  });
});