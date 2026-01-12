<template>
  <div class="users-management-page">
    <!-- ВРЕМЕННЫЙ FALLBACK: Показываем простой интерфейс для диагностики -->
    <div v-if="showFallback" class="fallback-interface">
      <div class="fallback-header">
        <h1>🚧 Управление пользователями</h1>
        <p>Интерфейс находится в разработке</p>
      </div>

      <div class="fallback-content">
        <div class="status-card">
          <h3>📋 Статус TASK-089</h3>
          <ul>
            <li>✅ Старый интерфейс удален</li>
            <li>✅ Новый интерфейс создан</li>
            <li>⚠️ Идет диагностика проблем</li>
            <li>🔄 Попыток загрузки: {{ loadAttempts }}</li>
          </ul>
        </div>

        <div class="debug-info">
          <h3>🔍 Отладочная информация</h3>
          <p>Если вы видите этот экран, значит новый интерфейс не загрузился.</p>
          <p>Возможные причины:</p>
          <ul>
            <li>• Ошибка JavaScript в компонентах</li>
            <li>• Проблемы с импортами</li>
            <li>• Ошибки в setup функциях</li>
            <li>• Проблемы с зависимостями</li>
          </ul>
          <div class="debug-actions">
            <button @click="retryLoad" class="retry-btn">
              🔄 Попробовать загрузить новый интерфейс
            </button>
            <button @click="showErrorDetails" class="debug-btn">
              🐛 {{ showErrorDetailsFlag ? 'Скрыть' : 'Показать' }} детали ошибки
            </button>

            <!-- Детали ошибки -->
            <div v-if="showErrorDetailsFlag && lastError" class="error-details">
              <h4>📄 Детали ошибки:</h4>
              <pre class="error-stack">{{ lastError.stack || lastError.message }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- НОВЫЙ ЕДИНЫЙ ИНТЕРФЕЙС (показывается только после успешной загрузки) -->
    <!--
    <UnifiedUserManagement
      v-else
      :config="{
        enablePersistence: true,
        enableKeyboardShortcuts: true,
        defaultView: 'global'
      }"
    />
    -->
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
// import UnifiedUserManagement from '@/components/users/management/UnifiedUserManagement.vue';
import { AccessControlService } from '@/services/access-control-service.js';

export default {
  name: 'UsersManagementPage',
  // components: {
  //   UnifiedUserManagement
  // },
  setup() {
    const router = useRouter();
    const showFallback = ref(true);
    const loadAttempts = ref(0);
    const showErrorDetailsFlag = ref(false);
    const lastError = ref(null);

    /**
     * Попытка загрузки нового интерфейса
     */
    const retryLoad = async () => {
      loadAttempts.value++;
      console.log(`[UsersManagementPage] Retry attempt ${loadAttempts.value}`);

      try {
        // Импортируем динамически, чтобы увидеть ошибки
        const { default: UnifiedUserManagement } = await import('@/components/users/management/UnifiedUserManagement.vue');

        // Если импорт прошел успешно, скрываем fallback
        showFallback.value = false;
        lastError.value = null;

        console.log('[UsersManagementPage] UnifiedUserManagement imported successfully');

      } catch (error) {
        console.error('[UsersManagementPage] Failed to import UnifiedUserManagement:', error);
        lastError.value = error;
        showFallback.value = true;
      }
    };

    /**
     * Показать детали последней ошибки
     */
    const showErrorDetails = () => {
      showErrorDetailsFlag.value = !showErrorDetailsFlag.value;
    };

    /**
     * Проверка доступа администратора
     */
    onMounted(async () => {
      try {
        const accessResult = await AccessControlService.checkAccess();
        if (!accessResult.allowed) {
          router.push('/');
          return;
        }

        const currentUser = await AccessControlService.getCurrentUser();
        if (!currentUser) {
          router.push('/');
          return;
        }

        // Доступ разрешен - пробуем загрузить новый интерфейс
        console.log('[UsersManagementPage] Access granted - attempting to load unified interface');
        await retryLoad();

      } catch (error) {
        console.error('[UsersManagementPage] Access check failed:', error);
        router.push('/');
      }
    });

    return {
      showFallback,
      loadAttempts,
      showErrorDetailsFlag,
      lastError,
      retryLoad,
      showErrorDetails
    };
  }
};
</script>

<style scoped>
/*
 * UsersManagementPage.vue - Обертка для единого интерфейса управления пользователями
 *
 * ВРЕМЕННЫЙ FALLBACK: Диагностика проблем загрузки нового интерфейса
 * НОВЫЙ ПОДХОД: Полная замена старого интерфейса с кнопкой "Дашборд анализа"
 * СТАРЫЙ ПОДХОД: УДАЛЕН - разделение на секции с отдельными компонентами
 */

.users-management-page {
  width: 100%;
  min-height: 100vh;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* Fallback интерфейс для диагностики */
.fallback-interface {
  max-width: 800px;
  width: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.fallback-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px 30px;
  text-align: center;
}

.fallback-header h1 {
  margin: 0 0 10px 0;
  font-size: 28px;
  font-weight: 700;
}

.fallback-header p {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
}

.fallback-content {
  padding: 30px;
}

.status-card,
.debug-info {
  margin-bottom: 30px;
}

.status-card h3,
.debug-info h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.status-card ul {
  margin: 0;
  padding-left: 20px;
}

.status-card li {
  margin-bottom: 8px;
  color: #555;
}

.debug-info p {
  margin: 0 0 15px 0;
  color: #666;
  line-height: 1.5;
}

.debug-info ul {
  margin: 0 0 20px 0;
  padding-left: 20px;
}

.debug-info li {
  margin-bottom: 5px;
  color: #666;
}

.debug-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.retry-btn,
.debug-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.retry-btn {
  background: #007bff;
  color: white;
}

.retry-btn:hover {
  background: #0056b3;
}

.debug-btn {
  background: #6c757d;
  color: white;
}

.debug-btn:hover {
  background: #5a6268;
}

.error-details {
  margin-top: 20px;
  padding: 15px;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
}

.error-details h4 {
  margin: 0 0 10px 0;
  color: #721c24;
  font-size: 16px;
}

.error-stack {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 10px;
  font-family: monospace;
  font-size: 12px;
  color: #721c24;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

/*
 * КОММЕНТАРИЙ: Когда новый интерфейс заработает, этот CSS будет удален
 * и останется только базовый .users-management-page для UnifiedUserManagement
 */

/* Адаптивность */
@media (max-width: 768px) {
  .users-management-page {
    padding: 10px;
  }

  .fallback-header {
    padding: 30px 20px;
  }

  .fallback-header h1 {
    font-size: 24px;
  }

  .fallback-content {
    padding: 20px;
  }

  .debug-actions {
    flex-direction: column;
  }

  .retry-btn,
  .debug-btn {
    width: 100%;
    text-align: center;
  }
}
</style>

