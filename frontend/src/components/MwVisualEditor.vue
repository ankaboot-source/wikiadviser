<template>
  <iframe
    v-if="renderIframe"
    v-show="buttonToggle === 'edit' && !loading.value"
    :src="articleLink"
    class="col-grow rounded-borders borders bg-secondary"
    frameBorder="0"
    @load="onIframeLoad()"
    ref="iframeRef"
  />
  <div
    v-if="buttonToggle === 'edit' && loading.value"
    class="q-pa-xl row justify-center text-center col-grow rounded-borders borders bg-secondary"
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
import { api } from 'src/boot/axios';
import ENV from 'src/schema/env.schema';
import { Article } from 'src/types';
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
  article: { type: Object as () => Article, required: true },
  buttonToggle: { type: String, required: true },
});

const $q = useQuasar();
const mediawikiBaseUrl = `${ENV.MEDIAWIKI_ENDPOINT}/${props.article.language}`;
const articleLink = ref(
  `${mediawikiBaseUrl}/index.php?title=${props.article.article_id}&veaction=edit`,
);
const loader = {
  editor: { value: true, message: 'Loading Editor' },
  changes: {
    value: true,
    message: 'Processing new changes',
  },
};
const loading = ref(loader.editor);
const iframeRef = ref();

const emit = defineEmits(['switchTabEmit']);

const renderIframe = ref(true);
async function reloadIframe() {
  renderIframe.value = false;
  await nextTick();
  renderIframe.value = true;
}

async function EventHandler(event: MessageEvent): Promise<void> {
  const { data } = event;
  console.log(data);

  if (data.type === 'diff-change') {
    await handleDiffChange(data);

    return;
  }

  switch (data.type) {
    case 'saved-changes':
      loading.value = loader.changes;
      break;

    case 'deleted-revision':
      // tell mediawiki to goto difflink (which automatically initiates diff-change)
      iframeRef.value.contentWindow.postMessage(
        {
          type: 'wikiadviser',
          data: 'diff',
        },
        '*',
      );
      break;
    default:
      break;
  }
}

async function onIframeLoad() {
  console.log('Iframe loaded');
  loading.value.value = false;
}

async function handleDiffChange(data: {
  type: string;
  diffHtml: string;
  articleId: string;
}) {
  console.log(data);
  const functionName = `/article/${data.articleId}/changes`;
  await api.put(functionName, { diffHtml: data.diffHtml });
  emit('switchTabEmit', 'view');
  $q.notify({
    message: 'New changes successfully created',
    icon: 'check',
    color: 'positive',
  });
  loading.value = loader.editor;
  reloadIframe();
}

onMounted(() => {
  window.addEventListener('message', EventHandler);
});

onBeforeUnmount(() => {
  window.removeEventListener('message', EventHandler);
});
</script>
