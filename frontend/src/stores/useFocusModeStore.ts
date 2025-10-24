import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useFocusModeStore = defineStore('focusMode', () => {
  const isFocusMode = ref(false);
  const currentButtonToggle = ref('');

  function toggleFocusMode(value?: boolean) {
    if (value === undefined) isFocusMode.value = !isFocusMode.value;
    else {
      isFocusMode.value = value;
    }
  }

  function setButtonToggle(value: string) {
    currentButtonToggle.value = value;
  }

  function $reset() {
    isFocusMode.value = false;
    currentButtonToggle.value = '';
  }

  return {
    isFocusMode,
    currentButtonToggle,
    toggleFocusMode,
    setButtonToggle,
    $reset,
  };
});
