import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './styles/main.css';

const app = createApp(App);

app.use(router);

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
          error: err.message,
          info: info,
          component: instance?.$options?.name || 'Unknown'
        }
      });
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  }
};

app.mount('#app');

