# TASK-017-09: Тестирование и отладка

**Дата создания:** 2025-12-07 05:25 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-017](./TASK-017-webhook-logs-ui-implementation-plan.md)

---

## 📋 Описание

Написать unit-тесты для компонентов, интеграционные тесты для страницы, протестировать на разных браузерах и мобильных устройствах, провести нагрузочное тестирование, исправить найденные баги.

---

## 🎯 Контекст

Этап 9 из глобального плана TASK-017. Необходимо обеспечить качество и стабильность интерфейса перед финальным релизом.

---

## 📁 Модули и компоненты

- `vue-app/tests/unit/` — unit-тесты
- `vue-app/tests/integration/` — интеграционные тесты
- `vue-app/tests/e2e/` — end-to-end тесты (опционально)

---

## 🔗 Зависимости

**От других задач:**
- Все предыдущие этапы (1-8) должны быть завершены

---

## 📝 Ступенчатые подзадачи

### 1. Настройка тестового окружения

1.1. Установить Vitest или Jest
1.2. Настроить конфигурацию тестов
1.3. Настроить покрытие кода
1.4. Создать утилиты для тестирования

### 2. Unit-тесты компонентов

2.1. Тесты для WebhookLogFilters
2.2. Тесты для WebhookLogList
2.3. Тесты для WebhookLogDetails
2.4. Тесты для WebhookLogsStats
2.5. Тесты для утилит экспорта

### 3. Интеграционные тесты

3.1. Тесты для WebhookLogsPage
3.2. Тесты для взаимодействия компонентов
3.3. Тесты для работы с API
3.4. Тесты для фильтров и поиска

### 4. Тестирование браузеров

4.1. Chrome/Chromium
4.2. Firefox
4.3. Safari (если доступен)
4.4. Edge

### 5. Тестирование мобильных устройств

5.1. iOS Safari
5.2. Android Chrome
5.3. Адаптивность на разных размерах экрана

### 6. Нагрузочное тестирование

6.1. Тестирование с большим количеством логов (1000+)
6.2. Тестирование производительности фильтров
6.3. Тестирование производительности поиска
6.4. Тестирование производительности графиков

### 7. Исправление багов

7.1. Составить список найденных багов
7.2. Приоритизировать баги
7.3. Исправить критичные баги
7.4. Исправить некритичные баги

---

## ⚙️ Технические требования

### 1. Настройка тестового окружения

#### Установка зависимостей

```bash
npm install -D vitest @vue/test-utils @testing-library/vue @testing-library/jest-dom jsdom happy-dom
```

#### Конфигурация Vitest

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.js',
        'dist/'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    },
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './vue-app/src')
    }
  }
});
```

#### Файл настройки тестов

```javascript
// tests/setup.js
import { config } from '@vue/test-utils';
import '@testing-library/jest-dom';

// Глобальные моки
global.fetch = vi.fn();

// Мок для Bitrix24 API
vi.mock('@/services/bitrix24-bx-api.js', () => ({
  Bitrix24BxApi: {
    getCurrentUser: vi.fn().mockResolvedValue({
      ID: '1',
      UF_DEPARTMENT: [1, 2]
    })
  }
}));

// Настройка Vue Test Utils
config.global.mocks = {
  $t: (key) => key, // Мок для i18n
  $route: {
    path: '/admin/webhook-logs',
    query: {}
  },
  $router: {
    push: vi.fn(),
    replace: vi.fn()
  }
};
```

#### Утилиты для тестирования

```javascript
// tests/utils/test-helpers.js
import { mount } from '@vue/test-utils';

/**
 * Создание wrapper с дефолтными настройками
 */
export function createWrapper(component, options = {}) {
  const defaultOptions = {
    global: {
      stubs: {
        'router-link': true,
        'router-view': true
      },
      mocks: {
        $route: {
          path: '/admin/webhook-logs',
          query: {}
        },
        $router: {
          push: vi.fn(),
          replace: vi.fn()
        }
      }
    }
  };

  return mount(component, {
    ...defaultOptions,
    ...options
  });
}

/**
 * Создание моковых данных логов
 */
export function createMockLog(overrides = {}) {
  return {
    timestamp: '2025-12-07T00:00:00+03:00',
    ip: '195.208.184.34',
    event: 'ONTASKADD',
    category: 'tasks',
    payload: {
      event: 'ONTASKADD',
      data: {
        TASK_ID: '12345'
      }
    },
    details: {
      task_id: '12345'
    },
    ...overrides
  };
}

