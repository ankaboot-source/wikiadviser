<template>
  <q-item class="app-search__result" clickable @click="itemOnClick">
    <q-item-section>
      <div class="app-search__result-title row items-center q-gutter-sm">
        <div class="col-auto">
          <q-avatar rounded size="4rem" class="borders">
            <img
              v-if="!!props.item?.thumbnail?.source"
              :src="props.item.thumbnail.source"
            />
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
import {
  checkArticleExistenceAndAccess,
  createNewArticle,
  getArticles,
} from 'src/api/supabaseHelper';

const $q = useQuasar();
const router = useRouter();
const props = defineProps<{
  item: SearchResult;
}>();
const articleId = ref('');

async function itemOnClick() {
  try {
    const { data } = await supabase.auth.getSession();

    // Fetch Supabase Article to check if it exists
    articleId.value = await checkArticleExistenceAndAccess(
      props.item.title,
      data.session!.user.id
    );

    /*// Fetch wikitext of local article to check if it exists in mediawiki, Currently limited to one team
    const url = `https://localhost/w/api.php?action=query&formatversion=2&prop=revisions&rvprop=content&rvslots=%2A&titles=${props.item.title}&format=json&origin=*`;
    const response = await axios.get(url, { data: { https: false } }); // Disable HTTPS verification
    const articleExists =
      response.data?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content;
    console.log(articleExists);*/

    if (articleId.value) {
      console.log('article exists');
      console.log(props.item);
      // GOTO ARTICLE PAGE
      router.push({
        name: 'article',
        params: { articleId: articleId.value },
      });
    } else {
      console.log("article doesn't exist");

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
      localStorage.setItem(
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
