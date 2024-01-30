<template>
  <q-layout view="hHh lpR fFf" class="text-dark">
    <app-header />
    <q-page-container>
      <q-page class="flex">
        <div class="column col">
          <router-view />
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
import { onMounted } from 'vue';
import { useUserStore } from './stores/userStore';

const userStore = useUserStore();

onMounted(async () => {
  await userStore.getSession();
  await userStore.updateProfile();

  if (userStore.session && !userStore.user?.avatar_url) {
    await supabaseClient.functions.invoke('user-avatar', { method: 'POST' });
    await userStore.updateProfile();
  }

  supabaseClient.auth.onAuthStateChange((_, _session) => {
    userStore.session = _session as Session;
  });
});

useMeta({
  meta: {
    robots: { name: 'robots', content: 'noindex' },
  },
});
</script>
