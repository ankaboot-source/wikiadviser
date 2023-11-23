<template>
  <q-page class="q-pa-xl d-flex flex-center">
    <q-card-section class="row justify-center q-pt-lg">
      <q-card-section>
        <p class="text-h5 text-center merriweather q-pb-xs">
          Welcome to WikiAdviser
        </p>
        <Auth
          :social-layout="'vertical'"
          :supabase-client="supabaseClient"
          :redirect-to="callbackURL"
          :provider-scopes="providerScopes"
          :appearance="{
            theme: ThemeSupa,
          }"
          :providers="['google', 'linkedin', 'azure', 'twitter']"
        />
      </q-card-section>
    </q-card-section>
  </q-page>
</template>

<script setup lang="ts">
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Auth } from '@nuxtbase/auth-ui-vue';
import supabaseClient from 'src/api/supabase';

const callbackURL = `${location.origin}/auth/callback`;
const providerScopes = {
  azure: 'email',
};
</script>
