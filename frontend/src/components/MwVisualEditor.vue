<template>
  <div
    v-if="activeViewStore.isEditing"
    style="position: relative"
    class="col-grow"
  >
    <iframe
      v-if="renderIframe"
      ref="iframeRef"
      :src="articleLink"
      class="full-width full-height rounded-borders borders bg-secondary"
      frameBorder="0"
      @load="onIframeLoad()"
    />
    <div
      v-if="loading.value"
      class="q-pa-xl row justify-center text-center rounded-borders borders bg-secondary"
      style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
      "
    >
      <div>
        <div class="text-h6">
          {{ loading.message }}
        </div>
        <QSpinner class="q-my-xl self-center" color="primary" size="140" />
        <div class="text-body1">Please wait…</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { QSpinner, useQuasar } from 'quasar';
import supabaseClient from 'src/api/supabase';
import ENV from 'src/schema/env.schema';
import { useActiveViewStore } from 'src/stores/useActiveViewStore';
import { useMiraReviewStore } from 'src/stores/useMiraReviewStore';
import { Article } from 'src/types';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  article: { type: Object as () => Article, required: true },
});

const $q = useQuasar();

const activeViewStore = useActiveViewStore();
const miraStore = useMiraReviewStore();

const mediawikiBaseUrl = `${ENV.MEDIAWIKI_ENDPOINT}/${props.article.language}`;
const baseArticleLink = `${mediawikiBaseUrl}/index.php?title=${encodeURIComponent(
  props.article.article_id,
)}`;
const veLink = `${baseArticleLink}&veaction=edit`;
const articleLink = ref(veLink);

const loaderPresets = {
  editor: { value: true, message: 'Loading Editor' },
  changes: {
    value: true,
    message: 'Processing changes',
  },
};
const loading = ref({ ...loaderPresets.editor });
const iframeRef = ref();
const isProcessingChanges = ref(false);

const renderIframe = ref(true);
let diffTimeout: ReturnType<typeof setTimeout> | null = null;

async function reloadIframe() {
  renderIframe.value = false;
  await nextTick();
  renderIframe.value = true;
}
function navigateToVE() {
  loading.value = { ...loaderPresets.editor };
  articleLink.value = veLink;
  reloadIframe();
}

// Reload the iframe pointing at the editor URL with gotodiff=1 appended.
// MediaWiki's Common.js detects the param, fetches the diff URL via
// mw.wikiadviser.getDiffUrl(), and replaces window.location to land on
// the diff page. This sidesteps the cross-origin postMessage race that
// made the old "send event to iframe" approach unreliable.
async function navigateToDiff() {
  isProcessingChanges.value = true;
  loading.value = { ...loaderPresets.changes };
  articleLink.value = `${baseArticleLink}&gotodiff&wikiadviser`;
  await reloadIframe();
}

function onIframeLoad() {
  loading.value.value = false;
}

async function handleDiffChange(data: {
  type: string;
  diffHtml: string;
  articleId: string;
}) {
  const functionName = `/article/${data.articleId}/changes`;
  const body: { diffHtml: string; miraBotId?: string } = {
    diffHtml: data.diffHtml,
  };

  if (miraStore.currentMiraBotId) {
    body.miraBotId = miraStore.currentMiraBotId;
  }

  try {
    await supabaseClient.functions.invoke(functionName, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[MwVisualEditor] Failed to save changes:', err);
    $q.notify({
      message: 'Failed to save changes',
      icon: 'error',
      color: 'negative',
    });
    isProcessingChanges.value = false;
    navigateToVE();
    return;
  }

  miraStore.completeDiffUpdate();

  $q.notify({
    message: 'Changes successfully updated',
    icon: 'check',
    color: 'positive',
  });
  isProcessingChanges.value = false;
  navigateToVE();
  // The diff page in the iframe handles its own navigation back to
  // the editor after the user accepts/rejects.
}

async function handleIgnoredInitialEdit() {
  $q.notify({
    message: 'Changes successfully updated',
    icon: 'check',
    color: 'positive',
  });
  isProcessingChanges.value = false;
  navigateToVE();
}

async function EventHandler(event: MessageEvent): Promise<void> {
  const { data } = event;

  console.log('[MwVisualEditor] Received event:', data);
  switch (data.type) {
    case 'ignored-initial-edit':
      await handleIgnoredInitialEdit();
      break;
    case 'diff-change':
      await handleDiffChange(data);
      break;
    case 'saved-changes':
      isProcessingChanges.value = true;
      loading.value = { ...loaderPresets.changes };
      try {
        await supabaseClient.functions.invoke(
          `/article/${data.articleId}/pending-diff`,
          {
            method: 'PUT',
          },
        );
      } catch (e) {
        console.warn('[MwVisualEditor] Failed to set pending diff:', e);
      }
      isProcessingChanges.value = false;
      navigateToVE();
      break;
    case 'deleted-revision':
      await navigateToDiff();
      break;
    case 'diff-error':
      console.error('[MwVisualEditor] Diff navigation failed:', data.error);
      isProcessingChanges.value = false;
      loading.value = { ...loaderPresets.editor };
      $q.notify({
        message: 'Failed to load changes',
        icon: 'error',
        color: 'negative',
      });
      break;
    default:
      break;
  }
}

// AI review just completed — show the "still processing" UX toast and
// reload the iframe with gotodiff=1 to navigate to the diff page.
watch(
  () => miraStore.isDiffUpdatePending,
  (pending) => {
    console.log('[MwVisualEditor] isDiffUpdatePending changed:', pending);
    if (!pending) return;
    navigateToDiff();
  },
);

// Page loaded with pending_diff=true (e.g. user reloaded a wikiadviser
// that already has pending changes). immediate:true fires once on mount.
watch(
  () => props.article.pending_diff,
  (pending) => {
    console.log('[MwVisualEditor] article.pending_diff changed:', pending);
    if (pending) navigateToDiff();
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener('message', EventHandler);
});

onBeforeUnmount(() => {
  window.removeEventListener('message', EventHandler);
  if (diffTimeout) clearTimeout(diffTimeout);
  miraStore.$reset();
});
</script>
