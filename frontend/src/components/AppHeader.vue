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
            <div class="ellipsis">
              {{ article.title }}
            </div>
          </q-breadcrumbs-el>
          <q-icon v-if="article?.web_publication" name="public">
            <q-tooltip>This article is published on the Web</q-tooltip>
          </q-icon>
        </q-breadcrumbs>
      </q-toolbar-title>
      <q-space />
      <q-toggle
        v-if="article && activeViewMode === 'edit' && !$q.screen.lt.md"
        v-model="focusModeStore.isFocusMode"
        icon="visibility"
        checked-icon="fullscreen"
      />
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
const isFocusMode = computed(() => focusModeStore.isFocusMode);
const activeViewMode = computed(() => focusModeStore.activeViewMode);
const focusModeToggle = ref(false);

const { $resetUser } = useUserStore();
const userStore = useUserStore();
const user = computed(() => userStore.user);
const avatarURL = computed(() => user.value?.avatar_url);

const name = computed(() => userStore.name);

watch([useRoute(), articles], ([newRoute]) => {
  const articleId = newRoute.params?.articleId;
  if (newRoute.params?.articleId) {
    article.value = articlesStore.getArticleById(articleId as string);
  } else {
    article.value = null;
    focusModeStore.toggleFocusMode();
    focusModeToggle.value = false;
  }
});

watch(isFocusMode, (newValue) => {
  focusModeToggle.value = newValue;
});

async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  $resetUser();
  await router.push('/auth');
  articlesStore.resetArticles();
  focusModeStore.$reset();
  focusModeToggle.value = false;
  $q.notify({ message: 'Signed out', icon: 'logout' });
}

function goToAccount() {
  router.push({
    path: '/account',
  });
}
</script>

<style>
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
}

.q-breadcrumbs > div {
  flex-wrap: nowrap;
}
</style>
