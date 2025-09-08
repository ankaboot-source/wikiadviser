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
      variables: AUTH_UI_VUE_VARIABLES_STYLE,
    }"
  />
</template>

<script setup lang="ts">
import { Auth } from '@nuxtbase/auth-ui-vue';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useQuasar } from 'quasar';
import supabaseClient from 'src/api/supabase';
import { AUTH_UI_VUE_VARIABLES_STYLE } from 'src/utils/consts';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const $router = useRouter();
const $q = useQuasar();
const updated = ref(false);

const props = defineProps({
  prepareNewAccount: {
    type: Function,
    default: () => {}, // skipcq: JS-0321
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
          icon: 'check',
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
