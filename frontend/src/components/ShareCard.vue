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
import axios from 'axios';
import { onMounted, ref } from 'vue';
import { User } from 'src/types';
import ShareUser from './ShareUser.vue';

const props = defineProps<{
  articleid: string;
}>();

const users = ref<User[]>();

onMounted(async () => {
  const response = await axios.get('http://localhost:3000/api/users', {
    params: {
      articleid: props.articleid,
    },
  });
  users.value = response.data.users;
  users.value = [
    { username: 'Foona', email: 'foona@gmail.com', role: 0 },
    { username: 'Moona', email: 'moona@gmail.com', role: 1 },
    { username: 'Coona', email: 'coona@gmail.com', role: 2 },
  ];

  console.log(users.value);
});
</script>

<style scoped lang="scss"></style>
