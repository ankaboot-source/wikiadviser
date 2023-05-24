<template>
  <q-item-section>
    <q-item-label>{{ props.user.username }}</q-item-label>
    <q-item-label caption>{{ props.user.email }}</q-item-label>
    <q-select
      v-model="roleModel"
      :options="roleOptions"
      label="Role"
      @change="handleRoleChange(props.user)"
    />
  </q-item-section>
</template>

<script setup lang="ts">
import { User } from 'src/types';
import { ref } from 'vue';

const props = defineProps<{
  user: User;
}>();
const roles: { [key: number]: string } = {
  0: 'Owner',
  1: 'Contributor',
  2: 'Reviewer',
};
const roleModel = ref(roles[props.user.role]);
const roleOptions = Object.values(roles);

function handleRoleChange(user: User) {
  console.log(user);
}
</script>
