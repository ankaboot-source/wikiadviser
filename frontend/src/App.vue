<template>
  <template v-if="loading"></template>
  <q-layout v-else view="hHh lpR fFf" class="text-dark">
    <app-header :user="user" />
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
import { Session, User } from '@supabase/supabase-js';
import { useMeta } from 'quasar';
import supabaseClient from 'src/api/supabase';
import AppHeader from 'src/components/AppHeader.vue';
import AuthenticationPage from 'src/pages/auth/AuthPage.vue';
import { onMounted, ref } from 'vue';

const loading = ref<boolean>(true);
const user = ref<User | null>(null);
const session = ref<Session | null>();

onMounted(async () => {
  session.value = (await supabaseClient.auth.getSession()).data.session
  supabaseClient.auth.onAuthStateChange((_, _session) => {
    session.value = _session;
    setSession();
  });

  loading.value = false;
});

async function setSession() {
  session.value = (await supabaseClient.auth.getSession()).data.session;
  if (session.value) {
    user.value = (await supabaseClient.auth.getUser()).data.user;
    if (!user.value?.user_metadata.user_avatar) {
      await supabaseClient.functions.invoke('user-avatar', { method: 'POST' });
      user.value = (await supabaseClient.auth.getUser()).data.user;
    }
  }
}

useMeta({
  meta: {
    robots: { name: 'robots', content: 'noindex' },
  },
});
</script>
