import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
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
