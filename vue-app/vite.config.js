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
        // Продвинутый manual chunks для оптимизации загрузки
        manualChunks(id) {
          // Vendor chunk - основные зависимости
          if (id.includes('node_modules')) {
            // Vue ecosystem - отдельный chunk
            if (id.includes('vue') || id.includes('vue-router')) {
              return 'vue-vendor';
            }
            // Charts - отдельный chunk для тяжелых библиотек
            if (id.includes('chart.js') || id.includes('chartjs')) {
              return 'charts-vendor';
            }
            // Другие vendor
            return 'vendor';
          }

          // Application chunks - разделение по функциональности
          if (id.includes('src/services/bitrix24-api') || id.includes('bitrix24-api-provider')) {
            return 'bitrix24-core';
          }
          if (id.includes('src/services/graph-admission-closure') || id.includes('admissionClosureService')) {
            return 'admission-graphs';
          }
          if (id.includes('src/utils/graph-state/ticketListUtils')) {
            return 'ticket-utils';
          }
          if (id.includes('src/services/graph-state')) {
            return 'graph-state-core';
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
          if (id.includes('src/utils/lazy-services') || id.includes('src/composables')) {
            return 'lazy-loading';
          }
          if (id.includes('src/config') && id.includes('async')) {
            return 'config-async';
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
      }
    },

    // Оптимизации
    chunkSizeWarningLimit: 500, // Предупреждение при > 500KB
    cssCodeSplit: true, // Разделение CSS
    reportCompressedSize: true, // Показывать сжатые размеры

    // Esbuild оптимизации через конфигурацию
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
      minifyIdentifiers: mode === 'production',
      minifySyntax: mode === 'production',
      minifyWhitespace: mode === 'production'
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

