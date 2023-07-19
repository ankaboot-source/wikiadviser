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
        :disable="!!role"
        type="checkbox"
      />
    </q-item-section>
  </q-expansion-item>
</template>

<script setup lang="ts">
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
const roleModel = ref<string[]>([roleDictionary[props.user.role as UserRole]]);
console.log(roleModel.value);
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
