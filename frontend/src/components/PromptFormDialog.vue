<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card
      class="column"
      :style="
        $q.screen.lt.md
          ? 'width: 95vw; max-height: 60vh'
          : 'width: 60vw; max-height: 60vh'
      "
      flat
    >
      <q-toolbar class="borders">
        <q-toolbar-title class="merriweather">
          {{ editingPrompt ? 'Edit Prompt' : 'Add a custom prompt' }}
        </q-toolbar-title>
        <q-btn v-close-popup flat round dense icon="close" size="sm" />
      </q-toolbar>

      <q-card-section class="col-grow scroll">
        <q-input
          v-model="form.name"
          placeholder="Title"
          outlined
          dense
          bg-color="white"
          class="q-mb-sm"
          :rules="[
            (val) => !!val || 'Title is required',
            (val) =>
              val.length <= 100 || 'Title must be less than 100 characters',
          ]"
        />
        <q-input
          v-model="form.prompt"
          placeholder="Prompt"
          type="textarea"
          outlined
          dense
          bg-color="white"
          rows="4"
          counter
          maxlength="2000"
          :rules="[
            (val) => !!val || 'Prompt is required',
            (val) => val.length <= 2000 || 'Prompt must be less than 300 words',
          ]"
        />
      </q-card-section>

      <q-card-actions class="borders">
        <q-btn
          v-if="editingPrompt"
          color="negative"
          no-caps
          outline
          class="text-sm"
          :loading="deletingPrompt"
          @click="$emit('delete')"
        >
          <q-icon name="delete" class="q-mr-none" />
          <span>Delete</span>
        </q-btn>
        <q-space />
        <q-btn
          v-if="!loading"
          flat
          label="Cancel"
          no-caps
          @click="handleCancel"
        />
        <q-btn
          :label="editingPrompt ? 'Save' : 'Create'"
          color="primary"
          unelevated
          no-caps
          :loading="loading"
          :disable="!isFormValid"
          @click="handleSave"
        >
        </q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';

interface Prompt {
  id: string;
  name: string;
  prompt: string;
  isCustom: boolean;
}

interface Props {
  modelValue: boolean;
  editingPrompt: Prompt | null;
  loading?: boolean;
  deletingPrompt?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'save', data: { name: string; prompt: string }): void;
  (e: 'cancel' | 'delete'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const $q = useQuasar();

const form = ref({
  name: '',
  prompt: '',
});

const isFormValid = computed(() => {
  return (
    form.value.name.trim().length > 0 &&
    form.value.name.length <= 100 &&
    form.value.prompt.trim().length > 0 &&
    form.value.prompt.length <= 2000
  );
});

watch(
  () => props.editingPrompt,
  (prompt) => {
    if (prompt) {
      form.value = {
        name: prompt.name,
        prompt: prompt.prompt,
      };
    } else {
      form.value = {
        name: '',
        prompt: '',
      };
    }
  },
  { immediate: true },
);

function handleSave() {
  if (!isFormValid.value) return;

  emit('save', {
    name: form.value.name.trim(),
    prompt: form.value.prompt.trim(),
  });
}

function handleCancel() {
  emit('cancel');
  emit('update:modelValue', false);
}
</script>
