<template>
  <q-page class="q-pa-xl d-flex flex-center">
    <q-card-section class="row justify-center q-pt-lg">
      <q-card-section>
        <p class="text-h5 text-center merriweather q-pb-md">
          Create your new password
        </p>
        <Auth
          view="update_password"
          :supabase-client="supabaseClient"
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
                  brand: 'hsl(207, 90%, 49%)',
                  brandAccent: 'hsl(207, 85%, 41%)',
                },
              },
            },
          }"
        />
      </q-card-section>
    </q-card-section>
  </q-page>
</template>

<script setup lang="ts">
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Auth } from '@nuxtbase/auth-ui-vue';
import supabaseClient from 'src/api/supabase';
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';

const $router = useRouter();
const $quasar = useQuasar();

const hasUpdatedPassword = ref(false);

watch(hasUpdatedPassword, (updated: boolean) => {
  if (updated) {
    $quasar.notify({
      message: 'Your password has been successfully updated',
      color: 'positive',
    });
    $router.push('/');
  }
});

supabaseClient.auth.onAuthStateChange((event) => {
  if (event === 'USER_UPDATED') {
    hasUpdatedPassword.value = true;
  }
});
</script>
