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
    const changeEmail = userStore.user?.email_change;
    const isUninitializedUser = isAnon && !changeEmail;
    const hasPassword = Boolean(userStore.user?.has_password);
    const hasEmailProvider = Boolean(userStore.user?.has_email_provider);

    let computedStep = 0;
    if (isUninitializedUser) computedStep = 1;
    else if (isAnon) computedStep = 2;
    else if (!hasPassword && hasEmailProvider) computedStep = 3;

    let message = '';
    let caption = '';

    if (computedStep === 1) {
      message = 'Link your email to secure your account';
      caption = 'Step 1 of 3: Link your email address';
    } else if (computedStep === 2) {
      message = 'Verify your email to continue';
      caption = 'Step 2 of 3: Check your inbox for verification code';
    } else if (computedStep === 3) {
      message = 'Set a password to complete your account';
      caption = 'Step 3 of 3: Create a secure password';
    }

    if (computedStep > 0) {
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
