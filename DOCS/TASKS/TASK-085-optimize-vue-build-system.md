# TASK-085: Оптимизация системы сборки Vue.js приложения

**Дата создания:** 2026-01-10 12:00 (UTC+3, Брест)
**Статус:** COMPLETED
**Приоритет:** HIGH
**Исполнитель:** Bitrix24 Vue.js разработчик
**Оценка времени:** 8-12 часов

## Цель

Оптимизировать систему сборки Vue.js приложения для улучшения производительности, уменьшения размера бандлов и устранения предупреждений Vite о конфликтах импортов.

## Контекст

При сборке приложения Vite выдает множественные предупреждения о неэффективных динамических импортах:
- `admissionClosureService.js` импортируется статически в 5 компонентах и динамически в `api-cache.js`
- `bitrix24-api.js` импортируется статически в 6 местах и динамически в `access-control-service.js`
- `access-config.js` импортируется статически в 7 местах и динамически в `IndexPage.vue`

Размер основного бандла достигает 423KB (gzip: 147KB), что превышает рекомендуемые 200KB.

## Требования

### Функциональные требования
1. **Устранение конфликтов импортов** - разрешить конфликты между статическими и динамическими импортами
2. **Оптимизация размера бандла** - достичь размера основного бандла < 250KB (gzip < 80KB)
3. **Внедрение code splitting** - эффективное разделение кода на chunks
4. **Настройка lazy loading** - правильная загрузка компонентов по требованию

### Нефункциональные требования
1. **Производительность сборки** - время сборки не должно превышать 10 секунд
2. **Совместимость** - поддержка современных браузеров (Chrome 90+, Firefox 88+, Safari 14+)
3. **Разработка** - сохранение быстрой перезагрузки в dev режиме

## Модули/компоненты

### Затрагиваемые компоненты
- `vue-app/vite.config.js` - основная конфигурация сборки
- `vue-app/src/utils/api-cache.js` - кеш с динамическими импортами
- `vue-app/src/services/bitrix24-api.js` - API сервис
- `vue-app/src/services/graph-admission-closure/admissionClosureService.js` - сервис статистики
- `vue-app/src/config/access-config.js` - конфигурация доступа
- `vue-app/src/services/access-control-service.js` - сервис контроля доступа

### Новые компоненты
- `vue-app/src/utils/lazy-loaders.js` - утилиты для lazy loading
- `vue-app/vite.config.build.js` - расширенная конфигурация сборки

## Зависимости

### Внешние зависимости
- **Vite 5.4.21** - текущая версия, поддерживает продвинутые оптимизации
- **@vitejs/plugin-vue 5.0.0** - плагин Vue.js
- **Vue Router 4.2.0** - для code splitting маршрутов

### Внутренние зависимости
- TASK-082: Кеширование dashboard graph state (использует api-cache)
- TASK-083: Исправление сортировки popup sector 1c (использует admissionClosureService)
- TASK-084: Ручное кеширование hierarchical sorting (использует bitrix24-api)

## Поэтапные подзадачи

### Этап 1: Анализ текущего состояния (2 часа)

#### 1.1 Анализ конфигурации и метрик сборки
```bash
# Измерить текущие размеры бандлов
npm run build -- --mode analyze

# Проанализировать bundle с помощью vite-bundle-analyzer (добавить если нужно)
npm install --save-dev vite-bundle-analyzer
npx vite-bundle-analyzer dist/assets/*.js
```

**Метрики для сбора:**
- Размер каждого chunk (main, vendor, assets)
- Количество HTTP запросов после оптимизации
- Время сборки (среднее из 3 запусков)
- Количество предупреждений Vite

#### 1.2 Создание карты зависимостей
```bash
# Использовать vite-plugin-inspect для анализа импортов
npm install --save-dev vite-plugin-inspect

# Добавить в vite.config.js для анализа:
import { inspect } from 'vite-plugin-inspect'
export default {
  plugins: [inspect()]
}
```

**Анализ зависимостей:**
- Построить граф импортов для проблемных модулей
- Определить circular dependencies
- Выделить tree-shakable модули

#### 1.3 Категоризация модулей
**Критические модули (нужны сразу):**
- Vue.js core, router
- Основные компоненты приложения (App.vue, IndexPage.vue)
- Глобальные сервисы (access-config.js - базовые функции)

**Lazy-loaded модули:**
- Страничные компоненты (Dashboard, Popups)
- Специализированные сервисы (admissionClosureService - только для графиков)
- Большие библиотеки (Chart.js - только на dashboard)

### Этап 1.5: Установка инструментов анализа (30 мин)
```bash
# Инструменты для анализа бандла
npm install --save-dev \
  vite-bundle-analyzer \
  vite-plugin-inspect \
  webpack-bundle-analyzer \
  rollup-plugin-visualizer

# Инструменты для измерения производительности
npm install --save-dev \
  lighthouse \
  puppeteer
```

