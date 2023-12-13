<script setup lang="ts">
  import supabase from 'src/api/supabase';
  import { Session } from '@supabase/supabase-js';
  import { ref, onMounted } from 'vue';
  import { useRouter } from 'vue-router';

  const session = ref<Session | null>();
  const email = ref('');
  const imageUrl = ref('');
  const router = useRouter();

  onMounted(async () => {
    const { data } = await supabase.auth.getSession();
    session.value = data.session;
    supabase.auth.onAuthStateChange((_, _session) => {
      session.value = _session;
      email.value = session.value?.user.email as string;
      imageUrl.value = session.value?.user.user_metadata.imageUrl ?
        session.value?.user.user_metadata.imageUrl :
        `https://ui-avatars.com/api/${email.value}/300/random/fff/1`;
    });
  });

  function changePassword() {
    router.push({
      path: "/auth/update_password"
    });
  }
</script>

<template>
  <q-card class="column fit" style="max-width: 32vw; max-height: 80vh" flat>
    <div class="my-8 w-full" style="padding: auto;">
      <div class="center">
        <img class="profile center" :src="imageUrl"/>
      </div>
      <h2 style="text-align: center; margin: 1rem 0 2.5rem;">{{ email }}</h2>
      <q-btn class="btn" label="remove image" />
      <q-btn class="btn" label="change password" @click="changePassword" />
      <q-btn color="red" class="btn" label="delete account" />
  </div>
  </q-card>
</template>

<style>
  .my-8 {
    margin: 1.5rem 0;
  }

  .center {
    margin: 0 calc(50% - 150px);
  }

  .w-full {
    width: 100%;
  }

  .profile {
    width: 300px;
    height: 300px;
    object-fit: none;
    object-position: 50% 25%;
    border-radius: 50%;
  }

  .btn {
    display: block;
    margin: 1rem auto;
    width: 200px;
  }
</style>
