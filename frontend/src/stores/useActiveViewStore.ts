import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useActiveViewStore = defineStore('activeView', () => {
  const isFocusMode = ref(false);
  const activeViewMode = ref('');

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
    setActiveViewMode,
    $reset,
  };
});
