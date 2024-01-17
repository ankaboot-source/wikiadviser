<template>
  <q-card class="column" style="max-width: 60vw; max-height: 80vh" flat>
    <q-toolbar class="borders">
      <q-toolbar-title class="merriweather">
        Create a new article
      </q-toolbar-title>
      <q-btn v-close-popup flat round dense icon="close" size="sm" />
    </q-toolbar>
    <q-card-section>
      <q-input
        v-model="newArticle.title"
        bg-color="white"
        dense
        outlined
        label="Title"
      />
      <q-input
        v-model="newArticle.description"
        bg-color="white"
        dense
        outlined
        label="Description"
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
    </q-card-section>
    <q-card-actions class="borders">
      <q-btn v-close-popup no-caps outline color="primary" label="Cancel" />
      <q-space />
      <q-btn
        icon="note_add"
        no-caps
        unelevated
        color="primary"
        label="Create"
        @click="addArticle()"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { QSpinnerGrid, useQuasar } from 'quasar';
import supabase from 'src/api/supabase';
import { createArticle } from 'src/api/supabaseHelper';
import { wikiadviserLanguages } from 'src/data/wikiadviserLanguages';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { Article } from 'src/types';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const $q = useQuasar();

const defaultArticleLanguage =
  wikiadviserLanguages.find(
    (option) => window.navigator.language.split('-')[0] === option.lang,
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
      <div class='text-h6'> 🕵️🔐 Anonymously and Safely Creating “${newArticle.value.title}”. </div></br>
      <div class='text-body1'>Please wait…</div>`,
      html: true,
    });

    //NEW ARTICLE
    articleId.value = await createArticle(
      newArticle.value.title,
      data.session.user.id,
      newArticle.value.language.value,
      newArticle.value.description,
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
      message: 'Failed creating article',
      color: 'negative',
    });
  }
  return undefined;
}
</script>
