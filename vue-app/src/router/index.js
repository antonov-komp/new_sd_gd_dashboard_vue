import { createRouter, createWebHashHistory } from 'vue-router';
import InstallPage from '@/components/InstallPage.vue';
import IndexPage from '@/components/IndexPage.vue';
import WebhookLogsPage from '@/pages/WebhookLogsPage.vue';
import { AccessControlService } from '@/services/access-control-service.js';
import { isAdmin } from '@/config/access-config.js';

const routes = [
  {
    path: '/install',
    name: 'install',
    component: InstallPage
  },
  {
    path: '/',
    name: 'index',
    component: IndexPage
  },
  {
    // Старый маршрут - редирект на новый для обратной совместимости
    path: '/webhook-logs',
    name: 'webhook-logs',
    redirect: '/admin/webhook-logs'
  },
  {
    // Новый маршрут согласно admin-config.js
    path: '/admin/webhook-logs',
    name: 'admin-webhook-logs',
    component: WebhookLogsPage,
    meta: {
      requiresAuth: true,
      title: 'Логи вебхуков',
      adminOnly: true
    }
  },
  {
    path: '/dashboard/sector-1c',
    name: 'dashboard-sector-1c',
    component: () => import('@/components/dashboard/DashboardSector1C.vue')
  },
  {
    path: '/dashboard/graph-state',
    name: 'dashboard-graph-state',
    component: () => import('@/components/graph-state/GraphStateDashboard.vue'),
    meta: {
      title: 'График состояния сектора 1С',
      description: 'Визуализация изменений состояния сектора во времени',
      requiresAuth: true
      // adminOnly: false — просмотр доступен всем авторизованным пользователям
    }
  }
];

const router = createRouter({
  // Используем hash mode для работы внутри Bitrix24
  history: createWebHashHistory(),
  routes
});

/**
 * Navigation guard для проверки прав доступа
 * 
 * Проверяет:
 * - requiresAuth: требуется ли авторизация для доступа к маршруту
 * - adminOnly: требуется ли права администратора для доступа к маршруту
 * 
 * Использует AccessControlService для проверки доступа пользователя
 */
router.beforeEach(async (to, from, next) => {
  // Установка заголовка страницы из метаданных маршрута
  if (to.meta.title) {
    document.title = `${to.meta.title} - Bitrix24 Dashboard`;
  }

  // Проверка авторизации (если требуется)
  if (to.meta.requiresAuth) {
    try {
      const accessResult = await AccessControlService.checkAccess();
      
      if (!accessResult.allowed) {
        console.warn('Unauthorized access attempt to:', to.path, accessResult.errorMessage);
        // Перенаправление на стартовую страницу при отсутствии доступа
        next({ name: 'index' });
        return;
      }
    } catch (error) {
      console.error('Error checking access in navigation guard:', error);
      // В случае ошибки проверки доступа, разрешаем переход
      // (компонент сам обработает ошибку доступа)
      next();
      return;
    }
  }

  // Проверка прав администратора (если требуется)
  if (to.meta.adminOnly) {
    try {
      const currentUser = await AccessControlService.getCurrentUser();
      
      if (!currentUser || !isAdmin(currentUser)) {
        console.warn('Admin access required for:', to.path);
        // Перенаправление на стартовую страницу при отсутствии прав администратора
        next({ name: 'index' });
        return;
      }
    } catch (error) {
      console.error('Error checking admin access in navigation guard:', error);
      // В случае ошибки проверки прав администратора, запрещаем доступ
      next({ name: 'index' });
      return;
    }
  }

  // Разрешаем переход
  next();
});

// Определяем начальный маршрут на основе текущего URL
// Используем setTimeout чтобы убедиться, что роутер готов
setTimeout(() => {
  const currentPath = window.location.pathname;
  const hash = window.location.hash;
  
  // Если уже есть hash маршрут, не переопределяем
  if (hash && hash !== '#/') {
    return;
  }
  
  // Определяем маршрут на основе pathname
  if (currentPath.includes('install.php')) {
    router.replace('/install');
  } else {
    router.replace('/');
  }
}, 0);

export default router;

