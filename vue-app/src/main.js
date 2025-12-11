import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './styles/bitrix24-ui-variables.css';
import './styles/main.css';
// Импорт конфигурации Chart.js для глобальной регистрации
import '@/utils/chart-config.js';

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
  console.error('Vue error:', err, info);

  // Логирование в Bitrix24 (если доступно)
  if (typeof BX !== 'undefined' && BX.ajax) {
    try {
      BX.ajax({
        url: '/api/log-error.php',
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