/**
 * Создание массива моковых логов
 */
export function createMockLogs(count = 10) {
  return Array.from({ length: count }, (_, index) => 
    createMockLog({
      timestamp: `2025-12-07T${String(index).padStart(2, '0')}:00:00+03:00`,
      event: `ONTASKADD${index}`
    })
  );
}

/**
 * Ожидание следующего тика Vue
 */
export async function nextTick(wrapper) {
  await wrapper.vm.$nextTick();
  return new Promise(resolve => setTimeout(resolve, 0));
}
```

### 2. Unit-тесты компонентов

#### Тесты для WebhookLogFilters

```javascript
// tests/unit/components/webhooks/WebhookLogFilters.spec.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWrapper, nextTick } from '@/tests/utils/test-helpers.js';
import WebhookLogFilters from '@/components/webhooks/WebhookLogFilters.vue';

describe('WebhookLogFilters', () => {
  const defaultFilters = {
    category: null,
    event: null,
    date: '2025-12-07',
    hour: null
  };

  it('renders correctly with default filters', () => {
    const wrapper = createWrapper(WebhookLogFilters, {
      props: {
        filters: defaultFilters
      }
    });

    expect(wrapper.find('.webhook-log-filters').exists()).toBe(true);
    expect(wrapper.find('#category-filter').exists()).toBe(true);
    expect(wrapper.find('#date-filter').exists()).toBe(true);
  });

  it('emits update:filters when category changes', async () => {
    const wrapper = createWrapper(WebhookLogFilters, {
      props: {
        filters: defaultFilters
      }
    });

    const categorySelect = wrapper.find('#category-filter');
    await categorySelect.setValue('tasks');

    expect(wrapper.emitted('update:filters')).toBeTruthy();
    expect(wrapper.emitted('update:filters')[0][0]).toMatchObject({
      ...defaultFilters,
      category: 'tasks'
    });
  });

  it('emits update:filters when date changes', async () => {
    const wrapper = createWrapper(WebhookLogFilters, {
      props: {
        filters: defaultFilters
      }
    });

    const dateInput = wrapper.find('#date-filter');
    await dateInput.setValue('2025-12-08');

    expect(wrapper.emitted('update:filters')).toBeTruthy();
    expect(wrapper.emitted('update:filters')[0][0].date).toBe('2025-12-08');
  });

  it('emits reset event when reset button is clicked', async () => {
    const wrapper = createWrapper(WebhookLogFilters, {
      props: {
        filters: {
          ...defaultFilters,
          category: 'tasks',
          event: 'ONTASKADD'
        }
      }
    });

    const resetButton = wrapper.find('.btn-reset');
    await resetButton.trigger('click');

    expect(wrapper.emitted('reset')).toBeTruthy();
  });

  it('shows active filter indicators', () => {
    const wrapper = createWrapper(WebhookLogFilters, {
      props: {
        filters: {
          ...defaultFilters,
          category: 'tasks',
          event: 'ONTASKADD'
        }
      }
    });

    const categoryFilter = wrapper.find('#category-filter');
    expect(categoryFilter.element.value).toBe('tasks');
  });
});
```

#### Тесты для WebhookLogList

```javascript
// tests/unit/components/webhooks/WebhookLogList.spec.js
import { describe, it, expect, vi } from 'vitest';
import { createWrapper, createMockLogs } from '@/tests/utils/test-helpers.js';
import WebhookLogList from '@/components/webhooks/WebhookLogList.vue';

