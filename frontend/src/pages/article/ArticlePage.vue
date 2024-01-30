<template>
  <template v-if="article">
    <div v-if="loading">
      <!-- Loading state content -->
    </div>
    <div v-else class="q-panel scroll col">
      <div class="row justify-evenly q-pa-sm">
        <diff-card
          :article="article"
          :changes-content="activeChanges ? changesContent : null"
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
import { getParsedChanges, getUsers } from 'src/api/supabaseHelper';
import DiffCard from 'src/components/DiffCard.vue';
import DiffList from 'src/components/Diff/DiffList.vue';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { useUserStore } from 'src/stores/userStore';
import {
  ChangeItem,
  SupabaseArticle,
  SupabaseChange,
  UserRole,
} from 'src/types';
import { computed, onBeforeMount, onBeforeUnmount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

import { parseArticleHtml } from 'src/utils/parsing';

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
const cachedChanges = new Map<string, ChangeItem>();

const realtimeChannel: RealtimeChannel = supabase.channel('db-changes');

const article = computed(() => articlesStore.getArticleById(articleId.value));
const activeChanges = computed(
  () => changesList.value.map((item) => item?.hidden).length > 0,
);

function handleArticleRealtime(
  payload: RealtimePostgresChangesPayload<SupabaseArticle>,
) {
  const updatedArticle = payload.new as SupabaseArticle;

  if (!Object.keys(updatedArticle).length) {
    return;
  }

  changesContent.value = parseArticleHtml(
    updatedArticle.current_html_content as string,
    changesList.value,
  );
}

async function handleChangesRealtime(
  payload: RealtimePostgresChangesPayload<SupabaseChange>,
) {
  const event = payload.eventType;
  const oldChange = payload.old as SupabaseChange;
  const newChange = payload.new as SupabaseChange;

  if (!Object.keys(oldChange).length && !Object.keys(newChange).length) {
    return;
  }

  if (event === 'DELETE') {
    cachedChanges.delete(oldChange.id);
  } else {
    const [change] = await getParsedChanges(newChange.id, true);
    cachedChanges.set(newChange.id, change);
  }

  changesList.value = Array.from(cachedChanges.values());
  changesContent.value = parseArticleHtml(
    changesContent.value as string,
    changesList.value,
  );
}

onBeforeMount(async () => {
  await useUserStore().updateProfile();
  const { user } = useUserStore();
  // Access the article id parameter from the route's params object
  const { articleId: articleIdFromParams } = params;
  articleId.value = articleIdFromParams as string;

  await articlesStore.fetchArticles(user?.id as string);

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

  changesList.value = await getParsedChanges(articleId.value);
  changesContent.value = parseArticleHtml(
    (
      await supabase
        .from('articles')
        .select('current_html_content')
        .eq('id', articleId.value)
        .single()
    ).data?.current_html_content,
    changesList.value,
  );

  realtimeChannel
    .on<SupabaseArticle>(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'articles',
        filter: `id=eq.${articleId.value}`,
      },
      handleArticleRealtime,
    )
    .on<SupabaseChange>(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'changes',
        filter: `article_id=eq.${articleId.value}`,
      },
      handleChangesRealtime,
    )
    .subscribe();

  loading.value = false;
});

onBeforeUnmount(() => {
  realtimeChannel.unsubscribe();
});
</script>
