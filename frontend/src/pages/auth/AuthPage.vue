<template>
  <q-page class="q-pa-xl d-flex flex-center">
    <q-card-section class="row justify-center q-pt-lg">
      <q-card-section>
        <p class="text-h5 text-center merriweather q-pb-md">
          {{ message }}
        </p>
        <Auth
          :view="authView"
          social-layout="vertical"
          :supabase-client="supabaseClient"
          :redirect-to="callbackURL"
          :provider-scopes="providerScopes"
          :appearance="{
            theme: ThemeSupa,
            style: {
              message: {
                fontSize: '15px',
              },
            },
            variables: {
              default: {
                colors: {
                  brand: '#56564c' /* primary */,
                  brandAccent: '#56564c' /* primary */,
                  inputLabelText: '#263238' /* dark */,
                  defaultButtonText: '#263238' /* dark */,
                  messageTextDanger: '#b71c1c' /* negative */,
                  messageText: '#1b5e20' /* positive */,
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
import { ThemeSupa, ViewType } from '@supabase/auth-ui-shared';
import { Auth } from '@nuxtbase/auth-ui-vue';
import supabaseClient from 'src/api/supabase';
import { computed, onMounted, ref } from 'vue';

const providerScopes = {
  azure: 'email',
};

const authView = ref<ViewType>('sign_in');

const callbackURL = computed(() => {
  return authView.value === 'forgotten_password'
    ? `${location.origin}/auth/update_password`
    : `${location.origin}`;
});

const message = computed(() => {
  switch (authView.value) {
    case 'sign_in':
      return 'Welcome back to WikiAdviser';

    case 'sign_up':
      return 'Create your account';

    case 'forgotten_password':
      return 'Reset your password';
    default:
      return 'Welcome to WikiAdviser';
  }
});

onMounted(() => {
  // Replaces Azure name & logo with Microsoft.
  const signInButton = Array.from(
    document.querySelectorAll('.supabase-auth-ui_ui-button'),
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
