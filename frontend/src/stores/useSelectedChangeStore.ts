import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSelectedChangeStore = defineStore('selectedChangeId', () => {
  const selectedChangeId = ref('');
  const hoveredChangeId = ref('');

  return {
    selectedChangeId,
    hoveredChangeId,
  };
});
