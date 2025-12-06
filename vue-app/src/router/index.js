import { createRouter, createWebHashHistory } from 'vue-router';
import InstallPage from '@/components/InstallPage.vue';
import IndexPage from '@/components/IndexPage.vue';
import WebhookLogsPage from '@/pages/WebhookLogsPage.vue';

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
    path: '/webhook-logs',
    name: 'webhook-logs',
    component: WebhookLogsPage
  }
];

const router = createRouter({
  // Используем hash mode для работы внутри Bitrix24
  history: createWebHashHistory(),
  routes
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

