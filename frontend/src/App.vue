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
import { Notify, useMeta } from 'quasar';
import supabaseClient from 'src/api/supabase';
import AppHeader from 'src/components/AppHeader.vue';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from './stores/userStore';

const router = useRouter();

const userStore = useUserStore();

function goToAccount() {
  router.push({
    path: '/account',
  });
}
onMounted(async () => {
  await userStore.getSession();
  await userStore.fetchProfile();

  if (userStore.session) {
    if (!userStore.user?.avatar_url) {
      await supabaseClient.functions.invoke('user/avatar', { method: 'POST' });
      await userStore.fetchProfile();
    }

    if (!userStore.name) {
      await supabaseClient.functions.invoke('user/name', { method: 'POST' });
      await userStore.fetchProfile();
    }

    if (
      !userStore.user?.has_password &&
      !userStore.user?.has_email_provider &&
      !userStore.user?.email
    ) {
      Notify.create({
        message: 'Your account is not linked. Link it to save your progress.',
        caption: 'Go to settings to link your account.',
        color: 'warning',
        icon: 'warning',
        textColor: 'black',
        progress: true,
        timeout: 10000,
        actions: [{ label: 'Settings', handler: goToAccount }],
      });
    }
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
