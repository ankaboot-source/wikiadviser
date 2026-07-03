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
const articleLink = ref(
  `${mediawikiBaseUrl}/index.php?title=${props.article.article_id}&veaction=edit`,
);
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
const pendingDiffAfterLoad = ref(false);
async function reloadIframe() {
  renderIframe.value = false;
  await nextTick();
  renderIframe.value = true;
}
function gotoDiffLink() {
  activeViewStore.modeToggle = 'edit';

  if (!iframeRef.value?.contentWindow) {
    console.warn(
      '[MwVisualEditor] gotoDiffLink: iframe contentWindow not ready — will retry on next load',
    );
    pendingDiffAfterLoad.value = true;
    activeViewStore.modeToggle = 'edit';
    return;
  }

  iframeRef.value.contentWindow.postMessage(
    {
      type: 'wikiadviser',
      data: 'diff',
      articleId: props.article.article_id,
    },
    '*',
  );
}
async function onIframeLoad() {
  if (pendingDiffAfterLoad.value) {
    pendingDiffAfterLoad.value = false;
    await new Promise<void>((r) => setTimeout(r, 300));
    gotoDiffLink();
    return;
  }

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
    loading.value = { ...loaderPresets.editor };
    return;
  }

  miraStore.completeDiffUpdate();

  $q.notify({
    message: 'Changes successfully updated',
    icon: 'check',
    color: 'positive',
  });
  isProcessingChanges.value = false;
  loading.value = { ...loaderPresets.editor };
  reloadIframe();
}

async function handleIgnoredInitialEdit() {
  $q.notify({
    message: 'Changes successfully updated',
    icon: 'check',
    color: 'positive',
  });
  isProcessingChanges.value = false;
  loading.value = { ...loaderPresets.editor };
  await reloadIframe();
}

async function EventHandler(event: MessageEvent): Promise<void> {
  const { data } = event;

  if (data.type === 'diff-change') {
    await handleDiffChange(data);
    return;
  }

  switch (data.type) {
    case 'ignored-initial-edit':
      await handleIgnoredInitialEdit();
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
      break;
    case 'deleted-revision':
      isProcessingChanges.value = true;
      loading.value = { ...loaderPresets.changes };
      gotoDiffLink();
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

function handleDiffPending() {
  isProcessingChanges.value = true;
  loading.value = { value: true, message: loaderPresets.changes.message };
  setTimeout(() => {
    loading.value.value = false;
    $q.notify({
      message:
        'We are still processing changes, here you can see what is happening behind the scenes.',
      icon: 'info',
      color: 'info',
    });
  }, 20000);

  pendingDiffAfterLoad.value = true;
  activeViewStore.modeToggle = 'edit';
}

watch(
  () => miraStore.isDiffUpdatePending,
  (pending) => {
    if (!pending) return;
    handleDiffPending();
  },
);

watch(
  () => props.article.pending_diff,
  (pending) => {
    if (!pending) return;
    handleDiffPending();
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener('message', EventHandler);
});

onBeforeUnmount(() => {
  window.removeEventListener('message', EventHandler);
  miraStore.$reset();
});
</script>