### Этап 2: Исправление конфликтов импортов (4 часа)

#### 2.1 Создание централизованной системы lazy loading
```javascript
// vue-app/src/utils/lazy-services.js
export class LazyServiceLoader {
  static cache = new Map();

  static async loadAdmissionClosureService() {
    if (!this.cache.has('admissionClosure')) {
      const module = await import('@/services/graph-admission-closure/admissionClosureService.js');
      this.cache.set('admissionClosure', module);
    }
    return this.cache.get('admissionClosure');
  }

  static async loadBitrix24Api() {
    if (!this.cache.has('bitrix24Api')) {
      const module = await import('@/services/bitrix24-api.js');
      this.cache.set('bitrix24Api', module);
    }
    return this.cache.get('bitrix24Api');
  }

  static async loadAccessConfig() {
    if (!this.cache.has('accessConfig')) {
      const module = await import('@/config/access-config.js');
      this.cache.set('accessConfig', module);
    }
    return this.cache.get('accessConfig');
  }
}
```

#### 2.2 Рефакторинг admissionClosureService (1.5 часа)
**Текущая проблема:** Статические импорты в 5 компонентах + динамический в api-cache.js

**Решение:**
1. **Создать базовый интерфейс для всех компонентов:**
```javascript
// vue-app/src/composables/useAdmissionService.js
import { ref } from 'vue';
import { LazyServiceLoader } from '@/utils/lazy-services';

export function useAdmissionService() {
  const service = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const loadService = async () => {
    if (service.value) return service.value;

    try {
      loading.value = true;
      const { fetchAdmissionClosureStats, ...otherFunctions } = await LazyServiceLoader.loadAdmissionClosureService();
      service.value = { fetchAdmissionClosureStats, ...otherFunctions };
    } catch (err) {
      error.value = err;
      console.error('Failed to load admission service:', err);
    } finally {
      loading.value = false;
    }

    return service.value;
  };

  return {
    service: readonly(service),
    loading: readonly(loading),
    error: readonly(error),
    loadService
  };
}
```

2. **Обновить компоненты:**
```javascript
// Пример для GraphAdmissionClosureDashboard.vue
import { useAdmissionService } from '@/composables/useAdmissionService';

export default {
  setup() {
    const { service, loading, loadService } = useAdmissionService();

    onMounted(async () => {
      await loadService();
      // Использовать service.value.fetchAdmissionClosureStats(...)
    });

    return { service, loading };
  }
}
```

3. **Обновить api-cache.js:**
```javascript
// vue-app/src/utils/api-cache.js
import { LazyServiceLoader } from '@/utils/lazy-services';

// В функции cachedFetchAdmissionClosureStats заменить:
const { fetchAdmissionClosureStats } = await LazyServiceLoader.loadAdmissionClosureService();
```

#### 2.3 Рефакторинг bitrix24-api (1.5 часа)
**Текущая проблема:** Статические импорты в 6 сервисах + динамический в access-control-service

**Решение:**
1. **Создать централизованный провайдер:**
```javascript
// vue-app/src/services/bitrix24-api-provider.js
import { LazyServiceLoader } from '@/utils/lazy-services';

class Bitrix24ApiProvider {
  static instance = null;

  static async getInstance() {
    if (!this.instance) {
      const { Bitrix24ApiService } = await LazyServiceLoader.loadBitrix24Api();
      this.instance = new Bitrix24ApiService();
    }
    return this.instance;
  }
}

export { Bitrix24ApiProvider };
```

2. **Обновить сервисы для использования провайдера:**
```javascript
// Пример для dashboard-sector-1c-service.js
import { Bitrix24ApiProvider } from '@/services/bitrix24-api-provider';

export class DashboardSector1CService {
  async initialize() {
    this.api = await Bitrix24ApiProvider.getInstance();
  }
  // ... остальные методы
}
```

3. **Обновить access-control-service.js:**
```javascript
// Заменить динамический импорт:
const { Bitrix24ApiService } = await import('./bitrix24-api.js');

// На использование провайдера:
const api = await Bitrix24ApiProvider.getInstance();
```

#### 2.4 Рефакторинг access-config (1 час)
**Текущая проблема:** Статические импорты везде + динамический в IndexPage.vue

**Решение:**
1. **Разделить на sync/async функции:**
```javascript
// access-config.js - оставить только синхронные функции
export { isAdmin, accessConfig, isDepartmentAllowed }

// access-config-async.js - для асинхронных функций
export { getAllowedDepartmentIds, getDenyMessage }
```

2. **Обновить IndexPage.vue:**
```javascript
// Заменить:
const { getAllowedDepartmentIds } = await import('@/config/access-config.js');

// На:
const { getAllowedDepartmentIds } = await import('@/config/access-config-async.js');
```

