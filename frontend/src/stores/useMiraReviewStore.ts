import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useMiraReviewStore = defineStore('miraReview', () => {
  const isDiffUpdatePending = ref(false);
  const currentMiraBotId = ref<string | null>(null);
  const reviewData = ref<{
    miraBotId: string;
    oldRevid: number;
    newRevid: number;
  } | null>(null);

  const pendingPrompts = ref<Map<string, string>>(new Map());

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

  function addPendingPrompt(changeId: string, prompt: string) {
    pendingPrompts.value.set(changeId, prompt);
    pendingPrompts.value = new Map(pendingPrompts.value);
  }

  function removePendingPrompt(changeId: string) {
    pendingPrompts.value.delete(changeId);
    pendingPrompts.value = new Map(pendingPrompts.value);
  }

  function clearPendingPrompts() {
    pendingPrompts.value = new Map();
  }

  function $reset() {
    isDiffUpdatePending.value = false;
    currentMiraBotId.value = null;
    reviewData.value = null;
    pendingPrompts.value = new Map();
  }

  const pendingPromptsCount = computed(() => pendingPrompts.value.size);

  const revisionImprovements = computed(() => {
    return Array.from(pendingPrompts.value.entries()).map(([changeId, prompt]) => ({
      change_id: changeId,
      prompt,
    }));
  });

  return {
    isDiffUpdatePending,
    currentMiraBotId,
    reviewData,
    pendingPrompts,
    pendingPromptsCount,
    revisionImprovements,
    completeReview,
    completeDiffUpdate,
    addPendingPrompt,
    removePendingPrompt,
    clearPendingPrompts,
    $reset,
  };
});
