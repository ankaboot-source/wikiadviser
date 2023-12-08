<template>
  <q-expansion-item
    ref="expansionItem"
    v-model="expanded"
    :class="{ highlighted: highlighted }"
    style="background-color: white; border-radius: 4px"
    class="q-mb-md q-mx-sm borders"
    @after-show="scrollToItem(!store.selectedChangeId)"
    @mouseenter="setHovered(props.item.id)"
    @mouseleave="setHovered('')"
  >
    <template #header>
      <q-item-section class="text-body1">
        <q-item-label>
          <q-avatar
            :color="statusDictionary.get(props.item?.status)!.color"
            text-color="white"
            :icon="statusDictionary.get(props.item?.status)!.icon"
            size="sm"
          >
            <q-tooltip anchor="top middle" self="bottom middle">
              {{ statusDictionary.get(props.item?.status)!.message }}
            </q-tooltip>
          </q-avatar>
        </q-item-label>
        <q-item-label v-if="!expanded" class="q-pa-xs" lines="3">
          <div @click="preventLinkVisit($event)" v-html="previewItem"></div>
        </q-item-label>
        <q-item-label v-if="!expanded" caption lines="2">
          <div>
            {{ description }}
          </div>
        </q-item-label>
      </q-item-section>
      <q-item-section caption top side lines="2">
        <span class="text-black">
          <q-avatar size="sm" icon="person" color="accent" />
          {{ props.item?.user.email }}</span
        >
        <span style="size: 0.5rem">
          {{ new Date(props.item?.created_at).toLocaleTimeString() }} <br />
          {{ new Date(props.item?.created_at).toLocaleDateString() }}
        </span>
      </q-item-section>
    </template>
    <q-separator />

    <q-item-section>
      <div class="q-pa-md">
        <div
          class="text-left text-body1"
          @click="preventLinkVisit($event)"
          v-html="props.item?.content"
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
              :avatar="
                comment.user.email == email
                  ? 'https://cdn.quasar.dev/img/avatar2.jpg'
                  : 'https://cdn.quasar.dev/img/avatar1.jpg'
              "
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

    <!-- User: Reviewer Only -->
    <q-item-section
      v-if="reviewerPermission && !viewerPermission && !props.item.status"
      class="bg-accent"
    >
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
import { is } from 'quasar';

const store = useSelectedChangeStore();
const props = defineProps<{
  item: ChangesItem;
  role: UserRole;
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

const previewItem = computed(() => {
  const { item } = props;

  const content = document.createElement('div');
  content.innerHTML = item.content;

  const isTable = content.querySelector('table') !== null;
  const isImage = !isTable && content.querySelector('img') !== null;
  const description = item.description.length ? item.description : null;

  if (isTable) {
    return description ?? 'Modifications to a Table or Infobox..';
  }

  if (isImage) {
    return description ?? 'Modifications containing an image..';
  }
  return `${props.item.content}`;
});

async function handleComment() {
  if (toSendComment.value.length > 0) {
    await insertComment(props.item.id, userId.value, toSendComment.value);
    toSendComment.value = '';
  }
}

const description = ref(
  props.item?.description !== previewItem.value ? props.item?.description : ''
);

enum Status {
  AwaitingReviewerApproval = 0,
  EditApproved = 1,
  EditRejected = 2,
}

type StatusInfo = {
  message: string;
  color: string;
  icon: string;
};

const statusDictionary: Map<Status, StatusInfo> = new Map([
  [
    Status.AwaitingReviewerApproval,
    {
      message: 'Awaiting Reviewer Approval',
      color: 'yellow-8',
      icon: 'lightbulb',
    },
  ],
  [
    Status.EditApproved,
    {
      message: 'Edit Approved',
      color: 'green',
      icon: 'thumb_up',
    },
  ],
  [
    Status.EditRejected,
    {
      message: 'Edit Rejected',
      color: 'red',
      icon: 'thumb_down',
    },
  ],
]);

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

function scrollToItem(smooth: boolean) {
  const behavior = smooth ? 'smooth' : 'auto';
  expansionItem.value.$el.scrollIntoView({ behavior });
}

function setHovered(value: string) {
  store.hoveredChangeId = value;
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
