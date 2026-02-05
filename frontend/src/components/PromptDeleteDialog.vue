<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card flat style="box-shadow: none">
      <q-toolbar class="borders">
        <q-toolbar-title class="merriweather">
          Delete Custom Prompt
        </q-toolbar-title>
        <q-btn
          flat
          round
          dense
          icon="close"
          size="sm"
          @click="$emit('update:modelValue', false)"
        />
      </q-toolbar>
      <q-card-section>
        Are you sure you want to delete "{{ prompt?.name }}"?
      </q-card-section>
      <q-card-actions class="borders">
        <q-space />
        <q-btn
          no-caps
          outline
          color="primary"
          label="Cancel"
          @click="$emit('update:modelValue', false)"
        />
        <q-btn
          no-caps
          color="negative"
          label="Delete"
          :loading="loading"
          @click="$emit('delete')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
interface Prompt {
  id: string;
  name: string;
  prompt: string;
  isCustom: boolean;
}

interface Props {
  modelValue: boolean;
  prompt: Prompt | null;
  loading?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'delete'): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>
