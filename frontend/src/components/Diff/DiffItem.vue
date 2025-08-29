<template>
  <q-expansion-item
    ref="expansionItem"
    v-model="expanded"
    style="background-color: white"
    class="q-mx-sm borders rounded-borders diffItem"
    :class="[
      { highlighted: highlighted },
      isLastRecentItem ? 'q-mb-sm' : 'q-mb-md',
    ]"
    @after-show="scrollToItem(!store.selectedChangeId)"
    @mouseenter="setHovered(props.item.id)"
    @mouseleave="setHovered('')"
  >
    <template #header>
      <q-item-section avatar>
        <q-item-label class="row">
          <q-icon :name="statusIcon" size="sm">
            <q-tooltip anchor="top middle" self="bottom middle">
              {{ statusMessage }}
            </q-tooltip>
          </q-icon>

          <q-icon
            v-if="pastChange?.icon"
            class="q-ml-sm"
            :name="pastChange.icon"
            size="sm"
          >
            <q-tooltip anchor="top middle" self="bottom middle">
              {{ pastChange.text }}
            </q-tooltip>
          </q-icon>
        </q-item-label>
      </q-item-section>

      <q-item-section>
        <q-item-label v-if="!expanded" class="q-pa-xs word_break_all" lines="3">
          <div @click="preventLinkVisit($event)" v-html="previewItem" />
          <q-tooltip v-if="previewDescription">
            {{ previewDescription }}
          </q-tooltip>
        </q-item-label>
      </q-item-section>
      <q-item-section
        v-if="expanded && !!pastChange"
        side
        caption
        class="text-right"
      >
        <div class="text-black">
          <q-avatar size="sm">
            <img
              :src="props.item?.user.avatar_url"
              referrerpolicy="no-referrer"
            />
          </q-avatar>
          {{ props.item?.user.email }}
        </div>
        <div style="size: 0.5rem">
          {{ localeDateString }} at {{ localeTimeString }}
        </div>
      </q-item-section>
      <q-item-section v-if="expanded" side top>
        <q-btn
          flat
          round
          dense
          icon="link"
          size="md"
          @click.stop="copyChangeLink()"
        >
          <q-tooltip>Copy change link to this change</q-tooltip>
        </q-btn>
      </q-item-section>
    </template>

    <q-separator />

    <q-item-section>
      <div class="q-pt-md q-pr-md q-pb-md">
        <div
          v-if="props.item.type_of_edit === 3"
          class="row justify-center"
          @click="preventLinkVisit($event)"
          v-html="props.item.content"
        />
        <div
          v-else
          class="q-pl-md text-left text-body-2 word_break_all"
          @click="preventLinkVisit($event)"
          v-html="props.item.content"
        />
      </div>
    </q-item-section>
    <q-separator />

    <q-item-section v-if="description || editorPermission">
      <div class="q-pa-md">
        <div class="row">
          <q-input
            v-model="description"
            dense
            outlined
            autogrow
            label="What's this change about?"
            class="col"
            :readonly="!editorPermission"
          >
            <!-- User: Editor  Only -->
            <template v-if="editorPermission" #append>
              <q-btn
                round
                dense
                flat
                icon="check"
                color="primary"
                @click="handleDescription()"
              />
            </template>
          </q-input>
        </div>
      </div>
    </q-item-section>
    <q-separator />
    <q-item-section>
      <q-item-section class="q-pa-md row justify-center bg-secondary">
        <q-scroll-area
          ref="chatScroll"
          style="height: 9.5rem; width: 100%"
          class="q-px-sm q-pb-sm"
        >
          <template v-for="comment in comments" :key="comment.id">
            <q-chat-message
              :name="getName(comment.user.email)"
              :text="[comment.content]"
              :stamp="new Date(comment.created_at).toLocaleString()"
              :sent="comment.user.email == email"
              :avatar="comment.user.avatar_url"
              :bg-color="comment.user.email == email ? 'green' : 'accent'"
              :class="comment.user.email == email ? 'q-mr-xs' : ''"
            />
          </template>
        </q-scroll-area>

        <q-input
          v-model="toSendComment"
          autogrow
          outlined
          dense
          class="row full-width"
          placeholder="Leave a comment"
          :disable="viewerPermission"
          @keydown.enter="handleComment"
        >
          <template #append>
            <q-btn
              round
              dense
              flat
              icon="send"
              color="primary"
              tabindex="-1"
              @click="handleComment"
            />
          </template>
        </q-input>
      </q-item-section>
    </q-item-section>
    <q-separator />

    <q-item-section class="bg-accent">
      <div class="row q-ma-md">
        <q-btn
          no-caps
          outline
          class="bg-white"
          label="Close"
          @click="expanded = false"
        />
        <q-space />
        <template v-if="isUnindexed">
          <q-btn
            no-caps
            icon="delete_forever"
            outline
            color="blue-grey-10"
            class="bg-white text-capitalize"
            label="delete"
            @click.stop="hideChangeDialoge = true"
          />
          <q-dialog v-model="hideChangeDialoge">
            <q-card>
              <q-toolbar class="borders">
                <q-toolbar-title class="merriweather">
                  Delete Change
                </q-toolbar-title>
                <q-btn v-close-popup flat round dense icon="close" size="sm" />
              </q-toolbar>
              <q-card-section>
                This change is unrelated to any revisions and can be safely
                deleted. It will no longer appear in the past changes folder.
              </q-card-section>
              <q-card-actions class="borders">
                <q-space />
                <q-btn
                  v-if="!hidingChange"
                  v-close-popup
                  no-caps
                  outline
                  color="primary"
                  label="Cancel"
                />
                <q-btn
                  :v-close-popup="!hidingChange"
                  unelevated
                  color="negative"
                  icon="delete"
                  no-caps
                  label="delete"
                  :loading="hidingChange"
                  @click="hideChange()"
                >
                  <template #loading>
                    <q-spinner class="on-left" />
                    Delete
                  </template>
                </q-btn>
              </q-card-actions>
            </q-card>
          </q-dialog>
        </template>
        <!-- User: Reviewer Only -->
        <template
          v-else-if="
            reviewerPermission &&
            !viewerPermission &&
            !props.pastChange?.disable
          "
        >
          <template v-if="!props.item.status">
            <q-btn
              class="q-mr-sm"
              no-caps
              icon="thumb_down"
              color="red-1"
              text-color="negative"
              label="Reject"
              unelevated
              @click="handleReview(Status.EditRejected)"
            />
            <q-btn
              no-caps
              icon="thumb_up"
              color="green-1"
              text-color="positive"
              label="Approve"
              unelevated
              @click="handleReview(Status.EditApproved)"
            />
          </template>
          <template v-else>
            <q-btn
              no-caps
              :icon="pastChangesIcon"
              outline
              class="bg-white text-capitalize"
              :label="pastChangesButton"
              @click="archiveChange(!isArchived)"
            />
          </template>
        </template>
      </div>
    </q-item-section>
  </q-expansion-item>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import {
  hideChanges,
  insertComment,
  updateChange,
} from 'src/api/supabaseHelper';
import { useUserStore } from 'src/stores/userStore';
import { useSelectedChangeStore } from 'src/stores/useSelectedChangeStore';
import { ChangeItem, Enums, Profile, Status } from 'src/types';
import { MAX_EMAIL_LENGTH } from 'src/utils/consts';
import { computed, nextTick, ref, watch } from 'vue';

