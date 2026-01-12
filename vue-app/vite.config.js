import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => ({
  base: './', // Относительный путь для работы с любым базовым путем
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    target: 'es2020', // Современные браузеры для лучшего tree-shaking
    minify: 'esbuild', // Используем esbuild для минификации
    sourcemap: mode === 'development', // Sourcemaps только в dev
    outDir: '../dist',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url))
      },

      output: {
        // Оптимизированные manual chunks для фасадов и компонентов TASK-088-02
        manualChunks(id) {
          // Vendor chunk - основные зависимости
          if (id.includes('node_modules')) {
            // Vue ecosystem - отдельный chunk
            if (id.includes('vue') || id.includes('vue-router')) {
              return 'vue-vendor';
            }
            // Другие vendor
            return 'vendor';
          }

          // Фасады - отдельные chunks для lazy loading (TASK-088-02)
          if (id.includes('src/services/facades/ActivityBitrix24Facade.js')) {
            return 'facades-activity';
          }
          if (id.includes('src/services/facades/DashboardBitrix24Facade.js')) {
            return 'facades-dashboard';
          }
          if (id.includes('src/services/facades/UserManagementFacade.js')) {
            return 'facades-user-mgmt';
          }
          if (id.includes('src/services/facades/CoreBitrix24Facade.js')) {
            return 'facades-core';
          }

          // Компоненты TASK-088-01 - отдельные chunks
          if (id.includes('src/components/ActivityDashboard.vue')) {
            return 'activity-dashboard';
          }
          if (id.includes('src/components/UserProfileAnalysis.vue')) {
            return 'user-profile-analysis';
          }
          if (id.includes('src/components/AdvancedFilters.vue')) {
            return 'advanced-filters';
          }

          // Application chunks - основные сервисы
          if (id.includes('src/services/bitrix24-api') || id.includes('bitrix24-api-provider')) {
            return 'bitrix24-core';
          }
          if (id.includes('src/services/graph-admission-closure') || id.includes('admissionClosureService')) {
            return 'admission-graphs';
          }
          if (id.includes('src/utils/graph-state/ticketListUtils')) {
            return 'ticket-utils';
          }
          // Избегаем проблемных разделений graph-state компонентов
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
      }
    },

    // Оптимизации
    chunkSizeWarningLimit: 500, // Предупреждение при > 500KB
    cssCodeSplit: false, // Отключаем разделение CSS для корректной загрузки
    reportCompressedSize: true, // Показывать сжатые размеры

    // Esbuild оптимизации - сбалансированные настройки
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
      minifyIdentifiers: true, // Минификация идентификаторов в production
      minifySyntax: true, // Минификация синтаксиса
      minifyWhitespace: true, // Минификация пробелов
      target: 'es2020'
    },

    // CSS оптимизации
    cssMinify: 'esbuild'
  },

  // Оптимизации для dev сервера
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost',
        changeOrigin: true
      }
    },
    fs: {
      strict: true
    }
  },

  // Dependencies pre-bundling - исключаем динамически загружаемые модули
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'chart.js',
      'chartjs-plugin-datalabels'
    ],
    exclude: [
      // Исключаем из pre-bundling наши динамические модули
      '@/services/bitrix24-api.js',
      '@/services/graph-admission-closure/admissionClosureService.js',
      '@/config/access-config-async.js'
    ]
  }
}));

