<template>
  <div class="column col-grow">
    <mw-visual-editor
      v-if="article.title && article.permission_id && editorPermission"
      :button-toggle="buttonToggle"
      :article="article"
      :toggle-edit-tab="toggleEditTab"
      @switch-tab-emit="onSwitchTabEmitChange"
    />

    <template v-if="buttonToggle === 'view'">
      <q-scroll-area
        v-if="props.changesContent"
        class="col-grow rounded-borders borders bg-secondary q-py-md q-pl-md"
        @click="handleScrollAreaClick"
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
import 'src/css/styles/diff.scss';
import 'src/css/styles/ve.scss';
import { useSelectedChangeStore } from 'src/stores/useSelectedChangeStore';
import { Article } from 'src/types';
import { nextTick, watch } from 'vue';
import { useQuasar } from 'quasar';

const selectedChangeStore = useSelectedChangeStore();

const props = defineProps<{
  changesContent: string | null;
  article: Article;
  editorPermission: boolean | null;
  buttonToggle: string;
}>();

const emit = defineEmits<{
  'update:buttonToggle': [value: string];
}>();

const $q = useQuasar();

// There is an error when passing a variable into import()
if (props.article.language === 'fr') {
  import('src/css/styles/fr-common.css');
} else if (props.article.language === 'en') {
  import('src/css/styles/en-common.css');
}

function handleScrollAreaClick(event: MouseEvent) {
  const target = event.target as HTMLElement;

  // Check if clicked on a change element
  const changeElement = target.closest('.ve-ui-diffElement-document [data-id]');
  if (changeElement) {
    const dataId = changeElement.getAttribute('data-id');
    if (dataId) {
      selectedChangeStore.selectedChangeId = dataId;
    }
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
    if ($q.screen.lt.md) {
      return;
    }
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

const onSwitchTabEmitChange = (tab: string) => {
  if (props.buttonToggle !== tab) {
    emit('update:buttonToggle', tab);
  }
};

function toggleEditTab() {
  if (props.buttonToggle !== 'edit') {
    emit('update:buttonToggle', 'edit');
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
