<template>
  <template v-if="loading"></template>
  <q-layout v-else view="hHh lpR fFf">
    <app-header :user="user" />
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
import { Session, User } from '@supabase/supabase-js';
import { useMeta } from 'quasar';
import supabase from 'src/api/supabase';
import AppHeader from 'src/components/AppHeader.vue';
import AuthenticationPage from 'src/pages/auth/AuthPage.vue';
import { onMounted, ref } from 'vue';

const loading = ref<boolean>(true);
const user = ref<User | null>(null);
const session = ref<Session | null>();

onMounted(async () => {
  supabase.auth.onAuthStateChange((_, _session) => {
    session.value = _session;
  });
  session.value = (await supabase.auth.getSession()).data.session;
  if (session.value) {
    user.value = (await supabase.auth.getUser()).data.user;
    if (!user.value?.user_metadata.picture) {
      await supabase.functions.invoke('user-avatar', { method: 'POST' });
      user.value = (await supabase.auth.getUser()).data.user;
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
