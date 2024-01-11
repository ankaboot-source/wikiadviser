<template>
  <div class="column">
    <q-toolbar class="q-px-none">
      <q-btn-toggle
        v-model="buttonToggle"
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
        @click="viewArticleInNewTab()"
      />
      <q-btn
        v-if="role === UserRole.Owner"
        icon="link"
        outline
        label="Share link"
        no-caps
        class="q-mr-xs"
        @click="copyShareLinkToClipboard()"
      />
      <q-btn
        v-if="role != UserRole.Viewer"
        icon="o_group"
        outline
        label="Sharing settings"
        no-caps
        class="q-pr-lg"
        @click="share = !share"
      >
        <q-dialog v-model="share">
          <share-card :article="article" :role="article.role" />
        </q-dialog>
      </q-btn>
    </q-toolbar>

    <mw-visual-editor
      v-if="article.title && article.permission_id && editorPermission"
      :button-toggle="buttonToggle"
      :article="article"
      @switch-tab-emit="onSwitchTabEmitChange"
    />

    <template v-if="buttonToggle === 'view'">
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
          Easily navigate through changes using the changes tab once the article
          has been edited.
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { copyToClipboard, useQuasar } from 'quasar';
import { createLink } from 'src/api/supabaseHelper';
import MwVisualEditor from 'src/components/MwVisualEditor.vue';
import ShareCard from 'src/components/ShareCard.vue';
import 'src/css/styles/diff.scss';
import 'src/css/styles/ve.scss';
import { useSelectedChangeStore } from 'src/stores/useSelectedChangeStore';
import { Article, UserRole } from 'src/types';
import { EXPIRATION_DAYS, HOURS_IN_DAY } from 'src/utils/consts';
import { computed, nextTick, ref, watch } from 'vue';

const store = useSelectedChangeStore();
const props = defineProps<{
  changesContent: string | null;
  article: Article;
  role: UserRole;
  editorPermission: boolean | null;
}>();

// There is an error when passing a variable into import()
if (props.article.language === 'fr') {
  import('src/css/styles/fr-common.css');
} else if (props.article.language === 'en') {
  import('src/css/styles/en-common.css');
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
        store.selectedChangeId = element.getAttribute('data-id') as string;
      });
      element.addEventListener('keydown', (event) => {
        const keyboardEvent = event as KeyboardEvent;
        if (keyboardEvent.key === 'Enter') {
          store.selectedChangeId = element.getAttribute('data-id') as string;
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
  { immediate: true }
);

watch(
  () => store.hoveredChangeId,
  (hoveredChangeId: string) => {
    if (hoveredChangeId) {
      const element = document.querySelector(
        `.ve-ui-diffElement-document [data-id="${hoveredChangeId}"]`
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
  }
);

const $q = useQuasar();
const share = ref(false);
async function copyShareLinkToClipboard() {
  const token = await createLink(`${props.article.article_id}`);
  await copyToClipboard(`${window.location.origin}/shares/${token}`);
  $q.notify({
    message: 'Share link copied to clipboard',
    color: 'positive',
    icon: 'content_copy',
  });
  $q.notify({
    message: `This link will expire in ${EXPIRATION_DAYS * HOURS_IN_DAY} hours`,
    color: 'positive',
  });
}

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

const buttonToggle = ref('');
const toggleOptions = computed(() =>
  !(
    props.article.title &&
    props.article.permission_id &&
    props.editorPermission
  )
    ? [viewButton]
    : [viewButton, editButton]
);
const firstToggle = computed(() => {
  // editorPerm & !changes -> Editor
  if (props.editorPermission === true && props.changesContent === '') {
    return 'edit';
  }
  return 'view';
});

watch(
  firstToggle,
  (newToggle, oldToggle) => {
    if (oldToggle === 'edit') {
      return;
    }
    buttonToggle.value = newToggle;
  },
  { immediate: true }
);

const onSwitchTabEmitChange = (tab: string) => {
  buttonToggle.value = tab;
};

function viewArticleInNewTab() {
  window.open(
    `${process.env.MEDIAWIKI_ENDPOINT}/${props.article.language}/index.php?title=${props.article.article_id}`,
    '_blank'
  );
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
[data-id] > p {
  display: inherit;
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
</style>
