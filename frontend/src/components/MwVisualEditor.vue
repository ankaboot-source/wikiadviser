<template>
  <iframe
    v-if="renderIframe"
    v-show="buttonToggle === 'edit'"
    ref="iframeRef"
    :src="articleLink"
    class="col-grow rounded-borders borders bg-secondary"
    frameBorder="0"
    @load="onIframeLoad()"
  />
  <div
    v-if="buttonToggle === 'edit' && loading.value"
    class="q-pa-xl row justify-center text-center col-grow rounded-borders borders bg-secondary absolute-full z-top"
    style="z-index: 1000; background-color: rgba(255, 255, 255, 0.95)"
  >
    <div>
      <div class="text-h6">
        {{ loading.message }}
      </div>
      <QSpinner class="q-my-xl self-center" color="primary" size="140" />
      <div class="text-body1">Please wait…</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { QSpinner, useQuasar } from 'quasar';
import supabaseClient from 'src/api/supabase';
import ENV from 'src/schema/env.schema';
import { Article } from 'src/types';
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
  toggleEditTab: {
    type: Function,
    required: true,
  },
  article: { type: Object as () => Article, required: true },
  buttonToggle: { type: String, required: true },
});

const $q = useQuasar();
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

const emit = defineEmits(['switchTabEmit']);

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
  emit('switchTabEmit', 'view');
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
  props.toggleEditTab();

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
      isProcessingChanges.value = true;
      loading.value = { ...loaderPresets.changes };
      gotoDiffLink();
      break;

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
