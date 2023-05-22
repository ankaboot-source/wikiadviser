<template>
  <q-header class="text-black text-left" style="background-color: #f6f8fa">
    <q-toolbar>
      <q-toolbar-title style="font-family: serif">
        <router-link to="/" class="text-black" style="text-decoration: none">
          <q-icon name="public" /> WikiAdviser</router-link
        >
      </q-toolbar-title>
      <q-space />
      <template v-if="session">
        <q-btn icon="person" :label="username" no-caps flat>
          <q-menu fit anchor="bottom right" self="top right">
            <q-item clickable @click="signOut">
              <q-item-section avatar>
                <q-icon name="logout" />
              </q-item-section>
              <q-item-section>Log Out</q-item-section>
            </q-item>
          </q-menu>
        </q-btn>
      </template>
    </q-toolbar>
  </q-header>
</template>
<script setup lang="ts">
import supabase from 'src/api/supabase';
import { onMounted, ref } from 'vue';
const session = ref();
const username = ref();

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  session.value = data.session;
  supabase.auth.onAuthStateChange((_, _session) => {
    session.value = _session;
    username.value = session.value?.user.user_metadata.username;
  });
});

async function signOut() {
  try {
    let { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error(error);
  }
}
</script>
