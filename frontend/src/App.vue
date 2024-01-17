<template>
  <template v-if="loading"></template>
  <q-layout v-else view="hHh lpR fFf" class="text-dark">
    <app-header />
    <q-page-container>
      <q-page class="flex">
        <div class="column col">
          <router-view v-if="session" />
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
import { useUserStore } from './stores/useUserStore';

const loading = ref<boolean>(true);
const session = ref<Session | null>();
const userStore = useUserStore();

onMounted(() => {
  supabaseClient.auth.onAuthStateChange((_, _session) => {
    session.value = _session;
    setSession();
  });

  loading.value = false;
});

async function setSession() {
  session.value = (await supabaseClient.auth.getSession()).data.session;
  if (session.value) {
    userStore.fetchUser();
    if (!userStore.user?.user_metadata.user_avatar) {
      await supabaseClient.functions.invoke('user-avatar', { method: 'POST' });
      userStore.fetchUser();
    }
  }
}

useMeta({
  meta: {
    robots: { name: 'robots', content: 'noindex' },
  },
});
</script>
