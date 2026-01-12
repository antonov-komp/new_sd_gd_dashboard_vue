<template>
  <div class="users-management-page">
    <!-- НОВЫЙ ЕДИНЫЙ ИНТЕРФЕЙС УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯМИ -->
    <!-- ПОЛНАЯ ЗАМЕНА СТАРОГО ИНТЕРФЕЙСА С КНОПКОЙ "ДАШБОРД АНАЛИЗА" -->
    <UnifiedUserManagement
      :config="{
        enablePersistence: true,
        enableKeyboardShortcuts: true,
        defaultView: 'global'
      }"
    />
  </div>
</template>

<script>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import UnifiedUserManagement from '@/components/users/management/UnifiedUserManagement.vue';
import { AccessControlService } from '@/services/access-control-service.js';

export default {
  name: 'UsersManagementPage',
  components: {
    UnifiedUserManagement
  },
  setup() {
    const router = useRouter();

    /**
     * Проверка доступа администратора
     * Новый UnifiedUserManagement компонент сам управляет всей логикой,
     * поэтому здесь только проверка доступа к странице
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

        // Доступ разрешен - новый интерфейс загрузится автоматически
        console.log('[UsersManagementPage] Access granted - loading unified interface');

      } catch (error) {
        console.error('[UsersManagementPage] Access check failed:', error);
        router.push('/');
      }
    });

    return {};
  }
};
</script>

<style scoped>
/*
 * UsersManagementPage.vue - Обертка для единого интерфейса управления пользователями
 *
 * НОВЫЙ ПОДХОД: Полная замена старого интерфейса с кнопкой "Дашборд анализа"
 * СТАРЫЙ ПОДХОД: УДАЛЕН - разделение на секции с отдельными компонентами
 */

.users-management-page {
  /*
   * НОВЫЙ ИНТЕРФЕЙС: UnifiedUserManagement занимает всю страницу
   * СТАРЫЙ ИНТЕРФЕЙС: УДАЛЕН - padding и background
   */
  width: 100%;
  height: 100vh;
  overflow: hidden; /* Предотвращаем скролл на уровне страницы */

  /*
   * НОВЫЙ ИНТЕРФЕЙС: Компонент сам управляет фоном и отступами
   * СТАРЫЙ ИНТЕРФЕЙС: УДАЛЕН - min-height, padding, background
   */
}

/*
 * Весь старый CSS удален:
 * - .page-header (старый заголовок страницы)
 * - .back-button (старая кнопка "Назад")
 * - .page-content (старый контейнер контента)
 * - .activity-section (старая секция активности)
 *
 * НОВЫЙ ПОДХОД: UnifiedUserManagement имеет собственные стили
 */

/* Адаптивность для нового интерфейса */
@media (max-width: 768px) {
  .users-management-page {
    height: auto;
    overflow: visible;
  }
}
</style>

