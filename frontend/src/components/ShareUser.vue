<template>
  <q-item v-show="!removed" bordered>
    <q-item-section avatar>
      <q-avatar size="md" icon="person" color="accent" />
    </q-item-section>
    <q-item-section>
      <q-item-label>{{ props.user.username }}</q-item-label>
      <q-item-label caption>{{ props.user.email }}</q-item-label>
    </q-item-section>
    <q-select
      v-model="roleModel"
      class="q-ma-sm"
      :options="roleOptions"
      dense
      :disable="!ownerPermission || props.user.role === UserRole.Owner"
      label="Role"
      map-options
      @update:model-value="emitPermission()"
    />
    <q-btn
      v-if="ownerPermission && props.user.role !== UserRole.Owner"
      color="negative"
      unelevated
      no-caps
      outline
      dense
      flat
      size="sm"
      icon="delete"
      @click="removePermission()"
    >
      <q-tooltip>Remove user</q-tooltip></q-btn
    >
  </q-item>
</template>

<script setup lang="ts">
import { User, UserRole, UserRoleLabels } from 'src/types';
import { ref } from 'vue';

const props = defineProps<{
  user: User;
  role: UserRole;
}>();

const roleModel = ref({
  label: UserRoleLabels.get(props.user.role),
  value: props.user.role,
});
const roleOptions = [
  {
    label: 'Editor',
    value: UserRole.Editor,
    disable: false,
  },
  {
    label: 'Reviewer',
    value: UserRole.Reviewer,
    disable: false,
  },
  {
    label: 'Viewer',
    value: UserRole.Viewer,
    disable: false,
  },
];
if (roleModel.value.value === UserRole.Owner) {
  roleOptions.unshift({
    label: 'Owner',
    value: UserRole.Owner,
    disable: true,
  });
}
const removed = ref(false);
const ownerPermission = props.role === UserRole.Owner;

const emit = defineEmits(['permissionEmit']);
function emitPermission() {
  const permissionId = props.user.permissionId;
  const role = roleModel.value.value;
  if (role !== props.user.role) {
    // Different new role: Add it
    emit('permissionEmit', {
      permissionId,
      role,
    });
  } else {
    // Duplicate: Remove it
    emit('permissionEmit', {
      permissionId,
      role,
      duplicate: true,
    });
  }
}

function removePermission() {
  removed.value = true;
  const permissionId = props.user.permissionId;
  emit('permissionEmit', {
    permissionId,
    remove: true,
  });
}
</script>
