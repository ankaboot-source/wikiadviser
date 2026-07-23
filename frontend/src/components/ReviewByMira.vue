<template>
  <div>
    <q-btn-dropdown
      :icon="miraStore.loading ? undefined : 'img:/icons/logo.svg'"
      outline
      no-caps
      class="q-mr-xs q-px-md btn-no-icon-spacing review-btn-wrapper"
      content-class="no-shadow"
      :disable="miraStore.loading"
      split
      @click="triggerReview"
    >
      <template #label>
        <template v-if="miraStore.loading">
          <q-spinner size="1em" />
        </template>
        <span v-if="!$q.screen.lt.md" class="review-label">
          &nbsp;Review by&nbsp;<span
            class="prompt-name"
            :class="{ 'prompt-name-active': miraStore.selectedPrompt }"
            >{{ miraStore.selectedPrompt?.name }}</span
          >
        </span>
      </template>

      <q-list bordered>
        <q-item
          v-for="prompt in sortedPrompts"
          :key="prompt.id"
          v-close-popup
          clickable
          @click="miraStore.selectPrompt(prompt)"
        >
          <q-item-section>
            <q-item-label
              class="flex items-center"
              :class="{
                'text-primary': miraStore.selectedPrompt?.id === prompt.id,
              }"
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
import { useQuasar } from 'quasar';
import PromptFormDialog from 'src/components/PromptFormDialog.vue';
import { useMiraReviewStore, type Prompt } from 'src/stores/useMiraReviewStore';
import { Article } from 'src/types';
import { computed, onMounted, ref } from 'vue';

const props = defineProps<{
  article: Article;
}>();

const miraStore = useMiraReviewStore();
const $q = useQuasar();

const promptDialog = ref(false);
const editingPrompt = ref<Prompt | null>(null);
const savingPrompt = ref(false);
const deletingPrompt = ref(false);

const sortedPrompts = computed(() => {
  const selected = miraStore.selectedPrompt;
  if (!selected) return miraStore.prompts;
  const others = miraStore.prompts.filter((p) => p.id !== selected.id);
  return [selected, ...others];
});

onMounted(async () => {
  await miraStore.loadPromptsFromDB();
});

function triggerReview() {
  miraStore.triggerReview(props.article.article_id);
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
      const index = miraStore.prompts.findIndex(
        (p) => p.id === editingPrompt.value?.id,
      );
      if (index !== -1) {
        miraStore.prompts[index] = {
          ...miraStore.prompts[index],
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
      miraStore.prompts.push(newPrompt);
      miraStore.selectPrompt(newPrompt);
    }

    await miraStore.savePromptsToDB();

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
    miraStore.prompts = miraStore.prompts.filter((p) => p.id !== promptId);

    if (miraStore.selectedPrompt?.id === promptId) {
      miraStore.selectPrompt(miraStore.prompts[0]);
    }

    await miraStore.savePromptsToDB();

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
</script>

<style scoped>
.btn-no-icon-spacing :deep(.q-btn__content > *:not(:first-child)) {
  margin-left: 0;
}

.review-label {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  min-width: 0;
}

.prompt-name {
  display: inline-block;
  text-overflow: ellipsis;
  min-width: 0;
  max-width: 10vw;
}

.prompt-name-active {
  text-decoration: underline dotted;
  text-underline-offset: 4px;
}
@media screen and (max-width: 1200px) {
  .prompt-name {
    max-width: 1vw;
  }
}
@media screen and (max-width: 1400px) {
  .prompt-name {
    max-width: 5vw;
  }
}
@media screen and (min-width: 1600px) {
  .prompt-name {
    max-width: 25vw;
  }
}
</style>
