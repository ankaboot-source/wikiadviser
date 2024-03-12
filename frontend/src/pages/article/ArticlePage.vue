<template>
  <template v-if="article">
    <div v-if="loading">
      <!-- Loading state content -->
    </div>
    <div v-else class="q-panel scroll col">
      <div class="row justify-evenly q-pa-sm">
        <diff-card :article="article" :changes-content="activeChanges ? changesContent : null" :role="role"
          :editor-permission="editorPermission" class="col-9 q-mr-md" />
        <diff-list :article-id="articleId" :role="role" :changes-list="changesList"
          class="col rounded-borders q-pt-sm q-mt-xs bg-secondary borders" />
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import supabase from 'src/api/supabase';
import {
  getParsedChanges,
  getUsers,
  isArticleHere,
} from 'src/api/supabaseHelper';
import DiffCard from 'src/components/DiffCard.vue';
import DiffList from 'src/components/Diff/DiffList.vue';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { useUserStore } from 'src/stores/userStore';
import {
  ChangeItem,
  Comment,
  Profile,
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

const realtimeChannel: RealtimeChannel = supabase.channel('db-changes');

const article = computed(() => articlesStore.getArticleById(articleId.value));
const activeChanges = computed(
  () => changesList.value.map((item) => item?.hidden).length > 0,
);

async function handleArticleRealtime(
  payload: RealtimePostgresChangesPayload<SupabaseArticle>,
) {
  const updatedArticle = payload.new as SupabaseArticle;

  if (!Object.keys(updatedArticle).length) {
    return;
  }

  changesList.value = await getParsedChanges(articleId.value);
  changesContent.value = parseArticleHtml(
    updatedArticle.current_html_content as string,
    changesList.value,
  );
}

async function handleChangeRealtime(
  payload: RealtimePostgresChangesPayload<SupabaseChange>,
) {
  const newChange = payload.new as SupabaseChange;
  const oldChangeIndex = changesList.value.find(
    (change) => change.id === newChange.id,
  )?.index;

  if (oldChangeIndex !== newChange.index) {
    return;
  }

  changesList.value = await getParsedChanges(articleId.value);
  changesContent.value = parseArticleHtml(
    changesContent.value as string,
    changesList.value,
  );
}

async function handleCommentRealtime(
  payload: RealtimePostgresChangesPayload<Comment>,
) {
  const insertedComment = payload.new as Comment;
  for (const change of changesList.value) {
    if (change.id === insertedComment.change_id) {
      insertedComment.user = (
        await supabase
          .from('profiles')
          .select()
          .eq('id', insertedComment.commenter_id)
          .single()
      ).data;
      change.comments.push(insertedComment);
      break;
    }
  }
}

onBeforeMount(async () => {
  const user = (await useUserStore().fetchProfile()) as Profile;
  // Access the article id parameter from the route's params object
  const { articleId: articleIdFromParams } = params;

  articleId.value = articleIdFromParams as string;

  await articlesStore.fetchArticles(user.id);

  if (!article.value) {
    const isArticle = await isArticleHere(articleId.value);

    if (!isArticle) {
      // Article does not exist
      router.push({ name: '404' });
      return;
    }

    // Article does not exist for this user
    router.push({ name: '403' });
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
        event: 'UPDATE',
        schema: 'public',
        table: 'changes',
        filter: `article_id=eq.${articleId.value}`,
      },
      handleChangeRealtime,
    )
    .on<Comment>(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `article_id=eq.${articleId.value}`,
      },
      handleCommentRealtime,
    )
    .subscribe();

  loading.value = false;
});

onBeforeUnmount(() => {
  realtimeChannel.unsubscribe();
});
</script>
