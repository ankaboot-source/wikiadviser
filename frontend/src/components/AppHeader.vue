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
          <q-icon v-if="article?.web_publication" name="public" class="q-mr-xs">
            <q-tooltip>This article is published on the Web</q-tooltip>
          </q-icon>
          <q-breadcrumbs-el
            v-if="article?.title"
            :label="article.title"
            to="."
            @click="$router.go(0)"
          />
        </q-breadcrumbs>
      </q-toolbar-title>
      <q-space />
      <q-btn v-if="supabaseUser" no-caps unelevated @click="settings">
        <q-avatar size="sm">
          <img :src="avatarURL" />
        </q-avatar>
        <div class="q-pl-sm">
          {{ supabaseUser.email }}
        </div>
      </q-btn>
      <q-btn
        v-if="supabaseUser"
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
import { User } from '@supabase/supabase-js';
import { useQuasar } from 'quasar';
import supabase from 'src/api/supabase';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { useUserStore } from 'src/stores/useUserStore';
import { Article } from 'src/types';
import { computed, ref, watch, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();

const $q = useQuasar();
const article = ref<Article | null>();
const articlesStore = useArticlesStore();
const articles = computed(() => articlesStore.articles);

const userStore = useUserStore();
const supabaseUser = ref<User | null>(userStore.user as User);
const avatarURL = computed(() => supabaseUser.value?.user_metadata.user_avatar);

watch([useRoute(), articles], ([newRoute]) => {
  const articleId = newRoute.params?.articleId;
  if (newRoute.params?.articleId) {
    article.value = articlesStore.getArticleById(articleId as string);
  } else {
    article.value = null;
  }
});

watchEffect(() => {
  supabaseUser.value = userStore.user as User;
});

async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    supabaseUser.value = null;
    articlesStore.resetArticles();
    $q.notify({ message: 'Signed out', icon: 'logout' });
    if (error) throw error;
  } catch (error) {
    console.error(error);
  }
}

function settings() {
  router.push({
    path: '/settings',
  });
}
</script>

<style>
.q-breadcrumbs__el {
  text-decoration: none !important;
  color: black !important;
}
</style>
