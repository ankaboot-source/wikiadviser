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
            <div class="title-wrapper">
              <template v-if="!isEditingTitle && !isEditingDescription">
                <div class="title-row">
                  <span class="text-content">
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

                <div class="description-row description-container">
                  <span
                    v-if="article.description"
                    class="text-caption text-grey-7 text-content"
                  >
                    {{ article.description }}
                  </span>
                  <span
                    v-else
                    class="text-caption text-grey-5 text-italic text-content"
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
                  input-class="text-h6 text-weight-medium"
                  class="edit-field"
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
                  input-class="text-caption"
                  class="edit-field"
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

  const success = await articlesStore.renameArticle(
    article.value.article_id,
    editedTitle.value,
  );

  if (success) {
    $q.notify({ message: 'Article renamed', color: 'positive', icon: 'edit' });
  }

  isEditingTitle.value = false;
}

async function saveDescription() {
  if (!article.value || editedDescription.value === article.value.description) {
    isEditingDescription.value = false;
    return;
  }

  const success = await articlesStore.renameDescription(
    article.value.article_id,
    editedDescription.value,
  );

  if (success) {
    $q.notify({
      message: 'Description updated',
      color: 'positive',
      icon: 'edit',
    });
  }

  isEditingDescription.value = false;
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

.title-wrapper {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  max-width: 45vw;
  width: 100%;
  overflow: hidden;
}

.title-row {
  position: relative;
  font-size: 1.25rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: font-size 0.15s ease;
}

.title-row:hover,
.description-row:hover ~ .title-row,
.title-wrapper:hover .title-row {
  font-size: 1.5rem;
}

.description-row {
  position: relative;
  font-size: 0.8rem;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: font-size 0.15s ease;
}

.title-text,
.description-text {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title-row .q-icon,
.description-row .q-icon {
  flex-shrink: 0;
}

.hover-visible {
  opacity: 0;
  transition: opacity 0.2s;
  display: inline-block;
  vertical-align: middle;
}

.title-row:hover .hover-visible,
.description-row:hover .hover-visible {
  opacity: 1;
}

.description-container {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  transition:
    opacity 0.15s,
    max-height 0.15s;
}

.title-wrapper:hover .description-container {
  opacity: 1;
  max-height: 30px;
}

.edit-field {
  margin: 0 !important;
  padding: 0 !important;
  min-height: 0 !important;
  line-height: 1.2;
}

.edit-field :deep(.q-field__control) {
  padding: 0 !important;
  min-height: auto !important;
  height: auto !important;
}

.edit-field :deep(.q-field__marginal) {
  height: auto !important;
}

.edit-field :deep(.q-field__native) {
  padding: 0px 0 !important;
  min-height: auto !important;
}

.edit-field :deep(.q-field__control:before) {
  border-color: #999 !important;
}

.edit-field :deep(.q-field__control:hover:before) {
  border-color: #000 !important;
}

.edit-field :deep(.q-field__control:after) {
  border-color: var(--q-primary) !important;
}
</style>
