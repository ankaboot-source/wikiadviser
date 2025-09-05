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
          :users
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
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import supabase from 'src/api/supabase';
import {
  getParsedChanges,
  getUsers,
  isArticleExists,
} from 'src/api/supabaseHelper';
import DiffList from 'src/components/Diff/DiffList.vue';
import DiffCard from 'src/components/DiffCard.vue';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { useUserStore } from 'src/stores/userStore';
import { ChangeItem, Comment, Enums, Profile, Tables, User } from 'src/types';
import { computed, onBeforeMount, onBeforeUnmount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useQuasar } from 'quasar';
import { parseArticleHtml } from 'src/utils/parsing';

const route = useRoute();
const router = useRouter();
const articlesStore = useArticlesStore();
const userStore = useUserStore();

const { params } = route;

const articleId = ref('');

const loading = ref(true);

const userId = computed(() => (userStore.user as Profile).id);
const users = ref<User[]>([]);
const $q = useQuasar();

const changesList = ref<ChangeItem[]>([]);
const changesContent = ref<string | null>(null);

const realtimeChannel: RealtimeChannel = supabase.channel('db-changes');

const article = computed(() => articlesStore.getArticleById(articleId.value));
const editorPermission = computed(
  () => article.value?.role === 'editor' || article.value?.role === 'owner',
);
const role = computed<Enums<'role'>>(() => article.value?.role ?? 'viewer');

const activeChanges = computed(
  () => changesList.value.map((item) => item?.hidden).length > 0,
);

async function handleArticleRealtime(
  payload: RealtimePostgresChangesPayload<Tables<'articles'>>,
) {
  const updatedArticle = payload.new as Tables<'articles'>;

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
  payload: RealtimePostgresChangesPayload<Tables<'changes'>>,
) {
  const newChange = payload.new as Tables<'changes'>;
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
      ).data as Profile;
      change.comments.push(insertedComment);
      break;
    }
  }
}

async function handlePermissionsRealtime(
  payload: RealtimePostgresChangesPayload<Tables<'permissions'>>,
) {
  if (payload.eventType === 'INSERT') {
    users.value = await getUsers(articleId.value);
  }

  if (payload.eventType === 'UPDATE') {
    const updatedPermission = payload.new as Tables<'permissions'>;
    const userToUpdate = users.value.find(
      (user) => user.permissionId === updatedPermission.id,
    );
    if (!userToUpdate || !updatedPermission.role) {
      return;
    }
    userToUpdate.role = updatedPermission.role;
    // If current user's own role is updated
    if (updatedPermission.user_id === userId.value && article.value) {
      article.value.role = updatedPermission.role;
      $q.notify({
        message: `Your role was updated to ${role.value}`,
        icon: 'check',
        color: 'positive',
      });
    }
  }

  if (payload.eventType === 'DELETE') {
    users.value = users.value.filter(
      (user) => user.permissionId !== payload.old.id,
    );

    // If current user's own role is removed
    if (!users.value.find((user) => user.id === userId.value)) {
      await articlesStore.fetchArticles(userId.value);
      $q.notify({
        type: 'warning',
        message: 'Your were removed from the article',
      });
      router.push('/');
    }
  }
}

onBeforeMount(async () => {
  await userStore.fetchProfile();

  // Access the article id parameter from the route's params object
  const { articleId: articleIdFromParams } = params;

  articleId.value = articleIdFromParams as string;
  users.value = await getUsers(articleId.value);
  await articlesStore.fetchArticles(userId.value);

  if (!article.value) {
    const isArticle = await isArticleExists(articleId.value);

    if (!isArticle) {
      // Article does not exist
      router.push({ name: '404' });
      return;
    }

    // Article does not exist for this user
    router.push({ name: '403' });
    return;
  }

  changesList.value = await getParsedChanges(articleId.value);
  changesContent.value = parseArticleHtml(
    (
      await supabase
        .from('articles')
        .select('current_html_content')
        .eq('id', articleId.value)
        .single()
    ).data?.current_html_content as string,
    changesList.value,
  );

  realtimeChannel
    .on<Tables<'articles'>>(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'articles',
        filter: `id=eq.${articleId.value}`,
      },
      handleArticleRealtime,
    )
    .on<Tables<'changes'>>(
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
    .on<Tables<'permissions'>>(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'permissions',
        filter: `article_id=eq.${articleId.value}`,
      },
      handlePermissionsRealtime,
    )
    .subscribe();

  loading.value = false;
});

onBeforeUnmount(() => {
  realtimeChannel.unsubscribe();
});
</script>
