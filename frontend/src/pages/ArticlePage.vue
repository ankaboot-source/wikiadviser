<template>
  <template v-if="article">
    <div v-if="loading">
      <!-- Loading state content -->
    </div>
    <div v-else class="q-panel scroll col">
      <div class="row justify-evenly q-pa-sm">
        <diff-card
          :article="article"
          :changes-content="changesContent"
          :role="role"
          :editor-permission="editorPermission"
          class="col-9 q-mr-md"
        />
        <diff-list
          :role="role"
          :changes-list="changesList"
          class="col rounded-borders q-pt-sm q-mt-xs bg-secondary borders"
        />
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import supabase from 'src/api/supabase';
import {
  createNewPermission,
  getArticleParsedContent,
  getChanges,
  getUsers,
} from 'src/api/supabaseHelper';
import DiffCard from 'src/components/DiffCard.vue';
import DiffList from 'src/components/DiffList/DiffList.vue';
import { Article, ChangesItem, UserRole } from 'src/types';
import { onBeforeMount, onBeforeUnmount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useArticlesStore } from 'src/stores/useArticlesStore';

const route = useRoute();
const router = useRouter();
const articlesStore = useArticlesStore();

const { params } = route;

const users = ref();

const article = ref<Article>();
const articleId = ref('');

const role = ref<UserRole>(UserRole.Viewer);
const editorPermission = ref<boolean | null>(null);

const changesList = ref<ChangesItem[]>([]);
const changesContent = ref<string | null>(null);

const loading = ref(true);

let pollTimer: number;

async function fetchChanges() {
  try {
    const updatedChangesList = (await getChanges(articleId.value)) ?? [];

    if (
      JSON.stringify(changesList.value) !== JSON.stringify(updatedChangesList)
    ) {
      changesList.value = updatedChangesList;
      changesContent.value = await getArticleParsedContent(articleId.value);
    }
    if (!changesList.value.length) {
      changesContent.value = '';
    }
  } catch (error) {
    console.error(error);
  }
}

onBeforeMount(async () => {
  const { data } = await supabase.auth.getSession();
  // Access the article id parameter from the route's params object
  articleId.value = params.articleId as string;
  await articlesStore.fetchArticles(data.session!.user.id);
  article.value = articlesStore.getArticleById(articleId.value);
  if (!article.value) {
    // In case this article exists, a permission request will be sent to the Owner.
    try {
      await createNewPermission(articleId.value, data.session!.user.id);
    } catch (error) {
      // Article does not exist or Another error
      router.push('404');
    }
    // Get updated articles
    await articlesStore.fetchArticles(data.session!.user.id);
    if (articlesStore.articles) {
      article.value = articlesStore.getArticleById(articleId.value);
    }
  }
  if (article.value) {
    role.value = article.value.role;
    users.value = await getUsers(articleId.value);
    editorPermission.value =
      article.value.role === UserRole.Editor ||
      article.value.role === UserRole.Owner;
  }

  await fetchChanges();
  // keep calling fetchChanges to implement long polling
  pollTimer = window.setInterval(async () => {
    await fetchChanges();
  }, 2000);
  loading.value = false;
});

onBeforeUnmount(() => {
  clearInterval(pollTimer);
});
</script>
