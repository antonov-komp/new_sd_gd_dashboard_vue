# TASK-002-04: Добавление приветствия и обработка ошибок доступа

**Дата создания:** 2025-12-05 21:51 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Зависимости:** TASK-002-01, TASK-002-02, TASK-002-03  
**Связанные задачи:** TASK-002-05

## Описание
Добавить приветствие пользователя с указанием его имени и названия страницы "Страница Аналитики ИТ отдела для Генеральной дирекции". Улучшить обработку ошибок доступа с использованием компонента StatusMessage для отображения уведомлений.

## Контекст
После интеграции проверки доступа (TASK-002-03) необходимо добавить приветствие пользователя и улучшить UX при отображении ошибок доступа. Приветствие должно быть информативным и показывать, кто открыл приложение.

## Модули и компоненты
- `vue-app/src/components/IndexPage.vue` — основной компонент страницы (требует изменений)

## Ступенчатые подзадачи
1. Добавить блок приветствия в шаблон компонента
2. Использовать информацию о пользователе из `currentUser` для приветствия
3. Отобразить имя пользователя в приветствии
4. Добавить заголовок "Страница Аналитики ИТ отдела для Генеральной дирекции"
5. Использовать компонент `StatusMessage` для отображения ошибок доступа
6. Улучшить стилизацию блока приветствия
7. Добавить обработку случая, когда имя пользователя отсутствует

## Технические требования
- Приветствие должно отображаться только при успешной проверке доступа
- Формат приветствия: "Добро пожаловать, [Имя пользователя]! Страница Аналитики ИТ отдела для Генеральной дирекции"
- Если имя пользователя отсутствует — использовать "Пользователь" или ID
- Использовать компонент `StatusMessage` для ошибок доступа
- Стили должны соответствовать гайдлайнам Bitrix24

## Пример кода

```vue
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

      <LoadingSpinner v-if="loading" message="Проверка доступа..." />

      <!-- Блокировка доступа -->
      <StatusMessage
        v-if="!loading && accessDenied"
        type="error"
        title="Доступ запрещён"
        :message="accessErrorMessage"
      />

      <!-- Основной контент с приветствием -->
      <div v-if="!loading && !accessDenied && accessAllowed" class="main-content">
        <!-- Приветствие -->
        <div class="greeting-section">
          <h2 class="greeting-title">Страница Аналитики ИТ отдела для Генеральной дирекции</h2>
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

    // Вычисляемое свойство для имени пользователя
    const userName = computed(() => {
      if (!currentUser.value) {
        return 'Пользователь';
      }
      
      // Пробуем получить имя из разных полей
      if (currentUser.value.NAME) {
        return currentUser.value.NAME;
      }
      
      if (currentUser.value.FIRST_NAME && currentUser.value.LAST_NAME) {
        return `${currentUser.value.FIRST_NAME} ${currentUser.value.LAST_NAME}`.trim();
      }
      
      if (currentUser.value.FIRST_NAME) {
        return currentUser.value.FIRST_NAME;
      }
      
      if (currentUser.value.LAST_NAME) {
        return currentUser.value.LAST_NAME;
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
```

## Критерии приёмки
- [ ] Добавлен блок приветствия с заголовком "Страница Аналитики ИТ отдела для Генеральной дирекции"
- [ ] Приветствие отображает имя пользователя
- [ ] Используется компонент `StatusMessage` для ошибок доступа
- [ ] Обработаны случаи отсутствия имени пользователя
- [ ] Стили соответствуют гайдлайнам Bitrix24
- [ ] Приветствие отображается только при успешной проверке доступа
- [ ] Код соответствует стандартам ESLint проекта

## Тестирование
1. Проверить отображение приветствия с именем пользователя
2. Проверить отображение приветствия при отсутствии имени (должен использоваться ID)
3. Проверить отображение ошибки доступа через `StatusMessage`
4. Проверить отображение сообщения "Обратитесь в Поддержку приложения в ИТ отдел" при ошибке определения пользователя

## История правок
- 2025-12-05 21:51 (UTC+3, Брест): Создана задача