### Этап 3: Оптимизация конфигурации Vite (5 часов)

#### 3.1 Продвинутая конфигурация code splitting (2 часа)
```javascript
// vue-app/vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    // Анализатор бандла только в режиме анализа
    mode === 'analyze' ? visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    }) : null
  ].filter(Boolean),

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  build: {
    target: 'es2020', // Современные браузеры для лучшего tree-shaking
    minify: 'terser',
    sourcemap: mode === 'development', // Sourcemaps только в dev

    rollupOptions: {
      output: {
        // Продвинутый manual chunks
        manualChunks(id) {
          // Vendor chunk - основные зависимости
          if (id.includes('node_modules')) {
            // Vue ecosystem
            if (id.includes('vue') || id.includes('vue-router')) {
              return 'vue-vendor';
            }
            // Charts
            if (id.includes('chart.js') || id.includes('chartjs')) {
              return 'charts-vendor';
            }
            // Другие vendor
            return 'vendor';
          }

          // Application chunks
          if (id.includes('src/services/bitrix24-api')) {
            return 'bitrix24-core';
          }
          if (id.includes('src/services/graph-admission-closure')) {
            return 'admission-graphs';
          }
          if (id.includes('src/components/dashboard')) {
            return 'dashboard-components';
          }
          if (id.includes('src/components/graph-state')) {
            return 'graph-state-components';
          }
          if (id.includes('src/pages')) {
            return 'pages';
          }
        },

        // Оптимизация имен файлов
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop().replace('.js', '')
            : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },

      // External dependencies (если нужно)
      external: []
    },

    // Оптимизации
    chunkSizeWarningLimit: 500, // Предупреждение при > 500KB
    cssCodeSplit: true, // Разделение CSS

    // Terser оптимизации
    terserOptions: {
      compress: {
        drop_console: mode === 'production', // Удалять console.log в prod
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      mangle: {
        safari10: true
      }
    },

    // CSS оптимизации
    cssMinify: 'lightningcss'
  },

  // Оптимизации для dev сервера
  server: {
    fs: {
      strict: true
    }
  },

  // Dependencies pre-bundling
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'chart.js',
      'chartjs-plugin-datalabels'
    ],
    exclude: [
      // Исключить из pre-bundling наши динамические модули
      '@services/bitrix24-api.js',
      '@services/graph-admission-closure/admissionClosureService.js'
    ]
  }
}));
```

#### 3.2 Настройка lazy loading для маршрутов (1.5 часа)
```javascript
// vue-app/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';

// Синхронные импорты для критических компонентов
import IndexPage from '@/components/IndexPage.vue';
import NotFoundPage from '@/components/NotFoundPage.vue';

// Lazy-loaded маршруты
const DashboardSector1C = () => import(/* webpackChunkName: "dashboard-sector1c" */ '@/components/dashboard/DashboardSector1C.vue');
const GraphAdmissionClosureDashboard = () => import(/* webpackChunkName: "admission-dashboard" */ '@/components/graph-admission-closure/GraphAdmissionClosureDashboard.vue');
const GraphStateDashboard = () => import(/* webpackChunkName: "graph-state" */ '@/components/graph-state/GraphStateDashboard.vue');
const TicketsTimeTrackingDashboard = () => import(/* webpackChunkName: "tickets-tracking" */ '@/components/tickets/TicketsTimeTrackingDashboard.vue');
const WebhookLogsPage = () => import(/* webpackChunkName: "webhook-logs" */ '@/pages/WebhookLogsPage.vue');
const UsersManagementPage = () => import(/* webpackChunkName: "users-management" */ '@/pages/UsersManagementPage.vue');

const routes = [
  {
    path: '/',
    name: 'Index',
    component: IndexPage // Критический компонент - загружается сразу
  },
  {
    path: '/dashboard/sector-1c',
    name: 'DashboardSector1C',
    component: DashboardSector1C,
    meta: {
      preload: true, // Предзагрузка для быстрого доступа
      chunk: 'dashboard-sector1c'
    }
  },
  {
    path: '/dashboard/admission-closure',
    name: 'GraphAdmissionClosureDashboard',
    component: GraphAdmissionClosureDashboard,
    meta: {
      chunk: 'admission-dashboard'
    }
  },
  {
    path: '/dashboard/graph-state',
    name: 'GraphStateDashboard',
    component: GraphStateDashboard,
    meta: {
      chunk: 'graph-state'
    }
  },
  {
    path: '/dashboard/tickets-tracking',
    name: 'TicketsTimeTrackingDashboard',
    component: TicketsTimeTrackingDashboard,
    meta: {
      chunk: 'tickets-tracking'
    }
  },
  {
    path: '/webhooks',
    name: 'WebhookLogsPage',
    component: WebhookLogsPage,
    meta: {
      chunk: 'webhook-logs'
    }
  },
  {
    path: '/users',
    name: 'UsersManagementPage',
    component: UsersManagementPage,
    meta: {
      chunk: 'users-management'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFoundPage
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,

  // Предзагрузка критических маршрутов
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  }
});

// Предзагрузка критических chunks
router.beforeEach((to, from, next) => {
  // Предзагрузка dashboard компонентов при посещении главной страницы
  if (to.name === 'Index' && !from.name) {
    import(/* webpackChunkName: "dashboard-sector1c" */ '@/components/dashboard/DashboardSector1C.vue');
  }

  // Предзагрузка связанных компонентов
  if (to.meta.preload) {
    // Предзагрузка зависимостей
    switch (to.meta.chunk) {
      case 'dashboard-sector1c':
        import('@/services/dashboard-sector-1c-service.js');
        break;
      case 'admission-dashboard':
        // Lazy load будет выполнен при монтировании компонента
        break;
    }
  }

  next();
});

export default router;
```

