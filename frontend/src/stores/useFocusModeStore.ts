import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useFocusModeStore = defineStore('focusMode', () => {
  const isFocusMode = ref(false);
  const currentButtonToggle = ref('');

  function toggleFocusMode() {
    isFocusMode.value = !isFocusMode.value;
  }

  function enableFocusMode() {
    isFocusMode.value = true;
  }

  function disableFocusMode() {
    isFocusMode.value = false;
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
    enableFocusMode,
    disableFocusMode,
    setButtonToggle,
    $reset,
  };
});
