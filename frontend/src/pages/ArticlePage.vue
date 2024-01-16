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
          :article-id="articleId"
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
import { getChanges, getUsers } from 'src/api/supabaseHelper';
import DiffCard from 'src/components/DiffCard.vue';
import DiffList from 'src/components/DiffList/DiffList.vue';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { ChangeItem, SupabaseArticle, UserRole } from 'src/types';
import { computed, onBeforeMount, onBeforeUnmount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

const route = useRoute();
const router = useRouter();
const articlesStore = useArticlesStore();

const { params } = route;

const users = ref();
const articleId = ref('');
const loading = ref(true);

const role = ref<UserRole>(UserRole.Viewer);
const editorPermission = ref<boolean | null>(null);
const changesList = ref<ChangeItem[]>([]);
const changesContent = ref<string | null>(null);

const article = computed(() => articlesStore.getArticleById(articleId.value));

const realtimeChannel: RealtimeChannel = supabase.channel('changes');

function initializeRealtimeSubscription(
  channel: RealtimeChannel,
  articleId: string,
) {
  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'articles',
        filter: `id=eq.${articleId}`,
      },
      async (payload: RealtimePostgresChangesPayload<SupabaseArticle>) => {
        const updatedArticle = payload.new as SupabaseArticle;

        changesList.value = await getChanges(articleId);
        changesContent.value = changesList.value.length
          ? updatedArticle.current_html_content
          : '';
      },
    )
    .subscribe();
}

onBeforeMount(async () => {
  const user = (await supabase.auth.getSession()).data.session?.user;

  if (!user) {
    router.push('/');
    return;
  }

  // Access the article id parameter from the route's params object
  const { articleId: articleIdFromParams } = params;
  articleId.value = articleIdFromParams as string;

  await articlesStore.fetchArticles(user.id);

  if (!article.value) {
    // Article does not exist for this user
    router.push({ name: '404' });
    return;
  }

  role.value = article.value.role;
  users.value = await getUsers(articleId.value);
  editorPermission.value =
    article.value.role === UserRole.Editor ||
    article.value.role === UserRole.Owner;

  changesList.value = await getChanges(articleId.value);
  changesContent.value = (
    await supabase
      .from('articles')
      .select('current_html_content')
      .eq('id', articleId.value)
      .single()
  ).data?.current_html_content;

  initializeRealtimeSubscription(realtimeChannel, articleId.value);

  loading.value = false;
});

onBeforeUnmount(() => {
  realtimeChannel.unsubscribe();
});
</script>
