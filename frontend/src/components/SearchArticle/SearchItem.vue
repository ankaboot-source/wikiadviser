<template>
  <q-item
    class="q-pa-sm q-mb-sm borders rounded-borders"
    clickable
    @click="itemOnClick"
  >
    <q-item-section>
      <div class="row items-center q-gutter-sm">
        <div class="col-auto">
          <q-avatar rounded size="4rem" class="borders">
            <img v-if="!!props.item?.thumbnail" :src="props.item.thumbnail" />
            <q-icon v-else name="description" size="4rem" color="grey" />
          </q-avatar>
        </div>
        <div class="col">
          <div class="text-weight-bold">{{ props.item!.title }}</div>
          <div v-if="props.item!.description">
            {{ props.item!.description }}
          </div>
        </div>
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { QSpinnerGrid, useQuasar } from 'quasar';
import supabase from 'src/api/supabase';
import { createNewArticle } from 'src/api/supabaseHelper';
import { wikiadviserLanguage } from 'src/data/wikiadviserLanguages';
import { Article, SearchResult } from 'src/types';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useArticlesStore } from 'src/stores/useArticlesStore';

const $q = useQuasar();
const router = useRouter();
const props = defineProps<{
  item: SearchResult;
  articleLanguage: wikiadviserLanguage;
}>();
const articlesStore = useArticlesStore();
const articleId = ref('');

async function itemOnClick() {
  try {
    const { data } = await supabase.auth.getSession();

    if (!data.session?.user.id) {
      router.push('/');
      throw new Error('User session not found.');
    }

    // check access
    const article = articlesStore.articles?.find(
      (article: Article) =>
        article.title === props.item.title &&
        article.language === props.articleLanguage,
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
      <div class='text-h6'> 🕵️🔐 Anonymously and Safely Importing “${props.item.title}” from Wikipedia. </div></br>
      <div class='text-body1'>Please wait…</div>`,
      html: true,
    });

    //NEW ARTICLE
    articleId.value = await createNewArticle(
      props.item.title,
      data.session.user.id,
      props.articleLanguage,
      props.item.description,
    );
    $q.loading.hide();
    $q.notify({
      message: 'Article successfully created.',
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
  return undefined;
}
</script>
