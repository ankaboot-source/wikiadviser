<template>
  <q-expansion-item v-if="revision.items.length" v-model="expanded">
    <template #header>
      <q-item-section class="text-body">
        <q-item-label>
          <q-badge
            rounded
            text-color="black"
            color="yellow-8"
            class="q-mt-s text-capitalize"
            :label="revision.items.length"
            size="sm"
          >
            <q-tooltip>
              {{ revision.items.length }} changes awaiting reviewal
            </q-tooltip>
          </q-badge>
          {{
            `Revision of ${new Date(
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
          v-for="item in revision.items"
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
import { ref, watch } from 'vue';
import DiffItem from './DiffItem.vue';
import { ChangesItem, UserRole } from 'src/types';
import { useSelectedChangeStore } from 'src/stores/useSelectedChangeStore';

const props = defineProps<{
  role: UserRole;
  revision: {
    revision: number;
    items: ChangesItem[];
  };
}>();
const expanded = ref(true);

const description = 'Revision summary';

const store = useSelectedChangeStore();
watch(
  () => store.selectedChangeId,
  (selectedChangeId) => {
    if (selectedChangeId === '') {
      return;
    }

    expanded.value = props.revision.items.some(
      (item) => item.id === selectedChangeId
    );
  }
);
</script>
