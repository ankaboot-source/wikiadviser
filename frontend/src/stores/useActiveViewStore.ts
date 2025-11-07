import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useActiveViewStore = defineStore('activeView', () => {
  const isFocusMode = ref(false);
  const toggleEditButton = ref('');

  function setToggleEditButton(value: string) {
    toggleEditButton.value = value;
  }

  const isViewing = computed(() => toggleEditButton.value === 'view');
  const isEditing = computed(() => toggleEditButton.value === 'edit');
  function $reset() {
    isFocusMode.value = false;
    toggleEditButton.value = '';
  }

  return {
    isFocusMode,
    toggleEditButton,
    setToggleEditButton,
    $reset,
    isViewing,
    isEditing,
  };
});
