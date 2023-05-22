<template>
  <q-layout view="hHh lpR fFf">
    <app-header></app-header>
    <q-page-container>
      <articles-page v-if="session" :session="session" />
      <auth-login v-else />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import ArticlesPage from 'src/pages/ArticlesPage.vue';
import AuthLogin from 'src/pages/auth/AuthLogin.vue';
import supabase from 'src/api/supabase';
import AppHeader from 'src/layouts/AppHeader.vue';

const session = ref();

onMounted(() => {
  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session;
  });

  supabase.auth.onAuthStateChange((_, _session) => {
    session.value = _session;
  });
});
</script>
