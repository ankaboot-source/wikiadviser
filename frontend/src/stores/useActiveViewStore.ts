import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useActiveViewStore = defineStore('activeView', () => {
  const isFocusMode = ref(false);
  const modeToggle = ref<'edit' | 'view'>('view');

  const isViewing = computed(() => modeToggle.value === 'view');
  const isEditing = computed(() => modeToggle.value === 'edit');

  function $reset() {
    isFocusMode.value = false;
    modeToggle.value = 'view';
  }

  return {
    isFocusMode,
    modeToggle,
    $reset,
    isViewing,
    isEditing,
  };
});
