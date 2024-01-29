<template>
  <template v-if="loading"></template>
  <q-layout v-else view="hHh lpR fFf" class="text-dark">
    <app-header />
    <q-page-container>
      <q-page class="flex">
        <div class="column col">
          <router-view v-if="userStore.session" />
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
import { useUserStore } from './stores/userStore';

const loading = ref<boolean>(true);
const userStore = useUserStore();

onMounted(async () => {
  await userStore.getSession();
  await userStore.updateProfile();

  supabaseClient.auth.onAuthStateChange((_, _session) => {
    userStore.session = _session as Session;
  });

  if (userStore.session) {
    if (!userStore.user?.avatar_url) {
      await supabaseClient.functions.invoke('user-avatar', { method: 'POST' });
      await userStore.updateProfile();
    }
  }

  loading.value = false;
});

useMeta({
  meta: {
    robots: { name: 'robots', content: 'noindex' },
  },
});
</script>
