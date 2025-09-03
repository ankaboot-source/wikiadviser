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
  console.log(userStore.user?.email, userStore?.user?.display_name);
  if (userStore.session) {
    if (!userStore.user?.avatar_url) {
      await supabaseClient.functions.invoke('user/avatar', { method: 'POST' });
      await userStore.fetchProfile();
    }

    if (!userStore.user?.display_name && userStore.user?.is_anonymous) {
      await supabaseClient.functions.invoke('user/name', { method: 'POST' });
      await userStore.fetchProfile();
    }

    if (!userStore.user?.has_password) {
      Notify.create({
        message:
          'You will lose all your progress if you dont link your account.',
        caption: 'Please link your account at settings.',
        color: 'warning',
        icon: 'warning',
        textColor: 'black',
        progress: true,
        actions: [
          {
            label: 'Settings',
            handler: () => goToAccount(),
          },
        ],
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
