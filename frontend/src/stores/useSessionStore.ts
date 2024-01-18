import { Session } from '@supabase/supabase-js';
import { defineStore } from 'pinia';
import supabase from 'src/api/supabase';
import { ref } from 'vue';

export const useSessionStore = defineStore('session', () => {
  // States
  const session = ref<Session>();

  // Actions
  async function fetchSession() {
    session.value = (await supabase.auth.getSession()).data.session as Session;
  }

  return {
    session,
    fetchSession,
  };
});
