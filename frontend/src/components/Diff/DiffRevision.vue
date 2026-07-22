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

        <q-item-section class="revision-summary-label">
          <q-item-label v-if="!expanded" caption lines="1">
            {{ summary }}
          </q-item-label>
          <q-item-label v-else caption lines="3">
            {{ summary }} <q-tooltip>{{ summary }}</q-tooltip>
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

    <!-- Current Changes -->
    <q-list>
      <diff-item
        v-for="(item, index) in revision.items"
        :key="item.id"
        :item="item"
        :role="role"
        :is-last-recent-item="
          revision.isRecent && index === revision.items.length - 1
        "
      />
    </q-list>
    <div v-if="$props.revision.isRecent" class="q-pb-md q-pr-xs text-right">
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
import supabaseClient from 'src/api/supabase';
import { insertRevisionComment } from 'src/api/supabaseHelper';
import { useSelectedChangeStore } from 'src/stores/useSelectedChangeStore';
import { useUserStore } from 'src/stores/userStore';
import {
  Comment,
  Enums,
  Profile,
  Revision,
} from 'src/types';
import { MAX_EMAIL_LENGTH } from 'src/utils/consts';
import { computed, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import UserComponent from '../UserComponent.vue';
import DiffItem from './DiffItem.vue';

const props = defineProps<{
  role: Enums<'role'>;
  revision: Revision;
  articleId: string;
  isFirst: boolean;
  revisionComments: Comment[];
}>();

const store = useSelectedChangeStore();
const userStore = useUserStore();
const $q = useQuasar();

const expanded = ref($q.screen.gt.sm || props.isFirst);
const deleteRevisionDialog = ref<boolean>(false);
const deletingRevision = ref<boolean>(false);
const toSendRevisionComment = ref('');

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
</style>
