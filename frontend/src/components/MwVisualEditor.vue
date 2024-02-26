<template>
  <iframe
    v-if="renderIframe"
    v-show="buttonToggle === 'edit' && !loading.value"
    :src="articleLink"
    class="col-grow rounded-borders borders bg-secondary"
    frameBorder="0"
    @load="loading.value = false"
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
import { updateChanges } from 'src/api/supabaseHelper';
import { Article } from 'src/types';
import { onBeforeUnmount, onMounted, ref, nextTick } from 'vue';

const props = defineProps({
  article: { type: Object as () => Article, required: true },
  buttonToggle: { type: String, required: true },
});

const $q = useQuasar();
const articleLink = `${process.env.MEDIAWIKI_ENDPOINT}/${props.article.language}/index.php?title=${props.article.article_id}&veaction=edit`;
const loader = {
  editor: { value: true, message: 'Loading Editor' },
  changes: {
    value: true,
    message: 'Processing new changes',
  },
};
const loading = ref(loader.editor);

const emit = defineEmits(['switchTabEmit']);

const renderIframe = ref(true);
async function reloadIframe() {
  renderIframe.value = false;
  await nextTick();
  renderIframe.value = true;
}

async function loadingChanges() {
  try {
    loading.value = loader.changes;
    loading.value.value = true;

    await updateChanges(props.article.article_id);

    emit('switchTabEmit', 'view');
    $q.notify({
      message: 'New changes successfully created',
      icon: 'check',
      color: 'positive',
    });
  } catch (error) {
    loading.value = loader.editor;
    loading.value.value = true;
    throw error;
  } finally {
    loading.value = loader.editor;
    loading.value.value = true;
    reloadIframe();
  }
}

async function EventHandler(event: MessageEvent): Promise<void> {
  const { data } = event;

  switch (data) {
    case 'updateChanges':
      await loadingChanges();
      break;

    case 'update-revisions':
      emit('switchTabEmit', 'view');
      reloadIframe();
      break;

    default:
      break;
  }
}

onMounted(() => {
  window.addEventListener('message', EventHandler);
});

onBeforeUnmount(() => {
  window.removeEventListener('message', EventHandler);
});
</script>
