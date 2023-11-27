<template>
  <q-layout view="hHh lpR fFf">
    <app-header />
    <q-page-container>
      <q-page class="flex">
        <div class="column col">
          <router-view v-if="session" :session="session" />
          <authentication-page v-else />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { Session } from '@supabase/supabase-js';
import { useMeta } from 'quasar';
import supabase from 'src/api/supabase';
import AppHeader from 'src/components/AppHeader.vue';
import AuthenticationPage from 'src/pages/auth/AuthenticationPage.vue';
import { onMounted, ref } from 'vue';

const session = ref<Session | null>();

onMounted(() => {
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
