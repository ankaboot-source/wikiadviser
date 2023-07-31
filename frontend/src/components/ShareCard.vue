<template>
  <q-card style="min-width: 30vw">
    <q-toolbar class="bg-white borders">
      <q-toolbar-title class="merriweather">Share this article</q-toolbar-title>
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

    <q-card-actions v-if="ownerPermission" class="borders">
      <q-space />
      <q-btn
        v-close-popup
        class="q-mr-xs"
        color="primary"
        outline
        no-caps
        label="Cancel"
      />
      <q-btn
        color="primary"
        unelevated
        no-caps
        label="Apply"
        @click="handlePermissionChange()"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { User, UserRole, Permission } from 'src/types';
import ShareUser from './ShareUser.vue';
import {
  deletePermission,
  getUsers,
  updatePermission,
} from 'src/api/supabaseHelper';
import { useQuasar } from 'quasar';
const $q = useQuasar();
const props = defineProps<{
  articleId: string;
  role: UserRole;
}>();
const users = ref<User[]>();

const ownerPermission = props.role == UserRole.Owner;

onMounted(async () => {
  users.value = await getUsers(props.articleId);
});

type EmittedPermission = {
  permissionId: string;
  role: UserRole;
  duplicate?: boolean;
  remove?: boolean;
};
const permissionsToUpdate = ref<Permission[]>([]);
const permissionsToDelete = ref<string[]>([]);

const handlePermissionEmit = (permission: EmittedPermission) => {
  const { permissionId, role, duplicate, remove } = permission;

  if (remove) {
    permissionsToDelete.value?.push(permissionId);
    return;
  }
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
  console.log(JSON.stringify(permissionsToUpdate.value));
};

async function handlePermissionChange() {
  console.log(
    JSON.stringify(permissionsToUpdate.value),
    JSON.stringify(permissionsToDelete.value)
  );
  if (permissionsToDelete.value.length) {
    try {
      for (const permission of permissionsToDelete.value) {
        await deletePermission(permission);
      }
      $q.notify({
        message: 'Permission updated.',
        icon: 'check',
        color: 'positive',
      });
      permissionsToDelete.value = [];
    } catch (error: any) {
      $q.notify({
        message: error.message,
        color: 'negative',
      });
    }
  }
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
