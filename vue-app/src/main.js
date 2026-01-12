import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './styles/bitrix24-ui-variables.css';
import './styles/main.css';
import './styles/sectors.css';
// Импорт конфигурации Chart.js для глобальной регистрации
import '@/utils/chart-config.js';
import { getApiUrl } from '@/utils/path-utils.js';
import { ErrorMonitoring } from '@/utils/error-monitoring.js';

const app = createApp(App);

app.use(router);

// Безопасная сериализация для логирования
const safeStringifyForLog = (obj) => {
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      if (typeof value === 'function' || value === undefined) {
        return null;
      }
      return value;
    });
  } catch (e) {
    return String(obj);
  }
};

// Глобальная обработка ошибок
app.config.errorHandler = (err, instance, info) => {
  // Специальная обработка ошибок доступа к undefined.type
  if (err instanceof TypeError && err.message.includes("Cannot read properties of undefined (reading 'type')")) {
    console.warn('Caught undefined.type error:', {
      error: err.message,
      component: instance?.$options?.name || 'Unknown',
      info,
      stack: err.stack
    });

    // Не логируем эти ошибки в Bitrix24, так как они обрабатываются на уровне компонентов
    return;
  }

  console.error('Vue error:', err, info);

  // Логирование в Bitrix24 (если доступно)
  if (typeof BX !== 'undefined' && BX.ajax) {
    try {
      BX.ajax({
        url: getApiUrl('/api/log-error.php'),
        method: 'POST',
        data: {
          error: err?.message || String(err),
          info: typeof info === 'string' ? info : safeStringifyForLog(info),
          component: instance?.$options?.name || 'Unknown'
        }
      });
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  }
};

app.mount('#app');

// Инициализация мониторинга ошибок и производительности
ErrorMonitoring.init();