const $quasar = useQuasar();
const userStore = useUserStore();
const store = useSelectedChangeStore();
const props = defineProps<{
  item: ChangeItem;
  role: Enums<'role'>;
  pastChange?: {
    icon?: string;
    text: string;
    disable?: boolean;
  };
  isLastRecentItem?: boolean;
}>();
const expanded = ref(false);
const toSendComment = ref('');
const highlighted = ref(false);
const expansionItem = ref();
const chatScroll = ref();
type StatusInfo = {
  message: string;
  icon: string;
};

const editorPermission = props.role === 'editor' || props.role === 'owner';
const reviewerPermission =
  props.role === 'reviewer' ||
  props.role === 'editor' ||
  props.role === 'owner';
const viewerPermission = props.role === 'viewer';

const statusDictionary: Map<Status, StatusInfo> = new Map([
  [
    Status.AwaitingReviewerApproval,
    {
      message: 'Awaiting Reviewer Approval',
      icon: 'lightbulb',
    },
  ],
  [
    Status.EditApproved,
    {
      message: 'Edit Approved',
      icon: 'thumb_up',
    },
  ],
  [
    Status.EditRejected,
    {
      message: 'Edit Rejected',
      icon: 'thumb_down',
    },
  ],
]);

const comments = computed(() => props.item.comments);
const email = computed(() => userStore.user?.email || '');
const userId = computed(() => (userStore.user as Profile).id);

