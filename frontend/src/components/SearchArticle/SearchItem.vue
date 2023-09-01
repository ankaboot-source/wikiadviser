<template>
  <q-item
    class="q-pa-sm q-mt-sm borders rounded-borders text-blue-grey-14"
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
import { createNewArticle, getArticles } from 'src/api/supabaseHelper';
import { wikipediaLanguage } from 'src/data/wikipediaLanguages';
import { Article, SearchResult } from 'src/types';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
const $q = useQuasar();
const router = useRouter();
const props = defineProps<{
  item: SearchResult;
  articleLanguage: wikipediaLanguage;
}>();

const articleId = ref('');
const articles = JSON.parse($q.localStorage.getItem('articles')!);

async function itemOnClick() {
  try {
    const { data } = await supabase.auth.getSession();
    // check access
    const articleExists = articles?.some(
      (article: Article) => article.title === props.item.title
    );

    if (articleExists) {
      // GOTO ARTICLE PAGE
      router.push({
        name: 'article',
        params: { articleId: articleId.value },
      });
    } else {
      $q.loading.show({
        backgroundColor: 'secondary',

        spinner: QSpinnerGrid,
        spinnerColor: 'primary',
        spinnerSize: 140,

        message:
          "<div class='text-h6'>Extracting article out of Wikipedia and importing it into our platform. Please wait...</div>",
        html: true,
        messageColor: 'black',
      });
      try {
        //NEW ARTICLE
        articleId.value = await createNewArticle(
          props.item.title,
          data.session!.user.id,
          props.articleLanguage,
          props.item.description
        );
        $q.loading.hide();
        $q.notify({
          message: 'Article successfully created.',
          icon: 'check',
          color: 'positive',
        });
        const articles = await getArticles(data.session!.user.id);
        $q.localStorage.set('articles', JSON.stringify(articles));

        // GOTO ARTICLE PAGE, EDIT TAB
        router.push({
          name: 'article',
          params: {
            articleId: articleId.value,
            tab: 'editor',
          },
        });
      } catch (error) {
        $q.loading.hide();
        if (error instanceof Error) {
          $q.notify({
            message: error.message,
            color: 'negative',
          });
        }
      }
    }
  } catch (error) {
    let message = 'Failed importing or creating article';
    if (error instanceof Error) {
      message = error.message;
    }
    $q.notify({
      message,
      color: 'negative',
    });
  }
}
</script>
