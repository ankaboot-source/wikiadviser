<template>
  <q-card class="column fit" style="max-width: 60vw; max-height: 80vh" flat>
    <q-toolbar class="borders">
      <q-toolbar-title class="merriweather">
        Add a new article
      </q-toolbar-title>
      <q-btn v-close-popup flat round dense icon="close" size="sm" />
    </q-toolbar>

    <q-card-section>
      Create New Article
      <q-card-actions>
        <q-input
          v-model="newArticle.title"
          bg-color="white"
          dense
          outlined
          label="title"
          placeholder="title"
        />
        <q-input
          v-model="newArticle.description"
          bg-color="white"
          dense
          outlined
          label="description"
          placeholder="description"
        />
        <q-select
          v-model="newArticle.language"
          :option-label="(item) => item.value.toLocaleUpperCase()"
          :options="wikiadviserLanguages"
          filled
          dense
          options-dense
        >
          <q-tooltip anchor="top middle" self="center middle">
            {{ newArticle.language?.label }}
          </q-tooltip>
          <template #option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section>
                <q-item-label>{{ scope.opt.label }}</q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>
        <q-space />
        <q-btn
          icon="add"
          no-caps
          unelevated
          color="primary"
          label="Create"
          :disable="!term"
          @click="addArticle()"
        />
      </q-card-actions>
    </q-card-section>

    <q-card-section>
      Import new Article
      <q-input
        v-model="term"
        class="q-mt-sm q-mx-sm"
        bg-color="white"
        dense
        outlined
        debounce="700"
        placeholder="Search Wikipedia"
        :loading="isSearching"
      >
        <template #append>
          <q-select
            v-model="articleLanguage"
            :option-label="(item) => item.value.toLocaleUpperCase()"
            :options="wikiadviserLanguages"
            filled
            dense
            options-dense
          >
            <q-tooltip anchor="top middle" self="center middle">
              {{ articleLanguage?.label }}
            </q-tooltip>
            <template #option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          <q-icon name="search" />
        </template>
      </q-input>
    </q-card-section>

    <q-scroll-area
      v-if="searchResults?.length"
      class="col-grow q-pt-none q-pb-lg q-mx-sm"
    >
      <q-list class="q-mx-md">
        <search-item
          v-for="item in searchResults"
          :key="item.title"
          :item="item"
          :article-language="articleLanguage.value"
        />
      </q-list>
    </q-scroll-area>

    <q-card-section
      v-if="!searchResults?.length && term && !isSearching"
      padding
      class="q-mx-md q-my-xs"
    >
      <div class="text-center q-gutter-sm">
        <q-icon name="search_off" size="xl" />

        <div class="col">
          <div class="text-weight-bold">Could not find any results</div>
          <div class="q-pl-sm">Try another term</div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { api } from 'src/boot/axios';
import { wikiadviserLanguages } from 'src/data/wikiadviserLanguages';
import { SearchResult } from 'src/types';
import { ref, watch } from 'vue';
import SearchItem from './SearchItem.vue';

const $q = useQuasar();
const term = ref('');
const isSearching = ref(false);
const searchResults = ref<SearchResult[]>();

const defaultArticleLanguage =
  wikiadviserLanguages.find(
    (option) => window.navigator.language.split('-')[0] === option.lang,
  ) || wikiadviserLanguages[0];

const articleLanguage = ref(defaultArticleLanguage);

watch([term, articleLanguage], async ([term]) => {
  if (!term.trim()) {
    searchResults.value = [];
    return;
  }
  try {
    isSearching.value = true;
    const response = await api.get<{
      message: string;
      searchResults: SearchResult[];
    }>('wikipedia/articles', {
      params: {
        term,
        language: articleLanguage.value.value,
      },
    });
    searchResults.value = response.data.searchResults;
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      $q.notify({
        message: error.message,
        color: 'negative',
      });
    } else {
      console.error(error);
      $q.notify({
        message: 'Whoops, something went wrong while searching for articles',
        color: 'negative',
      });
    }
  } finally {
    isSearching.value = false;
  }
});

import { QSpinnerGrid } from 'quasar';
import supabase from 'src/api/supabase';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { Article } from 'src/types';
import { useRouter } from 'vue-router';
import { createArticle } from 'src/api/supabaseHelper';

const router = useRouter();
const articlesStore = useArticlesStore();
const articleId = ref('');

const newArticle = ref({
  title: '',
  description: '',
  language: defaultArticleLanguage,
});
async function addArticle() {
  try {
    const { data } = await supabase.auth.getSession();

    if (!data.session?.user.id) {
      router.push('/');
      throw new Error('User session not found.');
    }

    // check access
    const article = articlesStore.articles?.find(
      (article: Article) =>
        article.title === newArticle.value.title &&
        article.language === newArticle.value.language.value,
    );

    if (article) {
      // GOTO ARTICLE PAGE
      return router.push({
        name: 'article',
        params: { articleId: article.article_id },
      });
    }

    $q.loading.show({
      boxClass: 'bg-white text-dark q-pa-xl',

      spinner: QSpinnerGrid,
      spinnerColor: 'primary',
      spinnerSize: 140,

      message: `
      <div class='text-h6'> 🕵️🔐 Anonymously and Safely Creating “${term.value}”. </div></br>
      <div class='text-body1'>Please wait…</div>`,
      html: true,
    });

    //NEW ARTICLE
    articleId.value = await createArticle(
      newArticle.value.title,
      data.session.user.id,
      newArticle.value.language.value,
      newArticle.value.description,
      true,
    );
    $q.loading.hide();
    $q.notify({
      message: 'Article successfully created',
      icon: 'check',
      color: 'positive',
    });

    await articlesStore.fetchArticles(data.session.user.id);

    // GOTO ARTICLE PAGE, EDIT TAB
    return router.push({
      name: 'article',
      params: {
        articleId: articleId.value,
      },
    });
  } catch (error) {
    $q.loading.hide();
    $q.notify({
      message: 'Failed importing or creating article',
      color: 'negative',
    });
  }
}
</script>
