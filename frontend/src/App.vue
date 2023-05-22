<template>
  <q-layout view="hHh lpR fFf">
    <app-header></app-header>
    <q-page-container>
      <router-view v-if="session" :session="session" />
      <signin-page v-else />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import SigninPage from 'src/pages/auth/SigninPage.vue';
import supabase from 'src/api/supabase';
import AppHeader from 'src/components/AppHeader.vue';

const session = ref();

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  session.value = data.session;
  supabase.auth.onAuthStateChange((_, _session) => {
    session.value = _session;
  });
});
</script>
