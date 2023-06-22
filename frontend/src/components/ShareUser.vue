<template>
  <q-item-section>
    <q-item-label>{{ props.user.username }}</q-item-label>
    <q-item-label caption>{{ props.user.email }}</q-item-label>
    <q-select
      v-model="roleModel"
      :options="roleOptions"
      label="Role"
      :disable="!!role || roleModel == 'Owner'"
      @update:model-value="handleRoleChange()"
    />
  </q-item-section>
</template>

<script setup lang="ts">
import { updatePermission } from 'src/api/supabaseHelper';
import { User, UserRole } from 'src/types';
import { ref } from 'vue';

const props = defineProps<{
  user: User;
  role: UserRole | null;
}>();
const roleDictionary: Record<UserRole, string> = {
  [UserRole.Owner]: 'Owner',
  [UserRole.Contributor]: 'Contributor',
  [UserRole.Reviewer]: 'Reviewer',
};
const roleModel = ref<string>(roleDictionary[props.user.role as UserRole]);
const roleOptions = ['Contributor', 'Reviewer'];

async function handleRoleChange() {
  //Set permission
  console.log(roleModel.value);
  await updatePermission(
    props.user.permissionId,
    UserRole[roleModel.value as keyof typeof UserRole]
  );
}
</script>
