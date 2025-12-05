<template>
  <div class="index-page">
    <div class="container">
      <h1>Bitrix24 REST Application</h1>

      <StatusMessage
        v-if="error"
        type="error"
        :title="errorTitle"
        :message="errorMessage"
      >
        <div v-if="showInstallLink" class="install-link">
          <a href="/install.php">Установить приложение</a>
        </div>
      </StatusMessage>

      <LoadingSpinner v-if="loading" message="Загрузка данных..." />

      <div v-if="profile && !error" class="info">
        <strong>Приложение успешно подключено!</strong>
      </div>

      <div v-if="profile" class="profile-info">
        <h2>Профиль приложения (админ):</h2>
        <pre>{{ JSON.stringify(profile, null, 2) }}</pre>
      </div>

      <div v-if="currentUser" class="user-info">
        <h2>Текущий пользователь (кто открыл приложение):</h2>
        <pre>{{ JSON.stringify(currentUser, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import StatusMessage from './common/StatusMessage.vue';
import LoadingSpinner from './common/LoadingSpinner.vue';
import { Bitrix24ApiService } from '@/services/bitrix24-api.js';
import { Bitrix24BxApi } from '@/services/bitrix24-bx-api.js';

export default {
  name: 'IndexPage',
  components: {
    StatusMessage,
    LoadingSpinner
  },
  setup() {
    const loading = ref(true);
    const error = ref(null);
    const profile = ref(null);
    const currentUser = ref(null);

    const errorTitle = computed(() => {
      if (!error.value) return null;
      if (error.value.includes('no_install_app')) {
        return 'Приложение не установлено';
      }
      return 'Ошибка API';
    });

    const errorMessage = computed(() => {
      if (!error.value) return null;
      if (error.value.includes('no_install_app')) {
        return 'Приложение не установлено в Bitrix24. Необходимо выполнить установку.';
      }
      return error.value;
    });

    const showInstallLink = computed(() => {
      return error.value && error.value.includes('no_install_app');
    });

    onMounted(async () => {
      try {
        // Загружаем профиль приложения
        profile.value = await Bitrix24ApiService.getProfile();
      } catch (err) {
        error.value = err.message;
        console.error('Error loading profile:', err);
      } finally {
        loading.value = false;
      }

      // Загружаем информацию о текущем пользователе через BX24 API
      try {
        await Bitrix24BxApi.init(async () => {
          try {
            currentUser.value = await Bitrix24BxApi.getCurrentUser();
          } catch (err) {
            console.error('Error getting current user:', err);
            // Не критично, продолжаем работу
          }
        });
      } catch (err) {
        console.error('Error initializing Bitrix24 API:', err);
        // Не критично, продолжаем работу
      }
    });

    return {
      loading,
      error,
      profile,
      currentUser,
      errorTitle,
      errorMessage,
      showInstallLink
    };
  }
};
</script>

<style scoped>
.index-page {
  min-height: 100vh;
  padding: 20px;
  background: #f5f5f5;
}

.container {
  background: white;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  color: #333;
  margin-top: 0;
  margin-bottom: 20px;
}

.info {
  background: #e7f3ff;
  padding: 15px;
  border-left: 4px solid #2196F3;
  margin: 20px 0;
}

.info strong {
  color: #1565c0;
}

.profile-info,
.user-info {
  margin-top: 30px;
}

.profile-info h2,
.user-info h2 {
  color: #666;
  font-size: 18px;
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

.install-link {
  margin-top: 15px;
}

.install-link a {
  display: inline-block;
  padding: 10px 20px;
  background: #2196f3;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: background 0.3s;
}

.install-link a:hover {
  background: #1976d2;
}
</style>

