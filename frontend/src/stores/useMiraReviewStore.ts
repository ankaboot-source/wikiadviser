import { FunctionsHttpError } from '@supabase/supabase-js';
import { defineStore } from 'pinia';
import { useQuasar } from 'quasar';
import supabaseClient from 'src/api/supabase';
import { useUserStore } from 'src/stores/userStore';
import { ref } from 'vue';

export interface Prompt {
  id: string;
  name: string;
  prompt: string;
  isCustom: boolean;
}

interface StoredPrompt {
  id: string;
  name: string;
  prompt: string;
}

export interface ReviewItem {
  change_id: string;
  comment: string;
  proposed_change: string;
  has_improvement: boolean;
}

export interface ReviewResponse {
  summary: string;
  total_reviewed: number;
  total_improvements: number;
  reviews: ReviewItem[];
  trigger_diff_update: boolean;
  mira_bot_id?: string;
  old_revision?: number;
  new_revision?: number;
  error?: string;
  change_id?: string;
  was_empty?: boolean;
  article_wide_applied?: boolean;
  accepted?: boolean;
  chain_state?: { chainId: string; batchIndex: number; totalBatches: number };
}

const DEFAULT_PROMPTS: Prompt[] = [
  {
    id: 'mira',
    name: 'Mira',
    prompt: '',
    isCustom: false,
  },
];