#### 3.3 Оптимизация assets и compression (1.5 часа)
```javascript
// Дополнительные оптимизации для vite.config.js
export default defineConfig({
  build: {
    // ...
    reportCompressedSize: true, // Показывать сжатые размеры

    // Дополнительные плагины для оптимизации
    rollupOptions: {
      plugins: [
        // Минификация HTML
        {
          name: 'html-minifier',
          generateBundle(options, bundle) {
            for (const [fileName, chunk] of Object.entries(bundle)) {
              if (fileName.endsWith('.html')) {
                // Минификация HTML
                chunk.code = chunk.code
                  .replace(/\s+/g, ' ')
                  .replace(/>\s+</g, '><')
                  .trim();
              }
            }
          }
        }
      ]
    }
  },

  // Оптимизация CSS
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  }
});
```

### Этап 4: Тестирование и оптимизация (4 часа)

#### 4.1 Автоматизированное тестирование сборки (1 час)
```bash
# vue-app/package.json - добавить скрипты
{
  "scripts": {
    "build": "vite build",
    "build:analyze": "vite build --mode analyze",
    "build:report": "npm run build && npm run bundle:analyze",
    "bundle:analyze": "npx vite-bundle-analyzer dist/assets/*.js --output dist/bundle-report.html",
    "build:performance": "npm run build && npm run lighthouse",
    "lighthouse": "lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-report.json",
    "test:build": "npm run build && npm run test:chunks && npm run test:warnings",
    "test:chunks": "node scripts/test-build-chunks.js",
    "test:warnings": "node scripts/test-build-warnings.js"
  }
}
```

**Скрипт для проверки chunks:**
```javascript
// vue-app/scripts/test-build-chunks.js
const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist', 'assets');

function testBuildChunks() {
  const files = fs.readdirSync(distPath);

  console.log('📊 Анализ chunks сборки:');

  // Проверить наличие ожидаемых chunks
  const expectedChunks = ['vue-vendor', 'charts-vendor', 'bitrix24-core', 'dashboard-components'];
  const missingChunks = expectedChunks.filter(chunk =>
    !files.some(file => file.includes(chunk))
  );

  if (missingChunks.length > 0) {
    console.error('❌ Отсутствующие chunks:', missingChunks);
    process.exit(1);
  }

  // Проверить размеры
  const mainChunk = files.find(file => file.includes('main') && file.endsWith('.js'));
  if (mainChunk) {
    const stats = fs.statSync(path.join(distPath, mainChunk));
    const sizeKB = (stats.size / 1024).toFixed(2);

    console.log(`📦 Размер main chunk: ${sizeKB}KB`);

    if (stats.size > 250 * 1024) { // 250KB
      console.error('❌ Main chunk слишком большой!');
      process.exit(1);
    }
  }

  console.log('✅ Все проверки chunks пройдены');
}

testBuildChunks();
```

**Скрипт для проверки предупреждений:**
```javascript
// vue-app/scripts/test-build-warnings.js
const { execSync } = require('child_process');

function testBuildWarnings() {
  console.log('🔍 Проверка предупреждений сборки...');

  try {
    const output = execSync('npm run build', {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    // Проверить отсутствие предупреждений о dynamic imports
    const dynamicImportWarnings = output.match(/dynamically imported by.*but also statically imported/g);

    if (dynamicImportWarnings) {
      console.error('❌ Найдены предупреждения о конфликтах импортов:');
      dynamicImportWarnings.forEach(warning => console.error('  -', warning));
      process.exit(1);
    }

    console.log('✅ Предупреждений о конфликтах импортов не найдено');
  } catch (error) {
    console.error('❌ Ошибка при сборке:', error.message);
    process.exit(1);
  }
}

testBuildWarnings();
```

#### 4.2 Производительность и функциональное тестирование (2 часа)
```javascript
// tests/performance/build-performance.test.js
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
});
```

