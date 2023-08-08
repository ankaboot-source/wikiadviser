<template>
  <q-item class="app-search__result" clickable @click="itemOnClick">
    <q-item-section>
      <div class="app-search__result-title row items-center q-gutter-sm">
        <div class="col-auto">
          <q-avatar rounded size="4rem" class="borders">
            <img v-if="!!props.item?.thumbnail" :src="props.item.thumbnail" />
            <q-icon name="description" size="4rem" color="grey" />
          </q-avatar>
        </div>
        <div class="col">
          <div class="doc-token">{{ props.item!.title }}</div>
          <div v-if="props.item!.description" class="q-pl-sm">
            {{ props.item!.description }}
          </div>
        </div>
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useQuasar, QSpinnerGears } from 'quasar';
import { SearchResult } from 'src/types';
import supabase from 'src/api/supabase';
import { ref } from 'vue';
import { createNewArticle, getArticles } from 'src/api/supabaseHelper';
import { Article } from 'src/types';
const $q = useQuasar();
const router = useRouter();
const props = defineProps<{
  item: SearchResult;
}>();
const articleId = ref('');
const articles = JSON.parse($q.localStorage.getItem('articles')!);

async function itemOnClick() {
  try {
    const { data } = await supabase.auth.getSession();
    // check access
    const articleExists = articles?.some(
      (article: Article) => article.title === props.item!.title
    );

    if (articleExists) {
      // GOTO ARTICLE PAGE
      router.push({
        name: 'article',
        params: { articleId: articleId.value },
      });
    } else {
      const extractingNotif = $q.notify({
        message: 'Extracting article',
        caption:
          'Extracting article out of Wikipedia and importing into our Mediawiki.',
        spinner: QSpinnerGears,
        timeout: 10000,
      });

      //NEW ARTICLE
      articleId.value = await createNewArticle(
        props.item.title,
        data.session!.user.id,
        props.item.description
      );

      extractingNotif();
      $q.notify({
        message: 'Article successfully created.',
        icon: 'check',
        color: 'positive',
      });
      $q.localStorage.set(
        'articles',
        JSON.stringify(await getArticles(data.session!.user.id))
      );
      // GOTO ARTICLE PAGE, EDIT TAB
      router.push({
        name: 'article',
        params: {
          articleId: articleId.value,
          tab: 'editor',
        },
      });
    }
  } catch (error: any) {
    $q.notify({
      message: error.message,
      color: 'negative',
    });
  }
}
</script>
