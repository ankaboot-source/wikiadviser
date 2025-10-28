<template>
  <div v-if="loading"></div>
  <div v-else-if="article" class="q-panel scroll col">
    <div
      class="diff-grid"
      :class="[
        $q.screen.gt.sm ? 'q-pa-md' : 'q-pa-sm',
        { 'focus-mode': isFocusMode },
      ]"
    >
      <diff-toolbar
        v-show="!isFocusMode"
        :article="article"
        :role="role"
        :editor-permission="editorPermission"
        :users="users"
        :button-toggle="buttonToggle"
        class="toolbar-area"
        @update:button-toggle="handleButtonToggleUpdate"
      />

      <diff-list
        v-show="isShowingDiffList && !isFocusMode"
        :article-id="articleId"
        :role="role"
        :changes-list="changesList"
        class="rounded-borders bg-secondary borders list-area"
      />

      <diff-card
        :article="article"
        :changes-content="changesContent"
        :role="role"
        :editor-permission="editorPermission"
        :button-toggle="buttonToggle"
        :users="users"
        :class="{ 'focus-mode-card': isFocusMode }"
        class="card-area"
        @update:button-toggle="handleButtonToggleUpdate"
      />
    </div>
  </div>
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
import DiffToolbar from 'src/components/Diff/DiffToolbar.vue';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { useUserStore } from 'src/stores/userStore';
import { useSelectedChangeStore } from 'src/stores/useSelectedChangeStore';
import { useActiveViewStore } from 'src/stores/useActiveViewStore';
import { ChangeItem, Comment, Enums, Profile, Tables, User } from 'src/types';
import { computed, onBeforeMount, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useQuasar } from 'quasar';
import { parseArticleHtml } from 'src/utils/parsing';

const route = useRoute();
const router = useRouter();
const articlesStore = useArticlesStore();
const userStore = useUserStore();
const selectedChangeStore = useSelectedChangeStore();
const focusModeStore = useActiveViewStore();
const $q = useQuasar();

const { params } = route;

const articleId = ref('');
const loading = ref(true);
const userId = computed(() => (userStore.user as Profile).id);
const users = ref<User[]>([]);
const changesList = ref<ChangeItem[]>([]);
const changesContent = ref<string | null>(null);
const realtimeChannel: RealtimeChannel = supabase.channel('db-changes');
const article = computed(() => articlesStore.getArticleById(articleId.value));
const editorPermission = computed(
  () => article.value?.role === 'editor' || article.value?.role === 'owner',
);
const role = computed<Enums<'role'>>(() => article.value?.role ?? 'viewer');
const isFocusMode = computed(() => focusModeStore.isFocusMode);

const buttonToggle = ref('');

const firstToggle = computed(() => {
  const emptyContent = !changesContent.value || !changesContent.value.length;
  return editorPermission.value && emptyContent ? 'edit' : 'view';
});

const isShowingDiffList = computed(() => {
  return buttonToggle.value !== 'edit' || $q.screen.gt.sm;
});

watch(
  firstToggle,
  (newToggle, oldToggle) => {
    if (oldToggle === 'edit') {
      return;
    }
    buttonToggle.value = newToggle;
    focusModeStore.setActiveViewMode(newToggle);
  },
  { immediate: true },
);

watch(
  () => selectedChangeStore.selectedChangeId,
  (selectedChangeId) => {
    if (selectedChangeId && buttonToggle.value === 'edit') {
      buttonToggle.value = 'view';
    }
  },
);

watch(isFocusMode, (newValue) => {
  if (newValue && buttonToggle.value !== 'edit') {
    buttonToggle.value = 'edit';
  }
});

function handleButtonToggleUpdate(value: string) {
  buttonToggle.value = value;
  focusModeStore.setActiveViewMode(value);
  if (value !== 'edit' && isFocusMode.value) {
    focusModeStore.toggleFocusMode();
  }
}

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
  focusModeStore.toggleFocusMode();
});
</script>

<style scoped>
.diff-grid {
  display: grid;
  width: 100%;
  height: calc(100vh - 3.5rem);
  gap: 0.5rem;
}
/* Desktop*/
.diff-grid.focus-mode {
  grid-template: 1fr / 1fr;
  grid-template-areas: 'card';
  padding: 0 !important;
  overflow-y: hidden;
}

.focus-mode-card {
  margin: 0 !important;
}

@media (min-width: 1700px) {
  .diff-grid {
    grid-template: auto 1fr / 1fr 0.3fr;
    grid-template-areas:
      'toolbar list'
      'card list';
  }
  .list-area {
    grid-area: list;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
  }
  .card-area {
    grid-area: card;
    margin-top: 0.5rem;
  }
}
@media (min-width: 1024px) and (max-width: 1699px) {
  .diff-grid {
    grid-template: auto 1fr / 1fr 400px;
    grid-template-areas:
      'toolbar list'
      'card list';
  }
  .list-area {
    grid-area: list;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
  }
  .card-area {
    grid-area: card;
    margin-top: 0.5rem;
  }
}
/*Mobile*/
@media (max-width: 1023px) {
  .diff-grid {
    grid-template: auto auto 1fr / 1fr;
    grid-template-areas:
      'toolbar'
      'list'
      'card';
    gap: 0;
    height: auto;
  }

  .list-area {
    max-height: 100vh;
    overflow-y: none;
    scrollbar-width: none;
  }

  .card-area {
    min-height: 100vh;
    margin-top: 0.3rem;
    overflow-y: none;
    scrollbar-width: none;
  }
}
.toolbar-area {
  grid-area: toolbar;
  margin-top: 0.25rem;
}
.list-area {
  grid-area: list;
}
.card-area {
  grid-area: card;
}
</style>
