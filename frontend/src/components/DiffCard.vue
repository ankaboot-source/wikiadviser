<template>
  <div class="column">
    <q-toolbar v-if="!hideToolbar" class="q-px-none">
      <q-btn-toggle
        v-model="internalToggle"
        no-caps
        unelevated
        toggle-color="blue-grey-2"
        toggle-text-color="dark"
        text-color="dark"
        color="bg-secondary"
        class="borders"
        :options="toggleOptions"
      />
      <q-space />
      <q-btn
        icon="open_in_new"
        outline
        label="View article"
        class="q-mr-xs"
        no-caps
        @click="
          articlesStore.viewArticleInNewTab(
            article.language,
            article.article_id,
          )
        "
      />
      <q-btn
        icon="img:/icons/logo.svg"
        label="Review by Mira"
        outline
        no-caps
        :loading="loading"
        :disable="loading"
        class="q-mr-xs"
        @click="triggerReview"
      />

      <q-dialog v-model="dialog">
        <q-card class="q-pa-md" style="min-width: 500px; max-width: 80vw">
          <q-card-section>
            <div class="text-h6">AI Review by Mira</div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <div v-if="error" class="text-negative">
              {{ error }}
            </div>

            <div v-else-if="reviews.length > 0">
              <div
                v-for="(review, index) in reviews"
                :key="index"
                class="q-mb-md"
              >
                <div class="text-subtitle1">Change {{ index + 1 }}</div>
                <div class="q-pa-sm bg-grey-2 rounded-borders">
                  <strong>Comment:</strong> {{ review.comment }}<br />
                  <strong>Proposed Change:</strong> {{ review.proposed_change }}
                </div>
              </div>
            </div>

            <div v-else-if="result">
              {{ result }}
            </div>

            <div v-else>Waiting for Mira’s review...</div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn v-close-popup flat label="Close" color="primary" />
          </q-card-actions>
        </q-card>
      </q-dialog>
      <q-btn
        v-if="role != 'viewer'"
        icon="o_group"
        outline
        label="Share"
        no-caps
        class="q-pr-lg"
        @click="shareDialog = !shareDialog"
      >
        <q-dialog v-model="shareDialog">
          <share-card :article="article" :role :users />
        </q-dialog>
      </q-btn>
    </q-toolbar>

    <!-- Only render the editor ONCE based on effective toggle -->
    <mw-visual-editor
      v-if="
        article.title &&
        article.permission_id &&
        editorPermission &&
        effectiveToggle === 'edit'
      "
      :button-toggle="effectiveToggle"
      :article="article"
      :toggle-edit-tab="toggleEditTab"
      @switch-tab-emit="onSwitchTabEmitChange"
    />

    <template v-if="effectiveToggle === 'view'">
      <q-scroll-area
        v-if="props.changesContent"
        class="col-grow rounded-borders borders bg-secondary q-py-md q-pl-md"
      >
        <div v-html="props.changesContent" />
      </q-scroll-area>
      <div
        v-else
        class="col-grow rounded-borders borders bg-secondary q-py-md q-pl-md"
      >
        <div class="q-py-sm text-body1 text-weight-medium">
          There are currently no changes
        </div>
        <div class="q-pb-sm text-body2">
          After the article is edited, the changes will be displayed here for
          your review.
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import MwVisualEditor from 'src/components/MwVisualEditor.vue';
import ShareCard from 'src/components/Share/ShareCard.vue';
import 'src/css/styles/diff.scss';
import 'src/css/styles/ve.scss';
import { useArticlesStore } from 'src/stores/useArticlesStore';
import { useSelectedChangeStore } from 'src/stores/useSelectedChangeStore';
import { Article, Enums, User } from 'src/types';
import { computed, nextTick, ref, watch } from 'vue';
import supabaseClient from 'src/api/supabase';

const emit = defineEmits<{
  'toggle-edit-tab': [tab?: string];
}>();

const selectedChangeStore = useSelectedChangeStore();
const articlesStore = useArticlesStore();

const props = defineProps<{
  changesContent: string | null;
  article: Article;
  role: Enums<'role'>;
  editorPermission: boolean | null;
  users: User[];
  hideToolbar?: boolean;
  mobileButtonToggle?: string;
}>();

// There is an error when passing a variable into import()
if (props.article.language === 'fr') {
  import('src/css/styles/fr-common.css');
} else if (props.article.language === 'en') {
  import('src/css/styles/en-common.css');
}

const internalToggle = ref('view');

