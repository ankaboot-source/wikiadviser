<template>
  <q-card style="min-width: 30vw">
    <q-toolbar class="bg-white borders">
      <q-toolbar-title class="merriweather">Share</q-toolbar-title>
      <q-btn v-close-popup flat round dense icon="close" size="sm" />
    </q-toolbar>

    <q-card-section>
      <q-list bordered separator>
        <share-user
          v-for="user in users"
          :key="user.username"
          :user="user"
          :role="role"
          @permission-emit="handlePermissionEmit"
        ></share-user>
      </q-list>
    </q-card-section>

    <q-card-actions class="borders">
      <q-space />
      <template v-if="ownerPermission">
        <q-btn
          v-close-popup
          class="q-mr-xs"
          color="primary"
          outline
          no-caps
          label="Cancel" />
        <q-btn
          color="primary"
          unelevated
          no-caps
          label="Apply"
          @click="handlePermissionChange()"
      /></template>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { User, UserRole, Permission } from 'src/types';
import ShareUser from './ShareUser.vue';
import { getUsers, updatePermission } from 'src/api/supabaseHelper';
import { useQuasar } from 'quasar';
const $q = useQuasar();
const props = defineProps<{
  articleId: string;
  role: UserRole[] | null;
}>();
const users = ref<User[]>();

const ownerPermission = props.role?.includes(UserRole.Owner);

onMounted(async () => {
  users.value = await getUsers(props.articleId);
});

type EmittedPermission = {
  permissionId: string;
  roles: UserRole[] | null;
  duplicate?: boolean;
  remove?: boolean;
};
const permissionsToUpdate = ref<Permission[]>([]);

const handlePermissionEmit = (permission: EmittedPermission) => {
  const { permissionId, roles, duplicate, remove } = permission;

  const existingPermissionIndex = permissionsToUpdate.value?.findIndex(
    (perm) => perm.permissionId === permissionId
  );

  if (existingPermissionIndex !== -1) {
    // If the permission already exists
    if (duplicate) {
      // Remove it
      permissionsToUpdate.value?.splice(existingPermissionIndex, 1);
    } else {
      // Change it
      permissionsToUpdate.value![existingPermissionIndex] = permission;
    }
  } else {
    // If the permission doesn't exist, Add it
    permissionsToUpdate.value?.push(permission);
  }
};

async function handlePermissionChange() {
  if (permissionsToUpdate.value.length) {
    try {
      await updatePermission(permissionsToUpdate.value);
      $q.notify({
        message: 'Permission updated.',
        icon: 'check',
        color: 'positive',
      });
      users.value = await getUsers(props.articleId);
      permissionsToUpdate.value = [];
    } catch (error: any) {
      $q.notify({
        message: error.message,
        color: 'negative',
      });
    }
  }
}
</script>
