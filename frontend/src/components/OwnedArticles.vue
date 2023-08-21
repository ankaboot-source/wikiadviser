<template>
  <q-card class="q-pa-sm bg-secondary column">
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
        placeholder="Search your articles"
      >
        <template #append>
          <q-icon name="search" />
        </template>
      </q-input>
    </q-card-section>
    <q-scroll-area class="col-grow q-pt-none q-pb-lg">
      <q-list padding class="q-mx-md q-my-xs">
        <owned-article-item
          v-for="article in articlesFiltered"
          :key="article.article_id"
          :article="article"
          @update-articles-emit="updateArticles()"
        />
      </q-list>
    </q-scroll-area>
  </q-card>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import OwnedArticleItem from './OwnedArticleItem.vue';
import { Article } from 'src/types';

const $q = useQuasar();
const articles = ref<Article[]>();
const term = ref('');

function updateArticles() {
  articles.value = JSON.parse($q.localStorage.getItem('articles')!);
}
updateArticles();
const articlesFiltered = computed(() => {
  const trimmedTerm = term.value.trim();
  if (!trimmedTerm) {
    return articles.value;
  } else {
    return articles.value?.filter((article: Article) =>
      article.title.toLowerCase().includes(trimmedTerm.toLowerCase())
    );
  }
});
</script>