const effectiveToggle = computed(
  () => props.mobileButtonToggle ?? internalToggle.value,
);
const loading = ref(false);
const dialog = ref(false);
const result = ref<string | null>(null);
const error = ref<string | null>(null);
const reviews = ref<
  { change_id: string; comment: string; proposed_change: string }[]
>([]);

async function triggerReview() {
  loading.value = true;
  error.value = null;
  result.value = null;
  reviews.value = [];

  try {
    const { data, error: fnError } = await supabaseClient.functions.invoke(
      'ai-review',
      {
        body: {
          article_id: props.article.article_id,
          language: props.article.language,
        },
      },
    );

    if (fnError) throw fnError;

    if (data?.reviews?.length > 0) {
      reviews.value = data.reviews;
    } else {
      result.value = data?.summary ?? 'No feedback returned';
    }

    dialog.value = true;
  } catch (err: unknown) {
    error.value =
      err instanceof Error
        ? err.message
        : String(err) || 'Something went wrong';
    dialog.value = true;
  } finally {
    loading.value = false;
  }
}
function setTabindexForElements(selector: string, tabindexValue: string) {
  const elements = document.querySelectorAll(selector);
  elements.forEach((element) => {
    element.setAttribute('tabindex', tabindexValue);

    if (tabindexValue === '-1') {
      // Open links in a new tab
      element.setAttribute('target', '_blank');
    }

    if (tabindexValue === '0') {
      // If change, select it
      element.addEventListener('click', () => {
        selectedChangeStore.selectedChangeId = element.getAttribute(
          'data-id',
        ) as string;
      });
      element.addEventListener('keydown', (event) => {
        const keyboardEvent = event as KeyboardEvent;
        if (keyboardEvent.key === 'Enter') {
          selectedChangeStore.selectedChangeId = element.getAttribute(
            'data-id',
          ) as string;
        }
      });
    }
  });
}

function handleTabIndexes() {
  setTabindexForElements('a', '-1'); // Links
  setTabindexForElements('.ve-ui-diffElement-document [data-id]', '0'); // Changes
}

watch(
  () => props.changesContent,
  async () => {
    await nextTick();
    handleTabIndexes();
  },
  { immediate: true },
);

watch(
  () => selectedChangeStore.hoveredChangeId,
  (hoveredChangeId: string) => {
    if (hoveredChangeId) {
      const element = document.querySelector(
        `.ve-ui-diffElement-document [data-id="${hoveredChangeId}"]`,
      );

      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });

        element.classList.add('preHovered');
        setTimeout(() => {
          element.classList.add('hovered');
        }, 10);
      }
    } else {
      const elements = document.querySelectorAll('.hovered');
      elements.forEach((element) => {
        element.classList.remove('hovered');
      });
    }
  },
);

const shareDialog = ref(false);

const viewButton = {
  label: 'Review changes',
  value: 'view',
  icon: 'thumbs_up_down',
};
const editButton = {
  label: 'Edit article',
  value: 'edit',
  icon: 'edit',
};

const toggleOptions = computed(() =>
  !(
    props.article.title &&
    props.article.permission_id &&
    props.editorPermission
  )
    ? [viewButton]
    : [viewButton, editButton],
);

const firstToggle = computed(() => {
  // editorPerm & !changes -> Editor
  const emptyContent = !props.changesContent || !props.changesContent.length;
  return props.editorPermission && emptyContent ? 'edit' : 'view';
});

watch(
  firstToggle,
  (newToggle, oldToggle) => {
    if (oldToggle === 'edit') {
      return;
    }
    if (!props.hideToolbar) {
      internalToggle.value = newToggle;
    }
  },
  { immediate: true },
);

const onSwitchTabEmitChange = (tab: string) => {
  if (props.hideToolbar) {
    emit('toggle-edit-tab', tab);
  } else {
    internalToggle.value = tab;
  }
};

function toggleEditTab() {
  if (props.hideToolbar) {
    emit('toggle-edit-tab');
  } else {
    internalToggle.value = 'edit';
  }
}
</script>

<style>
/* General */
b {
  font-weight: bold !important;
}

/* Data diff: */
/* Structural Change*/
[data-diff-action='structural-change'] {
  border: 3px solid rgba(109, 169, 247, 0.65) !important;
}

/* Change */
[data-diff-action='change'],
[data-diff-action='change-insert'] {
  background-color: transparent !important;
  box-shadow: none;

  border-bottom: 3px solid rgba(109, 169, 247, 0.45);
  border-top: 3px solid rgba(109, 169, 247, 0.45);
}
[data-diff-action='change']:hover,
[data-diff-action='change-insert']:hover {
  border-bottom: 3px solid rgba(109, 169, 247, 0.65);
  border-top: 3px solid rgba(109, 169, 247, 0.65);
}

