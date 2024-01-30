import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/auth',
    name: 'authentication',
    meta: {
      requiresAuth: false,
    },
    component: () => import('pages/auth/AuthPage.vue'),
  },
  {
    path: '/articles',
    alias: '/',
    name: 'articles',
    meta: {
      requiresAuth: true,
    },
    component: () => import('pages/article/ArticlesPage.vue'),
  },
  {
    path: '/auth/update-password',
    name: 'update password',
    meta: {
      requiresAuth: true,
    },
    component: () => import('pages/auth/UpdatePasswordPage.vue'),
  },
  {
    path: '/account',
    meta: {
      requiresAuth: true,
    },
    component: () => import('pages/auth/UserAccountPage.vue'),
  },
  {
    path: '/articles/:articleId',
    name: 'article',
    meta: {
      requiresAuth: true,
    },
    component: () => import('pages/article/ArticlePage.vue'),
  },
  {
    path: '/shares/:token',
    name: 'share',
    meta: {
      requiresAuth: true,
    },
    component: () => import('pages/share/SharePage.vue'),
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    name: '404',
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
