<template>
  <template v-if="article">
    <q-tabs
      v-model="tab"
      dense
      class="q-px-md"
      active-color="primary"
      indicator-color="primary"
      align="left"
    >
      <q-tab v-if="editPermission" name="editor" label="editor" />
      <q-tab name="changes" label="changes" />
      <q-space />
      <q-btn
        icon="link"
        color="primary"
        outline
        label="share"
        @click="share = !share"
      >
      </q-btn>
      <q-dialog v-model="share">
        <share-card :article-id="articleId" :role="article.role" />
      </q-dialog>
    </q-tabs>
    <q-tab-panels v-model="tab" class="col">
      <q-tab-panel name="editor" class="row justify-evenly">
        <mw-visual-editor
          v-if="article.title && article.permission_id"
          :article="article"
          class="col-10 rounded-borders q-pa-md bg-secondary borders"
        />
      </q-tab-panel>
      <q-tab-panel name="changes" class="row justify-evenly">
        <diff-list
          :edit-permission="editPermission"
          :article-id="articleId"
          class="col q-mr-md rounded-borders q-pa-md bg-secondary borders"
        />
        <diff-card
          :article-id="articleId"
          class="col-9 rounded-borders q-py-md q-pl-md bg-secondary borders"
        />
      </q-tab-panel>
    </q-tab-panels>
  </template>
</template>

<script setup lang="ts">
import MwVisualEditor from 'src/components/MwVisualEditor.vue';
import DiffCard from 'src/components/DiffCard.vue';
import DiffList from 'src/components/DiffList/DiffList.vue';
import ShareCard from 'src/components/ShareCard.vue';
import { onBeforeMount, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useRouter } from 'vue-router';
import { createNewPermission, getArticles } from 'src/api/supabaseHelper';
import supabase from 'src/api/supabase';
import { useQuasar } from 'quasar';
import { Article } from 'src/types';

const $q = useQuasar();
const route = useRoute();

const router = useRouter();
const tab = ref('');
const articleId = ref('');
const share = ref(false);
const editPermission = ref(false);
const article = ref();
onBeforeMount(async () => {
  const { data } = await supabase.auth.getSession();

  // Access the article title parameter from the route's params object
  articleId.value = route.params.articleId as string;
  // Access the selected tab else 'changes' tab
  tab.value = route.params.tab ? (route.params.tab as string) : 'changes';

  const articles = await getArticles(data.session!.user.id);
  $q.localStorage.set('articles', JSON.stringify(articles));
  if (articles) {
    article.value = articles.find((article: Article) => {
      return article.article_id === articleId.value;
    });
    if (article.value) {
      editPermission.value = article.value.role == 0 || article.value.role == 1;
    }
  }
  if (!article.value) {
    //In case this article exists, a permission request will be sent to the Owner.
    await createNewPermission(articleId.value, data.session!.user.id);
    router.push({
      name: 'ArticleNotFound',
    });
  }
});
</script>
