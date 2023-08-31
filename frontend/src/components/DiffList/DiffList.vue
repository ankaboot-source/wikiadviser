<template>
  <div class="column">
    <div class="text-h6 q-pb-sm">Validate Changes</div>
    <q-scroll-area v-if="props.changesList.length" class="col-grow">
      <q-list>
        <diff-item
          v-for="item in props.changesList"
          :key="item.id"
          :item="item"
          :role="role"
        />
      </q-list>
    </q-scroll-area>
    <template v-else>
      <div class="q-py-sm text-body1 text-weight-medium">
        There are currently no changes
      </div>
      <div class="q-pb-sm text-body2">
        Easily navigate through changes using the changes tab once the article
        has been edited.
      </div>
    </template>
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
