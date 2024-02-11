<template>
  <q-header class="text-black text-left bg-secondary">
    <q-toolbar>
      <q-toolbar-title>
        <q-breadcrumbs class="merriweather">
          <q-breadcrumbs-el
            label="WikiAdviser"
            icon="img:/icons/logo.svg"
            to="/"
          />
          <q-breadcrumbs-el
            v-if="article?.title"
            :label="article.title"
            to="."
            @click="$router.go(0)"
          />
          <q-icon v-if="article?.web_publication" name="public">
            <q-tooltip>This article is published on the Web</q-tooltip>
          </q-icon>
        </q-breadcrumbs>
      </q-toolbar-title>
      <q-space />
      <q-btn v-if="user" no-caps unelevated @click="account">
        <user-diff
          :avatar-url="avatarURL"
          :email="user.email"
          section="profile"
        />
      </q-btn>
      <q-btn
        v-if="user"
        clickable
        icon="logout"
        no-caps
        unelevated
        @click="signOut()"
      />
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import supabase from 'src/api/supabase';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { useUserStore } from 'src/stores/userStore';
import { Article } from 'src/types';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import UserDiff from './UserDiff.vue';

const router = useRouter();
const $q = useQuasar();

const article = ref<Article | null>();
const articlesStore = useArticlesStore();
const articles = computed(() => articlesStore.articles);

const { $resetUser } = useUserStore();
const user = computed(() => useUserStore().user);
const avatarURL = computed(() => user?.value?.avatar_url);

watch([useRoute(), articles], ([newRoute]) => {
  const articleId = newRoute.params?.articleId;
  if (newRoute.params?.articleId) {
    article.value = articlesStore.getArticleById(articleId as string);
  } else {
    article.value = null;
  }
});

async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    $resetUser();
    await router.push('/auth');
    articlesStore.resetArticles();
    $q.notify({ message: 'Signed out', icon: 'logout' });
  } catch (error) {
    console.error(error);
  }
}

function account() {
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
</style>
