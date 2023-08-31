<template>
  <div class="column">
    <div class="text-h6 q-pb-sm">Validate Changes</div>
    <q-scroll-area class="col-grow">
      <q-list>
        <diff-item
          v-for="item in props.changesList"
          :key="item.id"
          :item="item"
          :role="role"
        />
      </q-list>
    </q-scroll-area>
  </div>
</template>

<script setup lang="ts">
import DiffItem from './DiffItem.vue';
import { ChangesItem, UserRole } from 'src/types';

const props = defineProps<{
  role: UserRole;
  changesList: ChangesItem[];
}>();
</script>
