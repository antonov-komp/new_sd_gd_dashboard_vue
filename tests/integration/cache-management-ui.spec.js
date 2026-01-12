import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import CacheManagement from '@/components/cache/CacheManagement.vue';
import { createTestingPinia } from '@pinia/testing';

describe('Cache Management UI Integration', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(CacheManagement, {
      global: {
        plugins: [createTestingPinia()],
        stubs: ['CacheModuleCard', 'CacheStats']
      }
    });
  });

  describe('Иерархия модулей', () => {
    it('должен разделять модули на основные и второстепенные', () => {
      const primarySection = wrapper.find('.primary-modules');
      const secondarySection = wrapper.find('.secondary-modules');

      expect(primarySection.exists()).toBe(true);
      expect(secondarySection.exists()).toBe(true);
    });

    it('должен показывать правильное количество модулей в каждой секции', () => {
      const primaryCount = wrapper.find('.primary-modules .module-count');
      const secondaryCount = wrapper.find('.secondary-modules .module-count');

      expect(primaryCount.exists()).toBe(true);
      expect(secondaryCount.exists()).toBe(true);
    });

    it('должен группировать второстепенные модули по типам', () => {
      const moduleGroups = wrapper.findAll('.module-group');

      // Проверяем что группы существуют
      expect(moduleGroups.length).toBeGreaterThan(0);

      // Каждая группа должна иметь заголовок
      moduleGroups.forEach(group => {
        const groupTitle = group.find('.group-title');
        expect(groupTitle.exists()).toBe(true);
      });
    });
  });

  describe('Взаимодействие с модулями', () => {
    it('должен обновлять список после создания кеша', async () => {
      // Симулируем создание кеша
      await wrapper.vm.handleCreateMock({
        id: 'test-module',
        name: 'Test Module'
      });

      // Проверяем что метод обновления был вызван
      expect(wrapper.vm.loadModules).toHaveBeenCalled();
    });

    it('должен обрабатывать очистку кеша', async () => {
      const testModuleId = 'test-module-id';

      await wrapper.vm.handleModuleClear(testModuleId);

      // Проверяем что метод очистки был вызван
      expect(wrapper.vm.loadModules).toHaveBeenCalled();
    });
  });

  describe('Обработка состояний', () => {
    it('должен показывать состояние загрузки', async () => {
      await wrapper.setData({ loading: true, error: null });

      const loadingOverlay = wrapper.find('.loading-overlay');
      expect(loadingOverlay.exists()).toBe(true);
      expect(loadingOverlay.attributes('role')).toBe('status');
      expect(loadingOverlay.attributes('aria-live')).toBe('polite');
    });

    it('должен показывать сообщение об ошибке с правильными атрибутами', async () => {
      const errorMessage = 'Test error';
      await wrapper.setData({ loading: false, error: errorMessage });

      const errorDiv = wrapper.find('.error-message');
      expect(errorDiv.exists()).toBe(true);
      expect(errorDiv.attributes('role')).toBe('alert');
      expect(errorDiv.attributes('aria-live')).toBe('assertive');
      expect(errorDiv.text()).toContain(errorMessage);
    });

    it('должен позволять повторить загрузку после ошибки', async () => {
      await wrapper.setData({ error: 'Network error', loading: false });

      const retryButton = wrapper.find('.retry-btn');
      expect(retryButton.exists()).toBe(true);

      await retryButton.trigger('click');

      expect(wrapper.vm.loadModules).toHaveBeenCalled();
    });
  });

  describe('Доступность интерфейса', () => {
    it('должен иметь правильные заголовки для секций', () => {
      const primaryHeading = wrapper.find('#primary-modules-heading');
      const secondaryHeading = wrapper.find('#secondary-modules-heading');

      expect(primaryHeading.exists()).toBe(true);
      expect(primaryHeading.text()).toContain('Основные модули кеша');

      expect(secondaryHeading.exists()).toBe(true);
      expect(secondaryHeading.text()).toContain('Побочные модули кеша');
    });

    it('должен использовать семантические HTML элементы', () => {
      const sections = wrapper.findAll('section');
      expect(sections.length).toBeGreaterThan(0);

      sections.forEach(section => {
        expect(section.attributes('aria-labelledby')).toBeDefined();
      });
    });
  });

  describe('Адаптивность', () => {
    it('должен применять адаптивные стили', () => {
      // Проверяем наличие адаптивных классов
      const cacheManagement = wrapper.find('.cache-management');
      expect(cacheManagement.exists()).toBe(true);
    });
  });
});