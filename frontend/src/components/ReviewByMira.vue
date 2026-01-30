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
import { useQuasar } from 'quasar';
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
  has_improvement: boolean;
}

interface ReviewResponse {
  summary: string;
  total_reviewed: number;
  total_improvements: number;
  reviews: ReviewItem[];
  trigger_diff_update: boolean;
  mira_bot_id?: string;
  old_revision?: number;
  new_revision?: number;
  error?: string;
}

const miraStore = useMiraReviewStore();
const loading = ref(false);
const reviews = ref<ReviewItem[]>([]);
const $q = useQuasar();

function showNotification(type: 'success' | 'info' | 'error', message: string) {
  const icons = {
    success: 'check_circle',
    info: 'info',
    error: 'error',
  };

  const colors = {
    success: 'positive',
    info: 'positive',
    error: 'negative',
  };

  $q.notify({
    type: colors[type],
    message,
    icon: icons[type],
    position: 'bottom',
    timeout: 5000,
    actions: [{ icon: 'close', color: 'white', round: true }],
  });
}

async function triggerReview() {
  loading.value = true;
  reviews.value = [];

  try {
    const { data, error: fnError } =
      await supabaseClient.functions.invoke<ReviewResponse>('ai-review', {
        body: {
          article_id: props.article.article_id,
          language: props.article.language,
        },
      });

    if (fnError) {
      showNotification('error', 'Failed to complete AI review');
      throw fnError;
    }

    if (data?.reviews && data.reviews.length > 0) {
      reviews.value = data.reviews;
    }

    if (
      data?.trigger_diff_update &&
      data?.mira_bot_id &&
      data?.old_revision &&
      data?.new_revision
    ) {
      miraStore.completeReview({
        miraBotId: data.mira_bot_id,
        oldRevid: data.old_revision,
        newRevid: data.new_revision,
      });
      showNotification('success', data.summary);
    } else {
      miraStore.$reset();
      showNotification('info', 'No improvements needed.');
    }
  } catch (error) {
    if (!error) {
      showNotification('error', 'An unexpected error occurred during review');
    }
  } finally {
    loading.value = false;
  }
}
</script>
