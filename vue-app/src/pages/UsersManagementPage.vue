<template>
  <div class="users-management-page">
    <!-- НОВЫЙ ЕДИНЫЙ ИНТЕРФЕЙС УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯМИ -->
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
import { ref, onMounted } from 'vue';
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
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* Адаптивность для нового интерфейса */
@media (max-width: 768px) {
  .users-management-page {
    height: auto;
    overflow: visible;
  }
}
</style>