/* Remove */
[data-diff-action='remove'],
[data-diff-action='remove'] > caption,
[data-diff-action='remove'] > figcaption {
  background-color: transparent !important;
  box-shadow: none;

  border-bottom: 3px solid rgba(174, 30, 66, 0.45);
  border-top: 3px solid rgba(174, 30, 66, 0.45);
  text-decoration: line-through;
  text-decoration-color: rgba(87, 15, 33, 0.45);
  text-decoration-thickness: 2px;
}
[data-diff-action='remove']:hover,
[data-diff-action='remove']:hover > caption,
[data-diff-action='remove']:hover > figcaption :hover {
  border-bottom: 3px solid rgba(109, 18, 41, 0.5);
  border-top: 3px solid rgba(109, 18, 41, 0.5);
}

/* Insert */
[data-diff-action='insert'],
[data-diff-action='insert'] > caption,
[data-diff-action='insert'] > figcaption {
  background-color: transparent !important;
  box-shadow: none;

  border-bottom: 3px solid rgba(30, 174, 49, 0.45);
  border-top: 3px solid rgba(30, 174, 49, 0.45);
}
[data-diff-action='insert']:hover,
[data-diff-action='insert']:hover > caption,
[data-diff-action='insert']:hover > figcaption {
  border-bottom: 3px solid rgba(18, 109, 31, 0.5);
  border-top: 3px solid rgba(18, 109, 31, 0.5);
}

figure[data-diff-action='insert'] {
  border: 3px solid rgba(30, 174, 49, 0.45) !important;
}
[data-diff-action='change-insert']:hover {
  border: 3px solid rgba(18, 109, 31, 0.5) !important;
}

/* data-status */
[data-status] {
  cursor: pointer;
}
[data-status='0'] {
  background-color: rgba(255, 211, 67, 0.2) !important;
}
[data-status='0']:hover {
  background-color: rgba(255, 211, 67, 0.3) !important;
}

[data-status='2'] {
  background-color: rgba(255, 112, 112, 0.2) !important;
}
[data-status='2']:hover {
  background-color: rgba(255, 112, 112, 0.3) !important;
}

[data-status='1'] {
  background-color: rgba(16, 146, 0, 0.2) !important;
}
[data-status='1']:hover {
  background-color: rgba(16, 146, 0, 0.3) !important;
}

/* Hover Effect */
.preHovered {
  background: linear-gradient(
      0deg,
      rgb(184, 212, 248, 0.9),
      rgb(184, 212, 248, 0.9)
    )
    no-repeat right bottom / 0 var(--bg-h);
  transition: background-size 350ms;
  --bg-h: 100%;
}
.hovered {
  background-size: 100% var(--bg-h);
  background-position-x: left;

  border-bottom: 6px solid rgb(184, 212, 248, 0.9);
  border-top: 6px solid rgb(184, 212, 248, 0.9);
}

.ve-ui-diffElement,
[data-id] {
  font-family: sans-serif;
}

.q-list [data-id] {
  background-color: transparent !important;
}

/* Styles for the exclamation mark icon */
[data-type-of-edit='5']:before {
  font-family: 'Material Icons';
  content: 'error';
  vertical-align: middle;
  font-size: 2em;
  text-rendering: optimizeLegibility;
  font-feature-settings: 'liga';
}

[data-type-of-edit='5'] {
  position: relative;
}

/* Tooltip */
[data-type-of-edit='5']::after {
  content: attr(title);
  font-family: 'Lexend Deca', ui-sans-serif;
  font-size: 10px;
  color: #fafafa;
  background: #757575;
  border-radius: 4px;
  text-transform: none;
  font-weight: 400;

  padding: 6px 10px;
  position: absolute;
  bottom: 120%;
  left: 10%;

  z-index: 9000;
  overflow-y: auto;
  overflow-x: hidden;

  padding: 6px 10px;
  max-width: 300px;
  max-height: 300px;

  white-space: nowrap;
  text-overflow: ellipsis;

  visibility: hidden;
}

[data-type-of-edit='5']:hover::after {
  visibility: visible;
}

/* Hide the inner element containing the text */
[data-type-of-edit='5'] > span {
  display: none;
}
/* Solves: beginning of article not displaying correctly #400 */
.ve-ce-leafNode.ve-ce-focusableNode.ve-ce-mwTransclusionNode.ve-ce-focusableNode-invisible {
  display: none;
}

[data-id]:has(> p) {
  display: flow-root;
}
</style>
