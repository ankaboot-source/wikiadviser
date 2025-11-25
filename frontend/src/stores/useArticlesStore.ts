import { defineStore } from 'pinia';
import { getArticles } from 'src/api/supabaseHelper';
import ENV from 'src/schema/env.schema';
import { Article } from 'src/types';
import { computed, ref } from 'vue';

export const useArticlesStore = defineStore('articles', () => {
  // States
  const articles = ref<Article[]>([]);

  // Getters
  const getArticleById = computed(
    () => (articleId: string) =>
      articles.value.find(
        (article: { article_id: string }) => article.article_id === articleId,
      ),
  );

  // Actions
  async function fetchArticles(userId: string) {
    articles.value = await getArticles(userId);
  }

  function resetArticles() {
    articles.value = [];
  }

  function viewArticleInNewTab(language: string, article_id: string) {
    window.open(
      `${ENV.MEDIAWIKI_ENDPOINT}/${language}/index.php?title=${capitalizeFirstLetter(
        article_id,
      )}`,
      '_blank',
    );
  }
  return {
    articles,
    fetchArticles,
    getArticleById,
    resetArticles,
    viewArticleInNewTab,
  };
});

// To avoid mediawiki title possible redirection (related to case sensitivity)
function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
