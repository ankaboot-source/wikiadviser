<template>
  <q-item v-show="!removed" bordered>
    <q-item-section avatar>
      <q-avatar size="md">
        <img :src="user.picture" referrerpolicy="no-referrer" />
      </q-avatar>
    </q-item-section>
    <q-item-section>
      <q-item-label caption class="ellipsis">
        {{ props.user.name }}
      </q-item-label>
      <q-item-label v-if="statusText" caption class="ellipsis text-grey-7">
        {{ statusText }}
      </q-item-label>
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
import { computed, ref } from 'vue';

const props = defineProps<{
  user: User;
  role: Enums<'role'>;
  connectedUsers?: {
    user_id: string;
    display_name: string;
    avatar_url?: string | null;
  }[];
}>();

const isOnline = computed(
  () => props.connectedUsers?.some((u) => u.user_id === props.user.id) ?? false,
);

const statusText = computed(() => {
  if (isOnline.value) return 'Online now';
  if (props.user.last_seen) return `Last seen ${timeAgo(props.user.last_seen)}`;
  return '';
});

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

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
