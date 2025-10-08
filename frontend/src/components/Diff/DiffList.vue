<template>
  <div class="column">
    <!-- Desktop Layout -->
    <template v-if="$q.screen.gt.sm">
      <div class="text-h6 q-px-md q-pb-sm">
        <q-icon size="sm" name="thumbs_up_down" /> Changes to review
      </div>
      <q-scroll-area v-if="props.changesList.length" class="col-grow">
        <diff-revision
          v-for="revision in groupedIndexedChanges"
          :key="revision.revid"
          :revision="revision"
          :role="role"
          :article-id="articleId"
        />

        <q-expansion-item v-if="pastChanges.length" v-model="expanded">
          <template #header>
            <q-item-section>
              <q-item-label class="text-h6">
                <q-icon size="sm" name="archive" /> Past changes
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
            </q-list>
          </q-item-section>
        </q-expansion-item>
      </q-scroll-area>
      <div v-else class="q-pa-sm">
        <div class="q-pb-sm text-body1 text-weight-medium">
          There are currently no changes
        </div>
        <div class="text-body2">
          After the article is edited, the changes will be displayed here for
          your review.
        </div>
      </div>
    </template>

    <!-- Mobile Layout -->
    <template v-else>
      <q-expansion-item
        v-model="expandedMain"
        icon="thumbs_up_down"
        label="Changes to review"
        header-class="text-h6"
      >
        <div v-if="props.changesList.length" class="q-pa-sm">
          <diff-revision
            v-for="revision in groupedIndexedChanges"
            :key="revision.revid"
            :revision="revision"
            :role="role"
            :article-id="articleId"
          />

          <q-expansion-item v-if="pastChanges.length" v-model="expanded">
            <template #header>
              <q-item-section>
                <q-item-label class="text-h6">
                  <q-icon size="sm" name="archive" /> Past changes
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
              </q-list>
            </q-item-section>
          </q-expansion-item>
        </div>
        <div v-else class="q-pa-sm">
          <div class="q-pb-sm text-body1 text-weight-medium">
            There are currently no changes
          </div>
          <div class="text-body2">
            After the article is edited, the changes will be displayed here for
            your review.
          </div>
        </div>
      </q-expansion-item>
    </template>
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
  props.changesList.filter((item) => item.index === null && !item.hidden),
);
const pastChanges = computed(() =>
  archivedChanges.value.concat(unindexedChanges.value),
);
const expanded = ref(false);
const expandedMain = ref(false);

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

    expandedMain.value = true;
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
</style>
