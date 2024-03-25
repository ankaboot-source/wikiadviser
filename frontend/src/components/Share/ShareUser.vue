<template>
  <q-item v-show="!removed" bordered>
    <q-item-section avatar>
      <q-avatar size="md">
        <img :src="user.picture" referrerpolicy="no-referrer" />
      </q-avatar>
    </q-item-section>
    <q-item-section>
      <q-item-label caption class="ellipsis">{{
        props.user.email
      }}</q-item-label>
    </q-item-section>
    <q-select
      v-model="roleModel"
      class="q-ma-sm text-capitalize"
      :options="roleOptions"
      dense
      :disable="!ownerPermission || props.user.role === 'owner'"
      label="Role"
      map-options
      @update:model-value="emitPermission()"
    />
    <q-btn
      v-if="ownerPermission && props.user.role !== 'owner'"
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
import { Enums, User } from 'src/types';
import { ref } from 'vue';

const props = defineProps<{
  user: User;
  role: Enums<'role'>;
}>();

const roleModel = ref({
  label: props.user.role,
  value: props.user.role,
});
const roleOptions = [
  {
    label: 'Editor',
    value: 'editor',
    disable: false,
  },
  {
    label: 'Reviewer',
    value: 'reviewer',
    disable: false,
  },
  {
    label: 'Viewer',
    value: 'viewer',
    disable: false,
  },
];
if (roleModel.value.value === 'owner') {
  roleOptions.unshift({
    label: 'Owner',
    value: 'owner',
    disable: true,
  });
}
const removed = ref(false);
const ownerPermission = props.role === 'owner';

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
