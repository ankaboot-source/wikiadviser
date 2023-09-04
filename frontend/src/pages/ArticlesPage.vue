<template>
  <div class="col q-panel q-py-lg">
    <div class="row justify-center">
      <q-card class="q-pa-sm column" flat>
        <q-card-section class="row">
          <div class="text-h5 merriweather">Articles</div>
          <q-space />
          <q-btn
            icon="add"
            no-caps
            unelevated
            color="primary"
            label="Add a new article"
            @click="showNewArticleDialog = !showNewArticleDialog"
          >
            <q-dialog v-model="showNewArticleDialog">
              <search-article />
            </q-dialog>
          </q-btn>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="term"
            bg-color="white"
            dense
            outlined
            style="width: 80vw"
            placeholder="Find your articles"
          >
            <template #append>
              <q-icon name="search" />
            </template>
          </q-input>
        </q-card-section>

        <q-scroll-area
          v-if="articlesFiltered?.length"
          class="col-grow q-pt-none q-pb-lg"
        >
          <q-list class="q-mx-md">
            <owned-article-item
              v-for="article in articlesFiltered"
              :key="article.article_id"
              :article="article"
              @update-articles-emit="updateArticles()"
            />
          </q-list>
        </q-scroll-area>
        <q-card-section
          v-if="!articlesFiltered?.length && articles?.length"
          padding
          class="q-mx-md q-my-xs"
        >
          <div class="text-center q-gutter-sm">
            <q-icon name="search_off" size="xl" />

            <div class="col">
              <div class="text-weight-bold">Could not find any results</div>
              <div class="q-pl-sm">
                Try another term or
                <span
                  style="color: #0645ad; cursor: pointer"
                  @click="showNewArticleDialog = !showNewArticleDialog"
                >
                  add a new article
                </span>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-section
          v-if="!articlesFiltered?.length && !articles?.length"
          class="text-center"
          padding
        >
          <div class="text-body1 text-weight-medium">
            There are currently no articles
          </div>
          <div class="text-body2">Add a new article to get started</div>
          <q-btn
            icon="add"
            no-caps
            unelevated
            color="primary"
            class="q-mt-md"
            label="Add a new article"
            @click="showNewArticleDialog = !showNewArticleDialog"
          />
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onBeforeMount, ref } from 'vue';
import { useQuasar } from 'quasar';
import OwnedArticleItem from 'src/components/OwnedArticleItem.vue';
import SearchArticle from 'src/components/SearchArticle/SearchArticle.vue';
import { Article } from 'src/types';
import supabase from 'src/api/supabase';
import { getArticles } from 'src/api/supabaseHelper';

const $q = useQuasar();
const articles = ref<Article[]>();
const term = ref('');
const showNewArticleDialog = ref(false);

function updateArticles() {
  articles.value = JSON.parse($q.localStorage.getItem('articles')!);
}

onBeforeMount(async () => {
  const { data } = await supabase.auth.getSession();
  articles.value = (await getArticles(data.session!.user.id)) || [];
  $q.localStorage.set('articles', JSON.stringify(articles.value));
});
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
