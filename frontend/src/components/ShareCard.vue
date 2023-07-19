<template>
  <q-card
    style="min-width: 30vw"
    class="q-px-lg q-mb-xl bg-secondary full-height row"
  >
    <q-card-section class="q-pb-xl column col">
      <q-card-section>
        <p class="text-h5 text-center merriweather">Share</p>
      </q-card-section>
      <q-scroll-area class="col-grow">
        <q-list bordered separator>
          <share-user
            v-for="user in users"
            :key="user.username"
            :user="user"
            :role="role"
          ></share-user>
        </q-list>
      </q-scroll-area>

      <q-card-actions class="q-mt-md">
        <q-btn
          icon="link"
          color="primary"
          outline
          no-caps
          label="Copy link"
          @click="copyValueToClipboard()"
        />
        <q-space />
        <q-btn v-close-popup color="primary" outline no-caps label="Cancel" />
        <q-btn
          color="primary"
          unelevated
          no-caps
          label="Apply"
          @click="handleRoleChange()"
        />
      </q-card-actions>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { User, UserRole } from 'src/types';
import ShareUser from './ShareUser.vue';
import { getUsers, updatePermission } from 'src/api/supabaseHelper';
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

async function handleRoleChange() {
  return;
  //Set permission: parse through roles
  await updatePermission(
    props.user.permissionId,
    UserRole[roleModel.value as keyof typeof UserRole]
  );
}
</script>