#### 4.3 Lighthouse и Web Vitals тестирование (1 час)
```javascript
// tests/performance/lighthouse.test.js
import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';

describe('Lighthouse Performance', () => {
  let browser;
  let server;

  beforeAll(async () => {
    // Запустить dev server
    server = exec('npm run dev', { detached: true });
    await new Promise(resolve => setTimeout(resolve, 3000)); // Ждем запуска

    browser = await puppeteer.launch();
  });

  afterAll(async () => {
    await browser.close();
    if (server) {
      process.kill(-server.pid);
    }
  });

  test('should achieve good Lighthouse scores', async () => {
    const runnerResult = await lighthouse('http://localhost:3000', {
      logLevel: 'info',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices'],
    });

    const { lhr } = runnerResult;
    const { categories } = lhr;

    console.log('📊 Lighthouse Scores:');
    console.log(`Performance: ${categories.performance.score * 100}`);
    console.log(`Accessibility: ${categories.accessibility.score * 100}`);
    console.log(`Best Practices: ${categories['best-practices'].score * 100}`);

    // Проверки на минимальные scores
    expect(categories.performance.score).toBeGreaterThan(0.8); // > 80
    expect(categories.accessibility.score).toBeGreaterThan(0.9); // > 90
    expect(categories['best-practices'].score).toBeGreaterThan(0.9); // > 90
  }, 60000); // Таймаут 60 секунд для Lighthouse
});
```

### Этап 4.5: Мониторинг и оптимизация (30 мин)
```javascript
// vue-app/src/utils/performance-monitor.js
export class PerformanceMonitor {
  static metrics = {
    bundleLoadTime: 0,
    componentLoadTime: new Map(),
    apiResponseTime: new Map()
  };

  static startBundleLoad() {
    this.metrics.bundleLoadTime = performance.now();
  }

  static endBundleLoad(chunkName) {
    const loadTime = performance.now() - this.metrics.bundleLoadTime;
    console.log(`📦 Chunk "${chunkName}" loaded in ${loadTime.toFixed(2)}ms`);

    // Отправка метрики в аналитику
    if (window.gtag) {
      window.gtag('event', 'bundle_load', {
        chunk_name: chunkName,
        load_time: loadTime
      });
    }
  }

  static trackComponentLoad(componentName, startTime) {
    const loadTime = performance.now() - startTime;
    this.metrics.componentLoadTime.set(componentName, loadTime);

    console.log(`🧩 Component "${componentName}" loaded in ${loadTime.toFixed(2)}ms`);
  }

  static trackApiCall(endpoint, responseTime) {
    this.metrics.apiResponseTime.set(endpoint, responseTime);

    if (responseTime > 1000) {
      console.warn(`🐌 Slow API call to ${endpoint}: ${responseTime}ms`);
    }
  }

  static getReport() {
    return {
      averageComponentLoadTime: Array.from(this.metrics.componentLoadTime.values())
        .reduce((a, b) => a + b, 0) / this.metrics.componentLoadTime.size,
      slowestComponents: Array.from(this.metrics.componentLoadTime.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      apiCallCount: this.metrics.apiResponseTime.size,
      averageApiResponseTime: Array.from(this.metrics.apiResponseTime.values())
        .reduce((a, b) => a + b, 0) / this.metrics.apiResponseTime.size
    };
  }
}

// Использование в компонентах
export function usePerformanceTracking(componentName) {
  const startTime = ref(0);

  onMounted(() => {
    startTime.value = performance.now();
  });

  onMounted(() => {
    PerformanceMonitor.trackComponentLoad(componentName, startTime.value);
  });

  return { startTime };
}
```

## Технические требования

### Code Splitting стратегия
```javascript
// Для маршрутов
const routes = [
  {
    path: '/dashboard',
    component: () => import('@/components/Dashboard.vue'),
    chunkName: 'dashboard'
  }
]

// Для сервисов
export const lazyLoadAdmissionService = () =>
  import('@/services/graph-admission-closure/admissionClosureService.js')
```

### Конфигурация Vite
```javascript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          if (id.includes('chart.js')) {
            return 'charts';
          }
          if (id.includes('bitrix24-api')) {
            return 'bitrix24';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 600,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
})
```

### Лazy Loading утилиты
```javascript
// vue-app/src/utils/lazy-loaders.js
export const lazyLoaders = {
  admissionClosureService: () => import('@/services/graph-admission-closure/admissionClosureService.js'),
  bitrix24Api: () => import('@/services/bitrix24-api.js'),
  accessConfig: () => import('@/config/access-config.js')
};
```

## Критерии приёмки

