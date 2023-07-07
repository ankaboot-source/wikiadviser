<template>
  <q-card style="min-width: 25vw" class="q-px-lg q-mb-xl bg-secondary">
    <q-card-section>
      <p class="text-h5 text-center merriweather">Share</p>
    </q-card-section>
    <q-card-section class="q-pb-xl">
      <q-list bordered separator>
        <q-item v-for="user in users" :key="user.username">
          <share-user :user="user" :role="role"></share-user>
        </q-item>
      </q-list>
      <q-btn
        icon="link"
        color="primary"
        outline
        class="q-mt-md"
        label="share article"
        @click="copyValueToClipboard()"
      ></q-btn>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { User, UserRole } from 'src/types';
import ShareUser from './ShareUser.vue';
import { getUsers } from 'src/api/supabaseHelper';
import { useRoute } from 'vue-router';
const route = useRoute();
import { copyToClipboard, useQuasar } from 'quasar';
const $q = useQuasar();
const props = defineProps<{
  articleId: string;
  role: UserRole | null;
}>();
const users = ref<User[]>();

onMounted(async () => {
  users.value = await getUsers(props.articleId);
});

async function copyValueToClipboard() {
  await copyToClipboard(route.path);
  $q.notify({
    message: 'share link copied to clipboard',
    color: 'positive',
    icon: 'content_copy',
  });
}
</script>
