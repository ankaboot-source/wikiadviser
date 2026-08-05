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
                class="q-mt-s text-capitalize text-dark"
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
          <q-item-section side caption class="text-right" style="width: 66%">
            <div class="text-black">
              <user-component
                :avatar-url="revision.items[0]?.user.avatar_url"
                :name="
                  revision.items[0]?.user.display_name ||
                  revision.items[0]?.user.email
                "
                section="revision"
              />
            </div>
            <div style="size: 0.5rem">
              {{ localeDateString }} at {{ localeTimeString }}
            </div>
          </q-item-section>
        </q-item-label>

        <q-item-section
          class="full-width"
          style="min-width: 0; overflow: hidden"
        >
          <q-item-label
            :caption="true"
            :style="
              expanded
                ? {
                    overflow: 'hidden',
                    display: '-webkit-box',
                    '-webkit-box-orient': 'vertical',
                    '-webkit-line-clamp': 3,
                  }
                : {
                    overflow: 'hidden',
                    display: '-webkit-box',
                    '-webkit-box-orient': 'vertical',
                    '-webkit-line-clamp': 1,
                  }
            "
          >
            {{ summary }}
            <q-tooltip>{{ summary }}</q-tooltip>
          </q-item-label>
        </q-item-section>
      </q-item-section>
    </template>

    <!-- Whole-revision comment thread (one comment for the whole revision,
         not change-by-change). Sits above the per-change items. -->
    <div v-if="!viewerPermission" class="q-pt-sm q-px-md">
      <div class="row items-center q-gutter-x-sm">
        <q-icon name="forum" size="sm" />
        <div class="text-subtitle2">Comment on this revision</div>
      </div>
      <div
        v-if="revisionComments.length"
        class="revision-comments-list q-px-sm q-pb-sm q-mt-xs bg-secondary rounded-borders"
      >
        <template v-for="comment in revisionComments" :key="comment.id">
          <q-chat-message
            :name="getName(comment.user)"
            :text="[comment.content]"
            :stamp="new Date(comment.created_at).toLocaleString()"
            :sent="comment.user.email == email"
            :avatar="comment.user.avatar_url"
            :bg-color="comment.user.email == email ? 'green' : 'accent'"
            :class="comment.user.email == email ? 'q-mr-xs' : ''"
          />
        </template>
      </div>
      <q-input
        v-model="toSendRevisionComment"
        autogrow
        outlined
        dense
        class="row full-width q-mt-sm"
        placeholder="Leave a comment on this revision"
        :disable="viewerPermission"
        @keydown.enter="handleRevisionComment"
      >
        <template #append>
          <q-btn
            round
            dense
            flat
            icon="send"
            color="primary"
            tabindex="-1"
            @click="handleRevisionComment"
          />
        </template>
      </q-input>
    </div>
    <q-separator v-if="!viewerPermission" class="q-mt-sm" />

    <!-- Reviewability toolbar (issue #1426): type counts, collapse-all,
         filters, navigation, section index, pending bulk actions. -->
    <div
      v-if="revision.items.length"
      class="q-px-md q-py-sm bg-grey-1"
      tabindex="0"
      @keydown.arrow-up.prevent="navigatePrev"
      @keydown.arrow-down.prevent="navigateNext"
      @keydown.k.prevent="navigatePrev"
      @keydown.j.prevent="navigateNext"
    >
      <!-- Type counts + collapse-all / expand-all -->
      <div class="row items-center q-gutter-x-sm no-wrap">
        <q-badge
          v-for="cat in typeCountBadges"
          :key="cat.key"
          outline
          rounded
          class="text-capitalize cursor-pointer"
          :color="cat.color"
          :label="`${cat.label} ${cat.count}`"
          @click="toggleTypeFilter(cat.key)"
        >
          <q-tooltip>Click to filter to {{ cat.label }} changes</q-tooltip>
        </q-badge>
        <q-space />
        <q-btn
          flat
          dense
          no-caps
          size="sm"
          icon="unfold_less"
          label="Collapse all"
          @click="reviewStore.collapseAll(revision.id, allChangeIds)"
        >
          <q-tooltip>Collapse every change in this revision</q-tooltip>
        </q-btn>
        <q-btn
          flat
          dense
          no-caps
          size="sm"
          icon="unfold_more"
          label="Expand all"
          @click="reviewStore.expandAll(revision.id, allChangeIds)"
        >
          <q-tooltip>Expand every change in this revision</q-tooltip>
        </q-btn>
      </div>

      <!-- Filters -->
      <div class="row items-center q-gutter-x-sm q-mt-xs">
        <q-btn
          flat
          dense
          no-caps
          size="sm"
          :color="reviewStore.unreviewedOnly ? 'primary' : 'grey-7'"
          :label="reviewStore.unreviewedOnly ? 'Unreviewed only' : 'All'"
          :icon="reviewStore.unreviewedOnly ? 'visibility_off' : 'visibility'"
          @click="reviewStore.setUnreviewedOnly(!reviewStore.unreviewedOnly)"
        />
        <q-btn
          v-if="reviewStore.typeFilter !== 'all'"
          flat
          dense
          no-caps
          size="sm"
          color="negative"
          icon="close"
          label="Clear filter"
          @click="reviewStore.setTypeFilter('all')"
        />
        <q-space />
        <!-- Navigation: prev / next + position indicator -->
        <div class="row items-center q-gutter-x-xs">
          <q-btn
            flat
            round
            dense
            size="sm"
            icon="arrow_upward"
            :disable="navIndex <= 0"
            @click="navigatePrev"
          >
            <q-tooltip>Previous change (↑ / k)</q-tooltip>
          </q-btn>
          <span class="text-caption text-weight-medium">
            {{ navPositionLabel }}
          </span>
          <q-btn
            flat
            round
            dense
            size="sm"
            icon="arrow_downward"
            :disable="navIndex >= filteredItems.length - 1"
            @click="navigateNext"
          >
            <q-tooltip>Next change (↓ / j)</q-tooltip>
          </q-btn>
        </div>
      </div>

      <!-- Section index: sections touched, with change counts, click to jump -->
      <div
        v-if="sectionGroups.length > 1"
        class="row q-gutter-x-xs q-mt-xs"
        style="flex-wrap: wrap"
      >
        <q-chip
          v-for="(group, i) in sectionGroups"
          :key="group.section"
          dense
          clickable
          size="sm"
          :color="group.section === activeSection ? 'primary' : 'grey-4'"
          :text-color="group.section === activeSection ? 'white' : 'dark'"
          @click="jumpToSection(i)"
        >
          {{ group.section }}
          <q-badge rounded :label="group.items.length" class="q-ml-xs" />
        </q-chip>
      </div>

      <!-- Pending bulk actions (undoable pre-submission) -->
      <div
        v-if="pendingBulkForRevision.length"
        class="q-mt-xs q-pa-xs bg-orange-1 rounded-borders"
      >
        <div
          v-for="action in pendingBulkForRevision"
          :key="action.id"
          class="row items-center q-gutter-x-sm"
        >
          <q-icon name="task_alt" size="sm" color="orange-8" />
          <span class="text-caption">{{ action.label }}</span>
          <q-btn
            flat
            dense
            no-caps
            size="sm"
            color="primary"
            icon="undo"
            label="Undo"
            @click="undoBulkAction(action)"
          />
        </div>
      </div>
    </div>
    <q-separator />

    <!-- Section groups with changes -->
    <q-list ref="sectionListRef">
      <template
        v-for="(group, groupIndex) in sectionGroups"
        :key="group.section"
      >
        <div
          :ref="(el) => setSectionRef(group.section, el)"
          class="section-header row items-center q-px-md q-py-xs bg-blue-grey-1 cursor-pointer"
          @click="reviewStore.toggleSection(revision.id, group.section)"
        >
          <q-icon
            :name="
              isSectionCollapsed(group.section) ? 'expand_more' : 'expand_less'
            "
            size="sm"
          />
          <span class="text-subtitle2 text-weight-medium q-ml-xs">
            {{ group.section }}
          </span>
          <q-badge rounded :label="group.items.length" class="q-ml-xs" />
          <q-space />
          <!-- Section-level accept / reject (bulk, undoable) -->
          <template v-if="reviewerPermission && !viewerPermission">
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              icon="thumb_up"
              color="positive"
              label="Accept section"
              @click.stop="bulkAcceptSection(group)"
            >
              <q-tooltip>
                Accept all {{ group.items.length }} changes in this section
                (undoable)
              </q-tooltip>
            </q-btn>
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              icon="thumb_down"
              color="negative"
              label="Reject section"
              @click.stop="bulkRejectSection(group)"
            >
              <q-tooltip>
                Reject all {{ group.items.length }} changes in this section
                (undoable)
              </q-tooltip>
            </q-btn>
          </template>
        </div>

        <template v-if="!isSectionCollapsed(group.section)">
          <diff-item
            v-for="(item, index) in group.items"
            :key="item.id"
            :item="item"
            :role="role"
            :section="group.section"
            :revision-id="revisionId"
            :is-current-nav="item.id === currentNavChangeId"
            :is-last-recent-item="
              revision.isRecent &&
              groupIndex === sectionGroups.length - 1 &&
              index === group.items.length - 1
            "
          />
        </template>
      </template>
    </q-list>

    <div v-if="$props.revision.isRecent" class="q-pb-md q-pr-xs text-right">
      <q-btn
        v-if="USE_MIRA"
        no-caps
        outline
        color="primary"
        class="q-mr-sm"
        icon="img:/icons/logo.svg"
        :loading="miraStore.loading"
        :disable="miraStore.loading || !miraStore.selectedPrompt"
        label="Send review"
        @click.stop="sendReview"
      >
        <q-tooltip v-if="miraStore.selectedPrompt">
          Review the article using "{{ miraStore.selectedPrompt.name }}"
        </q-tooltip>
        <q-tooltip v-else>
          No prompt selected — pick one in the toolbar
        </q-tooltip>
      </q-btn>
      <div
        v-if="
          USE_MIRA && miraStore.selectedPrompt && revisionComments.length > 0
        "
        class="text-caption text-grey-7 q-mr-sm q-mt-xs"
        style="max-width: 220px; display: inline-block; vertical-align: middle"
      >
        Will apply your revision comment article-wide.
      </div>
      <q-btn
        no-caps
        unelevated
        flat
        icon="delete_forever"
        color="blue-grey-10"
        label="Cancel this revision"
        @click.stop="deleteRevisionDialog = true"
      />
      <q-dialog v-model="deleteRevisionDialog">
        <q-card>
          <q-toolbar class="borders">
            <q-toolbar-title class="merriweather">
              Cancel Revison
            </q-toolbar-title>
            <q-btn v-close-popup flat round dense icon="close" size="sm" />
          </q-toolbar>
          <q-card-section>
            Canceling this revision is permanent. You will lose all changes and
            details about this revision.
          </q-card-section>
          <q-card-actions class="borders">
            <q-space />
            <q-btn
              v-if="!deletingRevision"
              v-close-popup
              no-caps
              outline
              color="primary"
              label="Do not cancel this revision"
            />
            <q-btn
              :v-close-popup="!deletingRevision"
              unelevated
              color="negative"
              no-caps
              label="Cancel this revision"
              :loading="deletingRevision"
              @click="deleteRevision()"
            >
              <template #loading>
                <q-spinner class="on-left" />
                Canceling
              </template>
            </q-btn>
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
    <q-separator />
  </q-expansion-item>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import supabaseClient from 'src/api/supabase';
import { insertRevisionComment, updateChange } from 'src/api/supabaseHelper';
import ENV from 'src/schema/env.schema';
import {
  useDiffReviewStore,
  PendingBulkAction,
} from 'src/stores/useDiffReviewStore';
import { useMiraReviewStore } from 'src/stores/useMiraReviewStore';
import { useSelectedChangeStore } from 'src/stores/useSelectedChangeStore';
import { useUserStore } from 'src/stores/userStore';
import { Comment, Enums, Profile, Revision, Status } from 'src/types';
import {
  categorizeChangeType,
  ChangeTypeCategory,
  groupChangesBySection,
  SectionGroup,
  summarizeRevision,
} from 'src/utils/changeGrouping';
import { MAX_EMAIL_LENGTH } from 'src/utils/consts';
import { computed, nextTick, ref, watch } from 'vue';
import UserComponent from '../UserComponent.vue';
import DiffItem from './DiffItem.vue';

const USE_MIRA = ENV.USE_MIRA;

const props = defineProps<{
  role: Enums<'role'>;
  revision: Revision;
  articleId: string;
  isFirst: boolean;
  revisionComments: Comment[];
  sectionMap: Map<string, string>;
}>();

const store = useSelectedChangeStore();
const userStore = useUserStore();
const miraStore = useMiraReviewStore();
const reviewStore = useDiffReviewStore();
const $q = useQuasar();

const expanded = ref($q.screen.gt.sm || props.isFirst);
const deleteRevisionDialog = ref<boolean>(false);
const deletingRevision = ref<boolean>(false);
const toSendRevisionComment = ref('');

// Register this revision's default collapse state (threshold-based) during
// setup so children read the correct default on first render.
reviewStore.registerRevisionDefault(
  String(props.revision.revid),
  props.revision.items.length,
);

const summary = computed(() => props.revision.summary);
const changesToReviewLength = computed(() => {
  return props.revision.items.filter((item) => item.status === 0).length;
});
const localeDateString = computed(() =>
  new Date(props.revision.items[0]?.created_at as string).toLocaleDateString(),
);
const localeTimeString = computed(() =>
  new Date(props.revision.items[0]?.created_at as string).toLocaleTimeString(
    undefined,
    {
      timeStyle: 'short',
    },
  ),
);

const revisionComments = computed(() => props.revisionComments || []);
const email = computed(() => userStore.user?.email || '');
const userId = computed(() => (userStore.user as Profile).id);
const viewerPermission = computed(() => props.role === 'viewer');
const reviewerPermission =
  props.role === 'reviewer' ||
  props.role === 'editor' ||
  props.role === 'owner';

function getName(user: Profile) {
  if (user?.display_name && user.display_name.trim() !== '') {
    return user.display_name;
  }
  if (user?.email && user.email.trim() !== '') {
    return (
      user.email.substring(0, MAX_EMAIL_LENGTH) +
      (user.email.length > MAX_EMAIL_LENGTH ? '...' : '')
    );
  }
  return undefined;
}

async function handleRevisionComment() {
  const content = toSendRevisionComment.value.trim();
  if (!content) return;
  if (!props.revision.id) {
    console.warn('Revision has no id; cannot post revision-level comment');
    return;
  }
  toSendRevisionComment.value = '';
  try {
    await insertRevisionComment(
      props.revision.id,
      userId.value,
      props.articleId,
      content,
    );
  } catch (e) {
    // Restore so the user doesn't lose their text
    toSendRevisionComment.value = content;
    throw e;
  }
}

watch(
  () => store.selectedChangeId,
  (selectedChangeId) => {
    if (selectedChangeId === '') {
      return;
    }

    expanded.value = props.revision.items.some(
      (item) => item.id === selectedChangeId,
    );
  },
);

// ---- Issue #1426: reviewability ----

const revisionId = computed(() => String(props.revision.revid));

/** Items after applying the type + unreviewed filters. */
const filteredItems = computed(() => {
  return props.revision.items.filter((item) => {
    if (reviewStore.typeFilter !== 'all') {
      const cat = categorizeChangeType(item.type_of_edit, item.content);
      if (cat !== reviewStore.typeFilter) return false;
    }
    if (reviewStore.unreviewedOnly && item.status !== 0) {
      return false;
    }
    return true;
  });
});

/** Items grouped by section, derived from the filtered list. */
const sectionGroups = computed(() =>
  groupChangesBySection(filteredItems.value, props.sectionMap),
);

/** All change ids in this revision (for collapse-all/expand-all clearing). */
const allChangeIds = computed(() => props.revision.items.map((i) => i.id));

const revisionSummary = computed(() => summarizeRevision(props.revision.items));

const typeCountBadges = computed(() => {
  const s = revisionSummary.value;
  return [
    {
      key: 'insertion' as ChangeTypeCategory,
      label: 'insertions',
      count: s.insertion,
      color: 'green',
    },
    {
      key: 'deletion' as ChangeTypeCategory,
      label: 'deletions',
      count: s.deletion,
      color: 'red',
    },
    {
      key: 'replacement' as ChangeTypeCategory,
      label: 'replacements',
      count: s.replacement,
      color: 'blue',
    },
    {
      key: 'formatting' as ChangeTypeCategory,
      label: 'formatting',
      count: s.formatting,
      color: 'grey',
    },
  ].filter((b) => b.count > 0);
});

function toggleTypeFilter(cat: ChangeTypeCategory) {
  reviewStore.setTypeFilter(reviewStore.typeFilter === cat ? 'all' : cat);
}

// ---- Section collapse ----
function isSectionCollapsed(section: string): boolean {
  return reviewStore.isCollapsed(revisionId.value, section, '');
}

// ---- Navigation ----
const navIndex = ref(0);
const currentNavChangeId = computed(
  () => filteredItems.value[navIndex.value]?.id ?? '',
);
const activeSection = computed(() => {
  const id = currentNavChangeId.value;
  if (!id) return '';
  return props.sectionMap.get(id) ?? '';
});
const navPositionLabel = computed(() => {
  const total = filteredItems.value.length;
  if (total === 0) return '0 / 0';
  return `${navIndex.value + 1} / ${total}`;
});

function navigatePrev() {
  if (navIndex.value > 0) {
    navIndex.value--;
    afterNavigate();
  }
}

function navigateNext() {
  if (navIndex.value < filteredItems.value.length - 1) {
    navIndex.value++;
    afterNavigate();
  }
}

function afterNavigate() {
  const id = currentNavChangeId.value;
  if (!id) return;
  // Reveal the change: expand its section (if collapsed) and the change itself.
  const section = props.sectionMap.get(id) ?? '';
  if (section && reviewStore.isCollapsed(revisionId.value, section, '')) {
    reviewStore.toggleSection(revisionId.value, section);
  }
  reviewStore.setChangeCollapsed(id, false);
  reviewStore.markReviewed(id);
  // Scroll the section header into view so the reviewer keeps their place.
  nextTick(() => {
    const el = sectionRefs.get(section);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// Keep nav index in range when the filtered list shrinks.
watch(filteredItems, (items) => {
  if (navIndex.value >= items.length) {
    navIndex.value = Math.max(0, items.length - 1);
  }
});

// ---- Section index jump ----
const sectionRefs = new Map<string, HTMLElement>();
function setSectionRef(section: string, el: Element | unknown) {
  if (el instanceof HTMLElement) {
    sectionRefs.set(section, el);
  } else {
    sectionRefs.delete(section);
  }
}

function jumpToSection(groupIndex: number) {
  const group = sectionGroups.value[groupIndex];
  if (!group) return;
  // Expand the section and move nav to its first change.
  if (reviewStore.isCollapsed(revisionId.value, group.section, '')) {
    reviewStore.toggleSection(revisionId.value, group.section);
  }
  const firstId = group.items[0]?.id;
  if (firstId) {
    const flatIndex = filteredItems.value.findIndex((i) => i.id === firstId);
    if (flatIndex >= 0) {
      navIndex.value = flatIndex;
      afterNavigate();
    }
  }
}

// ---- Section-level bulk accept / reject (undoable) ----
const pendingBulkForRevision = computed<PendingBulkAction[]>(() =>
  reviewStore.pendingBulkActions.filter((a) =>
    a.changeIds.some((id) => props.revision.items.some((i) => i.id === id)),
  ),
);

async function bulkAcceptSection(group: SectionGroup) {
  await applyBulkAction(group, Status.EditApproved, 'Accept');
}

async function bulkRejectSection(group: SectionGroup) {
  await applyBulkAction(group, Status.EditRejected, 'Reject');
}

async function applyBulkAction(
  group: SectionGroup,
  status: Status,
  verb: 'Accept' | 'Reject',
) {
  const changeIds = group.items.map((i) => i.id);
  const previousStatuses: Record<string, number> = {};
  for (const item of group.items) {
    previousStatuses[item.id] = (item.status ?? 0) as number;
  }
  const count = changeIds.length;
  const label = `${verb} ${count} change${count === 1 ? '' : 's'} in §${group.section}`;
  try {
    await Promise.all(changeIds.map((id) => updateChange(id, status)));
    const action: PendingBulkAction = {
      id: `${verb}-${group.section}-${Date.now()}`,
      label,
      changeIds,
      action: verb === 'Accept' ? 'accept' : 'reject',
      previousStatuses,
    };
    reviewStore.stageBulkAction(action);
    $q.notify({
      message: label,
      caption: 'Undo available above until you submit.',
      color: 'positive',
      icon: verb === 'Accept' ? 'thumb_up' : 'thumb_down',
      timeout: 4000,
    });
  } catch (e) {
    $q.notify({
      message: `Failed to ${verb.toLowerCase()} section`,
      color: 'negative',
      icon: 'error',
    });
    throw e;
  }
}

async function undoBulkAction(action: PendingBulkAction) {
  try {
    await Promise.all(
      action.changeIds.map((id) =>
        updateChange(id, action.previousStatuses[id] as Status),
      ),
    );
    reviewStore.removeBulkAction(action.id);
    $q.notify({
      message: `Undone: ${action.label}`,
      color: 'primary',
      icon: 'undo',
      timeout: 3000,
    });
  } catch (e) {
    $q.notify({
      message: 'Failed to undo bulk action',
      color: 'negative',
      icon: 'error',
    });
    throw e;
  }
}

function sendReview() {
  if (!miraStore.selectedPrompt) return;
  miraStore.triggerReview(props.articleId);
}

async function deleteRevision() {
  deletingRevision.value = true;

  try {
    const functionName = `/article/${props.articleId}/revisions/${props.revision.revid}`;
    // Delete the revision
    await supabaseClient.functions.invoke(functionName, {
      method: 'DELETE',
    });

    // Notify the parent window to goto diffLink which updates the diff
    window.parent.postMessage(
      {
        type: 'deleted-revision',
        articleId: props.articleId,
      },
      '*',
    );
  } catch (error) {
    deletingRevision.value = false;
    deleteRevisionDialog.value = false;
    throw error;
  }
  deletingRevision.value = false;
  deleteRevisionDialog.value = false;
}
</script>

<style scoped>
.revision-comments-list {
  max-height: 9.5rem;
  overflow-y: auto;
}
.section-header:hover {
  background-color: #eceff1;
}
</style>
