<template>
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
</template>

<script setup lang="ts">
import { Auth } from '@nuxtbase/auth-ui-vue';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useQuasar } from 'quasar';
import supabaseClient from 'src/api/supabase';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const $router = useRouter();
const $q = useQuasar();
const updated = ref(false);

const props = defineProps({
  prepareNewAccount: {
    type: Function,
    default: () => {},
  },
});

onMounted(() => {
  const { data: authListener } = supabaseClient.auth.onAuthStateChange(
    (event) => {
      console.log(event);

      if (event === 'USER_UPDATED' && !updated.value) {
        props.prepareNewAccount();
        // Assuming the event is related to password update
        $q.notify({
          message: 'Your password has been successfully updated',
          color: 'positive',
        });
        updated.value = true;
        $router.push('/account');
      }
    },
  );

  onBeforeUnmount(() => {
    authListener.subscription.unsubscribe();
  });
});
</script>
