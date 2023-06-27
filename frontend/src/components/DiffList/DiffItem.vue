<template>
  <q-expansion-item
    ref="expansionItem"
    v-model="expanded"
    :class="{ highlighted: highlighted }"
    style="background-color: white; border-radius: 4px"
    class="q-mb-md q-mx-sm borders"
    @after-show="scrollToItem(!store.selectedChangeId)"
  >
    <template #header>
      <q-item-section class="text-body1">
        <q-item-label>
          <div
            @click="preventLinkVisit($event)"
            v-html="props.item?.content"
          ></div>
        </q-item-label>
        <q-item-label caption lines="2">
          <div>
            {{ description }}
          </div>
        </q-item-label>
      </q-item-section>
      <q-item-section caption top side lines="2">
        <span style="size: 0.5rem"
          >{{ new Date(props.item?.created_at).toLocaleString() }}
        </span>
        <span>@{{ props.item?.users.raw_user_meta_data.username }}</span>
      </q-item-section>
    </template>
    <q-separator />

    <q-item-section>
      <q-item-label class="q-mt-sm text-bold text-body1 q-ml-sm">
        Content
      </q-item-label>

      <div class="q-pa-md">
        <div
          class="text-center"
          @click="preventLinkVisit($event)"
          v-html="props.item?.content"
        ></div>
      </div>
    </q-item-section>
    <q-separator />

    <q-item-section>
      <q-item-label class="q-mt-sm text-bold text-body1 q-ml-sm">
        Type
      </q-item-label>

      <div class="q-pa-md">
        <div class="row">
          <div class="text-capitalize col-4 q-pt-sm text-body1">
            {{ typeOfEditDictionary[props.item?.type_of_edit] }}
          </div>
          <q-input
            v-model="description"
            filled
            dense
            autogrow
            label="Description"
            class="col"
            :readonly="!editPermission"
          >
            <!-- User: Contributor  Only -->
            <template v-if="editPermission" #append>
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
      <q-item-label class="q-mt-sm text-bold text-body1 q-ml-sm">
        Status
      </q-item-label>

      <div class="q-pa-md">
        <q-badge rounded :color="statusDictionary[props.item?.status].color" />
        <span class="text-body1 q-pl-sm">{{
          statusDictionary[props.item?.status].message
        }}</span>
      </div>
    </q-item-section>
    <q-separator />

    <q-item-section>
      <q-item-label class="q-mt-sm text-bold text-body1 q-ml-sm">
        Comments
      </q-item-label>
      <q-item-section class="q-pa-md row justify-center bg-secondary">
        <!-- Default Comments Examples.-->
        <q-scroll-area
          style="height: 9.5rem; width: 100%"
          class="q-px-sm q-pb-sm"
        >
          <template v-for="comment in item.comments" :key="comment.id">
            <q-chat-message
              :name="comment.users.raw_user_meta_data.username"
              :text="[comment.content]"
              :stamp="new Date(comment.created_at).toLocaleString()"
              :sent="comment.users.raw_user_meta_data.username == username"
            />
          </template>
        </q-scroll-area>

        <q-input
          v-model="toSendComment"
          autogrow
          filled
          dense
          class="row"
          placeholder="Leave a comment"
          style="width: 100%"
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
      v-if="!editPermission && !props.item.status"
      class="bg-accent"
    >
      <div class="row q-my-md justify-around">
        <q-btn
          outline
          color="red"
          class="bg-white"
          label="Reject"
          @click="handleReview(Status.EditRejected)"
        />
        <q-btn
          color="green"
          label="Approve"
          @click="handleReview(Status.EditApproved)"
        />
      </div>
    </q-item-section>
  </q-expansion-item>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { ChangesItem } from 'src/types';
import { insertComment, updateChange } from 'src/api/supabaseHelper';
import { Session } from '@supabase/supabase-js';
import supabase from 'src/api/supabase';
import { useSelectedChangeStore } from '../../stores/selectedChange';

const store = useSelectedChangeStore();
const props = defineProps<{
  item: ChangesItem;
  editPermission: boolean;
}>();
const expanded = ref(false);
const session = ref<Session | null>();
const username = ref('');
const userId = ref<string>('');
const toSendComment = ref('');
const highlighted = ref(false);
const expansionItem = ref();

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  session.value = data.session;
  supabase.auth.onAuthStateChange((_, _session) => {
    session.value = _session;
    username.value = session.value?.user.user_metadata.username;
    userId.value = session.value?.user.id as string;
    console.log(props.item.comments, typeof props.item.comments);
  });
});

async function handleComment() {
  console.log('commented: ', toSendComment.value);
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
  color: string;
};

const statusDictionary: Record<Status, StatusInfo> = {
  [Status.AwaitingReviewerApproval]: {
    message: 'Awaiting Reviewer Approval',
    color: 'yellow-8',
  },
  [Status.EditApproved]: { message: 'Edit Approved', color: 'green' },
  [Status.EditRejected]: { message: 'Edit Rejected', color: 'red' },
};

enum TypeOfEdit {
  Change = 0,
  Insert = 1,
  Remove = 2,
}

const typeOfEditDictionary: Record<TypeOfEdit, string> = {
  [TypeOfEdit.Change]: 'Change',
  [TypeOfEdit.Insert]: 'Insert',
  [TypeOfEdit.Remove]: 'Remove',
};

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
    if (selectedChangeId == '') {
      return;
    }
    expanded.value = selectedChangeId == props.item.id;
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
