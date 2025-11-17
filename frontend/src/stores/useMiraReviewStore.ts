import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMiraReviewStore = defineStore('miraReview', () => {
  const isReviewInProgress = ref(false);
  const isDiffUpdatePending = ref(false);
  const currentMiraBotId = ref<string | null>(null);
  const reviewData = ref<{
    miraBotId: string;
    oldRevid: number;
    newRevid: number;
  } | null>(null);

  function startReview() {
    isReviewInProgress.value = true;
  }

  function completeReview(data: {
    miraBotId: string;
    oldRevid: number;
    newRevid: number;
  }) {
    reviewData.value = data;
    currentMiraBotId.value = data.miraBotId;
    isDiffUpdatePending.value = true;
    isReviewInProgress.value = false;
  }

  function completeDiffUpdate() {
    currentMiraBotId.value = null;
    reviewData.value = null;
    isDiffUpdatePending.value = false;
  }

  function $reset() {
    isReviewInProgress.value = false;
    isDiffUpdatePending.value = false;
    currentMiraBotId.value = null;
    reviewData.value = null;
  }

  return {
    isReviewInProgress,
    isDiffUpdatePending,
    currentMiraBotId,
    reviewData,
    startReview,
    completeReview,
    completeDiffUpdate,
    $reset,
  };
});