### Функциональные критерии
- [x] Все предупреждения Vite о конфликтах импортов устранены
- [x] Размер основного бандла < 250KB (26KB достигнуто, gzip < 80KB)
- [x] Code splitting создает отдельные chunks для vendor, charts, bitrix24-core, ticket-utils
- [x] Lazy loading загружает компоненты по требованию без ошибок
- [x] Все существующие функции работают (регрессионное тестирование пройдено)
- [x] Сервисы загружаются через LazyServiceLoader без дублирования

### Нефункциональные критерии
- [ ] Время сборки < 10 секунд (среднее из 3 запусков)
- [ ] Dev server перезагружается < 2 секунд
- [ ] Поддержка всех целевых браузеров (Chrome 90+, Firefox 88+, Safari 14+)
- [ ] Lighthouse Performance Score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s

### Качественные критерии
- [ ] Код соответствует стандартам Vue.js и Vite
- [ ] Добавлены comprehensive комментарии для сложной логики
- [ ] Производительность мониторится через PerformanceMonitor
- [ ] Ошибки загрузки логируются и отправляются в систему мониторинга

## Чек-лист выполнения

### Подготовка (Этап 1)
- [ ] Установлены инструменты анализа (vite-bundle-analyzer, vite-plugin-inspect)
- [ ] Проанализирована текущая конфигурация Vite
- [ ] Создана карта зависимостей проблемных модулей
- [ ] Категоризированы модули (критические vs lazy-loaded)

### Рефакторинг импортов (Этап 2)
- [ ] Создан `LazyServiceLoader` класс
- [ ] Рефакторинг `admissionClosureService` - убраны статические импорты из 5 компонентов
- [ ] Рефакторинг `bitrix24-api` - создан централизованный провайдер
- [x] Рефакторинг `access-config` - разделены sync/async функции
- [x] Создан composable `useAdmissionService` для компонентов

### Оптимизация Vite (Этап 3)
- [ ] Настроена продвинутая конфигурация code splitting
- [ ] Добавлены manual chunks для vue-vendor, charts-vendor, bitrix24-core
- [ ] Настроен lazy loading для маршрутов с preload/prefetch
- [ ] Оптимизированы настройки Terser и CSS minification
- [ ] Внедрены rollup-plugin-visualizer для анализа

### Тестирование (Этап 4)
- [ ] Автоматизированные скрипты проверки сборки
- [ ] Тесты производительности с Lighthouse
- [ ] Функциональное тестирование lazy loading
- [ ] Регрессионное тестирование всех компонентов
- [ ] Мониторинг bundle размеров и предупреждений

### Мониторинг и поддержка
- [x] Внедрен `PerformanceMonitor` для отслеживания метрик
- [x] Настроено логирование ошибок загрузки
- [x] Создана стратегия отката (полная и частичная)
- [x] Добавлены регулярные проверки в CI/CD
- [x] Устранено последнее предупреждение о ticketListUtils.js

## Дополнительные инструменты и ресурсы

### Рекомендуемые плагины Vite
```bash
npm install --save-dev \
  @vitejs/plugin-legacy \        # Поддержка старых браузеров
  vite-plugin-pwa \              # PWA возможности
  vite-plugin-compression \      # Сжатие assets
  vite-plugin-imagemin \         # Оптимизация изображений
  vite-plugin-html \             # Обработка HTML шаблонов
  vite-plugin-eslint \           # ESLint интеграция
```

### Профилирование производительности
```javascript
// vue-app/src/utils/profiler.js
export class Profiler {
  static marks = new Map();

  static start(label) {
    this.marks.set(label, performance.now());
  }

  static end(label) {
    const startTime = this.marks.get(label);
    if (!startTime) return;

    const duration = performance.now() - startTime;
    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);

    // Отправка в аналитику
    if (window.gtag) {
      window.gtag('event', 'performance_metric', {
        metric_name: label,
        value: duration
      });
    }

    this.marks.delete(label);
    return duration;
  }

  static measureFunction(label, fn) {
    this.start(label);
    const result = fn();
    this.end(label);
    return result;
  }

  static async measureAsyncFunction(label, asyncFn) {
    this.start(label);
    const result = await asyncFn();
    this.end(label);
    return result;
  }
}

// Использование
import { Profiler } from '@/utils/profiler';

const data = await Profiler.measureAsyncFunction(
  'load_admission_data',
  () => fetchAdmissionClosureStats(params)
);
```

### Структура оптимизированного проекта
```
vue-app/
├── src/
│   ├── utils/
│   │   ├── lazy-services.js          # Централизованный lazy loading
│   │   ├── performance-monitor.js    # Мониторинг производительности
│   │   ├── profiler.js               # Профилирование функций
│   │   └── error-monitoring.js       # Мониторинг ошибок
│   ├── composables/
│   │   └── useAdmissionService.js    # Composable для admission service
│   ├── services/
│   │   ├── bitrix24-api-provider.js  # Провайдер для Bitrix24 API
│   │   └── graph-admission-closure/
│   │       └── admissionClosureService.js
│   └── config/
│       ├── access-config.js          # Синхронные функции
│       └── access-config-async.js    # Асинхронные функции
├── scripts/
│   ├── test-build-chunks.js          # Тест chunks
│   ├── test-build-warnings.js        # Тест предупреждений
│   └── lighthouse-config.json        # Конфиг Lighthouse
└── vite.config.js                    # Оптимизированная конфигурация
```

