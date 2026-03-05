import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ChangeItem } from 'src/types';

export const useSelectedChangeStore = defineStore('selectedChangeId', () => {
  const selectedChangeId = ref('');
  const hoveredChangeId = ref('');
  const selectedChange = ref<ChangeItem | null>(null);

  function setSelectedChange(change: ChangeItem | null) {
    selectedChange.value = change;
    selectedChangeId.value = change?.id || '';
  }

  return {
    selectedChangeId,
    hoveredChangeId,
    selectedChange,
    setSelectedChange,
  };
});
