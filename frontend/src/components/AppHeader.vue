<template>
  <q-header class="text-black text-left bg-secondary">
    <q-toolbar>
      <q-toolbar-title class="col-9 col-shrink">
        <q-breadcrumbs class="merriweather">
          <q-breadcrumbs-el
            v-if="!article?.title || !$q.screen.lt.md"
            class="no-wrap"
            label="WikiAdviser"
            icon="img:/icons/logo.svg"
            to="/"
          />
          <q-breadcrumbs-el v-if="article?.title">
            <div class="column" style="max-width: 45vw">
              <template v-if="!isEditingTitle && !isEditingDescription">
                <div class="row items-center no-wrap title-row">
                  <span class="text-h6 text-weight-medium ellipsis">
                    {{ article.title }}
                  </span>
                  <q-icon
                    v-if="user"
                    name="edit"
                    size="16px"
                    class="cursor-pointer hover-visible q-ml-xs"
                    @click="enableTitleEdit"
                  />
                </div>
                <div class="row items-center no-wrap description-container">
                  <span
                    v-if="article.description"
                    class="text-caption text-grey-7 ellipsis"
                  >
                    {{ article.description }}
                  </span>
                  <span
                    v-else
                    class="text-caption text-grey-5 text-italic ellipsis"
                  >
                    Add a description
                  </span>
                  <q-icon
                    v-if="user"
                    name="edit"
                    size="14px"
                    class="cursor-pointer hover-visible q-ml-xs"
                    @click="enableDescriptionEdit"
                  />
                </div>
              </template>

              <template v-else-if="isEditingTitle">
                <q-input
                  v-model="editedTitle"
                  dense
                  hide-bottom-space
                  input-class="text-h6 text-weight-medium"
                  autofocus
                  @keyup.enter="saveTitle"
                  @keyup.esc="cancelEdit"
                  @blur="saveTitle"
                />
              </template>

              <template v-else-if="isEditingDescription">
                <q-input
                  v-model="editedDescription"
                  type="textarea"
                  autogrow
                  dense
                  hide-bottom-space
                  input-class="text-caption"
                  autofocus
                  @keydown.enter.prevent="saveDescription"
                  @keyup.esc="cancelEdit"
                  @blur="saveDescription"
                />
              </template>
            </div>
          </q-breadcrumbs-el>
          <q-icon v-if="article?.web_publication" name="public">
            <q-tooltip>This article is published on the Web</q-tooltip>
          </q-icon>
        </q-breadcrumbs>
      </q-toolbar-title>
      <q-space />
      <q-toggle
        v-if="article && !$q.screen.lt.md"
        v-model="focusModeStore.isFocusMode"
        icon="center_focus_weak"
        size="lg"
      >
        <q-tooltip> distraction-free editing mode </q-tooltip>
      </q-toggle>

      <NotificationsBell v-if="user && !$q.screen.lt.md" />
      <q-btn
        v-if="user && !$q.screen.lt.md"
        no-caps
        unelevated
        @click="goToAccount"
      >
        <user-component
          :avatar-url="avatarURL"
          :name="name!"
          section="profile"
        />
      </q-btn>
      <q-btn
        v-if="user && !$q.screen.lt.md"
        clickable
        icon="logout"
        no-caps
        unelevated
        @click="signOut()"
      />
      <q-btn
        v-if="user && $q.screen.lt.md"
        flat
        dense
        round
        icon="menu"
        @click="showDrawer = true"
      />
    </q-toolbar>
  </q-header>
  <q-drawer
    v-if="user"
    v-model="showDrawer"
    side="right"
    behavior="mobile"
    overlay
    :width="$q.screen.width"
    :content-style="{ display: 'flex', flexDirection: 'column' }"
  >
    <q-toolbar class="bg-secondary text-black flex-no-grow">
      <q-toolbar-title>
        <q-breadcrumbs class="merriweather">
          <q-breadcrumbs-el
            class="no-wrap"
            label="WikiAdviser"
            icon="img:/icons/logo.svg"
            to="/"
          />
        </q-breadcrumbs>
      </q-toolbar-title>
      <q-btn flat dense round icon="close" @click="showDrawer = false" />
    </q-toolbar>
    <q-list class="flex-no-grow">
      <q-item
        clickable
        @click="
          goToAccount();
          showDrawer = false;
        "
      >
        <q-item-section avatar>
          <q-avatar>
            <img v-if="avatarURL" :src="avatarURL" />
            <q-icon v-else name="person" />
          </q-avatar>
        </q-item-section>
        <q-item-section>
          {{ name }}
        </q-item-section>
      </q-item>
    </q-list>
    <q-separator class="flex-no-grow" />
    <q-list class="flex-no-grow q-mb-lg">
      <q-item
        clickable
        @click="
          signOut();
          showDrawer = false;
        "
      >
        <q-item-section avatar>
          <q-icon name="logout" />
        </q-item-section>
        <q-item-section> Log out </q-item-section>
      </q-item>
    </q-list>
  </q-drawer>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import supabase from 'src/api/supabase';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { useUserStore } from 'src/stores/userStore';
