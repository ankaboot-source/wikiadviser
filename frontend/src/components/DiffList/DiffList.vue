<template>
  <div class="column">
    <div class="text-h6 q-pb-sm">Validate Changes</div>
    <q-scroll-area v-if="props.changesList.length" class="col-grow">
      <q-expansion-item
        v-for="revision in groupedIndexedChanges"
        :key="revision.revision"
        v-model="expanded"
        style="border-radius: 4px"
        class="q-mb-md q-mx-sm borders bg-accent"
      >
        <template #header>
          <q-item-section class="text-body1">
            <q-item-label>
              Revision {{ revision.revision }}
              <br />
              <q-badge
                text-color="light-blue-1"
                color="light-blue-10"
                class="q-mt-s text-capitalize"
                :label="`${revision.items.length} changes`"
                size="sm"
              />
            </q-item-label>

            <q-item-label v-if="!expanded" caption lines="2">
              <q-tooltip>{{ description }}</q-tooltip>
              <div>{{ description }}</div>
            </q-item-label>
          </q-item-section>
          <q-item-section caption top side lines="2">
            <span class="text-black">
              <q-avatar size="sm" icon="person" color="accent" />
              {{ revision.items[0]?.user.email }}</span
            >
            <span style="size: 0.5rem">
              {{ new Date(revision.items[0]?.created_at).toLocaleTimeString() }}
              <br />
              {{ new Date(revision.items[0]?.created_at).toLocaleDateString() }}
            </span>
          </q-item-section>
        </template>

        <q-list>
          <q-item-label class="q-ma-sm">
            <div>{{ description }}</div>
          </q-item-label>
          <diff-item
            v-for="item in revision.items"
            :key="item.id"
            :item="item"
            :role="role"
          />
        </q-list>
      </q-expansion-item>

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
import { computed, ref } from 'vue';
import DiffItem from './DiffItem.vue';
import { ChangesItem, UserRole } from 'src/types';

const props = defineProps<{
  role: UserRole;
  changesList: ChangesItem[];
}>();

const indexedChanges = computed(() =>
  props.changesList.filter((item) => item.index !== null)
);
const expanded = ref(false);

const description = 'Revision description';
const groupedIndexedChanges = computed(() => {
  const grouped = new Map<number, { revision: number; items: ChangesItem[] }>();

  indexedChanges.value.forEach((item) => {
    const revision = item.revision;
    if (!grouped.has(revision)) {
      grouped.set(revision, { revision, items: [] });
    }
    grouped.get(revision)?.items.push(item);
  });
  return Array.from(grouped.values()).sort((a, b) => b.revision - a.revision);
});

console.log(groupedIndexedChanges.value);
const unindexedChanges = computed(() =>
  props.changesList.filter((item) => item.index === null)
);
</script>
