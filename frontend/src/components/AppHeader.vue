<template>
  <q-header class="text-black text-left bg-secondary">
    <q-toolbar>
      <q-toolbar-title>
        <q-breadcrumbs class="merriweather">
          <q-breadcrumbs-el
            label="WikiAdviser"
            icon="img:/icons/favicon-32x32.png"
            to="/"
          />
          <q-breadcrumbs-el
            v-if="article?.title"
            :label="article.title"
            to="."
            @click="$router.go(0)"
          />
        </q-breadcrumbs>
      </q-toolbar-title>
      <q-space />
      <q-btn v-if="supabaseUser" no-caps unelevated>
        <q-avatar size="xs">
          <img :src="avatarURL" />
        </q-avatar>
        <q-text class="q-pl-sm">
          {{ supabaseUser.email }}
        </q-text>
      </q-btn>
      <q-btn
        v-if="supabaseUser"
        clickable
        icon="logout"
        no-caps
        unelevated
        @click="signOut"
      >
      </q-btn>
    </q-toolbar>
  </q-header>
</template>
<script setup lang="ts">
import supabase from 'src/api/supabase';
import { computed, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute } from 'vue-router';
import { Article } from 'src/types';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { User } from '@supabase/supabase-js';

const props = defineProps<{
  user: User | null;
}>();

const $q = useQuasar();
const article = ref<Article | null>();
const articlesStore = useArticlesStore();
const articles = computed(() => articlesStore.articles);

const supabaseUser = ref<User | null>(props.user);
const avatarURL = computed(() => supabaseUser.value?.user_metadata.picture);

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
    supabaseUser.value = null;
    articlesStore.resetArticles();
    $q.notify({ message: 'Signed out', icon: 'logout' });
    if (error) throw error;
  } catch (error) {
    console.error(error);
  }
}
</script>

<style>
.q-breadcrumbs__el {
  text-decoration: none !important;
  color: black !important;
}
</style>
