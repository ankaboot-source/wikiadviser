import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useActiveViewStore = defineStore('activeView', () => {
  const isFocusMode = ref(false);
  const toggleEditButton = ref<'edit' | 'view'>('view');

  const isViewing = computed(() => toggleEditButton.value === 'view');
  const isEditing = computed(() => toggleEditButton.value === 'edit');

  function $reset() {
    isFocusMode.value = false;
    toggleEditButton.value = 'view';
  }

  return {
    isFocusMode,
    toggleEditButton,
    $reset,
    isViewing,
    isEditing,
  };
});
