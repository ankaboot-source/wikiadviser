<template>
  <div>
    <q-btn
      :icon="loading ? undefined : 'img:/icons/logo.svg'"
      :label="loading ? '' : $q.screen.lt.md ? '' : 'Review by Mira'"
      outline
      no-caps
      class="q-mr-xs q-px-md"
      :disable="loading"
      @click="triggerReview"
    >
      <template v-if="loading" #default>
        <q-spinner size="1em" />
        <span v-if="!$q.screen.lt.md" class="q-ml-sm q-pl-xs"
          >Review by Mira</span
        >
      </template>
    </q-btn>
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
