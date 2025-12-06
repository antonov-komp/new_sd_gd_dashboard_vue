<template>
  <div class="index-page">
    <div class="container">
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

      <LoadingSpinner v-if="loading" message="Проверка доступа..." />

      <!-- Блокировка доступа -->
      <StatusMessage
        v-if="!loading && accessDenied"
        type="error"
        title="Доступ запрещён"
        :message="accessErrorMessage"
      >
        <!-- Временная отладочная информация для определения ID отдела -->
        <div v-if="debugInfo" class="debug-info" style="margin-top: 15px; padding: 10px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; font-size: 12px;">
          <strong>Отладочная информация:</strong><br>
          ID пользователя: {{ debugInfo.userId }}<br>
          ID отделов пользователя: {{ debugInfo.departmentIds }}<br>
          Разрешённые ID отделов: {{ debugInfo.allowedIds }}<br>
          <small style="color: #856404;">Добавьте ID отдела в файл vue-app/src/config/access-config.js</small>
        </div>
      </StatusMessage>

      <!-- Основной контент с приветствием -->
      <div v-if="!loading && !accessDenied && accessAllowed" class="main-content">
        <!-- Приветствие -->
        <div class="greeting-section">
          <h2 class="greeting-title">Страница Аналитики ИТ отдела для Планерки Генеральной дирекции</h2>
          <p class="greeting-text">
            Добро пожаловать, <strong>{{ userName }}</strong>!
          </p>
        </div>

        <!-- Здесь будет основной контент приложения -->
        <div class="analytics-content">
          <!-- Контент будет добавлен в следующих задачах -->
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import StatusMessage from './common/StatusMessage.vue';
import LoadingSpinner from './common/LoadingSpinner.vue';
import { AccessControlService, AccessErrorCodes } from '@/services/access-control-service.js';

export default {
  name: 'IndexPage',
  components: {
    StatusMessage,
    LoadingSpinner
  },
  setup() {
    const loading = ref(true);
    const error = ref(null);
    const accessAllowed = ref(false);
    const accessDenied = ref(false);
    const accessErrorMessage = ref('');
    const currentUser = ref(null);
    const debugInfo = ref(null);

    // Вычисляемое свойство для имени пользователя (Имя и Фамилия)
    const userName = computed(() => {
      if (!currentUser.value) {
        return 'Пользователь';
      }
      
      const firstName = currentUser.value.FIRST_NAME ? currentUser.value.FIRST_NAME.trim() : '';
      const lastName = currentUser.value.LAST_NAME ? currentUser.value.LAST_NAME.trim() : '';
      const name = currentUser.value.NAME ? currentUser.value.NAME.trim() : '';
      
      // Приоритет 1: FIRST_NAME + LAST_NAME (если оба заполнены)
      if (firstName && lastName) {
        return `${firstName} ${lastName}`;
      }
      
      // Приоритет 2: NAME + LAST_NAME (если NAME содержит имя, а LAST_NAME - фамилию)
      // Это основной случай для Bitrix24, где NAME = имя, LAST_NAME = фамилия
      if (name && lastName && name !== lastName) {
        return `${name} ${lastName}`;
      }
      
      // Приоритет 3: FIRST_NAME + NAME (если FIRST_NAME = имя, NAME = фамилия)
      if (firstName && name && firstName !== name) {
        return `${firstName} ${name}`;
      }
      
      // Приоритет 4: NAME (если содержит полное имя с пробелом)
      if (name && name.includes(' ')) {
        return name;
      }
      
      // Приоритет 5: Если есть только FIRST_NAME
      if (firstName) {
        return firstName;
      }
      
      // Приоритет 6: Если есть только LAST_NAME
      if (lastName) {
        return lastName;
      }
      
      // Приоритет 7: Если есть только NAME
      if (name) {
        return name;
      }
      
      // Если ничего не найдено, используем ID
      return `Пользователь #${currentUser.value.ID}`;
    });

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
        // Проверка доступа
        const accessResult = await AccessControlService.checkAccess();
        
        if (accessResult.allowed) {
          // Доступ разрешён
          accessAllowed.value = true;
          currentUser.value = accessResult.user;
        } else {
          // Доступ запрещён
          accessDenied.value = true;
          
          // Сохраняем информацию о пользователе для отладки
          if (accessResult.user) {
            const { getAllowedDepartmentIds } = await import('@/config/access-config.js');
            debugInfo.value = {
              userId: accessResult.user.ID,
              departmentIds: accessResult.user.UF_DEPARTMENT || [],
              allowedIds: getAllowedDepartmentIds()
            };
          }
          
          // Определяем сообщение об ошибке
          if (accessResult.errorCode === AccessErrorCodes.USER_NOT_DETERMINED) {
            accessErrorMessage.value = 'Не удалось определить пользователя. Обратитесь в Поддержку приложения в ИТ отдел.';
          } else if (accessResult.errorCode === AccessErrorCodes.ACCESS_DENIED) {
            accessErrorMessage.value = 'Доступ запрещён';
          } else {
            accessErrorMessage.value = accessResult.errorMessage || 'Ошибка при проверке доступа. Обратитесь в Поддержку приложения в ИТ отдел.';
          }
        }
      } catch (err) {
        error.value = err.message;
        console.error('Error checking access:', err);
      } finally {
        loading.value = false;
      }
    });

    return {
      loading,
      error,
      accessAllowed,
      accessDenied,
      accessErrorMessage,
      currentUser,
      userName,
      debugInfo,
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

.greeting-section {
  background: #e7f3ff;
  padding: 20px;
  border-left: 4px solid #2196F3;
  margin: 20px 0;
  border-radius: 4px;
}

.greeting-title {
  color: #1565c0;
  font-size: 24px;
  margin: 0 0 10px 0;
  font-weight: 600;
}

.greeting-text {
  color: #333;
  font-size: 16px;
  margin: 0;
}

.greeting-text strong {
  color: #1565c0;
  font-weight: 600;
}

.analytics-content {
  margin-top: 30px;
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
