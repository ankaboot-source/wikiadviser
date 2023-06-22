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
import { User } from 'src/types';
import { ref } from 'vue';

const props = defineProps<{
  user: User;
  role: Role | null;
}>();

enum Role {
  Owner = 0,
  Contributor = 1,
  Reviewer = 2,
}

const roleDictionary: Record<Role, string> = {
  [Role.Owner]: 'Owner',
  [Role.Contributor]: 'Contributor',
  [Role.Reviewer]: 'Reviewer',
};
const roleModel = ref<string>(roleDictionary[props.user.role as Role]);
const roleOptions = ['Contributor', 'Reviewer'];

async function handleRoleChange() {
  //Set permission
  console.log(roleModel.value);
  await updatePermission(
    props.user.permissionId,
    Role[roleModel.value as keyof typeof Role]
  );
}
</script>
