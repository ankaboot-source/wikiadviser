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
              <user-diff
                :avatar-url="revision.items[0]?.user.avatar_url"
                :email="revision.items[0]?.user.email"
                class-name="user revision ellipsis"
              />
            </div>
            <div style="size: 0.5rem">
              {{ localeDateString }} at {{ localeTimeString }}
            </div>
          </q-item-section>
        </q-item-label>

        <q-item-section class="word_break_all">
          <q-item-label v-if="!expanded" caption lines="1">
            {{ summary }}
          </q-item-label>
          <q-item-label v-else caption lines="3">
            {{ summary }} <q-tooltip>{{ summary }}</q-tooltip>
          </q-item-label>
        </q-item-section>
      </q-item-section>
    </template>
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
import { computed, ref, watch } from 'vue';
import DiffItem from './DiffItem.vue';
import { UserRole, Revision } from 'src/types';
import { useSelectedChangeStore } from 'src/stores/useSelectedChangeStore';
import { api } from 'src/boot/axios';
import { useQuasar } from 'quasar';
import UserDiff from '../UserDiff.vue';

const props = defineProps<{
  role: UserRole;
  revision: Revision;
  articleId: string;
}>();

const store = useSelectedChangeStore();
const $quasar = useQuasar();

const expanded = ref(true);
const deleteRevisionDialog = ref<boolean>(false);
const deletingRevision = ref<boolean>(false);

const summary = computed(() => props.revision.summary);
const changesToReviewLength = computed(() => {
  return props.revision.items.filter((item) => item.status === 0).length;
});
const localeDateString = computed(() =>
  new Date(props.revision.items[0]?.created_at).toLocaleDateString(),
);
const localeTimeString = computed(() =>
  new Date(props.revision.items[0]?.created_at).toLocaleTimeString(undefined, {
    timeStyle: 'short',
  }),
);

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
    window.parent.postMessage('update-revisions', '*');
    await api.delete(
      `/article/${props.articleId}/revisions/${props.revision.revid}`,
    );
    $quasar.notify({
      message: 'Revision has been canceled',
      icon: 'check',
      color: 'positive',
    });
  } catch (error) {
    let message = 'Failed to cancel revision';

    if (error instanceof Error) {
      message = error.message;
    }
    $quasar.notify({
      message,
      color: 'negative',
    });
  }
  deletingRevision.value = false;
  deleteRevisionDialog.value = false;
}
</script>
