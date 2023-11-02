<template>
  <q-layout view="hHh lpR fFf">
    <app-header />
    <q-page-container>
      <q-page class="flex">
        <div class="column col">
          <router-view v-if="session" :session="session" />
          <signin-page v-else />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { Session } from '@supabase/supabase-js';
import { Cookies, useMeta } from 'quasar';
import supabase from 'src/api/supabase';
import AppHeader from 'src/components/AppHeader.vue';
import SigninPage from 'src/pages/auth/SigninPage.vue';
import { onMounted, ref } from 'vue';

const session = ref<Session | null>();
const JWTcookie = {
  name: 'WikiAdviserJWTcookie',
  url: process.env.WIKIADVISER_ROOT_DOMAIN,
};
onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  session.value = data.session;
  supabase.auth.onAuthStateChange((_, _session) => {
    session.value = _session;
    if (session.value?.access_token) {
      Cookies.set(JWTcookie.name, session.value?.access_token, {
        domain: JWTcookie.url,
      });
    } else {
      Cookies.remove(JWTcookie.name);
    }
  });
});

useMeta({
  meta: {
    robots: { name: 'robots', content: 'noindex' },
  },
});
</script>
