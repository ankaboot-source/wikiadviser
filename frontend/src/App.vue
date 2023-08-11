<template>
  <q-layout view="hHh lpR fFf">
    <app-header></app-header>
    <q-page-container>
      <q-page class="flex">
        <div class="column col">
          <router-view v-if="session" :session="session" />
          <signin-page v-else />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import SigninPage from 'src/pages/auth/SigninPage.vue';
import supabase from 'src/api/supabase';
import AppHeader from 'src/components/AppHeader.vue';
import { Session } from '@supabase/supabase-js';
import { useMeta } from 'quasar';

const session = ref<Session | null>();

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  session.value = data.session;
  supabase.auth.onAuthStateChange((_, _session) => {
    session.value = _session;
  });
});
useMeta({
  meta: {
    robots: { name: 'robots', content: 'noindex' },
  },
});
</script>