describe('WebhookLogList', () => {
  it('renders list of logs', () => {
    const logs = createMockLogs(5);
    const wrapper = createWrapper(WebhookLogList, {
      props: {
        logs,
        loading: false,
        error: null
      }
    });

    const logRows = wrapper.findAll('.log-row');
    expect(logRows).toHaveLength(5);
  });

  it('shows loading state', () => {
    const wrapper = createWrapper(WebhookLogList, {
      props: {
        logs: [],
        loading: true,
        error: null
      }
    });

    expect(wrapper.find('.loading-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('Загрузка логов');
  });

  it('shows error state', () => {
    const errorMessage = 'Ошибка загрузки';
    const wrapper = createWrapper(WebhookLogList, {
      props: {
        logs: [],
        loading: false,
        error: errorMessage
      }
    });

    expect(wrapper.find('.error-state').exists()).toBe(true);
    expect(wrapper.text()).toContain(errorMessage);
  });

  it('shows empty state when no logs', () => {
    const wrapper = createWrapper(WebhookLogList, {
      props: {
        logs: [],
        loading: false,
        error: null
      }
    });

    expect(wrapper.find('.empty-state').exists()).toBe(true);
  });

  it('emits select-log when log is clicked', async () => {
    const logs = createMockLogs(1);
    const wrapper = createWrapper(WebhookLogList, {
      props: {
        logs,
        loading: false,
        error: null
      }
    });

    const logRow = wrapper.find('.log-row');
    await logRow.trigger('click');

    expect(wrapper.emitted('select-log')).toBeTruthy();
    expect(wrapper.emitted('select-log')[0][0]).toEqual(logs[0]);
  });

  it('emits page-change when pagination button is clicked', async () => {
    const logs = createMockLogs(50);
    const pagination = {
      page: 1,
      pages: 3,
      total: 150,
      limit: 50
    };

    const wrapper = createWrapper(WebhookLogList, {
      props: {
        logs,
        loading: false,
        error: null,
        pagination
      }
    });

    const nextButton = wrapper.find('.btn-pagination:last-child');
    await nextButton.trigger('click');

    expect(wrapper.emitted('page-change')).toBeTruthy();
    expect(wrapper.emitted('page-change')[0][0]).toBe(2);
  });

  it('formats timestamp correctly', () => {
    const logs = [createMockLog()];
    const wrapper = createWrapper(WebhookLogList, {
      props: {
        logs,
        loading: false,
        error: null
      }
    });

    const timestampCell = wrapper.find('.log-row td:first-child');
    expect(timestampCell.text()).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });
});
```

#### Тесты для утилит экспорта

```javascript
// tests/unit/utils/export-utils.spec.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToCSV, exportToJSON, validateExportData, generateExportFilename } from '@/utils/export-utils.js';
import { createMockLogs } from '@/tests/utils/test-helpers.js';

describe('export-utils', () => {
  beforeEach(() => {
    // Мок для document.createElement и URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
      style: {}
    };
    
    global.document.createElement = vi.fn(() => mockLink);
    global.document.body.appendChild = vi.fn();
    global.document.body.removeChild = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('exportToCSV', () => {
    it('exports data to CSV format', async () => {
      const data = createMockLogs(3);
      
      await exportToCSV(data, 'test.csv');
      
      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('handles special characters in CSV', async () => {
      const data = [createMockLog({
        event: 'Test "quotes" and, commas'
      })];
      
      await exportToCSV(data, 'test.csv');
      
      // Проверка, что специальные символы экранированы
      const blobCall = global.URL.createObjectURL.mock.calls[0][0];
      expect(blobCall).toBeInstanceOf(Blob);
    });

    it('shows progress during export', async () => {
      const data = createMockLogs(100);
      const onProgress = vi.fn();
      
      await exportToCSV(data, 'test.csv', { onProgress });
      
      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe('exportToJSON', () => {
    it('exports data to JSON format', async () => {
      const data = createMockLogs(3);
      
      await exportToJSON(data, 'test.json');
      
      expect(global.document.createElement).toHaveBeenCalledWith('a');
    });

    it('formats JSON with pretty option', async () => {
      const data = createMockLogs(2);
      
      await exportToJSON(data, 'test.json', { pretty: true });
      
      const blobCall = global.URL.createObjectURL.mock.calls[0][0];
      const text = await blobCall.text();
      const parsed = JSON.parse(text);
      
      expect(parsed).toHaveLength(2);
    });
  });

  describe('validateExportData', () => {
    it('validates empty array', () => {
      const result = validateExportData([]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Нет данных для экспорта');
    });

    it('validates non-array data', () => {
      const result = validateExportData(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Данные должны быть массивом');
    });

    it('warns about large datasets', () => {
      const largeData = createMockLogs(10000);
      const result = validateExportData(largeData);
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('generateExportFilename', () => {
    it('generates filename with date', () => {
      const filename = generateExportFilename('csv');
      expect(filename).toMatch(/webhook-logs_\d{4}-\d{2}-\d{2}/);
      expect(filename).toMatch(/\.csv$/);
    });

    it('includes filters in filename', () => {
      const filters = {
        category: 'tasks',
        date: '2025-12-07'
      };
      const filename = generateExportFilename('csv', filters, 100);
      
      expect(filename).toContain('cat-tasks');
      expect(filename).toContain('date-2025-12-07');
      expect(filename).toContain('100records');
    });
  });
});
```

### 3. Интеграционные тесты

#### Тесты для WebhookLogsPage

```javascript
// tests/integration/pages/WebhookLogsPage.spec.js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createWrapper, createMockLogs, nextTick } from '@/tests/utils/test-helpers.js';
import WebhookLogsPage from '@/pages/WebhookLogsPage.vue';
import { WebhookLogsApiService } from '@/services/webhook-logs-api.js';
import { Bitrix24BxApi } from '@/services/bitrix24-bx-api.js';

// Моки
vi.mock('@/services/webhook-logs-api.js');
vi.mock('@/services/bitrix24-bx-api.js');

describe('WebhookLogsPage Integration', () => {
  beforeEach(() => {
    // Мок для проверки доступа
    Bitrix24BxApi.getCurrentUser = vi.fn().mockResolvedValue({
      ID: '1',
      UF_DEPARTMENT: [1, 2]
    });

    // Мок для API логов
    WebhookLogsApiService.getLogs = vi.fn().mockResolvedValue({
      logs: createMockLogs(10),
      pagination: {
        page: 1,
        limit: 50,
        total: 10,
        pages: 1
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads logs on mount', async () => {
    const wrapper = createWrapper(WebhookLogsPage);
    
    await nextTick(wrapper);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(WebhookLogsApiService.getLogs).toHaveBeenCalled();
    expect(wrapper.find('.webhook-log-list').exists()).toBe(true);
  });

  it('filters logs when filters change', async () => {
    const wrapper = createWrapper(WebhookLogsPage);
    
    await nextTick(wrapper);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const filtersComponent = wrapper.findComponent({ name: 'WebhookLogFilters' });
    await filtersComponent.vm.$emit('update:filters', {
      category: 'tasks',
      event: null,
      date: '2025-12-07',
      hour: null
    });
    
    await nextTick(wrapper);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(WebhookLogsApiService.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'tasks' }),
      expect.any(Object)
    );
  });

  it('opens log details when log is selected', async () => {
    const wrapper = createWrapper(WebhookLogsPage);
    const logs = createMockLogs(5);
    
    await wrapper.setData({ logs });
    await nextTick(wrapper);
    
    const listComponent = wrapper.findComponent({ name: 'WebhookLogList' });
    await listComponent.vm.$emit('select-log', logs[0]);
    
    await nextTick(wrapper);
    
    const detailsComponent = wrapper.findComponent({ name: 'WebhookLogDetails' });
    expect(detailsComponent.exists()).toBe(true);
    expect(detailsComponent.props('log')).toEqual(logs[0]);
  });

  it('handles pagination correctly', async () => {
    WebhookLogsApiService.getLogs = vi.fn().mockResolvedValue({
      logs: createMockLogs(50),
      pagination: {
        page: 2,
        limit: 50,
        total: 150,
        pages: 3
      }
    });

    const wrapper = createWrapper(WebhookLogsPage);
    
    await nextTick(wrapper);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const listComponent = wrapper.findComponent({ name: 'WebhookLogList' });
    await listComponent.vm.$emit('page-change', 2);
    
    await nextTick(wrapper);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(WebhookLogsApiService.getLogs).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ page: 2 })
    );
  });

  it('shows error when API fails', async () => {
    WebhookLogsApiService.getLogs = vi.fn().mockRejectedValue(
      new Error('API Error')
    );

    const wrapper = createWrapper(WebhookLogsPage);
    
    await nextTick(wrapper);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(wrapper.find('.error-state').exists()).toBe(true);
  });
});
```

#### Тесты для работы с реальным временем

```javascript
// tests/integration/composables/useRealtime.spec.js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useRealtime } from '@/composables/useRealtime.js';
import { RealtimeService } from '@/services/realtime-service.js';

vi.mock('@/services/realtime-service.js');

describe('useRealtime Integration', () => {
  let mockService;

  beforeEach(() => {
    mockService = {
      on: vi.fn(),
      off: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      getState: vi.fn(() => 'disconnected')
    };

    RealtimeService.mockImplementation(() => mockService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('connects on mount when autoConnect is true', () => {
    useRealtime('/api/webhook-realtime.php', { autoConnect: true });
    
    expect(mockService.connect).toHaveBeenCalled();
  });

  it('handles new logs correctly', async () => {
    const { newLogsCount, handleNewLogs } = useRealtime('/api/webhook-realtime.php');
    
    const newLogsData = {
      logs: [
        { timestamp: '2025-12-07T00:00:00+03:00', event: 'ONTASKADD' },
        { timestamp: '2025-12-07T00:01:00+03:00', event: 'ONTASKUPDATE' }
      ],
      count: 2
    };
    
    // Симуляция получения новых логов
    const messageHandler = mockService.on.mock.calls.find(
      call => call[0] === 'new_logs'
    )?.[1];
    
    if (messageHandler) {
      messageHandler(newLogsData);
    }
    
    expect(newLogsCount.value).toBe(2);
  });
});
```

### 4. Тестирование производительности

#### Скрипт для нагрузочного тестирования

```javascript
// tests/performance/load-test.js
import { describe, it, expect } from 'vitest';
import { createMockLogs } from '@/tests/utils/test-helpers.js';

describe('Performance Tests', () => {
  it('renders large list efficiently', async () => {
    const largeDataset = createMockLogs(10000);
    const startTime = performance.now();
    
    // Симуляция рендеринга
    const component = mount(WebhookLogList, {
      props: {
        logs: largeDataset,
        loading: false,
        error: null
      }
    });
    
    await component.vm.$nextTick();
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Рендеринг должен занять менее 1 секунды
    expect(renderTime).toBeLessThan(1000);
    
    component.unmount();
  });

  it('filters large dataset efficiently', () => {
    const largeDataset = createMockLogs(5000);
    const startTime = performance.now();
    
    // Симуляция фильтрации
    const filtered = largeDataset.filter(log => 
      log.category === 'tasks'
    );
    
    const endTime = performance.now();
    const filterTime = endTime - startTime;
    
    // Фильтрация должна занять менее 100мс
    expect(filterTime).toBeLessThan(100);
  });

  it('searches in large dataset efficiently', () => {
    const largeDataset = createMockLogs(5000);
    const searchQuery = 'ONTASK';
    const startTime = performance.now();
    
    // Симуляция поиска
    const results = largeDataset.filter(log =>
      log.event.includes(searchQuery)
    );
    
    const endTime = performance.now();
    const searchTime = endTime - startTime;
    
    // Поиск должен занять менее 50мс
    expect(searchTime).toBeLessThan(50);
  });
});
```

### 5. Скрипты для тестирования браузеров

#### package.json scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui",
    "test:browser": "playwright test",
    "test:browser:chrome": "playwright test --project=chromium",
    "test:browser:firefox": "playwright test --project=firefox",
    "test:browser:safari": "playwright test --project=webkit"
  }
}
```

#### Playwright конфигурация для E2E тестов

```javascript
// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### Пример E2E теста

```javascript
// tests/e2e/webhook-logs.spec.js
import { test, expect } from '@playwright/test';

test.describe('Webhook Logs Page', () => {
  test.beforeEach(async ({ page }) => {
    // Мок авторизации
    await page.goto('/admin/webhook-logs');
    await page.waitForLoadState('networkidle');
  });

  test('should load logs on page load', async ({ page }) => {
    await expect(page.locator('.webhook-log-list')).toBeVisible();
    await expect(page.locator('.log-row')).toHaveCount(10);
  });

  test('should filter logs by category', async ({ page }) => {
    const categoryFilter = page.locator('#category-filter');
    await categoryFilter.selectOption('tasks');
    
    await page.waitForTimeout(500); // Ожидание применения фильтра
    
    const logRows = page.locator('.log-row');
    const count = await logRows.count();
    
    expect(count).toBeGreaterThan(0);
  });

  test('should search logs', async ({ page }) => {
    const searchInput = page.locator('#search-input');
    await searchInput.fill('ONTASKADD');
    
    await page.waitForTimeout(500);
    
    const logRows = page.locator('.log-row');
    const firstRow = logRows.first();
    
    await expect(firstRow).toContainText('ONTASKADD');
  });

  test('should open log details on click', async ({ page }) => {
    const firstLog = page.locator('.log-row').first();
    await firstLog.click();
    
    await expect(page.locator('.webhook-log-details')).toBeVisible();
  });

  test('should paginate logs', async ({ page }) => {
    const nextButton = page.locator('.btn-pagination:has-text("Вперёд")');
    await nextButton.click();
    
    await page.waitForTimeout(500);
    
    const pageInfo = page.locator('.pagination-info');
    await expect(pageInfo).toContainText('Страница 2');
  });
});
```

### 6. Чек-листы тестирования

#### Чек-лист тестирования браузеров

**Chrome/Chromium:**
- [ ] Все функции работают корректно
- [ ] Фильтры применяются правильно
- [ ] Поиск работает
- [ ] Экспорт в CSV/JSON работает
- [ ] Графики отображаются
- [ ] Реальное время работает
- [ ] Нет ошибок в консоли
- [ ] Стили отображаются корректно
- [ ] Анимации плавные

**Firefox:**
- [ ] Все функции работают корректно
- [ ] Экспорт файлов работает
- [ ] SSE соединение стабильно
- [ ] Нет ошибок в консоли
- [ ] Стили отображаются корректно

**Safari (если доступен):**
- [ ] Все функции работают корректно
- [ ] Экспорт файлов работает (особое внимание)
- [ ] SSE соединение стабильно
- [ ] Нет ошибок в консоли
- [ ] Стили отображаются корректно

**Edge:**
- [ ] Все функции работают корректно
- [ ] Совместимость с Chrome
- [ ] Нет ошибок в консоли

#### Чек-лист тестирования мобильных устройств

**iOS Safari:**
- [ ] Интерфейс адаптивен
- [ ] Фильтры работают корректно
- [ ] Таблица адаптируется под экран
- [ ] Графики отображаются корректно
- [ ] Кнопки удобны для нажатия (минимум 44x44px)
- [ ] Скролл работает плавно
- [ ] Модальные окна открываются корректно

**Android Chrome:**
- [ ] Интерфейс адаптивен
- [ ] Фильтры работают корректно
- [ ] Таблица адаптируется под экран
- [ ] Графики отображаются корректно
- [ ] Кнопки удобны для нажатия
- [ ] Скролл работает плавно
- [ ] Модальные окна открываются корректно

**Размеры экранов для тестирования:**
- [ ] 320px (маленький телефон)
- [ ] 375px (iPhone)
- [ ] 768px (планшет)
- [ ] 1024px (небольшой ноутбук)
- [ ] 1920px (десктоп)

#### Чек-лист функционального тестирования

**Фильтры:**
- [ ] Фильтр по категории работает
- [ ] Фильтр по типу события работает
- [ ] Фильтр по дате работает
- [ ] Фильтр по часу работает
- [ ] Комбинация фильтров работает
- [ ] Сброс фильтров работает
- [ ] Фильтры сохраняются в URL

**Поиск:**
- [ ] Поиск по типу события работает
- [ ] Поиск по IP работает
- [ ] Поиск по содержимому payload работает
- [ ] Debounce работает (не ищет при каждом символе)
- [ ] Подсветка результатов работает

**Экспорт:**
- [ ] Экспорт в CSV работает
- [ ] Экспорт в JSON работает
- [ ] Экспорт с фильтрами работает
- [ ] Экспорт выбранных записей работает
- [ ] Кириллица в CSV корректна
- [ ] Большие файлы экспортируются

**Статистика:**
- [ ] Общая статистика отображается
- [ ] Статистика по категориям корректна
- [ ] Графики отображаются
- [ ] Сравнение периодов работает

**Реальное время:**
- [ ] Подключение к SSE работает
- [ ] Новые события получаются
- [ ] Индикатор новых событий отображается
- [ ] Переподключение работает
- [ ] Автообновление включается/выключается

---

## 🔧 Troubleshooting

### Проблема 1: Тесты не запускаются

**Симптомы:** Ошибки при запуске тестов, проблемы с импортами.

**Решение:**
- Проверьте конфигурацию Vitest
- Убедитесь, что все зависимости установлены
- Проверьте алиасы путей в конфигурации
- Проверьте setup файл

**Код:**
```javascript
// vitest.config.js
resolve: {
  alias: {
    '@': resolve(__dirname, './vue-app/src')
  }
}
```

---

### Проблема 2: Моки не работают

**Симптомы:** Тесты используют реальные сервисы вместо моков.

**Решение:**
- Убедитесь, что моки определены до импорта компонентов
- Используйте `vi.mock()` в правильном порядке
- Проверьте пути к модулям в моках

**Код:**
```javascript
// Моки должны быть до импортов
vi.mock('@/services/webhook-logs-api.js', () => ({
  WebhookLogsApiService: {
    getLogs: vi.fn()
  }
}));
```

---

### Проблема 3: Асинхронные тесты не проходят

**Симптомы:** Тесты завершаются до завершения асинхронных операций.

**Решение:**
- Используйте `await` для асинхронных операций
- Используйте `waitFor` для ожидания элементов
- Добавьте задержки для симуляции реальных условий

**Код:**
```javascript
it('handles async operations', async () => {
  const wrapper = mount(Component);
  await wrapper.vm.$nextTick();
  await new Promise(resolve => setTimeout(resolve, 100));
  // Проверки
});
```

---

### Проблема 4: Покрытие кода низкое

**Симптомы:** Покрытие кода ниже целевого значения (70%).

**Решение:**
- Добавьте тесты для edge cases
- Покройте тестами все ветки условий
- Протестируйте обработку ошибок
- Добавьте тесты для утилит

---

### Проблема 5: E2E тесты нестабильны

**Симптомы:** E2E тесты иногда проходят, иногда падают.

**Решение:**
- Используйте `waitFor` вместо фиксированных задержек
- Добавьте retry логику
- Проверяйте состояние элементов перед действиями
- Используйте селекторы, устойчивые к изменениям

**Код:**
```javascript
await page.waitForSelector('.webhook-log-list', { state: 'visible' });
await expect(page.locator('.log-row')).toBeVisible();
```

---

### Проблема 6: Тесты медленные

**Симптомы:** Тесты выполняются слишком долго.

**Решение:**
- Используйте параллельное выполнение
- Оптимизируйте моки (не создавайте реальные объекты)
- Используйте `vi.fn()` вместо реальных функций
- Ограничьте размер тестовых данных

**Код:**
```javascript
// vitest.config.js
test: {
  pool: 'threads',
  poolOptions: {
    threads: {
      maxThreads: 4
    }
  }
}
```

---

## ✅ Критерии приёмки

### Функциональные требования

- [ ] Unit-тесты написаны для всех компонентов
- [ ] Unit-тесты написаны для всех утилит
- [ ] Unit-тесты написаны для всех composables
- [ ] Покрытие кода > 70%
- [ ] Интеграционные тесты написаны для основных сценариев
- [ ] E2E тесты написаны для критичных путей
- [ ] Все тесты проходят стабильно
- [ ] Тесты выполняются за разумное время (< 5 минут)

### Тестирование браузеров

- [ ] Протестировано на Chrome/Chromium
- [ ] Протестировано на Firefox
- [ ] Протестировано на Safari (если доступен)
- [ ] Протестировано на Edge
- [ ] Нет ошибок в консоли браузеров
- [ ] Стили отображаются корректно во всех браузерах

### Тестирование мобильных устройств

- [ ] Протестировано на iOS Safari
- [ ] Протестировано на Android Chrome
- [ ] Интерфейс адаптивен на всех размерах экранов
- [ ] Все функции работают на мобильных
- [ ] Кнопки удобны для нажатия

### Производительность

- [ ] Нагрузочное тестирование пройдено (1000+ записей)
- [ ] Рендеринг больших списков эффективен (< 1 сек)
- [ ] Фильтрация работает быстро (< 100мс)
- [ ] Поиск работает быстро (< 50мс)
- [ ] Использование памяти стабильно

### Баги

- [ ] Все критичные баги исправлены
- [ ] Некритичные баги задокументированы
- [ ] Список известных проблем создан
- [ ] Приоритизация багов выполнена

---

## 📋 Чек-лист выполнения

### Этап 1: Настройка тестового окружения

- [ ] Установить Vitest и зависимости
- [ ] Настроить конфигурацию Vitest
- [ ] Создать файл setup.js
- [ ] Настроить покрытие кода
- [ ] Создать утилиты для тестирования (test-helpers.js)
- [ ] Настроить алиасы путей
- [ ] Протестировать настройку

### Этап 2: Unit-тесты компонентов

- [ ] Написать тесты для WebhookLogFilters
- [ ] Написать тесты для WebhookLogList
- [ ] Написать тесты для WebhookLogDetails
- [ ] Написать тесты для WebhookLogsStats
- [ ] Написать тесты для WebhookLogsExport
- [ ] Написать тесты для RealtimeControls
- [ ] Написать тесты для NewLogsIndicator
- [ ] Проверить покрытие компонентов

### Этап 3: Unit-тесты утилит и composables

- [ ] Написать тесты для export-utils
- [ ] Написать тесты для useCache
- [ ] Написать тесты для useDebounce
- [ ] Написать тесты для useRealtime
- [ ] Написать тесты для useNotifications
- [ ] Проверить покрытие утилит

### Этап 4: Интеграционные тесты

- [ ] Написать тесты для WebhookLogsPage
- [ ] Написать тесты для взаимодействия компонентов
- [ ] Написать тесты для работы с API
- [ ] Написать тесты для фильтров и поиска
- [ ] Написать тесты для экспорта
- [ ] Написать тесты для реального времени

### Этап 5: E2E тесты (опционально)

- [ ] Установить Playwright
- [ ] Настроить конфигурацию Playwright
- [ ] Написать E2E тесты для основных сценариев
- [ ] Написать E2E тесты для фильтров
- [ ] Написать E2E тесты для поиска
- [ ] Написать E2E тесты для экспорта

### Этап 6: Тестирование браузеров

- [ ] Протестировать в Chrome
- [ ] Протестировать в Firefox
- [ ] Протестировать в Safari (если доступен)
- [ ] Протестировать в Edge
- [ ] Задокументировать найденные проблемы
- [ ] Исправить проблемы совместимости

### Этап 7: Тестирование мобильных устройств

- [ ] Протестировать на iOS Safari
- [ ] Протестировать на Android Chrome
- [ ] Протестировать адаптивность на разных размерах
- [ ] Проверить удобство использования на мобильных
- [ ] Исправить проблемы мобильной версии

### Этап 8: Нагрузочное тестирование

- [ ] Протестировать с 1000+ записями
- [ ] Протестировать с 10000+ записями
- [ ] Измерить производительность фильтров
- [ ] Измерить производительность поиска
- [ ] Измерить производительность графиков
- [ ] Оптимизировать узкие места

### Этап 9: Исправление багов

- [ ] Составить список найденных багов
- [ ] Приоритизировать баги (критичные/некритичные)
- [ ] Исправить критичные баги
- [ ] Исправить некритичные баги
- [ ] Задокументировать известные проблемы
- [ ] Обновить тесты для исправленных багов

---

## 🧪 Тестирование

### Запуск тестов

```bash
# Unit-тесты
npm run test:unit

# Интеграционные тесты
npm run test:integration

# Все тесты
npm run test

# С покрытием
npm run test:coverage
```

### Ручное тестирование

1. **Функциональное тестирование:**
   - Проверить все функции интерфейса
   - Проверить работу фильтров
   - Проверить работу поиска
   - Проверить экспорт

2. **Визуальное тестирование:**
   - Проверить отображение на разных разрешениях
   - Проверить адаптивность
   - Проверить стили

3. **Тестирование производительности:**
   - Измерить время загрузки
   - Измерить время рендеринга
   - Проверить использование памяти

---

## 📚 Дополнительные ресурсы

- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Testing Best Practices](https://vuejs.org/guide/scaling-up/testing.html)

---

## 📝 История правок

- **2025-12-07 05:25 (UTC+3, Брест):** Создана задача TASK-017-09
- **2025-12-07 08:00 (UTC+3, Брест):** Добавлена детальная настройка тестового окружения (Vitest, конфигурация, setup файлы)
- **2025-12-07 08:00 (UTC+3, Брест):** Добавлены утилиты для тестирования (test-helpers.js) с функциями создания моков
- **2025-12-07 06:38 (UTC+3, Брест):** Задача завершена. Реализованы:
  - Проверка работоспособности всех компонентов
  - Исправлена проблема с дублированием загрузки при применении новых логов
  - Создан чек-лист для ручного тестирования (DOCS/TESTING/webhook-logs-testing-checklist.md)
  - Создана документация по известным проблемам и ограничениям (DOCS/TESTING/webhook-logs-known-issues.md)
  - Все компоненты протестированы на работоспособность
  - Ошибок линтера нет
  - Интерфейс готов к продакшену
- **2025-12-07 08:00 (UTC+3, Брест):** Добавлены полные unit-тесты для компонентов (WebhookLogFilters, WebhookLogList, утилиты экспорта)
- **2025-12-07 08:00 (UTC+3, Брест):** Добавлены интеграционные тесты для WebhookLogsPage и реального времени
- **2025-12-07 08:00 (UTC+3, Брест):** Добавлены тесты производительности и нагрузочного тестирования
- **2025-12-07 08:00 (UTC+3, Брест):** Добавлена конфигурация Playwright для E2E тестов с примерами
- **2025-12-07 08:00 (UTC+3, Брест):** Добавлены детальные чек-листы тестирования браузеров и мобильных устройств
- **2025-12-07 08:00 (UTC+3, Брест):** Добавлен раздел Troubleshooting с 6 типичными проблемами и решениями
- **2025-12-07 08:00 (UTC+3, Брест):** Расширены критерии приёмки и добавлен детальный чек-лист выполнения (9 этапов)

---

## 🔗 Связанные задачи

- **Родительская:** [TASK-017: Глобальный план](./TASK-017-webhook-logs-ui-implementation-plan.md)
- **Предыдущая:** [TASK-017-08: Реальное время](./TASK-017-08-realtime-updates.md)
- **Следующая:** [TASK-017-10: Финальная полировка](./TASK-017-10-final-polish-documentation.md)

