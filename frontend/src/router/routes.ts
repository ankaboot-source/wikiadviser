import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('pages/ArticlesPage.vue'),
  },
  {
    path: '/demo',
    name: 'demo',
    component: () => import('pages/WikiAdviser.vue'),
  },
  {
    path: '/auth',
    component: () => import('pages/auth/AuthLogin.vue'),
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