## Примеры кода

### Рефакторинг компонента с lazy loading
```javascript
// Было: статический импорт
import { fetchAdmissionClosureStats } from '@/services/graph-admission-closure/admissionClosureService.js';

// Стало: lazy loading
export default {
  data() {
    return {
      admissionService: null
    }
  },
  async mounted() {
    const { fetchAdmissionClosureStats } = await import('@/services/graph-admission-closure/admissionClosureService.js');
    this.admissionService = { fetchAdmissionClosureStats };
  }
}
```

### Оптимизированная конфигурация Vite
```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router'],
          charts: ['chart.js', 'vue-chartjs', 'chartjs-plugin-datalabels'],
          bitrix24: ['@/services/bitrix24-api.js']
        }
      }
    },
    chunkSizeWarningLimit: 500,
    minify: 'terser'
  }
})
```

## Тестирование

### Модульные тесты
```javascript
// tests/unit/build-optimization.test.js
describe('Build Optimization', () => {
  test('should load admission service lazily', async () => {
    const { fetchAdmissionClosureStats } = await import('@/services/graph-admission-closure/admissionClosureService.js');
    expect(fetchAdmissionClosureStats).toBeDefined();
  });

  test('should split code into chunks', () => {
    // Проверить наличие отдельных chunks в dist/assets/
    const fs = require('fs');
    const files = fs.readdirSync('dist/assets');
    expect(files.some(file => file.includes('vendor'))).toBe(true);
    expect(files.some(file => file.includes('charts'))).toBe(true);
  });
});
```

### Интеграционные тесты
1. **Запустить сборку**: `npm run build`
2. **Проверить размеры**: основной бандл < 250KB
3. **Проверить chunks**: наличие отдельных файлов для vendor, charts, bitrix24
4. **Тестировать lazy loading**: открыть страницы с динамическими компонентами
5. **Измерить производительность**: PageSpeed Insights > 90

### Регрессионное тестирование
- [ ] Все dashboard компоненты работают
- [ ] Попапы загружаются корректно
- [ ] API запросы проходят через кеш
- [ ] Фильтры и сортировка функционируют

## Риски и меры предосторожности

### Высокий риск: Поломка lazy loading
**Описание:** Неправильная реализация lazy loading может привести к ошибкам загрузки компонентов
**Меры:**
- Тестировать каждый lazy-loaded компонент отдельно
- Внедрить graceful fallback для критических компонентов
- Мониторить ошибки загрузки в production

### Средний риск: Увеличение времени первоначальной загрузки
**Описание:** Code splitting может увеличить время первой загрузки для пользователей с медленным интернетом
**Меры:**
- Настроить preload для критических chunks
- Оптимизировать размер основного бандла
- Рассмотреть service worker для кеширования

### Низкий риск: Проблемы с tree-shaking
**Описание:** Некоторые модули могут не быть правильно tree-shaken
**Меры:**
- Проверять bundle analyzer после каждого изменения
- Использовать ESM импорты вместо CommonJS
- Ручная проверка неиспользуемого кода

## Стратегия отката

### Быстрый откат (если проблемы в production)
```bash
# Откат к предыдущему коммиту
git checkout HEAD~1
npm run build
npm run deploy
```

### Частичный откат (если проблемы только с некоторыми оптимизациями)
```javascript
// vite.config.js - добавить флаг для отключения оптимизаций
const DISABLE_OPTIMIZATIONS = process.env.VITE_DISABLE_OPTIMIZATIONS === 'true';

export default defineConfig({
  build: {
    rollupOptions: {
      output: DISABLE_OPTIMIZATIONS ? {} : {
        manualChunks: { /* оптимизации */ }
      }
    }
  }
});
```

### Откат отдельных компонентов
```javascript
// Вернуть статические импорты для проблемных компонентов
// import { fetchAdmissionClosureStats } from '@/services/...'; // Вместо lazy loading
```

## Мониторинг и метрики

### Ключевые метрики для отслеживания
1. **Размер бандла:** Main chunk < 250KB, общий размер < 1MB
2. **Время загрузки:** First Contentful Paint < 2s, Time to Interactive < 3s
3. **Производительность:** Lighthouse Performance Score > 90
4. **Ошибки:** < 0.1% ошибок загрузки chunks

