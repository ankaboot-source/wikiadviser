import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useActiveViewStore = defineStore('activeView', () => {
  const isFocusMode = ref(false);
  const toggleEditButton = ref('');

  function setToggleEditButton(value: string) {
    toggleEditButton.value = value;
  }

  function $reset() {
    isFocusMode.value = false;
    toggleEditButton.value = '';
  }

  return {
    isFocusMode,
    toggleEditButton,
    setToggleEditButton,
    $reset,
  };
});