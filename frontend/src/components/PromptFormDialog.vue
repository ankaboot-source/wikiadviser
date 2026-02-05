<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card style="min-width: 400px; box-shadow: none" flat>
      <q-card-section>
        <div class="text-h6">
          {{ editingPrompt ? 'Edit Prompt' : 'Add a custom prompt' }}
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-input
          v-model="form.name"
          :placeholder="'Title'"
          outlined
          dense
          bg-color="white"
          class="q-mb-md"
          :rules="[
            (val) => !!val || 'Title is required',
            (val) =>
              val.length <= 100 || 'Title must be less than 100 characters',
          ]"
        />
        <q-input
          v-model="form.prompt"
          :placeholder="'Prompt (300 words maximum)'"
          type="textarea"
          outlined
          bg-color="white"
          rows="4"
          :rules="[
            (val) => !!val || 'Prompt is required',
            (val) =>
              val.length <= 4000 || 'Prompt must be less than 4000 characters',
          ]"
        />
      </q-card-section>

      <q-card-actions align="right" class="borders">
        <q-btn flat label="Cancel" color="primary" @click="handleCancel" />
        <q-btn
          :label="editingPrompt ? 'Save' : 'Create'"
          color="primary"
          :loading="loading"
          :disable="!isFormValid"
          @click="handleSave"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

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
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'save', data: { name: string; prompt: string }): void;
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const form = ref({
  name: '',
  prompt: '',
});

const isFormValid = computed(() => {
  return (
    form.value.name.trim().length > 0 &&
    form.value.name.length <= 100 &&
    form.value.prompt.trim().length > 0 &&
    form.value.prompt.length <= 4000
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
