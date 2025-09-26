<template>
  <template v-if="article">
    <div v-if="loading">
      <!-- Loading state content -->
    </div>
    <div v-else class="q-panel scroll col">
      <!-- Desktop Layout (>= 1024px) -->
      <div
        class="desktop-layout row q-pa-sm gt-md"
        :class="{ 'sidebar-collapsed': sidebarCollapsed }"
      >
        <diff-card
          :article="article"
          :changes-content="activeChanges ? changesContent : null"
          :role="role"
          :editor-permission="editorPermission"
          :users="users"
          class="main-content-area q-mr-md"
        />
        <diff-list
          :article-id="articleId"
          :role="role"
          :changes-list="changesList"
          class="sidebar-area rounded-borders q-pt-sm q-mt-xs bg-secondary borders"
          @sidebar-collapsed="onSidebarCollapsed"
        />
      </div>

      <!-- Mobile Layout (< 1024px) -->
      <div class="column lt-lg mobile-container">
        <div class="mobile-toolbar-top q-pa-sm bg-white">
          <q-toolbar class="q-px-none">
            <q-btn-toggle
              v-model="buttonToggle"
              no-caps
              unelevated
              toggle-color="blue-grey-2"
              toggle-text-color="dark"
              text-color="dark"
              color="bg-secondary"
              class="borders"
              :options="mobileToggleOptions"
            />
            <q-space />
            <ReviewByMira
              :article="article"
              :hide-label="true"
              class="q-mr-sm"
            />
            <q-btn
  v-if="role != 'viewer'"
  icon="o_group"
  outline
  unelevated
  dense
  size="17.08px"
  class="borders"
  @click="shareDialog = !shareDialog"
>
  <q-dialog v-model="shareDialog">
    <share-card :article="article" :role="role" :users="users" />
  </q-dialog>
</q-btn>
          </q-toolbar>
        </div>

        <div class="mobile-changes-section">
          <diff-list
            :article-id="articleId"
            :role="role"
            :changes-list="changesList"
            :mobile-mode="true"
            class="rounded-borders bg-secondary borders"
          />
        </div>

        <div class="mobile-content-section col-grow">
          <diff-card
            :article="article"
            :changes-content="activeChanges ? changesContent : null"
            :role="role"
            :editor-permission="editorPermission"
            :users="users"
            :hide-toolbar="true"
            :mobile-button-toggle="buttonToggle"
            @toggle-edit-tab="onToggleEditTab"
            class="full-width full-height"
          />
        </div>
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
import ShareCard from 'src/components/Share/ShareCard.vue';
import ReviewByMira from 'src/components/ReviewByMira.vue';
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

const sidebarCollapsed = ref(false);

const shareDialog = ref(false);

const viewButton = {
  label: 'Review changes',
  value: 'view',
  icon: 'thumbs_up_down',
};
const editButton = {
  label: 'Edit article',
  value: 'edit',
  icon: 'edit',
};

const buttonToggle = ref('view');
const toggleOptions = computed(() =>
  !(
    article.value?.title &&
    article.value?.permission_id &&
    editorPermission.value
  )
    ? [viewButton]
    : [viewButton, editButton],
);

const mobileToggleOptions = computed(() =>
  toggleOptions.value.map((opt) => ({ ...opt, label: '' })),
);

let lastArticleUpdate = 0;
let lastChangeUpdate = 0;
let lastCommentUpdate = 0;
let lastPermissionsUpdate = 0;
let isSubscribed = false;

const onSidebarCollapsed = (collapsed: boolean) => {
  sidebarCollapsed.value = collapsed;
};

async function handleArticleRealtime(
  payload: RealtimePostgresChangesPayload<Tables<'articles'>>,
) {
  const now = Date.now();
  if (now - lastArticleUpdate < 1000) return;
  lastArticleUpdate = now;

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
  const now = Date.now();
  if (now - lastChangeUpdate < 1000) return;
  lastChangeUpdate = now;

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
  const now = Date.now();
  if (now - lastCommentUpdate < 1000) return;
  lastCommentUpdate = now;

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
  const now = Date.now();
  if (now - lastPermissionsUpdate < 1000) return;
  lastPermissionsUpdate = now;

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
    const oldRole = userToUpdate.role;
    userToUpdate.role = updatedPermission.role;
    // If current user's own role is updated
    if (updatedPermission.user_id === userId.value && article.value) {
      const newRole = updatedPermission.role;
      if (oldRole !== newRole) {
        article.value.role = newRole;
        $q.notify({
          message: `Your role was updated to ${newRole}`,
          icon: 'check',
          color: 'positive',
        });
      }
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

const onToggleEditTab = () => {
  buttonToggle.value = 'edit';
};

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

  const emptyContent = !changesContent.value || !changesContent.value.length;
  if (editorPermission.value && emptyContent) {
    buttonToggle.value = 'edit';
  }

  if (!isSubscribed) {
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
    isSubscribed = true;
  }

  loading.value = false;
});

onBeforeUnmount(() => {
  realtimeChannel.unsubscribe();
  isSubscribed = false;
});
</script>
<style>
/* Desktop Layout */
@media (min-width: 1024px) {
  .desktop-layout {
    height: 100vh;
    gap: 16px;
    align-items: stretch;
    justify-content: flex-start;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }
  
  .main-content-area {
    flex: 1;
    min-width: 0;
    margin-right: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .sidebar-area {
    flex: 0 0 400px;
    max-width: 400px;
    min-height: 100%;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }
  
  .sidebar-collapsed .sidebar-area {
  flex: 0 0 80px !important;
  max-width: 80px !important;
  min-width: 80px !important;
  overflow: hidden !important;
}
  
  .sidebar-collapsed .main-content-area {
    padding-right: 60px;
  }
}
/* Mobile Layout */
@media (max-width: 1023px) {
  .mobile-container {
    height: 100vh;
    overflow: hidden;
  }

  .mobile-toolbar-top {
    flex-shrink: 0;
    border-bottom: 1px solid #e0e0e0;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }

  .mobile-changes-section {
    flex-shrink: 0;
    min-height: 100px;
    max-height: 40vh;
    overflow-y: auto;
    margin: 8px;
    margin-bottom: 0;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .mobile-changes-section::-webkit-scrollbar {
    display: none;
  }

  .mobile-content-section {
    flex: 1;
    margin: 0 8px 8px 8px;
    margin-top: 0;
    overflow: hidden;
  }

  .mobile-content-section .full-height {
    height: 100%;
  }
}
</style>