const previewDescription = computed(() => {
  const { item } = props;

  if ((item.description as string).length > 0) {
    return item.description;
  }

  if (item.type_of_edit === 3) {
    return 'Modifications to infobox or table';
  }

  const contentDoc = new DOMParser().parseFromString(
    item.content as string,
    'text/html',
  );
  if (contentDoc.querySelector('img') !== null) {
    return 'Modifications to an image';
  }

  return '';
});

function getName(email: string) {
  return (
    email.substring(0, MAX_EMAIL_LENGTH) +
    (email.length > MAX_EMAIL_LENGTH ? '...' : '')
  );
}

const previewItem = computed(() => {
  return previewDescription.value
    ? previewDescription.value
    : `${props.item.content}`;
});

async function handleComment() {
  if (toSendComment.value.trim().length > 0) {
    await insertComment(
      props.item.id,
      userId.value,
      props.item.article_id as string,
      toSendComment.value.trim(),
    );
    toSendComment.value = '';
  }
}

const description = ref(props.item?.description);

const statusIcon = computed(
  () => statusDictionary.get(props.item?.status as number)?.icon,
);

const statusMessage = computed(
  () => statusDictionary.get(props.item?.status as number)?.message,
);
const preventLinkVisit = (event: MouseEvent) => {
  //Prevent visting links:
  event.preventDefault();
};

async function handleReview(Status: Status) {
  await updateChange(props.item.id, Status);
  expanded.value = false;
}

const emit = defineEmits<{
  updateChange: [id: string, updates: Partial<ChangeItem>]
}>();
async function handleDescription() {
  await updateChange(props.item.id, undefined, description.value as string);
  emit('updateChange', props.item.id, { description: description.value });
}

const isArchived = computed(() => props.item.archived);
const pastChangesButton = computed(() =>
  isArchived.value ? 'reopen' : 'archive',
);
const pastChangesIcon = computed(() =>
  isArchived.value ? 'unarchive' : 'archive',
);

async function archiveChange(archived = true) {
  await updateChange(props.item.id, undefined, undefined, archived);
}

function scrollToItem(smooth: boolean) {
  const behavior = smooth ? 'smooth' : 'auto';
  expansionItem.value.$el.scrollIntoView({ behavior });
}

function scrollChatToBottom() {
  const scrollTarget = chatScroll.value.getScrollTarget();
  chatScroll.value.setScrollPosition('vertical', scrollTarget.scrollHeight, 0);
}

watch(
  () => store.selectedChangeId,
  (selectedChangeId) => {
    if (selectedChangeId === '') {
      return;
    }
    expanded.value = selectedChangeId === props.item.id;
    if (expanded.value) {
      scrollToItem(false);
      highlighted.value = true;
      setTimeout(() => {
        highlighted.value = false;
      }, 400);
      store.selectedChangeId = '';
    }
  },
);

watch(comments.value, () => {
  nextTick(() => {
    scrollChatToBottom();
  });
});

watch(expanded, () => {
  if (expanded.value) {
    nextTick(() => {
      scrollChatToBottom();
    });
  }
});

function setHovered(value: string) {
  store.hoveredChangeId = value;
}

const localeDateString = computed(() =>
  new Date(props.item?.created_at as string).toLocaleDateString(),
);
const localeTimeString = computed(() =>
  new Date(props.item?.created_at as string).toLocaleTimeString(),
);

const isUnindexed = computed(() => props.item.index === null);
const hideChangeDialoge = ref(false);
const hidingChange = ref(false);

async function hideChange() {
  hidingChange.value = true;
  try {
    await hideChanges(props.item.id);
    $quasar.notify({
      message: 'Change is successfully and permanently hidden',
      icon: 'check',
      color: 'positive',
    });
  } catch (e) {
    hidingChange.value = false;
    hideChangeDialoge.value = false;
    throw e;
  }
  hidingChange.value = false;
  hideChangeDialoge.value = false;
}

function copyChangeLink() {
  const url = new URL(window.location.href);
  url.searchParams.set('change', props.item.id);
  navigator.clipboard.writeText(url.toString());
  $quasar.notify({
    message: 'Change link copied to clipboard',
    color: 'positive',
    icon: 'content_copy',
  });
}
</script>
<style scoped>
.q-item__section--main + .q-item__section--main {
  margin-left: 0px;
}

.highlighted {
  animation: fadeEffect 0.4s;
}

@keyframes fadeEffect {
  0% {
    background-color: lightgrey;
  }

  100% {
    background-color: transparent;
  }
}
</style>
<style>
.diffItem > * > .q-item {
  padding-left: 8px;
  padding-right: 8px;
}
</style>
