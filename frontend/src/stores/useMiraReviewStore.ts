import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import supabaseClient from 'src/api/supabase';
import { useUserStore } from 'src/stores/userStore';

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
      timeout: 5000,
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
    void savePromptsToDB();
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
        const errData = (fnError as Record<string, unknown>)?.context?.data as
          | Record<string, unknown>
          | undefined;
        const details = errData?.details as string | undefined;
        const errMsg = errData?.error as string | undefined;
        const userMsg =
          details?.includes('429') || details?.includes('quota')
            ? 'AI provider quota exceeded — please wait or switch to a different model'
            : details?.includes('API key') || details?.includes('apiKey')
              ? 'AI provider configuration error — check your API key'
              : details || errMsg || 'AI provider error';
        showNotification('error', userMsg);
        throw fnError;
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
        showNotification('success', data.summary);
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
      loading.value = false;
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
    loadPromptsFromDB,
    selectPrompt,
    savePromptsToDB,
    triggerReview,
    showNotification,
    $reset,
  };
});
