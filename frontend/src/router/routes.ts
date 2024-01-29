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
    path: '/auth/update_password',
    name: 'update password',
    component: () => import('pages/auth/UpdatePasswordPage.vue'),
  },
  {
    path: '/account',
    component: () => import('pages/auth/UserAccountPage.vue'),
  },
  {
    path: '/articles',
    alias: '/',
    name: 'articles',
    component: () => import('pages/article/ArticlesPage.vue'),
  },
  {
    path: '/articles/:articleId',
    name: 'article',
    component: () => import('pages/article/ArticlePage.vue'),
  },
  {
    path: '/shares/:token',
    name: 'share',
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
