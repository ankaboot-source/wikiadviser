import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useActiveViewStore = defineStore('activeView', () => {
  const isFocusMode = ref(false);
  const activeViewMode = ref('');
  
  function toggleFocusMode(value?: boolean) {
      isFocusMode.value = value ?? !isFocusMode.value;  
  }

  function setActiveViewMode(value: string) {
    activeViewMode.value = value;
  }

  function $reset() {
    isFocusMode.value = false;
    activeViewMode.value = '';
  }

  return {
    isFocusMode,
    activeViewMode,
    toggleFocusMode,
    setActiveViewMode,
    $reset,
  };
});