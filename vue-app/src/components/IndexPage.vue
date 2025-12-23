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
          <a :href="installPageUrl">Установить приложение</a>
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
          <div class="greeting-header">
            <div class="greeting-header-content">
              <h2 class="greeting-title">Страница Аналитики ИТ отдела для Планерки Генеральной дирекции</h2>
              <p class="greeting-text">
                Добро пожаловать, <strong>{{ userName }}</strong>!
              </p>
            </div>
            <!-- Кнопка администратора (только для администраторов) -->
            <button
              v-if="isAdmin"
              class="admin-button-header"
              @click="openAdminPopup"
              title="Администрирование"
            >
              ⚙️
            </button>
          </div>
        </div>

        <!-- Секция с кнопками отчётов -->
        <div class="reports-section">
          <div class="reports-grid">
            <div
              v-for="report in reportsButtons"
              :key="report.id"
              class="report-button"
              @click="navigateToReport(report.route)"
            >
              <div class="report-icon">{{ report.icon }}</div>
              <div class="report-title">{{ report.title }}</div>
              <div v-if="report.description" class="report-description">
                {{ report.description }}
              </div>
            </div>
          </div>
        </div>

        <!-- Попап администраторских интерфейсов -->
        <div
          v-if="showAdminPopup && isAdmin"
          class="admin-popup-overlay"
          @click="closeAdminPopup"
        >
          <div class="admin-popup" @click.stop>
            <div class="admin-popup-header">
              <h3 class="admin-popup-title">⚙️ Администрирование</h3>
              <button class="admin-popup-close" @click="closeAdminPopup">
                ✕
              </button>
            </div>
            <div class="admin-popup-content">
              <div class="admin-buttons-grid">
                <div
                  v-for="adminBtn in adminButtons"
                  :key="adminBtn.id"
                  class="admin-interface-button"
                  @click="navigateToAdmin(adminBtn.route)"
                >
                  <div class="admin-icon">{{ adminBtn.icon }}</div>
                  <div class="admin-title">{{ adminBtn.title }}</div>
                  <div v-if="adminBtn.description" class="admin-description">
                    {{ adminBtn.description }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import StatusMessage from './common/StatusMessage.vue';
import LoadingSpinner from './common/LoadingSpinner.vue';
import { AccessControlService, AccessErrorCodes } from '@/services/access-control-service.js';
import { getReports } from '@/config/reports-config.js';
import { isAdmin } from '@/config/access-config.js';
import { getAdminInterfaces } from '@/config/admin-config.js';
import { getPageUrl } from '@/utils/path-utils.js';

export default {
  name: 'IndexPage',
  components: {
    StatusMessage,
    LoadingSpinner
  },
  setup() {
    const router = useRouter();
    const loading = ref(true);
    const error = ref(null);
    const accessAllowed = ref(false);
    const accessDenied = ref(false);
    const accessErrorMessage = ref('');
    const currentUser = ref(null);
    const debugInfo = ref(null);
    
    // Кнопки отчётов
    const reportsButtons = ref(getReports());
    
    // State для администраторских интерфейсов
    const showAdminPopup = ref(false);
    const adminButtons = ref(getAdminInterfaces());

    // Computed для проверки администратора
    const isAdminComputed = computed(() => {
      if (!currentUser.value) {
        return false;
      }
      
      return isAdmin(currentUser.value);
    });

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

    // URL для страницы установки
    const installPageUrl = computed(() => {
      return getPageUrl('/install.php');
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

    /**
     * Навигация к отчёту
     * 
     * @param {string} route - Маршрут отчёта
     */
    const navigateToReport = (route) => {
      if (!route) {
        console.error('Route is not defined for report');
        return;
      }
      
      router.push(route);
    };
    
    /**
     * Открытие попапа администратора
     */
    const openAdminPopup = () => {
      showAdminPopup.value = true;
    };
    
    /**
     * Закрытие попапа администратора
     */
    const closeAdminPopup = () => {
      showAdminPopup.value = false;
    };
    
    /**
     * Навигация к администраторскому интерфейсу
     * 
     * @param {string} route - Маршрут администраторского интерфейса
     */
    const navigateToAdmin = (route) => {
      if (!route) {
        console.error('Route is not defined for admin interface');
        return;
      }
      
      router.push(route);
      closeAdminPopup(); // Закрываем попап после навигации
    };

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
      showInstallLink,
      installPageUrl,
      reportsButtons,
      navigateToReport,
      isAdmin: isAdminComputed,
      showAdminPopup,
      adminButtons,
      openAdminPopup,
      closeAdminPopup,
      navigateToAdmin
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

.greeting-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.greeting-header-content {
  flex: 1;
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

/* Кнопка администратора в заголовке */
.admin-button-header {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 4px;
  background: #6c757d;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 20px;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.admin-button-header:hover {
  background: #5a6268;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.admin-button-header:active {
  transform: translateY(0);
}

.analytics-content {
  margin-top: 30px;
}

/* Секция с кнопками отчётов */
.reports-section {
  margin-top: 30px;
}

.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.report-button {
  padding: 20px;
  border-radius: 8px;
  background: white;
  border: 1px solid #ddd;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.report-button:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  border-color: #2196F3;
}

.report-icon {
  font-size: 32px;
  margin-bottom: 10px;
}

.report-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.report-description {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
}

/* Адаптивность для планшетов */
@media (max-width: 1024px) {
  .reports-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
  }
  
  .report-button {
    padding: 15px;
  }
  
  .report-icon {
    font-size: 28px;
  }
}

/* Адаптивность для мобильных */
@media (max-width: 768px) {
  .reports-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .report-button {
    padding: 15px;
  }
  
  .report-icon {
    font-size: 24px;
  }
  
  .report-title {
    font-size: 14px;
  }
  
  .report-description {
    font-size: 12px;
  }
}

/* Адаптивность для заголовка с кнопкой администратора */
@media (max-width: 768px) {
  .greeting-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .admin-button-header {
    align-self: flex-end;
  }
}

/* Попап администратора */
.admin-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.admin-popup {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.admin-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ddd;
}

.admin-popup-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.admin-popup-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.admin-popup-close:hover {
  background: #f5f5f5;
  color: #333;
}

.admin-buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.admin-interface-button {
  padding: 20px;
  border-radius: 8px;
  background: white;
  border: 1px solid #ddd;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.admin-interface-button:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  border-color: #6c757d;
}

.admin-icon {
  font-size: 32px;
  margin-bottom: 10px;
}

.admin-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.admin-description {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
}

/* Адаптивность для попапа */
@media (max-width: 768px) {
  .admin-popup {
    width: 95%;
    padding: 20px;
    max-height: 90vh;
  }
  
  .admin-buttons-grid {
    grid-template-columns: 1fr;
  }
  
  .admin-interface-button {
    padding: 15px;
  }
  
  .admin-icon {
    font-size: 24px;
  }
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
