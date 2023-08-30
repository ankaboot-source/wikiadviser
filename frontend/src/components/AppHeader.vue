<template>
  <q-header class="text-black text-left bg-secondary">
    <q-toolbar>
      <q-toolbar-title class="merriweather">
        <router-link to="/" class="text-black" style="text-decoration: none">
          <q-icon name="public" /> WikiAdviser
        </router-link>
        <span v-if="article?.title" class="merriweather text-h6">
          / {{ article.title }}
        </span>
      </q-toolbar-title>
      <q-space />
      <q-btn v-if="session" icon="person" :label="username" no-caps flat>
        <q-menu fit anchor="bottom right" self="top right">
          <q-item clickable @click="signOut">
            <q-item-section avatar>
              <q-icon name="logout" />
            </q-item-section>
            <q-item-section>Sign Out</q-item-section>
          </q-item>
        </q-menu>
      </q-btn>
    </q-toolbar>
  </q-header>
</template>
<script setup lang="ts">
import supabase from 'src/api/supabase';
import { onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { Session } from '@supabase/supabase-js';
import { useRoute } from 'vue-router';
import { Article } from 'src/types';

const session = ref<Session | null>();
const username = ref('');
const $q = useQuasar();
const article = ref<Article | null>();

watch(useRoute(), (to) => {
  const articleId = to.params.articleId;
  if (articleId) {
    if (articleId !== article.value?.article_id) {
      const articles = JSON.parse($q.localStorage.getItem('articles') ?? '[]');
      article.value = articles?._value?.find(
        (article: Article) => article.article_id === articleId
      );
    }
  } else {
    article.value = null;
  }
});

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  session.value = data.session;
  supabase.auth.onAuthStateChange((_, _session) => {
    session.value = _session;
    username.value = session.value?.user.user_metadata.username;
  });
});

async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    $q.localStorage.clear();

    $q.notify({ message: 'Signed out', icon: 'logout' });
    if (error) throw error;
  } catch (error) {
    console.error(error);
  }
}
</script>
