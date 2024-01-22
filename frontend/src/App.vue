<template>
  <template v-if="loading"></template>
  <q-layout v-else view="hHh lpR fFf" class="text-dark">
    <app-header />
    <q-page-container>
      <q-page class="flex">
        <div class="column col">
          <router-view v-if="sessionStore.session" />
          <authentication-page v-else />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { Session } from '@supabase/supabase-js';
import { useMeta } from 'quasar';
import supabaseClient from 'src/api/supabase';
import AppHeader from 'src/components/AppHeader.vue';
import AuthenticationPage from 'src/pages/auth/AuthPage.vue';
import { onMounted, ref } from 'vue';
import { useSessionStore } from './stores/useSessionStore';

const loading = ref<boolean>(true);
const sessionStore = useSessionStore();

onMounted(() => {
  supabaseClient.auth.onAuthStateChange((_, _session) => {
    sessionStore.session = _session as Session;
    setSession();
  });

  loading.value = false;
});

async function setSession() {
  if (sessionStore.session) {
    if (!sessionStore.user?.user_metadata.user_avatar) {
      await supabaseClient.functions.invoke('user-avatar', { method: 'POST' });
    }
    sessionStore.fetchUser();
  }
}

useMeta({
  meta: {
    robots: { name: 'robots', content: 'noindex' },
  },
});
</script>
