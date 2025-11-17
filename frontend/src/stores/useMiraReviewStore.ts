import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMiraReviewStore = defineStore('miraReview', () => {
  const isDiffUpdatePending = ref(false);
  const currentMiraBotId = ref<string | null>(null);
  const reviewData = ref<{
    miraBotId: string;
    oldRevid: number;
    newRevid: number;
  } | null>(null);

  function completeReview(data: {
    miraBotId: string;
    oldRevid: number;
    newRevid: number;
  }) {
    reviewData.value = data;
    currentMiraBotId.value = data.miraBotId;
    isDiffUpdatePending.value = true;
  }

  function completeDiffUpdate() {
    currentMiraBotId.value = null;
    reviewData.value = null;
    isDiffUpdatePending.value = false;
  }

  function $reset() {
    isDiffUpdatePending.value = false;
    currentMiraBotId.value = null;
    reviewData.value = null;
  }

  return {
    isDiffUpdatePending,
    currentMiraBotId,
    reviewData,
    completeReview,
    completeDiffUpdate,
    $reset,
  };
});
