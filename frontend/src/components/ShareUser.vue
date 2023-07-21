<template>
  <q-expansion-item>
    <template #header>
      <q-item-section avatar>
        <q-avatar size="md" icon="person" color="accent" />
      </q-item-section>
      <q-item-section>
        <q-item-label>{{ props.user.username }}</q-item-label>
        <q-item-label caption>{{ props.user.email }}</q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-avatar
          v-if="!roleModel[0]"
          color="yellow-8"
          icon="priority_high"
          size="24px"
        >
          <q-tooltip anchor="top middle" self="bottom middle">
            User needs attention.
          </q-tooltip>
        </q-avatar>
      </q-item-section>
    </template>
    <q-item-section>
      <q-option-group
        v-model="roleModel"
        class="q-ml-sm q-my-sm"
        :options="roleOptions"
        dense
        label="Role"
        :disable="!ownerPermission"
        type="checkbox"
        @update:model-value="emitPermissionEmitEvent"
      />
    </q-item-section>
  </q-expansion-item>
</template>

<script setup lang="ts">
import { User, UserRole } from 'src/types';
import { ref } from 'vue';

const props = defineProps<{
  user: User;
  role: UserRole[] | null;
}>();
const emit = defineEmits(['permissionEmit']);
const ownerPermission = props.role?.includes(UserRole.Owner);
const emitPermissionEmitEvent = () => {
  const permissionId = props.user.permissionId;

  const roles = (() => {
    const roles = roleModel.value
      // Map each role to the corresponding UserRole enum value
      .map((role) => UserRole[role as keyof typeof UserRole])
      // Filter out roles that are not valid UserRole enum values (like undefined)
      .filter((role) => role in UserRole)
      // Sort that it wouldnt matter in what order boxes were checked.
      .sort();
    // If empty make it null
    return roles.length > 0 ? roles : null;
  })();

  if (JSON.stringify(roles) !== JSON.stringify(props.user.role as UserRole)) {
    // Different new role: Add it
    emit('permissionEmit', {
      permissionId,
      roles,
    });
  } else {
    // Back to the same original role: Remove it
    emit('permissionEmit', {
      permissionId,
      roles,
      remove: true,
    });
  }
};

const roleDictionary: Record<UserRole, string> = {
  [UserRole.Owner]: 'Owner',
  [UserRole.Contributor]: 'Contributor',
  [UserRole.Reviewer]: 'Reviewer',
};

// Original roles: Convert an array of numbers to an array of corresponding strings
const roleModel = ref<string[]>(
  ([] as UserRole[])
    .concat(props.user.role)
    .map((role: UserRole) => roleDictionary[role])
);
const roleOptions = [
  {
    value: 'Contributor',
    label: 'Contributor',
    disable: false,
  },
  {
    value: 'Reviewer',
    label: 'Reviewer',
    disable: false,
  },
];
if (roleModel.value.includes('Owner')) {
  roleOptions.unshift({
    value: 'Owner',
    label: 'Owner',
    disable: true,
  });
}
</script>
