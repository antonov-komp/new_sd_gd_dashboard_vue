<template>
  <div class="install-page">
    <div class="container">
      <h1>Установка Bitrix24 приложения</h1>

      <StatusMessage
        v-if="installStatus"
        :type="installStatus.type"
        :title="installStatus.title"
        :message="installStatus.message"
      />

      <div v-if="installInfo" class="info">
        <h3>Информация об установке:</h3>
        <pre>{{ JSON.stringify(installInfo, null, 2) }}</pre>
      </div>

      <LoadingSpinner v-if="loading" message="Обработка установки..." />
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import StatusMessage from './common/StatusMessage.vue';
import LoadingSpinner from './common/LoadingSpinner.vue';
import { Bitrix24BxApi } from '@/services/bitrix24-bx-api.js';

export default {
  name: 'InstallPage',
  components: {
    StatusMessage,
    LoadingSpinner
  },
  setup() {
    const loading = ref(true);
    const installStatus = ref(null);
    const installInfo = ref(null);

    onMounted(async () => {
      try {
        // Получаем результат установки из window.INSTALL_RESULT (переданный из PHP)
        let result = null;
        
        if (window.INSTALL_RESULT) {
          result = window.INSTALL_RESULT;
        } else {
          // Fallback: пытаемся получить через API
          const response = await fetch('/install.php?get_result=1');
          if (response.ok) {
            result = await response.json();
          }
        }
        
        if (!result) {
          throw new Error('Не удалось получить результат установки');
        }
        
        installInfo.value = result;

        if (result.rest_only === false) {
          if (result.install === true) {
            installStatus.value = {
              type: 'success',
              title: '✓ Установка завершена успешно!',
              message: 'Приложение успешно установлено в Bitrix24.'
            };

            // Завершаем установку через BX24 API
            try {
              await Bitrix24BxApi.init(() => {
                Bitrix24BxApi.installFinish();
              });
            } catch (error) {
              console.error('Error finishing installation:', error);
              // Не критично, установка уже выполнена
            }
          } else {
            installStatus.value = {
              type: 'error',
              title: '✗ Ошибка установки',
              message: 'Не удалось установить приложение. Проверьте настройки.'
            };
          }
        } else {
          installStatus.value = {
            type: 'info',
            title: 'REST-only режим',
            message: 'Это приложение работает только через REST API, без пользовательского интерфейса.'
          };
        }
      } catch (error) {
        console.error('Error loading install result:', error);
        installStatus.value = {
          type: 'error',
          title: 'Ошибка загрузки',
          message: error.message || 'Не удалось загрузить информацию об установке.'
        };
      } finally {
        loading.value = false;
      }
    });

    return {
      loading,
      installStatus,
      installInfo
    };
  }
};
</script>

<style scoped>
.install-page {
  min-height: 100vh;
  padding: 40px 20px;
  background: #f5f5f5;
}

.container {
  background: white;
  padding: 30px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  margin: 0 auto;
}

h1 {
  color: #333;
  margin-top: 0;
  margin-bottom: 20px;
}

.info {
  margin-top: 20px;
}

.info h3 {
  color: #666;
  font-size: 16px;
  margin-bottom: 10px;
}

pre {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5;
}
</style>

