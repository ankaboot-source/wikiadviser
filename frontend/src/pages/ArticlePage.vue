<template>
  <template v-if="article">
    <q-tabs
      v-model="tab"
      dense
      class="q-px-md q-pt-sm"
      active-color="primary"
      indicator-color="primary"
      align="left"
    >
      <q-tab
        v-if="article.title && article.permission_id && editorPermission"
        name="editor"
        label="editor"
      />
      <q-tab name="changes" label="changes" :disable="!changesList.length">
        <q-tooltip v-if="!changesList.length">
          There are currently no changes.
        </q-tooltip>
      </q-tab>
      <q-space />
      <q-btn
        v-if="role != UserRole.Viewer"
        icon="link"
        color="primary"
        outline
        label="Share link"
        no-caps
        class="q-mr-xs"
        @click="copyShareLinkToClipboard()"
      />
      <q-btn
        v-if="role != UserRole.Viewer"
        icon="o_group"
        color="primary"
        outline
        label="Share"
        no-caps
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
          class="col-10 rounded-borders q-pa-md bg-secondary borders q-pt-sm"
        />
      </q-tab-panel>
      <q-tab-panel name="changes" class="row justify-evenly q-pt-sm">
        <diff-list
          :role="role"
          :changes-list="changesList"
          class="col q-mr-md rounded-borders q-pa-md bg-secondary borders"
        />
        <diff-card
          :changes-content="changesContent"
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
  getArticleParsedContent,
  getArticles,
  getChanges,
  getUsers,
} from 'src/api/supabaseHelper';
import DiffCard from 'src/components/DiffCard.vue';
import DiffList from 'src/components/DiffList/DiffList.vue';
import MwVisualEditor from 'src/components/MwVisualEditor.vue';
import ShareCard from 'src/components/ShareCard.vue';
import { Article, ChangesItem, UserRole } from 'src/types';
import { computed, onBeforeMount, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const { params } = route;

const articleId = ref('');
const share = ref(false);
const role = ref<UserRole>(UserRole.Viewer);
const article = ref<Article>();
const articles = ref<Article[] | null>([]);
const users = ref();
const editorPermission = ref(false);
const tab = ref();
const changesList = ref<ChangesItem[]>([]);
const changesContent = ref('');

onBeforeMount(async () => {
  const { data } = await supabase.auth.getSession();
  // Access the article id parameter from the route's params object
  articleId.value = params.articleId as string;
  articles.value = await getArticles(data.session!.user.id);

  article.value = articles.value?.find((article: Article) => {
    return article.article_id === articleId.value;
  });
  if (!article.value) {
    // In case this article exists, a permission request will be sent to the Owner.
    try {
      await createNewPermission(articleId.value, data.session!.user.id);
    } catch (error) {
      // Article does not exist or Another error
      router.push('404');
    }
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

  const currentTabParam = ref(params.tab);
  await fetchChanges();

  const tabSelected = computed(() => {
    if (currentTabParam.value === 'editor') {
      if (editorPermission.value) {
        // editorParam & editorPerm -> Editor
        return 'editor';
      }
      // editorParam & !editorPerm -> Changes
      return 'changes';
    }

    if (currentTabParam.value === 'changes') {
      if (changesList.value.length) {
        // changeParam & changeLength -> Changes
        return 'changes';
      }
      if (editorPermission.value) {
        // changeParam & !changeLength & editorPerm -> Editor
        return 'editor';
      }
      // changeParam & !changeLength & !editorPerm -> Changes (Empty state)
      return 'changes';
    }

    // !changeParam & !editorParam -> Changes (Default)
    return 'changes';
  });

  tab.value = tabSelected.value;

  watch(
    route,
    (newRoute) => {
      if (
        newRoute.params.tab !== currentTabParam.value &&
        ['changes', 'editor'].includes(newRoute.params.tab as string)
      ) {
        currentTabParam.value = newRoute.params.tab;
        tab.value = tabSelected.value;
      }
    },
    { immediate: true }
  );

  watch(
    tab,
    (newTab) => {
      if (['changes', 'editor'].includes(newTab)) {
        router.push({ params: { tab: newTab } });
      }
    },
    { immediate: true }
  );
});

const pollTimer = ref();
async function fetchChanges() {
  try {
    const updatedChangesList = await getChanges(articleId.value);
    if (
      JSON.stringify(changesList.value) !== JSON.stringify(updatedChangesList)
    ) {
      changesList.value = updatedChangesList;
      changesContent.value = await getArticleParsedContent(articleId.value);
    }
  } catch (error) {
    console.error(error);
  } finally {
    // Call fetchChanges again after the request completes to implement long polling
    pollTimer.value = setTimeout(() => fetchChanges(), 2000);
  }
}

onBeforeUnmount(() => {
  clearTimeout(pollTimer.value);
});

async function copyShareLinkToClipboard() {
  await copyToClipboard(
    `${window.location.origin}/articles/${route.params.articleId}`
  );
  $q.notify({
    message: 'Share link copied to clipboard',
    color: 'positive',
    icon: 'content_copy',
  });
}
</script>