import { useActiveViewStore } from 'src/stores/useActiveViewStore';
import { Article } from 'src/types';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NotificationsBell from './NotificationsBell.vue';
import UserComponent from './UserComponent.vue';
import {
  updateArticleDescription,
  updateArticleTitle,
} from 'src/api/supabaseHelper';

const router = useRouter();
const $q = useQuasar();

const showDrawer = ref(false);

const article = ref<Article | null>();
const articlesStore = useArticlesStore();
const articles = computed(() => articlesStore.articles);

const focusModeStore = useActiveViewStore();

const { $resetUser } = useUserStore();
const userStore = useUserStore();
const user = computed(() => userStore.user);
const avatarURL = computed(() => user.value?.avatar_url);

const name = computed(() => userStore.name);

const isEditingTitle = ref(false);
const isEditingDescription = ref(false);
const editedTitle = ref('');
const editedDescription = ref('');

watch(article, (newArticle) => {
  editedTitle.value = newArticle?.title || '';
});

watch([useRoute(), articles], ([newRoute]) => {
  const articleId = newRoute.params?.articleId;
  if (newRoute.params?.articleId) {
    article.value = articlesStore.getArticleById(articleId as string);
  } else {
    article.value = null;
    focusModeStore.isFocusMode = false;
  }
});

function enableTitleEdit() {
  editedTitle.value = article.value?.title || '';
  isEditingTitle.value = true;
}

function enableDescriptionEdit() {
  editedDescription.value = article.value?.description || '';
  isEditingDescription.value = true;
}

async function saveTitle() {
  if (!article.value || editedTitle.value === article.value.title) {
    isEditingTitle.value = false;
    return;
  }

  try {
    await updateArticleTitle(article.value.article_id, editedTitle.value);
    article.value.title = editedTitle.value;
    $q.notify({
      message: 'Article renamed',
      color: 'positive',
      icon: 'edit',
    });
  } catch (error) {
    console.error('Failed to rename article:', error);
  } finally {
    isEditingTitle.value = false;
  }
}

async function saveDescription() {
  if (!article.value || editedDescription.value === article.value.description) {
    isEditingDescription.value = false;
    return;
  }

  try {
    await updateArticleDescription(
      article.value.article_id,
      editedDescription.value,
    );
    article.value.description = editedDescription.value;
    $q.notify({
      message: 'Description updated',
      color: 'positive',
      icon: 'edit',
    });
  } catch (error) {
    console.error('Failed to update description:', error);
  } finally {
    isEditingDescription.value = false;
  }
}

function cancelEdit() {
  isEditingTitle.value = false;
  isEditingDescription.value = false;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  $resetUser();
  await router.push('/auth');
  articlesStore.resetArticles();
  focusModeStore.$reset();
  $q.notify({ message: 'Signed out', icon: 'logout' });
}

function goToAccount() {
  router.push({
    path: '/account',
  });
}
</script>

<style scoped>
.q-breadcrumbs__el {
  text-decoration: none !important;
  color: black !important;
}

/* ellipsis */
.q-breadcrumbs--last,
.q-breadcrumbs__el {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  max-width: 100%;
  min-width: 0;
}

.q-breadcrumbs > div {
  flex-wrap: nowrap;
}

.description-container {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  transition:
    opacity 0.15s,
    max-height 0.15s;
}

.column:hover .description-container {
  opacity: 1;
  max-height: 30px;
}

.hover-visible {
  opacity: 0;
  transition: opacity 0.2s;
}

.title-row:hover .hover-visible,
.description-container:hover .hover-visible {
  opacity: 1;
}
</style>
