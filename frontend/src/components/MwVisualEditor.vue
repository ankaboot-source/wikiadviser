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
import { Article } from 'src/types';
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
  article: { type: Object as () => Article, required: true },
});

const $q = useQuasar();

const activeViewStore = useActiveViewStore();

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
async function reloadIframe() {
  renderIframe.value = false;
  await nextTick();
  renderIframe.value = true;
}

async function handleDiffChange(data: {
  type: string;
  diffHtml: string;
  articleId: string;
}) {
  const functionName = `/article/${data.articleId}/changes`;

  await supabaseClient.functions.invoke(functionName, {
    method: 'PUT',
    body: JSON.stringify({ diffHtml: data.diffHtml }),
  });

  $q.notify({
    message: 'Changes successfully updated',
    icon: 'check',
    color: 'positive',
  });
  isProcessingChanges.value = false;
  loading.value = { ...loaderPresets.editor };
  reloadIframe();
}

function gotoDiffLink() {
  activeViewStore.toggleEditButton = 'edit';
  // tell mediawiki to goto difflink (which automatically initiates diff-change)
  iframeRef.value.contentWindow.postMessage(
    {
      type: 'wikiadviser',
      data: 'diff',
      articleId: props.article.article_id,
    },
    '*',
  );
}

async function EventHandler(event: MessageEvent): Promise<void> {
  const { data } = event;

  if (data.type === 'diff-change') {
    await handleDiffChange(data);
    return;
  }

  switch (data.type) {
    case 'saved-changes':
    case 'deleted-revision':
      isProcessingChanges.value = true;
      loading.value = { ...loaderPresets.changes };
      gotoDiffLink();
      break;
    default:
      break;
  }
}

async function onIframeLoad() {
  if (!isProcessingChanges.value) {
    loading.value.value = false;
  }
}

onMounted(() => {
  window.addEventListener('message', EventHandler);
});

onBeforeUnmount(() => {
  window.removeEventListener('message', EventHandler);
});
</script>
