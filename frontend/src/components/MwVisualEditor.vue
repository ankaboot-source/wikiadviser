<template>
  <iframe v-if="!loading" :src="articleLink" frameBorder="0" />
  <div v-else class="q-pa-xl row justify-center text-center">
    <div>
      <div class="text-h6">
        Processing the new changes of “{{ props.article.title }}”
      </div>
      <QSpinnerGrid class="q-my-xl self-center" color="primary" size="140" />
      <div class="text-body1">Please wait…</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { QSpinnerGrid, useQuasar } from 'quasar';
import { updateChanges } from 'src/api/supabaseHelper';
import { Article } from 'src/types';
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
  article: { type: Object as () => Article, required: true },
});
const $q = useQuasar();
const articleLink = `${process.env.MEDIAWIKI_ENDPOINT}/${props.article.language}/index.php/${props.article.article_id}?veaction=edit&expectedTitle=${props.article.title}`;
const loading = ref(false);
const emit = defineEmits(['switchTabEmit']);

async function loadingChanges() {
  try {
    loading.value = true;

    await updateChanges(props.article.article_id);

    emit('switchTabEmit', 'view');
    loading.value = false;
    $q.notify({
      message: 'New changes successfully created.',
      icon: 'check',
      color: 'positive',
    });
  } catch (error) {
    loading.value = false;
    let message = 'Creating changes failed.';
    if (error instanceof Error) {
      message = error.message;
    }
    $q.notify({
      message,
      color: 'negative',
    });
  }
}
async function handleUpdateChanges(event: MessageEvent) {
  if (event.data === 'updateChanges') {
    await loadingChanges();
  }
}

onMounted(() => {
  window.addEventListener('message', handleUpdateChanges);
});

onBeforeUnmount(() => {
  window.removeEventListener('message', handleUpdateChanges);
});
</script>
