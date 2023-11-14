<template>
  <iframe :src="articleLink" frameBorder="0" />
</template>

<script setup lang="ts">
import { QSpinnerGrid, useQuasar } from 'quasar';
import { updateChanges } from 'src/api/supabaseHelper';
import { Article } from 'src/types';

const props = defineProps({
  article: { type: Object as () => Article, required: true },
});
const $q = useQuasar();
const articleLink = `${process.env.MEDIAWIKI_HOST}/w/index.php/${props.article.article_id}?veaction=edit&expectedTitle=${props.article.title}`;

async function loadingChanges() {
  try {
    $q.loading.show({
      boxClass: 'bg-white text-blue-grey-10 q-pa-xl',
      spinner: QSpinnerGrid,
      spinnerColor: 'primary',
      spinnerSize: 140,
      message: `
        <div class='text-h6'> Creating new changes of “${props.article.title}” </div></br>
        <div class='text-body1'>Please wait…</div>`,
      html: true,
    });

    await updateChanges(props.article.article_id);

    $q.loading.hide();
    $q.notify({
      message: 'New changes successfully created.',
      icon: 'check',
      color: 'positive',
    });
  } catch (error) {
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

window.addEventListener('message', async (event) => {
  if (event.data === 'updateChanges') {
    loadingChanges();
  }
});
</script>
