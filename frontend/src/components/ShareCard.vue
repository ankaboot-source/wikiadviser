<template>
  <q-card style="min-width: 25vw" class="q-pa-md q-mb-xl bg-secondary">
    <q-card-section>
      <p class="text-h5 text-center">Share</p>
    </q-card-section>
    <q-card-section>
      <q-list bordered separator>
        <q-item v-for="user in users" :key="user.username">
          <share-user :user="user"></share-user>
        </q-item>
      </q-list>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { User } from 'src/types';
import ShareUser from './ShareUser.vue';
import { getUsers } from 'src/api/supabaseHelper';

const props = defineProps<{
  articleid: string;
}>();

const users = ref<User[]>();

onMounted(async () => {
  users.value = await getUsers(props.articleid);
});
</script>

<style scoped lang="scss"></style>
