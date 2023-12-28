<template>
  <q-expansion-item v-if="revision.items.length" v-model="expanded">
    <template #header>
      <q-item-section class="text-body2">
        <q-item-label class="row">
          <q-item-section>
            <q-item-label>
              {{ `Revision n°${revision.index}` }}
              <q-badge
                outline
                rounded
                color="blue-grey-10"
                class="q-mt-s text-capitalize"
                :label="revision.items.length"
                size="sm"
              >
                <q-tooltip>
                  {{ changesToReviewLength }}/{{ revision.items.length }}
                  changes awaiting reviewal
                </q-tooltip>
              </q-badge>
            </q-item-label>
          </q-item-section>
          <q-item-section side caption class="text-right">
            <div class="text-black">
              <q-avatar size="sm">
                <img :src="revision.items[0]?.user.picture" />
              </q-avatar>
              {{ revision.items[0]?.user.email }}
            </div>

            <div style="size: 0.5rem">
              {{ localeDateString }} at {{ localeTimeString }}
            </div>
          </q-item-section>
        </q-item-label>

        <q-item-section class="word_break_all">
          <q-item-label v-if="!expanded" caption lines="1">
            {{ summary }}
          </q-item-label>
          <q-item-label v-else caption lines="3">
            {{ summary }} <q-tooltip>{{ summary }}</q-tooltip>
          </q-item-label>
        </q-item-section>
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
    index: number;
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

const localeDateString = computed(() =>
  new Date(props.revision.items[0]?.created_at).toLocaleDateString()
);
const localeTimeString = computed(() =>
  new Date(props.revision.items[0]?.created_at).toLocaleTimeString(undefined, {
    timeStyle: 'short',
  })
);
</script>
