# TASK-002-03: Удаление информации о профиле администратора и интеграция проверки доступа

**Дата создания:** 2025-12-05 21:51 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Зависимости:** TASK-002-01, TASK-002-02  
**Связанные задачи:** TASK-002-04, TASK-002-05

## Описание
Удалить отображение информации о профиле приложения (администратора) из компонента IndexPage.vue и интегрировать проверку доступа через AccessControlService. После проверки доступа либо показывать основной контент, либо блокировать доступ с соответствующим сообщением.

## Контекст
В текущей версии IndexPage.vue отображается информация о профиле приложения (администратора), которая не нужна конечным пользователям. Необходимо убрать эту информацию и добавить проверку доступа перед отображением основного контента.

## Модули и компоненты
- `vue-app/src/components/IndexPage.vue` — основной компонент страницы (требует изменений)

## Ступенчатые подзадачи
1. Удалить загрузку профиля приложения (`Bitrix24ApiService.getProfile()`)
2. Удалить переменную `profile` из состояния компонента
3. Удалить блок отображения профиля из шаблона (`.profile-info`)
4. Импортировать `AccessControlService` из `@/services/access-control-service.js`
5. Добавить проверку доступа при монтировании компонента
6. Добавить состояние для хранения результата проверки доступа
7. Условно отображать контент в зависимости от результата проверки
8. Убрать отображение информации о текущем пользователе в виде JSON (будет использоваться в следующем этапе для приветствия)

## Технические требования
- Удалить все упоминания `profile` из компонента
- Использовать `AccessControlService.checkAccess()` для проверки доступа
- Если доступ запрещён — показывать сообщение об ошибке (детали в TASK-002-04)
- Если пользователь не определён — показывать сообщение "Обратитесь в Поддержку приложения в ИТ отдел"
- Сохранить информацию о пользователе для использования в приветствии (TASK-002-04)

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

      <!-- Блокировка доступа при ошибке проверки -->
      <div v-if="!loading && accessDenied" class="access-denied">
        <h2>Доступ запрещён</h2>
        <p>{{ accessErrorMessage }}</p>
      </div>

      <!-- Основной контент (будет добавлен в TASK-002-04) -->
      <div v-if="!loading && !accessDenied && accessAllowed" class="main-content">
        <!-- Здесь будет основной контент приложения -->
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
          accessErrorMessage.value = accessResult.errorMessage || 'Доступ запрещён';
          
          // Если не удалось определить пользователя
          if (accessResult.errorCode === AccessErrorCodes.USER_NOT_DETERMINED) {
            accessErrorMessage.value = 'Не удалось определить пользователя. Обратитесь в Поддержку приложения в ИТ отдел.';
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
      errorTitle,
      errorMessage,
      showInstallLink
    };
  }
};
</script>

<style scoped>
/* Существующие стили остаются */
/* Удалить стили для .profile-info */
</style>
```

## Критерии приёмки
- [ ] Удалена загрузка профиля приложения (`getProfile()`)
- [ ] Удалена переменная `profile` из состояния
- [ ] Удалён блок `.profile-info` из шаблона
- [ ] Интегрирована проверка доступа через `AccessControlService.checkAccess()`
- [ ] При запрете доступа отображается сообщение
- [ ] При ошибке определения пользователя показывается сообщение "Обратитесь в Поддержку приложения в ИТ отдел"
- [ ] Информация о пользователе сохраняется в `currentUser` для использования в приветствии
- [ ] Код соответствует стандартам ESLint проекта

## Тестирование
1. Проверить, что информация о профиле администратора не отображается
2. Проверить, что при отсутствии доступа показывается сообщение "Доступ запрещён"
3. Проверить, что при ошибке определения пользователя показывается сообщение "Обратитесь в Поддержку приложения в ИТ отдел"
4. Проверить, что при успешной проверке доступа `accessAllowed` = `true`

## История правок
- 2025-12-05 21:51 (UTC+3, Брест): Создана задача
