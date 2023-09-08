import { defineStore } from 'pinia';
import { getArticles } from 'src/api/supabaseHelper';
import { Article } from 'src/types';

export const useArticlesStore = defineStore('articles', {
  state: () => ({
    articles: [] as Article[],
  }),
  actions: {
    setArticles(articles: Article[]) {
      this.articles = articles;
    },
    async fetchArticles(userId: string) {
      const articles = await getArticles(userId);
      this.setArticles(articles);
    },
  },
  getters: {
    getArticleById: (state) => (articleId: string) =>
      state.articles.find((article) => article.article_id === articleId),
  },
});
