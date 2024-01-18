<template>
  <q-card class="column" style="width: 60vw; max-height: 80vh" flat>
    <q-toolbar class="borders">
      <q-toolbar-title class="merriweather">
        Create a new article
      </q-toolbar-title>
      <q-btn v-close-popup flat round dense icon="close" size="sm" />
    </q-toolbar>
    <q-card-section>
      Title
      <q-input
        v-model="newArticle.title"
        bg-color="white"
        dense
        outlined
        class="q-mb-sm"
      />
      <div class="row">
        <div>Description</div>
        <q-space />
        <div class="text-grey-7">Optional</div>
      </div>
      <q-input
        v-model="newArticle.description"
        bg-color="white"
        dense
        outlined
        class="q-mb-sm"
      />
    </q-card-section>
    <q-card-actions class="borders">
      <q-btn v-close-popup no-caps outline color="primary" label="Cancel" />
      <q-space />
      <q-btn
        no-caps
        unelevated
        color="primary"
        label="Create"
        :icon="!loadingCreation ? 'note_add' : ''"
        :loading="loadingCreation"
        @click="addArticle()"
      >
        <template #loading>
          <q-spinner class="on-left" />
          Create
        </template>
      </q-btn>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import supabase from 'src/api/supabase';
import { createArticle } from 'src/api/supabaseHelper';
import { wikiadviserLanguages } from 'src/data/wikiadviserLanguages';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { Article } from 'src/types';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const $q = useQuasar();
const loadingCreation = ref(false);
const defaultArticleLanguage =
  wikiadviserLanguages.find(
    (option) => window.navigator.language.split('-')[0] === option.lang
  ) || wikiadviserLanguages[0];

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
    loadingCreation.value = true;
    newArticle.value.title = newArticle.value.title
      ? newArticle.value.title
      : 'Untitled';

    const { data } = await supabase.auth.getSession();

    if (!data.session?.user.id) {
      router.push('/');
      throw new Error('User session not found.');
    }

    // check access
    const article = articlesStore.articles?.find(
      (article: Article) =>
        article.title === newArticle.value.title &&
        article.language === newArticle.value.language.value
    );

    if (article) {
      // GOTO ARTICLE PAGE
      return router.push({
        name: 'article',
        params: { articleId: article.article_id },
      });
    }

    //NEW ARTICLE
    articleId.value = await createArticle(
      newArticle.value.title,
      data.session.user.id,
      newArticle.value.language.value,
      newArticle.value.description
    );
    loadingCreation.value = false;
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
    loadingCreation.value = false;
    $q.loading.hide();
    $q.notify({
      message: 'Failed creating article',
      color: 'negative',
    });
  }
  return undefined;
}
</script>
