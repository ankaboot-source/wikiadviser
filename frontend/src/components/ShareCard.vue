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
            @permission-emit="handlePermissionEmit"
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
          @click="handlePermissionChange()"
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
    message: 'Share link copied to clipboard',
    color: 'positive',
    icon: 'content_copy',
  });
}

type EmittedPermission = {
  permissionId: string;
  roles: string[];
};
const permissionsToUpdate = ref<EmittedPermission[]>([]);

const handlePermissionEmit = (permission: EmittedPermission) => {
  const { permissionId, roles } = permission;

  const existingPermissionIndex = permissionsToUpdate.value!.findIndex(
    (perm) => perm.permissionId === permissionId
  );

  if (existingPermissionIndex !== -1) {
    // If the permission already exists, replace it with the new one
    permissionsToUpdate.value![existingPermissionIndex] = permission;
  } else {
    // If the permission doesn't exist, add the new permission to permissionsToUpdate
    permissionsToUpdate.value!.push(permission);
  }

  console.log(permissionsToUpdate.value);
};

async function handlePermissionChange() {
  console.log(permissionsToUpdate.value);
  return;
  //Set permission: parse through roles
  await updatePermission(
    props.user.permissionId,
    UserRole[roleModel.value as keyof typeof UserRole]
  );
}
</script>
