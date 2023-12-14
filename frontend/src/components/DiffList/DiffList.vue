<template>
  <div class="column">
    <div class="text-h6 q-pb-sm">Validate Changes</div>
    <q-scroll-area v-if="props.changesList.length" class="col-grow">
      <revision-item
        v-for="revision in groupedIndexedChanges"
        :key="revision.revision"
        :revision="revision"
        :role="role"
      />

      <!-- Old (Unindexed) Changes -->
      <q-expansion-item
        v-if="unindexedChanges.length"
        class="q-mb-md q-mx-sm borders bg-accent rounded-borders"
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
import RevisionItem from './RevisionItem.vue';
import { ChangesItem, UserRole } from 'src/types';

const props = defineProps<{
  role: UserRole;
  changesList: ChangesItem[];
}>();

const indexedChanges = computed(() =>
  props.changesList.filter((item) => item.index !== null)
);
const groupedIndexedChanges = computed(() => {
  const grouped = new Map<
    number,
    {
      revision: number;
      items: ChangesItem[];
      reviewed: ChangesItem[];
      awaiting: ChangesItem[];
    }
  >();

  indexedChanges.value.forEach((item) => {
    const revision = item.revision;
    if (!grouped.has(revision)) {
      grouped.set(revision, {
        revision,
        items: [],
        reviewed: [],
        awaiting: [],
      });
    }

    grouped.get(revision)?.items.push(item);
    if (item.status !== 0) {
      grouped.get(revision)?.reviewed.push(item);
    } else {
      grouped.get(revision)?.awaiting.push(item);
    }
  });

  return Array.from(grouped.values()).sort((a, b) => b.revision - a.revision);
});

console.log(groupedIndexedChanges.value);
const unindexedChanges = computed(() =>
  props.changesList.filter((item) => item.index === null)
);
</script>
