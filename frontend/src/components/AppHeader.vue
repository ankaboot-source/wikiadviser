<template>
  <q-header class="text-black text-left bg-secondary">
    <q-toolbar>
      <q-toolbar-title>
        <q-breadcrumbs class="merriweather">
          <q-breadcrumbs-el label="WikiAdviser" icon="public" to="/" />
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
          <img :src="supabaseUser?.user_metadata.picture" />
        </q-avatar>
        <q-text class="q-pl-sm">
          {{ supabaseUser.email }}
        </q-text>
      </q-btn>
      <q-btn
        v-if="supabaseUser"
        clickable
        @click="signOut"
        icon="logout"
        no-caps
        unelevated
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
import { useSupabaseUser } from '@nuxtbase/auth-ui-vue';

const $q = useQuasar();
const article = ref<Article | null>();
const articlesStore = useArticlesStore();
const articles = computed(() => articlesStore.articles);

const { supabaseUser } = useSupabaseUser(supabase);

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
    supabaseUser.value = null
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
