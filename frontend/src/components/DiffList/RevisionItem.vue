<template>
  <q-expansion-item v-if="revision.items.length" v-model="expanded">
    <template #header>
      <q-item-section class="text-body">
        <q-item-label>
          {{
            `Revision of ${new Date(
              revision.items[0]?.created_at
            ).toLocaleDateString()} at ${new Date(
              revision.items[0]?.created_at
            ).toLocaleTimeString(undefined, { timeStyle: 'short' })}`
          }}
          <q-badge
            outline
            rounded
            color="blue-grey-10"
            class="q-mt-s text-capitalize"
            :label="revision.items.length"
            size="sm"
          >
            <q-tooltip>
              {{ changesToReviewLength }}/{{ revision.items.length }} changes
              awaiting reviewal
            </q-tooltip>
          </q-badge>
        </q-item-label>

        <q-item-label v-if="!expanded" caption lines="1">
          {{ summary }}
        </q-item-label>
        <q-item-label v-else caption lines="3">
          {{ summary }} <q-tooltip>{{ summary }}</q-tooltip>
        </q-item-label>
      </q-item-section>
    </template>

    <!-- Current Changes -->
    <q-list>
      <diff-item
        v-for="item in revision.items"
        :key="item.id"
        :item="item"
        :role="role"
      />
    </q-list>

    <q-separator />
  </q-expansion-item>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import DiffItem from './DiffItem.vue';
import { ChangesItem, UserRole } from 'src/types';
import { useSelectedChangeStore } from 'src/stores/useSelectedChangeStore';

const props = defineProps<{
  role: UserRole;
  revision: {
    revision: number;
    summary: string;
    items: ChangesItem[];
  };
}>();
const expanded = ref(true);

const summary = computed(() => props.revision.summary);

const changesToReviewLength = computed(() => {
  return props.revision.items.filter((item) => item.status === 0).length;
});
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
<style>
.textarea__limit_height textarea.q-field__native {
  height: 1rem;
}
</style>