export const useMiraReviewStore = defineStore('miraReview', () => {
  // Capture Quasar's instance at store setup. Calling useQuasar() inside
  // an async function after an `await` loses the component context and
  // throws; closing over the instance here keeps notifications working
  // regardless of where in the async chain they fire from.
  const $q = useQuasar();

  // --- Review-result state (existing) ---
  const isDiffUpdatePending = ref(false);
  const currentMiraBotId = ref<string | null>(null);
  const reviewData = ref<{
    miraBotId: string;
    oldRevid: number;
    newRevid: number;
  } | null>(null);

  // --- Prompt + trigger state (new — shared with the toolbar dropdown
  // and the per-revision "Send review" button) ---
  const prompts = ref<Prompt[]>([...DEFAULT_PROMPTS]);
  const selectedPrompt = ref<Prompt | null>(null);
  const loading = ref(false);
  const reviews = ref<ReviewItem[]>([]);
  const promptsLoaded = ref(false);

  // --- Chain review progress (self-chaining section-wise fallback) ---
  const chainActive = ref(false);
  const chainProgress = ref<string>('');
  const chainTotalBatches = ref(0);
  const chainCurrentBatch = ref(0);
  let chainPollTimer: number | null = null;

  function startChainProgress(message: string, totalBatches: number) {
    chainActive.value = true;
    chainProgress.value = message;
    chainTotalBatches.value = totalBatches;
    chainCurrentBatch.value = 0;
  }

  function stopChainProgress() {
    chainActive.value = false;
    chainProgress.value = '';
    chainTotalBatches.value = 0;
    chainCurrentBatch.value = 0;
    if (chainPollTimer !== null) {
      clearInterval(chainPollTimer);
      chainPollTimer = null;
    }
  }

  // Poll review_chains table for live batch progress, then pending_diff on completion.
  function pollForChainCompletion(cId: string, articleId: string, onComplete: () => void) {
    const poll = async () => {
      try {
        // First check batch progress
        const { data: chain } = await supabaseClient
          .from('review_chains')
          .select('batch_index, status, improved_count')
          .eq('id', cId)
          .single();
        if (chain) {
          chainCurrentBatch.value = chain.batch_index + 1;
          if (chain.improved_count > 0) {
            chainProgress.value = `Reviewing... batch ${chainCurrentBatch.value}/${chainTotalBatches.value}`;
          }
        }
        // If pending_diff is set, we're done
        const { data } = await supabaseClient
          .from('articles')
          .select('pending_diff')
          .eq('id', articleId)
          .single();
        if (data?.pending_diff === true) {
          stopChainProgress();
          onComplete();
        }
      } catch (err) {
        console.error('Error polling chain progress:', err);
      }
    };
    chainPollTimer = window.setInterval(poll, 5000);
  }

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

  function showNotification(
    type: 'success' | 'info' | 'error',
    message: string,
  ) {
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
      timeout: 0,
      actions: [{ icon: 'close', color: 'white', round: true }],
    });
  }

  async function loadPromptsFromDB() {
    if (promptsLoaded.value) return;
    try {
      const userStore = useUserStore();
      const userId = userStore.user?.id;
      if (!userId) return;

      const { data: profileData, error } = await supabaseClient
        .from('profiles')
        .select('llm_reviewer_config')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading prompts:', error);
        return;
      }

      const config =
        typeof profileData?.llm_reviewer_config === 'object' &&
        profileData?.llm_reviewer_config !== null &&
        !Array.isArray(profileData?.llm_reviewer_config)
          ? (profileData.llm_reviewer_config as Record<string, unknown>)
          : {};
      const customPrompts: StoredPrompt[] =
        (config.prompts as StoredPrompt[]) || [];
      const customPromptObjects: Prompt[] = customPrompts.map((cp) => ({
        id: cp.id,
        name: cp.name,
        prompt: cp.prompt,
        isCustom: true,
      }));

      prompts.value = [...DEFAULT_PROMPTS, ...customPromptObjects];

      const savedSelectedId = config.selected_prompt_id as string | undefined;
      if (savedSelectedId) {
        selectedPrompt.value =
          prompts.value.find((p) => p.id === savedSelectedId) ||
          prompts.value[0];
      } else {
        selectedPrompt.value = prompts.value[0];
      }
      promptsLoaded.value = true;
    } catch (error) {
      console.error('Error in loadPromptsFromDB:', error);
    }
  }

  async function savePromptsToDB() {
    try {
      const userStore = useUserStore();
      const userId = userStore.user?.id;
      if (!userId) return;

      const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('llm_reviewer_config')
        .eq('id', userId)
        .single();

      const existingConfig =
        typeof profileData?.llm_reviewer_config === 'object' &&
        profileData?.llm_reviewer_config !== null &&
        !Array.isArray(profileData?.llm_reviewer_config)
          ? (profileData.llm_reviewer_config as Record<string, unknown>)
          : {};

      const customPrompts = prompts.value
        .filter((p) => p.isCustom)
        .map((p) => ({
          id: p.id,
          name: p.name,
          prompt: p.prompt,
        }));

      const { error } = await supabaseClient
        .from('profiles')
        .update({
          llm_reviewer_config: {
            ...existingConfig,
            prompts: customPrompts,
            selected_prompt_id: selectedPrompt.value?.id || null,
          },
        })
        .eq('id', userId);

      if (error) throw error;

      await userStore.fetchProfile();
    } catch (error) {
      console.error('Error saving prompts:', error);
      throw error;
    }
  }

  function selectPrompt(prompt: Prompt) {
    selectedPrompt.value = prompt;
    savePromptsToDB();
  }

  async function triggerReview(articleId: string) {
    loading.value = true;
    reviews.value = [];

    try {
      const { data, error: fnError } =
        await supabaseClient.functions.invoke<ReviewResponse>('ai-review', {
          body: {
            article_id: articleId,
            prompt: selectedPrompt.value?.isCustom
              ? selectedPrompt.value.prompt
              : undefined,
          },
        });

      if (fnError) {
        const errData = (fnError as FunctionsHttpError).context as
          | {
              details?: string;
              error?: string;
              model?: string;
            }
          | undefined;

        const details = errData?.details as string | undefined;
        const errMsg = errData?.error as string | undefined;
        let userMsg =
          details?.includes('429') || details?.includes('quota')
            ? 'AI provider quota exceeded — please wait or switch to a different model'
            : details?.includes('API key') || details?.includes('apiKey')
              ? 'AI provider configuration error — check your API key'
              : details?.includes('timeout') ||
                  details?.includes('timed out') ||
                  details?.includes('AbortError')
                ? 'AI review timed out — the model is too slow or unresponsive. Try a different model or check your API key.'
                : details || errMsg || 'AI provider error';
        const modelName = errData?.model as string | undefined;
        if (modelName) {
          userMsg = `${userMsg} (model: ${modelName})`;
        }
        showNotification('error', userMsg);
        throw fnError;
      }

      // 202 Accepted — chain review in progress
      if (data?.accepted === true) {
        const totalBatches = data?.chain_state?.totalBatches ?? 0;
        const chainId = data?.chain_state?.chainId ?? '';
        startChainProgress('Reviewing...', totalBatches);
        showNotification('info', 'Review in progress, you will be notified when complete');
        pollForChainCompletion(chainId, articleId, () => {
          $resetReviewTrigger();
          showNotification('success', 'Review complete — changes applied');
          loading.value = false;
        });
        return;
      }

      if (data?.reviews && data.reviews.length > 0) {
        reviews.value = data.reviews;
      }

      if (data?.change_id) {
        $resetReviewTrigger();
        showNotification(
          'success',
          data.summary || 'AI improvement added to changes list',
        );
      } else if (data?.was_empty && data?.mira_bot_id) {
        completeReview({
          miraBotId: data.mira_bot_id,
          oldRevid: 0,
          newRevid: 0,
        });
        showNotification('success', data.summary);
      } else if (
        data?.trigger_diff_update &&
        data?.mira_bot_id &&
        data?.old_revision &&
        data?.new_revision
      ) {
        completeReview({
          miraBotId: data.mira_bot_id,
          oldRevid: data.old_revision,
          newRevid: data.new_revision,
        });
        const message = data.article_wide_applied
          ? `Applied revision feedback article-wide — ${data.summary}`
          : data.summary;
        showNotification('success', message);
      } else {
        $resetReviewTrigger();
        showNotification('info', (data?.summary as string) ?? '');
      }
    } catch (error) {
      if (!error) {
        showNotification('error', 'An unexpected error occurred during review');
      }
      $resetReviewTrigger();
    } finally {
      if (!chainActive.value) {
        loading.value = false;
      }
    }
  }

  function $resetReviewTrigger() {
    isDiffUpdatePending.value = false;
    currentMiraBotId.value = null;
    reviewData.value = null;
  }

  function $reset() {
    isDiffUpdatePending.value = false;
    currentMiraBotId.value = null;
    reviewData.value = null;
    prompts.value = [...DEFAULT_PROMPTS];
    selectedPrompt.value = null;
    loading.value = false;
    reviews.value = [];
    promptsLoaded.value = false;
  }

  return {
    // review-result state
    isDiffUpdatePending,
    currentMiraBotId,
    reviewData,
    completeReview,
    completeDiffUpdate,
    // prompt + trigger state
    prompts,
    selectedPrompt,
    loading,
    reviews,
    promptsLoaded,
    // chain progress state
    chainActive,
    chainProgress,
    chainTotalBatches,
    stopChainProgress,
    loadPromptsFromDB,
    selectPrompt,
    savePromptsToDB,
    triggerReview,
    showNotification,
    $reset,
  };
});
