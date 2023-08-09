<template>
  <q-card-section>
    <div class="text-h5 merriweather">Articles</div>
  </q-card-section>
  <q-card-section class="q-pb-none">
    <q-input
      v-model="term"
      bg-color="white"
      dense
      standout
      outlined
      style="width: 40vw"
      debounce="700"
      placeholder="Search your articles"
    >
      <template #append>
        <q-icon name="search" />
      </template>
    </q-input>
  </q-card-section>
  <q-card-section class="q-pt-none q-pb-lg">
    <q-list padding>
      <owned-article-item
        v-for="article in articlesFiltered"
        :key="article.article_id"
        :article="article"
        @update-articles-emit="updateArticles()"
      />
    </q-list>
  </q-card-section>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import OwnedArticleItem from './OwnedArticleItem.vue';
import { Article } from 'src/types';

const $q = useQuasar();
const articles = ref<Article[]>();
const articlesFiltered = ref<Article[]>();
const term = ref('');

function updateArticles() {
  articles.value = JSON.parse($q.localStorage.getItem('articles')!);
  articlesFiltered.value = articles.value;
}
updateArticles();
watch(term, async (term) => {
  articlesFiltered.value = articles.value?.filter((article: Article) =>
    article.title.toLowerCase().includes(term)
  );
});
</script>
