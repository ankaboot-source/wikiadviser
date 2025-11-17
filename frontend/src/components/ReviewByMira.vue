<template>
  <div>
    <q-btn
      icon="img:/icons/logo.svg"
      :label="$q.screen.lt.md ? '' : 'Review by Mira'"
      outline
      no-caps
      class="q-mr-xs q-px-md"
      :loading="loading"
      :disable="loading"
      @click="triggerReview"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import supabaseClient from 'src/api/supabase';
import { useMiraReviewStore } from 'src/stores/useMiraReviewStore';
import { Article } from 'src/types';
const props = defineProps<{
  article: Article;
}>();

interface ReviewItem {
  change_id: string;
  comment: string;
  proposed_change: string;
}

const miraStore = useMiraReviewStore();
const loading = ref(false);
const reviews = ref<ReviewItem[]>([]);

async function triggerReview() {
  loading.value = true;
  reviews.value = [];

  miraStore.startReview();

  try {
    const { data, error: fnError } = await supabaseClient.functions.invoke(
      'ai-review',
      {
        body: {
          article_id: props.article.article_id,
          language: props.article.language,
        },
      },
    );

    if (fnError) throw fnError;

    if (data?.reviews?.length > 0) {
      reviews.value = data.reviews;
    }

    if (data?.trigger_diff_update && data?.mira_bot_id) {
      miraStore.completeReview({
        miraBotId: data.mira_bot_id,
        oldRevid: data.old_revision,
        newRevid: data.new_revision,
      });
    } else {
      miraStore.$reset();
    }
  } finally {
    loading.value = false;
  }
}
</script>
