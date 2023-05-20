import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/articles',
    alias: '/',
    name: 'articles',
    component: () => import('pages/ArticlesPage.vue'),
  },
  {
    path: '/articles/:title/:tab(view|editor)?',
    name: 'article',
    component: () => import('pages/ArticlePage.vue'),
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
