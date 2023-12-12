import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/auth/callback',
    beforeEnter: (to, _, next) => {
      next('/');
    },
    component: () => null,
  },
  {
    path: "/settings",
    component: () => import("pages/UserSettingsPage.vue"),
  },
  {
    path: '/auth/update_password',
    name: 'update password',
    component: () => import('pages/auth/UpdatePasswordPage.vue'),
  },
  {
    path: '/articles',
    alias: '/',
    name: 'articles',
    component: () => import('pages/ArticlesPage.vue'),
  },
  {
    path: '/articles/:articleId',
    name: 'article',
    component: () => import('pages/ArticlePage.vue'),
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
