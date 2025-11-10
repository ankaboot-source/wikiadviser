import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useActiveViewStore = defineStore('activeView', () => {
  const isFocusMode = ref(false);
  const isEditButton = ref<'edit' | 'view'>('view');

  const isViewing = computed(() => isEditButton.value === 'view');
  const isEditing = computed(() => isEditButton.value === 'edit');

  function $reset() {
    isFocusMode.value = false;
    isEditButton.value = 'view';
  }

  return {
    isFocusMode,
    isEditButton,
    $reset,
    isViewing,
    isEditing,
  };
});
