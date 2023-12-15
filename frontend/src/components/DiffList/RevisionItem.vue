<template>
  <q-expansion-item v-if="revision.awaiting.length" v-model="expanded">
    <template #header>
      <q-item-section class="text-body">
        <q-item-label>
          <q-badge
            rounded
            text-color="black"
            color="yellow-8"
            class="q-mt-s text-capitalize"
            :label="revision.awaiting.length"
            size="sm"
          >
            <q-tooltip>
              {{ revision.awaiting.length }} changes awaiting reviewal
            </q-tooltip>
          </q-badge>
          {{
            `${new Date(
              revision.items[0]?.created_at
            ).toLocaleDateString()} at ${new Date(
              revision.items[0]?.created_at
            ).toLocaleTimeString(undefined, { timeStyle: 'short' })}`
          }}
        </q-item-label>

        <q-item-label v-if="!expanded" caption lines="2">
          <q-tooltip>{{ description }}</q-tooltip>
          <div>{{ description }}</div>
        </q-item-label>
      </q-item-section>
    </template>

    <!-- Current Changes -->
    <q-list>
      <q-item-label class="q-ma-sm">
        <div>{{ description }}</div>
      </q-item-label>

      <q-list>
        <diff-item
          v-for="item in revision.awaiting"
          :key="item.id"
          :item="item"
          :role="role"
        />
      </q-list>
    </q-list>
    <q-separator />
  </q-expansion-item>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DiffItem from './DiffItem.vue';
import { ChangesItem, UserRole } from 'src/types';
import { _ } from 'app/dist/spa/assets/plugin-vue_export-helper.21dcd24c';

const props = defineProps<{
  role: UserRole;
  changesList: ChangesItem[];
  revision: {
    revision: number;
    items: ChangesItem[];
    reviewed: ChangesItem[];
    awaiting: ChangesItem[];
  };
}>();
const expanded = ref(true);

const description = 'Revision summary';
</script>
