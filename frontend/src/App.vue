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

  if (userStore.session && !userStore.user) {
    await supabaseClient.auth.signOut();
    router.push('/auth');
    return;
  }

  if (userStore.session) {
    if (!userStore.user?.avatar_url) {
      await supabaseClient.functions.invoke('user/avatar', { method: 'POST' });
      await userStore.fetchProfile();
    }

    if (!userStore.name) {
      await supabaseClient.functions.invoke('user/name', { method: 'POST' });
      await userStore.fetchProfile();
    }

    const isAnon = !userStore.user?.email;
    const isUninitializedUser = isAnon && !userStore.user?.email_change;
    const hasPassword = Boolean(userStore.user?.has_password);

    let message = '';
    let caption = '';

    if (isUninitializedUser) {
      message = 'You will lose all your progress if you dont link your account';
      caption = 'Please link your account at settings';
    } else if (isAnon) {
      message = 'Verify your account';
      caption = 'Awaiting verification, Please verify your email';
    } else if (!hasPassword && userStore.user?.has_email_provider) {
      message = 'Please set your password';
      caption = 'Email successfully verified, set your password at settings';
    }

    if (message) {
      Notify.create({
        message,
        caption,
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
