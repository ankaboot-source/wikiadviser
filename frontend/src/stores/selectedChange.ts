import { defineStore } from 'pinia';

export const useSelectedChangeStore = defineStore('selectedChangeId', {
  state: () => ({
    selectedChangeId: '',
  }),
});
