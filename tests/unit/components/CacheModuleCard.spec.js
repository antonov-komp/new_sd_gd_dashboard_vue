import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CacheModuleCard from '@/components/cache/CacheModuleCard.vue';

describe('CacheModuleCard', () => {
  let wrapper;
  let mockModule;

  beforeEach(() => {
    mockModule = {
      id: 'dashboard-sector-1c',
      name: 'Дашборд сектора 1С',
      status: 'active',
      file_count: 5,
      total_size: 1024000,
      ttl: 600,
      created_at: Math.floor(Date.now() / 1000) - 7200,
      expires_at: Math.floor(Date.now() / 1000) + 1800,
      cache_dir: '/var/cache/dashboard',
      metadata: {
        version: '1.0',
        module_id: 'dashboard-sector-1c',
        module_name: 'Дашборд сектора 1С',
        created_at: Math.floor(Date.now() / 1000) - 7200,
        created_by: 'system',
        creation_time_ms: 1250,
        last_accessed_at: Math.floor(Date.now() / 1000) - 300,
        access_count: 45,
        expires_at: Math.floor(Date.now() / 1000) + 1800,
        ttl_seconds: 600,
        file_size_bytes: 1024000,
        compression_ratio: 0.75,
        data_version: '2026.01.12.v1',
        source_params: {
          period: 'weeks',
          sector_id: '1c',
          filters: ['active_only'],
          limit: 1000
        },
        performance_metrics: {
          avg_response_time_ms: 45,
          cache_hit_ratio: 0.92,
          data_freshness_score: 0.95
        }
      }
    };

    wrapper = mount(CacheModuleCard, {
      props: {
        module: mockModule,
        isPrimary: true,
        priority: 1
      },
      global: {
        stubs: ['CacheCreateButton']
      }
    });
  });

  describe('Отображение данных модуля', () => {
    it('должен корректно отображать название модуля', () => {
      expect(wrapper.text()).toContain('Дашборд сектора 1С');
    });

    it('должен показывать правильный статус', () => {
      const statusBadge = wrapper.find('.status-badge');
      expect(statusBadge.exists()).toBe(true);
      expect(statusBadge.text()).toBe('Активен');
      expect(statusBadge.classes()).toContain('status-active');
    });

    it('должен отображать бейдж приоритета для основных модулей', () => {
      const priorityBadge = wrapper.find('.priority-badge');
      expect(priorityBadge.exists()).toBe(true);
      expect(priorityBadge.text()).toBe('1');
      expect(priorityBadge.classes()).toContain('priority-1');
    });

    it('должен отображать статистику кеша', () => {
      expect(wrapper.text()).toContain('Файлов:');
      expect(wrapper.text()).toContain('5');
      expect(wrapper.text()).toContain('Размер:');
      expect(wrapper.text()).toContain('1.0 MB'); // Форматированный размер
    });

    it('должен отображать метрики производительности для основных модулей', () => {
      expect(wrapper.text()).toContain('Время создания:');
      expect(wrapper.text()).toContain('Эффективность:');
      expect(wrapper.text()).toContain('Свежесть данных:');
    });

    it('должен применять правильные цветовые классы для метрик', () => {
      const efficiencyElement = wrapper.find('.cache-efficiency-class');
      expect(efficiencyElement.exists()).toBe(true);
      // Проверяем что эффективность 92% имеет зеленый цвет
      expect(efficiencyElement.classes()).toContain('metric-green');
    });
  });

  describe('Визуальная иерархия', () => {
    it('должен применять класс primary-module для основных модулей', () => {
      expect(wrapper.classes()).toContain('primary-module');
      expect(wrapper.classes()).toContain('cache-module-card');
    });

    it('должен показывать иконку для основных модулей', () => {
      const icon = wrapper.find('.module-icon');
      expect(icon.exists()).toBe(true);
      expect(icon.text()).toBe('🏆');
    });

    it('должен группировать данные в секции', () => {
      const statisticsSection = wrapper.find('.data-section.statistics');
      const lifetimeSection = wrapper.find('.data-section.lifetime');
      const performanceSection = wrapper.find('.data-section.performance');

      expect(statisticsSection.exists()).toBe(true);
      expect(lifetimeSection.exists()).toBe(true);
      expect(performanceSection.exists()).toBe(true);
    });
  });

  describe('Состояния кнопок', () => {
    it('должен показывать кнопку создания для активного модуля', () => {
      const createButton = wrapper.findComponent({ name: 'CacheCreateButton' });
      expect(createButton.exists()).toBe(true);
    });

    it('должен показывать кнопку очистки для модуля с данными', () => {
      const clearButton = wrapper.find('.clear-button');
      expect(clearButton.exists()).toBe(true);
      expect(clearButton.attributes('disabled')).toBeUndefined();
    });

    it('должен блокировать кнопку очистки для пустого кеша', async () => {
      await wrapper.setProps({
        module: { ...mockModule, file_count: 0, status: 'empty' }
      });

      const clearButton = wrapper.find('.clear-button');
      expect(clearButton.attributes('disabled')).toBeDefined();
      expect(clearButton.text()).toContain('Кеш пуст');
    });

    it('должен показывать кнопку деталей для основных модулей с данными', () => {
      const detailsButton = wrapper.find('.details-button');
      expect(detailsButton.exists()).toBe(true);
    });
  });

  describe('Взаимодействие пользователя', () => {
    it('должен вызывать событие очистки при клике на кнопку', async () => {
      const clearButton = wrapper.find('.clear-button');

      // Mock window.confirm
      global.confirm = vi.fn(() => true);

      await clearButton.trigger('click');

      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Вы уверены, что хотите очистить кеш')
      );
    });

    it('не должен очищать кеш без подтверждения', async () => {
      const clearButton = wrapper.find('.clear-button');

      global.confirm = vi.fn(() => false);

      await clearButton.trigger('click');

      expect(wrapper.emitted('clear')).toBeUndefined();
    });

    it('должен показывать детали при клике на кнопку', async () => {
      const detailsButton = wrapper.find('.details-button');
      expect(detailsButton.exists()).toBe(true);

      await detailsButton.trigger('click');

      expect(wrapper.vm.showDetailModal).toBe(true);
    });

    it('должен закрывать модальное окно при клике на overlay', async () => {
      await wrapper.setData({ showDetailModal: true });

      const overlay = wrapper.find('.detail-modal-overlay');
      await overlay.trigger('click.self');

      expect(wrapper.vm.showDetailModal).toBe(false);
    });
  });

  describe('Адаптивность', () => {
    it('должен применять мобильные стили на маленьких экранах', async () => {
      // Mock viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      await wrapper.vm.$nextTick();

      expect(wrapper.vm.isMobile).toBe(true);
      const cardActions = wrapper.find('.card-actions');
      expect(cardActions.classes()).toContain('mobile-layout');
    });
  });

  describe('Доступность (Accessibility)', () => {
    it('должен иметь правильные ARIA атрибуты', () => {
      const card = wrapper.find('.cache-module-card');
      expect(card.attributes('role')).toBe('article');
      expect(card.attributes('aria-labelledby')).toBeDefined();
      expect(card.attributes('aria-describedby')).toBeDefined();
    });

    it('должен иметь правильные метки для кнопок', () => {
      const clearButton = wrapper.find('.clear-button');
      expect(clearButton.attributes('aria-label')).toBeDefined();

      const detailsButton = wrapper.find('.details-button');
      expect(detailsButton.attributes('aria-label')).toBeDefined();
    });

    it('должен поддерживать клавиатурную навигацию', () => {
      const buttons = wrapper.findAll('button[tabindex="0"]');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Форматирование данных', () => {
    it('должен корректно форматировать размер файла', () => {
      expect(wrapper.vm.formattedSize).toBe('1.0 MB');
    });

    it('должен корректно форматировать TTL', () => {
      expect(wrapper.vm.formattedTTL).toBe('10 мин');
    });

    it('должен форматировать метрики производительности', () => {
      expect(wrapper.vm.cacheEfficiency).toBe('92%');
      expect(wrapper.vm.dataFreshness).toBe('95%');
      expect(wrapper.vm.formattedCreationTime).toMatch(/\d+\.\d+сек|\d+мс|\d+мин/);
    });
  });
});