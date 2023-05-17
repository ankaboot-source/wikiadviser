import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('pages/ArticlesPage.vue'),
  },
  {
    path: '/login',
    component: () => import('pages/auth/AuthLogin.vue'),
  },
  {
    path: '/WikiAdviser',
    component: () => import('pages/WikiAdviser.vue'),
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
