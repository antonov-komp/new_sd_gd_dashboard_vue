import { createRouter, createWebHashHistory } from 'vue-router';
import InstallPage from '@/components/InstallPage.vue';
import IndexPage from '@/components/IndexPage.vue';
import WebhookLogsPage from '@/pages/WebhookLogsPage.vue';
import UsersManagementPage from '@/pages/UsersManagementPage.vue';
import CacheManagementPage from '@/pages/CacheManagementPage.vue';
import { AccessControlService } from '@/services/access-control-service.js';
import { ActivityLoggingService } from '@/services/activity-logging-service.js';
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
    // Маршрут управления пользователями
    path: '/admin/users',
    name: 'admin-users',
    component: UsersManagementPage,
    meta: {
      requiresAuth: true,
      title: 'Управление пользователями',
      adminOnly: true
    }
  },
  {
    // Маршрут управления кешем
    path: '/admin/cache',
    name: 'admin-cache',
    component: CacheManagementPage,
    meta: {
      requiresAuth: true,
      title: 'Ручное управление кешем',
      adminOnly: true
    }
  },
  {
    path: '/dashboard/sector-1c',
    name: 'dashboard-sector-1c',
    component: () => import(/* webpackChunkName: "dashboard-sector1c" */ '@/components/dashboard/DashboardSector1C.vue'),
    meta: {
      requiresAuth: true,
      chunk: 'dashboard-sector1c'
    }
  },
  // Гибридный подход: специфические маршруты для каждого сектора
  {
    path: '/dashboard/sector-pdm',
    name: 'dashboard-sector-pdm',
    component: () => import(/* webpackChunkName: "sector-dashboard-pdm" */ '@/components/SectorDashboardPDM.vue'),
    meta: {
      requiresAuth: true,
      chunk: 'dashboard-sector-pdm'
    },
    props: { sectorId: 'pdm' } // Явно передаем props для надежности
  },
  {
    path: '/dashboard/sector-bitrix24',
    name: 'dashboard-sector-bitrix24',
    component: () => import(/* webpackChunkName: "dashboard-sector-bitrix24" */ '@/components/SectorDashboardBitrix24.vue'),
    meta: {
      requiresAuth: true,
      chunk: 'dashboard-sector-bitrix24'
    }
  },
  {
    path: '/dashboard/sector-infrastructure',
    name: 'dashboard-sector-infrastructure',
    component: () => import(/* webpackChunkName: "dashboard-sector-infrastructure" */ '@/components/SectorDashboardInfrastructure.vue'),
    meta: {
      requiresAuth: true,
      chunk: 'dashboard-sector-infrastructure'
    }
  },
  {
    path: '/dashboard/graph-admission-closure',
    name: 'dashboard-graph-admission-closure',
    component: () => import(/* webpackChunkName: "admission-dashboard" */ '@/components/graph-admission-closure/GraphAdmissionClosureDashboard.vue'),
    meta: {
      title: 'График приёма и закрытий сектора 1С',
      description: 'Недельные агрегаты новых и закрытых тикетов сектора 1С',
      requiresAuth: true,
      chunk: 'admission-dashboard'
    }
  },
  {
    path: '/dashboard/graph-state',
    name: 'dashboard-graph-state',
    component: () => import(/* webpackChunkName: "graph-state" */ '@/components/graph-state/GraphStateDashboard.vue'),
    meta: {
      title: 'График состояния сектора 1С',
      description: 'Визуализация изменений состояния сектора во времени',
      requiresAuth: true,
      chunk: 'graph-state'
    }
  },
  {
    path: '/dashboard/tickets-time-tracking',
    name: 'dashboard-tickets-time-tracking',
    component: () => import(/* webpackChunkName: "tickets-tracking" */ '@/components/tickets-time-tracking/TicketsTimeTrackingDashboard.vue'),
    meta: {
      title: 'Трудозатраты на Тикеты сектора 1С',
      description: 'Трудозатраты сотрудников сектора 1С по неделям',
      requiresAuth: true,
      chunk: 'tickets-tracking'
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
  console.log('[Router] beforeEach:', { to: to.path, from: from.path, name: to.name });
  
  // Установка заголовка страницы из метаданных маршрута
  if (to.meta.title) {
    document.title = `${to.meta.title} - Bitrix24 Dashboard`;
  }

  // Проверка авторизации (если требуется)
  if (to.meta.requiresAuth) {
    console.log('[Router] requiresAuth check for:', to.path);
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

  // Логирование перехода по маршруту
  // Логируем для всех авторизованных пользователей, если это не первый рендер
  if (from.name !== null && to.path !== from.path) {
    try {
      // Проверяем, что пользователь авторизован
      const accessResult = await AccessControlService.checkAccess();
      
      if (accessResult.allowed) {
        const currentUser = await AccessControlService.getCurrentUser();
        
        if (currentUser) {
          // Логируем переход асинхронно, не блокируя навигацию
          ActivityLoggingService.logPageVisit(to, currentUser, from)
            .catch(error => {
              // Ошибка логирования не должна прерывать навигацию
              console.error('[Router] Error logging page visit:', error);
            });
        }
      }
    } catch (error) {
      // Ошибка логирования не должна прерывать навигацию
      console.error('[Router] Error in activity logging:', error);
    }
  }

  // Prefetch критических chunks при посещении главной страницы
  if (to.name === 'index' && !from.name) {
    // Предзагрузка dashboard компонентов для быстрого доступа
    setTimeout(() => {
      import(/* webpackChunkName: "dashboard-sector1c" */ '@/components/dashboard/DashboardSector1C.vue');
    }, 1000); // Задержка чтобы не блокировать основную загрузку
  }

  // Prefetch связанных компонентов
  if (to.meta.chunk) {
    switch (to.meta.chunk) {
      case 'dashboard-sector1c':
        // Предзагрузка зависимых сервисов
        setTimeout(() => {
          import('@/services/dashboard-sector-1c-service.js');
        }, 500);
        break;
      case 'admission-dashboard':
        // Предзагрузка admission сервиса
        setTimeout(() => {
          import('@/utils/lazy-services.js');
        }, 500);
        break;
    }
  }

  // Разрешаем переход
  console.log('[Router] Allowing navigation to:', to.path);
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

