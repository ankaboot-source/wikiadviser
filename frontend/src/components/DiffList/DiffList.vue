<template>
  <div class="column">
    <div class="text-h6 q-px-sm q-pb-sm">
      <q-icon size="sm" name="thumbs_up_down" /> Changes to review
    </div>
    <q-scroll-area v-if="props.changesList.length" class="col-grow">
      <revision-item
        v-for="revision in groupedIndexedChanges"
        :key="revision.revid"
        :revision="revision"
        :role="role"
        :article-id="articleId"
      />

      <!-- Past changes -->
      <q-expansion-item v-if="pastChanges.length" v-model="expanded">
        <template #header>
          <q-item-section>
            <q-item-label class="text-h6">
              <q-icon size="sm" name="archive" /> Past changes
            </q-item-label>
          </q-item-section>
        </template>
        <q-item-section>
          <q-list>
            <diff-item
              v-for="item in archivedChanges"
              :key="item.id"
              :item="item"
              :role="role"
              :past-change="{
                text: 'This change was manually archived.',
              }"
            />
            <diff-item
              v-for="item in unindexedChanges"
              :key="item.id"
              :item="item"
              :role="role"
              :past-change="{
                icon: 'link_off',
                text: 'This change was automatically orphaned.',
                disable: true,
              }"
            />
            <q-separator />
          </q-list>
        </q-item-section>
      </q-expansion-item>
    </q-scroll-area>
    <template v-else>
      <div class="q-pl-sm q-py-sm">
        <div class="q-pb-sm text-body1 text-weight-medium">
          There are currently no changes
        </div>
        <div class="text-body2">
          After the article is edited, the changes will be displayed here for your review.
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useSelectedChangeStore } from 'src/stores/useSelectedChangeStore';
import { ChangesItem, UserRole } from 'src/types';
import { computed, ref, watch } from 'vue';
import DiffItem from './DiffItem.vue';
import RevisionItem from './RevisionItem.vue';

const store = useSelectedChangeStore();

const props = defineProps<{
  articleId: string;
  role: UserRole;
  changesList: ChangesItem[];
}>();

const groupedChanges = computed(() => {
  const grouped = new Map<
    number,
    {
      revid: number;
      summary: string;
      items: ChangesItem[];
    }
  >();

  props.changesList.forEach((item) => {
    const revid = item.revision.revid;
    const summary = item.revision.summary;
    if (!grouped.has(revid)) {
      grouped.set(revid, {
        revid,
        summary,
        items: [],
      });
    }

    grouped.get(revid)?.items.push(item);
  });

  const sortedGrouped = Array.from(grouped.values()).sort(
    (a, b) => b.revid - a.revid,
  );

  return sortedGrouped.map((item, index) => ({
    isRecent: index === 0,
    index: sortedGrouped.length - index,
    ...item,
  }));
});

const groupedIndexedChanges = computed(() =>
  groupedChanges.value
    .map((groupedItem) => ({
      ...groupedItem,
      items: groupedItem.items.filter(
        (item) => item.index !== null && !item.archived,
      ),
    }))
    .filter((groupedItem) => groupedItem.items.length > 0),
);

const archivedChanges = computed(() =>
  props.changesList.filter((item) => item.archived),
);
const unindexedChanges = computed(() =>
  props.changesList.filter((item) => item.index === null),
);
const pastChanges = computed(() =>
  archivedChanges.value.concat(unindexedChanges.value),
);

const expanded = ref(false);

watch(
  () => store.selectedChangeId,
  (selectedChangeId) => {
    if (selectedChangeId === '') {
      return;
    }

    expanded.value = archivedChanges.value.some(
      (item) => item.status !== 0 && item.id === selectedChangeId,
    );
  },
);
</script>
<style>
.q-scrollarea__content {
  width: inherit !important;
}
</style>
