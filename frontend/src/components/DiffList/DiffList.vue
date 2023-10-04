<template>
  <div class="column">
    <div class="text-h6 q-pb-sm">Validate Changes</div>
    <q-scroll-area v-if="props.changesList.length" class="col-grow">
      <q-list>
        <diff-item
          v-for="item in indexedChanges"
          :key="item.id"
          :item="item"
          :role="role"
        />
      </q-list>

      <q-expansion-item
        v-if="unindexedChanges.length"
        style="border-radius: 4px"
        class="q-mb-md q-mx-sm borders bg-accent"
        label="Old changes"
      >
        <q-list>
          <diff-item
            v-for="item in unindexedChanges"
            :key="item.id"
            :item="item"
            :role="role"
          />
        </q-list>
      </q-expansion-item>
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
import { computed } from 'vue';
import DiffItem from './DiffItem.vue';
import { ChangesItem, UserRole } from 'src/types';

const props = defineProps<{
  role: UserRole;
  changesList: ChangesItem[];
}>();

const indexedChanges = computed(() =>
  props.changesList.filter((item) => item.index !== null)
);
const unindexedChanges = computed(() =>
  props.changesList.filter((item) => item.index === null)
);
</script>
