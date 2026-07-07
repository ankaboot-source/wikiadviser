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
const diffUrlPromise = ref<Promise<string> | null>(null);
let diffTimeout: ReturnType<typeof setTimeout> | null = null;
async function reloadIframe() {
  renderIframe.value = false;
  await nextTick();
  renderIframe.value = true;
}
function buildDiffUrl(
  articleId: string,
  oldRevid: number,
  newRevid: number,
): string {
  const url = `${mediawikiBaseUrl}/index.php?title=${encodeURIComponent(articleId)}&diff=${newRevid}&oldid=${oldRevid}&diffmode=visual&diffonly=1&wikiadviser`;
  console.log('[MwVisualEditor][buildDiffUrl]', {
    articleId,
    oldRevid,
    newRevid,
    url,
  });
  return url;
}
async function fetchDiffUrl(articleId: string): Promise<string> {
  const apiUrl = `${mediawikiBaseUrl}/api.php`;
  const params = new URLSearchParams({
    action: 'query',
    prop: 'revisions',
    titles: articleId,
    rvlimit: '2',
    rvdir: 'newer',
    rvprop: 'content|ids',
    formatversion: '2',
    origin: '*',
  });

  const fullUrl = `${apiUrl}?${params.toString()}`;
  console.log('[MwVisualEditor][fetchDiffUrl] START', { apiUrl: fullUrl });

  let res: Response;
  try {
    res = await fetch(fullUrl);
  } catch (e) {
    console.error('[MwVisualEditor][fetchDiffUrl] fetch() threw', e);
    throw e;
  }
  console.log('[MwVisualEditor][fetchDiffUrl] response', {
    ok: res.ok,
    status: res.status,
    contentType: res.headers.get('content-type'),
  });
  if (!res.ok) throw new Error(`MediaWiki API ${res.status}`);

  const data = await res.json();
  console.log('[MwVisualEditor][fetchDiffUrl] json', data);

  const revisions = data?.query?.pages?.[0]?.revisions;
  if (!revisions || revisions.length === 0) {
    throw new Error('No revisions returned from MediaWiki');
  }

  const originalRevid = revisions[0].revid;
  const latestRevid = revisions[revisions.length - 1].revid;

  const isOnlyDisplayTitle =
    /^\s*\{\{DISPLAYTITLE:[^}]*\}\}\s*$/i.test(revisions[0].content ?? '');
  const baseRevid =
    isOnlyDisplayTitle && revisions.length > 1
      ? revisions[1].revid
      : originalRevid;

  console.log('[MwVisualEditor][fetchDiffUrl] resolved revids', {
    originalRevid,
    latestRevid,
    isOnlyDisplayTitle,
    baseRevid,
  });

  return buildDiffUrl(articleId, baseRevid, latestRevid);
}
function gotoDiffLink() {
  activeViewStore.modeToggle = 'edit';

  if (!iframeRef.value?.contentWindow) {
    console.warn(
      '[MwVisualEditor] gotoDiffLink: contentWindow not ready — will retry on next load',
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
  console.log('[MwVisualEditor][onIframeLoad] FIRED', {
    pendingDiffAfterLoad: pendingDiffAfterLoad.value,
    hasDiffUrlPromise: diffUrlPromise.value !== null,
    currentArticleLink: articleLink.value,
    currentIframeSrc: iframeRef.value?.src,
  });

  if (pendingDiffAfterLoad.value) {
    pendingDiffAfterLoad.value = false;
    try {
      console.log('[MwVisualEditor][onIframeLoad] awaiting diffUrlPromise');
      const url = await diffUrlPromise.value;
      console.log('[MwVisualEditor][onIframeLoad] diffUrl resolved', { url });
      if (iframeRef.value) {
        console.log('[MwVisualEditor][onIframeLoad] about to recreate iframe with diff URL');
        articleLink.value = url;
        renderIframe.value = false;
        await nextTick();
        renderIframe.value = true;
        console.log('[MwVisualEditor][onIframeLoad] iframe recreated, new articleLink=', articleLink.value);
      } else {
        console.warn('[MwVisualEditor][onIframeLoad] iframeRef.value is null!');
      }
    } catch (e) {
      console.error('[MwVisualEditor][onIframeLoad] failed to fetch diff URL', e);
      isProcessingChanges.value = false;
      loading.value.value = false;
      miraStore.completeDiffUpdate();
      $q.notify({
        message: 'Failed to load changes',
        icon: 'error',
        color: 'negative',
      });
    }
    return;
  }

  loading.value.value = false;
}

async function handleDiffChange(data: {
  type: string;
  diffHtml: string;
  articleId: string;
}) {
  // Once the diff has landed and the iframe sent diff-change, we're done.
  // Clear pendingDiffAfterLoad so the fresh iframe from reloadIframe() does
  // not re-trigger handleDiffPending in an infinite loop.
  pendingDiffAfterLoad.value = false;

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
  // After the diff lands, we want the user to go back to the editor (this
  // is the expected UX after an AI review: show the diff, then return to
  // the editor). Reset articleLink to the editor URL and reload the iframe.
  // The editor page does not post a `diff-change` message, so no loop.
  articleLink.value = `${mediawikiBaseUrl}/index.php?title=${encodeURIComponent(props.article.article_id)}&veaction=edit`;
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

async function handleDiffPending() {
  console.log('[MwVisualEditor][handleDiffPending] CALLED', {
    articleId: props.article.article_id,
    hasReviewData: miraStore.reviewData !== null,
    iframeAlreadyRendered: !!iframeRef.value,
  });

  isProcessingChanges.value = true;
  loading.value = { value: true, message: loaderPresets.changes.message };
  diffTimeout = setTimeout(() => {
    loading.value.value = false;
    isProcessingChanges.value = false;
    miraStore.completeDiffUpdate();
    $q.notify({
      message:
        'We are still processing changes, here you can see what is happening behind the scenes.',
      icon: 'info',
      color: 'info',
    });
  }, 20000);

  pendingDiffAfterLoad.value = true;
  activeViewStore.modeToggle = 'edit';

  const review = miraStore.reviewData;
  if (review) {
    console.log('[MwVisualEditor][handleDiffPending] using fast path (reviewData)', review);
    diffUrlPromise.value = Promise.resolve(
      buildDiffUrl(
        props.article.article_id,
        review.oldRevid,
        review.newRevid,
      ),
    );
  } else {
    console.log('[MwVisualEditor][handleDiffPending] using slow path (fetchDiffUrl)');
    diffUrlPromise.value = fetchDiffUrl(props.article.article_id);
  }
  console.log('[MwVisualEditor][handleDiffPending] DONE — pendingDiffAfterLoad=true, diffUrlPromise set');

  // If the iframe is ALREADY rendered (e.g. user is in the same Vue session
  // and just clicked "Review by Mira"), its load event already fired before
  // we got here — onIframeLoad will never see pendingDiffAfterLoad=true.
  // Navigate it directly by re-creating the iframe with the diff URL.
  if (iframeRef.value) {
    console.log('[MwVisualEditor][handleDiffPending] iframe already rendered — navigating directly');
    try {
      const url = await diffUrlPromise.value;
      console.log('[MwVisualEditor][handleDiffPending] direct-navigate with URL', { url });
      if (iframeRef.value) {
        // CRITICAL: clear the flag BEFORE toggling renderIframe. The
        // await nextTick() below yields to the event loop, and if
        // pendingDiffAfterLoad is still true, onIframeLoad will race us
        // and cause an infinite navigation loop.
        pendingDiffAfterLoad.value = false;
        articleLink.value = url;
        renderIframe.value = false;
        await nextTick();
        renderIframe.value = true;
        console.log('[MwVisualEditor][handleDiffPending] direct-navigate done');
      }
    } catch (e) {
      console.error('[MwVisualEditor][handleDiffPending] direct-navigate failed', e);
    }
  } else {
    console.log('[MwVisualEditor][handleDiffPending] iframe not rendered yet — onIframeLoad will handle it');
  }
}

watch(
  () => miraStore.isDiffUpdatePending,
  (pending) => {
    console.log('[MwVisualEditor][watch isDiffUpdatePending]', { pending });
    if (!pending) return;
    handleDiffPending();
  },
  { immediate: true },
);

watch(
  () => props.article.pending_diff,
  (pending) => {
    console.log('[MwVisualEditor][watch article.pending_diff]', {
      pending,
      articleId: props.article.article_id,
    });
    if (!pending) return;
    handleDiffPending();
  },
  { immediate: true },
);

watch(
  () => articleLink.value,
  (newVal, oldVal) => {
    console.log('[MwVisualEditor][watch articleLink]', { oldVal, newVal });
  },
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
