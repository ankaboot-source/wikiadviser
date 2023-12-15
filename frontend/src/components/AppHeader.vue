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
      <q-btn
        v-if="session"
        icon="person"
        @click="settings"
        :label="email"
        no-caps
        unelevated
      >
      </q-btn>
      <q-btn v-if="session" @click="signOut" icon="logout" no-caps unelevated>
      </q-btn>
    </q-toolbar>
  </q-header>
</template>
<script setup lang="ts">
import supabase from 'src/api/supabase';
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { Session } from '@supabase/supabase-js';
import { useRoute, useRouter } from 'vue-router';
import { Article } from 'src/types';
import { useArticlesStore } from 'src/stores/useArticlesStore';

const router = useRouter();
const session = ref<Session | null>();
const email = ref('');
const $q = useQuasar();
const article = ref<Article | null>();
const articlesStore = useArticlesStore();
const articles = computed(() => articlesStore.articles);

watch([useRoute(), articles], ([newRoute]) => {
  const articleId = newRoute.params?.articleId;
  if (newRoute.params?.articleId) {
    article.value = articlesStore.getArticleById(articleId as string);
  } else {
    article.value = null;
  }
});

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  session.value = data.session;
  supabase.auth.onAuthStateChange((_, _session) => {
    session.value = _session;
    email.value = session.value?.user.email as string;
  });
});

async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    articlesStore.resetArticles();
    $q.notify({ message: 'Signed out', icon: 'logout' });
    if (error) throw error;
  } catch (error) {
    console.error(error);
  }
}

function settings() {
  router.push({
    path: "/settings"
  });
}
</script>

<style>
.q-breadcrumbs__el {
  text-decoration: none !important;
  color: black !important;
}
</style>
