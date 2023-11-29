<template>
  <q-page class="q-pa-xl d-flex flex-center">
    <q-card-section class="row justify-center q-pt-lg">
      <q-card-section>
        <p class="text-h5 text-center merriweather q-pb-md">
          Welcome to WikiAdviser
        </p>
        <Auth
          social-layout="vertical"
          :supabase-client="supabaseClient"
          :redirect-to="callbackURL"
          :provider-scopes="providerScopes"
          :appearance="{
            theme: ThemeSupa,
            style: {
              message:{
                fontSize: '15px',
              }
            },
            variables: {
              default: {
                colors: {
                  brand: 'hsl(207, 90%, 49%)',
                  brandAccent: 'hsl(207, 85%, 41%)',
                },
              },
            },
          }"
          :providers="['google', 'azure']"
        />
      </q-card-section>
    </q-card-section>
  </q-page>
</template>

<script setup lang="ts">
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Auth } from '@nuxtbase/auth-ui-vue';
import supabaseClient from 'src/api/supabase';
import { onMounted } from 'vue';

const callbackURL = `${location.origin}/auth/callback`;
const providerScopes = {
  azure: 'email',
};

onMounted(() => {
  // Replaces Azure name & logo with Microsoft.
  const signInButton = Array.from(
    document.querySelectorAll('.supabase-auth-ui_ui-button')
    ).find((button) => button.textContent === 'Sign in with Azure');
    
  if (signInButton) {
    signInButton.innerHTML = `
      <svg 
        xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 30 30"
          width="21px"
          height="21px"
          style="margin-left: 17px;"
        >
          <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
          <path fill="#f35325" d="M1 1h10v10H1z"/>
          <path fill="#81bc06" d="M12 1h10v10H12z"/>
          <path fill="#05a6f0" d="M1 12h10v10H1z"/>
          <path fill="#ffba08" d="M12 12h10v10H12z"/>
        </svg>
        Sign in with Microsoft
      `;
  }
});
</script>
