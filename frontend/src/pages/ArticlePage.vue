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
      <q-tab v-if="editorPermission" name="editor" label="editor" />
      <q-tab name="changes" label="changes" />
      <q-space />
      <q-btn
        v-if="role != UserRole.Viewer"
        icon="link"
        color="primary"
        outline
        class="q-mr-xs"
        label="share link"
        @click="copyValueToClipboard()"
      />
      <q-btn
        v-if="role != UserRole.Viewer"
        icon="o_group"
        color="primary"
        outline
        label="share"
        class="q-pr-lg"
        @click="share = !share"
      />
      <q-dialog v-model="share">
        <share-card :article-id="articleId" :role="article.role" />
      </q-dialog>
    </q-tabs>
    <q-tab-panels v-model="tab" class="col">
      <q-tab-panel
        v-if="article.title && article.permission_id && editorPermission"
        name="editor"
        class="row justify-evenly"
      >
        <mw-visual-editor
          :article="article"
          class="col-10 rounded-borders q-pa-md bg-secondary borders"
        />
      </q-tab-panel>
      <q-tab-panel name="changes" class="row justify-evenly">
        <diff-list
          :role="role"
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
import { copyToClipboard, useQuasar } from 'quasar';
import supabase from 'src/api/supabase';
import {
  createNewPermission,
  getArticles,
  getUsers,
} from 'src/api/supabaseHelper';
import DiffCard from 'src/components/DiffCard.vue';
import DiffList from 'src/components/DiffList/DiffList.vue';
import MwVisualEditor from 'src/components/MwVisualEditor.vue';
import ShareCard from 'src/components/ShareCard.vue';
import { Article, UserRole } from 'src/types';
import { onBeforeMount, ref } from 'vue';
import { useRoute } from 'vue-router';

const $q = useQuasar();
const route = useRoute();

const tab = ref('');
const articleId = ref('');
const share = ref(false);
const editorPermission = ref(false);
const role = ref<UserRole>(UserRole.Viewer);
const article = ref<Article>();
const articles = ref<Article[] | null>([]);
const users = ref();

onBeforeMount(async () => {
  const { data } = await supabase.auth.getSession();
  // Access the article id parameter from the route's params object
  articleId.value = route.params.articleId as string;
  articles.value = await getArticles(data.session!.user.id);
  if (articles.value) {
    article.value = articles.value.find((article: Article) => {
      return article.article_id === articleId.value;
    });
    if (!article.value) {
      // In case this article exists, a permission request will be sent to the Owner.
      await createNewPermission(articleId.value, data.session!.user.id);
      // Get updated articles
      const articles = await getArticles(data.session!.user.id);
      if (articles) {
        article.value = articles.find((article: Article) => {
          return article.article_id === articleId.value;
        });
      }
    }
    if (article.value) {
      role.value = article.value.role;
      users.value = await getUsers(articleId.value);
      editorPermission.value =
        article.value.role === UserRole.Editor ||
        article.value.role === UserRole.Owner;
      $q.localStorage.set('articles', JSON.stringify(articles));
    }
  }
  // Access the selected 'editor' tab if editorPermission else 'changes' tab
  tab.value =
    route.params.tab === 'editor' && editorPermission.value
      ? 'editor'
      : 'changes';
});

async function copyValueToClipboard() {
  await copyToClipboard(window.location.href);
  $q.notify({
    message: 'Share link copied to clipboard',
    color: 'positive',
    icon: 'content_copy',
  });
}
</script>
