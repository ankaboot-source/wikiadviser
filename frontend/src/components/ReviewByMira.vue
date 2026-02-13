<template>
  <div>
    <q-btn-dropdown
      :icon="loading ? undefined : 'img:/icons/logo.svg'"
      :label="loading ? '' : $q.screen.lt.md ? '' : 'Review by Mira'"
      outline
      no-caps
      class="q-mr-xs q-px-md"
      :class="{ 'custom-prompt-active ': selectedPrompt?.isCustom }"
      content-class="no-shadow"
      :disable="loading"
      split
      @click="triggerReview"
    >
      <template v-if="loading" #label>
        <q-spinner size="1em" />
        <span v-if="!$q.screen.lt.md" class="q-ml-sm q-pl-xs">
          Review by Mira
        </span>
      </template>

      <q-list bordered>
        <q-item
          v-for="prompt in sortedPrompts"
          :key="prompt.id"
          v-close-popup
          clickable
          @click="selectPrompt(prompt)"
        >
          <q-item-section>
            <q-item-label
              class="flex items-center"
              :class="{ 'text-primary': selectedPrompt?.id === prompt.id }"
            >
              <span>{{ prompt.name }}</span>
            </q-item-label>
          </q-item-section>
          <q-item-section v-if="prompt.isCustom" side>
            <q-icon
              name="edit"
              size="xs"
              color="black"
              class="cursor-pointer"
              @click.stop="openEditDialog(prompt)"
            />
          </q-item-section>
        </q-item>

        <q-separator />
        <q-item v-close-popup clickable @click="openAddDialog">
          <q-item-section>
            <q-item-label class="flex items-center">
              <q-icon name="add" class="q-mr-xs" size="xs" />
              <span>Add a custom prompt</span>
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>

    <PromptFormDialog
      v-model="promptDialog"
      :editing-prompt="editingPrompt"
      :loading="savingPrompt"
      :deleting-prompt="deletingPrompt"
      @save="savePrompt"
      @cancel="cancelPromptDialog"
      @delete="deletePrompt"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useQuasar } from 'quasar';
import supabaseClient from 'src/api/supabase';
import { useMiraReviewStore } from 'src/stores/useMiraReviewStore';
import { useUserStore } from 'src/stores/userStore';
import { Article } from 'src/types';
import PromptFormDialog from 'src/components/PromptFormDialog.vue';

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

interface Prompt {
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

const defaultPrompts: Prompt[] = [
  {
    id: 'mira',
    name: 'Mira',
    prompt: '',
    isCustom: false,
  },
];

const miraStore = useMiraReviewStore();
const userStore = useUserStore();
const $q = useQuasar();

const loading = ref(false);
const reviews = ref<ReviewItem[]>([]);

const prompts = ref<Prompt[]>([...defaultPrompts]);
const selectedPrompt = ref<Prompt | null>(null);
const promptDialog = ref(false);
const editingPrompt = ref<Prompt | null>(null);
const savingPrompt = ref(false);
const deletingPrompt = ref(false);

const sortedPrompts = computed(() => {
  if (!selectedPrompt.value) return prompts.value;

  const selected = prompts.value.find((p) => p.id === selectedPrompt.value?.id);
  const others = prompts.value.filter((p) => p.id !== selectedPrompt.value?.id);

  return selected ? [selected, ...others] : prompts.value;
});

onMounted(async () => {
  await loadPromptsFromDB();
});

async function loadPromptsFromDB() {
  try {
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
    const customPromptObjects = customPrompts.map((cp) => ({
      id: cp.id,
      name: cp.name,
      prompt: cp.prompt,
      isCustom: true,
    }));

    prompts.value = [...defaultPrompts, ...customPromptObjects];

    const savedSelectedId = config.selected_prompt_id as string | undefined;
    if (savedSelectedId) {
      selectedPrompt.value =
        prompts.value.find((p) => p.id === savedSelectedId) || prompts.value[0];
    } else {
      selectedPrompt.value = prompts.value[0];
    }
  } catch (error) {
    console.error('Error in loadPromptsFromDB:', error);
  }
}

async function savePromptsToDB() {
  try {
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

function openAddDialog() {
  editingPrompt.value = null;
  promptDialog.value = true;
}

function openEditDialog(prompt: Prompt) {
  editingPrompt.value = prompt;
  promptDialog.value = true;
}

function cancelPromptDialog() {
  editingPrompt.value = null;
}

async function savePrompt(data: { name: string; prompt: string }) {
  savingPrompt.value = true;
  try {
    if (editingPrompt.value) {
      const index = prompts.value.findIndex(
        (p) => p.id === editingPrompt.value?.id,
      );
      if (index !== -1) {
        prompts.value[index] = {
          ...prompts.value[index],
          name: data.name,
          prompt: data.prompt,
        };
      }
    } else {
      const newPrompt: Prompt = {
        id: `custom-${Date.now()}`,
        name: data.name,
        prompt: data.prompt,
        isCustom: true,
      };
      prompts.value.push(newPrompt);
      selectedPrompt.value = newPrompt;
    }

    await savePromptsToDB();

    $q.notify({
      message: editingPrompt.value
        ? 'Prompt updated successfully'
        : 'Prompt created successfully',
      icon: 'check',
      color: 'positive',
    });

    promptDialog.value = false;
    editingPrompt.value = null;
  } catch (error) {
    console.error('Error saving prompt:', error);
    $q.notify({
      message: 'Error saving prompt',
      icon: 'error',
      color: 'negative',
    });
  } finally {
    savingPrompt.value = false;
  }
}

async function deletePrompt() {
  if (!editingPrompt.value) return;

  deletingPrompt.value = true;
  try {
    const promptId = editingPrompt.value.id;
    prompts.value = prompts.value.filter((p) => p.id !== promptId);

    if (selectedPrompt.value?.id === promptId) {
      selectedPrompt.value = prompts.value[0];
    }

    await savePromptsToDB();

    $q.notify({
      message: 'Prompt deleted successfully',
      icon: 'check',
      color: 'positive',
    });

    promptDialog.value = false;
    editingPrompt.value = null;
  } catch (error) {
    console.error('Error deleting prompt:', error);
    $q.notify({
      message: 'Error deleting prompt',
      icon: 'error',
      color: 'negative',
    });
  } finally {
    deletingPrompt.value = false;
  }
}

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
          prompt: selectedPrompt.value?.isCustom
            ? selectedPrompt.value.prompt
            : undefined,
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
      showNotification('info', data?.summary as string);
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
<style scoped>
.custom-prompt-active :deep(.q-btn:first-child .q-btn__content) {
  text-decoration: underline dotted;
  text-underline-offset: 4px;
}
</style>
