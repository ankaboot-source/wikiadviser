<template>
  <div class="column">
    <!-- Desktop layout: Always expanded, no outer expansion-item -->
    <template v-if="!mobileMode">
      <template v-if="props.changesList.length">
        <div class="text-h6 q-px-md q-pb-sm">
          <q-icon size="sm" name="thumbs_up_down" /> Changes to review
          <q-badge
            v-if="groupedIndexedChanges.length"
            outline
            rounded
            class="q-ml-sm text-capitalize text-dark"
            :label="groupedIndexedChanges.length"
            size="sm"
          >
            <q-tooltip>
              {{ groupedIndexedChanges.length }} revision{{
                groupedIndexedChanges.length !== 1 ? 's' : ''
              }}
              to review
            </q-tooltip>
          </q-badge>
        </div>
        <q-scroll-area style="height: 500px" class="no-scrollbar">
          <diff-revision
            v-for="revision in groupedIndexedChanges"
            :key="revision.revid"
            :revision="revision"
            :role="role"
            :article-id="articleId"
          />
        </q-scroll-area>

        <!-- Past changes - always visible in desktop -->
        <template v-if="pastChanges.length">
          <div class="text-h6 q-px-md q-pt-md q-pb-sm">
            <q-icon size="sm" name="archive" /> Past changes
            <q-badge
              outline
              rounded
              class="q-ml-sm text-capitalize text-dark"
              :label="pastChanges.length"
              size="sm"
            >
              <q-tooltip>
                {{ pastChanges.length }} past change{{
                  pastChanges.length !== 1 ? 's' : ''
                }}
              </q-tooltip>
            </q-badge>
          </div>
          <q-scroll-area style="height: 200px" class="no-scrollbar q-mb-md">
            <q-list class="q-mt-md">
              <div class="column">
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
              </div>
            </q-list>
          </q-scroll-area>
        </template>
      </template>
      <template v-else>
        <div class="text-h6 q-px-md q-pb-sm">
          <q-icon size="sm" name="thumbs_up_down" /> Changes to review
        </div>
        <div class="q-pa-sm">
          <div class="q-pb-sm text-body1 text-weight-medium">
            There are currently no changes
          </div>
          <div class="text-body2">
            After the article is edited, the changes will be displayed here for
            your review.
          </div>
        </div>
      </template>
    </template>

    <!-- Mobile layout: Collapsible outer expansion-item -->
    <template v-else>
      <q-expansion-item
        v-if="props.changesList.length"
        v-model="changesExpanded"
        class="mobile-expansion"
      >
        <template #header>
          <q-item-section>
            <q-item-label class="text-h6 mobile-header">
              <q-icon size="sm" name="thumbs_up_down" /> Changes to review
              <q-badge
                v-if="groupedIndexedChanges.length"
                outline
                rounded
                class="q-ml-sm text-capitalize text-dark"
                :label="groupedIndexedChanges.length"
                size="sm"
              >
                <q-tooltip>
                  {{ groupedIndexedChanges.length }} revision{{
                    groupedIndexedChanges.length !== 1 ? 's' : ''
                  }}
                  to review
                </q-tooltip>
              </q-badge>
            </q-item-label>
          </q-item-section>
        </template>

        <q-scroll-area style="height: 35vh" class="mobile-scroll no-scrollbar">
          <diff-revision
            v-for="revision in groupedIndexedChanges"
            :key="revision.revid"
            :revision="revision"
            :role="role"
            :article-id="articleId"
          />
        </q-scroll-area>

        <!-- Past changes -->
        <q-expansion-item
          v-if="pastChanges.length"
          v-model="pastChangesExpanded"
        >
          <template #header>
            <q-item-section>
              <q-item-label class="text-h6">
                <q-icon size="sm" name="archive" /> Past changes
                <q-badge
                  outline
                  rounded
                  class="q-ml-sm text-capitalize text-dark"
                  :label="pastChanges.length"
                  size="sm"
                >
                  <q-tooltip>
                    {{ pastChanges.length }} past change{{
                      pastChanges.length !== 1 ? 's' : ''
                    }}
                  </q-tooltip>
                </q-badge>
              </q-item-label>
            </q-item-section>
          </template>
          <q-scroll-area style="height: 15vh" class="no-scrollbar">
            <q-item-section>
              <q-list class="q-mt-md">
                <div class="column">
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
                </div>
              </q-list>
            </q-item-section>
          </q-scroll-area>
        </q-expansion-item>
      </q-expansion-item>

      <template v-if="!props.changesList.length">
        <div class="text-h6 q-px-md q-pb-sm mobile-header">
          <q-icon size="sm" name="thumbs_up_down" /> Changes to review
        </div>
        <div class="q-pa-sm">
          <div class="q-pb-sm text-body1 text-weight-medium">
            There are currently no changes
          </div>
          <div class="text-body2">
            After the article is edited, the changes will be displayed here for
            your review.
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useSelectedChangeStore } from 'src/stores/useSelectedChangeStore';
import { ChangeItem, Enums } from 'src/types';
import { computed, ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import DiffItem from './DiffItem.vue';
import DiffRevision from './DiffRevision.vue';

const store = useSelectedChangeStore();
const route = useRoute();

const props = defineProps<{
  articleId: string;
  role: Enums<'role'>;
  changesList: ChangeItem[];
  mobileMode?: boolean;
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

const changesExpanded = ref(true);
const pastChangesExpanded = ref(false);

// In mobile mode, start collapsed to save space and keep close to content
if (props.mobileMode) {
  changesExpanded.value = false;
}

watch(
  () => store.selectedChangeId,
  (selectedChangeId) => {
    if (selectedChangeId === '') {
      return;
    }

    const hasSelectedInCurrent = groupedIndexedChanges.value.some((revision) =>
      revision.items.some((item) => item.id === selectedChangeId),
    );

    if (hasSelectedInCurrent) {
      changesExpanded.value = true;
    }

    pastChangesExpanded.value = archivedChanges.value.some(
      (item) => item.status !== 0 && item.id === selectedChangeId,
    );
  },
);

onMounted(() => {
  const changeId = route.query.change as string | undefined;
  if (changeId) {
    store.selectedChangeId = changeId;
  }
});
</script>

<style scoped>
.q-scrollarea__content {
  width: inherit !important;
}

.no-scrollbar .q-scroll-area__content {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.no-scrollbar .q-scroll-area__content::-webkit-scrollbar {
  display: none;
}

.mobile-expansion {
  margin: 0 !important;
}

.mobile-header {
  font-size: 1.1rem !important;
  padding: 8px 0 !important;
}

.mobile-scroll {
  max-height: 250px;
}

.mobile-expansion .q-expansion-item__container {
  transition: all 0.3s ease;
}

.mobile-expansion:not(.q-expansion-item--expanded) {
  min-height: 48px;
}

.mobile-expansion:not(.q-expansion-item--expanded) .q-expansion-item__content {
  display: none;
}

.mobile-expansion .q-expansion-item__content {
  padding-bottom: 16px;
}
</style>
