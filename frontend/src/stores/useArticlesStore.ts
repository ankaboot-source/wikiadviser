import { defineStore } from 'pinia';
import { getArticles } from 'src/api/supabaseHelper';
import { Article } from 'src/types';
import { computed } from 'vue';
import { ref } from 'vue';

export const useArticlesStore = defineStore('articles', () => {
  // States
  const articles = ref<Article[]>([]);

  // Getters
  const getArticleById = computed(
    () => (articleId: string) =>
      articles.value.find((article) => article.article_id === articleId)
  );

  // Actions
  async function fetchArticles(userId: string) {
    articles.value = await getArticles(userId);
  }

  function resetArticles() {
    articles.value = [];
  }

  return {
    articles,
    fetchArticles,
    getArticleById,
    resetArticles,
  };
});