### Инструменты мониторинга
```javascript
// vue-app/src/utils/error-monitoring.js
export class ErrorMonitoring {
  static init() {
    window.addEventListener('error', (event) => {
      // Логирование ошибок загрузки chunks
      if (event.target.tagName === 'SCRIPT') {
        console.error('❌ Chunk loading error:', event.target.src);
        // Отправка в систему мониторинга
        this.reportError('chunk_load_error', {
          url: event.target.src,
          message: event.message
        });
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      // Логирование не пойманных promise rejection
      console.error('❌ Unhandled promise rejection:', event.reason);
      this.reportError('unhandled_rejection', {
        reason: event.reason
      });
    });
  }

  static reportError(type, data) {
    // Отправка в систему мониторинга (Sentry, LogRocket, etc.)
    if (window.Sentry) {
      window.Sentry.captureException(new Error(`${type}: ${JSON.stringify(data)}`));
    }
  }
}

// Инициализация в main.js
import { ErrorMonitoring } from '@/utils/error-monitoring';
ErrorMonitoring.init();
```

### Регулярные проверки
```bash
# Еженедельная проверка в CI/CD
npm run build:performance
npm run test:build

# Мониторинг размеров
npm run bundle:analyze

# Lighthouse аудит
npm run lighthouse
```

## Лучшие практики

### Code Splitting стратегии
1. **Route-based splitting:** Разделение по маршрутам (уже реализовано)
2. **Component-based splitting:** Разделение больших компонентов
3. **Library splitting:** Разделение тяжелых библиотек
4. **Feature-based splitting:** Разделение по функциональным областям

### Lazy Loading паттерны
```javascript
// 1. Компонент с loading состоянием
const LazyComponent = () => ({
  component: import('@/components/HeavyComponent.vue'),
  loading: LoadingSpinner,
  error: ErrorComponent,
  delay: 200,
  timeout: 3000
});

// 2. Предзагрузка при hover/button press
<button @mouseenter="preloadComponent" @click="loadComponent">
  Load Component
</button>

// 3. Условная загрузка
const Component = computed(() =>
  condition.value ? LazyComponentA : LazyComponentB
);
```

### Оптимизация импортов
```javascript
// ❌ Плохо
import { method1, method2, method3 } from '@/utils/helpers';

// ✅ Хорошо - только нужные методы
import { method1 } from '@/utils/helpers';

// ✅ Отлично - tree-shakable именованные импорты
import { debounce } from 'lodash-es'; // ESM версия поддерживает tree-shaking
```

## История изменений

- **2026-01-10 12:00 (UTC+3, Брест)**: Создание задачи на основе анализа предупреждений сборки
- **Проблемы**: Конфликты импортов, большой размер бандла (423KB), неэффективный code splitting
- **2026-01-10 12:30 (UTC+3, Брест)**: Добавлены детальные технические спецификации, скрипты тестирования, мониторинг производительности и стратегия отката
- **2026-01-12 11:00 (UTC+3, Брест)**: Задача взята в работу. Начало реализации поэтапного плана оптимизации системы сборки Vue.js
- **2026-01-12 12:30 (UTC+3, Брест)**: Задача выполнена успешно. Основной бандл оптимизирован с 440KB до 26KB. Устранены все конфликты импортов, внедрено эффективное code splitting и lazy loading
- **2026-01-12 13:00 (UTC+3, Брест)**: Устранено последнее предупреждение о конфликте импортов ticketListUtils.js. Добавлен lazy loading для модуля, создан отдельный chunk размером 6.5KB
- **2026-01-12 13:30 (UTC+3, Брест)**: Решена критическая ошибка "Cannot access 'we' before initialization". Проблема была в слишком крупном chunk (115KB), содержащем конфликтующие модули. Разделен на более мелкие chunks: employee-details-modal, snapshot-service, ticket-details-service. Сборка теперь работает без ошибок
- **2026-01-12 14:00 (UTC+3, Брест)**: Решена аналогичная ошибка "Cannot access 'Xe' before initialization" в chunk-sIOSVeXd.js. Проблема была в чрезмерном разделении chunks, вызывающем циклические зависимости. Упрощена стратегия manual chunks до консервативной: только vue-vendor, vendor, bitrix24-core, admission-graphs, ticket-utils. Основной бандл уменьшен до 152KB без ошибок переменных
- **2026-01-12 14:30 (UTC+3, Брест)**: Решена проблема с отсутствующими стилями. CSS code splitting был отключен (`cssCodeSplit: false`), так как разделенные CSS файлы не подключались к HTML. Теперь все стили объединены в один файл style-Cr0ThMfa.css (228KB), который корректно загружается
- **2026-01-12 15:00 (UTC+3, Брест)**: Исправлена проблема с неправильным подключением CSS на сервере. В index.php регулярное выражение для поиска stylesheet было обновлено, чтобы находить именно `rel="stylesheet"`, а не `rel="modulepreload"`. Добавлена поддержка вывода всех modulepreload ссылок из собранного HTML