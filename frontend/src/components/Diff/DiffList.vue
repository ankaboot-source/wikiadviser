<template>
  <div class="column">
    <!-- Only show header on desktop -->
    <div v-if="$q.screen.gt.sm" class="q-px-sm q-pt-sm">
      <q-item-label class="text-h6">
        <q-icon size="sm" name="thumbs_up_down" />
        <q-badge
          outline
          rounded
          class="q-ml-xs q-mr-xs"
          text-color="black"
          :label="groupedIndexedChanges.length"
        />
        Changes to review
      </q-item-label>
    </div>

    <component
      :is="$q.screen.gt.sm ? 'q-scroll-area' : 'div'"
      v-if="props.changesList.length"
      class="col-grow q-pa-sm"
    >
      <diff-revision
        v-for="(revision, index) in groupedIndexedChanges"
        :key="revision.revid"
        :revision="revision"
        :role="role"
        :article-id="articleId"
        :is-first="index === 0"
      />

      <q-expansion-item
        v-if="pastChanges.length && $q.screen.gt.sm"
        v-model="expanded"
        expand-icon="keyboard_arrow_down"
        header-class="text-h6"
      >
        <template #header>
          <q-item-section>
            <q-item-label class="text-h6">
              <q-icon size="sm" name="archive" />
              <q-badge
                outline
                rounded
                class="q-ml-xs q-mr-xs"
                text-color="black"
                :label="pastChanges.length"
              />
              Past changes
            </q-item-label>
          </q-item-section>
        </template>

        <q-item-section>
          <q-list class="q-mt-md">
            <diff-item
              v-for="item in archivedChanges"
              :key="item.id"
              :item="item"
              :role="role"
              :past-change="{ text: 'This change was manually archived.' }"
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
          </q-list>
        </q-item-section>
      </q-expansion-item>
    </component>

    <div v-else class="q-pa-sm">
      <div class="q-pb-sm text-body1 text-weight-medium">
        There are currently no changes
      </div>
      <div class="text-body2">
        After the article is edited, the changes will be displayed here for your
        review.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSelectedChangeStore } from 'src/stores/useSelectedChangeStore';
import { ChangeItem, Enums } from 'src/types';
import { computed, ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import DiffItem from './DiffItem.vue';
import DiffRevision from './DiffRevision.vue';

const store = useSelectedChangeStore();
const route = useRoute();
const $q = useQuasar();

const props = defineProps<{
  articleId: string;
  role: Enums<'role'>;
  changesList: ChangeItem[];
}>();

const groupedChanges = computed(() => {
  const grouped = new Map<
    number,
    {
      revid: number;
      summary: string;
      items: ChangeItem[];
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

  const allRevisionIds = sortedGrouped.map(g => g.revid).sort((a, b) => a - b);
  const firstRevisionId = allRevisionIds.length > 0 ? allRevisionIds[0] : null;
  const filteredGrouped = sortedGrouped.filter(
    (item) => item.revid !== firstRevisionId
  );
  return filteredGrouped.map((item, index) => ({
    isRecent: index === 0,
    index: filteredGrouped.length - index,
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
  props.changesList.filter((item) => item.index === null && !item.hidden),
);
const pastChanges = computed(() =>
  archivedChanges.value.concat(unindexedChanges.value),
);
const expandedMobile = ref(true);
const expanded = ref(false);

watch(
  () => store.selectedChangeId,
  (selectedChangeId) => {
    if (selectedChangeId === '') {
      return;
    }

    const isInPastChanges = archivedChanges.value.some(
      (item) => item.status !== 0 && item.id === selectedChangeId,
    );

    if (isInPastChanges) {
      expanded.value = true;
    }

    if ($q.screen.lt.md) {
      expandedMobile.value = true;
    }
  },
);

onMounted(() => {
  const changeId = route.query.change as string | undefined;
  if (changeId) {
    store.selectedChangeId = changeId;
  }
});
</script>

<style>
.q-scrollarea__content {
  width: inherit !important;
}
.col-grow {
  flex: 1;
  overflow: auto;
  scrollbar-width: none;
}
</style>
