<template>
  <q-expansion-item
    ref="expansionItem"
    v-model="expanded"
    :class="{ highlighted: highlighted }"
    style="background-color: white"
    class="q-mb-md q-mx-sm borders rounded-borders"
    @after-show="scrollToItem(!store.selectedChangeId)"
    @mouseenter="setHovered(props.item.id)"
    @mouseleave="setHovered('')"
  >
    <template #header>
      <q-item-section class="text-body2">
        <q-item-label class="row">
          <q-item-section>
            <q-item-label>
              <q-icon color="blue-grey-10" :name="statusIcon" size="sm">
                <q-tooltip anchor="top middle" self="bottom middle">
                  {{ statusMessage }}
                </q-tooltip>
              </q-icon>

              <q-icon
                v-if="pastChange?.icon"
                color="blue-grey-10"
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

          <q-item-section side caption class="text-right">
            <div class="text-black">
              <q-avatar size="sm">
                <img :src="props.item?.user.picture" />
              </q-avatar>
              {{ props.item?.user.email }}
            </div>

            <div style="size: 0.5rem">
              {{ localeTimeString }}
              <br />
              {{ localeDateString }}
            </div>
          </q-item-section>
        </q-item-label>

        <q-item-section>
          <q-item-label v-if="!expanded" class="q-pa-xs" lines="3">
            <div @click="preventLinkVisit($event)" v-html="previewItem" />
            <q-tooltip v-if="previewDescription">
              {{ previewDescription }}
            </q-tooltip>
          </q-item-label>
        </q-item-section>
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
        ></div>
        <div
          v-else
          class="q-pl-md text-left text-body-2"
          @click="preventLinkVisit($event)"
          v-html="props.item.content"
        ></div>
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
          style="height: 9.5rem; width: 100%"
          class="q-px-sm q-pb-sm"
        >
          <template v-for="comment in item.comments" :key="comment.id">
            <q-chat-message
              :name="comment.user.email"
              :text="[comment.content]"
              :stamp="new Date(comment.created_at).toLocaleString()"
              :sent="comment.user.email == email"
              :avatar="comment.user.picture"
              :bg-color="comment.user.email == email ? 'green' : 'accent'"
            />
          </template>
        </q-scroll-area>

        <q-input
          v-model="toSendComment"
          autogrow
          outlined
          dense
          class="row"
          placeholder="Leave a comment"
          style="width: 100%"
          :disable="viewerPermission"
        >
          <template #append>
            <q-btn
              round
              dense
              flat
              icon="send"
              color="primary"
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
          color="blue-grey-10"
          class="bg-white"
          label="Close"
          @click="expanded = false"
        />
        <q-space />
        <!-- User: Reviewer Only -->
        <template
          v-if="
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
              text-color="red-10"
              label="Reject"
              unelevated
              @click="handleReview(Status.EditRejected)"
            />
            <q-btn
              no-caps
              icon="thumb_up"
              color="green-1"
              text-color="green-10"
              label="Approve"
              unelevated
              @click="handleReview(Status.EditApproved)"
            />
          </template>
          <template v-else>
            <q-btn
              no-caps
              :icon="archiveButton"
              outline
              color="blue-grey-10"
              class="bg-white text-capitalize"
              :label="archiveButton"
              @click="archiveChange(!isArchived)"
            />
          </template>
        </template>
      </div>
    </q-item-section>
  </q-expansion-item>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { ChangesItem, UserRole } from 'src/types';
import { insertComment, updateChange } from 'src/api/supabaseHelper';
import { Session } from '@supabase/supabase-js';
import supabase from 'src/api/supabase';
import { useSelectedChangeStore } from 'src/stores/useSelectedChangeStore';

const store = useSelectedChangeStore();
const props = defineProps<{
  item: ChangesItem;
  role: UserRole;
  pastChange?: {
    icon?: string;
    text: string;
    disable?: boolean;
  };
}>();
const expanded = ref(false);
const session = ref<Session | null>();
const email = ref('');
const userId = ref<string>('');
const toSendComment = ref('');
const highlighted = ref(false);
const expansionItem = ref();
const editorPermission =
  props.role === UserRole.Editor || props.role === UserRole.Owner;
const reviewerPermission =
  props.role === UserRole.Reviewer ||
  UserRole.Editor ||
  props.role === UserRole.Owner;
const viewerPermission = props.role === UserRole.Viewer;

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  session.value = data.session;
  supabase.auth.onAuthStateChange((_, _session) => {
    session.value = _session;
    email.value = session.value?.user.email as string;
    userId.value = session.value?.user.id as string;
  });
});

const previewDescription = computed(() => {
  const { item } = props;

  if (item.description.length > 0) {
    return item.description;
  }

  if (item.type_of_edit === 3) {
    return 'Modifications to infobox or table';
  }

  const contentDoc = new DOMParser().parseFromString(item.content, 'text/html');
  if (contentDoc.querySelector('img') !== null) {
    return 'Modifications to an image';
  }

  return '';
});

const previewItem = computed(() => {
  return previewDescription.value
    ? previewDescription.value
    : `${props.item.content}`;
});

async function handleComment() {
  if (toSendComment.value.length > 0) {
    await insertComment(props.item.id, userId.value, toSendComment.value);
    toSendComment.value = '';
  }
}

const description = ref(props.item?.description);

enum Status {
  AwaitingReviewerApproval = 0,
  EditApproved = 1,
  EditRejected = 2,
}

type StatusInfo = {
  message: string;
  icon: string;
};

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

const statusIcon = computed(
  () => statusDictionary.get(props.item?.status)!.icon
);

const statusMessage = computed(
  () => statusDictionary.get(props.item?.status)!.message
);
const preventLinkVisit = (event: MouseEvent) => {
  //Prevent visting links:
  event.preventDefault();
};

async function handleReview(Status: Status) {
  await updateChange(props.item.id, Status);
  expanded.value = false;
}

async function handleDescription() {
  await updateChange(props.item.id, undefined, description.value);
}

const isArchived = computed(() => props.item.archived);
const archiveButton = computed(() => {
  return isArchived.value ? 'unarchive' : 'archive';
});

async function archiveChange(archived = true) {
  await updateChange(props.item.id, undefined, undefined, archived);
}

function scrollToItem(smooth: boolean) {
  const behavior = smooth ? 'smooth' : 'auto';
  expansionItem.value.$el.scrollIntoView({ behavior });
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
  }
);

function setHovered(value: string) {
  store.hoveredChangeId = value;
}

const localeDateString = computed(() =>
  new Date(props.item?.created_at).toLocaleDateString()
);
const localeTimeString = computed(() =>
  new Date(props.item?.created_at).toLocaleTimeString()
);
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
